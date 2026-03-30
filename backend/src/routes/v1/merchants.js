/**
 * Merchant Routes
 *
 * Routes for merchant self-service operations (registration, profile, analytics).
 * Admin actions (approve/reject/list) are served from /api/v1/admin/merchants.
 *
 * All routes require authentication.
 */

const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { paymentLimiter } = require("../../middleware/security/rateLimiter");

const merchantController = require("../../controllers/merchantController");
const payoutRoutes = require("./payouts");

// ── Validation ───────────────────────────────────────────────────────────────

const registerValidation = [
  body("businessName")
    .trim()
    .isLength({ min: 2, max: 120 })
    .escape()
    .withMessage("Business name must be between 2 and 120 characters"),
  body("businessType")
    .trim()
    .isIn([
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
    ])
    .withMessage("Invalid business type"),
  body("phoneNumber")
    .trim()
    .matches(/^\+?[\d\s\-()]{7,20}$/)
    .withMessage("Invalid phone number"),
];

const analyticsValidation = [
  query("period")
    .optional()
    .isIn(["day", "week", "month", "quarter", "year"])
    .withMessage("Invalid period. Valid: day, week, month, quarter, year"),
];

// ── All merchant routes require JWT authentication ────────────────────────────

router.use(authenticate);

/**
 * @route   POST /api/v1/merchants/register
 * @desc    Register a new merchant application
 * @access  Private (authenticated user)
 */
router.post(
  "/register",
  paymentLimiter,
  registerValidation,
  validateRequest,
  asyncHandler(merchantController.register.bind(merchantController)),
);

/**
 * @route   GET /api/v1/merchants/me
 * @desc    Get the authenticated user's merchant profile
 * @access  Private
 */
router.get(
  "/me",
  asyncHandler(merchantController.getMyMerchant.bind(merchantController)),
);

/**
 * @route   GET /api/v1/merchants/analytics
 * @desc    Get analytics for the authenticated user's approved merchant
 * @access  Private (approved merchant only)
 */
router.get(
  "/analytics",
  analyticsValidation,
  validateRequest,
  asyncHandler(merchantController.getAnalytics.bind(merchantController)),
);

// Mount payout sub-routes (wallet-balance, payout, payouts)
router.use("/", payoutRoutes);

module.exports = router;
