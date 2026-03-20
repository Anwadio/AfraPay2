/**
 * Setup Applications Collection Attributes
 *
 * Run once to create all required attributes on the existing Appwrite
 * APPWRITE_APPLICATIONS_COLLECTION_ID collection.
 *
 * Usage:
 *   node diagnostics/setup-applications-collection.js
 *
 * It is safe to re-run — existing attributes are skipped gracefully.
 */

"use strict";

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const { Client, Databases } = require("node-appwrite");

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_APPLICATIONS_COLLECTION_ID,
} = process.env;

// ── Validate env ─────────────────────────────────────────────────────────────
const missing = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_APPLICATIONS_COLLECTION_ID",
].filter((k) => !process.env[k]);

if (missing.length) {
  console.error("❌  Missing environment variables:", missing.join(", "));
  process.exit(1);
}

// ── Appwrite client ───────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const db = new Databases(client);
const DB_ID = APPWRITE_DATABASE_ID;
const COL_ID = APPWRITE_APPLICATIONS_COLLECTION_ID;

// ── Helper — skip if attribute already exists ─────────────────────────────────
async function safeCreate(label, fn) {
  try {
    await fn();
    console.log(`  ✅  ${label}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`  ⏭️   ${label} — already exists, skipped`);
    } else {
      console.error(`  ❌  ${label} — ${err.message}`);
      throw err;
    }
  }
}

// ── Attribute definitions ─────────────────────────────────────────────────────
async function createAttributes() {
  console.log(`\n📋  Setting up attributes on collection: ${COL_ID}\n`);

  // applicantName — required, max 100 chars
  await safeCreate("applicantName (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "applicantName", 100, true),
  );

  // applicantEmail — required, max 100 chars
  await safeCreate("applicantEmail (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "applicantEmail", 100, true),
  );

  // applicantPhone — optional, max 20 chars
  await safeCreate("applicantPhone (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "applicantPhone", 20, false),
  );

  // roleId — required, references careers collection
  await safeCreate("roleId (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "roleId", 50, true),
  );

  // roleTitle — required, denormalized for easier access, max 200 chars
  await safeCreate("roleTitle (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "roleTitle", 200, true),
  );

  // coverLetter — required, max 5000 chars
  await safeCreate("coverLetter (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "coverLetter", 5000, true),
  );

  // resumeText — optional, max 10000 chars
  await safeCreate("resumeText (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "resumeText", 10000, false),
  );

  // linkedinProfile — optional, max 200 chars
  await safeCreate("linkedinProfile (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "linkedinProfile", 200, false),
  );

  // portfolioUrl — optional, max 200 chars
  await safeCreate("portfolioUrl (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "portfolioUrl", 200, false),
  );

  // status — required, enum: pending, reviewing, interviewed, accepted, rejected
  await safeCreate("status (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "status", 20, true),
  );

  // notes — optional admin notes, max 2000 chars
  await safeCreate("notes (string)", () =>
    db.createStringAttribute(DB_ID, COL_ID, "notes", 2000, false),
  );

  // ── Indexes for common queries ────────────────────────────────────────────
  console.log("\n📑  Creating indexes…\n");

  await safeCreate("index: applicantEmail", () =>
    db.createIndex(DB_ID, COL_ID, "idx_applicantEmail", "key", [
      "applicantEmail",
    ]),
  );

  await safeCreate("index: roleId", () =>
    db.createIndex(DB_ID, COL_ID, "idx_roleId", "key", ["roleId"]),
  );

  await safeCreate("index: status", () =>
    db.createIndex(DB_ID, COL_ID, "idx_status", "key", ["status"]),
  );

  await safeCreate("index: createdAt", () =>
    db.createIndex(DB_ID, COL_ID, "idx_created", "key", ["$createdAt"]),
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await createAttributes();
    console.log("\n🎉  Applications collection setup complete!\n");
    console.log("📝  Available application statuses:");
    console.log("    • pending    — New application (default)");
    console.log("    • reviewing  — Under review by hiring team");
    console.log("    • interviewed— Interview scheduled/completed");
    console.log("    • accepted   — Application accepted");
    console.log("    • rejected   — Application declined\n");
  } catch (err) {
    console.error("\n💥  Setup failed:", err.message);
    process.exit(1);
  }
})();
