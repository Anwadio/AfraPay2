/**
 * Notifications Collection Setup Script
 *
 * Creates all required attributes for the APPWRITE_NOTIFICATIONS_COLLECTION_ID
 * collection.  Safe to run multiple times — each attribute creation is skipped
 * if it already exists (idempotent via 409 handling).
 *
 * Run with:  node diagnostics/setup-notifications-collection.js
 *
 * Required env vars in .env:
 *   APPWRITE_ENDPOINT
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY
 *   APPWRITE_DATABASE_ID
 *   APPWRITE_NOTIFICATIONS_COLLECTION_ID
 */

"use strict";

const { Client, Databases } = require("node-appwrite");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID;

if (!databaseId || !collectionId) {
  console.error(
    "❌  Missing required env vars: APPWRITE_DATABASE_ID and/or APPWRITE_NOTIFICATIONS_COLLECTION_ID",
  );
  process.exit(1);
}

console.log("🔔  Notifications collection ID:", collectionId);
console.log("🗄️   Database ID              :", databaseId);
console.log("");

// ─── helpers ────────────────────────────────────────────────────────────────

async function createString(
  key,
  size,
  required,
  defaultValue = null,
  array = false,
) {
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

async function createIndex(key, type, attributes, orders) {
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

// ─── Wait helper (Appwrite needs time to process attribute creation) ──────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Creating attributes…\n");

  // Core notification fields
  await createString("userId", 36, true);
  await createString("type", 50, true); // transaction | security | system | payment | general
  await createString("title", 200, true);
  await createString("message", 1000, true);
  await createBoolean("read", true, false);

  // Optional fields
  await createString("link", 500, false, null); // client-side route
  await createString("targetRole", 20, false, null); // "admin" for admin-targeted notifications

  console.log("\nWaiting 3 s for Appwrite to process attributes…");
  await sleep(3000);

  console.log("\nCreating indexes…\n");

  // userId + createdAt — the primary query pattern for listing user notifications
  await createIndex(
    "idx_userId_createdAt",
    "key",
    ["userId", "$createdAt"],
    ["ASC", "DESC"],
  );

  // userId + read — for counting / filtering unread
  await createIndex(
    "idx_userId_read",
    "key",
    ["userId", "read"],
    ["ASC", "ASC"],
  );

  // targetRole — for admin notification queries
  await createIndex("idx_targetRole", "key", ["targetRole"], ["ASC"]);

  console.log("\n✅  Notifications collection setup complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
