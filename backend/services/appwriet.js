/**
 * Appwrite Client (Single Source of Truth)
 * All other modules should import from here.
 */

const { ID, Query } = require("node-appwrite");
const { databaseManager } = require("../src/database/connection");

function ensureAppwriteInitialized(clientName) {
  const client = databaseManager[clientName];
  if (!client) {
    throw new Error(
      `Appwrite ${clientName} client is not initialized. ` +
        "Ensure Appwrite is reachable and backend startup completed successfully.",
    );
  }
  return client;
}

Object.defineProperty(module.exports, "db", {
  enumerable: true,
  get: () => ensureAppwriteInitialized("databases"),
});

Object.defineProperty(module.exports, "users", {
  enumerable: true,
  get: () => ensureAppwriteInitialized("users"),
});

Object.defineProperty(module.exports, "account", {
  enumerable: true,
  get: () => ensureAppwriteInitialized("account"),
});

module.exports.ID = ID;
module.exports.Query = Query;
