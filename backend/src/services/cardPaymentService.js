"use strict";

/**
 * Card Payment Service
 *
 * Handles the charge step of the card-top-up flow:
 *   1. Load and validate the card from APPWRITE_USER_CARDS_COLLECTION_ID
 *   2. Enforce ownership, active status, and expiry
 *   3. Execute the charge via provider simulation (swappable for Stripe, Paystack, etc.)
 *   4. Return a structured charge result used by paymentController.chargeCard
 *
 * SECURITY:
 *   - Raw PANs and CVVs are NEVER stored or transmitted here.
 *     The card document only contains cardLast4, cardBrand, token (AES-256-GCM),
 *     fingerprint (HMAC-SHA256) — no sensitive plaintext.
 *   - Ownership is always verified against the authenticated userId.
 *   - A generic NotFoundError is thrown on ownership mismatch to prevent
 *     card ID enumeration attacks.
 */

const { Client, Databases } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  PaymentError,
} = require("../middleware/monitoring/errorHandler");

// ── Dedicated Appwrite client (matches the pattern used by cardService.js) ───
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const _db = new Databases(_client);

const DB_ID = () => config.database.appwrite.databaseId;
const CARDS_COL = () => config.database.appwrite.userCardsCollectionId;

// ── Supported currencies for card top-up ─────────────────────────────────────
const SUPPORTED_CURRENCIES = new Set([
  "KES",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "ZAR",
  "UGX",
]);

// ── Provider gateway simulation ──────────────────────────────────────────────
/**
 * Simulate a card charge.
 *
 * This module is intentionally structured so the entire body of this function
 * can be replaced with a real provider SDK call (Stripe, Paystack, etc.)
 * without touching any other layer.
 *
 * To integrate a real provider:
 *   1. Set CARD_PAYMENT_PROVIDER=stripe in .env
 *   2. Replace the body below with:
 *        const stripe = require('stripe')(config.payments.stripeSecretKey);
 *        const paymentIntent = await stripe.paymentIntents.create({...});
 *        return { success: true, providerReference: paymentIntent.id, gateway: 'stripe', ... };
 *
 * @param {{ cardLast4: string, cardBrand: string }} card - sanitised card object
 * @param {number} amount
 * @param {string} currency
 * @returns {Promise<{ success: boolean, providerReference: string, gateway: string }>}
 */
async function _executeCharge(card, amount, currency) {
  const provider = process.env.CARD_PAYMENT_PROVIDER || "internal_simulator";

  if (provider === "internal_simulator") {
    // ── Internal simulation (no real money moves) ──────────────────────────
    // This is the only place where provider selection happens.
    // In production NODE_ENV, the simulator always succeeds.
    // In development, a small random decline rate aids integration testing.
    const declineProbability = process.env.NODE_ENV === "production" ? 0 : 0.03;

    if (Math.random() < declineProbability) {
      return {
        success: false,
        gateway: "internal_simulator",
        declineReason:
          "Card declined: insufficient funds (simulated test decline)",
      };
    }

    const ref = `AFRA-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)
      .toUpperCase()}`;

    return {
      success: true,
      providerReference: ref,
      gateway: "internal_simulator",
    };
  }

  // ── Future providers — add cases here as providers are integrated ─────────
  // case "stripe": ...
  // case "paystack": ...
  // case "flutterwave": ...

  throw new PaymentError(
    `Unsupported card payment provider: "${provider}". Set CARD_PAYMENT_PROVIDER=internal_simulator or a supported gateway.`,
  );
}

// ── Service ──────────────────────────────────────────────────────────────────
const cardPaymentService = {
  /**
   * Validate and charge a saved card.
   *
   * @param {string} userId   - Authenticated user's ID (JWT sub)
   * @param {string} cardId   - Appwrite document $id of the card
   * @param {number} amount   - Positive float
   * @param {string} currency - ISO-4217 code (e.g. "KES")
   *
   * @returns {Promise<{
   *   providerReference: string,
   *   cardLast4: string,
   *   cardBrand: string,
   *   gateway: string,
   * }>}
   *
   * @throws {NotFoundError}    Card not found or does not belong to user
   * @throws {ValidationError}  Card frozen / expired / unsupported currency
   * @throws {PaymentError}     Charge failed at provider level
   */
  async chargeCard(userId, cardId, amount, currency) {
    if (!CARDS_COL()) {
      throw new ValidationError(
        "Card payment system is not configured. Contact support.",
      );
    }

    // ── 1. Load card document ──────────────────────────────────────────────
    let card;
    try {
      card = await _db.getDocument(DB_ID(), CARDS_COL(), cardId);
    } catch {
      // Appwrite throws AppwriteException(404) for missing docs.
      // Return the same NotFoundError regardless of reason to prevent enumeration.
      throw new NotFoundError("Card");
    }

    // ── 2. Ownership check ─────────────────────────────────────────────────
    if (card.userId !== userId) {
      logger.security("cardPaymentService.chargeCard: ownership mismatch", {
        requestedBy: userId,
        cardOwner: card.userId,
        cardId,
      });
      // Generic not-found prevents card ID enumeration
      throw new NotFoundError("Card");
    }

    // ── 3. Card status ─────────────────────────────────────────────────────
    if (card.status !== "active") {
      throw new ValidationError(
        `Card ending in ${card.cardLast4} cannot be charged — it is currently ${card.status}. Unfreeze the card first.`,
      );
    }

    // ── 4. Expiry check ────────────────────────────────────────────────────
    // Card is valid for the full expiry month; it expires at the start of the
    // following month. expiryMonth is 1-indexed (1 = January).
    const now = new Date();
    const cardExpiry = new Date(card.expiryYear, card.expiryMonth, 1); // start of month after expiry
    if (cardExpiry <= now) {
      throw new ValidationError(
        `Card ending in ${card.cardLast4} has expired (${String(card.expiryMonth).padStart(2, "0")}/${card.expiryYear}). Please add a new card.`,
      );
    }

    // ── 5. Currency support ────────────────────────────────────────────────
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      throw new ValidationError(
        `Currency "${currency}" is not supported for card top-up. Supported currencies: ${[...SUPPORTED_CURRENCIES].join(", ")}.`,
      );
    }

    // ── 6. Execute charge ──────────────────────────────────────────────────
    let chargeResult;
    try {
      chargeResult = await _executeCharge(card, amount, currency);
    } catch (err) {
      logger.error("cardPaymentService: charge execution failed", {
        userId,
        cardId,
        amount,
        currency,
        error: err.message,
      });
      throw err instanceof PaymentError
        ? err
        : new PaymentError(`Card charge failed: ${err.message}`);
    }

    if (!chargeResult.success) {
      logger.payment("cardPaymentService: card declined", {
        userId,
        cardId,
        cardLast4: card.cardLast4,
        amount,
        currency,
        reason: chargeResult.declineReason,
        gateway: chargeResult.gateway,
      });
      throw new PaymentError(
        chargeResult.declineReason ||
          "Card was declined. Please try a different card or contact your bank.",
      );
    }

    logger.payment("cardPaymentService: charge successful", {
      userId,
      cardId,
      cardLast4: card.cardLast4,
      cardBrand: card.cardBrand,
      amount,
      currency,
      providerReference: chargeResult.providerReference,
      gateway: chargeResult.gateway,
    });

    return {
      providerReference: chargeResult.providerReference,
      cardLast4: card.cardLast4,
      cardBrand: card.cardBrand,
      gateway: chargeResult.gateway,
    };
  },
};

module.exports = cardPaymentService;
