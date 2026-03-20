/**
 * Newsletter Routes
 * Handles newsletter subscription endpoints
 */

const express = require("express");
const { body, query } = require("express-validator");
const validateRequest = require("../../middleware/validation/validateRequest");
const { authenticate } = require("../../middleware/auth/authenticate");
const newsletterController = require("../../controllers/newsletterController");

const router = express.Router();

// Public routes

/**
 * @swagger
 * /newsletter/subscribe:
 *   post:
 *     summary: Subscribe to newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               source:
 *                 type: string
 *                 example: blog_page
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["blog", "product_updates"]
 *     responses:
 *       201:
 *         description: Successfully subscribed
 *       409:
 *         description: Email already subscribed
 *       400:
 *         description: Invalid input
 */
router.post(
  "/subscribe",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("source")
      .optional()
      .isString()
      .trim()
      .withMessage("Source must be a string"),
    body("interests")
      .optional()
      .isArray()
      .withMessage("Interests must be an array"),
  ],
  validateRequest,
  newsletterController.subscribe,
);

/**
 * @swagger
 * /newsletter/unsubscribe:
 *   post:
 *     summary: Unsubscribe from newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
 *       404:
 *         description: Email not found
 */
router.post(
  "/unsubscribe",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
  ],
  validateRequest,
  newsletterController.unsubscribe,
);

/**
 * @swagger
 * /newsletter/preferences:
 *   put:
 *     summary: Update newsletter preferences
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - preferences
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               preferences:
 *                 type: object
 *                 properties:
 *                   blog:
 *                     type: boolean
 *                   productUpdates:
 *                     type: boolean
 *                   financialTips:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.put(
  "/preferences",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("preferences").isObject().withMessage("Preferences must be an object"),
  ],
  validateRequest,
  newsletterController.updatePreferences,
);

// Admin routes

/**
 * @swagger
 * /newsletter/subscribers:
 *   get:
 *     summary: Get all newsletter subscribers (Admin only)
 *     tags: [Newsletter, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of subscribers
 */
router.get(
  "/subscribers",
  authenticate,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("active")
      .optional()
      .isBoolean()
      .withMessage("Active must be a boolean"),
  ],
  validateRequest,
  newsletterController.getSubscribers,
);

module.exports = router;
