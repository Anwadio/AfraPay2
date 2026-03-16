/**
 * StripeProvider — Stripe payment adapter
 *
 * Supports: card charges, refunds, webhook verification.
 * Currencies: all Stripe-supported currencies (primarily USD/EUR/GBP).
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY       — sk_live_… / sk_test_…
 *   STRIPE_WEBHOOK_SECRET   — whsec_…  (from Stripe Dashboard)
 */

const BaseProvider = require("./BaseProvider");
const { v4: uuidv4 } = require("uuid");
const logger = require("../../utils/logger");

// Stripe-supported currencies (subset most relevant to AfraPay)
const SUPPORTED_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
  "MXN",
  "BRL",
  "SGD",
  "HKD",
  "JPY",
  "NZD",
  "INR",
  "ZAR",
  "MYR",
  "THB",
  "IDR",
  "PHP",
]);

const SUPPORTED_METHODS = new Set(["card"]);

class StripeProvider extends BaseProvider {
  constructor(config = {}) {
    super("stripe", config);

    const secretKey = config.secretKey || process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    // Lazy-require stripe so the module can be imported without crashing when
    // the stripe package is absent (e.g. running tests for other providers).
    // eslint-disable-next-line global-require
    this._stripe = require("stripe")(secretKey, {
      apiVersion: "2023-10-16",
      maxNetworkRetries: 2,
      timeout: 30_000,
    });

    this._webhookSecret =
      config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "";
  }

  supports(currency, method) {
    return (
      SUPPORTED_CURRENCIES.has(currency.toUpperCase()) &&
      SUPPORTED_METHODS.has(method)
    );
  }

  /**
   * Create a Stripe PaymentIntent (or confirm one with a payment method).
   */
  async charge(payload) {
    const {
      idempotencyKey,
      amount,
      currency,
      vaultToken, // Stripe PaymentMethod ID or saved PM token
      email,
      description,
      metadata = {},
    } = payload;

    const amountSmallest = this.toSmallestUnit(amount, currency);

    logger.info("StripeProvider: initiating charge", {
      idempotencyKey,
      currency,
      amountSmallest,
    });

    const intentParams = {
      amount: amountSmallest,
      currency: currency.toLowerCase(),
      payment_method: vaultToken,
      confirm: !!vaultToken,
      confirmation_method: "automatic",
      return_url:
        process.env.STRIPE_RETURN_URL ||
        "https://afrapayafrica.com/payments/complete",
      description: description || "AfraPay charge",
      receipt_email: email || undefined,
      metadata: {
        ...metadata,
        afrapay_idempotency_key: idempotencyKey,
      },
    };

    const intent = await this._stripe.paymentIntents.create(intentParams, {
      idempotencyKey,
    });

    return this._normaliseIntent(intent);
  }

  async getCharge(providerRef) {
    const intent = await this._stripe.paymentIntents.retrieve(providerRef);
    return this._normaliseIntent(intent);
  }

  async refund(providerRef, amount) {
    // Retrieve the intent to find the latest charge ID
    const intent = await this._stripe.paymentIntents.retrieve(providerRef);
    const chargeId = intent.latest_charge;

    if (!chargeId) {
      throw new Error(
        `StripeProvider: no charge found on intent ${providerRef}`,
      );
    }

    const params = { charge: chargeId };
    if (amount != null) {
      params.amount = this.toSmallestUnit(
        amount,
        intent.currency.toUpperCase(),
      );
    }

    const refundObj = await this._stripe.refunds.create(params);

    return {
      id: uuidv4(),
      providerRef: refundObj.id,
      status: refundObj.status === "succeeded" ? "completed" : refundObj.status,
      amount:
        refundObj.amount /
        (this.toSmallestUnit(1, intent.currency.toUpperCase()) || 100),
    };
  }

