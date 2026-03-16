/**
 * Transaction Validation Middleware
 * Comprehensive input validation for all transaction-related operations
 * Follows OWASP input validation best practices for financial data
 */

const { body, param, query } = require("express-validator");
const validateRequest = require("./validateRequest");

// Supported currencies per the AfraPay platform
const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"];

// Transaction types
const TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "transfer",
  "payment",
  "refund",
  "fee",
];

// Transaction statuses
const TRANSACTION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
];

// Payment methods
const PAYMENT_METHODS = ["card", "bank_transfer", "mobile_money", "wallet"];

// Maximum transaction amount (hard limit; KYC-based soft limits enforced in controller)
const MAX_TRANSACTION_AMOUNT = 1_000_000;

// Minimum transaction amount
const MIN_TRANSACTION_AMOUNT = 0.01;

/**
 * Validate creating a new transaction / transfer
 */
const validateCreateTransaction = [
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: MIN_TRANSACTION_AMOUNT, max: MAX_TRANSACTION_AMOUNT })
    .withMessage(
      `Amount must be between ${MIN_TRANSACTION_AMOUNT} and ${MAX_TRANSACTION_AMOUNT}`,
    )
    .customSanitizer((value) => parseFloat(parseFloat(value).toFixed(2))), // Normalize to 2 decimal places

  body("currency")
    .notEmpty()
    .withMessage("Currency is required")
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`),

  body("recipientId")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 1, max: 36 })
    .withMessage("Recipient ID must be a valid identifier")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Recipient ID contains invalid characters"),

  body("recipientEmail")
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Recipient email must be a valid email address"),

  body("recipientPhone")
    .optional({ nullable: true })
    .trim()
    .isMobilePhone("any", { strictMode: false })
    .withMessage("Recipient phone must be a valid phone number"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters")
    .escape(), // sanitize against XSS

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(PAYMENT_METHODS)
    .withMessage(
      `Payment method must be one of: ${PAYMENT_METHODS.join(", ")}`,
    ),

  body("pin")
    .optional()
    .isLength({ min: 4, max: 6 })
    .withMessage("PIN must be 4-6 digits")
    .isNumeric()
    .withMessage("PIN must contain only digits"),

  body("idempotencyKey")
    .optional()
    .trim()
    .isLength({ min: 8, max: 64 })
    .withMessage("Idempotency key must be 8-64 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Idempotency key contains invalid characters"),

  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be a JSON object")
    .custom((value) => {
      const str = JSON.stringify(value);
      if (str.length > 2048) {
        throw new Error("Metadata must not exceed 2048 bytes");
      }
      return true;
    }),

  // At least one recipient method must be provided
  body().custom((body) => {
    if (!body.recipientId && !body.recipientEmail && !body.recipientPhone) {
      throw new Error(
        "At least one recipient identifier (recipientId, recipientEmail, or recipientPhone) is required",
      );
    }
    return true;
  }),

  validateRequest,
];

/**
 * Validate transaction ID in URL params
 */
const validateTransactionId = [
  param("transactionId")
    .notEmpty()
    .withMessage("Transaction ID is required")
    .trim()
    .isLength({ min: 1, max: 36 })
    .withMessage("Invalid transaction ID length")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Transaction ID contains invalid characters"),

  validateRequest,
];

/**
 * Validate pagination and filter query parameters for listing transactions
 */
const validateTransactionListQuery = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 10_000 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("type")
    .optional()
    .isIn(TRANSACTION_TYPES)
    .withMessage(`Type must be one of: ${TRANSACTION_TYPES.join(", ")}`),

  query("status")
    .optional()
    .isIn(TRANSACTION_STATUSES)
    .withMessage(`Status must be one of: ${TRANSACTION_STATUSES.join(", ")}`),

  query("currency")
    .optional()
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (
        req.query.startDate &&
        new Date(endDate) < new Date(req.query.startDate)
      ) {
        throw new Error("endDate must be after startDate");
      }
      return true;
    }),

  query("minAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minAmount must be a non-negative number"),

  query("maxAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxAmount must be a non-negative number")
    .custom((maxAmount, { req }) => {
      if (
        req.query.minAmount &&
        parseFloat(maxAmount) < parseFloat(req.query.minAmount)
      ) {
        throw new Error("maxAmount must be greater than or equal to minAmount");
      }
      return true;
    }),

  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be 1-100 characters")
    .matches(/^[a-zA-Z0-9\s@._-]+$/)
    .withMessage("Search term contains invalid characters"),

  validateRequest,
];

/**
 * Validate analytics query parameters
 */
const validateAnalyticsQuery = [
  query("period")
    .optional()
    .isIn(["day", "week", "month", "quarter", "year"])
    .withMessage("Period must be one of: day, week, month, quarter, year"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (
        req.query.startDate &&
        new Date(endDate) < new Date(req.query.startDate)
      ) {
        throw new Error("endDate must be after startDate");
      }
      return true;
    }),

  query("currency")
    .optional()
    .isIn(SUPPORTED_CURRENCIES)
    .withMessage(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`),

  validateRequest,
];

/**
 * Validate export request parameters
 */
const validateExportQuery = [
  query("format")
    .notEmpty()
    .withMessage("Export format is required")
    .isIn(["csv", "pdf", "xlsx"])
    .withMessage("Format must be one of: csv, pdf, xlsx"),

  ...validateTransactionListQuery.slice(0, -1), // reuse list validation, remove duplicate validateRequest
  validateRequest,
];

/**
 * Validate a transaction dispute submission
 */
const validateDisputeTransaction = [
  param("transactionId")
    .notEmpty()
    .withMessage("Transaction ID is required")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Invalid transaction ID"),

  body("reason")
    .notEmpty()
    .withMessage("Dispute reason is required")
    .isIn([
      "unauthorized_transaction",
      "duplicate_charge",
      "incorrect_amount",
      "service_not_received",
      "product_not_received",
      "other",
    ])
    .withMessage("Invalid dispute reason"),

  body("description")
    .notEmpty()
    .withMessage("Dispute description is required")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters")
    .escape(),

  body("evidence")
    .optional()
    .isArray({ max: 5 })
    .withMessage("Evidence must be an array of up to 5 items"),

  body("evidence.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Each evidence item must be a valid reference string")
    .matches(/^[a-zA-Z0-9_/-]+$/)
    .withMessage("Evidence item contains invalid characters"),

  validateRequest,
];

/**
 * Validate cancel transaction request
 */
const validateCancelTransaction = [
  param("transactionId")
    .notEmpty()
    .withMessage("Transaction ID is required")
    .trim()
    .isLength({ min: 1, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Invalid transaction ID"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Cancellation reason must not exceed 500 characters")
    .escape(),

  validateRequest,
];

module.exports = {
  validateCreateTransaction,
  validateTransactionId,
  validateTransactionListQuery,
  validateAnalyticsQuery,
  validateExportQuery,
  validateDisputeTransaction,
  validateCancelTransaction,
  SUPPORTED_CURRENCIES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  MAX_TRANSACTION_AMOUNT,
  MIN_TRANSACTION_AMOUNT,
};
