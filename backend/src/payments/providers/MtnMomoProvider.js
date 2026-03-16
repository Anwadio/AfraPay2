/**
 * MtnMomoProvider — MTN Mobile Money (MoMo) Collections API adapter
 *
 * Implements the Collections API to request a payment from a subscriber.
 * Uses the MTN MoMo API v1 (https://momodeveloper.mtn.com).
 *
 * Supported currencies : GHS, UGX, ZMW, RWF, XOF, XAF, NGN (sandbox accepts any)
 * Supported methods    : mobile_money
 *
 * Environment variables required:
 *   MTN_MOMO_SUBSCRIPTION_KEY    — Ocp-Apim-Subscription-Key from developer portal
 *   MTN_MOMO_API_USER_ID         — UUID provisioned once per environment
 *   MTN_MOMO_API_KEY             — API key provisioned once per environment
 *   MTN_MOMO_CALLBACK_URL        — Publicly accessible delivery notification URL
 *   MTN_MOMO_TARGET_ENV          — "sandbox" | "mtnghana" | "mtnuganda" | …
 *   MTN_MOMO_CURRENCY            — Default payout currency (e.g. GHS)
 *
 * Sandbox base URL : https://sandbox.momodeveloper.mtn.com
 * Production base  : https://proxy.momoapi.mtn.com
 *
 * Key provisioning
 * ─────────────────
 * In production, MTN issues the API User ID and API Key directly.
 * In sandbox the developer provisions them via the /v1_0/apiuser endpoint.
 * These values are stable per environment — they do NOT rotate per request.
 * Store them once in env vars (or a secrets manager); never generate them
 * at runtime in production.
 */

"use strict";

const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const BaseProvider = require("./BaseProvider");
const logger = require("../../utils/logger");

const SUPPORTED_CURRENCIES = new Set([
  "GHS",
  "UGX",
  "ZMW",
  "RWF",
  "XOF",
  "XAF",
  "NGN",
  "EUR", // sandbox uses EUR
]);
const SUPPORTED_METHODS = new Set(["mobile_money"]);

const BASE_URLS = {
  sandbox: "https://sandbox.momodeveloper.mtn.com",
  production: "https://proxy.momoapi.mtn.com",
};

/** Milliseconds to wait between status-poll retries */
const POLL_INTERVAL_MS = 3_000;
/** Maximum times to poll before giving up (async status check) */
const POLL_MAX_ATTEMPTS = 5;

class MtnMomoProvider extends BaseProvider {
  constructor(config = {}) {
    super("mtn_momo", config);

    this._subscriptionKey =
      config.subscriptionKey || process.env.MTN_MOMO_SUBSCRIPTION_KEY || "";
    this._apiUserId =
      config.apiUserId || process.env.MTN_MOMO_API_USER_ID || "";
    this._apiKey = config.apiKey || process.env.MTN_MOMO_API_KEY || "";
    this._callbackUrl =
      config.callbackUrl ||
      process.env.MTN_MOMO_CALLBACK_URL ||
      "https://afrapay.com/api/v1/webhooks/mtn";
    this._targetEnv = (
      config.targetEnv ||
      process.env.MTN_MOMO_TARGET_ENV ||
      "sandbox"
    ).toLowerCase();
    this._currency = config.currency || process.env.MTN_MOMO_CURRENCY || "EUR";

    if (!this._subscriptionKey) {
      throw new Error("MtnMomoProvider: MTN_MOMO_SUBSCRIPTION_KEY is required");
    }
    if (!this._apiUserId || !this._apiKey) {
      throw new Error(
        "MtnMomoProvider: MTN_MOMO_API_USER_ID and MTN_MOMO_API_KEY are required",
      );
    }

    const baseURL = BASE_URLS[this._targetEnv] || BASE_URLS.sandbox;

    this._http = axios.create({
      baseURL,
      timeout: 30_000,
    });

    // Basic-auth bearer token cache
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  supports(currency, method) {
    return (
      SUPPORTED_CURRENCIES.has(currency.toUpperCase()) &&
      SUPPORTED_METHODS.has(method)
    );
  }

  /**
   * Request a payment from a subscriber via USSD push.
   *
   * @param {Object} payload
   * @param {string} payload.idempotencyKey  UUID v4  — used as the X-Reference-Id header
   * @param {number} payload.amount          Amount in the target currency
   * @param {string} payload.currency        ISO-4217 — must match MTN_MOMO_CURRENCY
   * @param {string} payload.phoneNumber     MSISDN in international format (no +)
   * @param {string} [payload.description]   Short payer note (max 50 chars)
   * @param {string} [payload.payerMessage]  Message shown on subscriber's phone
   */
  async charge(payload) {
    const {
      idempotencyKey,
      amount,
      currency,
      phoneNumber,
      description = "AfraPay Transfer",
      payerMessage,
    } = payload;

    const effectiveCurrency = currency || this._currency;
    const normalizedPhone = this._normalizePhone(phoneNumber);

    const token = await this._getAccessToken();

    const referenceId = idempotencyKey; // must be UUID v4
    const body = {
      amount: String(Math.ceil(Number(amount))),
      currency: effectiveCurrency.toUpperCase(),
      externalId: referenceId,
      payer: {
        partyIdType: "MSISDN",
        partyId: normalizedPhone,
      },
      payerMessage: (payerMessage || description).slice(0, 50),
      payeeNote: description.slice(0, 50),
    };

    logger.info("MtnMomoProvider: requesting collection", {
      referenceId,
      phone: this._maskPhone(normalizedPhone),
      amount: body.amount,
      currency: effectiveCurrency,
    });

    const response = await this._http.post(
      "/collection/v1_0/requesttopay",
      body,
      {
        headers: this._buildHeaders(token, referenceId),
      },
    );

    // 202 Accepted = request queued; 4xx = immediate failure
    if (response.status !== 202) {
      throw new Error(
        `MtnMomoProvider: unexpected HTTP ${response.status} from requesttopay`,
      );
    }

    logger.info("MtnMomoProvider: collection request accepted", {
      referenceId,
    });

    return {
      id: uuidv4(),
      providerRef: referenceId,
      status: "processing",
      amount: Number(body.amount),
      currency: effectiveCurrency.toUpperCase(),
      fee: 0,
      nextAction: {
        type: "ussd_push",
        message:
          "A payment request has been sent to your phone. Please approve it.",
      },
      raw: { referenceId },
    };
  }

  /**
   * Verify the current status of a requesttopay transaction.
   */
  async getCharge(providerRef) {
    const token = await this._getAccessToken();

    const { data } = await this._http.get(
      `/collection/v1_0/requesttopay/${encodeURIComponent(providerRef)}`,
      { headers: this._buildHeaders(token) },
    );

    return this._normaliseStatus(data, providerRef);
  }

  /**
   * Polling helper — poll until terminal status or max attempts reached.
   * Returns the final charge result.
   */
  async pollUntilTerminal(providerRef) {
    for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
      const result = await this.getCharge(providerRef);
      if (result.status !== "processing") return result;
      if (attempt < POLL_MAX_ATTEMPTS) {
        await this._sleep(POLL_INTERVAL_MS * attempt); // linear back-off
      }
    }
    // Return last known state — caller should treat "processing" as still pending
    return this.getCharge(providerRef);
  }

