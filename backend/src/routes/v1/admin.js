/**
 * Admin Routes
 * Administrative functions for system management
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

// Import middleware
const { authenticate } = require("../../middleware/auth/authenticate");
const { authorize } = require("../../middleware/auth/authorize");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { adminLimiter } = require("../../middleware/security/rateLimiter");

// Import controllers (to be created)
const adminController = require("../../controllers/adminController");
const adminAnalyticsController = require("../../controllers/adminAnalyticsController");

// Validation schemas
const userIdValidation = [
  // Appwrite generates IDs as alphanumeric strings (e.g. "unique()" output),
  // NOT MongoDB ObjectIDs. isMongoId() would reject all valid Appwrite UIDs.
  param("userId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid user ID is required"),
];

const paginationValidation = [
  query("page")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("search")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),
];

const analyticsValidation = [
  query("period")
    .optional()
    .isIn(["day", "week", "month", "quarter", "year"])
    .withMessage("Invalid period"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Valid start date is required"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date is required"),
];

// All admin routes require authentication, admin authorization, and rate limiting
router.use(authenticate);
router.use(authorize(["admin", "super_admin"]));
router.use(adminLimiter);

// Dashboard and overview

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin)
 */
router.get("/dashboard", asyncHandler(adminController.getDashboard));

/**
 * @route   GET /api/v1/admin/analytics
 * @desc    Get system analytics
 * @access  Private (Admin)
 */
router.get(
  "/analytics",
  analyticsValidation,
  validateRequest,
  asyncHandler(adminController.getAnalytics),
);

// ── Granular BI analytics endpoints (admin-only, powered by analyticsService) ─

const biAnalyticsValidation = [
  query("period")
    .optional()
    .isIn(["day", "week", "month", "quarter", "year"])
    .withMessage("period must be one of: day, week, month, quarter, year"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be ISO 8601"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be ISO 8601"),
  query("granularity")
    .optional()
    .isIn(["day", "week", "month"])
    .withMessage("granularity must be one of: day, week, month"),
  query("currency")
    .optional()
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("currency must be a valid ISO-4217 code"),
];

/**
 * @route   GET /api/v1/admin/analytics/overview
 * @desc    Platform-wide KPI snapshot (users, revenue, transactions, merchants, payouts)
 * @access  Private (Admin)
 */
router.get(
  "/analytics/overview",
  biAnalyticsValidation,
  validateRequest,
  asyncHandler(adminAnalyticsController.getOverview),
);

/**
 * @route   GET /api/v1/admin/analytics/revenue
 * @desc    Revenue over time + breakdown by payment source
 * @access  Private (Admin)
 */
router.get(
  "/analytics/revenue",
  biAnalyticsValidation,
  validateRequest,
  asyncHandler(adminAnalyticsController.getRevenue),
);

/**
 * @route   GET /api/v1/admin/analytics/transactions
 * @desc    Transaction volume timeline, status distribution, payment-method breakdown
 * @access  Private (Admin)
 */
router.get(
  "/analytics/transactions",
  [
    ...biAnalyticsValidation,
    query("type")
      .optional()
      .isIn(["deposit", "withdrawal", "transfer", "payment", "fee", "refund"])
      .withMessage("type must be a valid transaction type"),
  ],
  validateRequest,
  asyncHandler(adminAnalyticsController.getTransactions),
);

/**
 * @route   GET /api/v1/admin/analytics/cohorts
 * @desc    User retention cohort analysis grouped by first-transaction month
 * @access  Private (Admin)
 */
router.get(
  "/analytics/cohorts",
  [
    query("months")
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage("months must be an integer between 1 and 12"),
  ],
  validateRequest,
  asyncHandler(adminAnalyticsController.getCohorts),
);

/**
 * @route   GET /api/v1/admin/analytics/forecast
 * @desc    Revenue forecasting based on linear regression of recent trends
 * @access  Private (Admin)
 */
