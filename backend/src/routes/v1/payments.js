/**
 * Payment Routes
 * Handles payment processing, methods, and wallet operations
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

// Import middleware
const { authenticate } = require("../../middleware/auth/authenticate");
const { authorize } = require("../../middleware/auth/authorize");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { paymentLimiter } = require("../../middleware/security/rateLimiter");
const { idempotency } = require("../../middleware/security/idempotency");

// Import controllers
const paymentController = require("../../controllers/paymentController");
const orchestrator = require("../../controllers/orchestratorController");

// Validation schemas
const createPaymentValidation = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("currency")
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid currency code"),
  body("recipientId")
    .optional()
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid recipient ID is required"),
  body("recipientEmail")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid recipient email is required"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .escape()
    .withMessage("Description must be less than 500 characters"),
  body("paymentMethod")
    .isIn(["card", "bank_transfer", "mobile_money", "crypto"])
    .withMessage("Invalid payment method"),
  body("metadata")
    .optional()
    .isObject()
    .custom((value) => {
      const str = JSON.stringify(value);
      if (str.length > 2048)
        throw new Error("Metadata must not exceed 2048 bytes");
      return true;
    })
    .withMessage("Metadata must be an object"),
];

const addPaymentMethodValidation = [
  body("type")
    .isIn(["card", "bank_account", "mobile_money"])
    .withMessage("Invalid payment method type"),
  body("details").isObject().withMessage("Payment method details are required"),
];

const transferValidation = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("currency")
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid currency code"),
  body("recipientId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid recipient ID is required"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .escape()
    .withMessage("Description must be less than 500 characters"),
  body("pin")
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage("Valid PIN is required"),
];

const withdrawalValidation = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("currency")
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid currency code"),
  body("paymentMethodId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid payment method ID is required"),
  body("pin")
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage("Valid PIN is required"),
];

const paymentIdValidation = [
  param("paymentId")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Valid payment ID is required"),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["pending", "processing", "completed", "failed", "cancelled"])
    .withMessage("Invalid status filter"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Valid start date is required"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date is required"),
];

// ── Send Money validation ────────────────────────────────────────────────────
const sendMoneyValidation = [
  body("amount")
    .isFloat({ min: 0.01, max: 1_000_000 })
    .withMessage("Amount must be between 0.01 and 1,000,000"),
  body("currency")
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .toUpperCase()
    .withMessage("Currency must be a valid 3-letter ISO-4217 code (e.g. KES)"),
  body("provider")
    .isIn(["mpesa", "mtn", "wallet", "paystack", "flutterwave", "stripe"])
    .withMessage(
      "Provider must be one of: mpesa, mtn, wallet, paystack, flutterwave, stripe",
    ),
  // Phone-based providers (mpesa / mtn / wallet)
  body("receiverPhone")
    .if(body("provider").isIn(["mpesa", "mtn", "wallet"]))
    .trim()
    .isLength({ min: 7, max: 20 })
    .matches(/^[+\d\s\-().]+$/)
    .withMessage("A valid phone number is required for mpesa/mtn/wallet"),
  // Bank account providers (paystack / flutterwave)
  body("receiverAccountNumber")
    .if(body("provider").isIn(["paystack", "flutterwave", "stripe"]))
    .trim()
    .isLength({ min: 5, max: 60 })
    .withMessage(
      "A valid account number / connected account ID is required for paystack/flutterwave/stripe",
    ),
  body("receiverBankCode")
    .if(body("provider").isIn(["paystack", "flutterwave"]))
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage("Bank code is required for paystack/flutterwave"),
  body("receiverAccountName")
    .if(body("provider").isIn(["paystack", "flutterwave"]))
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Account holder name is required for paystack/flutterwave"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .escape()
    .withMessage("Description must be 200 characters or fewer"),
];

const transactionIdValidation = [
  param("transactionId")
    .trim()
    .isUUID(4)
    .withMessage("Valid transaction ID is required"),
];

// ── Send Money endpoints ──────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/payments/send
 * @desc    Send money via M-Pesa, MTN MoMo, or internal wallet
 * @access  Private
 *
 * Required header: Idempotency-Key: <uuid-v4>
 */
router.post(
  "/send",
  authenticate,
  paymentLimiter,
  idempotency,
  sendMoneyValidation,
  validateRequest,
  asyncHandler((req, res) => paymentController.sendMoney(req, res)),
);

/**
 * @route   GET /api/v1/payments/send/:transactionId/status
 * @desc    Poll current status of a send-money transaction (for async providers)
 * @access  Private
 */
router.get(
  "/send/:transactionId/status",
  authenticate,
  transactionIdValidation,
  validateRequest,
  asyncHandler((req, res) => paymentController.getSendMoneyStatus(req, res)),
);

// ── Standard payment processing routes ───────────────────────────────────────

