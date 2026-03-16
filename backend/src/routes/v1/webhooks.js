/**
 * Webhook Routes
 * Handles incoming webhooks from external payment processors
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const crypto = require("crypto");

// Import middleware
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const logger = require("../../utils/logger");

// Import controllers (to be created)
const webhookController = require("../../controllers/webhookController");
const orchestratorController = require("../../controllers/orchestratorController");

// Webhook signature verification middleware
const verifyWebhookSignature = (provider) => {
  return (req, res, next) => {
    const signature =
      req.get("X-Signature") ||
      req.get("X-Hub-Signature-256") ||
      req.get("Webhook-Signature");

    // Use the raw bytes captured by the global express.json() verify callback.
    // Re-serialising req.body with JSON.stringify() would produce a different
    // byte sequence (key ordering, whitespace) and break HMAC verification.
    const rawBody = req.rawBody?.toString("utf8") || JSON.stringify(req.body);

    if (!signature) {
      logger.warn("Webhook signature missing", {
        provider,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        headers: req.headers,
      });
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_SIGNATURE",
          message: "Webhook signature is required",
        },
      });
    }

    // Store signature and raw payload for the controller
    req.webhookSignature = signature;
    req.rawPayload = rawBody;
    next();
  };
};

// NOTE: do NOT add express.raw() here — the global express.json() middleware
// already captures the raw body into req.rawBody via its verify callback.

// Stripe webhooks

/**
 * @route   POST /api/v1/webhooks/stripe
 * @desc    Handle Stripe webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/stripe",
  verifyWebhookSignature("stripe"),
  asyncHandler(webhookController.handleStripe),
);

// Paystack webhooks

/**
 * @route   POST /api/v1/webhooks/paystack
 * @desc    Handle Paystack webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/paystack",
  verifyWebhookSignature("paystack"),
  asyncHandler(webhookController.handlePaystack),
);

// Flutterwave webhooks

/**
 * @route   POST /api/v1/webhooks/flutterwave
 * @desc    Handle Flutterwave webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/flutterwave",
  verifyWebhookSignature("flutterwave"),
  asyncHandler(webhookController.handleFlutterwave),
);

// Wise (formerly TransferWise) webhooks

/**
 * @route   POST /api/v1/webhooks/wise
 * @desc    Handle Wise webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/wise",
  verifyWebhookSignature("wise"),
  asyncHandler(webhookController.handleWise),
);

// Momo API webhooks (MTN, Airtel, etc.)

/**
 * @route   POST /api/v1/webhooks/momo
 * @desc    Handle Mobile Money webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/momo",
  verifyWebhookSignature("momo"),
  asyncHandler(webhookController.handleMobileMoney),
);

// Bank webhook endpoints

/**
 * @route   POST /api/v1/webhooks/bank/:bankCode
 * @desc    Handle bank-specific webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/bank/:bankCode",
  param("bankCode")
    .isAlphanumeric()
    .isLength({ min: 2, max: 10 })
    .withMessage("Invalid bank code"),
  validateRequest,
  verifyWebhookSignature("bank"),
  asyncHandler(webhookController.handleBankWebhook),
);

// Crypto webhooks (if supporting cryptocurrency)

/**
 * @route   POST /api/v1/webhooks/crypto/bitcoin
 * @desc    Handle Bitcoin webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/crypto/bitcoin",
  verifyWebhookSignature("bitcoin"),
  asyncHandler(webhookController.handleBitcoinWebhook),
);

/**
 * @route   POST /api/v1/webhooks/crypto/ethereum
 * @desc    Handle Ethereum webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/crypto/ethereum",
  verifyWebhookSignature("ethereum"),
  asyncHandler(webhookController.handleEthereumWebhook),
);

// Generic webhook handler for future integrations

/**
 * @route   POST /api/v1/webhooks/:provider
 * @desc    Handle generic provider webhooks
 * @access  Public (with signature verification)
 */
router.post(
  "/:provider",
  param("provider")
    .isAlpha()
    .isLength({ min: 2, max: 20 })
    .withMessage("Invalid provider name"),
  validateRequest,
  verifyWebhookSignature("generic"),
  asyncHandler(webhookController.handleGenericWebhook),
);

// Webhook testing endpoint (development only)
if (process.env.NODE_ENV === "development") {
  /**
   * @route   POST /api/v1/webhooks/test
   * @desc    Test webhook endpoint (development only)
   * @access  Public
   */
  router.post(
    "/test",
    body("provider").notEmpty().withMessage("Provider is required"),
    body("event").notEmpty().withMessage("Event is required"),
    body("data").isObject().withMessage("Data must be an object"),
    validateRequest,
    asyncHandler(webhookController.handleTestWebhook),
  );
}

// Webhook management endpoints (admin only)
const { authenticate } = require("../../middleware/auth/authenticate");
const { authorize } = require("../../middleware/auth/authorize");

/**
 * @route   GET /api/v1/webhooks/logs
 * @desc    Get webhook logs (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/logs",
  authenticate,
  authorize(["admin"]),
  query("provider").optional().isAlpha().withMessage("Invalid provider"),
  query("status")
    .optional()
    .isIn(["success", "failed", "pending"])
    .withMessage("Invalid status"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Valid start date is required"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date is required"),
  validateRequest,
  asyncHandler(webhookController.getWebhookLogs),
);

/**
 * @route   POST /api/v1/webhooks/retry/:webhookId
 * @desc    Retry failed webhook (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/retry/:webhookId",
  authenticate,
  authorize(["admin"]),
  param("webhookId").isMongoId().withMessage("Valid webhook ID is required"),
  validateRequest,
  asyncHandler(webhookController.retryWebhook),
);

/**
 * @route   GET /api/v1/webhooks/stats
 * @desc    Get webhook statistics (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/stats",
  authenticate,
  authorize(["admin"]),
  query("period")
    .optional()
    .isIn(["day", "week", "month"])
    .withMessage("Invalid period"),
  validateRequest,
  asyncHandler(webhookController.getWebhookStats),
);

// ── Unified orchestration webhook ─────────────────────────────────────────────
// This single endpoint receives from Stripe, Paystack, and Flutterwave.
// Provider is auto-detected via signature; `X-Provider` header speeds up lookup.
//
// IMPORTANT: raw body must reach the controller for HMAC verification.
// The `express.raw` middleware at the top of this router handles that.

/**
 * @route   POST /api/v1/webhooks/orchestrator
 * @desc    Unified webhook handler for the payment orchestration layer.
 *          Verifies signature, normalises event, updates payment status.
 * @access  Public (signature-protected)
 */
router.post(
  "/orchestrator",
  asyncHandler(
    orchestratorController.handleWebhook.bind(orchestratorController),
  ),
);

module.exports = router;
