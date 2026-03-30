/**
 * Add targetRole attribute to NOTIFICATIONS collection
 *
 * This script adds an optional 'targetRole' string attribute to the existing
 * notifications collection so that admin-targeted notifications can be stored
 * alongside user notifications and efficiently queried by role.
 *
 * Run once:
 *   node diagnostics/add-notification-targetrole.js
 *
 * The attribute is optional with no default — existing user notification
 * documents are unaffected and will simply lack the field.
 */

"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { Client, Databases } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID;

async function run() {
  if (!DATABASE_ID || !COLLECTION_ID) {
    console.error(
      "Missing APPWRITE_DATABASE_ID or APPWRITE_NOTIFICATIONS_COLLECTION_ID in .env",
    );
    process.exit(1);
  }

  console.log("Adding targetRole attribute to notifications collection...");
  try {
    await db.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      "targetRole", // attribute key
      20, // max size ("user" or "admin" — 20 chars is enough)
      false, // required = false
      null, // default = null
      false, // array = false
    );
    console.log("✓ targetRole attribute created.");
    console.log(
      "  Note: Appwrite indexes attributes asynchronously. Wait ~30 s before querying.",
    );
  } catch (err) {
    if (err.code === 409) {
      console.log("✓ targetRole attribute already exists — nothing to do.");
    } else {
      console.error("✗ Failed:", err.message);
      process.exit(1);
    }
  }

  // Also create an index on targetRole for efficient admin queries
  console.log("Creating index on targetRole...");
  try {
    await db.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      "idx_targetRole",
      "key",
      ["targetRole"],
      ["ASC"],
    );
    console.log("✓ Index on targetRole created.");
  } catch (err) {
    if (err.code === 409) {
      console.log("✓ Index already exists — nothing to do.");
    } else {
      console.warn("⚠ Index creation failed (non-fatal):", err.message);
    }
  }

  console.log("Done.");
}

run();
