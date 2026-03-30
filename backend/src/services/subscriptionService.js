"use strict";

/**
 * Subscription Service
 *
 * Manages the full subscription lifecycle:
 *   - Plan retrieval and validation
 *   - Subscription creation (with optional immediate first charge)
 *   - Status transitions: active → paused → active → canceled
 *   - Next billing date calculation
 *   - Duplicate subscription prevention per (userId, planId) pair
 *
 * This service is the single source of truth for subscription state.
 * The billingService handles the recurring charge execution.
 */

const { Query, ID } = require("node-appwrite");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");
const auditService = require("./auditService");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// ── Collection helpers ────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const PLANS_COL = () => config.database.appwrite.subscriptionPlansCollectionId;
const SUBS_COL = () => config.database.appwrite.subscriptionsCollectionId;
const getDatabases = () => dbConn.getDatabases();

// ── Billing cycle constants ───────────────────────────────────────────────
const BILLING_CYCLES = new Set(["daily", "weekly", "monthly", "yearly"]);
const SUPPORTED_CURRENCIES = new Set([
  "KES",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "ZAR",
  "UGX",
]);
const SUBSCRIPTION_STATUSES = new Set([
  "active",
  "paused",
  "canceled",
  "past_due",
]);

// ── Date helpers ──────────────────────────────────────────────────────────

/**
 * Calculate the next billing date from a given start date based on billing cycle.
 * Always returns a future date.
 *
 * @param {Date|string} fromDate - Base date to calculate from
 * @param {string} billingCycle - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @returns {Date}
 */
function calculateNextBillingDate(fromDate, billingCycle) {
  const date = new Date(fromDate);
  switch (billingCycle) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new ValidationError(`Unknown billing cycle: ${billingCycle}`);
  }
  return date;
}

// ── Subscription Service ──────────────────────────────────────────────────

