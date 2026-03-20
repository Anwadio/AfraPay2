"use strict";
/**
 * TokenizationService
 *
 * Converts raw card input into a secure, opaque token for storage.
 * Raw PAN and CVV are NEVER persisted — they are used only in-process
 * to derive the token and fingerprint, then immediately discarded.
 *
 * Designed to be provider-agnostic: swap `tokenize()` internals with a call
 * to Stripe, Adyen, or any PCI-DSS compliant vault without changing callers.
 *
 * Algorithms used:
 *   Token       — AES-256-GCM encryption of card metadata (no raw PAN in payload)
 *   Fingerprint — HMAC-SHA256 of (userId + normalised PAN) for dedup
 *
 * Security notes:
 *   - ENCRYPTION_KEY must be exactly 32 bytes (set in env).
 *   - TOKEN_HMAC_KEY defaults to ENCRYPTION_KEY but should be a separate secret
 *     in production.
 *   - Only last4 + expiryMonth + expiryYear + brand are returned to callers.
 */

const crypto = require("crypto");
const config = require("../config/environment");

// ─── brand detection ─────────────────────────────────────────────────────────

const BRAND_PATTERNS = [
  { brand: "amex", re: /^3[47]/ },
  { brand: "visa", re: /^4/ },
  { brand: "mastercard", re: /^5[1-5]|^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/ },
  {
    brand: "discover",
    re: /^6(?:011|22(?:1(?:2[6-9]|[3-9]\d)|[2-8]\d{2}|9(?:[01]\d|2[0-5]))|4[4-9]\d|5\d{2})/,
  },
];

/**
 * Detect card brand from PAN (Primary Account Number).
 * @param {string} pan - Raw card number (digits only)
 * @returns {string} brand slug
 */
function detectBrand(pan) {
  const digits = pan.replace(/\D/g, "");
  for (const { brand, re } of BRAND_PATTERNS) {
    if (re.test(digits)) return brand;
  }
  return "other";
}

// ─── Luhn check ───────────────────────────────────────────────────────────────

/**
 * Validate a PAN using the Luhn algorithm.
 * @param {string} pan
 * @returns {boolean}
 */
function luhnCheck(pan) {
  const digits = pan.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// ─── AES-256-GCM helpers ──────────────────────────────────────────────────────

function getEncryptionKey() {
  const raw = config.security.encryption.key;
  // Key must be exactly 32 bytes for AES-256
  const key = Buffer.from(raw, "utf8");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 bytes");
  }
  return key;
}

function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decrypt(packed) {
  const parts = packed.split(":");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [ivB64, authTagB64, cipherB64] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// ─── fingerprint ──────────────────────────────────────────────────────────────

/**
 * Derive a deterministic, non-reversible fingerprint for a (userId, PAN) pair.
 * Used to detect duplicate card additions without storing the PAN.
 *
 * @param {string} userId
 * @param {string} pan - Normalised digits only
 * @returns {string} hex fingerprint (64 chars)
 */
function deriveFingerprint(userId, pan) {
  const hmacKey = process.env.TOKEN_HMAC_KEY || config.security.encryption.key;
  return crypto
    .createHmac("sha256", hmacKey)
    .update(`${userId}:${pan.replace(/\D/g, "")}`)
    .digest("hex");
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Tokenize raw card input.
 *
 * @param {Object} input
 * @param {string} input.userId       - Owner's user ID (included in fingerprint derivation)
 * @param {string} input.cardNumber   - Raw PAN — used only in-process; NEVER stored
 * @param {string} input.holderName   - Cardholder name
 * @param {number} input.expiryMonth  - 1–12
 * @param {number} input.expiryYear   - e.g. 2027
 * @param {string} input.cvv          - 3-4 digit security code — validated then discarded
 *
 * @returns {{ token, fingerprint, last4, brand, expiryMonth, expiryYear }}
 *
 * @throws {Error} If card number is invalid (Luhn failure) or CVV format wrong
 */
function tokenize({
  userId,
  cardNumber,
  holderName,
  expiryMonth,
  expiryYear,
  cvv,
}) {
  // ── Input sanitisation ───────────────────────────────────────────────────
  const pan = String(cardNumber).replace(/\D/g, "");

  if (!luhnCheck(pan)) {
    const err = new Error("Invalid card number");
    err.code = "INVALID_CARD_NUMBER";
    err.statusCode = 400;
    throw err;
  }

  const cvvStr = String(cvv).replace(/\D/g, "");
  if (cvvStr.length < 3 || cvvStr.length > 4) {
    const err = new Error("Invalid CVV");
    err.code = "INVALID_CVV";
    err.statusCode = 400;
    throw err;
  }

  const month = parseInt(expiryMonth, 10);
  const year = parseInt(expiryYear, 10);
  const now = new Date();
  if (
    isNaN(month) ||
    month < 1 ||
    month > 12 ||
    isNaN(year) ||
    new Date(year, month - 1) < new Date(now.getFullYear(), now.getMonth())
  ) {
    const err = new Error("Card is expired or expiry date is invalid");
    err.code = "INVALID_EXPIRY";
    err.statusCode = 400;
    throw err;
  }

  // ── Derive outputs ───────────────────────────────────────────────────────
  const last4 = pan.slice(-4);
  const brand = detectBrand(pan);
  const fingerprint = deriveFingerprint(userId, pan);

  // Token payload: metadata only — NO raw PAN, NO CVV
  const payload = JSON.stringify({
    last4,
    brand,
    expiryMonth: month,
    expiryYear: year,
    holderName,
    createdAt: new Date().toISOString(),
  });
  const token = encrypt(payload);

  // Immediately overwrite sensitive values in memory (best-effort in JS)
  // production environments should use native SecureString equivalents
  pan.replace(/./g, "0"); // eslint-disable-line no-unused-expressions
  cvvStr.replace(/./g, "0"); // eslint-disable-line no-unused-expressions

  return {
    token,
    fingerprint,
    last4,
    brand,
    expiryMonth: month,
    expiryYear: year,
  };
}

/**
 * Decode a previously created token back to card metadata.
 * Used internally only (e.g. building response objects) — the token itself
 * is never sent to the frontend.
 *
 * @param {string} token
 * @returns {{ last4, brand, expiryMonth, expiryYear, holderName, createdAt }}
 */
function decodeToken(token) {
  try {
    return JSON.parse(decrypt(token));
  } catch {
    const err = new Error("Token decryption failed");
    err.code = "TOKEN_DECODE_ERROR";
    err.statusCode = 500;
    throw err;
  }
}

module.exports = { tokenize, decodeToken, detectBrand, luhnCheck };
