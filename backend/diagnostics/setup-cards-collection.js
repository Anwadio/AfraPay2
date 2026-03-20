/**
 * Cards Collection Setup Script
 *
 * Creates all required attributes for the USER_CARDS_COLLECTION_ID collection.
 * Safe to run multiple times — each attribute creation is skipped if it already
 * exists (idempotent).
 *
 * Run with:  node diagnostics/setup-cards-collection.js
 *
 * SECURITY NOTE:
 *   - Raw card numbers and CVV are NEVER stored.
 *   - `token`       — AES-256-GCM encrypted payload (tokenization service)
 *   - `fingerprint` — HMAC-SHA256 of card number (deduplication only)
 *   - Only the last 4 digits and card metadata are stored in plain form.
 */

"use strict";

const { Client, Databases } = require("node-appwrite");
require("dotenv").config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_USER_CARDS_COLLECTION_ID;

if (!databaseId || !collectionId) {
  console.error(
    "❌  Missing required env vars: APPWRITE_DATABASE_ID and/or APPWRITE_USER_CARDS_COLLECTION_ID",
  );
  process.exit(1);
}

console.log("🔧  Cards collection ID:", collectionId);
console.log("🗄️   Database ID       :", databaseId);
console.log("");

// ─── helpers ────────────────────────────────────────────────────────────────

async function createString(key, size, required, defaultValue, array = false) {
  try {
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      key,
      size,
      required,
      defaultValue,
      array,
    );
    console.log(`  ✅  string  ${key}`);
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ⏭️   string  ${key} (already exists)`);
    } else {
      console.error(`  ❌  string  ${key} — ${e.message}`);
    }
  }
}

async function createBoolean(key, required, defaultValue) {
  try {
    await databases.createBooleanAttribute(
      databaseId,
      collectionId,
      key,
      required,
      defaultValue,
    );
    console.log(`  ✅  boolean ${key}`);
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ⏭️   boolean ${key} (already exists)`);
    } else {
      console.error(`  ❌  boolean ${key} — ${e.message}`);
    }
  }
}

async function createInteger(key, required, min, max, defaultValue) {
  try {
    await databases.createIntegerAttribute(
      databaseId,
      collectionId,
      key,
      required,
      min,
      max,
      defaultValue,
    );
    console.log(`  ✅  integer ${key}`);
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ⏭️   integer ${key} (already exists)`);
    } else {
      console.error(`  ❌  integer ${key} — ${e.message}`);
    }
  }
}

async function createIndex(key, type, attributes, orders = []) {
  try {
    await databases.createIndex(
      databaseId,
      collectionId,
      key,
      type,
      attributes,
      orders,
    );
    console.log(`  ✅  index   ${key}`);
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ⏭️   index   ${key} (already exists)`);
    } else {
      console.error(`  ❌  index   ${key} — ${e.message}`);
    }
  }
}

// ─── attribute definitions ──────────────────────────────────────────────────

async function setupAttributes() {
  console.log("📋  Creating attributes...\n");

  // Owner
  await createString("userId", 36, true, null);

  // Card identity — tokenised; raw PAN never stored
  await createString("cardLast4", 4, true, null);
  await createString("cardBrand", 20, true, null); // visa | mastercard | amex | discover | other
  await createInteger("expiryMonth", true, 1, 12, null);
  await createInteger("expiryYear", true, 2020, 2060, null);

  // Tokenisation
  await createString("token", 512, true, null); // AES-256-GCM encrypted payload
  await createString("fingerprint", 64, true, null); // HMAC-SHA256 for dedup

  // Provider info
  await createString("provider", 50, false, "internal"); // internal | stripe | paystack | etc.

  // Card metadata
  await createString("label", 100, false, null); // user-defined name
  await createString("cardType", 20, true, null); // virtual | physical
  await createString("holderName", 200, true, null); // cardholder name
  await createString("status", 20, true, "active"); // active | frozen

  // UI / UX
  await createString(
    "color",
    200,
    false,
    "from-blue-600 via-blue-500 to-teal-500",
  );

  // Default card flag
  await createBoolean("isDefault", true, false);

  // Timestamps (ISO 8601 strings — Appwrite datetime attributes need special API)
  await createString("createdAt", 30, true, null);
  await createString("updatedAt", 30, true, null);
}

// ─── indexes ─────────────────────────────────────────────────────────────────

async function setupIndexes() {
  console.log("\n📑  Creating indexes...\n");

  // Primary lookup: all cards for a user
  await createIndex("idx_userId", "key", ["userId"], ["ASC"]);

  // Deduplication: prevent the same card being added twice per user
  await createIndex("idx_user_fingerprint", "unique", [
    "userId",
    "fingerprint",
  ]);

  // Fast lookup: find current default card for a user
  await createIndex("idx_user_default", "key", ["userId", "isDefault"]);

  // Status filtering per user
  await createIndex("idx_user_status", "key", ["userId", "status"]);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await setupAttributes();

    // Appwrite requires a short pause between attribute creation and index creation
    console.log("\n⏳  Waiting 3 s for attributes to propagate...");
    await new Promise((r) => setTimeout(r, 3000));

    await setupIndexes();

    console.log("\n✅  Cards collection setup complete.\n");
    console.log(
      "👉  Make sure APPWRITE_USER_CARDS_COLLECTION_ID is set in your .env file.",
    );
  } catch (err) {
    console.error("Fatal error during setup:", err);
    process.exit(1);
  }
}

main();
