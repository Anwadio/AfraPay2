/**
 * Error Handler Middleware
 * Centralized error handling with logging and appropriate responses
 */

const logger = require("../../utils/logger");
const config = require("../../config/environment");

// ─── Sentry integration (optional — loaded only when SENTRY_DSN is set) ──────
let Sentry = null;
try {
  if (config.logging.sentryDsn) {
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn: config.logging.sentryDsn,
      environment: config.app.env,
      release: `afrapay@${config.app.version}`,
      // Don't send full request bodies — they may contain credentials
      sendDefaultPii: false,
      tracesSampleRate: config.app.isProduction ? 0.1 : 0,
    });
    logger.info("Sentry error monitoring initialised");
  }
} catch {
  // @sentry/node not installed — monitoring disabled
  logger.warn(
    "Sentry not available: install @sentry/node and set SENTRY_DSN to enable error reporting",
  );
}

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  ) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors
  }
}

/**
 * Validation error class
 */
class ValidationError extends APIError {
  constructor(message, details = []) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication error class
 */
class AuthenticationError extends APIError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization error class
 */
class AuthorizationError extends APIError {
  constructor(message = "Access forbidden") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

/**
 * Not found error class
 */
class NotFoundError extends APIError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Conflict error class
 */
class ConflictError extends APIError {
  constructor(message = "Resource conflict") {
    super(message, 409, "CONFLICT_ERROR");
    this.name = "ConflictError";
  }
}

/**
 * Rate limit error class
 */
class RateLimitError extends APIError {
  constructor(message = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

/**
 * Insufficient funds error — 422 (the request was valid but the business
 * rule prevents processing).
 */
class InsufficientFundsError extends APIError {
  constructor(message = "Insufficient funds for this transaction") {
    super(message, 422, "INSUFFICIENT_FUNDS");
    this.name = "InsufficientFundsError";
  }
}

/**
 * Payment processing error — distinguishes upstream payment gateway
 * failures from generic 500s so clients can retry or prompt the user.
 */
class PaymentError extends APIError {
  constructor(message = "Payment processing failed", details = null) {
    super(message, 402, "PAYMENT_ERROR", details);
    this.name = "PaymentError";
  }
}

/**
 * External service error — wraps failures from Appwrite, Stripe,
 * Paystack, Flutterwave, etc. so they appear as 502/503 rather than 500.
 */
class ExternalServiceError extends APIError {
  constructor(
    service = "External service",
    message = "Service is temporarily unavailable",
    statusCode = 503,
  ) {
    super(message, statusCode, "EXTERNAL_SERVICE_ERROR");
    this.name = "ExternalServiceError";
    this.service = service;
  }
}

/**
 * KYC / compliance error — user has not completed the required
 * verification level for the operation.
 */
class KYCError extends APIError {
  constructor(message = "KYC verification required", requiredLevel = 1) {
    super(message, 403, "KYC_REQUIRED");
    this.name = "KYCError";
    this.requiredLevel = requiredLevel;
    this.details = { requiredLevel };
  }
}

/**
 * Email not verified — user must confirm their email before signing in.
 * Returns 403 with a distinct code so the frontend can show a targeted
 * "resend verification" prompt instead of a generic error.
 */
class EmailNotVerifiedError extends APIError {
  constructor(message = "Please verify your email address before signing in.") {
    super(message, 403, "EMAIL_NOT_VERIFIED");
    this.name = "EmailNotVerifiedError";
  }
}

/**
 * Handle different types of errors
 * @param {Error} error - The error object
 * @returns {Object} Formatted error response
 */
function handleError(error) {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Internal server error";
  let details = null;

  // Handle known error types
  if (error.isOperational || error instanceof APIError) {
    statusCode = error.statusCode || 500;
    code = error.code || "API_ERROR";
    message = error.message;
    details = error.details;
  }
  // Handle Joi validation errors
  else if (error.name === "ValidationError" && error.details) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: detail.value,
    }));
  }
  // Handle JWT errors
  else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "INVALID_TOKEN";
    message = "Invalid or malformed token";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    code = "TOKEN_EXPIRED";
    message = "Token has expired";
  }
  // Handle Appwrite errors
  else if (error.type && error.type.startsWith("appwrite")) {
    statusCode = error.code || 500;
    code = error.type.toUpperCase().replace("/", "_");
    message = error.message;
  }
  // Handle MongoDB errors (if using MongoDB in future)
  else if (error.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_FIELD";
    message = "Duplicate field value";
    const field = Object.keys(error.keyValue)[0];
    details = `${field} already exists`;
  }
  // Handle multer errors (file upload)
  else if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    code = "FILE_TOO_LARGE";
    message = "File size exceeds the allowed limit";
  } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    code = "INVALID_FILE_FIELD";
    message = "Unexpected file field";
  }
  // Handle network / external service errors
  else if (error.code === "ENOTFOUND" || error.code === "ECONNRESET") {
    statusCode = 503;
    code = "SERVICE_UNAVAILABLE";
    message = "External service unavailable";
  } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    statusCode = 503;
    code = "CONNECTION_REFUSED";
    message = "Connection refused to external service";
  }
  // Appwrite specific errors (node-appwrite >= 12)
  else if (error.constructor?.name === "AppwriteException") {
    statusCode = error.code >= 400 && error.code < 600 ? error.code : 502;
    code = "APPWRITE_ERROR";
    message = config.app.isProduction
      ? "Database service error"
      : error.message;
  }
  // Axios errors from payment gateways
  else if (error.isAxiosError) {
    const gatewayStatus = error.response?.status;
    statusCode = gatewayStatus >= 500 ? 502 : 503;
    code = "PAYMENT_GATEWAY_ERROR";
    message = "Payment gateway error. Please try again.";
  }

  return {
    statusCode,
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      // Stack traces are only emitted in development — never expose internals
      // to API consumers in production.
      ...(config.app.isDevelopment && { stack: error.stack }),
    },
  };
}

/**
 * Report a non-operational (unexpected / programming) error to Sentry.
 * Operational errors (user input errors, auth failures, payment errors)
 * are expected and do NOT need to be reported.
 *
 * @param {Error}  error
 * @param {Object} req
 */
function reportToSentry(error, req) {
  if (!Sentry) return;
  // Only report unexpected server errors — not operational/user-facing ones
  if (error.isOperational) return;

  Sentry.withScope((scope) => {
    scope.setTag("requestId", req.id);
    scope.setTag("method", req.method);
    scope.setTag("url", req.originalUrl);
    scope.setUser({ id: req.user?.id, email: req.user?.email });
    Sentry.captureException(error);
  });
}

/**
 * Main error handler middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(error, req, res, next) {
  // Report unexpected errors to Sentry before logging/responding
  reportToSentry(error, req);

  // Log the error
  logger.errorWithContext(error, {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
    body: config.app.isDevelopment ? req.body : undefined,
  });

  // Handle the error
  const errorResponse = handleError(error);

  // Send error response
  res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  const error = new NotFoundError("Endpoint");
  const errorResponse = handleError(error);

  logger.warn("404 - Endpoint not found", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(404).json(errorResponse);
}

/**
 * Async error wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InsufficientFundsError,
  PaymentError,
  ExternalServiceError,
  KYCError,
  EmailNotVerifiedError,
};
