/**
 * Chat Routes - /api/v1/chat
 *
 * Access summary
 * ─────────────────────────────────────────────
 *   POST /session                       public/auth   create new chat session
 *   GET  /sessions                      admin         list all chat sessions
 *   GET  /sessions/:id                  owner/admin   get session details
 *   PATCH /sessions/:id                 admin         update session status
 *   POST /sessions/:id/end              owner/admin   end chat session
 *   GET  /sessions/:id/messages         owner/admin   get session messages
 *   POST /sessions/:id/messages         owner/admin   send message
 */

"use strict";

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

const {
  authenticate,
  optionalAuthenticate,
} = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { createRateLimiter } = require("../../middleware/security/rateLimiter");
const chat = require("../../controllers/chatController");

// ── Rate limiters ────────────────────────────────────────────────────────────
const chatLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: "Too many chat requests. Please wait a moment.",
});

const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute (reasonable for chat)
  message: "Too many messages. Please slow down.",
});

// ── Validation middleware ────────────────────────────────────────────────────
const sessionIdParam = param("sessionId")
  .isString()
  .isLength({ min: 1 })
  .withMessage("Valid session ID required");

// ── Public/Optional Auth Routes ───────────────────────────────────────────────

/**
 * @route   POST /api/v1/chat/session
 * @desc    Create a new chat session
 * @access  Public (guests) / Private (authenticated users)
 */
router.post(
  "/session",
  chatLimiter,
  optionalAuthenticate, // Allow both guests and authenticated users
  asyncHandler(chat.createSession.bind(chat)),
);

// ── Authenticated Routes ─────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/chat/sessions
 * @desc    Get all chat sessions (admin only)
 * @access  Private (admin)
 */
router.get(
  "/sessions",
  chatLimiter,
  authenticate,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be a non-negative integer"),
    query("status")
      .optional()
      .isIn(["all", "waiting", "active", "ended"])
      .withMessage("Status must be: all, waiting, active, or ended"),
  ],
  validateRequest,
  asyncHandler(chat.getActiveSessions.bind(chat)),
);

/**
 * @route   GET /api/v1/chat/sessions/:sessionId
 * @desc    Get chat session details
 * @access  Private (session owner or admin)
 */
router.get(
  "/sessions/:sessionId",
  chatLimiter,
  optionalAuthenticate, // Allow guests for guest sessions
  [sessionIdParam],
  validateRequest,
  asyncHandler(chat.getSessionDetails.bind(chat)),
);

/**
 * @route   PATCH /api/v1/chat/sessions/:sessionId
 * @desc    Update chat session status
 * @access  Private (admin only)
 */
router.patch(
  "/sessions/:sessionId",
  chatLimiter,
  authenticate,
  [
    sessionIdParam,
    body("status")
      .optional()
      .isIn(["waiting", "active", "ended"])
      .withMessage("Status must be: waiting, active, or ended"),
    body("adminNote")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage("Admin note must be less than 500 characters"),
  ],
  validateRequest,
  asyncHandler(chat.updateSession.bind(chat)),
);

/**
 * @route   POST /api/v1/chat/sessions/:sessionId/end
 * @desc    End a chat session
 * @access  Private (session owner or admin)
 */
router.post(
  "/sessions/:sessionId/end",
  chatLimiter,
  authenticate,
  [
    sessionIdParam,
    body("reason")
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage("Reason must be less than 100 characters"),
  ],
  validateRequest,
  asyncHandler(chat.endSession.bind(chat)),
);

/**
 * @route   GET /api/v1/chat/sessions/:sessionId/messages
 * @desc    Get messages for a chat session
 * @access  Private (session owner or admin)
 */
router.get(
  "/sessions/:sessionId/messages",
  chatLimiter,
  optionalAuthenticate, // Allow guests for guest sessions
  [
    sessionIdParam,
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
  asyncHandler(chat.getMessages.bind(chat)),
);

/**
 * @route   POST /api/v1/chat/sessions/:sessionId/messages
 * @desc    Send a message in a chat session
 * @access  Private (session owner or admin)
 */
router.post(
  "/sessions/:sessionId/messages",
  messageLimiter,
  optionalAuthenticate, // Allow guests for guest sessions
  [
    sessionIdParam,
    body("message")
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Message must be between 1 and 2000 characters"),
    body("sender")
      .optional()
      .isIn(["customer", "admin"])
      .withMessage("Sender must be either 'customer' or 'admin'"),
  ],
  validateRequest,
  asyncHandler(chat.sendMessage.bind(chat)),
);

module.exports = router;
