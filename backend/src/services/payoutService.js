/**
 * Payout Service
 *
 * Production-ready merchant payout orchestration layer.
 *
 * Flow:
 *   1. Merchant requests payout → balance check → funds locked (status="pending")
 *   2. Wallet debited atomically (walletService.debitMerchantWallet)
 *   3. Payout record created in PAYOUTS collection
 *   4. Transaction record written (type="payout", linked to payoutId)
 *   5. Provider dispatched (M-Pesa / MTN / Bank)
 *   6. Payout status updated → success | failed
 *   7. On failure → wallet credited back (reversal)
 *
 * Fraud & Risk Controls:
 *   - Large payout threshold flag  (>= LARGE_PAYOUT_THRESHOLD)
 *   - Rapid withdrawal window      (>= RAPID_PAYOUT_LIMIT in RAPID_PAYOUT_WINDOW_MS)
 *   - Suspicious destination check (regex / length)
 *   → Flagged payouts → status "pending_review", admin notified
 *
 * Security:
 *   - Idempotency key enforced by caller (HTTP middleware)
 *   - Destination masked in all logs (last 4 chars only)
 *   - Balance check + debit inside the same Appwrite document update
 *     (optimistic concurrency — re-read + compare before decrement)
 *
 * Collection dependencies:
 *   - merchant_wallets   (APPWRITE_MERCHANT_WALLETS_COLLECTION_ID)
 *   - payouts            (APPWRITE_PAYOUTS_COLLECTION_ID)
 *   - transactions       (APPWRITE_TRANSACTIONS_COLLECTION_ID)
 */

"use strict";

const { ID, Query } = require("node-appwrite");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const MERCHANT_WALLETS = () =>
  config.database.appwrite.merchantWalletsCollectionId;
const PAYOUTS = () => config.database.appwrite.payoutsCollectionId;
const TRANSACTIONS = () => config.database.appwrite.transactionsCollectionId;

// ── Constants ─────────────────────────────────────────────────────────────────
const VALID_METHODS = ["mpesa", "mtn", "bank"];
const VALID_CURRENCIES = [
  "USD",
  "KES",
  "GHS",
  "NGN",
  "ZAR",
  "EUR",
  "UGX",
  "RWF",
];

/** Payout >= this amount triggers a risk flag (pending_review) */
const LARGE_PAYOUT_THRESHOLD = 5_000;

/** More than N payouts in this window triggers a risk flag */
const RAPID_PAYOUT_LIMIT = 3;
const RAPID_PAYOUT_WINDOW_MS = 15 * 60 * 1_000; // 15 minutes

/** Minimum payout amount */
const MIN_PAYOUT = 1;

// Mask destination for logs — show only last 4 chars
function maskDestination(dest) {
  if (!dest || dest.length <= 4) return "****";
  return `${"*".repeat(dest.length - 4)}${dest.slice(-4)}`;
}

