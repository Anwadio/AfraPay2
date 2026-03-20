"use strict";
/**
 * Card Routes  —  /api/v1/cards
 *
 * All routes require authentication.
 * Card operations are scoped to the authenticated user — no cross-user access.
 *
 * Rate limits:
 *   POST /         — 5 req / 15 min  (tokenisation is expensive; mitigates card enumeration)
 *   GET  /         — 120 req / 15 min
 *   DELETE /:id    — 15 req / 15 min
 *   PATCH /:id/*   — 30 req / 15 min
 */

const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { createRateLimiter } = require("../../middleware/security/rateLimiter");
const cardController = require("../../controllers/cardController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const readLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: "Too many card requests. Please wait before trying again.",
});
const addLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many card save attempts. Please wait before trying again.",
});
const writeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many card operations. Please wait before trying again.",
});

// ── Shared validations ────────────────────────────────────────────────────────
const cardIdParam = param("id")
  .isString()
  .trim()
  .notEmpty()
  .withMessage("Valid card ID required");

const CARD_BRANDS = ["visa", "mastercard", "amex", "discover", "other"];
const CARD_TYPES = ["virtual", "physical"];
const CARD_STATUSES = ["active", "frozen"];

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/v1/cards
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/v1/cards
 * @desc   Return all cards for the authenticated user
 * @access Authenticated
 */
router.get(
  "/",
  authenticate,
  readLimiter,
  asyncHandler(cardController.listCards.bind(cardController)),
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/cards
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/v1/cards
 * @desc   Tokenise and save a new payment card
 * @access Authenticated
 *
 * Security:
 *   - Card number is validated, tokenised server-side, then discarded
 *   - CVV is validated then immediately discarded — NEVER stored
 *   - Duplicate detection via HMAC fingerprint
 */
router.post(
  "/",
  authenticate,
  addLimiter,
  [
    body("cardNumber")
      .isString()
      .trim()
      .matches(/^\d{13,19}$/)
      .withMessage("Card number must be 13-19 digits"),

    body("holderName")
      .isString()
      .trim()
      .isLength({ min: 2, max: 200 })
      .escape()
      .withMessage("Cardholder name is required (2-200 characters)"),

    body("expiryMonth")
      .isInt({ min: 1, max: 12 })
      .withMessage("Expiry month must be 1-12"),

    body("expiryYear")
      .isInt({
        min: new Date().getFullYear(),
        max: new Date().getFullYear() + 20,
      })
      .withMessage("Expiry year is invalid"),

    body("cvv")
      .isString()
      .trim()
      .matches(/^\d{3,4}$/)
      .withMessage("CVV must be 3 or 4 digits"),

    body("label")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .escape()
      .withMessage("Label cannot exceed 100 characters"),

    body("cardType")
      .optional()
      .isIn(CARD_TYPES)
      .withMessage(`cardType must be one of: ${CARD_TYPES.join(", ")}`),

    body("color")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Color value too long"),
  ],
  validateRequest,
  asyncHandler(cardController.addCard.bind(cardController)),
);

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/v1/cards/:id
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  DELETE /api/v1/cards/:id
 * @desc   Remove a card from the user's account
 * @access Authenticated (owner only)
 */
router.delete(
  "/:id",
  authenticate,
  writeLimiter,
  [cardIdParam],
  validateRequest,
  asyncHandler(cardController.deleteCard.bind(cardController)),
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/cards/:id/default
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  PATCH /api/v1/cards/:id/default
 * @desc   Set a card as the user's default payment method
 * @access Authenticated (owner only)
 */
router.patch(
  "/:id/default",
  authenticate,
  writeLimiter,
  [cardIdParam],
  validateRequest,
  asyncHandler(cardController.setDefaultCard.bind(cardController)),
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/cards/:id/status
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  PATCH /api/v1/cards/:id/status
 * @desc   Freeze or unfreeze a card
 * @access Authenticated (owner only)
 * @body   { status: "active" | "frozen" }
 */
router.patch(
  "/:id/status",
  authenticate,
  writeLimiter,
  [
    cardIdParam,
    body("status")
      .isIn(CARD_STATUSES)
      .withMessage(`status must be one of: ${CARD_STATUSES.join(", ")}`),
  ],
  validateRequest,
  asyncHandler(cardController.updateCardStatus.bind(cardController)),
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/cards/:id
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  PATCH /api/v1/cards/:id
 * @desc   Update user-editable card metadata (label, color)
 * @access Authenticated (owner only)
 */
router.patch(
  "/:id",
  authenticate,
  writeLimiter,
  [
    cardIdParam,
    body("label")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .escape()
      .withMessage("Label cannot exceed 100 characters"),
    body("color")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Color value too long"),
  ],
  validateRequest,
  asyncHandler(cardController.updateCard.bind(cardController)),
);

module.exports = router;
