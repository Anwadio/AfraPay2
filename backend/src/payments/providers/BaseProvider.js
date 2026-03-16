/**
 * BaseProvider — Abstract payment provider interface
 *
 * Every gateway adapter MUST extend this class and implement all methods.
 * The orchestrator communicates exclusively through this interface, which keeps
 * provider-specific code isolated and makes adding new providers trivial.
 *
 * Contract for a resolved charge object:
 *   {
 *     id:          string   — AfraPay-internal ID (UUID)
 *     providerRef: string   — Provider's own transaction reference
 *     status:      'pending' | 'processing' | 'completed' | 'failed' | 'requires_action'
 *     amount:      number   — Settled amount (same unit as requested)
 *     currency:    string   — ISO-4217 upper-case
 *     fee:         number   — Provider fee charged (0 if unknown)
 *     nextAction:  object|null — e.g. redirect URL for 3DS, OTP instructions
 *     raw:         object   — Sanitised provider response (no PAN, no CVV)
 *   }
 */

class BaseProvider {
  constructor(name, config = {}) {
    if (new.target === BaseProvider) {
      throw new TypeError(
        "BaseProvider is abstract and cannot be instantiated directly",
      );
    }
    this.name = name;
    this.config = config;
    this._healthy = true; // managed externally by CircuitBreaker
  }

  /**
   * Indicates whether this provider supports a given currency/method combination.
   * @param {string} currency  ISO-4217 code e.g. 'NGN'
   * @param {string} method    'card' | 'bank_transfer' | 'mobile_money' | 'crypto'
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  supports(currency, method) {
    throw new Error(`${this.name}#supports() is not implemented`);
  }

  /**
   * Initiate a charge.
   * @param {ChargePayload} payload
   * @returns {Promise<ChargeResult>}
   *
   * @typedef {Object} ChargePayload
   * @property {string}  idempotencyKey  Caller-supplied deduplication key (UUID v4)
   * @property {number}  amount          Amount in the smallest currency unit (e.g. kobo, cents)
   * @property {string}  currency        ISO-4217 upper-case
   * @property {string}  method          Payment method type
   * @property {string}  [vaultToken]    Encrypted payment method token from TokenVault
   * @property {string}  [email]         Payer email (required by some providers)
   * @property {Object}  [metadata]      Arbitrary key-value bag passed through to provider
   */
  // eslint-disable-next-line no-unused-vars
  async charge(payload) {
    throw new Error(`${this.name}#charge() is not implemented`);
  }

  /**
   * Verify / poll the status of an existing charge.
   * @param {string} providerRef  Provider's own transaction reference
   * @returns {Promise<ChargeResult>}
   */
  // eslint-disable-next-line no-unused-vars
  async getCharge(providerRef) {
    throw new Error(`${this.name}#getCharge() is not implemented`);
  }

  /**
   * Refund a previously settled charge (partial or full).
   * @param {string} providerRef  Provider's own transaction reference
   * @param {number} amount       Amount to refund in smallest unit; omit for full refund
   * @returns {Promise<RefundResult>}
   *
   * @typedef {Object} RefundResult
   * @property {string} id          AfraPay refund ID
   * @property {string} providerRef Provider's refund reference
   * @property {string} status      'pending' | 'completed' | 'failed'
   * @property {number} amount      Refunded amount
   */
  // eslint-disable-next-line no-unused-vars
  async refund(providerRef, amount) {
    throw new Error(`${this.name}#refund() is not implemented`);
  }

  /**
   * Verify the authenticity of a webhook notification.
   * @param {string|Buffer} rawBody    Unparsed request body (use raw bytes, not parsed JSON)
   * @param {Object}        headers    HTTP headers from the webhook request
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  verifyWebhook(rawBody, headers) {
    throw new Error(`${this.name}#verifyWebhook() is not implemented`);
  }

  /**
   * Normalise a provider webhook payload into a standard AfraPay event.
   * @param {Object} body     Parsed webhook body
   * @returns {{ event: string, data: ChargeResult }}
   */
  // eslint-disable-next-line no-unused-vars
  normaliseWebhookEvent(body) {
    throw new Error(`${this.name}#normaliseWebhookEvent() is not implemented`);
  }

  /**
   * Disburse funds to an external bank account or connected account (Send Money).
   * Providers that support outbound transfers must override this method.
   * @param {Object} payload  Provider-specific disbursement params
   * @returns {Promise<ChargeResult>}
   */
  // eslint-disable-next-line no-unused-vars
  async transfer(payload) {
    throw new Error(`${this.name}#transfer() is not implemented`);
  }

  /**
   * Fetch the current status of a previously initiated transfer/payout.
   * @param {string} providerRef  Provider's transfer reference or numeric ID
   * @returns {Promise<ChargeResult>}
   */
  // eslint-disable-next-line no-unused-vars
  async getTransferStatus(providerRef) {
    throw new Error(`${this.name}#getTransferStatus() is not implemented`);
  }

  // ── Helpers available to subclasses ─────────────────────────────────────────

  /**
   * Remove PCI-scoped fields from a provider response before it is logged or
   * stored. Strips card numbers, CVV, raw auth codes, bank account numbers.
   * @param {Object} obj
   * @returns {Object}
   */
  sanitise(obj) {
    const REDACTED = "[REDACTED]";
    const sensitiveKeys = new Set([
      "card_number",
      "cardNumber",
      "number",
      "cvv",
      "cvc",
      "cv2",
      "card_cvv",
      "card_cvc",
      "exp_month",
      "exp_year",
      "account_number",
      "accountNumber",
      "sort_code",
      "sortCode",
      "bvn",
      "ssn",
      "pin",
      "auth_code",
      "authCode",
    ]);

    const recurse = (node) => {
      if (node === null || typeof node !== "object") return node;
      if (Array.isArray(node)) return node.map(recurse);
      return Object.fromEntries(
        Object.entries(node).map(([k, v]) => [
          k,
          sensitiveKeys.has(k) ? REDACTED : recurse(v),
        ]),
      );
    };
    return recurse(obj);
  }

  /**
   * Convert a money value expressed as a float (e.g. 12.50) to the provider's
   * smallest unit using integer arithmetic to avoid floating-point drift.
   * @param {number} amount   Decimal amount e.g. 12.50
   * @param {string} currency ISO-4217 code
   * @returns {number}  Integer smallest unit (cents, kobo, pesewas, etc.)
   */
  toSmallestUnit(amount, currency) {
    const ZERO_DECIMAL = new Set([
      "BIF",
      "CLP",
      "DJF",
      "GNF",
      "JPY",
      "KMF",
      "KRW",
      "MGA",
      "PYG",
      "RWF",
      "UGX",
      "VND",
      "VUV",
      "XAF",
      "XOF",
      "XPF",
    ]);
    const multiplier = ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
    return Math.round(amount * multiplier);
  }
}

module.exports = BaseProvider;
