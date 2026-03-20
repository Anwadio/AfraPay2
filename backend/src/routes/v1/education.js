/**
 * Education Routes  —  /api/v1/education
 *
 * Access-control summary
 * ──────────────────────
 *   Public (authenticated)  GET  content, categories, paths
 *   Premium gate            GET  /content/:id  (isPremium items)
 *   Owner                   POST /enroll, /progress, /bookmarks
 *   Admin only              POST/PUT/DELETE on content, paths, categories; upload; stats
 */

"use strict";

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const multer = require("multer");

const { authenticate } = require("../../middleware/auth/authenticate");
const { authorize } = require("../../middleware/auth/authorize");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { createRateLimiter } = require("../../middleware/security/rateLimiter");
const education = require("../../controllers/educationController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const readLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
});
const writeLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
});

// ── File upload (admin: thumbnails & videos, memory store — forwarded to Appwrite) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "application/pdf",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Reusable validation fragments ─────────────────────────────────────────────
const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"];
const LEVELS = ["beginner", "intermediate", "advanced", "all_levels"];
const TYPES = ["article", "video", "quiz", "tool", "infographic", "podcast"];

const pagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be 1-100"),
];

const contentIdParam = param("contentId")
  .isString()
  .notEmpty()
  .withMessage("Valid contentId required");
const pathIdParam = param("pathId")
  .isString()
  .notEmpty()
  .withMessage("Valid pathId required");

// ════════════════════════════════════════════════════════════════════════════
// CONTENT ROUTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/v1/education/content
 * @desc   List published content (filterable, paginated)
 * @access Authenticated
 */
router.get(
  "/content",
  authenticate,
  readLimiter,
  [
    ...pagination,
    query("category").optional().isString().trim().escape(),
    query("type").optional().isIn(TYPES).withMessage("Invalid content type"),
    query("level")
      .optional()
      .isIn(LEVELS)
      .withMessage("Invalid difficulty level"),
    query("featured").optional().isIn(["true", "false"]),
    query("search")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .escape(),
    query("tags").optional().isString().trim(),
    query("sortBy")
      .optional()
      .isIn(["publishedAt", "views", "likes", "title", "durationMinutes"]),
    query("order").optional().isIn(["asc", "desc"]),
  ],
  validateRequest,
  asyncHandler(education.listContent.bind(education)),
);

/**
 * @route  GET /api/v1/education/content/featured
 * @desc   Featured content items
 * @access Authenticated
 */
router.get(
  "/content/featured",
  authenticate,
  readLimiter,
  asyncHandler(education.getFeaturedContent.bind(education)),
);

/**
 * @route  GET /api/v1/education/content/:contentId
 * @desc   Full content item (premium gate applied)
 * @access Authenticated
 */
router.get(
  "/content/:contentId",
  authenticate,
  readLimiter,
  [contentIdParam],
  validateRequest,
  asyncHandler(education.getContent.bind(education)),
);

/**
 * @route  POST /api/v1/education/content/:contentId/like
 * @desc   Like a content item
 * @access Authenticated
 */
router.post(
  "/content/:contentId/like",
  authenticate,
  writeLimiter,
  [contentIdParam],
  validateRequest,
  asyncHandler(education.likeContent.bind(education)),
);

/**
 * @route  POST /api/v1/education/content/:contentId/enroll
 * @desc   Enroll the current user in a content item
 * @access Authenticated
 */
router.post(
  "/content/:contentId/enroll",
  authenticate,
  writeLimiter,
  [contentIdParam],
  validateRequest,
  asyncHandler(education.enrollInContent.bind(education)),
);

/**
 * @route  DELETE /api/v1/education/content/:contentId/enroll
 * @desc   Unenroll the current user from a content item
 * @access Authenticated
 */
router.delete(
  "/content/:contentId/enroll",
  authenticate,
  writeLimiter,
  [contentIdParam],
  validateRequest,
  asyncHandler(education.unenrollFromContent.bind(education)),
);

/**
 * @route  POST /api/v1/education/content/:contentId/complete
 * @desc   Mark a content item as complete
 * @access Authenticated
 */
