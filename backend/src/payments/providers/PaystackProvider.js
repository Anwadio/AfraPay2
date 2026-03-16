/**
 * PaystackProvider — Paystack payment adapter
 *
 * Supports: card, bank_transfer (NGN, GHS, ZAR, KES, EGP, RWF, XOF, EGP).
 * Primary market: West & East Africa.
 *
 * Environment variables required:
 *   PAYSTACK_SECRET_KEY   — sk_live_… / sk_test_…
 */

const BaseProvider = require("./BaseProvider");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const axios = require("axios");
const logger = require("../../utils/logger");

const SUPPORTED_CURRENCIES = new Set([
  "NGN",
  "GHS",
  "ZAR",
  "KES",
  "USD",
  "EGP",
  "RWF",
  "XOF",
]);
const SUPPORTED_METHODS = new Set(["card", "bank_transfer", "mobile_money"]);

/**
 * Maps ISO-4217 currency to the Paystack transfer-recipient type.
 * https://paystack.com/docs/transfers/single-transfers/
 */
const PAYSTACK_RECIPIENT_TYPE = {
  NGN: "nuban", // Nigerian Uniform Bank Account Number
  GHS: "ghipss", // Ghana Interbank Payment & Settlement System
  ZAR: "basa", // Bankers Association of South Africa
  KES: "nuban",
  EGP: "nuban",
  RWF: "nuban",
  USD: "nuban",
};

const BASE_URL = "https://api.paystack.co";

class PaystackProvider extends BaseProvider {
  constructor(config = {}) {
    super("paystack", config);

    this._secretKey = config.secretKey || process.env.PAYSTACK_SECRET_KEY;
    if (!this._secretKey)
      throw new Error("PAYSTACK_SECRET_KEY is not configured");

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
   * Initialise a Paystack transaction.
   * Returns a charge result with a `nextAction.redirectUrl` for the
   * Paystack hosted checkout, or completes inline if a card token is supplied.
   */
  async charge(payload) {
    const {
      idempotencyKey,
      amount,
      currency,
      vaultToken, // Paystack authorization_code for returning customers
      email,
      description,
      metadata = {},
      callbackUrl,
    } = payload;

    if (!email)
      throw new Error("PaystackProvider: email is required for all charges");

    const amountSmallest = this.toSmallestUnit(amount, currency);

    logger.info("PaystackProvider: initiating charge", {
      idempotencyKey,
      currency,
      amountSmallest,
    });

    // If we have a saved authorisation code, charge it directly (server-side)
    if (vaultToken) {
      return this._chargeAuthorization(
        vaultToken,
        email,
        amountSmallest,
        currency,
        metadata,
        idempotencyKey,
      );
    }

    // Otherwise, initialise a checkout session
    const body = {
      reference: idempotencyKey,
      email,
      amount: amountSmallest,
      currency: currency.toUpperCase(),
      callback_url:
        callbackUrl ||
        process.env.PAYSTACK_CALLBACK_URL ||
        "https://afrapay.com/payments/complete",
      metadata: {
        ...metadata,
        afrapay_idempotency_key: idempotencyKey,
        description,
      },
    };

    const { data } = await this._http.post("/transaction/initialize", body);

    if (!data.status) {
      throw new Error(
        `PaystackProvider: initialization failed — ${data.message}`,
      );
    }

    return {
      id: uuidv4(),
      providerRef: data.data.reference,
      status: "requires_action",
      amount: amountSmallest,
      currency: currency.toUpperCase(),
      fee: 0,
      nextAction: {
        type: "redirect",
        redirectUrl: data.data.authorization_url,
      },
      raw: this.sanitise(data.data),
    };
  }

  async getCharge(providerRef) {
    const { data } = await this._http.get(
      `/transaction/verify/${encodeURIComponent(providerRef)}`,
    );

    if (!data.status) {
      throw new Error(
        `PaystackProvider: verification failed — ${data.message}`,
      );
    }

    return this._normaliseTransaction(data.data);
  }

  async refund(providerRef, amount) {
    // First get the transaction to find the internal Paystack transaction ID
    const { data: verifyData } = await this._http.get(
      `/transaction/verify/${encodeURIComponent(providerRef)}`,
    );

    const txId = verifyData.data?.id;
    if (!txId)
      throw new Error(
        `PaystackProvider: cannot find transaction for reference ${providerRef}`,
      );

    const body = { transaction: txId };
    if (amount != null) {
      body.amount = this.toSmallestUnit(amount, verifyData.data.currency);
    }

    const { data } = await this._http.post("/refund", body);

    if (!data.status) {
      throw new Error(`PaystackProvider: refund failed — ${data.message}`);
    }

    return {
      id: uuidv4(),
      providerRef: String(data.data.id),
      status: data.data.status === "processed" ? "completed" : "pending",
      amount: data.data.deducted_amount || amount,
    };
  }

  verifyWebhook(rawBody, headers) {
    const signature = headers["x-paystack-signature"];
    if (!signature) return false;

    const computed = crypto
      .createHmac("sha512", this._secretKey)
      .update(rawBody)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex"),
    );
  }

