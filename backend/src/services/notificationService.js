/**
 * Notification Service
 *
 * Shared service for:
 *   1. Admin-targeted in-app notifications (userId: "__admin__", targetRole: "admin")
 *   2. Push notifications to user devices via the Expo Push API
 *
 * All functions are non-blocking — errors are logged and swallowed so that
 * notification failures never interrupt the primary operation that triggered them.
 *
 * Notification types for admin:
 *   user_signup   — new user registered
 *   transaction   — new financial transaction processed
 *   enrollment    — user enrolled in a learning path
 *   merchant      — new merchant application / registration
 *   fraud         — transaction flagged by fraud detection
 *   system        — general system events
 */

"use strict";

const { Client, Databases, Users, ID } = require("node-appwrite");
const axios = require("axios");
const config = require("../config/environment");
const logger = require("../utils/logger");

// ── Appwrite client ──────────────────────────────────────────────────────────
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const _db = new Databases(_client);
const _users = new Users(_client);

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const COLL = () => config.database.appwrite.notificationsCollectionId;

// ── Expo Push API ─────────────────────────────────────────────────────────────
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification to a single Expo push token.
 * Silently logs and swallows errors — never blocks the caller.
 *
 * @param {string} pushToken  Expo push token, e.g. "ExponentPushToken[xxx]"
 * @param {string} title
 * @param {string} body
 * @param {object} [data]   Extra payload forwarded to the app
 */
async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken")) return;
  try {
    const headers = { "Content-Type": "application/json" };
    const accessToken = config.external?.expo?.accessToken;
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    await axios.post(
      EXPO_PUSH_URL,
      { to: pushToken, title, body, data, sound: "default", priority: "high" },
      { headers, timeout: 8000 },
    );
  } catch (err) {
    logger.warn("sendPushNotification failed (non-fatal)", {
      pushToken: pushToken.slice(0, 30) + "…",
      title,
      error: err.message,
    });
  }
}

/**
 * Look up a user's stored Expo push token then send them a push notification.
 * Token is stored under Appwrite user prefs as `expoPushToken`.
 * Silently swallows errors.
 *
 * @param {string} userId
 * @param {string} title
 * @param {string} body
 * @param {object} [data]
 */
async function sendPushToUser(userId, title, body, data = {}) {
  if (!userId) return;
  try {
    const user = await _users.get(userId);
    const token = user?.prefs?.expoPushToken;
    if (token) {
      await sendPushNotification(token, title, body, data);
    }
  } catch (err) {
    logger.warn("sendPushToUser: token lookup failed (non-fatal)", {
      userId,
      error: err.message,
    });
  }
}

/**
 * Sentinel userId stored on admin notifications so they can be distinguished
 * from user-scoped notifications and queried efficiently.
 */
const ADMIN_USER_ID = "__admin__";

/**
 * Create an admin-targeted notification.
 * Non-blocking — swallows errors so it never blocks the calling operation.
 *
 * @param {"user_signup"|"transaction"|"enrollment"|"merchant"|"fraud"|"system"} type
 * @param {string} title
 * @param {string} message
 * @param {object} [options]
 * @param {string|null} [options.link]  Client-side admin route, e.g. "/users/abc123"
 * @returns {Promise<object|null>}
 */
async function createAdminNotification(type, title, message, options = {}) {
  const collectionId = COLL();
  if (!collectionId) {
    return null;
  }
  try {
    const data = {
      userId: ADMIN_USER_ID,
      type,
      title,
      message,
      read: false,
      targetRole: "admin",
    };
    if (options.link) data.link = options.link;

    const doc = await _db.createDocument(DB(), collectionId, ID.unique(), data);
    return doc;
  } catch (err) {
    logger.warn("Failed to create admin notification (non-fatal)", {
      type,
      title,
      error: err.message,
    });
    return null;
  }
}

module.exports = {
  createAdminNotification,
  sendPushNotification,
  sendPushToUser,
  ADMIN_USER_ID,
};
