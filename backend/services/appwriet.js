/**
 * Appwrite Client (Single Source of Truth)
 * All other modules should import from here.
 */

const { ID, Query } = require("node-appwrite");
const { databaseManager } = require("../src/database/connection");

Object.defineProperty(module.exports, "db", {
  enumerable: true,
  get: () => databaseManager.databases,
});

Object.defineProperty(module.exports, "users", {
  enumerable: true,
  get: () => databaseManager.users,
});

Object.defineProperty(module.exports, "account", {
  enumerable: true,
  get: () => databaseManager.account,
});

module.exports.ID = ID;
module.exports.Query = Query;
