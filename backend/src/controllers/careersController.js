/**
 * CareersController
 *
 * Serves all data for the Careers page and provides admin CRUD for open roles.
 *
 * Appwrite collection used:
 *   APPWRITE_CAREERS_COLLECTION_ID  — one document per open role
 *
 * Static content (departments, benefits, values, levelColors) is served as
 * constants from this file.  They can be promoted to DB records later via a
 * migration without touching the public API shape.
 *
 * Public endpoints (no auth required):
 *   GET /api/v1/careers              — full page payload
 *   GET /api/v1/careers/roles        — roles only (supports ?dept & ?search)
 *   GET /api/v1/careers/roles/:id    — single role
 *
 * Admin endpoints (requires auth + admin role):
 *   POST   /api/v1/careers/roles           — create role
 *   PUT    /api/v1/careers/roles/:id       — full update
 *   PATCH  /api/v1/careers/roles/:id/status — toggle isActive
 *   DELETE /api/v1/careers/roles/:id       — delete role
 */

"use strict";

const { Client, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
} = require("../middleware/monitoring/errorHandler");

// ── Appwrite client ───────────────────────────────────────────────────────────
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const db = new Databases(_client);

const DB = () => config.database.appwrite.databaseId;
const COL = () => config.database.appwrite.careersCollectionId;

// ── Static content ────────────────────────────────────────────────────────────
// These change infrequently and are managed via code.  To make them fully
// admin-editable, seed them into their own Appwrite collection and replace
// these constants with DB queries.

const STATIC_DEPARTMENTS = [
  "All",
  "Engineering",
  "Product",
  "Operations",
  "Finance",
  "Marketing",
  "Support",
];

const STATIC_BENEFITS = [
  {
    icon: "zap",
    title: "Competitive Salary",
    description:
      "Salaries benchmarked to the top quartile of the East African tech market, reviewed annually.",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: "shield",
    title: "Health Insurance",
    description:
      "Comprehensive medical, dental, and vision cover for you and your immediate family.",
    color: "bg-success-50 text-success-600",
  },
  {
    icon: "globe",
    title: "Flexible & Remote",
    description:
      "Many roles are fully remote or hybrid. We trust you to do great work wherever you are.",
    color: "bg-secondary-50 text-secondary-600",
  },
  {
    icon: "star",
    title: "Equity & Bonuses",
    description:
      "All full-time employees receive equity options and are eligible for performance bonuses.",
    color: "bg-warning-50 text-warning-600",
  },
  {
    icon: "book",
    title: "Learning Budget",
    description:
      "SSP 5,000 / year per employee for courses, conferences, books, and certifications.",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: "users",
    title: "Mission-Driven Team",
    description:
      "Work alongside people genuinely passionate about financial inclusion across Africa.",
    color: "bg-success-50 text-success-600",
  },
];

const STATIC_VALUES = [
  {
    icon: "zap",
    color: "bg-primary-50 text-primary-600",
    title: "Move Fast",
    body: "We ship, learn, and iterate. Speed with quality is our default.",
  },
  {
    icon: "checkCircle",
    color: "bg-success-50 text-success-600",
    title: "Own It",
    body: "Every team member takes full ownership of their work and its impact.",
  },
  {
    icon: "globe",
    color: "bg-secondary-50 text-secondary-600",
    title: "Africa First",
    body: "Everything we build is designed for African realities, not adapted from elsewhere.",
  },
  {
    icon: "shield",
    color: "bg-warning-50 text-warning-600",
    title: "Radical Honesty",
    body: "We give direct, respectful feedback and expect the same in return.",
  },
];

