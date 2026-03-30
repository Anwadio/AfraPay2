/**
 * NotificationController
 *
 * Manages in-app notifications for users:
 *   - list paginated notifications for the authenticated user
 *   - mark single / all notifications as read
 *   - delete a notification
 *   - static helper `createNotification()` used by other controllers/services
 *
 * Appwrite collection required (ID via env):
 *   APPWRITE_NOTIFICATIONS_COLLECTION_ID
 *
 * Document attributes:
 *   userId   string   required  — owner
 *   type     string   required  — transaction | security | system | payment | general
 *   title    string   required
 *   message  string   required
 *   read     boolean  default false
 *   link     string   optional  — client-side route to navigate to
 */

"use strict";

const { Client, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  NotFoundError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// Lazily resolved to avoid circular-require issues at module load time
const getPushToUser = () =>
  require("../services/notificationService").sendPushToUser;

// ── Appwrite client ──────────────────────────────────────────────────────────
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const db = new Databases(_client);

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const COLL = () => config.database.appwrite.notificationsCollectionId;

// ── Static helper (called by other controllers) ──────────────────────────────

/**
 * Create a notification document for a user.
 * Silently logs and swallows errors so a notification failure never blocks
 * the primary operation that triggered it.
 *
 * @param {string} userId
 * @param {"transaction"|"security"|"system"|"payment"|"general"} type
 * @param {string} title
 * @param {string} message
 * @param {string|null} [link]  client-side route, e.g. "/transactions/abc123"
 * @returns {Promise<object|null>}
 */
async function createNotification(userId, type, title, message, link = null) {
  const collectionId = COLL();
  if (!collectionId) {
    // Collection not configured — skip silently
    return null;
  }
  try {
    const data = { userId, type, title, message, read: false };
    if (link) data.link = link;
    const doc = await db.createDocument(DB(), collectionId, ID.unique(), data);

    // Fire push notification (non-blocking — never delays the caller)
    setImmediate(() => {
      getPushToUser()(userId, title, message, { type, link: link || "" }).catch(
        () => {},
      );
    });

    return doc;
  } catch (err) {
    logger.warn("Failed to create notification (non-fatal)", {
      userId,
      type,
      error: err.message,
    });
    return null;
  }
}

// ── Controller class ─────────────────────────────────────────────────────────

class NotificationController {
  /**
   * GET /notifications
   * Returns a paginated list of notifications for the authenticated user.
   * Query params: page (default 1), limit (default 20), unreadOnly (bool)
   */
  async getNotifications(req, res) {
    const { user } = req;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const unreadOnly = req.query.unreadOnly === "true";

    const collectionId = COLL();
    if (!collectionId) {
      return res.json({
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0, page, limit },
      });
    }

    try {
      const queries = [
        Query.equal("userId", user.id),
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
        Query.offset((page - 1) * limit),
      ];
      if (unreadOnly) queries.push(Query.equal("read", false));

      const unreadCountQueries = [
        Query.equal("userId", user.id),
        Query.equal("read", false),
      ];

      const [listResult, countResult, unreadResult] = await Promise.all([
        db.listDocuments(DB(), collectionId, queries),
        db.listDocuments(DB(), collectionId, [
          Query.equal("userId", user.id),
          Query.limit(1),
        ]),
        db.listDocuments(DB(), collectionId, [
          ...unreadCountQueries,
          Query.limit(1),
        ]),
      ]);

      return res.json({
        success: true,
        data: {
          notifications: listResult.documents,
          total: countResult.total,
          unreadCount: unreadResult.total,
          page,
          limit,
        },
      });
    } catch (err) {
      logger.warn(
        "getNotifications: collection query failed (schema not set up?)",
        {
          error: err.message,
        },
      );
      return res.json({
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0, page, limit },
      });
    }
  }

  /**
   * GET /notifications/unread-count
   * Fast endpoint — returns only the unread count badge number.
   */
  async getUnreadCount(req, res) {
    const { user } = req;
    const collectionId = COLL();
    if (!collectionId) {
      return res.json({ success: true, data: { unreadCount: 0 } });
    }

    try {
      const result = await db.listDocuments(DB(), collectionId, [
        Query.equal("userId", user.id),
        Query.equal("read", false),
        Query.limit(1),
      ]);
      return res.json({ success: true, data: { unreadCount: result.total } });
    } catch (err) {
      logger.warn(
        "getUnreadCount: collection query failed (schema not set up?)",
        {
          error: err.message,
        },
      );
      return res.json({ success: true, data: { unreadCount: 0 } });
    }
  }

  /**
   * PATCH /notifications/:id/read
   * Marks a single notification as read.
   */
  async markAsRead(req, res) {
    const { user } = req;
    const { id } = req.params;
    const collectionId = COLL();
    if (!collectionId) {
      return res.json({ success: true, data: { read: true } });
    }

    const doc = await db.getDocument(DB(), collectionId, id);
    if (!doc) throw new NotFoundError("Notification not found");
    if (doc.userId !== user.id) throw new AuthorizationError("Forbidden");

    if (!doc.read) {
      await db.updateDocument(DB(), collectionId, id, { read: true });
    }

    return res.json({ success: true, data: { id, read: true } });
  }

  /**
   * PATCH /notifications/mark-all-read
   * Marks all unread notifications for the user as read.
   */
  async markAllAsRead(req, res) {
    const { user } = req;
    const collectionId = COLL();
    if (!collectionId) {
      return res.json({ success: true, data: { updated: 0 } });
    }

    try {
      // Fetch all unread in batches (up to 500 per page is Appwrite's limit)
      let updated = 0;
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const result = await db.listDocuments(DB(), collectionId, [
          Query.equal("userId", user.id),
          Query.equal("read", false),
          Query.limit(batchSize),
          Query.offset(offset),
          Query.select(["$id"]),
        ]);

        if (result.documents.length === 0) break;

        await Promise.all(
          result.documents.map((doc) =>
            db.updateDocument(DB(), collectionId, doc.$id, { read: true }),
          ),
        );

        updated += result.documents.length;
        offset += batchSize;

        if (result.documents.length < batchSize) break;
      }

      return res.json({ success: true, data: { updated } });
    } catch (err) {
      logger.warn(
        "markAllAsRead: collection query failed (schema not set up?)",
        {
          error: err.message,
        },
      );
      return res.json({ success: true, data: { updated: 0 } });
    }
  }

  /**
   * DELETE /notifications/:id
   * Deletes a notification (hard delete).
   */
  async deleteNotification(req, res) {
    const { user } = req;
    const { id } = req.params;
    const collectionId = COLL();
    if (!collectionId) {
      return res.json({ success: true });
    }

    try {
      const doc = await db.getDocument(DB(), collectionId, id);
      if (!doc) throw new NotFoundError("Notification not found");
      if (doc.userId !== user.id) throw new AuthorizationError("Forbidden");

      await db.deleteDocument(DB(), collectionId, id);
      return res.json({ success: true, data: { id, deleted: true } });
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof AuthorizationError)
        throw err;
      logger.warn(
        "deleteNotification: collection query failed (schema not set up?)",
        {
          error: err.message,
        },
      );
      return res.json({ success: true, data: { id, deleted: false } });
    }
  }
}

const notificationController = new NotificationController();

module.exports = { notificationController, createNotification };