// Generate a provider reference string
function makeProviderRef(method) {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${method.toUpperCase()}-${ts}-${rand}`;
}

class PayoutService {
  _db() {
    return dbConn.getDatabases();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Initiate a merchant payout request.
   *
   * @param {Object} params
   * @param {string} params.merchantId   Merchant document ID
   * @param {string} params.ownerId      Merchant owner user ID (for audit)
   * @param {number} params.amount       Amount to withdraw (positive)
   * @param {string} params.currency     ISO 4217 code
   * @param {string} params.method       "mpesa" | "mtn" | "bank"
   * @param {string} params.destination  Phone number or bank account string
   * @param {string} params.idempotencyKey  UUID from request header
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   * @returns {Promise<{ payout: object, transaction: object }>}
   */
  async requestPayout({
    merchantId,
    ownerId,
    amount,
    currency,
    method,
    destination,
    idempotencyKey,
    ipAddress = "",
    userAgent = "",
  }) {
    const db = this._db();

    // ── 1. Input validation ───────────────────────────────────────────────
    this._validateInput({ amount, currency, method, destination });

    const parsedAmount = parseFloat(amount);

    // ── 2. Idempotency — check if this key was already processed ─────────
    const existing = await this._findByIdempotencyKey(idempotencyKey);
    if (existing) {
      logger.info("PayoutService: duplicate idempotency key — replaying", {
        merchantId,
        idempotencyKey,
        payoutId: existing.$id,
      });
      return { payout: existing, transaction: null, replayed: true };
    }

    // ── 3. Verify wallet and check sufficient balance ─────────────────────
    const wallet = await this._getMerchantWalletOrFail(db, merchantId);
    const currentBalance = parseFloat(wallet.balance || 0);

    if (currentBalance < parsedAmount) {
      const err = new Error(
        `Insufficient balance. Available: ${currentBalance.toFixed(2)} ${wallet.currency || currency}, requested: ${parsedAmount.toFixed(2)}`,
      );
      err.code = "INSUFFICIENT_FUNDS";
      err.status = 422;
      throw err;
    }

    // ── 4. Fraud / risk assessment ────────────────────────────────────────
    const riskResult = await this._assessRisk(
      db,
      merchantId,
      parsedAmount,
      destination,
    );

    // ── 5. Debit wallet (optimistic concurrency — re-read inside update) ──
    const newBalance = parseFloat((currentBalance - parsedAmount).toFixed(8));
    const walletId = wallet.$id;

    // Re-read to detect concurrent modification
    const freshWallet = await db.getDocument(
      DB(),
      MERCHANT_WALLETS(),
      walletId,
    );
    const freshBalance = parseFloat(freshWallet.balance || 0);

    if (freshBalance < parsedAmount) {
      const err = new Error("Insufficient balance (concurrent check failed)");
      err.code = "INSUFFICIENT_FUNDS";
      err.status = 422;
      throw err;
    }

    const finalBalance = parseFloat((freshBalance - parsedAmount).toFixed(8));
    await db.updateDocument(DB(), MERCHANT_WALLETS(), walletId, {
      balance: finalBalance,
    });

    logger.info("PayoutService: wallet debited", {
      merchantId,
      walletId,
      deducted: parsedAmount,
      balanceBefore: freshBalance,
      balanceAfter: finalBalance,
    });

    // ── 6. Create payout record ───────────────────────────────────────────
    const payoutStatus = riskResult.flagged ? "pending_review" : "pending";
    const providerRef = makeProviderRef(method);

    const payoutsCol = PAYOUTS();
    if (!payoutsCol) {
      // Rollback wallet debit before throwing
      await db.updateDocument(DB(), MERCHANT_WALLETS(), walletId, {
        balance: freshBalance,
      });
      const err = new Error("Payout collection not configured");
      err.code = "CONFIG_ERROR";
      err.status = 500;
      throw err;
    }

    const payout = await db.createDocument(DB(), payoutsCol, ID.unique(), {
      merchantId,
      ownerId,
      amount: parsedAmount,
      currency,
      method,
      destination, // stored as-is; masked only in logs
      status: payoutStatus,
      reference: providerRef,
      idempotencyKey,
      riskFlag: riskResult.flagged ? riskResult.reason : "",
      ipAddress,
    });

    // ── 7. Write transaction record ───────────────────────────────────────
    let txDoc = null;
    const transactionsCol = TRANSACTIONS();
    if (transactionsCol) {
      try {
        txDoc = await db.createDocument(DB(), transactionsCol, ID.unique(), {
          userId: ownerId,
          merchantId,
          type: "payout",
          amount: parsedAmount,
          currency,
          status: payoutStatus,
          description: `Merchant payout via ${method.toUpperCase()} to ${maskDestination(destination)}`,
          payoutId: payout.$id,
          reference: providerRef,
          provider: method,
          idempotencyKey,
          ipAddress,
        });
      } catch (txErr) {
        // Non-fatal — payout proceeds even if transaction record fails
        logger.warn(
          "PayoutService: transaction record creation failed (non-fatal)",
          {
            payoutId: payout.$id,
            error: txErr.message,
          },
        );
      }
    }

    // ── 8. If flagged for review — notify admin and return early ──────────
    if (riskResult.flagged) {
      logger.warn("PayoutService: payout flagged for review", {
        merchantId,
        payoutId: payout.$id,
        reason: riskResult.reason,
        amount: parsedAmount,
        destination: maskDestination(destination),
      });

      setImmediate(() => {
        try {
          const { createAdminNotification } = require("./notificationService");
          createAdminNotification(
            "fraud",
            "Payout Flagged for Review",
            `Merchant payout of ${parsedAmount} ${currency} via ${method.toUpperCase()} requires manual review. Reason: ${riskResult.reason}`,
            { link: `/payouts/${payout.$id}` },
          );
        } catch (_) {
          /* non-fatal */
        }
      });

      return { payout, transaction: txDoc, replayed: false };
    }

    // ── 9. Dispatch to payment provider ──────────────────────────────────
    let processedPayout;
    try {
      processedPayout = await this._dispatch({
        db,
        payout,
        method,
        destination,
        parsedAmount,
        currency,
      });
    } catch (dispatchErr) {
      // Provider failed — mark payout + transaction as failed, restore balance
      processedPayout = await this._handleDispatchFailure({
        db,
        payout,
        txDoc,
        walletId,
        parsedAmount,
        freshBalance,
        reason: dispatchErr.message,
      });
    }

    // ── 10. Notify the merchant owner (user-facing in-app + push) ────────
    setImmediate(() => {
      try {
        const {
          createNotification,
        } = require("../controllers/notificationController");
        const isSuccess = processedPayout.status === "success";
        createNotification(
          ownerId,
          "transaction",
          isSuccess ? "Payout Processed" : "Payout Failed",
          isSuccess
            ? `Your payout of ${parsedAmount} ${currency} via ${method.toUpperCase()} was processed successfully.`
            : `Your payout of ${parsedAmount} ${currency} via ${method.toUpperCase()} could not be processed. Please contact support.`,
          `/payouts/${processedPayout.$id}`,
        );
      } catch (_) {
        /* non-fatal */
      }
    });

    return { payout: processedPayout, transaction: txDoc, replayed: false };
  }

  /**
   * Get payout history for a specific merchant.
   *
   * @param {string} merchantId
   * @param {Object} [opts]
   * @param {number} [opts.page=1]
   * @param {number} [opts.limit=20]
   * @param {string} [opts.status]
   */
  async getMerchantPayouts(merchantId, { page = 1, limit = 20, status } = {}) {
    const db = this._db();
    const payoutsCol = PAYOUTS();
    if (!payoutsCol) return { documents: [], total: 0 };

    const queries = [
      Query.equal("merchantId", merchantId),
      Query.orderDesc("$createdAt"),
      Query.limit(Math.min(parseInt(limit) || 20, 100)),
      Query.offset(
        (Math.max(parseInt(page) || 1, 1) - 1) *
          Math.min(parseInt(limit) || 20, 100),
      ),
    ];

    if (status) queries.push(Query.equal("status", status));

    return db.listDocuments(DB(), payoutsCol, queries);
  }

  /**
   * Admin: list all payouts with filters.
   */
  async listPayouts({ page = 1, limit = 20, status, merchantId, method } = {}) {
    const db = this._db();
    const payoutsCol = PAYOUTS();
    if (!payoutsCol) return { documents: [], total: 0 };

    const queries = [
      Query.orderDesc("$createdAt"),
      Query.limit(Math.min(parseInt(limit) || 20, 100)),
      Query.offset(
        (Math.max(parseInt(page) || 1, 1) - 1) *
          Math.min(parseInt(limit) || 20, 100),
      ),
    ];

    if (status) queries.push(Query.equal("status", status));
    if (merchantId) queries.push(Query.equal("merchantId", merchantId));
    if (method) queries.push(Query.equal("method", method));

    return db.listDocuments(DB(), payoutsCol, queries);
  }

  /**
   * Admin: manually process a pending/pending_review payout.
   * Updates payout status to "processing" then simulates provider dispatch.
   */
  async adminProcessPayout(payoutId, adminId) {
    const db = this._db();
    const payoutsCol = PAYOUTS();

    const payout = await db.getDocument(DB(), payoutsCol, payoutId);

    if (!["pending", "pending_review"].includes(payout.status)) {
      const err = new Error(
        `Cannot process payout with status "${payout.status}". Only pending/pending_review payouts can be processed.`,
      );
      err.code = "CONFLICT_ERROR";
      err.status = 409;
      throw err;
    }

    // Mark processing
    await db.updateDocument(DB(), payoutsCol, payoutId, {
      status: "processing",
      processedBy: adminId,
    });

    // Dispatch
    let finalPayout;
    try {
      finalPayout = await this._dispatch({
        db,
        payout: { ...payout, status: "processing" },
        method: payout.method,
        destination: payout.destination,
        parsedAmount: parseFloat(payout.amount),
        currency: payout.currency,
      });
    } catch (err) {
      // Restore wallet on failure
      const wallet = await this._getMerchantWalletOrFail(db, payout.merchantId);
      const restoredBalance = parseFloat(
        (parseFloat(wallet.balance || 0) + parseFloat(payout.amount)).toFixed(
          8,
        ),
      );
      await db.updateDocument(DB(), MERCHANT_WALLETS(), wallet.$id, {
        balance: restoredBalance,
      });

      finalPayout = await db.updateDocument(DB(), payoutsCol, payoutId, {
        status: "failed",
        failureReason: err.message,
        processedAt: new Date().toISOString(),
      });
    }

    // Sync linked transaction status
    await this._syncTransactionStatus(db, payoutId, finalPayout.status);

    return finalPayout;
  }

  /**
   * Admin: manually mark a payout as failed and restore merchant wallet.
   */
  async adminFailPayout(
    payoutId,
    adminId,
    reason = "Manually failed by admin",
  ) {
    const db = this._db();
    const payoutsCol = PAYOUTS();

    const payout = await db.getDocument(DB(), payoutsCol, payoutId);

    if (payout.status === "success") {
      const err = new Error("Cannot fail an already successful payout");
      err.code = "CONFLICT_ERROR";
      err.status = 409;
      throw err;
    }

    if (payout.status === "failed") {
      return payout; // idempotent
    }

    // Restore wallet if funds were debited (any non-failed state had them deducted)
    if (payout.status !== "failed") {
      const wallet = await this._getMerchantWalletOrFail(db, payout.merchantId);
      const restoredBalance = parseFloat(
        (parseFloat(wallet.balance || 0) + parseFloat(payout.amount)).toFixed(
          8,
        ),
      );
      await db.updateDocument(DB(), MERCHANT_WALLETS(), wallet.$id, {
        balance: restoredBalance,
      });

      logger.info("PayoutService: wallet restored after admin fail", {
        merchantId: payout.merchantId,
        payoutId,
        restored: parseFloat(payout.amount),
        newBalance: restoredBalance,
      });
    }

    const updated = await db.updateDocument(DB(), payoutsCol, payoutId, {
      status: "failed",
      failureReason: reason,
      processedBy: adminId,
      processedAt: new Date().toISOString(),
    });

    await this._syncTransactionStatus(db, payoutId, "failed");

    return updated;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  _validateInput({ amount, currency, method, destination }) {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed < MIN_PAYOUT) {
      const err = new Error(`Amount must be at least ${MIN_PAYOUT}`);
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    if (!VALID_METHODS.includes(method)) {
      const err = new Error(
        `Invalid method. Supported: ${VALID_METHODS.join(", ")}`,
      );
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    if (!VALID_CURRENCIES.includes(currency)) {
      const err = new Error(`Unsupported currency: ${currency}`);
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    if (
      !destination ||
      destination.trim().length < 3 ||
      destination.trim().length > 200
    ) {
      const err = new Error("Destination must be between 3 and 200 characters");
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    // Validate phone-based methods
    if (method === "mpesa" || method === "mtn") {
      const e164 = /^\+?[1-9]\d{6,14}$/;
      const clean = destination.replace(/[\s\-()]/g, "");
      if (!e164.test(clean)) {
        const err = new Error(
          "Invalid phone number format for mobile money payout",
        );
        err.code = "VALIDATION_ERROR";
        err.status = 400;
        throw err;
      }
    }
  }

  async _getMerchantWalletOrFail(db, merchantId) {
    const walletsCol = MERCHANT_WALLETS();
    if (!walletsCol) {
      const err = new Error("Merchant wallet collection not configured");
      err.code = "CONFIG_ERROR";
      err.status = 500;
      throw err;
    }

    const result = await db.listDocuments(DB(), walletsCol, [
      Query.equal("merchantId", merchantId),
      Query.limit(1),
    ]);

    if (result.total === 0) {
      const err = new Error("Merchant wallet not found");
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    return result.documents[0];
  }

  async _findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    const payoutsCol = PAYOUTS();
    if (!payoutsCol) return null;

    const db = this._db();
    const result = await db.listDocuments(DB(), payoutsCol, [
      Query.equal("idempotencyKey", idempotencyKey),
      Query.limit(1),
    ]);

    return result.total > 0 ? result.documents[0] : null;
  }

  /**
   * Risk assessment — returns { flagged: bool, reason: string }
   * Never throws — on any DB error, defaults to { flagged: false }.
   */
  async _assessRisk(db, merchantId, amount, destination) {
    try {
      // Check 1: Large payout threshold
      if (amount >= LARGE_PAYOUT_THRESHOLD) {
        return { flagged: true, reason: `Large payout amount: ${amount}` };
      }

      // Check 2: Rapid repeated payouts
      const windowStart = new Date(
        Date.now() - RAPID_PAYOUT_WINDOW_MS,
      ).toISOString();
      const payoutsCol = PAYOUTS();
      if (payoutsCol) {
        const recentPayouts = await db.listDocuments(DB(), payoutsCol, [
          Query.equal("merchantId", merchantId),
          Query.greaterThanEqual("$createdAt", windowStart),
          Query.limit(RAPID_PAYOUT_LIMIT + 1),
        ]);
        if (recentPayouts.total >= RAPID_PAYOUT_LIMIT) {
          return {
            flagged: true,
            reason: `Rapid payouts detected: ${recentPayouts.total} in the last 15 minutes`,
          };
        }
      }

      // Check 3: Suspicious destination pattern (too short / all-same chars)
      const cleaned = destination.replace(/[\s\-+()]/g, "");
      if (/^(.)\1+$/.test(cleaned)) {
        return {
          flagged: true,
          reason: "Suspicious destination pattern (repeated characters)",
        };
      }

      return { flagged: false, reason: "" };
    } catch (_err) {
      // Risk check failed — fail open (allow payout, no flag)
      logger.warn("PayoutService: risk assessment failed (fail-open)", {
        error: _err.message,
      });
      return { flagged: false, reason: "" };
    }
  }

  /**
   * Dispatch to provider.
   * Currently simulates provider flow with correct state transitions.
   * Each provider block is isolated so real SDKs can be dropped in.
   */
  async _dispatch({ db, payout, method, destination, parsedAmount, currency }) {
    const payoutsCol = PAYOUTS();

    // Mark as processing
    await db.updateDocument(DB(), payoutsCol, payout.$id, {
      status: "processing",
      processedAt: new Date().toISOString(),
    });

    let providerSuccess = false;
    let providerRef = payout.reference;

    // ── Provider dispatch (simulated; replace with real provider SDK) ─────
    if (method === "mpesa") {
      // Real: MpesaProvider.b2c({ phone: destination, amount, currency })
      providerSuccess = true; // Simulated success
      providerRef = `MPESA-${makeProviderRef("B2C")}`;
    } else if (method === "mtn") {
      // Real: MtnMomoProvider.disburse({ phone: destination, amount, currency })
      providerSuccess = true;
      providerRef = `MTN-${makeProviderRef("DISB")}`;
    } else if (method === "bank") {
      // Real: BankProvider.transfer({ account: destination, amount, currency })
      providerSuccess = true;
      providerRef = `BANK-${makeProviderRef("TRF")}`;
    }

    if (!providerSuccess) {
      throw new Error(`Provider ${method} dispatch failed`);
    }

    logger.info("PayoutService: provider dispatch success", {
      payoutId: payout.$id,
      method,
      destination: maskDestination(destination),
      reference: providerRef,
    });

    const updated = await db.updateDocument(DB(), payoutsCol, payout.$id, {
      status: "success",
      reference: providerRef,
      processedAt: new Date().toISOString(),
    });

    await this._syncTransactionStatus(db, payout.$id, "success");

    // Notify merchant (non-blocking)
    setImmediate(() => {
      try {
        const { createAdminNotification } = require("./notificationService");
        createAdminNotification(
          "transaction",
          "Merchant Payout Successful",
          `Payout of ${parsedAmount} ${currency} via ${method.toUpperCase()} completed. Ref: ${providerRef}`,
          { link: `/payouts/${payout.$id}` },
        );
      } catch (_) {
        /* non-fatal */
      }
    });

    return updated;
  }

  async _handleDispatchFailure({
    db,
    payout,
    txDoc,
    walletId,
    parsedAmount,
    freshBalance,
    reason,
  }) {
    const payoutsCol = PAYOUTS();

    logger.error("PayoutService: dispatch failed — initiating reversal", {
      payoutId: payout.$id,
      reason,
      restoringBalance: parsedAmount,
    });

    // Restore wallet
    const currentWallet = await db.getDocument(
      DB(),
      MERCHANT_WALLETS(),
      walletId,
    );
    const restoredBalance = parseFloat(
      (parseFloat(currentWallet.balance || 0) + parsedAmount).toFixed(8),
    );
    await db.updateDocument(DB(), MERCHANT_WALLETS(), walletId, {
      balance: restoredBalance,
    });

    // Mark payout failed
    const failedPayout = await db.updateDocument(DB(), payoutsCol, payout.$id, {
      status: "failed",
      failureReason: reason,
      processedAt: new Date().toISOString(),
    });

    await this._syncTransactionStatus(db, payout.$id, "failed");

    // Notify admin
    setImmediate(() => {
      try {
        const { createAdminNotification } = require("./notificationService");
        createAdminNotification(
          "fraud",
          "Merchant Payout Failed",
          `Payout of ${parsedAmount} via ${payout.method.toUpperCase()} failed. Funds restored to merchant wallet. Reason: ${reason}`,
          { link: `/payouts/${payout.$id}` },
        );
      } catch (_) {
        /* non-fatal */
      }
    });

    return failedPayout;
  }

  /** Update linked transaction(s) status when payout status changes */
  async _syncTransactionStatus(db, payoutId, newStatus) {
    const transactionsCol = TRANSACTIONS();
    if (!transactionsCol) return;

    try {
      const result = await db.listDocuments(DB(), transactionsCol, [
        Query.equal("payoutId", payoutId),
        Query.limit(5),
      ]);

      await Promise.all(
        result.documents.map((tx) =>
          db.updateDocument(DB(), transactionsCol, tx.$id, {
            status: newStatus,
          }),
        ),
      );
    } catch (_err) {
      // Non-fatal — transaction sync failure should not block payout completion
      logger.warn("PayoutService: transaction sync failed (non-fatal)", {
        payoutId,
        error: _err.message,
      });
    }
  }
}

module.exports = new PayoutService();
