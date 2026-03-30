"use strict";

/**
 * Billing Service
 *
 * The core recurring billing engine. Responsible for:
 *
 *   1. Finding all subscriptions due for billing (nextBillingDate <= now, status = active)
 *   2. Charging via saved card (cardPaymentService) or wallet deduction
 *   3. Recording each billing attempt in the BILLING_HISTORY collection
 *   4. Advancing nextBillingDate on success
 *   5. Retry logic: up to MAX_RETRIES attempts before marking past_due
 *   6. Notifying users on success and failure
 *   7. Audit logging every billing event
 *
 * IDEMPOTENCY:
 *   Every billing attempt is keyed by `{subscriptionId}:{billingPeriodKey}`
 *   where billingPeriodKey = ISO date of the scheduled nextBillingDate (truncated to day).
 *   This prevents double-charging if the scheduler fires twice in the same window.
 *
 * DESIGN:
 *   - Never throws from processDueSubscriptions — catches all errors per subscription
 *     to ensure one failure doesn't abort the entire billing run
 *   - Uses fire-and-forget setImmediate for notifications (same pattern as paymentController)
 *   - Wallet deduction mirrors paymentController._creditUserWallet but in reverse
 */

const { Query, ID } = require("node-appwrite");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");
const auditService = require("./auditService");
const subscriptionService = require("./subscriptionService");

// ── Collection helpers ────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const BILLING_COL = () => config.database.appwrite.billingHistoryCollectionId;
const WALLETS_COL = () => config.database.appwrite.walletsCollectionId;
const TRANSACTIONS_COL = () =>
  config.database.appwrite.transactionsCollectionId;
const getDatabases = () => dbConn.getDatabases();

// ── Lazy requires (prevent circular deps) ────────────────────────────────
const getCardPaymentService = () => require("./cardPaymentService");
const getCreateNotification = () =>
  require("../controllers/notificationController").createNotification;
const getCreateAdminNotification = () =>
  require("./notificationService").createAdminNotification;

// ── Configuration ─────────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const BATCH_SIZE = 50; // subscriptions processed per scheduler run

// ── Billing Period Key ────────────────────────────────────────────────────
/**
 * Produce a stable idempotency key for a billing cycle.
 * Format: {subscriptionId}:{YYYY-MM-DD of original nextBillingDate}
 */
function makeBillingPeriodKey(subscriptionId, nextBillingDate) {
  const d = new Date(nextBillingDate);
  const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
  return `${subscriptionId}:${dateStr}`;
}

// ── Billing Service ───────────────────────────────────────────────────────

