/**
 * Idempotency Middleware
 *
 * Enforces exactly-once semantics on mutating payment endpoints.
 *
 * How it works
 * ──────────────
 * 1. Client MUST send `Idempotency-Key: <uuid-v4>` on every POST/PATCH request
 *    that creates or modifies money movement.
 * 2. On first receipt the middleware stores a "pending" marker in the cache so
 *    concurrent duplicate requests receive a 409 Conflict instead of being
 *    processed twice.
 * 3. Once the handler completes, the full HTTP response (status + body) is
 *    cached for IDEMPOTENCY_TTL seconds.
 * 4. On subsequent requests with the same key the cached response is replayed
 *    verbatim — no business logic is re-executed.
 *
 * Storage back-ends
 * ─────────────────
 * • Redis   – preferred; set REDIS_ENABLED=true in environment.
 * • In-memory Map – fallback for development / single-process deployments.
 *   (NOT suitable for multi-instance production; enable Redis there.)
 *
 * Security notes
 * ──────────────
 * • Keys must be UUID v4 to prevent enumeration / guessing attacks.
 * • Keys are scoped per user (`userId:key`) so user A cannot replay user B's
 *   transactions.
 * • TTL defaults to 24 h; configurable via PAYMENT_IDEMPOTENCY_TTL (seconds).
 */

const {
  v4: uuidv4,
  validate: uuidValidate,
  version: uuidVersion,
} = require("uuid");
const logger = require("../../utils/logger");
const { ValidationError, APIError } = require("../monitoring/errorHandler");

// ── In-memory fallback store ─────────────────────────────────────────────────
// Each entry: { status: 'pending'|'complete', response, expiresAt }
const memStore = new Map();

// Periodically purge expired in-memory entries (every 5 min)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of memStore) {
      if (entry.expiresAt <= now) memStore.delete(key);
    }
  },
  5 * 60 * 1000,
).unref();

// ── Redis helpers ────────────────────────────────────────────────────────────
let redisClient = null;

/**
 * Lazy-initialise the shared Redis client when Redis is enabled.
 * We import lazily to avoid crashing the process when Redis is not configured.
 */
function getRedis() {
  if (redisClient) return redisClient;
  try {
    const { createClient } = require("../../database/connection");
    redisClient = createClient ? createClient() : null;
  } catch {
    redisClient = null;
  }
  return redisClient;
}

// ── TTL ──────────────────────────────────────────────────────────────────────
const TTL_SECONDS = parseInt(
  process.env.PAYMENT_IDEMPOTENCY_TTL || "86400",
  10,
);
const TTL_MS = TTL_SECONDS * 1000;

// ── Cache primitives ─────────────────────────────────────────────────────────
async function cacheGet(key) {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(`idm:${key}`);
    return raw ? JSON.parse(raw) : null;
  }
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memStore.delete(key);
    return null;
  }
  return entry;
}

async function cacheSet(key, value) {
  const redis = getRedis();
  if (redis) {
    await redis.set(`idm:${key}`, JSON.stringify(value), { EX: TTL_SECONDS });
    return;
  }
  memStore.set(key, { ...value, expiresAt: Date.now() + TTL_MS });
}

async function cacheSetNX(key, value) {
  const redis = getRedis();
  if (redis) {
    const result = await redis.set(`idm:${key}`, JSON.stringify(value), {
      EX: TTL_SECONDS,
      NX: true,
    });
    return result === "OK"; // true  = we won the lock
  }
  if (memStore.has(key)) {
    const e = memStore.get(key);
    if (e.expiresAt > Date.now()) return false; // key still valid, another request owns it
    memStore.delete(key);
  }
  memStore.set(key, { ...value, expiresAt: Date.now() + TTL_MS });
  return true;
}

// ── Validator ────────────────────────────────────────────────────────────────
function isValidUUIDv4(str) {
  return typeof str === "string" && uuidValidate(str) && uuidVersion(str) === 4;
}

// ── Middleware factory ───────────────────────────────────────────────────────

/**
 * Returns an Express middleware that enforces idempotency.
 *
 * @param {Object} [options]
 * @param {boolean} [options.required=true]  If false, idempotency is optional
 *                                            (key is still honoured when present).
 */
function idempotency(options = {}) {
  const { required = true } = options;

  return async function idempotencyMiddleware(req, res, next) {
    // Only applies to state-changing methods
    if (!["POST", "PATCH", "PUT"].includes(req.method)) return next();

    const rawKey = req.headers["idempotency-key"];

    if (!rawKey) {
      if (required) {
        return next(
          new ValidationError(
            "Idempotency-Key header is required for this request. " +
              "Supply a UUID v4 that is unique per intended operation.",
          ),
        );
      }
      return next();
    }

    // Validate key format — reject non-UUID strings to prevent cache poisoning
    if (!isValidUUIDv4(rawKey)) {
      return next(
        new ValidationError(
          "Idempotency-Key must be a valid UUID v4 (e.g. " + uuidv4() + ")",
        ),
      );
    }

    // Scope key to the authenticated user to prevent cross-user replay
    const userId = req.user?.id || req.user?.$id || "anon";
    const scopedKey = `${userId}:${rawKey}`;

    try {
      // ── Check for a previously completed response ──────────────────────────
      const existing = await cacheGet(scopedKey);

      if (existing) {
        if (existing.status === "pending") {
          // A concurrent request is still processing
          return res.status(409).json({
            success: false,
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message:
                "A request with this Idempotency-Key is currently being processed. " +
                "Please wait before retrying.",
            },
            idempotencyKey: rawKey,
          });
        }

        // Replay the cached response
        logger.info("Idempotency cache hit — replaying response", {
          userId,
          idempotencyKey: rawKey,
          cachedStatus: existing.statusCode,
        });

        res.set("Idempotency-Replayed", "true");
        res.set("Idempotency-Key", rawKey);
        return res.status(existing.statusCode).json(existing.body);
      }

      // ── First request — claim the key atomically ──────────────────────────
      const claimed = await cacheSetNX(scopedKey, { status: "pending" });
      if (!claimed) {
        // Lost the race with a concurrent request
        return res.status(409).json({
          success: false,
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message:
              "A request with this Idempotency-Key is currently being processed.",
          },
          idempotencyKey: rawKey,
        });
      }

      // ── Intercept the response so we can cache it ─────────────────────────
      const originalJson = res.json.bind(res);
      res.json = function idempotencyCapture(body) {
        // Only cache successful or client-error responses.
        // 5xx errors are NOT cached — they may be transient.
        const statusCode = res.statusCode;
        if (statusCode < 500) {
          cacheSet(scopedKey, { status: "complete", statusCode, body }).catch(
            (err) => {
              logger.error("Failed to persist idempotency cache entry", {
                error: err.message,
                scopedKey,
              });
            },
          );
        } else {
          // Release the pending lock so the client can retry
          cacheSet(scopedKey, null).catch(() => {});
        }
        res.set("Idempotency-Key", rawKey);
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.error("Idempotency middleware error", { error: err.message });
      // Don't block the request on cache failures — degrade gracefully
      next();
    }
  };
}

module.exports = { idempotency };