router.get(
  "/analytics/forecast",
  [
    query("currency")
      .optional()
      .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
      .withMessage("currency must be a valid ISO-4217 code"),
  ],
  validateRequest,
  asyncHandler(adminAnalyticsController.getForecast),
);

// User management

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with filters
 * @access  Private (Admin)
 */
router.get(
  "/users",
  query("status")
    .optional({ checkFalsy: true })
    .isIn(["active", "inactive", "suspended", "blocked"])
    .withMessage("Invalid status filter"),
  query("verified")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("Verified must be a boolean"),
  query("role")
    .optional({ checkFalsy: true })
    .isIn(["user", "merchant", "agent"])
    .withMessage("Invalid role filter"),
  paginationValidation,
  validateRequest,
  asyncHandler(adminController.getUsers),
);

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get user details
 * @access  Private (Admin)
 */
router.get(
  "/users/:userId",
  userIdValidation,
  validateRequest,
  asyncHandler(adminController.getUserDetails),
);

/**
 * @route   PUT /api/v1/admin/users/:userId/status
 * @desc    Update user status
 * @access  Private (Admin)
 */
router.put(
  "/users/:userId/status",
  userIdValidation,
  body("status")
    .isIn(["active", "inactive", "suspended", "blocked"])
    .withMessage("Invalid status"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be less than 500 characters"),
  validateRequest,
  asyncHandler(adminController.updateUserStatus),
);

/**
 * @route   PUT /api/v1/admin/users/:userId/verification
 * @desc    Update user verification status
 * @access  Private (Admin)
 */
router.put(
  "/users/:userId/verification",
  userIdValidation,
  body("verified").isBoolean().withMessage("Verified must be a boolean"),
  body("verificationLevel")
    .optional()
    .isIn(["basic", "enhanced", "premium"])
    .withMessage("Invalid verification level"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
  validateRequest,
  asyncHandler(adminController.updateUserVerification),
);

/**
 * @route   GET /api/v1/admin/users/:userId/activity
 * @desc    Get user activity log
 * @access  Private (Admin)
 */
router.get(
  "/users/:userId/activity",
  userIdValidation,
  paginationValidation,
  validateRequest,
  asyncHandler(adminController.getUserActivity),
);

// Transaction management

/**
 * @route   GET /api/v1/admin/transactions
 * @desc    Get all transactions with filters
 * @access  Private (Admin)
 */
router.get(
  "/transactions",
  query("status")
    .optional()
    .isIn(["pending", "processing", "completed", "failed", "cancelled"])
    .withMessage("Invalid status filter"),
  query("type")
    .optional()
    .isIn(["deposit", "withdrawal", "transfer", "payment", "refund"])
    .withMessage("Invalid type filter"),
  query("flagged")
    .optional()
    .isBoolean()
    .withMessage("Flagged must be a boolean"),
  paginationValidation,
  validateRequest,
  asyncHandler(adminController.getTransactions),
);

/**
 * @route   GET /api/v1/admin/transactions/:transactionId
 * @desc    Get transaction details
 * @access  Private (Admin)
 */
router.get(
  "/transactions/:transactionId",
  param("transactionId")
    .isMongoId()
    .withMessage("Valid transaction ID is required"),
  validateRequest,
  asyncHandler(adminController.getTransactionDetails),
);

/**
 * @route   PUT /api/v1/admin/transactions/:transactionId
 * @desc    Update transaction status or flag
 * @access  Private (Admin)
 */
router.put(
  "/transactions/:transactionId",
  param("transactionId")
    .isMongoId()
    .withMessage("Valid transaction ID is required"),
  body("status")
    .optional()
    .isIn(["pending", "processing", "completed", "failed", "cancelled"])
    .withMessage("Invalid status"),
  body("flagged")
    .optional()
    .isBoolean()
    .withMessage("Flagged must be a boolean"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
  validateRequest,
  asyncHandler(adminController.updateTransaction),
);

// Dispute management

/**
 * @route   GET /api/v1/admin/disputes
 * @desc    Get all disputes
 * @access  Private (Admin)
 */
router.get(
  "/disputes",
  query("status")
    .optional()
    .isIn(["pending", "under_review", "resolved", "rejected"])
    .withMessage("Invalid status filter"),
  paginationValidation,
  validateRequest,
  asyncHandler(adminController.getDisputes),
);

/**
 * @route   GET /api/v1/admin/disputes/:disputeId
 * @desc    Get dispute details
 * @access  Private (Admin)
 */
router.get(
  "/disputes/:disputeId",
  param("disputeId").isMongoId().withMessage("Valid dispute ID is required"),
  validateRequest,
  asyncHandler(adminController.getDisputeDetails),
);

/**
 * @route   PUT /api/v1/admin/disputes/:disputeId
 * @desc    Update dispute status
 * @access  Private (Admin)
 */
router.put(
  "/disputes/:disputeId",
  param("disputeId").isMongoId().withMessage("Valid dispute ID is required"),
  body("status")
    .isIn(["pending", "under_review", "resolved", "rejected"])
    .withMessage("Invalid status"),
  body("resolution")
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Resolution must be between 10 and 1000 characters"),
  body("adminNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Admin notes must be less than 1000 characters"),
  validateRequest,
  asyncHandler(adminController.updateDispute),
);

// System configuration

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get system settings
 * @access  Private (Super Admin)
 */
router.get(
  "/settings",
  authorize(["super_admin"]),
  asyncHandler(adminController.getSystemSettings),
);

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update system settings
 * @access  Private (Super Admin)
 */
router.put(
  "/settings",
  authorize(["super_admin"]),
  body("settings").isObject().withMessage("Settings must be an object"),
  validateRequest,
  asyncHandler(adminController.updateSystemSettings),
);

/**
 * @route   GET /api/v1/admin/fees
 * @desc    Get fee configuration
 * @access  Private (Admin)
 */
router.get("/fees", asyncHandler(adminController.getFeeConfiguration));

/**
 * @route   PUT /api/v1/admin/fees
 * @desc    Update fee configuration
 * @access  Private (Super Admin)
 */
router.put(
  "/fees",
  authorize(["super_admin"]),
  body("fees").isObject().withMessage("Fees must be an object"),
  validateRequest,
  asyncHandler(adminController.updateFeeConfiguration),
);

// Audit logs

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs with filters
 * @access  Private (Admin)
 */
router.get(
  "/audit-logs",
  query("action")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Action must be between 1 and 100 characters"),
  query("actorId")
    .optional()
    .trim()
    .isLength({ max: 36 })
    .withMessage("Invalid actorId"),
  query("actorRole")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("actorRole must be user or admin"),
  query("entity")
    .optional()
    .isIn(["user", "transaction", "merchant", "card", "content"])
    .withMessage("Invalid entity"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be ISO 8601"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be ISO 8601"),
  paginationValidation,
  validateRequest,
  asyncHandler(adminController.getAuditLogs),
);

// Fraud monitoring

/**
 * @route   GET /api/v1/admin/fraud-flags
 * @desc    Get fraud flags
 * @access  Private (Admin)
 */
router.get(
  "/fraud-flags",
  query("severity")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("severity must be low, medium or high"),
  query("status")
    .optional()
    .isIn(["open", "resolved", "escalated"])
    .withMessage("status must be open, resolved or escalated"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be ISO 8601"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be ISO 8601"),
  paginationValidation,
  validateRequest,
  asyncHandler(adminController.getFraudFlags),
);

/**
 * @route   PUT /api/v1/admin/fraud-flags/:flagId
 * @desc    Update fraud flag (mark_safe | escalate | block_user)
 * @access  Private (Admin)
 */
router.put(
  "/fraud-flags/:flagId",
  param("flagId").trim().notEmpty().withMessage("flagId is required"),
  body("action")
    .isIn(["mark_safe", "escalate", "block_user"])
    .withMessage("action must be mark_safe, escalate or block_user"),
  body("notes").optional().trim().isLength({ max: 1000 }),
  validateRequest,
  asyncHandler(adminController.updateFraudFlag),
);

// Reports and exports

/**
 * @route   GET /api/v1/admin/reports/users
 * @desc    Generate user report
 * @access  Private (Admin)
 */
router.get(
  "/reports/users",
  query("format")
    .isIn(["csv", "pdf", "xlsx"])
    .withMessage("Invalid export format"),
  analyticsValidation,
  validateRequest,
  asyncHandler(adminController.generateUserReport),
);

/**
 * @route   GET /api/v1/admin/reports/transactions
 * @desc    Generate transaction report
 * @access  Private (Admin)
 */
router.get(
  "/reports/transactions",
  query("format")
    .isIn(["csv", "pdf", "xlsx"])
    .withMessage("Invalid export format"),
  analyticsValidation,
  validateRequest,
  asyncHandler(adminController.generateTransactionReport),
);

/**
 * @route   GET /api/v1/admin/reports/financial
 * @desc    Generate financial report
 * @access  Private (Super Admin)
 */
router.get(
  "/reports/financial",
  authorize(["super_admin"]),
  query("format")
    .isIn(["csv", "pdf", "xlsx"])
    .withMessage("Invalid export format"),
  analyticsValidation,
  validateRequest,
  asyncHandler(adminController.generateFinancialReport),
);

// System health and maintenance

/**
 * @route   GET /api/v1/admin/system/health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
router.get("/system/health", asyncHandler(adminController.getSystemHealth));

/**
 * @route   POST /api/v1/admin/system/maintenance
 * @desc    Enable/disable maintenance mode
 * @access  Private (Super Admin)
 */
router.post(
  "/system/maintenance",
  authorize(["super_admin"]),
  body("enabled").isBoolean().withMessage("Enabled must be a boolean"),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Message must be less than 500 characters"),
  validateRequest,
  asyncHandler(adminController.setMaintenanceMode),
);

/**
 * @route   POST /api/v1/admin/system/cache/clear
 * @desc    Clear system cache
 * @access  Private (Super Admin)
 */
router.post(
  "/system/cache/clear",
  authorize(["super_admin"]),
  asyncHandler(adminController.clearCache),
);

// Notifications

/**
 * @route   GET /api/v1/admin/notifications
 * @desc    Get admin-targeted notifications with pagination
 * @access  Private (Admin)
 */
router.get(
  "/notifications",
  query("page")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("read")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("read must be a boolean"),
  validateRequest,
  asyncHandler(adminController.getNotifications),
);

/**
 * @route   PATCH /api/v1/admin/notifications/:id/read
 * @desc    Mark an admin notification as read
 * @access  Private (Admin)
 */
router.patch(
  "/notifications/:id/read",
  param("id").trim().notEmpty().withMessage("Notification ID is required"),
  validateRequest,
  asyncHandler(adminController.markNotificationRead),
);

// ── Merchant Administration ───────────────────────────────────────────────────

const merchantIdValidation = [
  param("merchantId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid merchant ID is required"),
];

/**
 * @route   GET /api/v1/admin/merchants
 * @desc    List all merchants with optional filters
 * @access  Private (Admin)
 */
router.get(
  "/merchants",
  [
    query("status")
      .optional({ checkFalsy: true })
      .isIn(["pending", "approved", "rejected"])
      .withMessage("Invalid status filter"),
    query("search")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Search term must be between 1 and 100 characters"),
    query("page")
      .optional({ checkFalsy: true })
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional({ checkFalsy: true })
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  validateRequest,
  asyncHandler(adminController.getMerchants),
);

/**
 * @route   GET /api/v1/admin/merchants/:merchantId
 * @desc    Get single merchant details
 * @access  Private (Admin)
 */
router.get(
  "/merchants/:merchantId",
  merchantIdValidation,
  validateRequest,
  asyncHandler(adminController.getMerchantById),
);

/**
 * @route   PATCH /api/v1/admin/merchants/:merchantId/approve
 * @desc    Approve a pending merchant (generates till + wallet)
 * @access  Private (Admin)
 */
router.patch(
  "/merchants/:merchantId/approve",
  merchantIdValidation,
  validateRequest,
  asyncHandler(adminController.approveMerchant),
);

/**
 * @route   PATCH /api/v1/admin/merchants/:merchantId/reject
 * @desc    Reject a pending merchant application
 * @access  Private (Admin)
 */
router.patch(
  "/merchants/:merchantId/reject",
  [
    ...merchantIdValidation,
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .escape()
      .withMessage("Reason must be 500 characters or fewer"),
  ],
  validateRequest,
  asyncHandler(adminController.rejectMerchant),
);

/**
 * @route   GET /api/v1/admin/merchants/:merchantId/analytics
 * @desc    Get transaction analytics for a merchant
 * @access  Private (Admin)
 */
router.get(
  "/merchants/:merchantId/analytics",
  [
    ...merchantIdValidation,
    query("period")
      .optional()
      .isIn(["day", "week", "month", "quarter", "year"])
      .withMessage("Invalid period"),
  ],
  validateRequest,
  asyncHandler(adminController.getMerchantAnalytics),
);

// ── Payout Administration ─────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/payouts
 * @desc    List all payouts (filterable)
 * @access  Private (Admin)
 */
router.get(
  "/payouts",
  [
    ...paginationValidation,
    query("status")
      .optional()
      .isIn(["pending", "pending_review", "processing", "success", "failed"])
      .withMessage("Invalid status"),
    query("merchantId").optional().isString().trim(),
    query("method")
      .optional()
      .isIn(["mpesa", "mtn", "bank"])
      .withMessage("Invalid method"),
  ],
  validateRequest,
  asyncHandler(adminController.getPayouts),
);

/**
 * @route   PATCH /api/v1/admin/payouts/:payoutId/process
 * @desc    Admin manually processes a pending or pending_review payout
 * @access  Private (Admin)
 */
router.patch(
  "/payouts/:payoutId/process",
  [
    param("payoutId")
      .trim()
      .isLength({ min: 1, max: 36 })
      .withMessage("Valid payout ID is required"),
  ],
  validateRequest,
  asyncHandler(adminController.processPayout),
);

/**
 * @route   PATCH /api/v1/admin/payouts/:payoutId/fail
 * @desc    Admin manually fails a payout and restores merchant wallet
 * @access  Private (Admin)
 */
router.patch(
  "/payouts/:payoutId/fail",
  [
    param("payoutId")
      .trim()
      .isLength({ min: 1, max: 36 })
      .withMessage("Valid payout ID is required"),
    body("reason")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Reason must be ≤500 characters"),
  ],
  validateRequest,
  asyncHandler(adminController.failPayout),
);

// ── Card Management ───────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/cards
 * @desc    List all payment cards across all users with filters and pagination
 * @access  Private (Admin)
 */
router.get(
  "/cards",
  [
    ...paginationValidation,
    query("status")
      .optional({ checkFalsy: true })
      .isIn(["active", "frozen"])
      .withMessage("Status must be 'active' or 'frozen'"),
    query("cardBrand")
      .optional({ checkFalsy: true })
      .isIn(["visa", "mastercard", "amex", "discover", "other"])
      .withMessage("Invalid card brand"),
    query("cardType")
      .optional({ checkFalsy: true })
      .isIn(["virtual", "physical"])
      .withMessage("Card type must be 'virtual' or 'physical'"),
  ],
  validateRequest,
  asyncHandler(adminController.getAdminCards),
);

/**
 * @route   PUT /api/v1/admin/cards/:cardId/status
 * @desc    Freeze or unfreeze a user's card (admin security override)
 * @access  Private (Admin)
 */
router.put(
  "/cards/:cardId/status",
  [
    param("cardId")
      .trim()
      .isLength({ min: 1, max: 36 })
      .withMessage("Valid card ID is required"),
    body("status")
      .isIn(["active", "frozen"])
      .withMessage("Status must be 'active' or 'frozen'"),
  ],
  validateRequest,
  asyncHandler(adminController.adminUpdateCardStatus),
);

module.exports = router;
