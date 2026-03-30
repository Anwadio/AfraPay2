/**
 * Subscriptions Collections Setup Script
 *
 * Creates the three Appwrite collections required for the subscription system:
 *   1. SUBSCRIPTION_PLANS  — plan definitions (name, price, billing cycle, …)
 *   2. SUBSCRIPTIONS       — per-user active / historical subscriptions
 *   3. BILLING_HISTORY     — every billing attempt for auditability
 *
 * Safe to run multiple times — each attribute / index creation is skipped if it
 * already exists (idempotent, 409 == already exists).
 *
 * Usage:
 *   node diagnostics/setup-subscriptions-collection.js
 *
 * Prerequisites: fill in .env with the three new collection IDs BEFORE running:
 *   APPWRITE_SUBSCRIPTION_PLANS_COLLECTION_ID=<id>
 *   APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=<id>
 *   APPWRITE_BILLING_HISTORY_COLLECTION_ID=<id>
 *
 * Create the collections first in the Appwrite Console (no permissions needed
 * other than the server API key you already have), then copy the IDs here.
 */

"use strict";

const path = require("path");
const { Client, Databases } = require("node-appwrite");
// .env lives in backend/, one level above this diagnostics/ folder
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const COLLECTION_IDS = {
  plans: process.env.APPWRITE_SUBSCRIPTION_PLANS_COLLECTION_ID,
  subscriptions: process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
  billingHistory: process.env.APPWRITE_BILLING_HISTORY_COLLECTION_ID,
};

// Validate env
const missing = Object.entries(COLLECTION_IDS)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (!databaseId || missing.length) {
  console.error("❌  Missing required env vars:");
  if (!databaseId) console.error("    APPWRITE_DATABASE_ID");
  missing.forEach((k) => {
    const MAP = {
      plans: "APPWRITE_SUBSCRIPTION_PLANS_COLLECTION_ID",
      subscriptions: "APPWRITE_SUBSCRIPTIONS_COLLECTION_ID",
      billingHistory: "APPWRITE_BILLING_HISTORY_COLLECTION_ID",
    };
    console.error("   ", MAP[k]);
  });
  process.exit(1);
}

// ─── generic helpers (collection-scoped) ─────────────────────────────────────