/**
 * @route   POST /api/v1/payments
 * @desc    Create a new payment
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  paymentLimiter,
  createPaymentValidation,
  validateRequest,
  asyncHandler(paymentController.createPayment),
);

/**
 * @route   GET /api/v1/payments
 * @desc    Get user's payments
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  paginationValidation,
  validateRequest,
  asyncHandler(paymentController.getUserPayments),
);

/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment details
 * @access  Private
 */
router.get(
  "/:paymentId",
  authenticate,
  paymentIdValidation,
  validateRequest,
  asyncHandler(paymentController.getPayment),
);

/**
 * @route   POST /api/v1/payments/:paymentId/confirm
 * @desc    Confirm payment (for two-step payments)
 * @access  Private
 */
router.post(
  "/:paymentId/confirm",
  authenticate,
  paymentLimiter,
  paymentIdValidation,
  body("confirmationCode")
    .optional()
    .isLength({ min: 4, max: 10 })
    .withMessage("Valid confirmation code is required"),
  validateRequest,
  asyncHandler(paymentController.confirmPayment),
);

/**
 * @route   POST /api/v1/payments/:paymentId/cancel
 * @desc    Cancel payment
 * @access  Private
 */
router.post(
  "/:paymentId/cancel",
  authenticate,
  paymentIdValidation,
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Cancellation reason must be less than 500 characters"),
  validateRequest,
  asyncHandler(paymentController.cancelPayment),
);

// Wallet operations

/**
 * @route   GET /api/v1/payments/wallet/balance
 * @desc    Get wallet balances
 * @access  Private
 */
router.get(
  "/wallet/balance",
  authenticate,
  asyncHandler(paymentController.getWalletBalance.bind(paymentController)),
);

/**
 * @route   POST /api/v1/payments/wallet/transfer
 * @desc    Transfer money between users
 * @access  Private
 */
router.post(
  "/wallet/transfer",
  authenticate,
  paymentLimiter,
  transferValidation,
  validateRequest,
  asyncHandler(paymentController.transferMoney.bind(paymentController)),
);

/**
 * @route   POST /api/v1/payments/wallet/withdraw
 * @desc    Withdraw money to external account
 * @access  Private
 */
router.post(
  "/wallet/withdraw",
  authenticate,
  paymentLimiter,
  withdrawalValidation,
  validateRequest,
  asyncHandler(paymentController.withdrawMoney.bind(paymentController)),
);

/**
 * @route   POST /api/v1/payments/wallet/deposit
 * @desc    Deposit money to wallet
 * @access  Private
 */
router.post(
  "/wallet/deposit",
  authenticate,
  paymentLimiter,
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("currency")
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid currency code"),
  body("paymentMethodId")
    .isMongoId()
    .withMessage("Valid payment method ID is required"),
  validateRequest,
  asyncHandler(paymentController.depositMoney.bind(paymentController)),
);

// Payment methods management

/**
 * @route   GET /api/v1/payments/methods
 * @desc    Get user's payment methods
 * @access  Private
 */
router.get(
  "/methods",
  authenticate,
  asyncHandler(paymentController.getPaymentMethods),
);

/**
 * @route   POST /api/v1/payments/methods
 * @desc    Add new payment method
 * @access  Private
 */
router.post(
  "/methods",
  authenticate,
  addPaymentMethodValidation,
  validateRequest,
  asyncHandler(paymentController.addPaymentMethod),
);

/**
 * @route   DELETE /api/v1/payments/methods/:methodId
 * @desc    Remove payment method
 * @access  Private
 */
router.delete(
  "/methods/:methodId",
  authenticate,
  param("methodId")
    .isMongoId()
    .withMessage("Valid payment method ID is required"),
  validateRequest,
  asyncHandler(paymentController.removePaymentMethod),
);

/**
 * @route   PUT /api/v1/payments/methods/:methodId/default
 * @desc    Set payment method as default
 * @access  Private
 */
router.put(
  "/methods/:methodId/default",
  authenticate,
  param("methodId")
    .isMongoId()
    .withMessage("Valid payment method ID is required"),
  validateRequest,
  asyncHandler(paymentController.setDefaultPaymentMethod),
);

// Exchange rates and fees

/**
 * @route   GET /api/v1/payments/exchange-rates
 * @desc    Get current exchange rates
 * @access  Private
 */
router.get(
  "/exchange-rates",
  authenticate,
  query("from")
    .optional()
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid from currency"),
  query("to")
    .optional()
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid to currency"),
  validateRequest,
  asyncHandler(paymentController.getExchangeRates),
);

/**
 * @route   GET /api/v1/payments/fees
 * @desc    Get fee structure
 * @access  Private
 */
