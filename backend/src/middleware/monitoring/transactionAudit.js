/**
 * Transaction Audit Logger
 * Structured, tamper-evident audit logging for all financial events.
 *
 * Every log entry contains:
 *   - action        : machine-readable event code
 *   - userId        : who triggered the event
 *   - requestId     : correlates with the HTTP request log
 *   - ip            : originating IP address
 *   - userAgent     : originating client
 *   - outcome       : 'success' | 'failure' | 'blocked'
 *   - details       : event-specific payload (no secrets)
 *   - timestamp     : ISO-8601 UTC timestamp
 *   - category      : always 'TRANSACTION_AUDIT'
 */

const logger = require("../../utils/logger");

// ─── Action codes ────────────────────────────────────────────────────────────
const AUDIT_ACTIONS = {
  // Transaction lifecycle
  TRANSACTION_INITIATED: "TRANSACTION_INITIATED",
  TRANSACTION_VALIDATED: "TRANSACTION_VALIDATED",
  TRANSACTION_AUTHORIZED: "TRANSACTION_AUTHORIZED",
  TRANSACTION_PROCESSING: "TRANSACTION_PROCESSING",
  TRANSACTION_COMPLETED: "TRANSACTION_COMPLETED",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  TRANSACTION_CANCELLED: "TRANSACTION_CANCELLED",
  TRANSACTION_REVERSED: "TRANSACTION_REVERSED",
  TRANSACTION_DISPUTED: "TRANSACTION_DISPUTED",

  // Authorization events
  AUTH_KYC_LEVEL_BLOCKED: "AUTH_KYC_LEVEL_BLOCKED",
  AUTH_AMOUNT_LIMIT_EXCEEDED: "AUTH_AMOUNT_LIMIT_EXCEEDED",
  AUTH_DAILY_LIMIT_EXCEEDED: "AUTH_DAILY_LIMIT_EXCEEDED",
  AUTH_MONTHLY_LIMIT_EXCEEDED: "AUTH_MONTHLY_LIMIT_EXCEEDED",
  AUTH_MFA_REQUIRED: "AUTH_MFA_REQUIRED",
  AUTH_ACCOUNT_SUSPENDED: "AUTH_ACCOUNT_SUSPENDED",
  AUTH_OWNERSHIP_DENIED: "AUTH_OWNERSHIP_DENIED",
  AUTH_SELF_TRANSFER_BLOCKED: "AUTH_SELF_TRANSFER_BLOCKED",

  // Validation events
  VALIDATION_FAILED: "VALIDATION_FAILED",
  IDEMPOTENCY_HIT: "IDEMPOTENCY_HIT",

  // Balance / wallet events
  BALANCE_INSUFFICIENT: "BALANCE_INSUFFICIENT",
  BALANCE_DEBITED: "BALANCE_DEBITED",
  BALANCE_CREDITED: "BALANCE_CREDITED",

  // Export / report events
  TRANSACTION_EXPORT: "TRANSACTION_EXPORT",
  TRANSACTION_REPORT_VIEWED: "TRANSACTION_REPORT_VIEWED",

  // Suspicious activity
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  RAPID_FIRE_DETECTED: "RAPID_FIRE_DETECTED",
};

// ─── Core audit logger ───────────────────────────────────────────────────────

/**
 * Emit a structured audit log entry.
 *
 * @param {string}  action   - One of AUDIT_ACTIONS values
 * @param {Object}  context  - Object with at least { userId }
 * @param {string}  outcome  - 'success' | 'failure' | 'blocked'
 * @param {Object}  [details] - Additional business-level details (no PII secrets)
 */
