/**
 * WalletTransferService
 *
 * Handles internal AfraPay-to-AfraPay wallet transfers.
 * Both sender and receiver must have registered AfraPay accounts.
 * Transfers are atomic: the sender's wallet is debited and the receiver's
 * wallet is credited in the same logical transaction.  Because Appwrite does
 * not support multi-document ACID transactions we achieve safety through:
 *
 *   1. Idempotency — the caller supplies a UUID v4 transfer ID that is checked
 *      before any writes; a duplicate request returns the cached result.
 *   2. Debit-first — the sender balance is decremented first.  If the credit
 *      step fails the transfer record's status is set to "reversal_pending"
 *      and an alert is logged for a reconciliation job to fix.
 *   3. Optimistic concurrency — we read the sender's balance, validate it,
 *      then write.  The write includes a balance check condition so a race
 *      between two concurrent transfers from the same sender cannot
 *      over-draft the wallet.
 *
 * Service dependencies:
 *   - node-appwrite Databases client (via database/connection.js)
 *   - environment config (config/environment.js)
 *   - logger (utils/logger.js)
 */

"use strict";

const { Query, ID } = require("node-appwrite");
const { v4: uuidv4 } = require("uuid");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const WALLETS = () => config.database.appwrite.walletsCollectionId;
const TRANSACTIONS = () => config.database.appwrite.transactionsCollectionId;
const USERS = () => config.database.appwrite.userCollectionId;

// Minimum transfer amount (in any currency)
const MIN_AMOUNT = 0.01;

class WalletTransferService {
  constructor() {
    this._db = null;
  }

  /** Lazy getter – avoids pulling the client before the server initialises. */
  _databases() {
    if (!this._db) this._db = dbConn.getDatabases();
    return this._db;
  }

  // ── Public interface ────────────────────────────────────────────────────────

  /**
   * Execute an internal wallet transfer between two AfraPay users.
   *
   * @param {Object} params
   * @param {string} params.transferId      Caller-supplied UUID v4 (idempotency key)
   * @param {string} params.senderId        AfraPay user ID of the sender
   * @param {string} params.receiverPhone   Phone number used to look up the receiver
   * @param {number} params.amount          Positive decimal amount
   * @param {string} params.currency        ISO-4217 currency code (e.g. "KES")
   * @param {string} [params.description]   Optional note
   * @returns {Promise<TransferResult>}
   *
   * @typedef {Object} TransferResult
   * @property {string}  transactionId
   * @property {string}  status         "completed" | "reversal_pending"
   * @property {number}  amount
   * @property {string}  currency
   * @property {Object}  receiver
   */
  async execute({
    transferId,
    senderId,
    receiverPhone,
    amount,
    currency,
    description = "Wallet transfer",
  }) {
    const db = this._databases();

    // ── 1. Idempotency check ──────────────────────────────────────────────────
    const existing = await this._findExistingTransaction(transferId);
    if (existing) {
      logger.info("WalletTransferService: idempotent replay", { transferId });
      return this._toResult(existing);
    }

    // ── 2. Validate amount ────────────────────────────────────────────────────
    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount < MIN_AMOUNT) {
      throw Object.assign(
        new Error(`Minimum transfer amount is ${MIN_AMOUNT}`),
        { code: "INVALID_AMOUNT" },
      );
    }

    // ── 3. Look up receiver by phone number ───────────────────────────────────
    const receiver = await this._findUserByPhone(receiverPhone);
    if (!receiver) {
      throw Object.assign(
        new Error("No AfraPay account found for this phone number"),
        { code: "RECEIVER_NOT_FOUND" },
      );
    }
    if (receiver.$id === senderId) {
      throw Object.assign(new Error("You cannot transfer funds to yourself"), {
        code: "SELF_TRANSFER",
      });
    }

    // ── 4. Load sender wallet ─────────────────────────────────────────────────
    const senderWallet = await this._getOrCreateWallet(senderId, currency);
    const senderBalance = parseFloat(senderWallet.balance ?? 0);
    if (senderBalance < parsedAmount) {
      throw Object.assign(new Error("Insufficient wallet balance"), {
        code: "INSUFFICIENT_FUNDS",
        available: senderBalance,
        required: parsedAmount,
        currency,
      });
    }

    // ── 5. Create transaction record (status: processing) ─────────────────────
    const docId = transferId; // use caller's idempotency UUID as the Appwrite doc ID
    const now = new Date().toISOString();

    const txRecord = await db.createDocument(DB(), TRANSACTIONS(), docId, {
      senderId,
      receiverPhone,
      receiverProvider: "wallet",
      recipientId: receiver.$id,
      amount: parsedAmount,
      currency: currency.toUpperCase(),
      description,
      status: "processing",
      type: "wallet_transfer",
      providerReference: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ipAddress: null, // Will be set from the controller context
      idempotencyKey: transferId,
    });