const subscriptionService = {
  // ── Plans ────────────────────────────────────────────────────────────────

  /**
   * Retrieve all active subscription plans.
   */
  async getActivePlans() {
    const db = getDatabases();
    const result = await db.listDocuments(DB(), PLANS_COL(), [
      Query.equal("isActive", true),
      Query.orderAsc("price"),
      Query.limit(100),
    ]);
    return result.documents;
  },

  /**
   * Retrieve all plans (admin — including inactive).
   */
  async getAllPlans({ page = 1, limit = 50 } = {}) {
    const db = getDatabases();
    const offset = (page - 1) * limit;
    const result = await db.listDocuments(DB(), PLANS_COL(), [
      Query.orderDesc("createdAt"),
      Query.limit(parseInt(limit)),
      Query.offset(offset),
    ]);
    return { plans: result.documents, total: result.total };
  },

  /**
   * Get a single plan by ID. Throws NotFoundError if not found.
   */
  async getPlanById(planId) {
    const db = getDatabases();
    try {
      return await db.getDocument(DB(), PLANS_COL(), planId);
    } catch {
      throw new NotFoundError("Subscription plan");
    }
  },

  /**
   * Create a new subscription plan (admin only).
   */
  async createPlan({
    name,
    description,
    price,
    currency,
    billingCycle,
    isActive = true,
  }) {
    if (!name?.trim()) throw new ValidationError("Plan name is required");
    if (!BILLING_CYCLES.has(billingCycle))
      throw new ValidationError(
        `Invalid billing cycle. Must be one of: ${[...BILLING_CYCLES].join(", ")}`,
      );
    if (!SUPPORTED_CURRENCIES.has(currency))
      throw new ValidationError(
        `Invalid currency. Supported: ${[...SUPPORTED_CURRENCIES].join(", ")}`,
      );
    const parsedPrice = parseFloat(price);
    if (!isFinite(parsedPrice) || parsedPrice <= 0)
      throw new ValidationError("Price must be a positive number");

    const db = getDatabases();
    const now = new Date().toISOString();
    const plan = await db.createDocument(DB(), PLANS_COL(), ID.unique(), {
      name: name.trim(),
      description: description?.trim() || "",
      price: parsedPrice,
      currency: currency.toUpperCase(),
      billingCycle,
      isActive: Boolean(isActive),
      createdAt: now,
      updatedAt: now,
    });
    logger.info("subscriptionService: plan created", {
      planId: plan.$id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
    });
    return plan;
  },

  /**
   * Update an existing plan (admin only).
   * Updating price/billingCycle does NOT affect existing active subscriptions
   * — they will use the stored attributes at billing time.
   */
  async updatePlan(planId, updates) {
    const plan = await this.getPlanById(planId);
    const allowed = {};

    if (updates.name !== undefined) {
      if (!updates.name.trim())
        throw new ValidationError("Plan name cannot be empty");
      allowed.name = updates.name.trim();
    }
    if (updates.description !== undefined)
      allowed.description = updates.description.trim();
    if (updates.price !== undefined) {
      const p = parseFloat(updates.price);
      if (!isFinite(p) || p <= 0)
        throw new ValidationError("Price must be a positive number");
      allowed.price = p;
    }
    if (updates.currency !== undefined) {
      if (!SUPPORTED_CURRENCIES.has(updates.currency))
        throw new ValidationError("Unsupported currency");
      allowed.currency = updates.currency.toUpperCase();
    }
    if (updates.billingCycle !== undefined) {
      if (!BILLING_CYCLES.has(updates.billingCycle))
        throw new ValidationError("Invalid billing cycle");
      allowed.billingCycle = updates.billingCycle;
    }
    if (updates.isActive !== undefined)
      allowed.isActive = Boolean(updates.isActive);

    allowed.updatedAt = new Date().toISOString();

    const db = getDatabases();
    const updated = await db.updateDocument(
      DB(),
      PLANS_COL(),
      plan.$id,
      allowed,
    );
    logger.info("subscriptionService: plan updated", {
      planId,
      updates: allowed,
    });
    return updated;
  },

  // ── Subscriptions ─────────────────────────────────────────────────────────

  /**
   * Create a new subscription for a user.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.planId
   * @param {'card'|'wallet'} params.paymentMethod
   * @param {string|null} params.cardId - Required when paymentMethod === 'card'
   * @param {string} params.ipAddress
   * @returns {Promise<object>} - New subscription document
   */
  async createSubscription({
    userId,
    planId,
    paymentMethod,
    cardId,
    ipAddress,
  }) {
    if (!["card", "wallet"].includes(paymentMethod))
      throw new ValidationError("paymentMethod must be 'card' or 'wallet'");
    if (paymentMethod === "card" && !cardId)
      throw new ValidationError(
        "cardId is required when paymentMethod is 'card'",
      );

    // ── Validate plan ─────────────────────────────────────────────────────
    const plan = await this.getPlanById(planId);
    if (!plan.isActive)
      throw new ValidationError(
        "This subscription plan is no longer available",
      );

    // ── Prevent duplicate active subscription to same plan ────────────────
    const existing = await this.getActiveSubscriptionForPlan(userId, planId);
    if (existing)
      throw new ConflictError(
        "You already have an active subscription to this plan. Cancel or pause it first.",
      );

    const db = getDatabases();
    const now = new Date();
    const nowIso = now.toISOString();
    const nextBillingDate = calculateNextBillingDate(now, plan.billingCycle);

    const doc = await db.createDocument(DB(), SUBS_COL(), ID.unique(), {
      userId,
      planId: plan.$id,
      planName: plan.name,
      planPrice: plan.price,
      planCurrency: plan.currency,
      planBillingCycle: plan.billingCycle,
      status: "active",
      paymentMethod,
      cardId: paymentMethod === "card" ? cardId : null,
      startDate: nowIso,
      nextBillingDate: nextBillingDate.toISOString(),
      lastBilledAt: null,
      retryCount: 0,
      canceledAt: null,
      pausedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    logger.info("subscriptionService: subscription created", {
      subscriptionId: doc.$id,
      userId,
      planId,
      paymentMethod,
      nextBillingDate: nextBillingDate.toISOString(),
    });

    auditService.logAction({
      actorId: userId,
      actorRole: "user",
      action: "SUBSCRIPTION_CREATED",
      entity: "subscription",
      entityId: doc.$id,
      metadata: {
        planId,
        planName: plan.name,
        paymentMethod,
        billingCycle: plan.billingCycle,
        price: plan.price,
        currency: plan.currency,
      },
      ipAddress,
    });

    return { subscription: doc, plan };
  },

  /**
   * Get all subscriptions for a user.
   */
  async getUserSubscriptions(userId, { page = 1, limit = 20 } = {}) {
    const db = getDatabases();
    const offset = (page - 1) * limit;
    const result = await db.listDocuments(DB(), SUBS_COL(), [
      Query.equal("userId", userId),
      Query.orderDesc("createdAt"),
      Query.limit(parseInt(limit)),
      Query.offset(offset),
    ]);
    return { subscriptions: result.documents, total: result.total };
  },

  /**
   * Get a single subscription by ID. Verifies ownership unless skipOwnership=true.
   */
  async getSubscriptionById(
    subscriptionId,
    userId,
    { skipOwnership = false } = {},
  ) {
    const db = getDatabases();
    let doc;
    try {
      doc = await db.getDocument(DB(), SUBS_COL(), subscriptionId);
    } catch {
      throw new NotFoundError("Subscription");
    }
    if (!skipOwnership && doc.userId !== userId)
      throw new AuthorizationError(
        "You do not have access to this subscription",
      );
    return doc;
  },

  /**
   * Find the active subscription for a specific (userId, planId) pair.
   * Returns null if none found.
   */
  async getActiveSubscriptionForPlan(userId, planId) {
    const db = getDatabases();
    const result = await db.listDocuments(DB(), SUBS_COL(), [
      Query.equal("userId", userId),
      Query.equal("planId", planId),
      Query.equal("status", "active"),
      Query.limit(1),
    ]);
    return result.documents[0] || null;
  },

  /**
   * Cancel a subscription. Does not refund — billing stops after next billing date.
   */
  async cancelSubscription(subscriptionId, userId, ipAddress) {
    const sub = await this.getSubscriptionById(subscriptionId, userId);
    if (sub.status === "canceled")
      throw new ConflictError("Subscription is already canceled");

    const db = getDatabases();
    const now = new Date().toISOString();
    const updated = await db.updateDocument(DB(), SUBS_COL(), subscriptionId, {
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
    });

    logger.info("subscriptionService: subscription canceled", {
      subscriptionId,
      userId,
    });

    auditService.logAction({
      actorId: userId,
      actorRole: "user",
      action: "SUBSCRIPTION_CANCELED",
      entity: "subscription",
      entityId: subscriptionId,
      metadata: { previousStatus: sub.status },
      ipAddress,
    });

    return updated;
  },

  /**
   * Pause a subscription. Billing will not run while paused.
   */
  async pauseSubscription(subscriptionId, userId, ipAddress) {
    const sub = await this.getSubscriptionById(subscriptionId, userId);
    if (sub.status !== "active")
      throw new ConflictError(
        `Cannot pause a subscription with status '${sub.status}'`,
      );

    const db = getDatabases();
    const now = new Date().toISOString();
    const updated = await db.updateDocument(DB(), SUBS_COL(), subscriptionId, {
      status: "paused",
      pausedAt: now,
      updatedAt: now,
    });

    auditService.logAction({
      actorId: userId,
      actorRole: "user",
      action: "SUBSCRIPTION_PAUSED",
      entity: "subscription",
      entityId: subscriptionId,
      ipAddress,
    });

    return updated;
  },

  /**
   * Resume a paused subscription. Resets nextBillingDate from now.
   */
  async resumeSubscription(subscriptionId, userId, ipAddress) {
    const sub = await this.getSubscriptionById(subscriptionId, userId);
    if (sub.status !== "paused")
      throw new ConflictError(
        `Cannot resume a subscription with status '${sub.status}'`,
      );

    const db = getDatabases();
    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(now, sub.planBillingCycle);
    const nowIso = now.toISOString();

    const updated = await db.updateDocument(DB(), SUBS_COL(), subscriptionId, {
      status: "active",
      nextBillingDate: nextBillingDate.toISOString(),
      pausedAt: null,
      updatedAt: nowIso,
    });

    auditService.logAction({
      actorId: userId,
      actorRole: "user",
      action: "SUBSCRIPTION_RESUMED",
      entity: "subscription",
      entityId: subscriptionId,
      ipAddress,
    });

    return updated;
  },

  /**
   * Advance the nextBillingDate to the next cycle.
   * Called by billingService after a successful charge.
   */
  async advanceBillingDate(subscriptionId) {
    const db = getDatabases();
    let sub;
    try {
      sub = await db.getDocument(DB(), SUBS_COL(), subscriptionId);
    } catch {
      throw new NotFoundError("Subscription");
    }

    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(now, sub.planBillingCycle);

    return db.updateDocument(DB(), SUBS_COL(), subscriptionId, {
      nextBillingDate: nextBillingDate.toISOString(),
      lastBilledAt: now.toISOString(),
      retryCount: 0,
      status: "active",
      updatedAt: now.toISOString(),
    });
  },

  /**
   * Mark a subscription as past_due after exhausted retries.
   */
  async markPastDue(subscriptionId, retryCount) {
    const db = getDatabases();
    const now = new Date().toISOString();
    return db.updateDocument(DB(), SUBS_COL(), subscriptionId, {
      status: "past_due",
      retryCount,
      updatedAt: now,
    });
  },

  /**
   * Increment retryCount on a subscription after a failed billing attempt.
   */
  async incrementRetry(subscriptionId, retryCount) {
    const db = getDatabases();
    const now = new Date().toISOString();
    return db.updateDocument(DB(), SUBS_COL(), subscriptionId, {
      retryCount,
      updatedAt: now,
    });
  },

  /**
   * Admin: get all subscriptions with optional filters.
   */
  async adminGetSubscriptions({ status, page = 1, limit = 50 } = {}) {
    const db = getDatabases();
    const offset = (page - 1) * limit;
    const queries = [
      Query.orderDesc("createdAt"),
      Query.limit(parseInt(limit)),
      Query.offset(offset),
    ];
    if (status && SUBSCRIPTION_STATUSES.has(status)) {
      queries.unshift(Query.equal("status", status));
    }
    const result = await db.listDocuments(DB(), SUBS_COL(), queries);
    return { subscriptions: result.documents, total: result.total };
  },

  /**
   * Admin: get subscription revenue stats.
   */
  async adminGetStats() {
    const db = getDatabases();
    const [activeRes, pausedRes, canceledRes, pastDueRes] = await Promise.all([
      db.listDocuments(DB(), SUBS_COL(), [
        Query.equal("status", "active"),
        Query.limit(1),
      ]),
      db.listDocuments(DB(), SUBS_COL(), [
        Query.equal("status", "paused"),
        Query.limit(1),
      ]),
      db.listDocuments(DB(), SUBS_COL(), [
        Query.equal("status", "canceled"),
        Query.limit(1),
      ]),
      db.listDocuments(DB(), SUBS_COL(), [
        Query.equal("status", "past_due"),
        Query.limit(1),
      ]),
    ]);
    return {
      active: activeRes.total,
      paused: pausedRes.total,
      canceled: canceledRes.total,
      past_due: pastDueRes.total,
      total:
        activeRes.total +
        pausedRes.total +
        canceledRes.total +
        pastDueRes.total,
    };
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  calculateNextBillingDate,
};

module.exports = subscriptionService;
