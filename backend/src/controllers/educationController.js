/**
 * EducationController
 *
 * Manages all education content delivery and learning-management operations:
 *
 *   Content management  — CRUD on articles, videos, quizzes, tools
 *   Categories          — taxonomy for content and learning paths
 *   Learning paths      — ordered sequences of content items
 *   Enrolment           — user joins a learning path
 *   Progress tracking   — per-item and per-path completion state
 *   Bookmarks           — user saves a content item
 *   Search & discovery  — full-text search, filter, featured content
 *   Admin CMS           — create / update / publish / unpublish / delete
 *
 * Access-control model
 * ────────────────────
 *   GET  /content, /paths, /categories  → any authenticated user
 *   GET  /content/:id                   → authenticated; premium items require role:'premium' or 'admin'
 *   POST /enroll, /progress, /bookmarks → authenticated user (own records only)
 *   POST/PUT/DELETE (admin)             → role:'admin' or 'super_admin' enforced in routes
 *
 * Appwrite collections required (IDs via env):
 *   APPWRITE_EDUCATION_CONTENT_COLLECTION_ID
 *   APPWRITE_EDUCATION_CATEGORIES_COLLECTION_ID
 *   APPWRITE_LEARNING_PATHS_COLLECTION_ID
 *   APPWRITE_ENROLLMENTS_COLLECTION_ID
 *   APPWRITE_PROGRESS_COLLECTION_ID
 *   APPWRITE_BOOKMARKS_COLLECTION_ID
 *   APPWRITE_CONTENT_STORAGE_BUCKET_ID  (Appwrite Storage for thumbnails / videos)
 */

"use strict";

const { Client, Databases, Storage, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} = require("../middleware/monitoring/errorHandler");

// ── Appwrite client ──────────────────────────────────────────────────────────
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const _db = new Databases(_client);
const _storage = new Storage(_client);

// ── Collection IDs ────────────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const COL = {
  content: () => config.database.appwrite.educationContentCollectionId,
  categories: () => config.database.appwrite.educationCategoriesCollectionId,
  paths: () => config.database.appwrite.learningPathsCollectionId,
  enrollments: () => config.database.appwrite.enrollmentsCollectionId,
  progress: () => config.database.appwrite.progressCollectionId,
  bookmarks: () => config.database.appwrite.bookmarksCollectionId,
};
const BUCKET = () => config.database.appwrite.contentStorageBucketId;

// ── Constants ─────────────────────────────────────────────────────────────────
const CONTENT_TYPES = [
  "article",
  "video",
  "quiz",
  "tool",
  "infographic",
  "podcast",
];
const DIFFICULTY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "all_levels",
];
const CONTENT_STATUSES = ["draft", "published", "archived"];

// ── Helper: require non-empty collection ID ──────────────────────────────────
function requireCollection(id, name) {
  if (!id) {
    const err = new Error(
      `Education collection not configured: ${name}. Set the env variable.`,
    );
    err.statusCode = 503;
    err.code = "COLLECTION_NOT_CONFIGURED";
    err.isOperational = true;
    throw err;
  }
}

// ── Helper: get userId from req ───────────────────────────────────────────────
function uid(req) {
  return req.user?.id || req.user?.$id;
}

// ── Helper: paginate Appwrite response ───────────────────────────────────────
function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "20", 10)),
  );
  return { page, limit, offset: (page - 1) * limit };
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTENT
// ═════════════════════════════════════════════════════════════════════════════