  /**
   * MTN MoMo refunds use the Disbursement/Remittance APIs, which require
   * separate credentials. Not supported in this adapter — raise a support ticket.
   */
  async refund(_providerRef, _amount) {
    throw new Error(
      "MtnMomoProvider: refunds require the Disbursement API — contact AfraPay support",
    );
  }

  /**
   * Verify an inbound webhook notification.
   * MTN MoMo sandbox does not send a request signature; production verifications
   * should compare the X-Callback-Url header and check TLS client certificates.
   */
  verifyWebhook(rawBody) {
    try {
      const payload =
        typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      return (
        typeof payload?.financialTransactionId === "string" ||
        typeof payload?.referenceId === "string"
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse an inbound MoMo callback / webhook body into a normalised result.
   */
  parseWebhookCallback(rawBody) {
    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    return this._normaliseStatus(payload, payload?.externalId || "");
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Obtain a Basic-auth bearer token (expires in 3600 s, cached 50 min). */
  async _getAccessToken() {
    const now = Date.now();
    if (this._token && this._tokenExpiresAt > now + 60_000) {
      return this._token;
    }

    const credentials = Buffer.from(
      `${this._apiUserId}:${this._apiKey}`,
    ).toString("base64");

    const { data } = await this._http.post(
      "/collection/token/",
      {},
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Ocp-Apim-Subscription-Key": this._subscriptionKey,
        },
      },
    );

    if (!data.access_token) {
      throw new Error("MtnMomoProvider: failed to obtain access token");
    }

    this._token = data.access_token;
    this._tokenExpiresAt = now + 50 * 60 * 1000;
    logger.debug("MtnMomoProvider: access token refreshed");

    return this._token;
  }

  _buildHeaders(token, referenceId) {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": this._subscriptionKey,
      "X-Target-Environment": this._targetEnv,
      "Content-Type": "application/json",
    };
    if (referenceId) {
      headers["X-Reference-Id"] = referenceId;
    }
    if (this._callbackUrl) {
      headers["X-Callback-Url"] = this._callbackUrl;
    }
    return headers;
  }

  /**
   * Normalise phone to pure-digit international format (no + or spaces).
   * Accepts: +233201234567, 0201234567 (GH), 233201234567
   */
  _normalizePhone(phone) {
    if (!phone) throw new Error("MtnMomoProvider: phone number is required");

    let cleaned = String(phone).replace(/[\s\-().+]/g, "");

    // Ghana : 0XX → 233XX
    if (cleaned.startsWith("0") && cleaned.length === 10) {
      cleaned = "233" + cleaned.slice(1);
    }

    if (!/^\d{10,15}$/.test(cleaned)) {
      throw new Error(
        `MtnMomoProvider: invalid phone number — ${phone}. Use international format without +`,
      );
    }

    return cleaned;
  }

  _maskPhone(phone) {
    if (!phone || phone.length < 6) return "****";
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
  }

  _normaliseStatus(data, providerRef) {
    const mtnStatus = (data?.status || "").toUpperCase();

    const statusMap = {
      SUCCESSFUL: "completed",
      FAILED: "failed",
      PENDING: "processing",
      REJECTED: "failed",
      TIMEOUT: "failed",
    };

    return {
      id: uuidv4(),
      providerRef,
      financialTransactionId: data?.financialTransactionId || null,
      status: statusMap[mtnStatus] ?? "processing",
      amount: Number(data?.amount || 0),
      currency: (data?.currency || this._currency).toUpperCase(),
      fee: 0,
      nextAction: null,
      failureReason:
        statusMap[mtnStatus] === "failed"
          ? data?.reason || "Transaction failed"
          : null,
      raw: this._sanitise(data || {}),
    };
  }

  _sanitise(obj) {
    const clean = { ...obj };
    // Never persist API key material in raw log fields
    delete clean.apiKey;
    return clean;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = MtnMomoProvider;