router.get(
  "/fees",
  authenticate,
  query("type")
    .optional()
    .isIn(["transfer", "withdrawal", "deposit", "conversion"])
    .withMessage("Invalid fee type"),
  query("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  query("currency")
    .optional()
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid currency"),
  validateRequest,
  asyncHandler(paymentController.getFees),
);

// Recurring payments

/**
 * @route   POST /api/v1/payments/recurring
 * @desc    Set up recurring payment
 * @access  Private
 */
router.post(
  "/recurring",
  authenticate,
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("currency")
    .isIn(["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"])
    .withMessage("Invalid currency code"),
  body("recipientId").isMongoId().withMessage("Valid recipient ID is required"),
  body("frequency")
    .isIn(["daily", "weekly", "monthly", "quarterly", "yearly"])
    .withMessage("Invalid frequency"),
  body("startDate").isISO8601().withMessage("Valid start date is required"),
  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date is required"),
  validateRequest,
  asyncHandler(paymentController.setupRecurringPayment),
);

/**
 * @route   GET /api/v1/payments/recurring
 * @desc    Get recurring payments
 * @access  Private
 */
router.get(
  "/recurring",
  authenticate,
  asyncHandler(paymentController.getRecurringPayments),
);

/**
 * @route   PUT /api/v1/payments/recurring/:recurringId
 * @desc    Update recurring payment
 * @access  Private
 */
router.put(
  "/recurring/:recurringId",
  authenticate,
  param("recurringId")
    .isMongoId()
    .withMessage("Valid recurring payment ID is required"),
  validateRequest,
  asyncHandler(paymentController.updateRecurringPayment),
);

/**
 * Cancel recurring payment
 * @access  Private
 */
router.delete(
  "/recurring/:recurringId",
  authenticate,
  param("recurringId")
    .isMongoId()
    .withMessage("Valid recurring payment ID is required"),
  validateRequest,
  asyncHandler(paymentController.cancelRecurringPayment),
);

// ── Orchestration layer ───────────────────────────────────────────────────────

const ORCHESTRATED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "UGX",
  "TZS",
  "RWF",
  "ZMW",
  "MWK",
  "ETB",
  "EGP",
  "XOF",
  "XAF",
  "MXN",
  "BRL",
  "INR",
  "SGD",
];

/**
 * @route   POST /api/v1/payments/orchestrate
 * @desc    Initiate a payment through the multi-provider orchestration layer.
 *          Idempotency-Key header (UUID v4) is REQUIRED.
 * @access  Private
 */
router.post(
  "/orchestrate",
  authenticate,
  idempotency({ required: true }),
  paymentLimiter,
  [
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("amount must be a positive number"),
    body("currency")
      .isIn(ORCHESTRATED_CURRENCIES)
      .withMessage("Unsupported currency code"),
    body("method")
      .isIn(["card", "bank_transfer", "mobile_money"])
      .withMessage("method must be 'card', 'bank_transfer', or 'mobile_money'"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("recipientEmail")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid recipient email required"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("description must be under 500 characters"),
    body("vaultToken")
      .optional()
      .isString()
      .withMessage("vaultToken must be a string"),
    body("metadata")
      .optional()
      .isObject()
      .withMessage("metadata must be an object"),
    body("callbackUrl")
      .optional()
      .isURL({ require_tld: false })
      .withMessage("callbackUrl must be a valid URL"),
  ],
  validateRequest,
  asyncHandler(orchestrator.initiatePayment.bind(orchestrator)),
);

/**
 * @route   POST /api/v1/payments/:paymentId/refund
 * @desc    Refund a completed payment (partial or full).
 *          Idempotency-Key header (UUID v4) is REQUIRED.
 * @access  Private (payer or admin)
 */
router.post(
  "/:paymentId/refund",
  authenticate,
  idempotency({ required: true }),
  paymentLimiter,
  [
    param("paymentId")
      .isString()
      .notEmpty()
      .withMessage("Valid paymentId is required"),
    body("amount")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("amount must be a positive number"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("reason must be under 500 characters"),
  ],
  validateRequest,
  asyncHandler(orchestrator.refundPayment.bind(orchestrator)),
);

/**
 * @route   GET /api/v1/payments/providers/health
 * @desc    Circuit-breaker health for all registered providers.
 * @access  Private
 */
router.get(
  "/providers/health",
  authenticate,
  asyncHandler(orchestrator.getProviderHealth.bind(orchestrator)),
);

/**
 * @route   POST /api/v1/payments/providers/:providerName/reset
 * @desc    Admin: manually reset a provider's circuit breaker.
 * @access  Private (admin only — enforced in controller)
 */
router.post(
  "/providers/:providerName/reset",
  authenticate,
  [
    param("providerName")
      .isIn(["stripe", "paystack", "flutterwave"])
      .withMessage("providerName must be stripe, paystack, or flutterwave"),
  ],
  validateRequest,
  asyncHandler(orchestrator.resetProviderCircuit.bind(orchestrator)),
);

module.exports = router;
