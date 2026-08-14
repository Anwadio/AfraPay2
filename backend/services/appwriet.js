/**
 * Appwrite Client (Single Source of Truth)
 * All other modules should import from here.
 */

const { ID, Query } = require("node-appwrite");
const { databaseManager } = require("../src/database/connection");

function createUnavailableAppwriteClient(clientName) {
  const message =
    `Appwrite ${clientName} client is not initialized. ` +
    "Ensure Appwrite is reachable and backend startup completed successfully.";

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return undefined;
        if (prop === "inspect") return undefined;

        const methodName = String(prop);
        return (...args) => {
          const err = new Error(message);
          if (args.length > 0 && typeof args[args.length - 1] === "function") {
            args[args.length - 1](err);
            return undefined;
          }
          return Promise.reject(err);
        };
      },
      apply() {
        return Promise.reject(new Error(message));
      },
    },
  );
}

function ensureAppwriteInitialized(clientName) {
  if (databaseManager && typeof databaseManager.ensureAppwriteClients === "function") {
    databaseManager.ensureAppwriteClients();
  }

  const client = databaseManager?.[clientName];
  if (!client) {
    return createUnavailableAppwriteClient(clientName);
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
