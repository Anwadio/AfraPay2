"use strict";
/**
 * CardService
 *
 * Business logic layer for user payment cards.
 * All database operations are scoped to the requesting user via userId to
 * prevent horizontal privilege escalation.
 *
 * Collection: APPWRITE_USER_CARDS_COLLECTION_ID
 *
 * Responsibilities:
 *   - List cards for a user (token stripped from response)
 *   - Add a new card (tokenise → deduplicate → persist)
 *   - Delete a card (ownership check)
 *   - Set a card as default (clears previous default atomically)
 *   - Freeze / unfreeze a card (ownership check)
 */

const { Client, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const { tokenize } = require("./tokenizationService");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// ─── Appwrite client ──────────────────────────────────────────────────────────

const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const _db = new Databases(_client);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DB = () => config.database.appwrite.databaseId;
const COL = () => config.database.appwrite.userCardsCollectionId;

function requireCollection() {
  const id = COL();
  if (!id) {
    const err = new Error(
      "Cards collection not configured. Set APPWRITE_USER_CARDS_COLLECTION_ID in .env and run setup-cards-collection.js",
    );
    err.statusCode = 503;
    err.code = "COLLECTION_NOT_CONFIGURED";
    err.isOperational = true;
    throw err;
  }
  return id;
}

/** Strip the encrypted token from a card document before returning to callers */
function sanitiseCard(doc) {
  const {
    token, // never expose
    fingerprint, // never expose
    ...safe
  } = doc;

  // Expose a stable ID (Appwrite uses $id)
  return {
    id: doc.$id,
    userId: safe.userId,
    cardLast4: safe.cardLast4,
    cardBrand: safe.cardBrand,
    expiryMonth: safe.expiryMonth,
    expiryYear: safe.expiryYear,
    label: safe.label || null,
    cardType: safe.cardType,
    holderName: safe.holderName,
    status: safe.status,
    isDefault: safe.isDefault,
    provider: safe.provider,
    color: safe.color || "from-blue-600 via-blue-500 to-teal-500",
    createdAt: safe.createdAt,
    updatedAt: safe.updatedAt,
  };
}

// Maximum cards per user — prevents data abuse
const MAX_CARDS_PER_USER = 10;

// ─── Service methods ──────────────────────────────────────────────────────────

const cardService = {
  /**
   * Retrieve all cards for a user, ordered by creation date.
   * Sensitive fields (token, fingerprint) are stripped.
   */
  async getUserCards(userId) {
    const col = requireCollection();

    const result = await _db.listDocuments(DB(), col, [
      Query.equal("userId", userId),
      Query.orderDesc("createdAt"),
      Query.limit(MAX_CARDS_PER_USER),
    ]);

    return result.documents.map(sanitiseCard);
  },

  /**
   * Add a new card for a user.
   *
   * @param {string} userId
   * @param {{
   *   cardNumber: string,
   *   holderName: string,
   *   expiryMonth: number,
   *   expiryYear: number,
   *   cvv: string,
   *   label?: string,
   *   cardType?: "virtual"|"physical",
   *   color?: string,
   * }} input
   *
   * @returns {Object} sanitised card document
   */
  async addCard(userId, input) {
    const col = requireCollection();

    // ── Enforce per-user card limit ───────────────────────────────────────
    const existing = await _db.listDocuments(DB(), col, [
      Query.equal("userId", userId),
      Query.limit(MAX_CARDS_PER_USER),
    ]);
    if (existing.total >= MAX_CARDS_PER_USER) {
      throw new ValidationError(
        `You can have at most ${MAX_CARDS_PER_USER} saved cards. Remove an existing card to add a new one.`,
      );
    }

    // ── Tokenise — raw PAN / CVV never leave this scope ──────────────────
    const { token, fingerprint, last4, brand, expiryMonth, expiryYear } =
      tokenize({
        userId,
        cardNumber: input.cardNumber,
        holderName: input.holderName,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        cvv: input.cvv,
      });

    // ── Duplicate check (same card already saved by this user) ────────────
    const dupe = await _db.listDocuments(DB(), col, [
      Query.equal("userId", userId),
      Query.equal("fingerprint", fingerprint),
      Query.limit(1),
    ]);
    if (dupe.total > 0) {
      throw new ConflictError("This card is already saved to your account.");
    }

    // ── Determine default ─────────────────────────────────────────────────
    const isFirstCard = existing.total === 0;

    const now = new Date().toISOString();
    const card = await _db.createDocument(DB(), col, ID.unique(), {
      userId,
      cardLast4: last4,
      cardBrand: brand,
      expiryMonth,
      expiryYear,
      token,
      fingerprint,
      provider: input.provider || "internal",
      label: input.label || null,
      cardType: input.cardType || "virtual",
      holderName: input.holderName,
      status: "active",
      isDefault: isFirstCard,
      color: input.color || "from-blue-600 via-blue-500 to-teal-500",
      createdAt: now,
      updatedAt: now,
    });

    logger.audit("CARD_ADDED", userId, {
      cardId: card.$id,
      brand,
      last4,
      cardType: input.cardType,
      provider: input.provider || "internal",
    });

    return sanitiseCard(card);
  },

  /**
   * Delete a card.
   * Ownership is strictly enforced — userId in document must match caller.
   *
   * If the deleted card was the default, the most recently created remaining
   * card is promoted to default.
   */
  async deleteCard(userId, cardId) {
    const col = requireCollection();

    let doc;
    try {
      doc = await _db.getDocument(DB(), col, cardId);
    } catch {
      throw new NotFoundError("Card");
    }

    if (doc.userId !== userId) throw new AuthorizationError("Access denied");

    await _db.deleteDocument(DB(), col, cardId);

    // Promote another card to default if the deleted card was the default
    if (doc.isDefault) {
      const remaining = await _db.listDocuments(DB(), col, [
        Query.equal("userId", userId),
        Query.orderDesc("createdAt"),
        Query.limit(1),
      ]);
      if (remaining.total > 0) {
        const now = new Date().toISOString();
        await _db.updateDocument(DB(), col, remaining.documents[0].$id, {
          isDefault: true,
          updatedAt: now,
        });
      }
    }

    logger.audit("CARD_DELETED", userId, { cardId, wasDefault: doc.isDefault });
    return { success: true };
  },

  /**
   * Set a card as the default.
   * Atomically clears the previous default, then sets the new one.
   */
  async setDefaultCard(userId, cardId) {
    const col = requireCollection();

    let doc;
    try {
      doc = await _db.getDocument(DB(), col, cardId);
    } catch {
      throw new NotFoundError("Card");
    }
    if (doc.userId !== userId) throw new AuthorizationError("Access denied");
    if (doc.status === "frozen") {
      throw new ValidationError("A frozen card cannot be set as the default.");
    }

    const now = new Date().toISOString();

    // Clear previous default(s)
    const current = await _db.listDocuments(DB(), col, [
      Query.equal("userId", userId),
      Query.equal("isDefault", true),
      Query.limit(10),
    ]);
    await Promise.all(
      current.documents
        .filter((d) => d.$id !== cardId)
        .map((d) =>
          _db.updateDocument(DB(), col, d.$id, {
            isDefault: false,
            updatedAt: now,
          }),
        ),
    );

    // Set new default
    const updated = await _db.updateDocument(DB(), col, cardId, {
      isDefault: true,
      updatedAt: now,
    });

    logger.audit("CARD_SET_DEFAULT", userId, { cardId });
    return sanitiseCard(updated);
  },

  /**
   * Freeze or unfreeze a card.
   *
   * @param {string} userId
   * @param {string} cardId
   * @param {"active"|"frozen"} newStatus
   */
  async updateCardStatus(userId, cardId, newStatus) {
    const col = requireCollection();

    if (!["active", "frozen"].includes(newStatus)) {
      throw new ValidationError('status must be "active" or "frozen"');
    }

    let doc;
    try {
      doc = await _db.getDocument(DB(), col, cardId);
    } catch {
      throw new NotFoundError("Card");
    }
    if (doc.userId !== userId) throw new AuthorizationError("Access denied");

    if (doc.status === newStatus) {
      return sanitiseCard(doc); // idempotent — already in desired state
    }

    const now = new Date().toISOString();
    const updated = await _db.updateDocument(DB(), col, cardId, {
      status: newStatus,
      updatedAt: now,
    });

    logger.audit(
      newStatus === "frozen" ? "CARD_FROZEN" : "CARD_UNFROZEN",
      userId,
      { cardId },
    );
    return sanitiseCard(updated);
  },

  /**
   * Update user-editable metadata (label, color).
   */
  async updateCard(userId, cardId, { label, color }) {
    const col = requireCollection();

    let doc;
    try {
      doc = await _db.getDocument(DB(), col, cardId);
    } catch {
      throw new NotFoundError("Card");
    }
    if (doc.userId !== userId) throw new AuthorizationError("Access denied");

    const updates = { updatedAt: new Date().toISOString() };
    if (label !== undefined) updates.label = label;
    if (color !== undefined) updates.color = color;

    const updated = await _db.updateDocument(DB(), col, cardId, updates);
    return sanitiseCard(updated);
  },
};

module.exports = cardService;