const STATIC_LEVEL_COLORS = {
  "Entry-level": "bg-success-100 text-success-700",
  "Mid-level": "bg-primary-100 text-primary-700",
  Senior: "bg-secondary-100 text-secondary-700",
  Lead: "bg-warning-100 text-warning-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise an Appwrite document to the shape the frontend expects.
 */
function formatRole(doc) {
  return {
    id: doc.$id,
    title: doc.title,
    department: doc.department,
    location: doc.location,
    type: doc.type,
    level: doc.level,
    description: doc.description,
    tags: doc.tags || [],
    isActive: doc.isActive,
    order: doc.order ?? 0,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ── Public controllers ────────────────────────────────────────────────────────

/**
 * GET /api/v1/careers
 * Returns full page payload: active roles + static config.
 * Falls back to an empty roles array with a message when the collection
 * is unreachable or empty.
 */
exports.getCareersPage = async (req, res) => {
  let roles = [];
  let rolesError = null;

  try {
    const collectionId = COL();
    if (!collectionId) throw new Error("Careers collection ID not configured");

    const result = await db.listDocuments(DB(), collectionId, [
      Query.equal("isActive", true),
      Query.orderAsc("order"),
      Query.limit(100),
    ]);

    roles = result.documents.map(formatRole);
  } catch (err) {
    logger.warn(
      "Failed to fetch careers roles from DB — returning fallback:",
      err.message,
    );
    rolesError =
      "We're currently updating our open roles. Please check back shortly.";
  }

  return res.success({
    roles,
    departments: STATIC_DEPARTMENTS,
    benefits: STATIC_BENEFITS,
    values: STATIC_VALUES,
    levelColors: STATIC_LEVEL_COLORS,
    ...(rolesError && { rolesNotice: rolesError }),
  });
};

/**
 * GET /api/v1/careers/roles
 * Returns active roles, optionally filtered by dept or search text.
 * Query params: dept, search, limit, offset
 */
exports.listRoles = async (req, res) => {
  const { dept, search, limit = 50, offset = 0 } = req.query;
  const collectionId = COL();

  if (!collectionId) {
    return res.success({
      roles: [],
      total: 0,
      notice: "Careers collection not configured.",
    });
  }

  const filters = [Query.equal("isActive", true), Query.orderAsc("order")];

  if (dept && dept !== "All") {
    filters.push(Query.equal("department", dept));
  }

  if (search) {
    filters.push(Query.search("title", search));
  }

  filters.push(Query.limit(Math.min(Number(limit), 100)));
  filters.push(Query.offset(Number(offset)));

  let roles = [];
  let total = 0;
  let notice = null;

  try {
    const result = await db.listDocuments(DB(), collectionId, filters);
    roles = result.documents.map(formatRole);
    total = result.total;
  } catch (err) {
    logger.warn("listRoles failed:", err.message);
    notice =
      "We're currently updating our open roles. Please check back shortly.";
  }

  return res.success({ roles, total, ...(notice && { notice }) });
};

/**
 * GET /api/v1/careers/roles/:id
 * Returns a single active role by Appwrite document ID.
 */
exports.getRole = async (req, res) => {
  const { id } = req.params;
  const collectionId = COL();

  if (!collectionId) throw new NotFoundError("Role not found");

  const doc = await db.getDocument(DB(), collectionId, id);

  if (!doc.isActive) throw new NotFoundError("Role not found");

  return res.success({ role: formatRole(doc) });
};

// ── Admin controllers ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/careers/roles
 * Create a new open role.  Admin only.
 */
exports.createRole = async (req, res) => {
  const {
    title,
    department,
    location,
    type,
    level,
    description,
    tags = [],
    order = 0,
  } = req.body;
  const collectionId = COL();

  if (!collectionId)
    throw new ValidationError("Careers collection not configured");

  const doc = await db.createDocument(DB(), collectionId, ID.unique(), {
    title: title.trim(),
    department: department.trim(),
    location: location.trim(),
    type: type.trim(),
    level: level.trim(),
    description: description.trim(),
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()) : [],
    isActive: true,
    order: Number(order),
  });

  logger.info(
    `Admin ${req.user?.userId} created career role: ${doc.$id} — ${title}`,
  );

  return res.status(201).json({
    success: true,
    data: { role: formatRole(doc) },
  });
};

/**
 * PUT /api/v1/careers/roles/:id
 * Full update of an existing role.  Admin only.
 */
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    department,
    location,
    type,
    level,
    description,
    tags,
    order,
    isActive,
  } = req.body;
  const collectionId = COL();

  if (!collectionId) throw new NotFoundError("Role not found");

  // Verify the document exists
  await db.getDocument(DB(), collectionId, id);

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (department !== undefined) updates.department = department.trim();
  if (location !== undefined) updates.location = location.trim();
  if (type !== undefined) updates.type = type.trim();
  if (level !== undefined) updates.level = level.trim();
  if (description !== undefined) updates.description = description.trim();
  if (tags !== undefined)
    updates.tags = Array.isArray(tags) ? tags.map((t) => String(t).trim()) : [];
  if (order !== undefined) updates.order = Number(order);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  const updated = await db.updateDocument(DB(), collectionId, id, updates);

  logger.info(`Admin ${req.user?.userId} updated career role: ${id}`);

  return res.success({ role: formatRole(updated) });
};

/**
 * PATCH /api/v1/careers/roles/:id/status
 * Toggle the isActive flag on a role.  Admin only.
 */
exports.toggleRoleStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const collectionId = COL();

  if (!collectionId) throw new NotFoundError("Role not found");
  if (typeof isActive !== "boolean")
    throw new ValidationError("isActive must be a boolean");

  const updated = await db.updateDocument(DB(), collectionId, id, { isActive });

  logger.info(`Admin ${req.user?.userId} set role ${id} isActive=${isActive}`);

  return res.success({ role: formatRole(updated) });
};

/**
 * DELETE /api/v1/careers/roles/:id
 * Permanently delete a role.  Admin only.
 */
exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  const collectionId = COL();

  if (!collectionId) throw new NotFoundError("Role not found");

  // Verify it exists before deleting
  await db.getDocument(DB(), collectionId, id);
  await db.deleteDocument(DB(), collectionId, id);

  logger.info(`Admin ${req.user?.userId} deleted career role: ${id}`);

  return res.success({ message: "Role deleted successfully" });
};

/**
 * GET /api/v1/careers/admin/roles
 * List ALL roles (active + inactive) for admin dashboard.
 */
exports.adminListRoles = async (req, res) => {
  const { dept, limit = 100, offset = 0 } = req.query;
  const collectionId = COL();

  if (!collectionId) {
    return res.success({ roles: [], total: 0 });
  }

  const filters = [
    Query.orderAsc("order"),
    Query.limit(Math.min(Number(limit), 200)),
    Query.offset(Number(offset)),
  ];

  if (dept && dept !== "All") {
    filters.push(Query.equal("department", dept));
  }

  const result = await db.listDocuments(DB(), collectionId, filters);

  return res.success({
    roles: result.documents.map(formatRole),
    total: result.total,
  });
};
