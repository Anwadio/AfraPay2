/**
 * Input Sanitization Middleware
 *
 * Applied globally (before route handlers) to defend against:
 *
 * OWASP A03 – Injection
 *   • Prototype Pollution — strips `__proto__`, `constructor`, `prototype`
 *     keys from req.body, req.query and req.params.
 *   • Null-byte injection — removes \u0000 / \x00 from all string values.
 *
 * OWASP A03 – HTTP Parameter Pollution (HPP)
 *   • For a curated list of scalar query parameters (e.g. `page`, `limit`,
 *     `amount`, `currency`) that should never be arrays, we collapse
 *     duplicate values to the LAST supplied value — matching the behaviour
 *     a typical controller would expect.  All other parameters are left as-is
 *     so legitimate array params (e.g. filter lists) are preserved.
 *
 * Nothing in this middleware rejects requests — it silently normalises input
 * so that downstream validators / controllers always receive clean data.
 */

const logger = require("../../utils/logger");

// ─── Keys that carry prototype-pollution risk ──────────────────────────────
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// ─── Query params that must be scalar (HPP protection) ────────────────────
const SCALAR_QUERY_PARAMS = new Set([
  "page",
  "limit",
  "offset",
  "sort",
  "order",
  "email",
  "phone",
  "amount",
  "currency",
  "startDate",
  "endDate",
  "period",
  "status",
  "type",
  "category",
  "search",
  "userId",
  "transactionId",
  "paymentId",
]);

// ─── Core sanitisation helpers ─────────────────────────────────────────────

/**
 * Recursively walk a value and:
 *   1. Remove prototype-pollution keys from objects.
 *   2. Strip null bytes from strings.
 *
 * We cap recursion at depth 10 to avoid stack-overflow from deeply nested
 * attacker-controlled payloads.
 *
 * @param {*}      value
 * @param {number} [depth=0]
 * @returns {*}  Sanitised value (same type, same reference semantics unless mutated).
 */
function deepSanitize(value, depth = 0) {
  if (depth > 10) {
    // Silently truncate overly-deep nesting — do not propagate further.
    return undefined;
  }

  if (typeof value === "string") {
    // Remove null bytes and other C0 control characters that can slip past
    // many parsers and cause unexpected behaviour.
    return value.replace(/[\x00\u0000]/g, "");
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    const sanitised = Object.create(null); // No inherited prototype
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(key)) {
        // Log so security teams can detect probing attempts
        logger.warn("Prototype pollution attempt detected and blocked", {
          key,
        });
        continue;
      }
      const sanitisedValue = deepSanitize(value[key], depth + 1);
      if (sanitisedValue !== undefined) {
        sanitised[key] = sanitisedValue;
      }
    }
    // Re-attach to a plain object so downstream code can use normal object
    // methods (e.g. JSON.stringify).
    return Object.assign({}, sanitised);
  }

  return value;
}

/**
 * Sanitise `req.query` with HPP protection for known-scalar parameters.
 *
 * @param {Object} query – Express req.query object.
 * @returns {Object} Sanitised query object.
 */
function sanitizeQuery(query) {
  const result = {};
  for (const [key, value] of Object.entries(query)) {
    if (DANGEROUS_KEYS.has(key)) {
      logger.warn("Prototype pollution attempt in query string", { key });
      continue;
    }

    if (Array.isArray(value) && SCALAR_QUERY_PARAMS.has(key)) {
      // HPP: take the last value for parameters that should be scalar.
      result[key] = deepSanitize(value[value.length - 1]);
    } else {
      result[key] = deepSanitize(value);
    }
  }
  return result;
}

// ─── Middleware ────────────────────────────────────────────────────────────

/**
 * Express middleware — sanitises req.body, req.query, and req.params
 * in-place before any route handler runs.
 */
function sanitize(req, res, next) {
  try {
    if (req.query && Object.keys(req.query).length > 0) {
      req.query = sanitizeQuery(req.query);
    }

    if (req.body && typeof req.body === "object") {
      req.body = deepSanitize(req.body);
    }

    if (req.params && typeof req.params === "object") {
      req.params = deepSanitize(req.params);
    }

    next();
  } catch (err) {
    // Never block a request due to a sanitisation bug — log and continue.
    logger.error("Sanitization middleware error", { error: err.message });
    next();
  }
}

module.exports = sanitize;
