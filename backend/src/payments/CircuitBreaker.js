/**
 * CircuitBreaker
 *
 * Prevents cascading failures when a payment provider becomes unhealthy.
 *
 * States
 * ──────
 *   CLOSED    — Normal operation. Requests pass through.
 *   OPEN      — Provider is failing. Requests are rejected immediately (fast-fail).
 *   HALF_OPEN — Recovery probe period. One test request is allowed through.
 *               On success → CLOSED.  On failure → OPEN again.
 *
 * Configuration (per provider, with defaults)
 * ───────────────────────────────────────────
 *   failureThreshold   5    — Consecutive failures to trip from CLOSED → OPEN
 *   successThreshold   2    — Consecutive successes in HALF_OPEN to reset to CLOSED
 *   openDurationMs  30000   — How long the circuit stays OPEN before HALF_OPEN probe
 *
 * Usage
 * ─────
 *   const cb = new CircuitBreaker('stripe', { failureThreshold: 3 });
 *   const result = await cb.execute(() => stripeProvider.charge(payload));
 */

const logger = require("../utils/logger");

const STATE = Object.freeze({
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
});

class CircuitBreaker {
  constructor(providerName, options = {}) {
    this.name = providerName;

    this._failureThreshold = options.failureThreshold ?? 5;
    this._successThreshold = options.successThreshold ?? 2;
    this._openDurationMs = options.openDurationMs ?? 30_000;

    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._openedAt = null; // timestamp when circuit was opened
    this._halfOpenLock = false; // only one probe request at a time
  }

  get state() {
    return this._state;
  }

  get isAvailable() {
    this._checkRecovery();
    return this._state !== STATE.OPEN;
  }

  /**
   * Execute a function through the circuit breaker.
   * @template T
   * @param {() => Promise<T>} fn  The operation to execute.
   * @returns {Promise<T>}
   * @throws {CircuitOpenError}  When the circuit is OPEN.
   */
  async execute(fn) {
    this._checkRecovery();

    if (this._state === STATE.OPEN) {
      throw new CircuitOpenError(this.name, this._openedAt);
    }

    // In HALF_OPEN: only allow one probe; others fast-fail
    if (this._state === STATE.HALF_OPEN) {
      if (this._halfOpenLock) {
        throw new CircuitOpenError(this.name, this._openedAt, true);
      }
      this._halfOpenLock = true;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    } finally {
      if (this._state !== STATE.HALF_OPEN) {
        this._halfOpenLock = false;
      }
    }
  }

  /** Force-reset the circuit (e.g. after operator confirms provider is healthy). */
  reset() {
    this._transition(STATE.CLOSED);
    this._failureCount = 0;
    this._successCount = 0;
    this._halfOpenLock = false;
    logger.info(`CircuitBreaker [${this.name}]: manually reset to CLOSED`);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _checkRecovery() {
    if (this._state === STATE.OPEN && this._openedAt != null) {
      if (Date.now() - this._openedAt >= this._openDurationMs) {
        this._transition(STATE.HALF_OPEN);
        this._halfOpenLock = false;
      }
    }
  }

  _onSuccess() {
    this._failureCount = 0;
    if (this._state === STATE.HALF_OPEN) {
      this._successCount++;
      if (this._successCount >= this._successThreshold) {
        this._successCount = 0;
        this._halfOpenLock = false;
        this._transition(STATE.CLOSED);
      }
    }
  }

  _onFailure(err) {
    this._successCount = 0;
    if (this._state === STATE.HALF_OPEN) {
      // One failed probe → stay / reopen
      this._halfOpenLock = false;
      this._transition(STATE.OPEN);
      return;
    }
    this._failureCount++;
    logger.warn(
      `CircuitBreaker [${this.name}]: failure ${this._failureCount}/${this._failureThreshold}`,
      {
        error: err.message,
      },
    );
    if (this._failureCount >= this._failureThreshold) {
      this._transition(STATE.OPEN);
    }
  }

  _transition(newState) {
    const prev = this._state;
    this._state = newState;
    this._openedAt = newState === STATE.OPEN ? Date.now() : null;

    const level = newState === STATE.OPEN ? "error" : "info";
    logger[level](`CircuitBreaker [${this.name}]: ${prev} → ${newState}`, {
      failureCount: this._failureCount,
      successCount: this._successCount,
      openDurationMs: this._openDurationMs,
    });
  }
}

// ── Error classes ────────────────────────────────────────────────────────────

class CircuitOpenError extends Error {
  constructor(providerName, openedAt, isProbing = false) {
    const since = openedAt ? new Date(openedAt).toISOString() : "unknown";
    super(
      isProbing
        ? `CircuitBreaker [${providerName}]: recovery probe already in progress`
        : `CircuitBreaker [${providerName}]: circuit is OPEN since ${since} — provider unavailable`,
    );
    this.name = "CircuitOpenError";
    this.providerName = providerName;
    this.isOperational = true;
    this.statusCode = 503;
    this.code = "PROVIDER_UNAVAILABLE";
  }
}

module.exports = { CircuitBreaker, CircuitOpenError, STATE };
