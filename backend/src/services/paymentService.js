/**
 * PaymentService — Send Money orchestration layer
 *
 * This service is the single entry-point for the "Send Money" feature.
 * It validates the request, routes to the appropriate provider, writes
 * the transaction record, and returns a normalised result.
 *
 * Supported providers:
 *   mpesa   — Safaricom Daraja STK Push  (KES)
 *   mtn     — MTN Mobile Money           (GHS, UGX, RWF, XOF, …)
 *   wallet  — Internal AfraPay transfer  (any currency)
 *
 * Architecture:
 *   PaymentController → PaymentService → {MpesaProvider | MtnMomoProvider | WalletTransferService}
 *                                        ↓
 *                                    Appwrite (transactions collection)
 *
 * Security guarantees:
 *   • Input validated before any DB / provider call
 *   • Idempotency enforced by the HTTP middleware (idempotency.js) AND here
 *     (duplicate transactionId check before provider call)
 *   • Provider credentials never logged; phone numbers masked in logs
 *   • Amount always parsed as float; NaN / negative values rejected
 *   • Currency allowlist enforced per provider
 */

"use strict";

const { ID, Query } = require("node-appwrite");
const { v4: uuidv4 } = require("uuid");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");
const walletTransferService = require("./walletTransferService");

// ── Provider registry (lazy initialisation) ──────────────────────────────────
let _mpesa = null;
let _mtn = null;
let _paystack = null;
let _flutterwave = null;
let _stripe = null;

function getMpesaProvider() {
  if (!_mpesa) {
    const MpesaProvider = require("../payments/providers/MpesaProvider");
    _mpesa = new MpesaProvider();
  }
  return _mpesa;
}

function getMtnProvider() {
  if (!_mtn) {
    const MtnMomoProvider = require("../payments/providers/MtnMomoProvider");
    _mtn = new MtnMomoProvider();
  }
  return _mtn;
}

function getPaystackProvider() {
  if (!_paystack) {
    const PaystackProvider = require("../payments/providers/PaystackProvider");
    _paystack = new PaystackProvider();
  }
  return _paystack;
}

function getFlutterwaveProvider() {
  if (!_flutterwave) {
    const FlutterwaveProvider = require("../payments/providers/FlutterwaveProvider");
    _flutterwave = new FlutterwaveProvider();
  }
  return _flutterwave;
}

function getStripeProvider() {
  if (!_stripe) {
    const StripeProvider = require("../payments/providers/StripeProvider");
    _stripe = new StripeProvider();
  }
  return _stripe;
}

// ── Appwrite accessors ────────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const TRANSACTIONS = () => config.database.appwrite.transactionsCollectionId;

// ── Constants ─────────────────────────────────────────────────────────────────
const VALID_PROVIDERS = new Set([
  "mpesa",
  "mtn",
  "wallet",
  "paystack",
  "flutterwave",
  "stripe",
]);

/** Providers that use phone-number-based routing */
const PHONE_PROVIDERS = new Set(["mpesa", "mtn", "wallet"]);
/** Providers that use bank account routing (accountNumber + bankCode + accountName) */
const BANK_PROVIDERS = new Set(["paystack", "flutterwave"]);
/** Providers that use a Stripe Connected Account ID */
const ACCOUNT_PROVIDERS = new Set(["stripe"]);