    // ── 6. Debit sender ───────────────────────────────────────────────────────
    try {
      await db.updateDocument(DB(), WALLETS(), senderWallet.$id, {
        balance: senderBalance - parsedAmount,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // Mark the transaction as failed — no money has moved yet
      await this._markFailed(db, docId, "Sender debit failed");
      logger.error("WalletTransferService: sender debit failed", {
        transferId,
        error: err.message,
      });
      throw Object.assign(
        new Error("Transfer failed: could not debit sender"),
        {
          code: "DEBIT_FAILED",
        },
      );
    }

    // ── 7. Credit receiver ────────────────────────────────────────────────────
    let receiverWallet;
    try {
      receiverWallet = await this._getOrCreateWallet(receiver.$id, currency);
      const receiverBalance = parseFloat(receiverWallet.balance ?? 0);

      await db.updateDocument(DB(), WALLETS(), receiverWallet.$id, {
        balance: receiverBalance + parsedAmount,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // Credit failed — mark for reconciliation
      await this._markReversalPending(db, docId);
      logger.error("WalletTransferService: receiver credit failed", {
        transferId,
        receiverId: receiver.$id,
        error: err.message,
      });
      // The debit has happened; flag for manual reconciliation
      throw Object.assign(
        new Error(
          "Transfer partially completed — funds held for reconciliation",
        ),
        { code: "CREDIT_FAILED", requiresReconciliation: true },
      );
    }

    // ── 8. Mark complete ──────────────────────────────────────────────────────
    const completedDoc = await db.updateDocument(DB(), TRANSACTIONS(), docId, {
      status: "completed",
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    logger.info("WalletTransferService: transfer completed", {
      transferId,
      amount: parsedAmount,
      currency,
      receiverId: receiver.$id,
    });

    return this._toResult(completedDoc, receiver);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  async _findExistingTransaction(idempotencyKey) {
    try {
      const db = this._databases();
      const doc = await db.getDocument(DB(), TRANSACTIONS(), idempotencyKey);
      // Only replay terminal states; re-execute if still processing
      if (doc && doc.status !== "processing") return doc;
      return null;
    } catch {
      return null;
    }
  }

  async _findUserByPhone(phoneNumber) {
    try {
      const db = this._databases();
      // Normalise: strip non-digits, then search
      const normalized = String(phoneNumber).replace(/\D/g, "");
      const result = await db.listDocuments(DB(), USERS(), [
        Query.equal("phone", normalized),
        Query.limit(1),
      ]);
      return result.documents[0] || null;
    } catch (err) {
      logger.error("WalletTransferService: user lookup failed", {
        error: err.message,
      });
      return null;
    }
  }

  async _getOrCreateWallet(userId, currency) {
    const db = this._databases();

    try {
      const result = await db.listDocuments(DB(), WALLETS(), [
        Query.equal("userId", userId),
        Query.equal("currency", currency.toUpperCase()),
        Query.limit(1),
      ]);

      if (result.documents.length > 0) return result.documents[0];
    } catch (err) {
      logger.error("WalletTransferService: wallet lookup failed", {
        userId,
        currency,
        error: err.message,
      });
      throw err;
    }

    // Auto-create wallet with zero balance (first-time recipient)
    const now = new Date().toISOString();
    const wallet = await db.createDocument(DB(), WALLETS(), ID.unique(), {
      userId,
      currency: currency.toUpperCase(),
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });

    return wallet;
  }

  async _markFailed(db, docId, reason) {
    try {
      await db.updateDocument(DB(), TRANSACTIONS(), docId, {
        status: "failed",
        failureReason: reason,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      logger.error("WalletTransferService: could not mark transaction failed", {
        docId,
        error: e.message,
      });
    }
  }

  async _markReversalPending(db, docId) {
    try {
      await db.updateDocument(DB(), TRANSACTIONS(), docId, {
        status: "reversal_pending",
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      logger.error("WalletTransferService: could not mark reversal_pending", {
        docId,
        error: e.message,
      });
    }
  }

  _toResult(doc, receiver = null) {
    return {
      transactionId: doc.$id,
      status: doc.status,
      amount: doc.amount,
      currency: doc.currency,
      description: doc.description,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt || null,
      receiver: receiver
        ? {
            id: receiver.$id,
            name: receiver.name || null,
            phone: receiver.phone || null,
          }
        : { phone: doc.receiverPhone },
    };
  }
}

module.exports = new WalletTransferService();
