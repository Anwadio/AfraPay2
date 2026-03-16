/**
 * Transaction Authorization Middleware
 * Enforces ownership, KYC level requirements, and spending limits
 * for all transaction operations
 */

const logger = require("../../utils/logger");
const {
  AuthorizationError,
  ValidationError,
} = require("../monitoring/errorHandler");

// KYC level transaction limits (amount per single transaction, in USD equivalent)
const KYC_TRANSACTION_LIMITS = {
  0: { single: 100, daily: 200, monthly: 500 }, // Unverified
  1: { single: 1000, daily: 2000, monthly: 10000 }, // Basic KYC
  2: { single: 10000, daily: 20000, monthly: 100000 }, // Full KYC
  3: { single: 100000, daily: 200000, monthly: 1000000 }, // Business KYC
};

// Operations requiring a minimum KYC level
const KYC_REQUIREMENTS = {
  withdrawal: 1,
  transfer: 1,
  deposit: 0,
  payment: 1,
  refund: 0,
  fee: 0,
};

// Operations requiring MFA to have been verified in the current session
const MFA_REQUIRED_OPERATIONS = ["withdrawal", "transfer"];

// Minimum PIN-confirmation amount (USD equivalent)
const PIN_REQUIRED_THRESHOLD = 500;

/**
 * Authorize that the authenticated user owns the transaction they are
 * requesting.  Falls through for admin / super_admin roles.
 *
 * @param {string} [ownerField='userId'] - Field on the fetched document that
 *   holds the owner user-id.  Resolved by controller; stored on req.resource.
 */
function authorizeTransactionOwner(ownerField = "userId") {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError("Authentication required");
      }

      const { id: currentUserId, role } = req.user;

      // Admins bypass ownership check
      if (["admin", "super_admin"].includes(role)) {
        logger.debug("Admin bypass on transaction ownership check", {
          userId: currentUserId,
          role,
          requestId: req.id,
        });
        return next();
      }

      // req.resource is set by the controller before calling this middleware
      // in the "verify then act" pattern, or is passed via res.locals by a
      // preceding fetch middleware.
      const resource = req.resource || res.locals.resource;

      if (resource) {
        const ownerId = resource[ownerField] || resource.senderId;
        if (ownerId && ownerId !== currentUserId) {
          logger.warn("Transaction ownership check failed", {
            userId: currentUserId,
            ownerId,
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
          });
          throw new AuthorizationError(
            "Access denied: you do not own this transaction",
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Enforce that the user's KYC level is sufficient for the requested
 * transaction type.  Reads the type from req.body.type or the URL param.
 *
 * @param {string} [typeSource='body'] - Where to read the transaction type:
 *   'body', 'params', or a literal type string.
 */
function requireKYCLevel(typeSource = "body") {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError("Authentication required");
      }

      const { id: userId, kycLevel = 0, role } = req.user;

      // Admins bypass KYC check
      if (["admin", "super_admin"].includes(role)) {
        return next();
      }

      const txType =
        typeSource === "params"
          ? req.params.type
          : typeSource === "body"
            ? req.body.type
            : typeSource; // literal type

      if (!txType) {
        return next(); // No type to check; controller will validate
      }

      const required = KYC_REQUIREMENTS[txType];

      if (required === undefined) {
        return next(); // Unknown type; controller will validate
      }

      if (kycLevel < required) {
        logger.warn("KYC level insufficient for transaction type", {
          userId,
          kycLevel,
          required,
          txType,
          requestId: req.id,
        });
        throw new AuthorizationError(
          `Your account verification level (${kycLevel}) is insufficient for this operation. ` +
            `Level ${required} is required.`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Enforce that MFA was verified in the current session for sensitive
 * transaction types (withdrawal, transfer).
 *
 * @param {string[]} [sensitiveTypes] - Override the default MFA-required types.
 */
function requireMFAForSensitiveTransactions(
  sensitiveTypes = MFA_REQUIRED_OPERATIONS,
) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError("Authentication required");
      }

      const { id: userId, mfaVerified, role } = req.user;

      // Admins bypass MFA check
      if (["admin", "super_admin"].includes(role)) {
        return next();
      }

      const txType = req.body.type || req.params.type;

      if (txType && sensitiveTypes.includes(txType) && !mfaVerified) {
        logger.warn("MFA required but not verified for sensitive transaction", {
          userId,
          txType,
          requestId: req.id,
          ip: req.ip,
        });
        throw new AuthorizationError(
          "Multi-factor authentication is required for this operation. " +
            "Please verify your identity and try again.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Enforce per-transaction amount limits based on the user's KYC level.
 *
 * Note: Daily / monthly rolling limits must be checked in the controller
 * where database access is available. This middleware enforces the hard
 * per-transaction ceiling from the KYC table.
 */
function enforceTransactionAmountLimit() {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError("Authentication required");
      }

      const { id: userId, kycLevel = 0, role } = req.user;

      // Admins bypass amount check
      if (["admin", "super_admin"].includes(role)) {
        return next();
      }

      const amount = parseFloat(req.body.amount);

      if (isNaN(amount) || amount <= 0) {
        // Let the validation middleware return the proper error
        return next();
      }

      const limits =
        KYC_TRANSACTION_LIMITS[kycLevel] || KYC_TRANSACTION_LIMITS[0];

      if (amount > limits.single) {
        logger.warn("Transaction amount exceeds KYC limit", {
          userId,
          kycLevel,
          amount,
          singleLimit: limits.single,
          requestId: req.id,
        });
        throw new AuthorizationError(
          `Transaction amount exceeds your account limit of ${limits.single} ${req.body.currency || "USD"}. ` +
            "Complete additional verification to increase your limits.",
        );
      }

      // Attach limits to request so the controller can check daily/monthly
      req.transactionLimits = limits;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Guard that the user account is active and not suspended/frozen.
 * Reads account status from req.user (populated by authenticate middleware).
 */
function requireActiveAccount() {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError("Authentication required");
      }

      const { id: userId, status, role } = req.user;

      // Admins bypass status check
      if (["admin", "super_admin"].includes(role)) {
        return next();
      }

      if (status && status !== "active") {
        logger.warn("Transaction attempted on non-active account", {
          userId,
          status,
          requestId: req.id,
          ip: req.ip,
        });
        throw new AuthorizationError(
          `Your account is currently ${status}. ` +
            "Please contact support to resolve this issue.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Prevent a user from sending money to themselves.
 */
function preventSelfTransfer() {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const { id: currentUserId } = req.user;
      const { recipientId } = req.body;

      if (recipientId && recipientId === currentUserId) {
        logger.warn("Self-transfer attempt blocked", {
          userId: currentUserId,
          requestId: req.id,
        });
        throw new ValidationError("You cannot send money to yourself");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Composite authorization guard for write operations (create / transfer).
 * Chains: requireActiveAccount → requireKYCLevel → requireMFAForSensitiveTransactions
 *         → enforceTransactionAmountLimit → preventSelfTransfer
 */
function authorizeTransactionWrite() {
  return [
    requireActiveAccount(),
    requireKYCLevel("body"),
    requireMFAForSensitiveTransactions(),
    enforceTransactionAmountLimit(),
    preventSelfTransfer(),
  ];
}

module.exports = {
  authorizeTransactionOwner,
  requireKYCLevel,
  requireMFAForSensitiveTransactions,
  enforceTransactionAmountLimit,
  requireActiveAccount,
  preventSelfTransfer,
  authorizeTransactionWrite,
  KYC_TRANSACTION_LIMITS,
  KYC_REQUIREMENTS,
  PIN_REQUIRED_THRESHOLD,
};
