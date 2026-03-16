/**
 * Token Blacklist Utility
 *
 * Tracks revoked JWT tokens until their natural expiry so that
 * logged-out (or force-revoked) tokens cannot be reused.
 *
 * Storage strategy:
 *   1. Redis (preferred) — distributed, survives restarts.
 *   2. In-memory Map (fallback) — single-process only; safe for dev.
 *
 * Key format: `blist:<jti>` when the token carries a `jti` claim,
 *             `blist:<last-40-chars-of-signature>` otherwise.
 */

const logger = require("./logger");

// ─── In-memory fallback ────────────────────────────────────────────────────
// Map<key, expiryUnixSec>
const memoryStore = new Map();

// Purge expired entries every 5 minutes so memory doesn't grow unbounded.
const _cleanup = setInterval(
  () => {
    const now = Math.floor(Date.now() / 1000);
    for (const [key, expiry] of memoryStore) {
      if (expiry <= now) memoryStore.delete(key);
    }
  },
  5 * 60 * 1000,
);
_cleanup.unref(); // Don't prevent clean process exit.

// ─── Redis helper ──────────────────────────────────────────────────────────
function _getRedisClient() {
  try {
    const { redis } = require("../database/connection");
    const client = redis.getClient();
    // ioredis exposes `.status`; only use a fully-ready connection.
    if (client && client.status === "ready") return client;
  } catch {
    // Redis not initialised or not enabled — fall through to memory store.
  }
  return null;
}

// ─── Key derivation ────────────────────────────────────────────────────────
/**
 * Produce a stable, short blacklist key for a given JWT.
 * Prefers the `jti` claim; falls back to the last 40 chars of the
 * signature segment (which is cryptographically unique per token).
 *
 * @param {Object} decoded  – Decoded JWT payload.
 * @param {string} rawToken – Raw JWT string (three dot-separated segments).
 * @returns {string}
 */
function _key(decoded, rawToken) {
  if (decoded && decoded.jti) return `blist:${decoded.jti}`;
  const sig = rawToken.split(".").pop().slice(-40);
  return `blist:${sig}`;
}

// ─── Public API ────────────────────────────────────────────────────────────
/**
 * Add a token to the blacklist for the remainder of its natural lifetime.
 *
 * @param {Object} decoded  – Decoded JWT payload (must contain `.exp`).
 * @param {string} rawToken – Raw JWT string.
 */
async function addToBlacklist(decoded, rawToken) {
  const key = _key(decoded, rawToken);
  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = Math.max(
    ((decoded && decoded.exp) || nowSec + 900) - nowSec,
    1,
  );

  const redisClient = _getRedisClient();
  if (redisClient) {
    try {
      await redisClient.set(key, "1", "EX", ttlSec);
      logger.debug("Token added to Redis blacklist", { key, ttlSec });
      return;
    } catch (err) {
      logger.warn(
        "Token blacklist Redis SET failed — falling back to memory store",
        {
          error: err.message,
        },
      );
    }
  }

  // Memory fallback
  memoryStore.set(key, nowSec + ttlSec);
  logger.debug("Token added to in-memory blacklist", { key, ttlSec });
}

/**
 * Check whether a token has been revoked.
 *
 * @param {Object} decoded  – Decoded JWT payload.
 * @param {string} rawToken – Raw JWT string.
 * @returns {Promise<boolean>} `true` if the token is blacklisted.
 */
async function isBlacklisted(decoded, rawToken) {
  const key = _key(decoded, rawToken);

  const redisClient = _getRedisClient();
  if (redisClient) {
    try {
      const result = await redisClient.get(key);
      return result !== null;
    } catch (err) {
      logger.warn(
        "Token blacklist Redis GET failed — falling back to memory store",
        {
          error: err.message,
        },
      );
    }
  }

  // Memory fallback
  const expiry = memoryStore.get(key);
  if (expiry === undefined) return false;
  const now = Math.floor(Date.now() / 1000);
  if (expiry <= now) {
    memoryStore.delete(key);
    return false;
  }
  return true;
}

module.exports = { addToBlacklist, isBlacklisted };