  normaliseWebhookEvent(body) {
    const eventMap = {
      "charge.success": "payment.completed",
      "transfer.success": "transfer.completed",
      "transfer.failed": "transfer.failed",
      "refund.processed": "refund.completed",
      "invoice.payment_failed": "payment.failed",
    };

    return {
      event: eventMap[body.event] || `paystack.${body.event}`,
      data: body.data
        ? this._normaliseTransaction(body.data)
        : { raw: this.sanitise(body) },
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  async _chargeAuthorization(
    authCode,
    email,
    amountSmallest,
    currency,
    metadata,
    idempotencyKey,
  ) {
    const body = {
      authorization_code: authCode,
      email,
      amount: amountSmallest,
      currency: currency.toUpperCase(),
      reference: idempotencyKey,
      metadata: { ...metadata, afrapay_idempotency_key: idempotencyKey },
    };

    const { data } = await this._http.post(
      "/transaction/charge_authorization",
      body,
    );

    if (!data.status) {
      throw new Error(
        `PaystackProvider: charge_authorization failed — ${data.message}`,
      );
    }

    return this._normaliseTransaction(data.data);
  }

  _normaliseTransaction(tx) {
    const STATUS_MAP = {
      success: "completed",
      failed: "failed",
      abandoned: "failed",
      pending: "pending",
      processing: "processing",
      ongoing: "processing",
    };

    return {
      id: uuidv4(),
      providerRef: tx.reference || String(tx.id),
      status: STATUS_MAP[tx.status] || tx.status,
      amount: tx.amount,
      currency: (tx.currency || "").toUpperCase(),
      fee: tx.fees || 0,
      nextAction: null,
      raw: this.sanitise(tx),
    };
  }

  // ── Outbound transfers (Send Money) ───────────────────────────────────────

  /**
   * Disburse funds to a bank account via Paystack Transfers API.
   *
   * Two-step: create recipient → initiate transfer.
   * Supported currencies: NGN (nuban), GHS (ghipss), ZAR (basa), KES, EGP, RWF.
   *
   * @param {Object} payload
   * @param {string} payload.idempotencyKey
   * @param {number} payload.amount           Human-readable amount (e.g. 500.00)
   * @param {string} payload.currency         ISO-4217 (e.g. "NGN")
   * @param {string} payload.accountNumber    Bank account number
   * @param {string} payload.bankCode         Bank code (e.g. "057" = Zenith NGN)
   * @param {string} payload.accountName      Beneficiary full name
   * @param {string} [payload.description]    Transfer narration
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
    logger.info("PaystackProvider: initiating transfer", {
      idempotencyKey,
      currency,
    });

    // Step 1 — Create transfer recipient
    const type = PAYSTACK_RECIPIENT_TYPE[currency.toUpperCase()] || "nuban";

    const { data: recipData } = await this._http.post("/transferrecipient", {
      type,
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: currency.toUpperCase(),
    });

    if (!recipData.status) {
      throw new Error(
        `PaystackProvider: recipient creation failed — ${recipData.message}`,
      );
    }

    const recipientCode = recipData.data.recipient_code;
    const amountSmallest = this.toSmallestUnit(amount, currency);

    // Step 2 — Initiate transfer from Paystack balance
    const { data } = await this._http.post("/transfer", {
      source: "balance",
      reason: description || "AfraPay Transfer",
      amount: amountSmallest,
      recipient: recipientCode,
      reference: idempotencyKey,
    });

    if (!data.status) {
      throw new Error(`PaystackProvider: transfer failed — ${data.message}`);
    }

    return this._normaliseTransfer(data.data, currency);
  }

  /**
   * Verify the current status of a Paystack transfer by its reference.
   */
  async getTransferStatus(providerRef) {
    const { data } = await this._http.get(
      `/transfer/verify/${encodeURIComponent(providerRef)}`,
    );

    if (!data.status) {
      throw new Error(
        `PaystackProvider: transfer status fetch failed — ${data.message}`,
      );
    }

    return this._normaliseTransfer(data.data, data.data?.currency);
  }

  _normaliseTransfer(tx, currency) {
    const STATUS_MAP = {
      success: "completed",
      failed: "failed",
      abandoned: "failed",
      reversed: "failed",
      pending: "processing",
      queued: "processing",
      processing: "processing",
      otp: "requires_action",
    };

    return {
      id: uuidv4(),
      providerRef: tx.reference,
      status: STATUS_MAP[tx.status] || "processing",
      amount: tx.amount,
      currency: (tx.currency || currency || "").toUpperCase(),
      fee: 0,
      nextAction:
        tx.status === "otp"
          ? {
              type: "otp",
              message:
                "An OTP has been sent to approve this transfer. Check your Paystack dashboard.",
            }
          : null,
      raw: this.sanitise(tx),
    };
  }
}

module.exports = PaystackProvider;
