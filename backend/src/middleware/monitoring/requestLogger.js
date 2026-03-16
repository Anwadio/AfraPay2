/**
 * Request Logger Middleware
 * Comprehensive request/response logging with performance metrics
 */

const logger = require("../../utils/logger");
const config = require("../../config/environment");

// Fields that must never appear in logs regardless of environment.
const REDACTED_FIELDS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "pin",
  "mfaCode",
  "otp",
  "secret",
  "cardNumber",
  "cvv",
  "cvc",
  "expiry",
  "refreshToken",
  "accessToken",
  "token",
  "authorization",
  "x-api-key",
]);

// Routes whose request bodies should never be logged even in development.
const SENSITIVE_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
];

/**
 * Recursively redact known-sensitive keys from an object.
 * Works on plain objects and arrays; leaves primitives untouched.
 */
function redactSensitiveFields(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj))
    return obj.map((v) => redactSensitiveFields(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACTED_FIELDS.has(k.toLowerCase())
      ? "[REDACTED]"
      : redactSensitiveFields(v, depth + 1);
  }
  return out;
}

/**
 * Create request logger middleware
 * @returns {Function} Request logger middleware
 */
function createRequestLogger() {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.id;

    // Log request start
    const isSensitivePath = SENSITIVE_PATHS.some((p) =>
      req.originalUrl.includes(p),
    );
    logger.info("Request started", {
      requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      contentType: req.get("Content-Type"),
      contentLength: req.get("Content-Length"),
      userId: req.user?.id,
      // Only log body in dev, and always redact sensitive fields
      ...(config.app.isDevelopment &&
        !isSensitivePath &&
        req.body &&
        Object.keys(req.body).length > 0 && {
          body: redactSensitiveFields(req.body),
        }),
    });

    // Capture original res.end
    const originalEnd = res.end;
    const originalWrite = res.write;
    const chunks = [];

    // Override res.write to capture response body (for debugging)
    res.write = function (chunk) {
      if (config.app.isDevelopment && chunk) {
        chunks.push(Buffer.from(chunk));
      }
      return originalWrite.apply(this, arguments);
    };

    // Override res.end to log response
    res.end = function (chunk) {
      if (chunk && config.app.isDevelopment) {
        chunks.push(Buffer.from(chunk));
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const responseBody = config.app.isDevelopment
        ? Buffer.concat(chunks).toString("utf8")
        : null;

      // Determine log level based on status code
      let logLevel = "info";
      if (res.statusCode >= 500) {
        logLevel = "error";
      } else if (res.statusCode >= 400) {
        logLevel = "warn";
      }

      // Log response
      logger[logLevel]("Request completed", {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentType: res.get("Content-Type"),
        contentLength: res.get("Content-Length"),
        userAgent: req.get("User-Agent"),
        ip: req.ip,
        userId: req.user?.id,
        ...(config.app.isDevelopment &&
          responseBody &&
          !isSensitivePath && {
            responseBody:
              responseBody.length > 500
                ? responseBody.substring(0, 500) + "...[truncated]"
                : responseBody,
          }),
      });

      // Performance monitoring
      if (responseTime > 5000) {
        // Log slow requests (>5s)
        logger.warn("Slow request detected", {
          requestId,
          method: req.method,
          url: req.originalUrl,
          responseTime: `${responseTime}ms`,
          userId: req.user?.id,
        });
      }

      // Security monitoring
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.security("Authentication/Authorization failure", {
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          userId: req.user?.id,
        });
      }

      // Call original end
      originalEnd.apply(this, arguments);
    };

    next();
  };
}

module.exports = createRequestLogger;
