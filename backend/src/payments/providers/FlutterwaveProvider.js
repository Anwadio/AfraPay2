/**
 * FlutterwaveProvider — Flutterwave payment adapter
 *
 * Supports: card, bank_transfer, mobile_money across 30+ African currencies.
 * Primary market: Pan-Africa.
 *
 * Environment variables required:
 *   FLUTTERWAVE_SECRET_KEY        — FLWSECK_TEST-… / FLWSECK-…
 *   FLUTTERWAVE_ENCRYPTION_KEY    — 3DES key from dashboard (for inline card charging)
 */

const BaseProvider = require("./BaseProvider");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");
const logger = require("../../utils/logger");

const SUPPORTED_CURRENCIES = new Set([
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "UGX",
  "TZS",
  "RWF",
  "ZMW",
  "MWK",
  "ETB",
  "EGP",
  "XOF",
  "XAF",
  "GNF",
  "SLL",
  "USD",
  "EUR",
  "GBP",
]);

const SUPPORTED_METHODS = new Set(["card", "bank_transfer", "mobile_money"]);

const BASE_URL = "https://api.flutterwave.com/v3";

class FlutterwaveProvider extends BaseProvider {
  constructor(config = {}) {
    super("flutterwave", config);

    this._secretKey = config.secretKey || process.env.FLUTTERWAVE_SECRET_KEY;
    if (!this._secretKey)
      throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");

    this._encryptionKey =
      config.encryptionKey || process.env.FLUTTERWAVE_ENCRYPTION_KEY || "";

    this._http = axios.create({
      baseURL: BASE_URL,
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${this._secretKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  supports(currency, method) {
    return (
      SUPPORTED_CURRENCIES.has(currency.toUpperCase()) &&
      SUPPORTED_METHODS.has(method)
    );
  }

  /**
   * Initiate a Flutterwave payment.
   * - For mobile_money / bank_transfer: uses Flutterwave hosted checkout.
   * - For card with a saved token: uses tokenised charge.
   */
  async charge(payload) {
    const {
      idempotencyKey,
      amount,
      currency,
      vaultToken, // Flutterwave token (from previous tokenised charge)
      email,
      phone,
      description,
      metadata = {},
      callbackUrl,
      method,
    } = payload;

    if (!email) throw new Error("FlutterwaveProvider: email is required");

    logger.info("FlutterwaveProvider: initiating charge", {
      idempotencyKey,
      currency,
      method,
    });

    // Tokenised card charge (returning customer)
    if (vaultToken && method === "card") {
      return this._chargeToken(
        vaultToken,
        email,
        amount,
        currency,
        metadata,
        idempotencyKey,
      );
    }

    // Hosted checkout for all other cases
    const body = {
      tx_ref: idempotencyKey,
      amount,
      currency: currency.toUpperCase(),
      redirect_url:
        callbackUrl ||
        process.env.FLUTTERWAVE_REDIRECT_URL ||
        "https://afrapay.com/payments/complete",
      customer: { email, phone_number: phone },
      customizations: {
        title: "AfraPay",
        description: description || "AfraPay payment",
      },
      meta: {
        ...metadata,
        afrapay_idempotency_key: idempotencyKey,
      },
      payment_options: this._methodToOption(method),
    };

    const { data } = await this._http.post("/payments", body);

    if (data.status !== "success") {
      throw new Error(
        `FlutterwaveProvider: initiation failed — ${data.message}`,
      );
    }

    return {
      id: uuidv4(),
      providerRef: idempotencyKey, // Flutterwave uses tx_ref as reference
      status: "requires_action",
      amount,
      currency: currency.toUpperCase(),
      fee: 0,
      nextAction: {
        type: "redirect",
        redirectUrl: data.data.link,
      },
      raw: this.sanitise(data.data),
    };
  }

  async getCharge(providerRef) {
    // Flutterwave: verify by tx_ref
    const { data } = await this._http.get(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerRef)}`,
    );

    if (data.status !== "success") {
      throw new Error(
        `FlutterwaveProvider: verification failed — ${data.message}`,
      );
    }

    return this._normaliseTx(data.data);
  }

  async refund(providerRef, amount) {
    // Need the numeric transaction ID first
    const { data: verifyData } = await this._http.get(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerRef)}`,
    );

    const txId = verifyData.data?.id;
    if (!txId)
      throw new Error(
        `FlutterwaveProvider: cannot find transaction ${providerRef}`,
      );

    const body = amount != null ? { amount } : {};
    const { data } = await this._http.post(
      `/transactions/${txId}/refund`,
      body,
    );

    if (data.status !== "success") {
      throw new Error(`FlutterwaveProvider: refund failed — ${data.message}`);
    }

    return {
      id: uuidv4(),
      providerRef: String(data.data.id),
      status: data.data.status === "completed" ? "completed" : "pending",
      amount: data.data.amount_refunded || amount,
    };
  }

  verifyWebhook(rawBody, headers) {
    const signature = headers["verif-hash"];
    const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    if (!expected) {
      logger.warn("FlutterwaveProvider: FLUTTERWAVE_WEBHOOK_SECRET not set");
      return false;
    }
    // Flutterwave uses a plain secret hash (not HMAC) — constant-time compare
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature || ""),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }

  normaliseWebhookEvent(body) {
    const eventMap = {
      "charge.completed": "payment.completed",
      "transfer.completed": "transfer.completed",
      "transfer.failed": "transfer.failed",
    };

    return {
      event: eventMap[body.event] || `flutterwave.${body.event}`,
      data: body.data
        ? this._normaliseTx(body.data)
        : { raw: this.sanitise(body) },
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  async _chargeToken(token, email, amount, currency, metadata, idempotencyKey) {
    const body = {
      token,
      email,
      currency: currency.toUpperCase(),
      amount,
      tx_ref: idempotencyKey,
      narration: metadata.description || "AfraPay tokenised charge",
    };

    const { data } = await this._http.post("/tokenized-charges", body);

    if (data.status !== "success") {
      throw new Error(
        `FlutterwaveProvider: token charge failed — ${data.message}`,
      );
    }

    return this._normaliseTx(data.data);
  }

  _normaliseTx(tx) {
    const STATUS_MAP = {
      successful: "completed",
      success: "completed",
      failed: "failed",
      pending: "pending",
      processing: "processing",
    };

    return {
      id: uuidv4(),
      providerRef: tx.tx_ref || String(tx.id),
      status: STATUS_MAP[(tx.status || "").toLowerCase()] || tx.status,
      amount: tx.charged_amount || tx.amount,
      currency: (tx.currency || "").toUpperCase(),
      fee: tx.app_fee || 0,
      nextAction: null,
      raw: this.sanitise(tx),
    };
  }

  _methodToOption(method) {
    const map = {
      card: "card",
      bank_transfer: "banktransfer",
      mobile_money:
        "mobilemoneyrwanda,mobilemoneyuganda,mpesa,mobilemoneyghana,mobilemoneyzambia,mobilemoneytanzania",
    };
    return map[method] || "card";
  }

  // ── Outbound transfers (Send Money) ─────────────────────────────────────────

  /**
   * Disburse funds to a bank account via Flutterwave Transfers API.
   *
   * Supports all currencies in SUPPORTED_CURRENCIES.
   * Reference: https://developer.flutterwave.com/docs/collecting-payments/transfers
   *
   * @param {Object} payload
   * @param {string} payload.idempotencyKey
   * @param {number} payload.amount           Human-readable amount
   * @param {string} payload.currency         ISO-4217
   * @param {string} payload.accountNumber    Bank account number
   * @param {string} payload.bankCode         Flutterwave bank code (e.g. "044" GTBank)
   * @param {string} payload.accountName      Beneficiary full name
   * @param {string} [payload.description]
   */
  async transfer({
    idempotencyKey,
    amount,
    currency,
    accountNumber,
    bankCode,
    accountName,
    description,
  }) {
    logger.info("FlutterwaveProvider: initiating transfer", {
      idempotencyKey,
      currency,
    });

    const { data } = await this._http.post("/transfers", {
      account_bank: bankCode,
      account_number: accountNumber,
      amount,
      narration: description || "AfraPay Transfer",
      currency: currency.toUpperCase(),
      reference: idempotencyKey,
      debit_currency: currency.toUpperCase(),
      beneficiary_name: accountName,
    });

    if (data.status !== "success") {
      throw new Error(`FlutterwaveProvider: transfer failed — ${data.message}`);
    }

    return this._normaliseTransfer(data.data, currency);
  }

  /**
   * Poll the status of a Flutterwave transfer by its numeric transfer ID.
   * The paymentService stores the numeric ID (as a string) as providerRef.
   */
  async getTransferStatus(providerRef) {
    const { data } = await this._http.get(
      `/transfers/${encodeURIComponent(providerRef)}`,
    );

    if (data.status !== "success") {
      throw new Error(
        `FlutterwaveProvider: transfer status fetch failed — ${data.message}`,
      );
    }

    return this._normaliseTransfer(data.data, data.data?.currency);
  }

  _normaliseTransfer(tx, currency) {
    const STATUS_MAP = {
      NEW: "processing",
      PENDING: "processing",
      SUCCESSFUL: "completed",
      FAILED: "failed",
    };

    return {
      id: uuidv4(),
      // Store numeric ID — required for polling via GET /transfers/:id
      providerRef: String(tx?.id ?? ""),
      transferRef: tx?.reference ?? "",
      status: STATUS_MAP[(tx?.status || "").toUpperCase()] || "processing",
      amount: tx?.amount,
      currency: (tx?.currency || currency || "").toUpperCase(),
      fee: tx?.fee || 0,
      nextAction: null,
      raw: this.sanitise(tx),
    };
  }
}

module.exports = FlutterwaveProvider;