function makeHelpers(collectionId) {
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
      if (e.code === 409) console.log(`  ⏭️   string  ${key} (exists)`);
      else console.error(`  ❌  string  ${key} — ${e.message}`);
    }
  }

  async function createFloat(
    key,
    required,
    min = null,
    max = null,
    defaultValue = null,
  ) {
    try {
      await databases.createFloatAttribute(
        databaseId,
        collectionId,
        key,
        required,
        min,
        max,
        defaultValue,
      );
      console.log(`  ✅  float   ${key}`);
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️   float   ${key} (exists)`);
      else console.error(`  ❌  float   ${key} — ${e.message}`);
    }
  }

  async function createInteger(
    key,
    required,
    min = null,
    max = null,
    defaultValue = null,
  ) {
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
      if (e.code === 409) console.log(`  ⏭️   integer ${key} (exists)`);
      else console.error(`  ❌  integer ${key} — ${e.message}`);
    }
  }

  async function createBoolean(key, required, defaultValue = null) {
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
      if (e.code === 409) console.log(`  ⏭️   boolean ${key} (exists)`);
      else console.error(`  ❌  boolean ${key} — ${e.message}`);
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
      if (e.code === 409) console.log(`  ⏭️   index   ${key} (exists)`);
      else console.error(`  ❌  index   ${key} — ${e.message}`);
    }
  }

  return {
    createString,
    createFloat,
    createInteger,
    createBoolean,
    createIndex,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1.  SUBSCRIPTION PLANS
// ═══════════════════════════════════════════════════════════════════════════

async function setupPlansCollection() {
  const col = COLLECTION_IDS.plans;
  console.log(`\n📋  [SUBSCRIPTION_PLANS]  ${col}`);

  const { createString, createFloat, createBoolean, createIndex } =
    makeHelpers(col);

  await createString("name", 100, true);
  await createString("description", 500, false);
  await createFloat("price", true, 0.01, 1_000_000);
  await createString("currency", 10, true); // KES | USD | EUR …
  await createString("billingCycle", 20, true); // daily | weekly | monthly | yearly
  await createBoolean("isActive", false, true); // default true; required=false required by Appwrite when defaultValue is set
  await createString("createdAt", 50, true);
  await createString("updatedAt", 50, true);

  console.log("\n📑  [SUBSCRIPTION_PLANS] indexes");

  await createIndex("idx_active", "key", ["isActive"], ["ASC"]);
  await createIndex(
    "idx_currency_cycle",
    "key",
    ["currency", "billingCycle"],
    ["ASC", "ASC"],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2.  SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function setupSubscriptionsCollection() {
  const col = COLLECTION_IDS.subscriptions;
  console.log(`\n📋  [SUBSCRIPTIONS]  ${col}`);

  const {
    createString,
    createFloat,
    createInteger,
    createBoolean,
    createIndex,
  } = makeHelpers(col);

  // Owner
  await createString("userId", 255, true);

  // Plan snapshot (stored at subscription time; stable even if plan changes)
  await createString("planId", 50, true);
  await createString("planName", 255, true);
  await createFloat("planPrice", true, 0.01);
  await createString("planCurrency", 10, true);
  await createString("planBillingCycle", 20, true);

  // State machine: active | paused | canceled | past_due
  await createString("status", 20, false, "active"); // default "active"; required=false required by Appwrite when defaultValue is set

  // Payment method
  await createString("paymentMethod", 10, true); // card | wallet
  await createString("cardId", 50, false); // required when paymentMethod=card

  // Scheduling
  await createString("startDate", 50, true);
  await createString("nextBillingDate", 50, true);
  await createString("lastBilledAt", 50, false);

  // Retry tracking
  await createInteger("retryCount", false, 0, 10, 0); // default 0; required=false required by Appwrite when defaultValue is set

  // Lifecycle timestamps
  await createString("canceledAt", 50, false);
  await createString("pausedAt", 50, false);
  await createString("createdAt", 50, true);
  await createString("updatedAt", 50, true);

  console.log("\n📑  [SUBSCRIPTIONS] indexes");

  await createIndex("idx_userId", "key", ["userId"], ["ASC"]);
  await createIndex("idx_status", "key", ["status"], ["ASC"]);
  await createIndex("idx_nextBillingDate", "key", ["nextBillingDate"], ["ASC"]);
  // Composite for billing engine: active subs due for charging
  await createIndex(
    "idx_status_nextBilling",
    "key",
    ["status", "nextBillingDate"],
    ["ASC", "ASC"],
  );
  // Prevent duplicate active subscription for same user+plan
  await createIndex(
    "idx_userId_planId_status",
    "key",
    ["userId", "planId", "status"],
    ["ASC", "ASC", "ASC"],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3.  BILLING HISTORY
// ═══════════════════════════════════════════════════════════════════════════

async function setupBillingHistoryCollection() {
  const col = COLLECTION_IDS.billingHistory;
  console.log(`\n📋  [BILLING_HISTORY]  ${col}`);

  const { createString, createFloat, createInteger, createIndex } =
    makeHelpers(col);

  await createString("subscriptionId", 50, true);
  await createString("planId", 50, true);
  await createString("userId", 255, true);

  await createFloat("amount", true, 0.01);
  await createString("currency", 10, true);

  // success | failed
  await createString("status", 20, true);

  // Populated on success
  await createString("transactionId", 50, false);

  // 1-based attempt number within the billing cycle
  await createInteger("attemptNumber", false, 1, 10, 1); // default 1; required=false required by Appwrite when defaultValue is set

  // Idempotency key: "{subscriptionId}:{YYYY-MM-DD}"
  await createString("billingPeriodKey", 100, true);

  await createString("failureReason", 500, false);
  await createString("createdAt", 50, true);

  console.log("\n📑  [BILLING_HISTORY] indexes");

  await createIndex("idx_subscriptionId", "key", ["subscriptionId"], ["ASC"]);
  await createIndex("idx_userId", "key", ["userId"], ["ASC"]);
  await createIndex("idx_status", "key", ["status"], ["ASC"]);
  // Idempotency: unique per billing period key
  await createIndex(
    "idx_billingPeriodKey",
    "unique",
    ["billingPeriodKey"],
    ["ASC"],
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀  Setting up subscription collections");
  console.log("    Database  :", databaseId);

  try {
    await setupPlansCollection();
  } catch (e) {
    console.error("Error setting up plans collection:", e.message);
  }

  try {
    await setupSubscriptionsCollection();
  } catch (e) {
    console.error("Error setting up subscriptions collection:", e.message);
  }

  try {
    await setupBillingHistoryCollection();
  } catch (e) {
    console.error("Error setting up billing history collection:", e.message);
  }

  console.log("\n✅  Done — all subscription collections configured.");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
