"use strict";

/**
 * Subscription Routes
 *
 * User routes:
 *   GET    /api/v1/subscriptions/plans         — active plans (authenticated)
 *   POST   /api/v1/subscriptions/subscribe     — subscribe
 *   GET    /api/v1/subscriptions               — my subscriptions
 *   GET    /api/v1/subscriptions/:id           — subscription detail
 *   POST   /api/v1/subscriptions/:id/cancel    — cancel
 *   POST   /api/v1/subscriptions/:id/pause     — pause
 *   POST   /api/v1/subscriptions/:id/resume    — resume
 *
 * Admin routes (prefix: /api/v1/subscriptions/admin/...):
 *   GET    plans            — all plans including inactive
 *   POST   plans            — create plan
 *   PUT    plans/:planId    — update plan
 *   GET    list             — all subscriptions
 *   GET    stats            — counts by status
 *   GET    billing-history  — billing attempt log
 *   POST   run-billing      — manual billing trigger
 *
 * NOTE: All named /admin routes MUST come BEFORE /:id to avoid Express
 *       treating "admin" as a subscription ID param.
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const { authorize } = require("../../middleware/auth/authorize");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { paymentLimiter } = require("../../middleware/security/rateLimiter");

const subscriptionController = require("../../controllers/subscriptionController");

// ── Shared validators ─────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = [
  "KES",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "ZAR",
  "UGX",
];
const BILLING_CYCLES = ["daily", "weekly", "monthly", "yearly"];

const subscriptionIdParam = [
  param("id")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Invalid subscription ID"),
];

const planIdParam = [
  param("planId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Invalid plan ID"),
];

const subscribeBodyValidation = [
  body("planId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid plan ID is required"),
  body("paymentMethod")
    .isIn(["card", "wallet"])
    .withMessage("paymentMethod must be 'card' or 'wallet'"),
  body("cardId")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Invalid card ID"),
];

const createPlanValidation = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Plan name is required (max 100 chars)"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description max 500 chars"),
  body("price")
    .isFloat({ min: 0.01, max: 1_000_000 })
    .withMessage("Price must be between 0.01 and 1,000,000"),
  body("currency")
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`),
  body("billingCycle")
    .isIn(BILLING_CYCLES)
    .withMessage(`billingCycle must be one of: ${BILLING_CYCLES.join(", ")}`),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

const updatePlanValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Plan name max 100 chars"),
  body("description").optional().trim().isLength({ max: 500 }),
  body("price")
    .optional()
    .isFloat({ min: 0.01, max: 1_000_000 })
    .withMessage("Price must be between 0.01 and 1,000,000"),
  body("currency").optional().isIn(SUPPORTED_CURRENCIES),
  body("billingCycle").optional().isIn(BILLING_CYCLES),
  body("isActive").optional().isBoolean(),
];

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — must come BEFORE /:id to avoid Express param conflict
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route GET /api/v1/subscriptions/admin/plans
 */
router.get(
  "/admin/plans",
  authenticate,
  authorize(["admin", "super_admin"]),
  asyncHandler((req, res) => subscriptionController.adminGetPlans(req, res)),
);

/**
 * @route POST /api/v1/subscriptions/admin/plans
 */
router.post(
  "/admin/plans",
  authenticate,
  authorize(["admin", "super_admin"]),
  createPlanValidation,
  validateRequest,
  asyncHandler((req, res) => subscriptionController.adminCreatePlan(req, res)),
);

/**
 * @route PUT /api/v1/subscriptions/admin/plans/:planId
 */
router.put(
  "/admin/plans/:planId",
  authenticate,
  authorize(["admin", "super_admin"]),
  planIdParam,
  updatePlanValidation,
  validateRequest,
  asyncHandler((req, res) => subscriptionController.adminUpdatePlan(req, res)),
);

/**
 * @route GET /api/v1/subscriptions/admin/stats
 */
router.get(
  "/admin/stats",
  authenticate,
  authorize(["admin", "super_admin"]),
  asyncHandler((req, res) => subscriptionController.adminGetStats(req, res)),
);

/**
 * @route GET /api/v1/subscriptions/admin/billing-history
 */
router.get(
  "/admin/billing-history",
  authenticate,
  authorize(["admin", "super_admin"]),
  asyncHandler((req, res) =>
    subscriptionController.adminGetBillingHistory(req, res),
  ),
);

/**
 * @route POST /api/v1/subscriptions/admin/run-billing
 */
router.post(
  "/admin/run-billing",
  authenticate,
  authorize(["admin", "super_admin"]),
  asyncHandler((req, res) => subscriptionController.adminRunBilling(req, res)),
);

/**
 * @route GET /api/v1/subscriptions/admin/list
 */
router.get(
  "/admin/list",
  authenticate,
  authorize(["admin", "super_admin"]),
  asyncHandler((req, res) =>
    subscriptionController.adminGetSubscriptions(req, res),
  ),
);

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC / USER ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @route GET /api/v1/subscriptions/plans
 */
router.get(
  "/plans",
  authenticate,
  asyncHandler((req, res) => subscriptionController.getPlans(req, res)),
);

/**
 * @route POST /api/v1/subscriptions/subscribe
 */
router.post(
  "/subscribe",
  authenticate,
  paymentLimiter,
  subscribeBodyValidation,
  validateRequest,
  asyncHandler((req, res) => subscriptionController.subscribe(req, res)),
);

/**
 * @route GET /api/v1/subscriptions
 */
router.get(
  "/",
  authenticate,
  asyncHandler((req, res) =>
    subscriptionController.getUserSubscriptions(req, res),
  ),
);

/**
 * @route POST /api/v1/subscriptions/:id/cancel
 */
router.post(
  "/:id/cancel",
  authenticate,
  subscriptionIdParam,
  validateRequest,
  asyncHandler((req, res) =>
    subscriptionController.cancelSubscription(req, res),
  ),
);

/**
 * @route POST /api/v1/subscriptions/:id/pause
 */
router.post(
  "/:id/pause",
  authenticate,
  subscriptionIdParam,
  validateRequest,
  asyncHandler((req, res) =>
    subscriptionController.pauseSubscription(req, res),
  ),
);

/**
 * @route POST /api/v1/subscriptions/:id/resume
 */
router.post(
  "/:id/resume",
  authenticate,
  subscriptionIdParam,
  validateRequest,
  asyncHandler((req, res) =>
    subscriptionController.resumeSubscription(req, res),
  ),
);

/**
 * @route GET /api/v1/subscriptions/:id
 * NOTE: Must come AFTER all named routes above to avoid conflict.
 */
router.get(
  "/:id",
  authenticate,
  subscriptionIdParam,
  validateRequest,
  asyncHandler((req, res) =>
    subscriptionController.getSubscriptionById(req, res),
  ),
);

module.exports = router;
