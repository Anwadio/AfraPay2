/**
 * User Routes
 * Handles user management and profile operations
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const multer = require("multer");
const path = require("path");

// Import middleware
const { authenticate } = require("../../middleware/auth/authenticate");
const { authorize } = require("../../middleware/auth/authorize");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const {
  globalLimiter: userLimiter,
} = require("../../middleware/security/rateLimiter");

// Import controllers (to be created)
const userController = require("../../controllers/userController");

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only JPEG, JPG, PNG, and PDF files are allowed"));
    }
  },
});

// Validation schemas
const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Valid phone number is required"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Valid date of birth is required"),
  body("country")
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage("Country code must be 2 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address must be less than 200 characters"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City must be less than 100 characters"),
  body("state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("State must be less than 100 characters"),
  body("postalCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Postal code must be less than 20 characters"),
];

const userIdValidation = [
  param("userId").isMongoId().withMessage("Valid user ID is required"),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),
];

// User routes

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get("/profile", authenticate, asyncHandler(userController.getProfile));

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put(
  "/profile",
  authenticate,
  updateProfileValidation,
  validateRequest,
  asyncHandler(userController.updateProfile),
);

/**
 * @route   POST /api/v1/users/upload-avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post(
  "/upload-avatar",
  authenticate,
  upload.single("avatar"),
  asyncHandler(userController.uploadAvatar),
);

/**
 * @route   DELETE /api/v1/users/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete(
  "/avatar",
  authenticate,
  asyncHandler(userController.deleteAvatar),
);

/**
 * @route   POST /api/v1/users/upload-document
 * @desc    Upload verification document
 * @access  Private
 */
router.post(
  "/upload-document",
  authenticate,
  upload.single("document"),
  body("type")
    .isIn(["id", "passport", "license", "utility_bill"])
    .withMessage("Invalid document type"),
  validateRequest,
  asyncHandler(userController.uploadDocument),
);

/**
 * @route   GET /api/v1/users/documents
 * @desc    Get user's uploaded documents
 * @access  Private
 */
router.get(
  "/documents",
  authenticate,
  asyncHandler(userController.getDocuments),
);

/**
 * @route   DELETE /api/v1/users/documents/:documentId
 * @desc    Delete a document
 * @access  Private
 */
router.delete(
  "/documents/:documentId",
  authenticate,
  param("documentId").isMongoId().withMessage("Valid document ID is required"),
  validateRequest,
  asyncHandler(userController.deleteDocument),
);

/**
 * @route   GET /api/v1/users/verification-status
 * @desc    Get user verification status
 * @access  Private
 */
router.get(
  "/verification-status",
  authenticate,
  asyncHandler(userController.getVerificationStatus),
);

/**
 * @route   POST /api/v1/users/request-verification
 * @desc    Request account verification
 * @access  Private
 */
router.post(
  "/request-verification",
  authenticate,
  asyncHandler(userController.requestVerification),
);

/**
 * @route   GET /api/v1/users/activity
 * @desc    Get user activity log
 * @access  Private
 */
router.get(
  "/activity",
  authenticate,
  paginationValidation,
  validateRequest,
  asyncHandler(userController.getActivityLog),
);

/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  "/preferences",
  authenticate,
  body("notifications")
    .optional()
    .isObject()
    .withMessage("Notifications must be an object"),
  body("privacy")
    .optional()
    .isObject()
    .withMessage("Privacy must be an object"),
  body("security")
    .optional()
    .isObject()
    .withMessage("Security must be an object"),
  validateRequest,
  asyncHandler(userController.updatePreferences),
);

/**
 * @route   DELETE /api/v1/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete(
  "/account",
  authenticate,
  body("password")
    .notEmpty()
    .withMessage("Password is required for account deletion"),
  body("confirmation")
    .equals("DELETE_MY_ACCOUNT")
    .withMessage('Confirmation must be "DELETE_MY_ACCOUNT"'),
  validateRequest,
  asyncHandler(userController.deleteAccount),
);

// Admin-only routes

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/",
  authenticate,
  authorize(["admin"]),
  paginationValidation,
  validateRequest,
  asyncHandler(userController.getAllUsers),
);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/:userId",
  authenticate,
  authorize(["admin"]),
  userIdValidation,
  validateRequest,
  asyncHandler(userController.getUserById),
);

/**
 * @route   PUT /api/v1/users/:userId/status
 * @desc    Update user status (Admin only)
 * @access  Private (Admin)
 */
router.put(
  "/:userId/status",
  authenticate,
  authorize(["admin"]),
  userIdValidation,
  body("status")
    .isIn(["active", "suspended", "blocked"])
    .withMessage("Invalid status"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be less than 500 characters"),
  validateRequest,
  asyncHandler(userController.updateUserStatus),
);

/**
 * @route   PUT /api/v1/users/:userId/verification
 * @desc    Update user verification status (Admin only)
 * @access  Private (Admin)
 */
router.put(
  "/:userId/verification",
  authenticate,
  authorize(["admin"]),
  userIdValidation,
  body("status")
    .isIn(["pending", "verified", "rejected"])
    .withMessage("Invalid verification status"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
  validateRequest,
  asyncHandler(userController.updateVerificationStatus),
);

/**
 * @route   GET /api/v1/users/:userId/activity
 * @desc    Get user activity (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/:userId/activity",
  authenticate,
  authorize(["admin"]),
  userIdValidation,
  paginationValidation,
  validateRequest,
  asyncHandler(userController.getUserActivity),
);

module.exports = router;
