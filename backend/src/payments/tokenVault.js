/**
 * TokenVault
 *
 * Encrypts and decrypts sensitive payment method data (card tokens,
 * authorisation codes, bank account references) before they are stored
 * in the database or passed between services.
 *
 * Algorithm: AES-256-GCM
 * ─────────────────────
 * • Authenticated encryption — provides both confidentiality and integrity.
 * • A fresh 12-byte IV is generated for every encrypt call (GCM best practice).
 * • The output is a single URL-safe Base64 string embedding iv + authTag + ciphertext.
 * • The master key is derived with HKDF from ENCRYPTION_KEY so the vault can
 *   be rekeyed without exposing the root secret to every subsystem.
 *
 * PCI guidance
 * ─────────────
 * • Raw PANs (full card numbers) must NEVER be stored.  Store only:
 *     - Provider-issued tokens/authorisation codes        (opaque, provider-scoped)
 *     - Last 4 digits + card brand (display only)
 * • CVV/CVV2 must NEVER be stored at all (even encrypted).
 * • This vault is for opaque provider tokens, not raw card data.
 *
 * Environment variables:
 *   ENCRYPTION_KEY  — exactly 32 ASCII characters (256-bit base key)
 */

const crypto = require("crypto");
const logger = require("../utils/logger");

// ── Key derivation ───────────────────────────────────────────────────────────
// Derive a dedicated vault key so the root ENCRYPTION_KEY does not directly
// encrypt vault data.  Same root key → same derived key across restarts.
const VAULT_KEY_INFO = Buffer.from("afrapay-token-vault-v1");

function deriveVaultKey(rootKey) {
  // HKDF-SHA256: ikm=rootKey, salt=null, info=VAULT_KEY_INFO, length=32
  return crypto.hkdfSync(
    "sha256",
    rootKey,
    Buffer.alloc(32),
    VAULT_KEY_INFO,
    32,
  );
}

let _vaultKey = null;

function getVaultKey() {
  if (_vaultKey) return _vaultKey;

  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey || rawKey.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }

  const rootKey = Buffer.from(rawKey.slice(0, 32), "utf8");
  _vaultKey = deriveVaultKey(rootKey);
  return _vaultKey;
}

// ── Constants ────────────────────────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16; // GCM auth tag length

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypt a provider token / sensitive string.
 * @param {string} plaintext  The sensitive value to protect.
 * @returns {string}          URL-safe Base64 vault token (iv|tag|ciphertext).
 */
function encrypt(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new TypeError(
      "TokenVault.encrypt: plaintext must be a non-empty string",
    );
  }

  const key = getVaultKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Layout: [ IV (12) | AuthTag (16) | Ciphertext (n) ]
  const combined = Buffer.concat([iv, authTag, encrypted]);
  // URL-safe Base64 (replace +→-, /→_, strip =)
  return combined
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decrypt a vault token produced by `encrypt()`.
 * @param {string} vaultToken  The Base64 vault token.
 * @returns {string}           The original plaintext.
 * @throws  If the token has been tampered with (auth tag mismatch).
 */
function decrypt(vaultToken) {
  if (typeof vaultToken !== "string" || vaultToken.length === 0) {
    throw new TypeError(
      "TokenVault.decrypt: vaultToken must be a non-empty string",
    );
  }

  // Restore standard Base64 from URL-safe variant
  const b64 = vaultToken.replace(/-/g, "+").replace(/_/g, "/");
  const combined = Buffer.from(b64, "base64");

  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("TokenVault.decrypt: vault token is too short / malformed");
  }

  const key = getVaultKey();
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Do NOT log the ciphertext or key
    logger.warn("TokenVault: decryption failed — possible tamper or wrong key");
    throw new Error(
      "TokenVault: failed to decrypt vault token (integrity check failed)",
    );
  }
}

/**
 * Convenience: encrypt a payment method token object as JSON.
 * @param {Object} tokenData  e.g. { authCode, last4, brand, expiry }
 * @returns {string}
 */
function encryptObject(tokenData) {
  return encrypt(JSON.stringify(tokenData));
}

/**
 * Convenience: decrypt and JSON-parse a vault token.
 * @param {string} vaultToken
 * @returns {Object}
 */
function decryptObject(vaultToken) {
  return JSON.parse(decrypt(vaultToken));
}

module.exports = { encrypt, decrypt, encryptObject, decryptObject };
