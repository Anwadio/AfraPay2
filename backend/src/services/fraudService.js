/**
 * Fraud Detection Service
 * Real-time fraud analysis for all financial transactions.
 *
 * Checks performed before a transaction is finalised:
 *   1. Rapid transactions  — >3 transactions for the same user within 60 s
 *   2. High-value anomaly  — single transaction > HIGH_VALUE_THRESHOLD
 *   3. Multiple accounts per device / phone
 *   4. Repeated failed transactions in the last 10 minutes
 *
 * When fraud is detected:
 *   - Returns { flagged: true, reason, severity }
 *   - Persists a record in the FRAUD_FLAGS collection
 *   - Caller is expected to mark the transaction status as "flagged"
 */

"use strict";

const { ID, Query } = require("node-appwrite");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");

// Lazy require to avoid any circular dep risks
const getCreateAdminNotification = () =>
  require("./notificationService").createAdminNotification;

// Thresholds
const HIGH_VALUE_THRESHOLD = 10_000; // USD equivalent
const RAPID_TX_WINDOW_MS = 60_000; // 1 minute
const RAPID_TX_LIMIT = 3; // max transactions in that window
const FAILED_TX_WINDOW_MS = 10 * 60_000; // 10 minutes
const FAILED_TX_LIMIT = 5;

// Lazy collection accessors
const DB = () => config.database.appwrite.databaseId;
const TX_COL = () => config.database.appwrite.transactionsCollectionId;
const USERS_COL = () => config.database.appwrite.userCollectionId;
const FLAGS_COL = () => config.database.appwrite.fraudFlagsCollectionId;

class FraudService {
  /**
   * Run all fraud checks on an about-to-be-finalised transaction.
   * Never throws — failures are silently degraded to { flagged: false }.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.transactionId
   * @param {number} params.amount        Numeric amount in source currency
   * @param {string} params.currency
   * @param {string} [params.deviceId]    X-Device-ID header value
   * @param {string} [params.phone]
   * @param {string} [params.type]        "payment" | "transfer" | "withdrawal" | "deposit"
   * @returns {Promise<{ flagged: boolean, reason?: string, severity?: string }>}
   */
  async checkTransaction({
    userId,
    transactionId,
    amount,
    currency,
    deviceId = "",
    phone = "",
    type = "payment",
  }) {
    try {
      const db = dbConn.getDatabases();

      // ── 1. Rapid transactions ──────────────────────────────────────────
      const windowStart = new Date(
        Date.now() - RAPID_TX_WINDOW_MS,
      ).toISOString();
      const recentTxs = await db.listDocuments(DB(), TX_COL(), [
        Query.equal("userId", userId),
        Query.greaterThanEqual("createdAt", windowStart),
        Query.limit(RAPID_TX_LIMIT + 1),
      ]);
      if (recentTxs.total > RAPID_TX_LIMIT) {
        return await this._flag(
          transactionId,
          "Rapid transactions detected",
          "medium",
        );
      }

      // ── 2. High-value anomaly ──────────────────────────────────────────
      if (parseFloat(amount) > HIGH_VALUE_THRESHOLD) {
        return await this._flag(transactionId, "High-value anomaly", "high");
      }

      // ── 3. Multiple accounts sharing the same device ──────────────────
      if (deviceId) {
        const sameDevice = await db.listDocuments(DB(), USERS_COL(), [
          Query.equal("deviceId", deviceId),
          Query.limit(2),
        ]);
        if (sameDevice.total > 1) {
          return await this._flag(
            transactionId,
            "Multiple accounts on same device",
            "medium",
          );
        }
      }

      // ── 4. Repeated failed transactions ───────────────────────────────
      const failWindowStart = new Date(
        Date.now() - FAILED_TX_WINDOW_MS,
      ).toISOString();
      const failedTxs = await db.listDocuments(DB(), TX_COL(), [
        Query.equal("userId", userId),
        Query.equal("status", "failed"),
        Query.greaterThanEqual("createdAt", failWindowStart),
        Query.limit(FAILED_TX_LIMIT + 1),
      ]);
      if (failedTxs.total >= FAILED_TX_LIMIT) {
        return await this._flag(
          transactionId,
          "Repeated failed transaction attempts",
          "high",
        );
      }

      return { flagged: false };
    } catch (_err) {
      // Fraud service failures must never block the payment flow
      return { flagged: false };
    }
  }

  /**
   * Retrieve flagged transactions for the admin dashboard.
   * @param {Object} filters  { severity, status, startDate, endDate, page, limit }
   * @returns {Promise<{ flags: object[], total: number }>}
   */
  async queryFlags({
    severity,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = {}) {
    const db = dbConn.getDatabases();
    const queries = [];

    if (severity) queries.push(Query.equal("severity", severity));
    if (status) queries.push(Query.equal("status", status));
    if (startDate) queries.push(Query.greaterThanEqual("createdAt", startDate));
    if (endDate) queries.push(Query.lessThanEqual("createdAt", endDate));

    queries.push(Query.orderDesc("createdAt"));
    queries.push(Query.limit(parseInt(limit)));
    queries.push(Query.offset((parseInt(page) - 1) * parseInt(limit)));

    const result = await db.listDocuments(DB(), FLAGS_COL(), queries);
    return { flags: result.documents, total: result.total };
  }

  /**
   * Update a fraud flag record (mark_safe | escalate).
   * Blocking user is handled by calling adminController.updateUserStatus separately.
   * @param {string} flagId
   * @param {Object} update   { status, reviewedBy, notes }
   * @returns {Promise<object>}
   */
  async updateFlag(flagId, { status, reviewedBy, notes }) {
    const db = dbConn.getDatabases();
    return db.updateDocument(DB(), FLAGS_COL(), flagId, {
      status,
      reviewedBy: reviewedBy || "",
      reviewNotes: notes || "",
      reviewedAt: new Date().toISOString(),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  async _flag(transactionId, reason, severity) {
    try {
      await dbConn
        .getDatabases()
        .createDocument(DB(), FLAGS_COL(), ID.unique(), {
          transactionId,
          reason,
          severity,
          status: "open",
          reviewedBy: "",
          reviewNotes: "",
          reviewedAt: null,
          $createdAt: new Date().toISOString(),
        });
    } catch (_err) {
      // Persist failure is non-fatal
    }

    // Notify admins of the fraud flag (fire-and-forget)
    setImmediate(() => {
      getCreateAdminNotification()(
        "fraud",
        `Fraud Alert — ${severity.toUpperCase()} severity`,
        `Transaction ${transactionId}: ${reason}`,
        { link: `/fraud-monitoring?tx=${transactionId}` },
      ).catch(() => {});
    });

    return { flagged: true, reason, severity };
  }
}

module.exports = new FraudService();
