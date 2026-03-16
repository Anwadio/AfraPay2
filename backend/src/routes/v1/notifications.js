/**
 * Notification Routes  —  /api/v1/notifications
 *
 * All routes require authentication.
 *
 *   GET    /                  list paginated notifications (+ unreadCount)
 *   GET    /unread-count      lightweight badge count endpoint
 *   PATCH  /mark-all-read     mark every unread notification as read
 *   PATCH  /:id/read          mark a single notification as read
 *   DELETE /:id               delete a single notification
 */

"use strict";

const express = require("express");
const router = express.Router();
const { param } = require("express-validator");

const { authenticate } = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { createRateLimiter } = require("../../middleware/security/rateLimiter");
const {
  notificationController,
} = require("../../controllers/notificationController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const readLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests, please try again later.",
});

const writeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});

// ── Param validator ───────────────────────────────────────────────────────────
const idParam = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Notification ID is required")
    .isLength({ max: 36 })
    .withMessage("Invalid notification ID"),
  validateRequest,
];

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/notifications
 * Returns paginated notifications + unread count for the current user.
 * Query: page, limit, unreadOnly
 */
router.get(
  "/",
  authenticate,
  readLimiter,
  asyncHandler(
    notificationController.getNotifications.bind(notificationController),
  ),
);

/**
 * GET /api/v1/notifications/unread-count
 * Lightweight badge count — just returns { unreadCount: N }.
 */
router.get(
  "/unread-count",
  authenticate,
  readLimiter,
  asyncHandler(
    notificationController.getUnreadCount.bind(notificationController),
  ),
);

/**
 * PATCH /api/v1/notifications/mark-all-read
 * Mark every unread notification for the user as read.
 */
router.patch(
  "/mark-all-read",
  authenticate,
  writeLimiter,
  asyncHandler(
    notificationController.markAllAsRead.bind(notificationController),
  ),
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch(
  "/:id/read",
  authenticate,
  writeLimiter,
  idParam,
  asyncHandler(notificationController.markAsRead.bind(notificationController)),
);

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification.
 */
router.delete(
  "/:id",
  authenticate,
  writeLimiter,
  idParam,
  asyncHandler(
    notificationController.deleteNotification.bind(notificationController),
  ),
);

module.exports = router;
