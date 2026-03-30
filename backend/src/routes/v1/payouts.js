/**
 * Payout Routes
 *
 * Merchant-facing payout endpoints — all require JWT authentication.
 *
 *   POST  /api/v1/merchants/payout            — request a withdrawal
 *   GET   /api/v1/merchants/payouts           — payout history
 *   GET   /api/v1/merchants/payouts/:payoutId — single payout detail
 *   GET   /api/v1/merchants/wallet-balance    — current wallet balance
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { paymentLimiter } = require("../../middleware/security/rateLimiter");

const payoutController = require("../../controllers/payoutController");

// ── Validation rules ──────────────────────────────────────────────────────────

const requestPayoutValidation = [
  body("amount").isFloat({ min: 1 }).withMessage("Amount must be at least 1"),
  body("method")
    .isIn(["mpesa", "mtn", "bank"])
    .withMessage("Method must be one of: mpesa, mtn, bank"),
  body("destination")
    .trim()
    .isLength({ min: 3, max: 200 })
    .escape()
    .withMessage("Destination must be between 3 and 200 characters"),
  body("currency")
    .optional()
    .isIn(["USD", "KES", "GHS", "NGN", "ZAR", "EUR", "UGX", "RWF"])
    .withMessage("Invalid currency"),
  body("idempotencyKey")
    .optional()
    .isUUID(4)
    .withMessage("idempotencyKey must be a valid UUID v4"),
];

const payoutHistoryValidation = [
  query("page")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional({ checkFalsy: true })
    .isIn(["pending", "pending_review", "processing", "success", "failed"])
    .withMessage("Invalid status filter"),
];

const payoutIdValidation = [
  param("payoutId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid payout ID is required"),
];

// ── All payout routes require authentication ─────────────────────────────────

router.use(authenticate);

/**
 * @route   GET /api/v1/merchants/wallet-balance
 * @desc    Get authenticated merchant's wallet balance
 * @access  Private (authenticated merchant)
 */
router.get(
  "/wallet-balance",
  asyncHandler(payoutController.getWalletBalance.bind(payoutController)),
);

/**
 * @route   POST /api/v1/merchants/payout
 * @desc    Request a merchant payout (withdrawal)
 * @access  Private (approved merchant)
 */
router.post(
  "/payout",
  paymentLimiter,
  requestPayoutValidation,
  validateRequest,
  asyncHandler(payoutController.requestPayout.bind(payoutController)),
);

/**
 * @route   GET /api/v1/merchants/payouts
 * @desc    Get authenticated merchant's payout history
 * @access  Private
 */
router.get(
  "/payouts",
  payoutHistoryValidation,
  validateRequest,
  asyncHandler(payoutController.getPayoutHistory.bind(payoutController)),
);

/**
 * @route   GET /api/v1/merchants/payouts/:payoutId
 * @desc    Get details of a single payout
 * @access  Private (own merchant only)
 */
router.get(
  "/payouts/:payoutId",
  payoutIdValidation,
  validateRequest,
  asyncHandler(payoutController.getPayoutDetail.bind(payoutController)),
);

module.exports = router;
