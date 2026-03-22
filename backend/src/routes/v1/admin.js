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
 * @desc    Get audit logs
 * @access  Private (Super Admin)
 */
router.get(
  "/audit-logs",
  authorize(["super_admin"]),
  query("action")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Action must be between 1 and 100 characters"),
  query("userId")
    .optional()
    .isMongoId()
    .withMessage("Valid user ID is required"),
  paginationValidation,
  validateRequest,
  asyncHandler(adminController.getAuditLogs),
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

module.exports = router;