router.post(
  "/content/:contentId/complete",
  authenticate,
  writeLimiter,
  [contentIdParam],
  validateRequest,
  asyncHandler(education.markContentComplete.bind(education)),
);

/**
 * @route  GET /api/v1/education/my-content
 * @desc   Content items the current user is enrolled in
 * @access Authenticated
 */
router.get(
  "/my-content",
  authenticate,
  readLimiter,
  [...pagination],
  validateRequest,
  asyncHandler(education.getMyContentEnrollments.bind(education)),
);

/**
 * @route  POST /api/v1/education/content  [ADMIN]
 * @desc   Create a new content item (draft)
 * @access Admin
 */
router.post(
  "/content",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [
    body("title")
      .trim()
      .notEmpty()
      .isLength({ max: 200 })
      .withMessage("Title is required (max 200 chars)"),
    body("body").notEmpty().withMessage("body is required"),
    body("type")
      .isIn(TYPES)
      .withMessage(`type must be one of: ${TYPES.join(", ")}`),
    body("level")
      .isIn(LEVELS)
      .withMessage(`level must be one of: ${LEVELS.join(", ")}`),
    body("excerpt").optional().trim().isLength({ max: 500 }),
    body("categorySlug").optional().trim().escape(),
    body("tags").optional().isArray().withMessage("tags must be an array"),
    body("tags.*").optional().isString().trim().escape(),
    body("durationMinutes").optional().isInt({ min: 0 }),
    body("videoUrl")
      .optional()
      .isURL({ require_tld: false })
      .withMessage("videoUrl must be a valid URL"),
    body("isPremium").optional().isBoolean(),
    body("featured").optional().isBoolean(),
    body("thumbnailFileId").optional().isString(),
  ],
  validateRequest,
  asyncHandler(education.createContent.bind(education)),
);

/**
 * @route  PUT /api/v1/education/content/:contentId  [ADMIN]
 * @desc   Update a content item
 * @access Admin
 */