/** Per-provider currency allowlists (informational — providers enforce internally) */
const PROVIDER_CURRENCIES = {
  mpesa: new Set(["KES"]),
  mtn: new Set(["GHS", "UGX", "ZMW", "RWF", "XOF", "XAF", "NGN", "EUR"]),
  wallet: new Set(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"]),
  paystack: new Set(["NGN", "GHS", "ZAR", "KES", "USD", "EGP", "RWF"]),
  flutterwave: new Set([
    "NGN",
    "GHS",
    "KES",
    "ZAR",
    "UGX",
    "TZS",
    "RWF",
    "ZMW",
    "EUR",
    "USD",
    "GBP",
  ]),
  stripe: new Set(["USD", "EUR", "GBP", "CAD", "AUD"]),
};

class PaymentService {
  constructor() {
    this._db = null;
  }

  _databases() {
    if (!this._db) this._db = dbConn.getDatabases();
    return this._db;
  }

  // ── Public interface ────────────────────────────────────────────────────────

  /**
   * Send money via the specified provider.
   *
   * @param {Object} params
   * @param {string} params.idempotencyKey  UUID v4 — from Idempotency-Key header
   * @param {string} params.senderId        Authenticated user's AfraPay ID
   * @param {string} params.senderEmail     Sender's email (used by some providers)
   * @param {string} params.receiverPhone   Recipient's phone number (or wallet lookup)
   * @param {string} params.provider        "mpesa" | "mtn" | "wallet"
   * @param {number} params.amount          Positive decimal amount
   * @param {string} params.currency        ISO-4217 code
   * @param {string} [params.description]   Optional note
   * @param {string} [params.ipAddress]     Sender IP for audit
   * @returns {Promise<SendMoneyResult>}
   *
   * @typedef {Object} SendMoneyResult
   * @property {string}  transactionId
   * @property {string}  status   "processing" | "completed" | "failed"
   * @property {string}  provider
   * @property {number}  amount
   * @property {string}  currency
   * @property {string}  [providerReference]
   * @property {Object}  [nextAction]  UI instruction (e.g. USSD push message)
   * @property {string}  createdAt
   */
  async sendMoney({
    idempotencyKey,
    senderId,
    senderEmail,
    receiverPhone, // mpesa | mtn | wallet
    receiverAccountNumber, // paystack | flutterwave | stripe
    receiverBankCode, // paystack | flutterwave
    receiverAccountName, // paystack | flutterwave
    provider,
    amount,
    currency,
    description = "AfraPay Transfer",
    ipAddress,
  }) {
    // ── 1. Validate inputs ────────────────────────────────────────────────────
    this._validateSendRequest({
      provider,
      receiverAccountNumber,
      receiverBankCode,
      receiverAccountName,
      amount,
      currency,
      receiverPhone,
      idempotencyKey,
    });

    const parsedAmount = parseFloat(amount);

    // ── 2. Idempotency: check for existing transaction ─────────────────────────
    const existing = await this._findByIdempotencyKey(idempotencyKey);
    if (existing) {
      logger.info("PaymentService: replaying idempotent sendMoney request", {
        idempotencyKey,
        status: existing.status,
      });
      return this._docToResult(existing);
    }

    // ── 3. Create transaction record (status: pending) ─────────────────────────
    const transactionId = uuidv4();
    const now = new Date().toISOString();

    await this._databases().createDocument(
      DB(),
      TRANSACTIONS(),
      transactionId,
      {
        senderId,
        receiverPhone: receiverPhone || null,
        receiverProvider: provider,
        receiverAccountNumber: receiverAccountNumber || null,
        receiverBankCode: receiverBankCode || null,
        receiverAccountName: receiverAccountName || null,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        description,
        status: "pending",
        type: "send_money",
        providerReference: null,
        createdAt: now,
        updatedAt: now,
        ipAddress: ipAddress || null,
        idempotencyKey,
      },
    );

    // ── 4. Route to provider ──────────────────────────────────────────────────
    let providerResult;
    try {
      providerResult = await this._dispatchToProvider({
        transactionId,
        idempotencyKey,
        senderId,
        senderEmail,
        receiverPhone,
        receiverAccountNumber,
        receiverBankCode,
        receiverAccountName,
        provider,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        description,
      });
    } catch (providerError) {
      // Mark the transaction as failed immediately
      await this._updateStatus(transactionId, "failed", {
        failureReason: providerError.message,
      });

      logger.error("PaymentService: provider dispatch failed", {
        transactionId,
        provider,
        error: providerError.message,
      });

      throw Object.assign(
        new Error(providerError.message || "Payment provider error"),
        { code: "PROVIDER_ERROR", transactionId },
      );
    }

    // ── 5. Update transaction with provider reference and status ───────────────
    const updatedStatus =
      provider === "wallet" ? providerResult.status : "processing"; // mobile money is async

    await this._updateStatus(transactionId, updatedStatus, {
      providerReference:
        providerResult.providerRef || providerResult.transactionId || null,
    });

    logger.info("PaymentService: sendMoney dispatched", {
      transactionId,
      provider,
      status: updatedStatus,
      amount: parsedAmount,
      currency,
    });

    return {
      transactionId,
      status: updatedStatus,
      provider,
      amount: parsedAmount,
      currency: currency.toUpperCase(),
      providerReference: providerResult.providerRef || null,
      nextAction: providerResult.nextAction || null,
      createdAt: now,
    };
  }

  /**
   * Look up a transaction by ID, scoped to the requesting user.
   */
  async getTransaction(transactionId, userId) {
    const db = this._databases();
    const doc = await db.getDocument(DB(), TRANSACTIONS(), transactionId);

    if (!doc || doc.senderId !== userId) {
      const err = new Error("Transaction not found");
      err.code = "NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    return this._docToResult(doc);
  }

  /**
   * Refresh transaction status from provider (for polling front-ends).
   */
  async refreshStatus(transactionId, userId) {
    const db = this._databases();
    const doc = await db.getDocument(DB(), TRANSACTIONS(), transactionId);

    if (!doc || doc.senderId !== userId) {
      const err = new Error("Transaction not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    // Already terminal — nothing to refresh
    if (["completed", "failed"].includes(doc.status)) {
      return this._docToResult(doc);
    }

    const provider = doc.receiverProvider;
    const providerRef = doc.providerReference;

    if (!providerRef) return this._docToResult(doc);

    let latestResult;
    try {
      if (provider === "mpesa") {
        latestResult = await getMpesaProvider().getCharge(providerRef);
      } else if (provider === "mtn") {
        latestResult = await getMtnProvider().getCharge(providerRef);
      } else if (provider === "paystack") {
        latestResult =
          await getPaystackProvider().getTransferStatus(providerRef);
      } else if (provider === "flutterwave") {
        latestResult =
          await getFlutterwaveProvider().getTransferStatus(providerRef);
      } else if (provider === "stripe") {
        latestResult = await getStripeProvider().getTransferStatus(providerRef);
      } else {
        return this._docToResult(doc); // wallet — already final
      }
    } catch (err) {
      logger.warn("PaymentService: status refresh failed", {
        transactionId,
        provider,
        error: err.message,
      });
      return this._docToResult(doc); // return last known state
    }

    if (latestResult.status !== doc.status) {
      await this._updateStatus(transactionId, latestResult.status, {});
      doc.status = latestResult.status;
    }

    return this._docToResult(doc);
  }

  // ── Private dispatch ──────────────────────────────────────────────────────

  async _dispatchToProvider({
    transactionId,
    idempotencyKey,
    senderId,
    senderEmail,
    receiverPhone,
    receiverAccountNumber,
    receiverBankCode,
    receiverAccountName,
    provider,
    amount,
    currency,
    description,
  }) {
    if (provider === "mpesa") {
      return getMpesaProvider().charge({
        idempotencyKey,
        amount,
        currency,
        phoneNumber: receiverPhone,
        description,
      });
    }

    if (provider === "mtn") {
      return getMtnProvider().charge({
        idempotencyKey,
        amount,
        currency,
        phoneNumber: receiverPhone,
        description,
        payerMessage: description,
      });
    }

    if (provider === "wallet") {
      // walletTransferService uses its own idempotency by transactionId
      return walletTransferService.execute({
        transferId: transactionId,
        senderId,
        receiverPhone,
        amount,
        currency,
        description,
      });
    }

    if (provider === "paystack") {
      return getPaystackProvider().transfer({
        idempotencyKey,
        amount,
        currency,
        accountNumber: receiverAccountNumber,
        bankCode: receiverBankCode,
        accountName: receiverAccountName,
        description,
      });
    }

    if (provider === "flutterwave") {
      return getFlutterwaveProvider().transfer({
        idempotencyKey,
        amount,
        currency,
        accountNumber: receiverAccountNumber,
        bankCode: receiverBankCode,
        accountName: receiverAccountName,
        description,
      });
    }

    if (provider === "stripe") {
      return getStripeProvider().transfer({
        idempotencyKey,
        amount,
        currency,
        accountNumber: receiverAccountNumber, // Stripe connected account ID
        description,
      });
    }

    throw new Error(`Unknown provider: ${provider}`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  _validateSendRequest({
    provider,
    amount,
    currency,
    receiverPhone,
    receiverAccountNumber,
    receiverBankCode,
    receiverAccountName,
    idempotencyKey,
  }) {
    const errors = [];

    if (!VALID_PROVIDERS.has(provider)) {
      errors.push(
        `Invalid provider "${provider}". Must be one of: ${[...VALID_PROVIDERS].join(", ")}`,
      );
    }

    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.push("Amount must be a positive number");
    }

    if (!currency || typeof currency !== "string" || currency.length !== 3) {
      errors.push("Currency must be a valid ISO-4217 code (e.g. KES)");
    } else if (
      provider &&
      VALID_PROVIDERS.has(provider) &&
      !PROVIDER_CURRENCIES[provider].has(currency.toUpperCase())
    ) {
      const allowed = [...PROVIDER_CURRENCIES[provider]].join(", ");
      errors.push(
        `Provider "${provider}" does not support currency "${currency}". Allowed: ${allowed}`,
      );
    }

    // Validate recipient fields based on provider type
    if (PHONE_PROVIDERS.has(provider)) {
      if (!receiverPhone || typeof receiverPhone !== "string") {
        errors.push("receiverPhone is required for mpesa/mtn/wallet transfers");
      }
    } else if (BANK_PROVIDERS.has(provider)) {
      if (!receiverAccountNumber)
        errors.push("receiverAccountNumber is required");
      if (!receiverBankCode) errors.push("receiverBankCode is required");
      if (!receiverAccountName) errors.push("receiverAccountName is required");
    } else if (ACCOUNT_PROVIDERS.has(provider)) {
      if (!receiverAccountNumber) {
        errors.push(
          "receiverAccountNumber (Stripe connected account ID) is required",
        );
      }
    }

    if (!idempotencyKey) {
      errors.push("Idempotency-Key header is required");
    }

    if (errors.length > 0) {
      const err = new Error(errors.join("; "));
      err.code = "VALIDATION_ERROR";
      err.statusCode = 400;
      err.details = errors;
      throw err;
    }
  }

  async _findByIdempotencyKey(key) {
    try {
      const result = await this._databases().listDocuments(
        DB(),
        TRANSACTIONS(),
        [
          Query.equal("idempotencyKey", key),
          Query.equal("type", "send_money"),
          Query.limit(1),
        ],
      );
      return result.documents[0] || null;
    } catch {
      return null;
    }
  }

  async _updateStatus(transactionId, status, extraFields = {}) {
    try {
      await this._databases().updateDocument(
        DB(),
        TRANSACTIONS(),
        transactionId,
        {
          status,
          updatedAt: new Date().toISOString(),
          ...(status === "completed" && {
            completedAt: new Date().toISOString(),
          }),
          ...extraFields,
        },
      );
    } catch (err) {
      // Log but do not throw — the payment itself has been dispatched
      logger.error("PaymentService: failed to update transaction status", {
        transactionId,
        status,
        error: err.message,
      });
    }
  }

  _docToResult(doc) {
    return {
      transactionId: doc.$id,
      status: doc.status,
      provider: doc.receiverProvider,
      amount: doc.amount,
      currency: doc.currency,
      receiverPhone: doc.receiverPhone || null,
      receiverAccountNumber: doc.receiverAccountNumber || null,
      receiverBankCode: doc.receiverBankCode || null,
      receiverAccountName: doc.receiverAccountName || null,
      providerReference: doc.providerReference || null,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      completedAt: doc.completedAt || null,
    };
  }

  /**
   * Return the authenticated user's N most-recent outgoing send_money transfers.
   * Used by the "Recent Transfers" panel on the Send Money page.
   *
   * @param {string} userId  Authenticated user's AfraPay ID (maps to senderId field)
   * @param {number} limit   Maximum records — capped at 20
   */
  async getRecentTransfers(userId, limit = 10) {
    const db = this._databases();
    const safeLimit = Math.min(parseInt(limit) || 10, 20);
    try {
      const result = await db.listDocuments(DB(), TRANSACTIONS(), [
        Query.equal("senderId", userId),
        Query.equal("type", "send_money"),
        Query.orderDesc("createdAt"),
        Query.limit(safeLimit),
        Query.select([
          "$id",
          "receiverPhone",
          "receiverAccountNumber",
          "receiverAccountName",
          "receiverProvider",
          "amount",
          "currency",
          "status",
          "description",
          "createdAt",
        ]),
      ]);
      return result.documents.map((doc) => ({
        id: doc.$id,
        recipient:
          doc.receiverAccountName ||
          (doc.receiverPhone ? this._maskPhone(doc.receiverPhone) : null) ||
          (doc.receiverAccountNumber
            ? this._maskAccount(doc.receiverAccountNumber)
            : null) ||
          "—",
        provider: doc.receiverProvider,
        amount: doc.amount,
        currency: doc.currency,
        status: doc.status,
        description: doc.description || null,
        createdAt: doc.createdAt,
      }));
    } catch (err) {
      logger.error("PaymentService: getRecentTransfers failed", {
        userId,
        error: err.message,
      });
      throw err;
    }
  }

  _maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 4) + "****" + phone.slice(-3);
  }

  _maskAccount(account) {
    if (!account || account.length < 5) return account;
    return account.slice(0, 3) + "****" + account.slice(-3);
  }
}

module.exports = new PaymentService();