class EducationController {
  // ── GET /education/content ─────────────────────────────────────────────────
  async listContent(req, res) {
    requireCollection(COL.content(), "content");

    const { page, limit, offset } = paginate(req);
    const {
      category,
      type,
      level,
      featured,
      search,
      tags,
      sortBy = "publishedAt",
      order = "desc",
    } = req.query;

    const queries = [
      Query.equal("status", "published"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    if (category) queries.push(Query.equal("categorySlug", category));
    if (type) queries.push(Query.equal("type", type));
    if (level) queries.push(Query.equal("level", level));
    if (featured === "true") queries.push(Query.equal("featured", true));
    if (search) queries.push(Query.search("title", search));
    if (tags) queries.push(Query.contains("tags", tags.split(",")));

    const validSortFields = [
      "publishedAt",
      "views",
      "likes",
      "title",
      "durationMinutes",
    ];
    if (validSortFields.includes(sortBy)) {
      queries.push(
        order === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
      );
    }

    const result = await _db.listDocuments(DB(), COL.content(), queries);

    // Filter out premium content bodies for non-premium users
    const userRole = req.user?.role || "user";
    const items = result.documents.map((doc) =>
      this._sanitiseContentForRole(doc, userRole, false),
    );

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  }

  // ── GET /education/content/:contentId ─────────────────────────────────────
  async getContent(req, res) {
    requireCollection(COL.content(), "content");

    const { contentId } = req.params;
    let doc;
    try {
      doc = await _db.getDocument(DB(), COL.content(), contentId);
    } catch {
      throw new NotFoundError("Content item");
    }

    if (doc.status !== "published") {
      if (!["admin", "super_admin"].includes(req.user?.role)) {
        throw new NotFoundError("Content item");
      }
    }

    const userRole = req.user?.role || "user";
    if (
      doc.isPremium &&
      !["premium", "admin", "super_admin"].includes(userRole)
    ) {
      throw new AuthorizationError(
        "This content requires a premium membership. Upgrade to access it.",
      );
    }

    // Increment view counter (fire-and-forget; don't await to keep response fast)
    _db
      .updateDocument(DB(), COL.content(), contentId, {
        views: (doc.views || 0) + 1,
      })
      .catch(() => {});

    res.json({
      success: true,
      data: this._sanitiseContentForRole(doc, userRole, true),
    });
  }

  // ── GET /education/content/featured ───────────────────────────────────────
  async getFeaturedContent(req, res) {
    requireCollection(COL.content(), "content");

    const result = await _db.listDocuments(DB(), COL.content(), [
      Query.equal("status", "published"),
      Query.equal("featured", true),
      Query.orderDesc("publishedAt"),
      Query.limit(10),
    ]);

    const userRole = req.user?.role || "user";
    res.json({
      success: true,
      data: result.documents.map((d) =>
        this._sanitiseContentForRole(d, userRole, false),
      ),
    });
  }

  // ── POST /education/content (admin) ───────────────────────────────────────
  async createContent(req, res) {
    requireCollection(COL.content(), "content");

    const {
      title,
      body,
      excerpt,
      type,
      categorySlug,
      level,
      tags = [],
      durationMinutes,
      videoUrl,
      isPremium = false,
      featured = false,
      thumbnailFileId,
    } = req.body;

    const slug = this._toSlug(title) + "-" + Date.now();

    const doc = await _db.createDocument(DB(), COL.content(), ID.unique(), {
      title,
      slug,
      body,
      excerpt: excerpt || body.slice(0, 200),
      type,
      categorySlug: categorySlug || "",
      level,
      tags,
      durationMinutes: durationMinutes || 0,
      videoUrl: videoUrl || null,
      isPremium,
      featured,
      thumbnailFileId: thumbnailFileId || null,
      status: "draft",
      authorId: uid(req),
      authorName: req.user?.name || req.user?.firstName || "Admin",
      views: 0,
      likes: 0,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.audit("EDUCATION_CONTENT_CREATED", uid(req), {
      contentId: doc.$id,
      title,
    });

    res
      .status(201)
      .json({
        success: true,
        data: doc,
        message: "Content created successfully",
      });
  }

  // ── PUT /education/content/:contentId (admin) ─────────────────────────────
  async updateContent(req, res) {
    requireCollection(COL.content(), "content");

    const { contentId } = req.params;
    try {
      await _db.getDocument(DB(), COL.content(), contentId);
    } catch {
      throw new NotFoundError("Content item");
    }

    const allowed = [
      "title",
      "body",
      "excerpt",
      "type",
      "categorySlug",
      "level",
      "tags",
      "durationMinutes",
      "videoUrl",
      "isPremium",
      "featured",
      "thumbnailFileId",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updatedAt = new Date().toISOString();
    if (updates.title) updates.slug = this._toSlug(updates.title);

    const doc = await _db.updateDocument(
      DB(),
      COL.content(),
      contentId,
      updates,
    );
    logger.audit("EDUCATION_CONTENT_UPDATED", uid(req), { contentId });

    res.json({
      success: true,
      data: doc,
      message: "Content updated successfully",
    });
  }

  // ── POST /education/content/:contentId/publish (admin) ────────────────────
  async publishContent(req, res) {
    requireCollection(COL.content(), "content");

    const { contentId } = req.params;
    let doc;
    try {
      doc = await _db.getDocument(DB(), COL.content(), contentId);
    } catch {
      throw new NotFoundError("Content item");
    }

    if (doc.status === "published") {
      throw new ConflictError("Content is already published");
    }

    const updated = await _db.updateDocument(DB(), COL.content(), contentId, {
      status: "published",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.audit("EDUCATION_CONTENT_PUBLISHED", uid(req), { contentId });
    res.json({
      success: true,
      data: updated,
      message: "Content published successfully",
    });
  }

  // ── POST /education/content/:contentId/unpublish (admin) ──────────────────
  async unpublishContent(req, res) {
    requireCollection(COL.content(), "content");

    const { contentId } = req.params;
    let doc;
    try {
      doc = await _db.getDocument(DB(), COL.content(), contentId);
    } catch {
      throw new NotFoundError("Content item");
    }

    if (doc.status !== "published") {
      throw new ConflictError("Content is not currently published");
    }

    const updated = await _db.updateDocument(DB(), COL.content(), contentId, {
      status: "draft",
      updatedAt: new Date().toISOString(),
    });

    logger.audit("EDUCATION_CONTENT_UNPUBLISHED", uid(req), { contentId });
    res.json({ success: true, data: updated, message: "Content unpublished" });
  }

  // ── DELETE /education/content/:contentId (admin) ──────────────────────────
  async deleteContent(req, res) {
    requireCollection(COL.content(), "content");

    const { contentId } = req.params;
    try {
      await _db.getDocument(DB(), COL.content(), contentId);
    } catch {
      throw new NotFoundError("Content item");
    }

    await _db.updateDocument(DB(), COL.content(), contentId, {
      status: "archived",
      updatedAt: new Date().toISOString(),
    });

    logger.audit("EDUCATION_CONTENT_ARCHIVED", uid(req), { contentId });
    res.json({ success: true, message: "Content archived successfully" });
  }

  // ── POST /education/content/:contentId/like ───────────────────────────────
  async likeContent(req, res) {
    requireCollection(COL.content(), "content");

    const { contentId } = req.params;
    let doc;
    try {
      doc = await _db.getDocument(DB(), COL.content(), contentId);
    } catch {
      throw new NotFoundError("Content item");
    }

    const updated = await _db.updateDocument(DB(), COL.content(), contentId, {
      likes: (doc.likes || 0) + 1,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, data: { likes: updated.likes } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /education/categories ─────────────────────────────────────────────
  async listCategories(req, res) {
    requireCollection(COL.categories(), "categories");

    const result = await _db.listDocuments(DB(), COL.categories(), [
      Query.equal("active", true),
      Query.orderAsc("sortOrder"),
      Query.limit(100),
    ]);

    res.json({ success: true, data: result.documents });
  }

  // ── POST /education/categories (admin) ────────────────────────────────────
  async createCategory(req, res) {
    requireCollection(COL.categories(), "categories");

    const { name, description = "", iconName = "", color = "" } = req.body;
    const slug = this._toSlug(name);

    // Uniqueness check
    const existing = await _db.listDocuments(DB(), COL.categories(), [
      Query.equal("slug", slug),
    ]);
    if (existing.total > 0)
      throw new ConflictError(`Category with slug '${slug}' already exists`);

    const doc = await _db.createDocument(DB(), COL.categories(), ID.unique(), {
      name,
      slug,
      description,
      iconName,
      color,
      active: true,
      sortOrder: existing.total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.audit("EDUCATION_CATEGORY_CREATED", uid(req), {
      categoryId: doc.$id,
      name,
    });
    res
      .status(201)
      .json({ success: true, data: doc, message: "Category created" });
  }

  // ── PUT /education/categories/:categoryId (admin) ─────────────────────────
  async updateCategory(req, res) {
    requireCollection(COL.categories(), "categories");

    const { categoryId } = req.params;
    try {
      await _db.getDocument(DB(), COL.categories(), categoryId);
    } catch {
      throw new NotFoundError("Category");
    }

    const { name, description, iconName, color, active, sortOrder } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (name !== undefined) {
      updates.name = name;
      updates.slug = this._toSlug(name);
    }
    if (description !== undefined) updates.description = description;
    if (iconName !== undefined) updates.iconName = iconName;
    if (color !== undefined) updates.color = color;
    if (active !== undefined) updates.active = active;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const doc = await _db.updateDocument(
      DB(),
      COL.categories(),
      categoryId,
      updates,
    );
    res.json({ success: true, data: doc, message: "Category updated" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING PATHS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /education/paths ──────────────────────────────────────────────────
  async listLearningPaths(req, res) {
    requireCollection(COL.paths(), "learning paths");

    const { page, limit, offset } = paginate(req);
    const { category, level, featured } = req.query;

    const queries = [
      Query.equal("status", "published"),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc("createdAt"),
    ];
    if (category) queries.push(Query.equal("categorySlug", category));
    if (level) queries.push(Query.equal("level", level));
    if (featured === "true") queries.push(Query.equal("featured", true));

    const result = await _db.listDocuments(DB(), COL.paths(), queries);

    // If user is authenticated, attach their enrolment status for each path
    let enrolledIds = new Set();
    if (uid(req) && COL.enrollments()) {
      try {
        const enrollments = await _db.listDocuments(DB(), COL.enrollments(), [
          Query.equal("userId", uid(req)),
          Query.limit(200),
        ]);
        enrolledIds = new Set(enrollments.documents.map((e) => e.pathId));
      } catch {
        /* non-critical */
      }
    }

    const paths = result.documents.map((p) => ({
      ...p,
      enrolled: enrolledIds.has(p.$id),
    }));

    res.json({
      success: true,
      data: {
        items: paths,
        pagination: {
          page,
          limit,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  }

  // ── GET /education/paths/:pathId ──────────────────────────────────────────
  async getLearningPath(req, res) {
    requireCollection(COL.paths(), "learning paths");

    const { pathId } = req.params;
    let path;
    try {
      path = await _db.getDocument(DB(), COL.paths(), pathId);
    } catch {
      throw new NotFoundError("Learning path");
    }

    if (
      path.status !== "published" &&
      !["admin", "super_admin"].includes(req.user?.role)
    ) {
      throw new NotFoundError("Learning path");
    }

    // Fetch each content item attached to the path
    let contentItems = [];
    if (
      Array.isArray(path.contentIds) &&
      path.contentIds.length > 0 &&
      COL.content()
    ) {
      try {
        const fetched = await _db.listDocuments(DB(), COL.content(), [
          Query.equal("$id", path.contentIds),
          Query.equal("status", "published"),
          Query.orderAsc("$id"),
          Query.limit(200),
        ]);
        // Preserve the authored order
        const byId = Object.fromEntries(
          fetched.documents.map((d) => [d.$id, d]),
        );
        contentItems = path.contentIds
          .map((id) => byId[id])
          .filter(Boolean)
          .map((d) =>
            this._sanitiseContentForRole(d, req.user?.role || "user", false),
          );
      } catch {
        /* non-critical */
      }
    }

    // Enrolment + progress for current user
    let enrolment = null;
    if (uid(req) && COL.enrollments()) {
      try {
        const enrs = await _db.listDocuments(DB(), COL.enrollments(), [
          Query.equal("userId", uid(req)),
          Query.equal("pathId", pathId),
          Query.limit(1),
        ]);
        enrolment = enrs.documents[0] || null;
      } catch {
        /* non-critical */
      }
    }

    res.json({
      success: true,
      data: { ...path, contentItems, enrolment },
    });
  }

  // ── POST /education/paths (admin) ─────────────────────────────────────────
  async createLearningPath(req, res) {
    requireCollection(COL.paths(), "learning paths");

    const {
      title,
      description,
      categorySlug,
      level,
      tags = [],
      contentIds = [],
      thumbnailFileId,
      isPremium = false,
      featured = false,
      estimatedWeeks = 0,
    } = req.body;

    const doc = await _db.createDocument(DB(), COL.paths(), ID.unique(), {
      title,
      slug: this._toSlug(title) + "-" + Date.now(),
      description,
      categorySlug: categorySlug || "",
      level: level || "beginner",
      tags,
      contentIds,
      thumbnailFileId: thumbnailFileId || null,
      isPremium,
      featured,
      estimatedWeeks,
      status: "draft",
      authorId: uid(req),
      enrolmentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.audit("EDUCATION_PATH_CREATED", uid(req), {
      pathId: doc.$id,
      title,
    });
    res
      .status(201)
      .json({ success: true, data: doc, message: "Learning path created" });
  }

  // ── PUT /education/paths/:pathId (admin) ──────────────────────────────────
  async updateLearningPath(req, res) {
    requireCollection(COL.paths(), "learning paths");

    const { pathId } = req.params;
    try {
      await _db.getDocument(DB(), COL.paths(), pathId);
    } catch {
      throw new NotFoundError("Learning path");
    }

    const allowed = [
      "title",
      "description",
      "categorySlug",
      "level",
      "tags",
      "contentIds",
      "thumbnailFileId",
      "isPremium",
      "featured",
      "estimatedWeeks",
      "status",
    ];
    const updates = { updatedAt: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.title) updates.slug = this._toSlug(updates.title);
    if (updates.status === "published")
      updates.publishedAt = new Date().toISOString();

    const doc = await _db.updateDocument(DB(), COL.paths(), pathId, updates);
    logger.audit("EDUCATION_PATH_UPDATED", uid(req), { pathId });
    res.json({ success: true, data: doc, message: "Learning path updated" });
  }

  // ── DELETE /education/paths/:pathId (admin) ───────────────────────────────
  async deleteLearningPath(req, res) {
    requireCollection(COL.paths(), "learning paths");

    const { pathId } = req.params;
    try {
      await _db.getDocument(DB(), COL.paths(), pathId);
    } catch {
      throw new NotFoundError("Learning path");
    }

    await _db.updateDocument(DB(), COL.paths(), pathId, {
      status: "archived",
      updatedAt: new Date().toISOString(),
    });

    logger.audit("EDUCATION_PATH_ARCHIVED", uid(req), { pathId });
    res.json({ success: true, message: "Learning path archived" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENROLMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /education/paths/:pathId/enroll ──────────────────────────────────
  async enrollInPath(req, res) {
    requireCollection(COL.paths(), "learning paths");
    requireCollection(COL.enrollments(), "enrollments");

    const { pathId } = req.params;
    const userId = uid(req);

    let path;
    try {
      path = await _db.getDocument(DB(), COL.paths(), pathId);
    } catch {
      throw new NotFoundError("Learning path");
    }

    if (path.status !== "published") throw new NotFoundError("Learning path");

    if (
      path.isPremium &&
      !["premium", "admin", "super_admin"].includes(req.user?.role)
    ) {
      throw new AuthorizationError(
        "This learning path requires a premium membership.",
      );
    }

    // Idempotent: check existing enrolment
    const existing = await _db.listDocuments(DB(), COL.enrollments(), [
      Query.equal("userId", userId),
      Query.equal("pathId", pathId),
      Query.limit(1),
    ]);
    if (existing.total > 0) {
      return res.json({
        success: true,
        data: existing.documents[0],
        message: "Already enrolled in this learning path",
      });
    }

    const enrolment = await _db.createDocument(
      DB(),
      COL.enrollments(),
      ID.unique(),
      {
        userId,
        pathId,
        status: "active",
        progressPercent: 0,
        completedContentIds: [],
        enrolledAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        completedAt: null,
      },
    );

    // Increment enrolment count (fire-and-forget)
    _db
      .updateDocument(DB(), COL.paths(), pathId, {
        enrolmentCount: (path.enrolmentCount || 0) + 1,
      })
      .catch(() => {});

    logger.audit("EDUCATION_ENROLLED", userId, {
      pathId,
      enrolmentId: enrolment.$id,
    });
    res
      .status(201)
      .json({
        success: true,
        data: enrolment,
        message: "Enrolled successfully",
      });
  }

  // ── DELETE /education/paths/:pathId/enroll ────────────────────────────────
  async unenrollFromPath(req, res) {
    requireCollection(COL.enrollments(), "enrollments");

    const { pathId } = req.params;
    const userId = uid(req);

    const existing = await _db.listDocuments(DB(), COL.enrollments(), [
      Query.equal("userId", userId),
      Query.equal("pathId", pathId),
      Query.limit(1),
    ]);
    if (existing.total === 0) throw new NotFoundError("Enrolment");

    await _db.deleteDocument(
      DB(),
      COL.enrollments(),
      existing.documents[0].$id,
    );

    logger.audit("EDUCATION_UNENROLLED", userId, { pathId });
    res.json({ success: true, message: "Unenrolled successfully" });
  }

  // ── GET /education/my-paths ───────────────────────────────────────────────
  async getMyEnrollments(req, res) {
    requireCollection(COL.enrollments(), "enrollments");

    const userId = uid(req);
    const { status } = req.query;

    const queries = [
      Query.equal("userId", userId),
      Query.orderDesc("lastActivityAt"),
      Query.limit(50),
    ];
    if (status) queries.push(Query.equal("status", status));

    const result = await _db.listDocuments(DB(), COL.enrollments(), queries);

    // Hydrate each enrolment with path metadata
    const enriched = await Promise.all(
      result.documents.map(async (enrolment) => {
        let pathData = null;
        try {
          pathData = await _db.getDocument(DB(), COL.paths(), enrolment.pathId);
          // Strip body to save bandwidth – only metadata needed for listing
          delete pathData.contentIds;
        } catch {
          /* path may have been deleted */
        }
        return { ...enrolment, path: pathData };
      }),
    );

    res.json({ success: true, data: enriched });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /education/progress ──────────────────────────────────────────────
  async recordProgress(req, res) {
    requireCollection(COL.progress(), "progress");
    requireCollection(COL.enrollments(), "enrollments");
    requireCollection(COL.paths(), "learning paths");

    const {
      pathId,
      contentId,
      completed = false,
      timeSpentSeconds = 0,
      quizScore,
    } = req.body;
    const userId = uid(req);

    // Verify enrolment
    const enrResult = await _db.listDocuments(DB(), COL.enrollments(), [
      Query.equal("userId", userId),
      Query.equal("pathId", pathId),
      Query.limit(1),
    ]);
    if (enrResult.total === 0) {
      throw new ValidationError(
        "You must be enrolled in the learning path to record progress",
      );
    }
    const enrolment = enrResult.documents[0];

    // Upsert progress record
    const existing = await _db.listDocuments(DB(), COL.progress(), [
      Query.equal("userId", userId),
      Query.equal("pathId", pathId),
      Query.equal("contentId", contentId),
      Query.limit(1),
    ]);

    let progressDoc;
    const now = new Date().toISOString();

    if (existing.total > 0) {
      const prev = existing.documents[0];
      progressDoc = await _db.updateDocument(DB(), COL.progress(), prev.$id, {
        completed: completed || prev.completed,
        timeSpentSeconds: (prev.timeSpentSeconds || 0) + timeSpentSeconds,
        quizScore: quizScore != null ? quizScore : prev.quizScore,
        completedAt: completed && !prev.completedAt ? now : prev.completedAt,
        updatedAt: now,
      });
    } else {
      progressDoc = await _db.createDocument(
        DB(),
        COL.progress(),
        ID.unique(),
        {
          userId,
          pathId,
          contentId,
          completed,
          timeSpentSeconds,
          quizScore: quizScore || null,
          completedAt: completed ? now : null,
          createdAt: now,
          updatedAt: now,
        },
      );
    }

    // Recompute path completion percentage
    await this._recomputePathProgress(userId, pathId, enrolment);

    res.json({
      success: true,
      data: progressDoc,
      message: "Progress recorded",
    });
  }

  // ── GET /education/progress/:pathId ──────────────────────────────────────
  async getProgress(req, res) {
    requireCollection(COL.progress(), "progress");

    const { pathId } = req.params;
    const userId = uid(req);

    const result = await _db.listDocuments(DB(), COL.progress(), [
      Query.equal("userId", userId),
      Query.equal("pathId", pathId),
      Query.limit(200),
    ]);

    res.json({ success: true, data: result.documents });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKMARKS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /education/bookmarks ──────────────────────────────────────────────
  async getBookmarks(req, res) {
    requireCollection(COL.bookmarks(), "bookmarks");

    const userId = uid(req);
    const { page, limit, offset } = paginate(req);

    const result = await _db.listDocuments(DB(), COL.bookmarks(), [
      Query.equal("userId", userId),
      Query.orderDesc("createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ]);

    // Hydrate with content metadata
    const userRole = req.user?.role || "user";
    const enriched = await Promise.all(
      result.documents.map(async (bm) => {
        let content = null;
        try {
          content = await _db.getDocument(DB(), COL.content(), bm.contentId);
          content = this._sanitiseContentForRole(content, userRole, false);
        } catch {
          /* content deleted */
        }
        return { ...bm, content };
      }),
    );

    res.json({
      success: true,
      data: {
        items: enriched,
        pagination: {
          page,
          limit,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  }

  // ── POST /education/bookmarks/:contentId ─────────────────────────────────
  async addBookmark(req, res) {
    requireCollection(COL.bookmarks(), "bookmarks");

    const { contentId } = req.params;
    const userId = uid(req);

    // Verify content exists
    try {
      await _db.getDocument(DB(), COL.content(), contentId);
    } catch {
      throw new NotFoundError("Content item");
    }

    // Idempotent
    const existing = await _db.listDocuments(DB(), COL.bookmarks(), [
      Query.equal("userId", userId),
      Query.equal("contentId", contentId),
      Query.limit(1),
    ]);
    if (existing.total > 0) {
      return res.json({
        success: true,
        data: existing.documents[0],
        message: "Already bookmarked",
      });
    }

    const bm = await _db.createDocument(DB(), COL.bookmarks(), ID.unique(), {
      userId,
      contentId,
      createdAt: new Date().toISOString(),
    });

    res
      .status(201)
      .json({ success: true, data: bm, message: "Bookmarked successfully" });
  }

  // ── DELETE /education/bookmarks/:contentId ────────────────────────────────
  async removeBookmark(req, res) {
    requireCollection(COL.bookmarks(), "bookmarks");

    const { contentId } = req.params;
    const userId = uid(req);

    const existing = await _db.listDocuments(DB(), COL.bookmarks(), [
      Query.equal("userId", userId),
      Query.equal("contentId", contentId),
      Query.limit(1),
    ]);
    if (existing.total === 0) throw new NotFoundError("Bookmark");

    await _db.deleteDocument(DB(), COL.bookmarks(), existing.documents[0].$id);
    res.json({ success: true, message: "Bookmark removed" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE UPLOAD (admin: thumbnails / video attachments)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── POST /education/upload (admin) ────────────────────────────────────────
  async uploadContentFile(req, res) {
    if (!BUCKET()) {
      throw new ValidationError(
        "Content storage bucket is not configured (APPWRITE_CONTENT_STORAGE_BUCKET_ID)",
      );
    }
    if (!req.file) {
      throw new ValidationError(
        'No file uploaded. Include a multipart/form-data field named "file".',
      );
    }

    const fileId = ID.unique();
    const uploaded = await _storage.createFile(
      BUCKET(),
      fileId,
      // node-appwrite InputFile compatible
      require("node-appwrite").InputFile.fromBuffer(
        req.file.buffer,
        req.file.originalname,
      ),
    );

    logger.audit("EDUCATION_FILE_UPLOADED", uid(req), {
      fileId,
      name: req.file.originalname,
    });
    res.status(201).json({
      success: true,
      data: {
        fileId: uploaded.$id,
        name: uploaded.name,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeOriginal,
      },
      message: "File uploaded successfully",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN STATS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GET /education/admin/stats ────────────────────────────────────────────
  async getAdminStats(req, res) {
    const queries = [Query.limit(1)];

    const [contentRes, pathRes, enrolRes] = await Promise.allSettled([
      COL.content()
        ? _db.listDocuments(DB(), COL.content(), queries)
        : Promise.resolve({ total: 0 }),
      COL.paths()
        ? _db.listDocuments(DB(), COL.paths(), queries)
        : Promise.resolve({ total: 0 }),
      COL.enrollments()
        ? _db.listDocuments(DB(), COL.enrollments(), queries)
        : Promise.resolve({ total: 0 }),
    ]);

    res.json({
      success: true,
      data: {
        totalContent: contentRes.value?.total ?? 0,
        totalPaths: pathRes.value?.total ?? 0,
        totalEnrolments: enrolRes.value?.total ?? 0,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Strip premium body / sensitive fields for non-privileged roles.
   * @param {Object} doc        Appwrite document
   * @param {string} role       User role
   * @param {boolean} fullBody  Include full body text?
   */
  _sanitiseContentForRole(doc, role, fullBody) {
    const isPremiumRoute = ["premium", "admin", "super_admin"].includes(role);
    const out = { ...doc };

    if (!fullBody) {
      // For list views, body text is expensive — return only excerpt
      delete out.body;
    } else if (doc.isPremium && !isPremiumRoute) {
      // Teaser: first 300 chars + upgrade prompt
      out.body =
        (doc.body || "").slice(0, 300) + "… [Upgrade to premium to read more]";
    }

    return out;
  }

  /**
   * Recompute the percentage completion of a learning path enrolment and
   * mark it as completed if all content items are done.
   */
  async _recomputePathProgress(userId, pathId, enrolment) {
    try {
      const path = await _db.getDocument(DB(), COL.paths(), pathId);
      const totalItems = (path.contentIds || []).length;
      if (totalItems === 0) return;

      const completedResult = await _db.listDocuments(DB(), COL.progress(), [
        Query.equal("userId", userId),
        Query.equal("pathId", pathId),
        Query.equal("completed", true),
        Query.limit(200),
      ]);

      const completedCount = completedResult.total;
      const progressPercent = Math.round((completedCount / totalItems) * 100);
      const isCompleted = completedCount >= totalItems;
      const now = new Date().toISOString();

      const updates = {
        progressPercent,
        completedContentIds: completedResult.documents.map((d) => d.contentId),
        lastActivityAt: now,
        updatedAt: now,
      };
      if (isCompleted && enrolment.status !== "completed") {
        updates.status = "completed";
        updates.completedAt = now;
      }

      await _db.updateDocument(DB(), COL.enrollments(), enrolment.$id, updates);
    } catch (err) {
      logger.warn("Failed to recompute path progress", {
        userId,
        pathId,
        error: err.message,
      });
    }
  }

  /** Convert a title to a URL-safe slug */
  _toSlug(str) {
    return (str || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-");
  }
}

module.exports = new EducationController();