const billingService = {
  /**
   * Main entry point called by the scheduler.
   *
   * Finds all active subscriptions whose nextBillingDate is in the past or now
   * and processes them one by one. Errors per subscription are caught and logged
   * so the remaining subscriptions continue to be processed.
   *
   * @returns {Promise<{ processed: number, succeeded: number, failed: number }>}
   */
  async processDueSubscriptions() {
    const runId = `billing-run-${Date.now()}`;
    logger.info(`billingService: starting billing run`, { runId });

    const db = getDatabases();
    const now = new Date().toISOString();

    let allDue;
    try {
      const result = await db.listDocuments(DB(), SUBS_COL_INTERNAL(), [
        Query.equal("status", "active"),
        Query.lessThanEqual("nextBillingDate", now),
        Query.limit(BATCH_SIZE),
        Query.orderAsc("nextBillingDate"), // oldest dues first
      ]);
      allDue = result.documents;
    } catch (err) {
      logger.error("billingService: failed to fetch due subscriptions", {
        runId,
        error: err.message,
      });
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    logger.info(`billingService: found ${allDue.length} due subscriptions`, {
      runId,
    });

    let succeeded = 0;
    let failed = 0;

    for (const sub of allDue) {
      try {
        await this.billSubscription(sub, runId);
        succeeded++;
      } catch (err) {
        failed++;
        logger.error(`billingService: unhandled error billing subscription`, {
          runId,
          subscriptionId: sub.$id,
          userId: sub.userId,
          error: err.message,
        });
      }
    }

    const summary = {
      runId,
      processed: allDue.length,
      succeeded,
      failed,
      completedAt: new Date().toISOString(),
    };
    logger.info("billingService: billing run complete", summary);
    return summary;
  },

  /**
   * Bill a single subscription.
   *
   * @param {object} sub - Subscription document from Appwrite
   * @param {string} runId - Identifier for this scheduler run (for log tracing)
   */
  async billSubscription(sub, runId = "manual") {
    const billingPeriodKey = makeBillingPeriodKey(sub.$id, sub.nextBillingDate);
    const context = {
      runId,
      subscriptionId: sub.$id,
      userId: sub.userId,
      planId: sub.planId,
      billingPeriodKey,
      amount: sub.planPrice,
      currency: sub.planCurrency,
      paymentMethod: sub.paymentMethod,
    };

    // ── Idempotency: skip if already billed this cycle ────────────────────
    const alreadyBilled = await this._findBillingRecord(billingPeriodKey);
    if (alreadyBilled && alreadyBilled.status === "success") {
      logger.info("billingService: skipping — already billed this cycle", {
        ...context,
        existingRecordId: alreadyBilled.$id,
      });
      return;
    }

    logger.info("billingService: processing subscription billing", context);

    const attemptNumber = (sub.retryCount || 0) + 1;
    let chargeResult = null;
    let chargeError = null;
    let transactionId = null;

    // ── Attempt charge ────────────────────────────────────────────────────
    try {
      if (sub.paymentMethod === "card") {
        const result = await this._chargeCard(sub);
        chargeResult = result;
        transactionId = result.transactionId;
      } else {
        const result = await this._deductWallet(sub);
        chargeResult = result;
        transactionId = result.transactionId;
      }
    } catch (err) {
      chargeError = err;
    }

    const billingStatus = chargeError ? "failed" : "success";

    // ── Record billing history ────────────────────────────────────────────
    await this._recordBillingHistory({
      subscriptionId: sub.$id,
      planId: sub.planId,
      userId: sub.userId,
      amount: sub.planPrice,
      currency: sub.planCurrency,
      status: billingStatus,
      transactionId,
      attemptNumber,
      billingPeriodKey,
      failureReason: chargeError?.message || null,
    });

    // ── Audit log ─────────────────────────────────────────────────────────
    auditService.logAction({
      actorId: "billing_engine",
      actorRole: "system",
      action:
        billingStatus === "success"
          ? "SUBSCRIPTION_BILLED"
          : "SUBSCRIPTION_BILLING_FAILED",
      entity: "subscription",
      entityId: sub.$id,
      metadata: {
        planId: sub.planId,
        amount: sub.planPrice,
        currency: sub.planCurrency,
        paymentMethod: sub.paymentMethod,
        attemptNumber,
        billingPeriodKey,
        transactionId,
        error: chargeError?.message,
      },
    });

    if (billingStatus === "success") {
      // ── Advance billing date for next cycle ───────────────────────────
      await subscriptionService.advanceBillingDate(sub.$id);

      logger.info("billingService: billing succeeded", {
        ...context,
        transactionId,
        attemptNumber,
      });

      this._notifyUser(sub.userId, "subscription_payment_success", {
        planName: sub.planName,
        amount: sub.planPrice,
        currency: sub.planCurrency,
        subscriptionId: sub.$id,
        transactionId,
      });
    } else {
      // ── Handle failure with retry / past_due logic ────────────────────
      await this._handleBillingFailure(sub, chargeError, attemptNumber);
    }
  },

  // ── Private: charge methods ───────────────────────────────────────────────

  /**
   * Charge subscription via saved card.
   * Re-uses cardPaymentService then creates a transaction record.
   */
  async _chargeCard(sub) {
    const cardPaymentService = getCardPaymentService();

    // Validate and charge the card
    const chargeResult = await cardPaymentService.chargeCard(
      sub.userId,
      sub.cardId,
      sub.planPrice,
      sub.planCurrency,
    );

    // Record in transactions collection
    const transactionDoc = await this._createTransactionRecord({
      userId: sub.userId,
      subscriptionId: sub.$id,
      amount: sub.planPrice,
      currency: sub.planCurrency,
      providerReference: chargeResult.providerReference,
      description: `Subscription billing — ${sub.planName} (${sub.planBillingCycle})`,
      provider: "card",
      cardLast4: chargeResult.cardLast4,
      cardBrand: chargeResult.cardBrand,
    });

    return {
      transactionId: transactionDoc.$id,
      providerReference: chargeResult.providerReference,
      cardLast4: chargeResult.cardLast4,
    };
  },

  /**
   * Charge subscription by deducting from user wallet.
   */
  async _deductWallet(sub) {
    const db = getDatabases();
    const { userId, planPrice, planCurrency } = sub;

    // Find wallet
    const walletResult = await db.listDocuments(DB(), WALLETS_COL(), [
      Query.equal("userId", userId),
      Query.equal("currency", planCurrency),
      Query.limit(1),
    ]);

    if (walletResult.total === 0) {
      throw new Error(
        `No ${planCurrency} wallet found. Please add funds or switch payment method.`,
      );
    }

    const wallet = walletResult.documents[0];
    const currentBalance = parseFloat(wallet.balance ?? 0);

    if (currentBalance < planPrice) {
      throw new Error(
        `Insufficient ${planCurrency} balance for subscription billing. ` +
          `Required: ${planPrice}, Available: ${currentBalance.toFixed(2)}`,
      );
    }

    const newBalance = parseFloat((currentBalance - planPrice).toFixed(8));
    await db.updateDocument(DB(), WALLETS_COL(), wallet.$id, {
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    });

    // Record in transactions collection
    const transactionDoc = await this._createTransactionRecord({
      userId,
      subscriptionId: sub.$id,
      amount: planPrice,
      currency: planCurrency,
      providerReference: `WALLET-SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      description: `Subscription billing — ${sub.planName} (${sub.planBillingCycle})`,
      provider: "wallet",
    });

    return { transactionId: transactionDoc.$id };
  },

  /**
   * Create a transaction record for a subscription billing event.
   */
  async _createTransactionRecord({
    userId,
    subscriptionId,
    amount,
    currency,
    providerReference,
    description,
    provider,
    cardLast4,
    cardBrand,
  }) {
    const db = getDatabases();
    const now = new Date().toISOString();
    return db.createDocument(DB(), TRANSACTIONS_COL(), ID.unique(), {
      senderId: userId,
      amount,
      currency,
      status: "completed",
      type: "subscription",
      provider,
      description: cardLast4
        ? `${description} — **** ${cardLast4} (${cardBrand})`
        : description,
      providerReference,
      idempotencyKey: providerReference,
      ipAddress: "billing_engine",
      flagged: false,
      subscriptionId,
      createdAt: now,
      updatedAt: now,
    });
  },

  // ── Private: failure handling ─────────────────────────────────────────────

  /**
   * Handle a failed billing attempt.
   * Up to MAX_RETRIES — after that the subscription is marked past_due.
   */
  async _handleBillingFailure(sub, error, attemptNumber) {
    logger.warn("billingService: billing attempt failed", {
      subscriptionId: sub.$id,
      userId: sub.userId,
      attemptNumber,
      maxRetries: MAX_RETRIES,
      error: error?.message,
    });

    if (attemptNumber >= MAX_RETRIES) {
      // Exhausted retries — mark past_due
      await subscriptionService.markPastDue(sub.$id, attemptNumber);
      logger.warn("billingService: subscription marked past_due", {
        subscriptionId: sub.$id,
        userId: sub.userId,
        attempts: attemptNumber,
      });
      this._notifyUser(sub.userId, "subscription_payment_failed", {
        planName: sub.planName,
        subscriptionId: sub.$id,
        reason: error?.message,
        finalFailure: true,
      });
    } else {
      // Schedule retry — increment count, next billing attempt will come in next scheduler run
      await subscriptionService.incrementRetry(sub.$id, attemptNumber);
      this._notifyUser(sub.userId, "subscription_payment_retry", {
        planName: sub.planName,
        subscriptionId: sub.$id,
        attemptNumber,
        maxRetries: MAX_RETRIES,
        reason: error?.message,
      });
    }
  },

  // ── Private: billing history record ──────────────────────────────────────

  async _recordBillingHistory({
    subscriptionId,
    planId,
    userId,
    amount,
    currency,
    status,
    transactionId,
    attemptNumber,
    billingPeriodKey,
    failureReason,
  }) {
    const db = getDatabases();
    const now = new Date().toISOString();
    try {
      return await db.createDocument(DB(), BILLING_COL(), ID.unique(), {
        subscriptionId,
        planId,
        userId,
        amount,
        currency,
        status,
        transactionId: transactionId || null,
        attemptNumber,
        billingPeriodKey,
        failureReason: failureReason || null,
        createdAt: now,
      });
    } catch (err) {
      // Non-fatal — billing history is for auditing, not blocking
      logger.error("billingService: failed to record billing history", {
        subscriptionId,
        billingPeriodKey,
        error: err.message,
      });
      return null;
    }
  },

  /**
   * Check if a billing record already exists for this period (idempotency).
   */
  async _findBillingRecord(billingPeriodKey) {
    const db = getDatabases();
    try {
      const result = await db.listDocuments(DB(), BILLING_COL(), [
        Query.equal("billingPeriodKey", billingPeriodKey),
        Query.limit(1),
      ]);
      return result.documents[0] || null;
    } catch {
      return null;
    }
  },

  // ── Private: notifications ────────────────────────────────────────────────

  /**
   * Fire-and-forget user notification for billing events.
   */
  _notifyUser(userId, eventType, data) {
    setImmediate(async () => {
      try {
        const createNotification = getCreateNotification();
        const createAdminNotification = getCreateAdminNotification();

        const messages = {
          subscription_payment_success: {
            title: "Payment Successful",
            message: `Your ${data.planName} subscription has been renewed. ${data.currency} ${data.amount} was charged.`,
          },
          subscription_payment_failed: {
            title: data.finalFailure
              ? "Subscription Suspended"
              : "Payment Failed",
            message: data.finalFailure
              ? `Your ${data.planName} subscription has been suspended after multiple failed payment attempts. Please update your payment method.`
              : `Payment attempt ${data.attemptNumber}/${data.maxRetries} for ${data.planName} failed. We will retry automatically.`,
          },
          subscription_payment_retry: {
            title: "Payment Retry Scheduled",
            message: `Payment attempt ${data.attemptNumber}/${data.maxRetries} for ${data.planName} failed. We will retry automatically.`,
          },
        };

        const msg = messages[eventType] || {
          title: "Subscription Update",
          message: `Your subscription ${data.planName} has been updated.`,
        };

        await createNotification(
          userId,
          "subscription",
          msg.title,
          msg.message,
          "/subscriptions",
        );

        // Always notify admins of failures
        if (eventType !== "subscription_payment_success") {
          await createAdminNotification(
            "subscription",
            `Subscription Billing ${data.finalFailure ? "Failed (Final)" : "Failed"}`,
            `User ${userId}: ${msg.message}`,
            { link: `/subscriptions` },
          );
        }
      } catch (err) {
        logger.warn(
          "billingService: notification dispatch failed (non-fatal)",
          {
            userId,
            eventType,
            error: err.message,
          },
        );
      }
    });
  },
};

// ── Internal helper (references subscriptionsCollectionId via config) ─────
function SUBS_COL_INTERNAL() {
  return config.database.appwrite.subscriptionsCollectionId;
}

module.exports = billingService;
