/**
 * Merchant Service
 *
 * Core business logic for merchant onboarding, approval workflow, and analytics.
 *
 * Flow:
 *   1. User registers → merchant created with status="pending"
 *   2. Admin approves → till generated, wallet created, status="approved"
 *   3. Admin rejects  → status="rejected", reason stored
 *
 * Collection dependencies:
 *   - merchants          (APPWRITE_MERCHANTS_COLLECTION_ID)
 *   - merchant_wallets   (APPWRITE_MERCHANT_WALLETS_COLLECTION_ID)
 *   - transactions       (APPWRITE_TRANSACTIONS_COLLECTION_ID)
 *
 * Security guarantees:
 *   - One merchant registration per user (checked before insert)
 *   - Only approved merchants receive till numbers and wallets
 *   - Business type validated against allowlist
 *   - Phone sanitised before storage
 */

"use strict";

const { Query, ID } = require("node-appwrite");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");
const tillService = require("./tillService");

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const MERCHANTS = () => config.database.appwrite.merchantsCollectionId;
const MERCHANT_WALLETS = () =>
  config.database.appwrite.merchantWalletsCollectionId;
const TRANSACTIONS = () => config.database.appwrite.transactionsCollectionId;

const VALID_BUSINESS_TYPES = [
  "retail",
  "restaurant",
  "services",
  "wholesale",
  "salon",
  "pharmacy",
  "supermarket",
  "tech",
  "logistics",
  "other",
];

const VALID_STATUSES = ["pending", "approved", "rejected"];

// Sanitise phone — strip non-digits except leading +
function sanitisePhone(phone) {
  if (!phone) return "";
  return phone.trim().replace(/[^\d+]/g, "");
}

