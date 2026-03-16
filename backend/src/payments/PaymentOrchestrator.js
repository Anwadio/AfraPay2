/**
 * PaymentOrchestrator
 *
 * The single authoritative entry-point for all payment operations.
 *
 * Responsibilities
 * ────────────────
 * 1. Provider selection  — choose the best provider for a given currency/method
 *                          combination, respecting priority configuration.
 * 2. Circuit-breaker     — skip providers whose circuit is OPEN; fall back to
 *                          the next eligible provider automatically.
 * 3. Idempotency         — idempotency keys are enforced at the HTTP layer
 *                          (idempotency.js middleware) and forwarded here so
 *                          the provider can deduplicate too.
 * 4. Retry with back-off — transient failures (network, 5xx) are retried up to
 *                          MAX_RETRIES times with exponential back-off.
 * 5. Audit trail         — every attempt (success or failure) is written to the
 *                          Appwrite payment_audit collection.
 * 6. Token vault         — vault tokens are decrypted here and never logged.
 *
 * Provider registry
 * ─────────────────
 * Providers are loaded from `./providers/registry.js`.  To add a new provider:
 *   1. Implement a class extending BaseProvider.
 *   2. Add it to the registry with a priority.
 *
 * Configuration (environment)
 * ───────────────────────────
 *   PAYMENT_MAX_RETRIES        default 2
 *   PAYMENT_RETRY_BASE_MS      default 500   (doubles on each attempt)
 *   PAYMENT_PREFERRED_PROVIDER optional — force a single provider name
 */

"use strict";

const { Client, Databases, ID } = require("node-appwrite");
const { v4: uuidv4 } = require("uuid");
const config = require("../config/environment");
const logger = require("../utils/logger");
const { CircuitBreaker, CircuitOpenError } = require("./CircuitBreaker");
const { decrypt: vaultDecrypt } = require("./tokenVault");

// Provider classes
const StripeProvider = require("./providers/StripeProvider");
const PaystackProvider = require("./providers/PaystackProvider");
const FlutterwaveProvider = require("./providers/FlutterwaveProvider");

// ── Appwrite client (for audit log) ─────────────────────────────────────────
const _appwrite = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);
const _db = new Databases(_appwrite);

// ── Provider registry ────────────────────────────────────────────────────────
// Lower priority number = preferred.
// The orchestrator tries providers in ascending priority order.
function buildRegistry() {
  const entries = [];

  const add = (ProviderClass, envCheck, priority) => {
    try {
      const instance = new ProviderClass();
      entries.push({
        provider: instance,
        circuit: new CircuitBreaker(instance.name, {
          failureThreshold: parseInt(
            process.env.CB_FAILURE_THRESHOLD || "5",
            10,
          ),
          openDurationMs: parseInt(
            process.env.CB_OPEN_DURATION_MS || "30000",
            10,
          ),
        }),
        priority,
      });
      logger.info(
        `PaymentOrchestrator: registered provider [${instance.name}]`,
      );
    } catch (err) {
      // Provider is not configured — skip without crashing
      logger.warn(`PaymentOrchestrator: skipping provider — ${err.message}`);
    }
  };

  // Priority 1 → Paystack (best for African currencies)
  add(PaystackProvider, process.env.PAYSTACK_SECRET_KEY, 1);
  // Priority 2 → Flutterwave (broader African coverage)
  add(FlutterwaveProvider, process.env.FLUTTERWAVE_SECRET_KEY, 2);
  // Priority 3 → Stripe (global, card-focused)
  add(StripeProvider, process.env.STRIPE_SECRET_KEY, 3);

  entries.sort((a, b) => a.priority - b.priority);
  return entries;
}

