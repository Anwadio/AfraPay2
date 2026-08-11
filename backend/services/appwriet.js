/**
 * Appwrite Client (Single Source of Truth)
 * All other modules should import from here.
 */

const { ID, Query } = require("node-appwrite");
const { databaseManager } = require("../src/database/connection");

module.exports.db = databaseManager.databases;
module.exports.users = databaseManager.users;
module.exports.account = databaseManager.account;
module.exports.ID = ID;
module.exports.Query = Query;