class MerchantService {
  _databases() {
    return dbConn.getDatabases();
  }

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Register a new merchant application.
   * Prevents duplicate registrations per user (one merchant per account).
   *
   * @param {Object} params
   * @param {string} params.ownerId       Authenticated user ID
   * @param {string} params.businessName  Legal business name (max 120 chars)
   * @param {string} params.businessType  One of VALID_BUSINESS_TYPES
   * @param {string} params.phoneNumber   Business phone number
   * @returns {Promise<object>}  Created merchant document
   */
  async register({ ownerId, businessName, businessType, phoneNumber }) {
    // ── Input validation ───────────────────────────────────────────────────
    if (!ownerId || !businessName || !businessType || !phoneNumber) {
      const err = new Error(
        "Missing required fields: businessName, businessType, phoneNumber",
      );
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    if (businessName.trim().length < 2 || businessName.trim().length > 120) {
      const err = new Error(
        "Business name must be between 2 and 120 characters",
      );
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    if (!VALID_BUSINESS_TYPES.includes(businessType)) {
      const err = new Error(
        `Invalid business type. Valid types: ${VALID_BUSINESS_TYPES.join(", ")}`,
      );
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    const phone = sanitisePhone(phoneNumber);
    if (phone.length < 7 || phone.length > 20) {
      const err = new Error("Invalid phone number");
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    const db = this._databases();
    const merchantsCol = MERCHANTS();

    if (!merchantsCol) {
      const err = new Error(
        "Merchant collection not configured. Please set APPWRITE_MERCHANTS_COLLECTION_ID.",
      );
      err.code = "CONFIGURATION_ERROR";
      err.status = 503;
      throw err;
    }

    // ── Duplicate check ────────────────────────────────────────────────────
    const existing = await db.listDocuments(DB(), merchantsCol, [
      Query.equal("ownerId", ownerId),
      Query.limit(1),
    ]);

    if (existing.total > 0) {
      const err = new Error(
        "You already have a merchant account registered with this user account",
      );
      err.code = "CONFLICT_ERROR";
      err.status = 409;
      throw err;
    }

    // ── Create merchant record ─────────────────────────────────────────────
    const now = new Date().toISOString();
    const merchant = await db.createDocument(DB(), merchantsCol, ID.unique(), {
      ownerId,
      businessName: businessName.trim(),
      businessType,
      phoneNumber: phone,
      status: "pending",
      tillNumber: null,
    });

    logger.info("MerchantService: registration created", {
      merchantId: merchant.$id,
      ownerId,
      businessName: merchant.businessName,
    });

    return merchant;
  }

  // ── Admin Approval Workflow ───────────────────────────────────────────────

  /**
   * Approve a merchant: generate till number, create wallet, set status="approved".
   *
   * @param {string} merchantId  Appwrite document ID of the merchant
   * @returns {Promise<object>}  Updated merchant document
   */
  async approve(merchantId) {
    const db = this._databases();
    const merchantsCol = MERCHANTS();
    const walletsCol = MERCHANT_WALLETS();

    // Fetch merchant — throws AppwriteException if not found
    const merchant = await db.getDocument(DB(), merchantsCol, merchantId);

    if (merchant.status !== "pending") {
      const err = new Error(
        `Cannot approve merchant with status "${merchant.status}". Only pending merchants can be approved.`,
      );
      err.code = "CONFLICT_ERROR";
      err.status = 409;
      throw err;
    }

    // Generate unique till number
    const tillNumber = await tillService.generateTillNumber();

    const now = new Date().toISOString();

    // Update merchant status and assign till
    const updated = await db.updateDocument(DB(), merchantsCol, merchantId, {
      status: "approved",
      tillNumber,
    });

    // Create merchant wallet (non-fatal on failure — can be retried)
    if (walletsCol) {
      try {
        await db.createDocument(DB(), walletsCol, ID.unique(), {
          merchantId,
          balance: 0,
          currency: "USD",
        });
      } catch (walletErr) {
        logger.error("MerchantService: wallet creation failed (non-fatal)", {
          merchantId,
          error: walletErr.message,
        });
      }
    } else {
      logger.warn(
        "MerchantService: APPWRITE_MERCHANT_WALLETS_COLLECTION_ID not set — wallet not created",
      );
    }

    logger.info("MerchantService: merchant approved", {
      merchantId,
      tillNumber,
      businessName: updated.businessName,
    });

    return updated;
  }

  /**
   * Reject a merchant application.
   *
   * @param {string} merchantId  Appwrite document ID
   * @param {string} [reason]    Optional rejection reason
   * @returns {Promise<object>}  Updated merchant document
   */
  async reject(merchantId, reason = "") {
    const db = this._databases();
    const merchantsCol = MERCHANTS();

    const merchant = await db.getDocument(DB(), merchantsCol, merchantId);

    if (merchant.status === "approved") {
      const err = new Error(
        "Cannot reject an already approved merchant. Suspend the merchant instead.",
      );
      err.code = "CONFLICT_ERROR";
      err.status = 409;
      throw err;
    }

    const updated = await db.updateDocument(DB(), merchantsCol, merchantId, {
      status: "rejected",
      rejectionReason: reason.trim().slice(0, 500),
    });

    logger.info("MerchantService: merchant rejected", {
      merchantId,
      businessName: merchant.businessName,
    });

    return updated;
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  /**
   * Get a merchant by its document ID.
   * @param {string} merchantId
   */
  async getMerchantById(merchantId) {
    const db = this._databases();
    const merchantsCol = MERCHANTS();
    if (!merchantsCol) return null;

    const merchant = await db.getDocument(DB(), merchantsCol, merchantId);
    if (!merchant) return null;

    if (merchant.status === "approved") {
      const wallet = await this.getMerchantWallet(merchantId);
      return { ...merchant, wallet: wallet || null };
    }

    return merchant;
  }

  /**
   * Get the merchant profile owned by a specific user.
   * @param {string} ownerId  AfraPay user ID
   */
  async getMerchantByOwner(ownerId) {
    const db = this._databases();
    const merchantsCol = MERCHANTS();
    if (!merchantsCol) return null;

    const result = await db.listDocuments(DB(), merchantsCol, [
      Query.equal("ownerId", ownerId),
      Query.limit(1),
    ]);

    if (result.total === 0) return null;

    const merchant = result.documents[0];

    if (merchant.status === "approved") {
      const wallet = await this.getMerchantWallet(merchant.$id);
      return { ...merchant, wallet: wallet || null };
    }

    return merchant;
  }

  /**
   * Look up a merchant by their till number. Only returns approved merchants.
   * @param {string} tillNumber  e.g. "AFR-482931"
   */
  async getMerchantByTill(tillNumber) {
    const db = this._databases();
    const merchantsCol = MERCHANTS();
    if (!merchantsCol) return null;

    const result = await db.listDocuments(DB(), merchantsCol, [
      Query.equal("tillNumber", tillNumber),
      Query.equal("status", "approved"),
      Query.limit(1),
    ]);

    return result.total > 0 ? result.documents[0] : null;
  }

  /**
   * List merchants with optional filters (for admin use).
   *
   * @param {Object} options
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @param {string} [options.status]   Filter by status
   * @param {string} [options.search]   Search by business name
   * @returns {Promise<{documents: object[], total: number}>}
   */
  async listMerchants({ page = 1, limit = 20, status, search } = {}) {
    const db = this._databases();
    const merchantsCol = MERCHANTS();

    if (!merchantsCol) return { documents: [], total: 0 };

    const queries = [];

    if (status && VALID_STATUSES.includes(status)) {
      queries.push(Query.equal("status", status));
    }

    if (search && search.trim()) {
      queries.push(Query.search("businessName", search.trim()));
    }

    queries.push(Query.orderDesc("$createdAt"));
    queries.push(Query.limit(Math.min(parseInt(limit) || 20, 100)));
    queries.push(
      Query.offset(
        (Math.max(parseInt(page) || 1, 1) - 1) *
          Math.min(parseInt(limit) || 20, 100),
      ),
    );

    return db.listDocuments(DB(), merchantsCol, queries);
  }

  // ── Wallet operations ─────────────────────────────────────────────────────

  /**
   * Get the wallet document for a merchant.
   * @param {string} merchantId
   */
  async getMerchantWallet(merchantId) {
    const db = this._databases();
    const walletsCol = MERCHANT_WALLETS();
    if (!walletsCol) return null;

    const result = await db.listDocuments(DB(), walletsCol, [
      Query.equal("merchantId", merchantId),
      Query.limit(1),
    ]);

    return result.total > 0 ? result.documents[0] : null;
  }

  /**
   * Credit the merchant wallet by the given amount.
   * Used by the pay-till payment flow.
   *
   * @param {string} merchantId
   * @param {number} amount   Positive decimal
   * @returns {Promise<object>}  Updated wallet document
   */
  async creditMerchantWallet(merchantId, amount) {
    const db = this._databases();
    const walletsCol = MERCHANT_WALLETS();

    if (!walletsCol) {
      const err = new Error(
        "Merchant wallets collection not configured (APPWRITE_MERCHANT_WALLETS_COLLECTION_ID)",
      );
      err.code = "CONFIGURATION_ERROR";
      err.status = 503;
      throw err;
    }

    const wallet = await this.getMerchantWallet(merchantId);

    if (!wallet) {
      const err = new Error(`No wallet found for merchant ${merchantId}`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      const err = new Error("Amount must be a positive number");
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    const newBalance = parseFloat(wallet.balance || 0) + parsedAmount;

    const updated = await db.updateDocument(DB(), walletsCol, wallet.$id, {
      balance: newBalance,
    });

    logger.info("MerchantService: wallet credited", {
      merchantId,
      amount: parsedAmount,
      newBalance,
    });

    return updated;
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  /**
   * Get analytics for a specific merchant.
   *
   * @param {string} merchantId
   * @param {Object} [options]
   * @param {string} [options.period="month"]  "day" | "week" | "month" | "quarter" | "year"
   * @returns {Promise<object>}
   */
  async getAnalytics(merchantId, { period = "month" } = {}) {
    const db = this._databases();
    const transactionsCol = TRANSACTIONS();

    const { start } = this._getDateRange(period);

    let transactions = [];

    if (transactionsCol) {
      // Fetch up to 500 transactions in the period for this merchant
      const result = await db.listDocuments(DB(), transactionsCol, [
        Query.equal("merchantId", merchantId),
        Query.greaterThanEqual("$createdAt", start),
        Query.orderDesc("$createdAt"),
        Query.limit(500),
      ]);
      transactions = result.documents;
    }

    const completedTxns = transactions.filter((t) => t.status === "completed");

    const totalSales = completedTxns.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0,
    );

    const dailyVolume = this._aggregateByDay(completedTxns);

    return {
      period,
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalTransactions: transactions.length,
      completedTransactions: completedTxns.length,
      pendingTransactions: transactions.filter((t) => t.status === "pending")
        .length,
      failedTransactions: transactions.filter((t) => t.status === "failed")
        .length,
      dailyVolume,
      recentPayments: transactions.slice(0, 10),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  _getDateRange(period) {
    const now = new Date();
    const start = new Date(now);

    switch (period) {
      case "day":
        start.setDate(start.getDate() - 1);
        break;
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "quarter":
        start.setMonth(start.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "month":
      default:
        start.setMonth(start.getMonth() - 1);
    }

    return { start: start.toISOString(), end: now.toISOString() };
  }

  _aggregateByDay(transactions) {
    const buckets = {};

    transactions.forEach((t) => {
      const day = t.$createdAt ? t.$createdAt.slice(0, 10) : "unknown";
      if (!buckets[day]) {
        buckets[day] = { date: day, amount: 0, count: 0 };
      }
      buckets[day].amount += parseFloat(t.amount || 0);
      buckets[day].count += 1;
    });

    return Object.values(buckets)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, amount: parseFloat(d.amount.toFixed(2)) }));
  }

  /**
   * Fetch a merchant owner's profile (email + first name) for email notifications.
   * Returns safe fallbacks if the user collection is not configured or the doc is missing.
   *
   * @param {string} ownerId  AfraPay user document ID
   * @returns {Promise<{ email: string|null, firstName: string }>}
   */
  async getOwnerInfo(ownerId) {
    const userCol = config.database.appwrite.userCollectionId;
    if (!userCol || !ownerId) return { email: null, firstName: "there" };
    try {
      const db = this._databases();
      const userDoc = await db.getDocument(DB(), userCol, ownerId);
      return {
        email: userDoc.email || null,
        firstName: userDoc.firstName || "there",
      };
    } catch (err) {
      logger.warn("MerchantService: getOwnerInfo failed (non-fatal)", {
        ownerId,
        error: err.message,
      });
      return { email: null, firstName: "there" };
    }
  }
}

module.exports = new MerchantService();
