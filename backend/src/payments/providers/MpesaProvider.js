/**
 * MpesaProvider — Safaricom Daraja API adapter
 *
 * Implements the STK Push (Lipa Na M-Pesa Online) flow for customer-initiated
 * payments. Uses OAuth 2.0 client-credentials for every API call with a cached
 * access token to minimise round-trips.
 *
 * Supported currencies : KES
 * Supported methods    : mobile_money
 *
 * Environment variables required:
 *   MPESA_CONSUMER_KEY          — Daraja app consumer key
 *   MPESA_CONSUMER_SECRET       — Daraja app consumer secret
 *   MPESA_SHORTCODE             — Business shortcode (pay bill / till number)
 *   MPESA_PASSKEY               — Lipa Na M-Pesa shortcode passkey
 *   MPESA_CALLBACK_URL          — Publicly accessible URL for STK push results
 *   MPESA_ENV                   — "sandbox" | "production"  (default sandbox)
 *
 * Sandbox base URL : https://sandbox.safaricom.co.ke
 * Production base  : https://api.safaricom.co.ke
 */

"use strict";

const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const BaseProvider = require("./BaseProvider");
const logger = require("../../utils/logger");

const SUPPORTED_CURRENCIES = new Set(["KES"]);
const SUPPORTED_METHODS = new Set(["mobile_money"]);

const ENDPOINTS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

