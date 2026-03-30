/**
 * Audit Service
 * Handles system-wide audit logging for all critical actions.
 * Usage: auditService.logAction({ ... });  — fire-and-forget, never throws.
 */

"use strict";

const { ID } = require("node-appwrite");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");

// Lazy accessors — evaluated at call time so hot-reload and test overrides work
const DB = () => config.database.appwrite.databaseId;
const COLLECTION = () => config.database.appwrite.auditLogsCollectionId;

class AuditService {
  /**
   * Fire-and-forget audit write.
   * Never blocks the caller — reject is swallowed internally.
   * @param {Object} params
   * @param {string} params.actorId
   * @param {string} params.actorRole  "user" | "admin"
   * @param {string} params.action
   * @param {string} params.entity     "user" | "transaction" | "merchant" | "card" | "content"
   * @param {string} params.entityId
   * @param {object|string} [params.metadata]
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   */
  logAction({
    actorId,
    actorRole,
    action,
    entity,
    entityId,
    metadata = {},
    ipAddress = "",
    userAgent = "",
  }) {
    // Skip silently if collection not configured
    const collectionId = COLLECTION();
    if (!collectionId) return;

    // setImmediate keeps the HTTP response path clear
    setImmediate(async () => {
      try {
        await dbConn
          .getDatabases()
          .createDocument(DB(), collectionId, ID.unique(), {
            actorId: actorId || "",
            actorRole: actorRole || "user",
            action: action || "",
            entity: entity || "",
            entityId: entityId || "",
            metadata:
              typeof metadata === "string"
                ? metadata
                : JSON.stringify(metadata),
            ipAddress: ipAddress || "",
            userAgent: userAgent || "",
            createdAt: new Date().toISOString(),
          });
      } catch (_err) {
        // Audit failures are non-fatal — do not propagate
      }
    });
  }

  /**
   * Query audit logs from the collection.
   * @param {Object} filters  { actorId, actorRole, action, entity, startDate, endDate, page, limit }
   * @returns {Promise<{ logs: object[], total: number }>}
   */
  async queryLogs({
    actorId,
    actorRole,
    action,
    entity,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = {}) {
    const { Query } = require("node-appwrite");
    const queries = [];

    if (actorId) queries.push(Query.equal("actorId", actorId));
    if (actorRole) queries.push(Query.equal("actorRole", actorRole));
    if (action) queries.push(Query.equal("action", action));
    if (entity) queries.push(Query.equal("entity", entity));
    if (startDate) queries.push(Query.greaterThanEqual("createdAt", startDate));
    if (endDate) queries.push(Query.lessThanEqual("createdAt", endDate));

    queries.push(Query.orderDesc("createdAt"));
    queries.push(Query.limit(parseInt(limit)));
    queries.push(Query.offset((parseInt(page) - 1) * parseInt(limit)));

    const result = await dbConn
      .getDatabases()
      .listDocuments(DB(), COLLECTION(), queries);

    return { logs: result.documents, total: result.total };
  }
}

module.exports = new AuditService();
