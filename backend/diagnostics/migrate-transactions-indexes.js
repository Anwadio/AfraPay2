/**
 * Transactions Collection Migration: Fix un-indexable text attributes
 *
 * The `senderId` and `type` attributes were created as Appwrite `text` type
 * (unlimited-length, not indexable in MySQL). This script:
 *
 *   1. Deletes `senderId` (text) → recreates as string(36)
 *   2. Deletes `type`     (text) → recreates as string(30)
 *   3. Adds indexes for querying
 *
 * NOTE: Existing documents will lose data for these two fields after migration.
 *       New transactions will store and query correctly going forward.
 *
 * Run with:  node diagnostics/migrate-transactions-indexes.js
 */

"use strict";

const { Client, Databases } = require("node-appwrite");
const path = require("path");`nrequire("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID;

if (!databaseId || !collectionId) {
  console.error(
    "❌  Missing APPWRITE_DATABASE_ID or APPWRITE_TRANSACTIONS_COLLECTION_ID",
  );
  process.exit(1);
}

console.log("🔧  Database   :", databaseId);
console.log("🔧  Collection :", collectionId);
console.log("");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function deleteAttribute(key) {
  try {
    await databases.deleteAttribute(databaseId, collectionId, key);
    console.log(`  🗑️   deleted   ${key}`);
  } catch (e) {
    if (e.code === 404) {
      console.log(`  ⏭️   not found ${key} (skip delete)`);
    } else {
      console.error(`  ❌  delete ${key} — ${e.message}`);
    }
  }
}

async function createString(key, size, required) {
  try {
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      key,
      size,
      required,
      null,
      false,
    );
    console.log(`  ✅  string(${size}) ${key}`);
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ⏭️   string  ${key} (already exists)`);
    } else {
      console.error(`  ❌  create ${key} — ${e.message}`);
    }
  }
}

async function createIndex(key, type, attributes) {
  try {
    await databases.createIndex(
      databaseId,
      collectionId,
      key,
      type,
      attributes,
      [],
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

async function main() {
  // ── Step 1: Delete old text attributes ─────────────────────────────────────
  console.log("🗑️   Step 1: Deleting old text attributes...\n");
  await deleteAttribute("senderId");
  await deleteAttribute("type");

  console.log("\n⏳  Waiting 5 s for deletions to propagate...");
  await sleep(5000);

  // ── Step 2: Recreate as bounded string (indexable) ─────────────────────────
  console.log("\n📋  Step 2: Recreating as string attributes...\n");
  await createString("senderId", 36, true);
  await createString("type", 30, true);

  console.log("\n⏳  Waiting 5 s for new attributes to propagate...");
  await sleep(5000);

  // ── Step 3: Create indexes ──────────────────────────────────────────────────
  console.log("\n📑  Step 3: Creating indexes...\n");
  await createIndex("idx_senderId", "key", ["senderId"]);
  await createIndex("idx_type", "key", ["type"]);

  console.log("\n✅  Migration complete.");
  console.log(
    "    New send_money transactions will now be queryable by senderId.",
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