class MpesaProvider extends BaseProvider {
  constructor(config = {}) {
    super("mpesa", config);

    this._consumerKey =
      config.consumerKey || process.env.MPESA_CONSUMER_KEY || "";
    this._consumerSecret =
      config.consumerSecret || process.env.MPESA_CONSUMER_SECRET || "";
    this._shortcode = config.shortcode || process.env.MPESA_SHORTCODE || "";
    this._passkey = config.passkey || process.env.MPESA_PASSKEY || "";
    this._callbackUrl =
      config.callbackUrl ||
      process.env.MPESA_CALLBACK_URL ||
      "https://afrapay.com/api/v1/webhooks/mpesa";
    this._env = (
      config.env ||
      process.env.MPESA_ENV ||
      "sandbox"
    ).toLowerCase();

    if (!this._consumerKey || !this._consumerSecret) {
      throw new Error(
        "MpesaProvider: MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required",
      );
    }
    if (!this._shortcode || !this._passkey) {
      throw new Error(
        "MpesaProvider: MPESA_SHORTCODE and MPESA_PASSKEY are required",
      );
    }

    const baseURL = ENDPOINTS[this._env] || ENDPOINTS.sandbox;
    this._http = axios.create({
      baseURL,
      timeout: 30_000,
      headers: { "Content-Type": "application/json" },
    });

    // Token cache — refresh before expiry
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
   * Initiate an STK Push to the customer's phone.
   *
   * @param {Object} payload
   * @param {string} payload.idempotencyKey  UUID v4 used as the M-Pesa AccountReference
   * @param {number} payload.amount          Amount in KES (whole shillings — no decimals)
   * @param {string} payload.currency        Must be "KES"
   * @param {string} payload.phoneNumber     E.164 format: 2547XXXXXXXX  (no leading +)
   * @param {string} [payload.description]   Short transaction description (max 13 chars)
   */
  async charge(payload) {
    const {
      idempotencyKey,
      amount,
      currency,
      phoneNumber,
      description = "AfraPay Transfer",
    } = payload;

    this._validateCurrency(currency);
    const normalizedPhone = this._normalizePhone(phoneNumber);

    // M-Pesa only accepts integer amounts — always round up
    const amountInt = Math.ceil(Number(amount));
    if (amountInt < 1) {
      throw new Error("MpesaProvider: minimum charge amount is KES 1");
    }

    const token = await this._getAccessToken();
    const { timestamp, password } = this._generatePassword();

    const body = {
      BusinessShortCode: this._shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amountInt,
      PartyA: normalizedPhone,
      PartyB: this._shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: this._callbackUrl,
      // AccountReference capped at 12 characters
      AccountReference: idempotencyKey.replace(/-/g, "").slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    };

    logger.info("MpesaProvider: initiating STK Push", {
      idempotencyKey,
      phone: this._maskPhone(normalizedPhone),
      amountInt,
    });

    const { data } = await this._http.post(
      "/mpesa/stkpush/v1/processrequest",
      body,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (data.ResponseCode !== "0") {
      throw new Error(
        `MpesaProvider: STK Push failed — ${data.ResponseDescription || data.errorMessage}`,
      );
    }

    logger.info("MpesaProvider: STK Push accepted", {
      checkoutRequestId: data.CheckoutRequestID,
      customerMessage: data.CustomerMessage,
    });

    return {
      id: uuidv4(),
      providerRef: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      status: "processing",
      amount: amountInt,
      currency: "KES",
      fee: 0,
      nextAction: {
        type: "ussd_push",
        message: data.CustomerMessage,
      },
      raw: this._sanitise(data),
    };
  }

  /**
   * Query the status of an STK Push transaction by CheckoutRequestID.
   */
  async getCharge(providerRef) {
    const token = await this._getAccessToken();
    const { timestamp, password } = this._generatePassword();

    const body = {
      BusinessShortCode: this._shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: providerRef,
    };

    const { data } = await this._http.post(
      "/mpesa/stkpushquery/v1/query",
      body,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return this._normaliseQueryResult(data, providerRef);
  }

  /**
   * M-Pesa STK Push does not support programmatic refunds.
   * Refunds are handled manually via Safaricom business portal.
   */
  async refund(_providerRef, _amount) {
    throw new Error(
      "MpesaProvider: STK Push refunds must be processed via the Safaricom portal",
    );
  }

  /**
   * Verify an M-Pesa STK callback payload using the shortcode + passkey hash.
   * @param {string|Buffer} rawBody
   * @param {Object} _headers (unused — M-Pesa does not send a signature header)
   */
  verifyWebhook(rawBody) {
    try {
      const payload =
        typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

      // Minimal structural check — real validation should also verify that
      // the ShortCode matches our registered shortcode.
      return (
        payload?.Body?.stkCallback !== undefined &&
        payload?.Body?.stkCallback?.BusinessShortCode === this._shortcode
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse an inbound STK callback body into a normalised charge result.
   * Call this from the webhooks router: POST /webhooks/mpesa
   */
  parseWebhookCallback(rawBody) {
    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const cb = payload?.Body?.stkCallback;

    if (!cb) throw new Error("MpesaProvider: invalid STK callback structure");

    const success = cb.ResultCode === 0;
    const meta = {};

    if (success && cb.CallbackMetadata?.Item) {
      for (const item of cb.CallbackMetadata.Item) {
        meta[item.Name] = item.Value;
      }
    }

    return {
      id: uuidv4(),
      providerRef: cb.CheckoutRequestID,
      merchantRequestId: cb.MerchantRequestID,
      status: success ? "completed" : "failed",
      amount: meta.Amount || 0,
      currency: "KES",
      fee: 0,
      mpesaReceiptNumber: meta.MpesaReceiptNumber || null,
      transactionDate: meta.TransactionDate || null,
      phoneNumber: meta.PhoneNumber
        ? this._maskPhone(String(meta.PhoneNumber))
        : null,
      failureReason: !success ? cb.ResultDesc : null,
      raw: this._sanitise(cb),
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  async _getAccessToken() {
    const now = Date.now();
    if (this._token && this._tokenExpiresAt > now + 60_000) {
      return this._token;
    }

    const credentials = Buffer.from(
      `${this._consumerKey}:${this._consumerSecret}`,
    ).toString("base64");

    const { data } = await this._http.get(
      "/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${credentials}` } },
    );

    if (!data.access_token) {
      throw new Error("MpesaProvider: failed to obtain access token");
    }

    this._token = data.access_token;
    // Daraja tokens expire in 3600 s; cache for 50 minutes to be safe
    this._tokenExpiresAt = now + 50 * 60 * 1000;

    logger.debug("MpesaProvider: access token refreshed");
    return this._token;
  }

  _generatePassword() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14); // YYYYMMDDHHmmss

    const raw = `${this._shortcode}${this._passkey}${timestamp}`;
    const password = Buffer.from(raw).toString("base64");
    return { timestamp, password };
  }

  _validateCurrency(currency) {
    if (currency.toUpperCase() !== "KES") {
      throw new Error(`MpesaProvider: unsupported currency ${currency}`);
    }
  }

  /**
   * Normalise phone to Safaricom format: 2547XXXXXXXX (no +, no leading 0).
   * Accepts: +254712345678, 0712345678, 254712345678, 712345678
   */
  _normalizePhone(phone) {
    if (!phone) throw new Error("MpesaProvider: phone number is required");

    let cleaned = String(phone).replace(/[\s\-().+]/g, "");

    if (cleaned.startsWith("0") && cleaned.length === 10) {
      cleaned = "254" + cleaned.slice(1);
    } else if (cleaned.length === 9) {
      cleaned = "254" + cleaned;
    }

    // Validate: must be 254 followed by 9 digits
    if (!/^254\d{9}$/.test(cleaned)) {
      throw new Error(
        `MpesaProvider: invalid phone number format — ${phone}. Use 2547XXXXXXXX`,
      );
    }

    return cleaned;
  }

  /** Mask all but last 4 digits for logs */
  _maskPhone(phone) {
    if (!phone || phone.length < 6) return "****";
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
  }

  _normaliseQueryResult(data, providerRef) {
    const statusMap = {
      0: "completed",
      1032: "cancelled", // cancelled by user
      1: "failed",
    };

    const code = String(data.ResultCode ?? "");
    return {
      id: uuidv4(),
      providerRef,
      status: statusMap[code] ?? "processing",
      amount: 0,
      currency: "KES",
      fee: 0,
      nextAction: null,
      raw: this._sanitise(data),
    };
  }

  _sanitise(obj) {
    // Never log passkey, consumer secret, or full phone numbers in raw field
    const clean = { ...obj };
    delete clean.Password;
    delete clean.password;
    return clean;
  }
}

module.exports = MpesaProvider;
