/**
 * Support Routes  —  /api/v1/support
 *
 * Access summary
 * ─────────────────────────────────────────────
 *   GET  /faqs            authenticated  search & filter FAQ articles
 *   GET  /system-status   authenticated  service operational status
 *   POST /tickets         authenticated  open a new support ticket
 *   GET  /tickets         authenticated  list own tickets
 *   GET  /tickets/:id     authenticated  get ticket + message thread
 *   POST /tickets/:id/messages  authenticated  add reply to ticket
 */

"use strict";

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { createRateLimiter } = require("../../middleware/security/rateLimiter");
const support = require("../../controllers/supportController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const readLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests, please try again later.",
});
const writeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many submissions, please slow down.",
});

// ── Validation helpers ────────────────────────────────────────────────────────
const CATEGORIES = [
  "payments",
  "account",
  "security",
  "transfers",
  "fees",
  "other",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const ticketIdParam = param("id")
  .isString()
  .notEmpty()
  .withMessage("Valid ticket ID required");

// ─────────────────────────────────────────────────────────────────────────────
// FAQ & status (read-only, authenticated)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/support/faqs
 * @desc    Return FAQ articles, optionally filtered by category or search query
 * @access  Authenticated
 */
router.get(
  "/faqs",
  authenticate,
  readLimiter,
  [
    query("category")
      .optional()
      .isIn(["all", ...CATEGORIES])
      .withMessage("Invalid category"),
    query("q")
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage("Search query too long"),
  ],
  validateRequest,
  asyncHandler(support.getFaqs.bind(support)),
);

/**
 * @route   GET /api/v1/support/system-status
 * @desc    Return current operational status for all AfraPay services
 * @access  Authenticated
 */
router.get(
  "/system-status",
  authenticate,
  readLimiter,
  asyncHandler(support.getSystemStatus.bind(support)),
);

// ─────────────────────────────────────────────────────────────────────────────
// Tickets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/support/tickets
 * @desc    Open a new support ticket
 * @access  Authenticated
 */
router.post(
  "/tickets",
  authenticate,
  writeLimiter,
  [
    body("subject")
      .trim()
      .isLength({ min: 5, max: 150 })
      .withMessage("Subject must be between 5 and 150 characters"),
    body("category")
      .isIn(CATEGORIES)
      .withMessage(`Category must be one of: ${CATEGORIES.join(", ")}`),
    body("priority")
      .optional()
      .isIn(PRIORITIES)
      .withMessage(`Priority must be one of: ${PRIORITIES.join(", ")}`),
    body("message")
      .trim()
      .isLength({ min: 20, max: 5000 })
      .withMessage("Message must be between 20 and 5000 characters"),
  ],
  validateRequest,
  asyncHandler(support.createTicket.bind(support)),
);

/**
 * @route   GET /api/v1/support/tickets
 * @desc    List the authenticated user's support tickets
 * @access  Authenticated
 */
router.get(
  "/tickets",
  authenticate,
  readLimiter,
  [
    query("status")
      .optional()
      .isIn(["all", "open", "in-progress", "resolved", "closed"])
      .withMessage("Invalid status filter"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be ≥ 1"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("limit must be 1–50"),
  ],
  validateRequest,
  asyncHandler(support.getTickets.bind(support)),
);

/**
 * @route   GET /api/v1/support/tickets/:id
 * @desc    Get a single ticket with its full message thread
 * @access  Authenticated (own ticket or admin)
 */
router.get(
  "/tickets/:id",
  authenticate,
  readLimiter,
  [ticketIdParam],
  validateRequest,
  asyncHandler(support.getTicket.bind(support)),
);

/**
 * @route   POST /api/v1/support/tickets/:id/messages
 * @desc    Add a reply to an existing ticket
 * @access  Authenticated (own ticket or admin)
 */
router.post(
  "/tickets/:id/messages",
  authenticate,
  writeLimiter,
  [
    ticketIdParam,
    body("message")
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage("Message must be between 1 and 5000 characters"),
  ],
  validateRequest,
  asyncHandler(support.addMessage.bind(support)),
);

module.exports = router;