function logAuditEvent(
  action,
  context = {},
  outcome = "success",
  details = {},
) {
  const entry = {
    category: "TRANSACTION_AUDIT",
    action,
    outcome,
    userId: context.userId || "anonymous",
    requestId: context.requestId || null,
    sessionId: context.sessionId || null,
    ip: sanitizeIp(context.ip),
    userAgent: context.userAgent || null,
    timestamp: new Date().toISOString(),
    details: sanitizeDetails(details),
  };

  if (outcome === "failure" || outcome === "blocked") {
    logger.warn(`AUDIT [${action}]`, entry);
  } else {
    logger.info(`AUDIT [${action}]`, entry);
  }
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

/** Log the moment a user submits a transaction request */
function logTransactionInitiated(req, txData = {}) {
  logAuditEvent(
    AUDIT_ACTIONS.TRANSACTION_INITIATED,
    _extractContext(req),
    "success",
    {
      amount: txData.amount,
      currency: txData.currency,
      type: txData.type,
      paymentMethod: txData.paymentMethod,
      recipientId: txData.recipientId,
      idempotencyKey: txData.idempotencyKey,
    },
  );
}

/** Log successful transaction completion */
function logTransactionCompleted(req, txData = {}) {
  logAuditEvent(
    AUDIT_ACTIONS.TRANSACTION_COMPLETED,
    _extractContext(req),
    "success",
    {
      transactionId: txData.transactionId,
      amount: txData.amount,
      currency: txData.currency,
      type: txData.type,
      status: txData.status,
      recipientId: txData.recipientId,
      processorTransactionId: txData.processorTransactionId,
    },
  );
}

/** Log a transaction failure */
function logTransactionFailed(req, txData = {}, errorMessage = "") {
  logAuditEvent(
    AUDIT_ACTIONS.TRANSACTION_FAILED,
    _extractContext(req),
    "failure",
    {
      transactionId: txData.transactionId,
      amount: txData.amount,
      currency: txData.currency,
      type: txData.type,
      error: errorMessage,
    },
  );
}

/** Log transaction cancellation */
function logTransactionCancelled(req, txData = {}) {
  logAuditEvent(
    AUDIT_ACTIONS.TRANSACTION_CANCELLED,
    _extractContext(req),
    "success",
    {
      transactionId: txData.transactionId,
      reason: txData.reason,
    },
  );
}

/** Log when a dispute is filed */
function logTransactionDisputed(req, txData = {}) {
  logAuditEvent(
    AUDIT_ACTIONS.TRANSACTION_DISPUTED,
    _extractContext(req),
    "success",
    {
      transactionId: txData.transactionId,
      reason: txData.reason,
      disputeId: txData.disputeId,
    },
  );
}

/** Log an authorization failure (block reason) */
function logAuthorizationBlocked(req, reason = "", details = {}) {
  logAuditEvent(
    reason, // use the specific AUDIT_ACTIONS code
    _extractContext(req),
    "blocked",
    details,
  );
}

/** Log an input validation failure */
function logValidationFailed(req, errors = []) {
  logAuditEvent(
    AUDIT_ACTIONS.VALIDATION_FAILED,
    _extractContext(req),
    "failure",
    {
      errors: errors.map((e) => ({ field: e.param || e.path, message: e.msg })),
    },
  );
}

/** Log when debit/credit is applied to a wallet */
function logBalanceChange(req, changeData = {}) {
  const action =
    changeData.direction === "debit"
      ? AUDIT_ACTIONS.BALANCE_DEBITED
      : AUDIT_ACTIONS.BALANCE_CREDITED;

  logAuditEvent(action, _extractContext(req), "success", {
    walletId: changeData.walletId,
    amount: changeData.amount,
    currency: changeData.currency,
    transactionId: changeData.transactionId,
    balanceBefore: changeData.balanceBefore,
    balanceAfter: changeData.balanceAfter,
  });
}

/** Log suspicious activity flag */
function logSuspiciousActivity(req, details = {}) {
  logAuditEvent(
    AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY,
    _extractContext(req),
    "blocked",
    details,
  );
}

/** Log transaction data export */
function logTransactionExport(req, details = {}) {
  logAuditEvent(
    AUDIT_ACTIONS.TRANSACTION_EXPORT,
    _extractContext(req),
    "success",
    {
      format: details.format,
      recordCount: details.recordCount,
      dateRange: details.dateRange,
    },
  );
}

/** Log idempotency key hit (duplicate submission detected) */
function logIdempotencyHit(req, idempotencyKey = "") {
  logAuditEvent(
    AUDIT_ACTIONS.IDEMPOTENCY_HIT,
    _extractContext(req),
    "success", // not a failure - this is correct behaviour
    { idempotencyKey },
  );
}

// ─── Audit middleware ─────────────────────────────────────────────────────────

/**
 * Express middleware that automatically logs the initiation of any
 * POST request to a transaction endpoint.
 */
function auditTransactionRequest() {
  return (req, res, next) => {
    if (req.method === "POST") {
      logTransactionInitiated(req, {
        amount: req.body.amount,
        currency: req.body.currency,
        type: req.body.type,
        paymentMethod: req.body.paymentMethod,
        recipientId: req.body.recipientId,
        idempotencyKey:
          req.body.idempotencyKey || req.headers["x-idempotency-key"],
      });
    }
    next();
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Build a context object from the Express request */
function _extractContext(req) {
  return {
    userId: req.user?.id || "anonymous",
    requestId: req.id || null,
    sessionId: req.user?.sessionId || null,
    ip: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get("User-Agent") || null,
  };
}

/** Remove/redact sensitive fields from details before logging */
function sanitizeDetails(details = {}) {
  const sensitiveKeys = [
    "pin",
    "password",
    "cardNumber",
    "cvv",
    "secret",
    "token",
    "key",
  ];
  const sanitized = { ...details };
  for (const key of sensitiveKeys) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      sanitized[key] = "[REDACTED]";
    }
  }
  return sanitized;
}

/** Mask the last octet of an IPv4 address to preserve partial privacy */
function sanitizeIp(ip) {
  if (!ip || typeof ip !== "string") return null;
  // IPv4: mask last octet
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return ip.replace(/\.\d+$/, ".***");
  }
  // IPv6: mask last group
  return ip.replace(/:[a-fA-F0-9]+$/, ":****");
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  AUDIT_ACTIONS,
  logAuditEvent,
  logTransactionInitiated,
  logTransactionCompleted,
  logTransactionFailed,
  logTransactionCancelled,
  logTransactionDisputed,
  logAuthorizationBlocked,
  logValidationFailed,
  logBalanceChange,
  logSuspiciousActivity,
  logTransactionExport,
  logIdempotencyHit,
  auditTransactionRequest,
};
