"use strict";

/**
 * Subscription Controller
 *
 * Handles all HTTP request/response concerns for the subscription system.
 * Business logic lives in subscriptionService and billingService.
 *
 * User endpoints:
 *   GET    /api/v1/subscriptions/plans         — list active plans
 *   POST   /api/v1/subscriptions/subscribe     — subscribe to a plan
 *   GET    /api/v1/subscriptions               — get my subscriptions
 *   GET    /api/v1/subscriptions/:id           — get subscription details
 *   POST   /api/v1/subscriptions/:id/cancel    — cancel subscription
 *   POST   /api/v1/subscriptions/:id/pause     — pause subscription
 *   POST   /api/v1/subscriptions/:id/resume    — resume subscription
 *
 * Admin endpoints (require admin role):
 *   GET    /api/v1/subscriptions/admin/plans          — all plans
 *   POST   /api/v1/subscriptions/admin/plans          — create plan
 *   PUT    /api/v1/subscriptions/admin/plans/:planId  — update plan
 *   GET    /api/v1/subscriptions/admin/list           — all subscriptions
 *   GET    /api/v1/subscriptions/admin/stats          — revenue stats
 *   GET    /api/v1/subscriptions/admin/billing-history— billing history
 *   POST   /api/v1/subscriptions/admin/run-billing    — trigger billing run manually
 */

const { Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const auditService = require("../services/auditService");
const fraudService = require("../services/fraudService");
const subscriptionService = require("../services/subscriptionService");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// ── Collection helpers ────────────────────────────────────────────────────
const { appwrite: dbConn } = require("../database/connection");
const DB = () => config.database.appwrite.databaseId;
const BILLING_COL = () => config.database.appwrite.billingHistoryCollectionId;

// ── Lazy require to prevent circular deps ─────────────────────────────────
const getBillingService = () => require("../services/billingService");
const getCreateAdminNotification = () =>
  require("../services/notificationService").createAdminNotification;

class SubscriptionController {
  // ═════════════════════════════════════════════════════════════════════════
  // USER ENDPOINTS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/subscriptions/plans
   * Public-ish (requires auth) — returns all active plans.
   */
  async getPlans(req, res) {
    const plans = await subscriptionService.getActivePlans();
    return res.success(
      { plans, count: plans.length },
      "Subscription plans retrieved",
    );
  }

  /**
   * GET /api/v1/subscriptions
   * Returns all subscriptions for the authenticated user.
   */
  async getUserSubscriptions(req, res) {
    const { user } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const result = await subscriptionService.getUserSubscriptions(user.id, {
      page,
      limit,
    });

    return res.success(
      {
        subscriptions: result.subscriptions,
        total: result.total,
        page,
        limit,
      },
      "Subscriptions retrieved",
    );
  }

  /**
   * GET /api/v1/subscriptions/:id
   * Returns a specific subscription (owner-only).
   */
  async getSubscriptionById(req, res) {
    const { user } = req;
    const { id } = req.params;
    const sub = await subscriptionService.getSubscriptionById(id, user.id);
    return res.success({ subscription: sub }, "Subscription retrieved");
  }

  /**
   * POST /api/v1/subscriptions/subscribe
   *
   * Body: { planId, paymentMethod, cardId? }
   *
   * Flow:
   *   1. Fraud check
   *   2. validate plan + dedup check (subscriptionService)
   *   3. create subscription
   *   4. fire admin notification
   */
  async subscribe(req, res) {
    const { user } = req;
    const { planId, paymentMethod, cardId } = req.body;

    // ── Fraud check ──────────────────────────────────────────────────────
    const fraudResult = await fraudService.checkTransaction({
      userId: user.id,
      transactionId: "pre-subscribe",
      amount: 0,
      currency: "USD",
      type: "subscription",
    });

    if (fraudResult.flagged && fraudResult.severity === "high") {
      logger.security("subscriptionController.subscribe: fraud block", {
        userId: user.id,
        planId,
        reason: fraudResult.reason,
        ip: req.ip,
      });
      throw new ValidationError(
        "This action has been blocked for security review. Please contact support.",
      );
    }

    // ── Create subscription ───────────────────────────────────────────────
    const { subscription, plan } = await subscriptionService.createSubscription(
      {
        userId: user.id,
        planId,
        paymentMethod,
        cardId: cardId || null,
        ipAddress: req.ip,
      },
    );

    // ── Admin notification ────────────────────────────────────────────────
    getCreateAdminNotification()(
      "subscription",
      "New Subscription",
      `User ${user.id} subscribed to ${plan.name} (${plan.currency} ${plan.price}/${plan.billingCycle})`,
      { link: `/subscriptions` },
    );

    logger.info("subscriptionController: new subscription", {
      subscriptionId: subscription.$id,
      userId: user.id,
      planId,
      paymentMethod,
    });

    return res.created(
      {
        subscription,
        plan: {
          id: plan.$id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          billingCycle: plan.billingCycle,
        },
      },
      `Successfully subscribed to ${plan.name}`,
    );
  }

  /**
   * POST /api/v1/subscriptions/:id/cancel
   */
  async cancelSubscription(req, res) {
    const { user } = req;
    const { id } = req.params;

    const updated = await subscriptionService.cancelSubscription(
      id,
      user.id,
      req.ip,
    );

    return res.success(
      { subscription: updated },
      "Subscription canceled successfully",
    );
  }

  /**
   * POST /api/v1/subscriptions/:id/pause
   */
  async pauseSubscription(req, res) {
    const { user } = req;
    const { id } = req.params;

    const updated = await subscriptionService.pauseSubscription(
      id,
      user.id,
      req.ip,
    );

    return res.success(
      { subscription: updated },
      "Subscription paused successfully",
    );
  }

  /**
   * POST /api/v1/subscriptions/:id/resume
   */
  async resumeSubscription(req, res) {
    const { user } = req;
    const { id } = req.params;

    const updated = await subscriptionService.resumeSubscription(
      id,
      user.id,
      req.ip,
    );

    return res.success(
      { subscription: updated },
      "Subscription resumed successfully",
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/subscriptions/admin/plans
   * Admin: list all plans (including inactive).
   */
  async adminGetPlans(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await subscriptionService.getAllPlans({ page, limit });
    return res.success(
      { plans: result.plans, total: result.total, page, limit },
      "Plans retrieved",
    );
  }

  /**
   * POST /api/v1/subscriptions/admin/plans
   * Admin: create a new plan.
   */
  async adminCreatePlan(req, res) {
    const { name, description, price, currency, billingCycle, isActive } =
      req.body;

    const plan = await subscriptionService.createPlan({
      name,
      description,
      price,
      currency,
      billingCycle,
      isActive: isActive !== false,
    });

    auditService.logAction({
      actorId: req.user.id,
      actorRole: "admin",
      action: "SUBSCRIPTION_PLAN_CREATED",
      entity: "subscription_plan",
      entityId: plan.$id,
      metadata: {
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
    });

    return res.created({ plan }, `Plan "${plan.name}" created successfully`);
  }

  /**
   * PUT /api/v1/subscriptions/admin/plans/:planId
   * Admin: update an existing plan.
   */
  async adminUpdatePlan(req, res) {
    const { planId } = req.params;
    const updates = req.body;

    const plan = await subscriptionService.updatePlan(planId, updates);

    auditService.logAction({
      actorId: req.user.id,
      actorRole: "admin",
      action: "SUBSCRIPTION_PLAN_UPDATED",
      entity: "subscription_plan",
      entityId: planId,
      metadata: updates,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
    });

    return res.success({ plan }, "Plan updated successfully");
  }

  /**
   * GET /api/v1/subscriptions/admin/list
   * Admin: list all subscriptions with optional status filter.
   */
  async adminGetSubscriptions(req, res) {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const result = await subscriptionService.adminGetSubscriptions({
      status,
      page,
      limit,
    });

    return res.success(
      {
        subscriptions: result.subscriptions,
        total: result.total,
        page,
        limit,
      },
      "Subscriptions retrieved",
    );
  }

  /**
   * GET /api/v1/subscriptions/admin/stats
   * Admin: subscription counts by status.
   */
  async adminGetStats(req, res) {
    const stats = await subscriptionService.adminGetStats();
    return res.success({ stats }, "Subscription statistics retrieved");
  }

  /**
   * GET /api/v1/subscriptions/admin/billing-history
   * Admin: paginated billing history.
   */
  async adminGetBillingHistory(req, res) {
    const db = dbConn.getDatabases();
    const { Query: Q } = require("node-appwrite");
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const queries = [
      Q.orderDesc("createdAt"),
      Q.limit(limit),
      Q.offset(offset),
    ];

    if (req.query.subscriptionId)
      queries.unshift(Q.equal("subscriptionId", req.query.subscriptionId));
    if (req.query.status) queries.unshift(Q.equal("status", req.query.status));
    if (req.query.userId) queries.unshift(Q.equal("userId", req.query.userId));

    const result = await db.listDocuments(DB(), BILLING_COL(), queries);

    return res.success(
      { history: result.documents, total: result.total, page, limit },
      "Billing history retrieved",
    );
  }

  /**
   * POST /api/v1/subscriptions/admin/run-billing
   * Admin: manually trigger a billing run (useful for testing).
   * Protected: only accessible to admins.
   */
  async adminRunBilling(req, res) {
    const billingService = getBillingService();

    logger.audit("MANUAL_BILLING_RUN", req.user.id, { ip: req.ip });

    // Run async — respond immediately to avoid request timeout
    const summary = await billingService.processDueSubscriptions();

    auditService.logAction({
      actorId: req.user.id,
      actorRole: "admin",
      action: "BILLING_RUN_TRIGGERED",
      entity: "billing",
      entityId: "manual",
      metadata: summary,
      ipAddress: req.ip,
    });

    return res.success({ summary }, "Billing run completed");
  }
}

module.exports = new SubscriptionController();