let _registry = null;
function getRegistry() {
  if (!_registry) _registry = buildRegistry();
  return _registry;
}

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES = parseInt(process.env.PAYMENT_MAX_RETRIES || "2", 10);
const RETRY_BASE_MS = parseInt(process.env.PAYMENT_RETRY_BASE_MS || "500", 10);
const PREFERRED = process.env.PAYMENT_PREFERRED_PROVIDER || null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  // Retry on network errors or 5xx from providers; not on auth / validation failures
  if (err instanceof CircuitOpenError) return false;
  if (err.response?.status >= 400 && err.response?.status < 500) return false;
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") return true;
  if (err.response?.status >= 500) return true;
  return false;
}

// ── Orchestrator class ────────────────────────────────────────────────────────

class PaymentOrchestrator {
  /**
   * Select an eligible provider for the given currency + method and execute a charge.
   *
   * @param {Object} chargeRequest
   * @param {string} chargeRequest.idempotencyKey  UUID v4 from the HTTP layer
   * @param {number} chargeRequest.amount          Decimal amount (e.g. 12.50)
   * @param {string} chargeRequest.currency        ISO-4217 (e.g. 'NGN')
   * @param {string} chargeRequest.method          'card'|'bank_transfer'|'mobile_money'
   * @param {string} [chargeRequest.vaultToken]    Encrypted token from TokenVault
   * @param {string} [chargeRequest.email]         Payer email
   * @param {Object} [chargeRequest.metadata]      Pass-through to provider
   * @param {string} userId                        AfraPay user ID for audit log
   * @returns {Promise<ChargeResult>}
   */
  async charge(chargeRequest, userId) {
    const registry = getRegistry();
    const { idempotencyKey, currency, method } = chargeRequest;

    // Decrypt vault token here so provider adapters never handle it
    const decryptedToken = chargeRequest.vaultToken
      ? vaultDecrypt(chargeRequest.vaultToken)
      : undefined;

    const payload = { ...chargeRequest, vaultToken: decryptedToken };

    // Filter to providers that support this currency+method and have open circuits
    let candidates = registry.filter(
      ({ provider, circuit }) =>
        provider.supports(currency, method) && circuit.isAvailable,
    );

    if (PREFERRED) {
      const preferred = candidates.find(
        ({ provider }) => provider.name === PREFERRED,
      );
      if (preferred)
        candidates = [preferred, ...candidates.filter((c) => c !== preferred)];
    }

    if (candidates.length === 0) {
      throw Object.assign(
        new Error(
          "No payment providers are available for this currency/method",
        ),
        {
          code: "NO_PROVIDER_AVAILABLE",
          isOperational: true,
          statusCode: 503,
        },
      );
    }

    let lastError;

    for (const { provider, circuit } of candidates) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await sleep(RETRY_BASE_MS * 2 ** (attempt - 1)); // exponential back-off
          logger.info(
            `PaymentOrchestrator: retry ${attempt}/${MAX_RETRIES} on [${provider.name}]`,
            {
              idempotencyKey,
            },
          );
        }

