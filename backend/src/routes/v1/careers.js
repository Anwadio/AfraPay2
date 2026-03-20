/**
 * Careers Routes  —  /api/v1/careers
 *
 * Public (no auth required):
 *   GET  /                   full page payload (roles + config)
 *   GET  /roles              list active roles (?dept, ?search, ?limit, ?offset)
 *   GET  /roles/:id          single role detail
 *
 * Admin (auth + admin/super_admin role required):
 *   GET    /admin/roles         list ALL roles incl. inactive
 *   POST   /roles               create role
 *   PUT    /roles/:id           full update role
 *   PATCH  /roles/:id/status    toggle isActive
 *   DELETE /roles/:id           delete role
 */

"use strict";

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const { authorize } = require("../../middleware/auth/authorize");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { createRateLimiter } = require("../../middleware/security/rateLimiter");

const careers = require("../../controllers/careersController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const readLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests. Please try again later.",
});

const writeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: "Too many write requests. Please slow down.",
});

// ── Validation helpers ────────────────────────────────────────────────────────
const roleIdParam = param("id")
  .isString()
  .notEmpty()
  .withMessage("Valid role ID is required");

const VALID_DEPARTMENTS = [
  "Engineering",
  "Product",
  "Operations",
  "Finance",
  "Marketing",
  "Support",
];

const VALID_LEVELS = ["Entry-level", "Mid-level", "Senior", "Lead"];
const VALID_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

const createRoleValidation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be 3–200 characters"),
  body("department")
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`Department must be one of: ${VALID_DEPARTMENTS.join(", ")}`),
  body("location")
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Location must be 2–200 characters"),
  body("type")
    .isIn(VALID_TYPES)
    .withMessage(`Type must be one of: ${VALID_TYPES.join(", ")}`),
  body("level")
    .isIn(VALID_LEVELS)
    .withMessage(`Level must be one of: ${VALID_LEVELS.join(", ")}`),
  body("description")
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be 20–2000 characters"),
  body("tags")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Tags must be an array of up to 10 items"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Each tag must be 1–100 characters"),
  body("order")
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage("Order must be an integer between 0 and 9999"),
];

const updateRoleValidation = [
  roleIdParam,
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be 3–200 characters"),
  body("department")
    .optional()
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`Department must be one of: ${VALID_DEPARTMENTS.join(", ")}`),
  body("location")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Location must be 2–200 characters"),
  body("type")
    .optional()
    .isIn(VALID_TYPES)
    .withMessage(`Type must be one of: ${VALID_TYPES.join(", ")}`),
  body("level")
    .optional()
    .isIn(VALID_LEVELS)
    .withMessage(`Level must be one of: ${VALID_LEVELS.join(", ")}`),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be 20–2000 characters"),
  body("tags")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Tags must be an array of up to 10 items"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("order")
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage("Order must be an integer between 0 and 9999"),
];

const statusValidation = [
  roleIdParam,
  body("isActive").isBoolean().withMessage("isActive must be a boolean"),
];

const listQueryValidation = [
  query("dept")
    .optional()
    .isString()
    .trim()
    .withMessage("dept must be a string"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("search must be at most 100 characters"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("offset must be a non-negative integer"),
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/careers
 * @desc    Full careers page payload — roles + departments + benefits + values + levelColors
 * @access  Public
 */
router.get("/", readLimiter, asyncHandler(careers.getCareersPage));

/**
 * @route   GET /api/v1/careers/roles
 * @desc    List active open roles with optional filtering
 * @access  Public
 * @query   dept, search, limit, offset
 */
router.get(
  "/roles",
  readLimiter,
  listQueryValidation,
  validateRequest,
  asyncHandler(careers.listRoles),
);

/**
 * @route   GET /api/v1/careers/roles/:id
 * @desc    Single role detail
 * @access  Public
 */
router.get(
  "/roles/:id",
  readLimiter,
  [roleIdParam],
  validateRequest,
  asyncHandler(careers.getRole),
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES  (authenticate + authorize required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/careers/admin/roles
 * @desc    List ALL roles including inactive (admin dashboard)
 * @access  Admin
 */
router.get(
  "/admin/roles",
  authenticate,
  authorize(["admin", "super_admin"]),
  readLimiter,
  listQueryValidation,
  validateRequest,
  asyncHandler(careers.adminListRoles),
);

/**
 * @route   POST /api/v1/careers/roles
 * @desc    Create a new open role
 * @access  Admin
 */
router.post(
  "/roles",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  createRoleValidation,
  validateRequest,
  asyncHandler(careers.createRole),
);

/**
 * @route   PUT /api/v1/careers/roles/:id
 * @desc    Full update of an open role
 * @access  Admin
 */
router.put(
  "/roles/:id",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  updateRoleValidation,
  validateRequest,
  asyncHandler(careers.updateRole),
);

/**
 * @route   PATCH /api/v1/careers/roles/:id/status
 * @desc    Toggle isActive on a role (publish / unpublish)
 * @access  Admin
 */
router.patch(
  "/roles/:id/status",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  statusValidation,
  validateRequest,
  asyncHandler(careers.toggleRoleStatus),
);

/**
 * @route   DELETE /api/v1/careers/roles/:id
 * @desc    Permanently delete a role
 * @access  Admin
 */
router.delete(
  "/roles/:id",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [roleIdParam],
  validateRequest,
  asyncHandler(careers.deleteRole),
);

module.exports = router;
