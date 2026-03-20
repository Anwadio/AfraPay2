/**
 * Analytics Routes
 *
 * Provides aggregated, per-user financial metrics for the analytics dashboard.
 * All routes are protected by JWT authentication — no admin role required.
 *
 * Route map:
 *   GET /api/v1/analytics/dashboard  – full dashboard payload (summary + trends + categories)
 */

const express = require("express");
const router = express.Router();
const { query } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { createRateLimiter } = require("../../middleware/security/rateLimiter");
const analyticsController = require("../../controllers/analyticsController");

// Analytics is a read-heavy endpoint; moderate rate limit is sufficient
const analyticsLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: {
      code: "ANALYTICS_RATE_LIMIT_EXCEEDED",
      message: "Too many analytics requests. Please wait a moment.",
    },
  },
  keyGenerator: (req) => `analytics:${req.user?.id || req.ip}`,
});

const analyticsQueryValidation = [
  query("period")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("period must be one of: day, week, month, year"),
  query("currency")
    .optional()
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("currency must be a valid ISO-4217 code"),
];

/**
 * @route  GET /api/v1/analytics/dashboard
 * @desc   Return all metrics required to render the analytics dashboard
 *         (summary stats, 6-month trend, category breakdown, top transactions)
 * @access Private – authenticated user (user-scoped data only)
 */
router.get(
  "/dashboard",
  authenticate,
  analyticsLimiter,
  analyticsQueryValidation,
  validateRequest,
  asyncHandler(
    analyticsController.getDashboardAnalytics.bind(analyticsController),
  ),
);

module.exports = router;