        try {
          const result = await circuit.execute(() => provider.charge(payload));

          await this._writeAudit({
            idempotencyKey,
            userId,
            providerName: provider.name,
            providerRef: result.providerRef,
            status: result.status,
            amount: chargeRequest.amount,
            currency,
            attempt: attempt + 1,
            success: true,
          });

          logger.info("PaymentOrchestrator: charge succeeded", {
            provider: provider.name,
            idempotencyKey,
            status: result.status,
          });

          return { ...result, providerName: provider.name };
        } catch (err) {
          lastError = err;

          await this._writeAudit({
            idempotencyKey,
            userId,
            providerName: provider.name,
            status: "failed",
            amount: chargeRequest.amount,
            currency,
            attempt: attempt + 1,
            success: false,
            errorMessage: err.message,
          });

          if (err instanceof CircuitOpenError) break; // skip to next provider

          logger.warn("PaymentOrchestrator: charge attempt failed", {
            provider: provider.name,
            idempotencyKey,
            attempt: attempt + 1,
            error: err.message,
          });

          if (!isRetryable(err)) break; // non-transient → skip to next provider
        }
      }
    }

    logger.error("PaymentOrchestrator: all providers exhausted", {
      idempotencyKey,
      error: lastError?.message,
    });

    throw lastError || new Error("Payment failed — all providers exhausted");
  }

  /**
   * Get the current status of a charge from its original provider.
   *
   * @param {string} providerName  e.g. 'stripe'
   * @param {string} providerRef   Provider's transaction reference
   * @returns {Promise<ChargeResult>}
   */
  async getCharge(providerName, providerRef) {
    const entry = getRegistry().find(
      ({ provider }) => provider.name === providerName,
    );
    if (!entry) throw new Error(`Unknown provider: ${providerName}`);
    return entry.circuit.execute(() => entry.provider.getCharge(providerRef));
  }

  /**
   * Request a refund through the original provider.
   *
   * @param {string} providerName
   * @param {string} providerRef
   * @param {number} [amount]  Omit for full refund
   * @returns {Promise<RefundResult>}
   */
  async refund(providerName, providerRef, amount) {
    const entry = getRegistry().find(
      ({ provider }) => provider.name === providerName,
    );
    if (!entry) throw new Error(`Unknown provider: ${providerName}`);
    return entry.circuit.execute(() =>
      entry.provider.refund(providerRef, amount),
    );
  }

  /**
   * Verify and normalise a webhook from any known provider.
   * Determines the provider from the `x-provider` custom header or auto-detects.
   *
   * @param {string}  providerHint  Header value suggesting provider (optional)
   * @param {Buffer}  rawBody
   * @param {Object}  headers
   * @param {Object}  parsedBody
   * @returns {{ event: string, data: Object, providerName: string }|null}
   */
  handleWebhook(providerHint, rawBody, headers, parsedBody) {
    const registry = getRegistry();

    // Try the hinted provider first, then fall back to all providers
    const ordered = providerHint
      ? [
          ...registry.filter(({ provider }) => provider.name === providerHint),
          ...registry.filter(({ provider }) => provider.name !== providerHint),
        ]
      : registry;

    for (const { provider } of ordered) {
      if (provider.verifyWebhook(rawBody, headers)) {
        const normalised = provider.normaliseWebhookEvent(parsedBody);
        logger.info("PaymentOrchestrator: webhook verified", {
          provider: provider.name,
          event: normalised.event,
        });
        return { ...normalised, providerName: provider.name };
      }
    }

    logger.warn(
      "PaymentOrchestrator: webhook failed signature verification for all providers",
    );
    return null;
  }

  /**
   * Return health / circuit-breaker state for each registered provider.
   * Useful for the /health endpoint and admin dashboard.
   */
  getProviderHealth() {
    return getRegistry().map(({ provider, circuit }) => ({
      name: provider.name,
      circuit: circuit.state,
      available: circuit.isAvailable,
    }));
  }

  /**
   * Manually reset the circuit breaker for a provider (operator use only).
   * @param {string} providerName
   */
  resetCircuit(providerName) {
    const entry = getRegistry().find(
      ({ provider }) => provider.name === providerName,
    );
    if (!entry) throw new Error(`Unknown provider: ${providerName}`);
    entry.circuit.reset();
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async _writeAudit(data) {
    const collectionId = config.database.appwrite.paymentsCollectionId || null;
    if (!collectionId) return; // audit collection not yet configured — skip silently

    try {
      await _db.createDocument(
        config.database.appwrite.databaseId,
        config.database.appwrite.paymentsCollectionId,
        ID.unique(),
        {
          idempotencyKey: data.idempotencyKey,
          userId: data.userId,
          providerName: data.providerName,
          providerRef: data.providerRef || null,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          attempt: data.attempt,
          success: data.success,
          errorMessage: data.errorMessage || null,
          recordedAt: new Date().toISOString(),
        },
      );
    } catch (err) {
      // Audit failures must never abort a payment
      logger.error("PaymentOrchestrator: failed to write audit entry", {
        error: err.message,
      });
    }
  }
}

// Export a singleton so every module shares the same circuit-breaker state
module.exports = new PaymentOrchestrator();
