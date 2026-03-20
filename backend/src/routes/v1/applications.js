/**
 * Applications Routes  —  /api/v1/applications
 *
 * Public (no auth required):
 *   POST /                   submit job application
 *   GET  /:id                get application (with email verification)
 *
 * Admin (auth + admin/super_admin role required):
 *   GET    /admin/list         list all applications with filtering
 *   PATCH  /:id/status         update application status
 *   DELETE /:id                delete application
 *   GET    /role/:roleId       get all applications for specific role
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

const applications = require("../../controllers/applicationsController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const readLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests. Please try again later.",
});

const applicationSubmissionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 applications per hour per IP
  message:
    "Too many applications submitted. Please wait before submitting another.",
});

const writeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: "Too many write requests. Please slow down.",
});

// ── Validation helpers ────────────────────────────────────────────────────────
const applicationIdParam = param("id")
  .isString()
  .notEmpty()
  .withMessage("Valid application ID is required");

const roleIdParam = param("roleId")
  .isString()
  .notEmpty()
  .withMessage("Valid role ID is required");

const VALID_STATUSES = [
  "pending",
  "reviewing",
  "interviewed",
  "accepted",
  "rejected",
];

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (basic)
const phoneRegex = /^[\+]?[\d\s\-\(\)]{8,20}$/;

const submitApplicationValidation = [
  body("applicantName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2–100 characters"),
  body("applicantEmail")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters"),
  body("applicantPhone")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (value && !phoneRegex.test(value)) {
        throw new Error("Please provide a valid phone number");
      }
      return true;
    }),
  body("roleId")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Role ID is required"),
  body("roleTitle")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Role title must be 3–200 characters"),
  body("coverLetter")
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage("Cover letter must be 50–5000 characters"),
  body("resumeText")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Resume text must not exceed 10000 characters"),
  body("linkedinProfile")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (value) {
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error("Please provide a valid LinkedIn profile URL");
        }
      }
      return true;
    }),
  body("portfolioUrl")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (value) {
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error("Please provide a valid portfolio URL");
        }
      }
      return true;
    }),
];

const statusUpdateValidation = [
  applicationIdParam,
  body("status")
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}`),
  body("notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes must not exceed 2000 characters"),
];

const listApplicationsValidation = [
  query("status")
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}`),
  query("roleId")
    .optional()
    .isString()
    .trim()
    .withMessage("Role ID must be a string"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search term must be at most 100 characters"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),
];

const getApplicationValidation = [
  applicationIdParam,
  query("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address"),
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/applications
 * @desc    Submit a job application
 * @access  Public
 */
router.post(
  "/",
  applicationSubmissionLimiter,
  submitApplicationValidation,
  validateRequest,
  asyncHandler(applications.submitApplication),
);

/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get single application (requires email verification for non-admin)
 * @access  Public (with email verification) / Admin
 * @query   email (required for non-admin access)
 */
router.get(
  "/:id",
  readLimiter,
  getApplicationValidation,
  validateRequest,
  asyncHandler(applications.getApplication),
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES  (authenticate + authorize required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/applications/admin/list
 * @desc    List all applications with filtering (admin dashboard)
 * @access  Admin
 * @query   status, roleId, search, limit, offset
 */
router.get(
  "/admin/list",
  authenticate,
  authorize(["admin", "super_admin"]),
  readLimiter,
  listApplicationsValidation,
  validateRequest,
  asyncHandler(applications.adminListApplications),
);

/**
 * @route   PATCH /api/v1/applications/:id/status
 * @desc    Update application status and notes
 * @access  Admin
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  statusUpdateValidation,
  validateRequest,
  asyncHandler(applications.updateApplicationStatus),
);

/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Delete an application permanently
 * @access  Admin
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin"]),
  writeLimiter,
  [applicationIdParam],
  validateRequest,
  asyncHandler(applications.deleteApplication),
);

/**
 * @route   GET /api/v1/applications/role/:roleId
 * @desc    Get all applications for a specific role
 * @access  Admin
 * @query   limit, offset
 */
router.get(
  "/role/:roleId",
  authenticate,
  authorize(["admin", "super_admin"]),
  readLimiter,
  [
    roleIdParam,
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be a non-negative integer"),
  ],
  validateRequest,
  asyncHandler(applications.getApplicationsForRole),
);

module.exports = router;