router.put(
  "/content/:contentId",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [
    contentIdParam,
    body("title").optional().trim().isLength({ max: 200 }),
    body("type").optional().isIn(TYPES),
    body("level").optional().isIn(LEVELS),
    body("tags").optional().isArray(),
    body("tags.*").optional().isString().trim().escape(),
    body("durationMinutes").optional().isInt({ min: 0 }),
    body("videoUrl").optional().isURL({ require_tld: false }),
    body("isPremium").optional().isBoolean(),
    body("featured").optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(education.updateContent.bind(education)),
);

/**
 * @route  POST /api/v1/education/content/:contentId/publish  [ADMIN]
 * @desc   Publish a draft content item
 * @access Admin
 */
router.post(
  "/content/:contentId/publish",
  authenticate,
  authorize(["admin", "super_admin"]),
  [contentIdParam],
  validateRequest,
  asyncHandler(education.publishContent.bind(education)),
);

/**
 * @route  POST /api/v1/education/content/:contentId/unpublish  [ADMIN]
 * @desc   Unpublish a content item back to draft
 * @access Admin
 */
router.post(
  "/content/:contentId/unpublish",
  authenticate,
  authorize(["admin", "super_admin"]),
  [contentIdParam],
  validateRequest,
  asyncHandler(education.unpublishContent.bind(education)),
);

/**
 * @route  DELETE /api/v1/education/content/:contentId  [ADMIN]
 * @desc   Archive (soft-delete) a content item
 * @access Admin
 */
router.delete(
  "/content/:contentId",
  authenticate,
  authorize(["admin", "super_admin"]),
  [contentIdParam],
  validateRequest,
  asyncHandler(education.deleteContent.bind(education)),
);

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY ROUTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/v1/education/categories
 * @desc   List active content categories
 * @access Authenticated
 */
router.get(
  "/categories",
  authenticate,
  readLimiter,
  asyncHandler(education.listCategories.bind(education)),
);

/**
 * @route  POST /api/v1/education/categories  [ADMIN]
 * @desc   Create a new category
 * @access Admin
 */
router.post(
  "/categories",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [
    body("name")
      .trim()
      .notEmpty()
      .isLength({ max: 80 })
      .withMessage("name is required (max 80 chars)"),
    body("description").optional().trim().isLength({ max: 500 }),
    body("iconName").optional().trim().isLength({ max: 50 }).escape(),
    body("color")
      .optional()
      .trim()
      .matches(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .withMessage("color must be a hex colour"),
  ],
  validateRequest,
  asyncHandler(education.createCategory.bind(education)),
);

/**
 * @route  PUT /api/v1/education/categories/:categoryId  [ADMIN]
 * @desc   Update a category
 * @access Admin
 */
router.put(
  "/categories/:categoryId",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [
    param("categoryId").isString().notEmpty(),
    body("name").optional().trim().isLength({ max: 80 }),
    body("description").optional().trim().isLength({ max: 500 }),
    body("iconName").optional().trim().isLength({ max: 50 }).escape(),
    body("color")
      .optional()
      .trim()
      .matches(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
    body("active").optional().isBoolean(),
    body("sortOrder").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  asyncHandler(education.updateCategory.bind(education)),
);

// ════════════════════════════════════════════════════════════════════════════
// LEARNING PATH ROUTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/v1/education/paths
 * @desc   List published learning paths
 * @access Authenticated
 */
router.get(
  "/paths",
  authenticate,
  readLimiter,
  [
    ...pagination,
    query("category").optional().isString().trim().escape(),
    query("level").optional().isIn(LEVELS),
    query("featured").optional().isIn(["true", "false"]),
  ],
  validateRequest,
  asyncHandler(education.listLearningPaths.bind(education)),
);

/**
 * @route  GET /api/v1/education/my-paths
 * @desc   Paths the current user is enrolled in
 * @access Authenticated
 */
router.get(
  "/my-paths",
  authenticate,
  readLimiter,
  [query("status").optional().isIn(["active", "completed", "paused"])],
  validateRequest,
  asyncHandler(education.getMyEnrollments.bind(education)),
);

/**
 * @route  GET /api/v1/education/paths/:pathId
 * @desc   Full learning path details including ordered content
 * @access Authenticated
 */
router.get(
  "/paths/:pathId",
  authenticate,
  readLimiter,
  [pathIdParam],
  validateRequest,
  asyncHandler(education.getLearningPath.bind(education)),
);

/**
 * @route  POST /api/v1/education/paths/:pathId/enroll
 * @desc   Enroll the current user in a learning path
 * @access Authenticated
 */
router.post(
  "/paths/:pathId/enroll",
  authenticate,
  writeLimiter,
  [pathIdParam],
  validateRequest,
  asyncHandler(education.enrollInPath.bind(education)),
);

/**
 * @route  DELETE /api/v1/education/paths/:pathId/enroll
 * @desc   Unenroll the current user from a learning path
 * @access Authenticated
 */
router.delete(
  "/paths/:pathId/enroll",
  authenticate,
  [pathIdParam],
  validateRequest,
  asyncHandler(education.unenrollFromPath.bind(education)),
);

/**
 * @route  POST /api/v1/education/paths  [ADMIN]
 * @desc   Create a new learning path
 * @access Admin
 */
router.post(
  "/paths",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [
    body("title")
      .trim()
      .notEmpty()
      .isLength({ max: 200 })
      .withMessage("title is required"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("description is required"),
    body("level")
      .isIn(LEVELS)
      .withMessage(`level must be one of: ${LEVELS.join(", ")}`),
    body("categorySlug").optional().trim().escape(),
    body("tags").optional().isArray(),
    body("tags.*").optional().isString().trim().escape(),
    body("contentIds").optional().isArray(),
    body("contentIds.*").optional().isString(),
    body("estimatedWeeks").optional().isInt({ min: 0 }),
    body("isPremium").optional().isBoolean(),
    body("featured").optional().isBoolean(),
    body("thumbnailFileId").optional().isString(),
  ],
  validateRequest,
  asyncHandler(education.createLearningPath.bind(education)),
);

/**
 * @route  PUT /api/v1/education/paths/:pathId  [ADMIN]
 * @desc   Update a learning path (including ordering contentIds)
 * @access Admin
 */
router.put(
  "/paths/:pathId",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [
    pathIdParam,
    body("title").optional().trim().isLength({ max: 200 }),
    body("description").optional().trim(),
    body("level").optional().isIn(LEVELS),
    body("tags").optional().isArray(),
    body("tags.*").optional().isString().trim().escape(),
    body("contentIds").optional().isArray(),
    body("contentIds.*").optional().isString(),
    body("status").optional().isIn(["draft", "published", "archived"]),
    body("isPremium").optional().isBoolean(),
    body("featured").optional().isBoolean(),
    body("estimatedWeeks").optional().isInt({ min: 0 }),
  ],
  validateRequest,
  asyncHandler(education.updateLearningPath.bind(education)),
);

/**
 * @route  DELETE /api/v1/education/paths/:pathId  [ADMIN]
 * @desc   Archive a learning path
 * @access Admin
 */
router.delete(
  "/paths/:pathId",
  authenticate,
  authorize(["admin", "super_admin"]),
  [pathIdParam],
  validateRequest,
  asyncHandler(education.deleteLearningPath.bind(education)),
);

// ════════════════════════════════════════════════════════════════════════════
// PROGRESS ROUTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/v1/education/progress
 * @desc   Record content item progress for the current user
 * @access Authenticated
 */
router.post(
  "/progress",
  authenticate,
  writeLimiter,
  [
    body("pathId").isString().notEmpty().withMessage("pathId is required"),
    body("contentId")
      .isString()
      .notEmpty()
      .withMessage("contentId is required"),
    body("completed").optional().isBoolean(),
    body("timeSpentSeconds").optional().isInt({ min: 0 }),
    body("quizScore")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("quizScore must be 0-100"),
  ],
  validateRequest,
  asyncHandler(education.recordProgress.bind(education)),
);

/**
 * @route  GET /api/v1/education/progress/:pathId
 * @desc   Get the current user's progress for a learning path
 * @access Authenticated
 */
router.get(
  "/progress/:pathId",
  authenticate,
  readLimiter,
  [pathIdParam],
  validateRequest,
  asyncHandler(education.getProgress.bind(education)),
);

// ════════════════════════════════════════════════════════════════════════════
// BOOKMARK ROUTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/v1/education/bookmarks
 * @desc   Get the current user's bookmarked content
 * @access Authenticated
 */
router.get(
  "/bookmarks",
  authenticate,
  readLimiter,
  [...pagination],
  validateRequest,
  asyncHandler(education.getBookmarks.bind(education)),
);

/**
 * @route  POST /api/v1/education/bookmarks/:contentId
 * @desc   Bookmark a content item
 * @access Authenticated
 */
router.post(
  "/bookmarks/:contentId",
  authenticate,
  writeLimiter,
  [contentIdParam],
  validateRequest,
  asyncHandler(education.addBookmark.bind(education)),
);

/**
 * @route  DELETE /api/v1/education/bookmarks/:contentId
 * @desc   Remove a bookmark
 * @access Authenticated
 */
router.delete(
  "/bookmarks/:contentId",
  authenticate,
  [contentIdParam],
  validateRequest,
  asyncHandler(education.removeBookmark.bind(education)),
);

// ════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD (ADMIN)
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/v1/education/upload  [ADMIN]
 * @desc   Upload a thumbnail image or video file for content/paths
 * @access Admin
 */
router.post(
  "/upload",
  authenticate,
  authorize(["admin", "super_admin"]),
  upload.single("file"),
  asyncHandler(education.uploadContentFile.bind(education)),
);

/**
 * @route  GET /api/v1/education/my-stats
 * @desc   Get the current user's learning stats (hours, streak, completions)
 * @access Authenticated
 */
router.get(
  "/my-stats",
  authenticate,
  readLimiter,
  asyncHandler(education.getUserStats.bind(education)),
);

// ════════════════════════════════════════════════════════════════════════════
// ADMIN STATS
// ════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/v1/education/admin/stats  [ADMIN]
 * @desc   High-level stats for CMS dashboard
 * @access Admin
 */
router.get(
  "/admin/stats",
  authenticate,
  authorize(["admin", "super_admin"]),
  asyncHandler(education.getAdminStats.bind(education)),
);

module.exports = router;