  verifyWebhook(rawBody, headers) {
    if (!this._webhookSecret) {
      logger.warn(
        "StripeProvider: STRIPE_WEBHOOK_SECRET not set — skipping signature check",
      );
      return false;
    }
    try {
      this._stripe.webhooks.constructEvent(
        rawBody,
        headers["stripe-signature"],
        this._webhookSecret,
      );
      return true;
    } catch (err) {
      logger.warn("StripeProvider: webhook signature mismatch", {
        error: err.message,
      });
      return false;
    }
  }

  normaliseWebhookEvent(body) {
    const intent = body.data?.object;
    const event = body.type;

    const eventMap = {
      "payment_intent.succeeded": "payment.completed",
      "payment_intent.payment_failed": "payment.failed",
      "payment_intent.requires_action": "payment.requires_action",
      "charge.refunded": "refund.completed",
      "charge.dispute.created": "dispute.created",
    };

    return {
      event: eventMap[event] || `stripe.${event}`,
      data: intent
        ? this._normaliseIntent(intent)
        : { raw: this.sanitise(body) },
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  _normaliseIntent(intent) {
    const STATUS_MAP = {
      requires_payment_method: "requires_action",
      requires_confirmation: "requires_action",
      requires_action: "requires_action",
      processing: "processing",
      requires_capture: "processing",
      canceled: "failed",
      succeeded: "completed",
    };

    const nextAction = intent.next_action
      ? {
          type: intent.next_action.type,
          redirectUrl: intent.next_action.redirect_to_url?.url || null,
        }
      : null;

    return {
      id: uuidv4(),
      providerRef: intent.id,
      status: STATUS_MAP[intent.status] || intent.status,
      amount: intent.amount, // already in smallest unit from Stripe
      currency: intent.currency.toUpperCase(),
      fee: 0, // resolved via Stripe balance transaction
      nextAction,
      raw: this.sanitise(intent),
    };
  }

  // ── Outbound transfers (Send Money) ─────────────────────────────────────────

  /**
   * Transfer funds to a Stripe Connect connected account (Send Money).
   *
   * Requires Stripe Connect — the destination must be an `acct_…` connected
   * account ID. The transfer moves funds from the platform's Stripe balance
   * to the connected account; the connected account can then pay out to their
   * own bank.
   *
   * @param {Object} payload
   * @param {string} payload.idempotencyKey
   * @param {number} payload.amount           Human-readable amount
   * @param {string} payload.currency         ISO-4217 (USD, EUR, GBP…)
   * @param {string} payload.accountNumber    Stripe connected account ID (acct_…)
   * @param {string} [payload.description]
   */
  async transfer({
    idempotencyKey,
    amount,
    currency,
    accountNumber,
    description,
  }) {
    logger.info("StripeProvider: initiating connected-account transfer", {
      idempotencyKey,
      currency,
    });

    const amountSmallest = this.toSmallestUnit(amount, currency);

    const transfer = await this._stripe.transfers.create(
      {
        amount: amountSmallest,
        currency: currency.toLowerCase(),
        destination: accountNumber, // Stripe connected account ID (acct_…)
        description: description || "AfraPay Transfer",
        metadata: { afrapay_idempotency_key: idempotencyKey },
        transfer_group: idempotencyKey,
      },
      { idempotencyKey },
    );

    return {
      id: uuidv4(),
      providerRef: transfer.id,
      // Stripe Connect transfers are synchronous — funds land immediately
      status: transfer.reversed ? "failed" : "completed",
      amount: transfer.amount,
      currency: transfer.currency.toUpperCase(),
      fee: 0,
      nextAction: null,
      raw: this.sanitise(transfer),
    };
  }

  /**
   * Retrieve the current state of a Stripe Connect transfer.
   */
  async getTransferStatus(providerRef) {
    const transfer = await this._stripe.transfers.retrieve(providerRef);

    return {
      id: uuidv4(),
      providerRef: transfer.id,
      status: transfer.reversed ? "failed" : "completed",
      amount: transfer.amount,
      currency: transfer.currency.toUpperCase(),
      fee: 0,
      nextAction: null,
      raw: this.sanitise(transfer),
    };
  }
}

module.exports = StripeProvider;
