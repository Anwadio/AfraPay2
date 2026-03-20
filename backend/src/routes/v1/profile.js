/**
 * Profile Routes
 * Handles user profile management and settings
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const multer = require("multer");
const path = require("path");

// Import middleware
const { authenticate } = require("../../middleware/auth/authenticate");
const validateRequest = require("../../middleware/validation/validateRequest");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");

// Import controllers (to be created)
const profileController = require("../../controllers/profileController");

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

// All profile routes require authentication
router.use(authenticate);

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
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must be less than 500 characters"),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be less than 100 characters"),
];

const updateContactValidation = [
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Valid phone number is required"),
  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),
  body("emergencyContact")
    .optional()
    .isObject()
    .withMessage("Emergency contact must be an object"),
];

const securitySettingsValidation = [
  body("twoFactorAuth")
    .optional()
    .isBoolean()
    .withMessage("Two factor auth must be a boolean"),
  body("loginAlerts")
    .optional()
    .isBoolean()
    .withMessage("Login alerts must be a boolean"),
  body("transactionAlerts")
    .optional()
    .isBoolean()
    .withMessage("Transaction alerts must be a boolean"),
];

const privacySettingsValidation = [
  body("profileVisibility")
    .optional()
    .isIn(["public", "friends", "private"])
    .withMessage("Invalid profile visibility"),
  body("showEmail")
    .optional()
    .isBoolean()
    .withMessage("Show email must be a boolean"),
  body("showPhone")
    .optional()
    .isBoolean()
    .withMessage("Show phone must be a boolean"),
  body("allowMessaging")
    .optional()
    .isBoolean()
    .withMessage("Allow messaging must be a boolean"),
];

// Basic profile routes

/**
 * @route   GET /api/v1/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/", asyncHandler(profileController.getProfile));

/**
 * @route   PUT /api/v1/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/",
  updateProfileValidation,
  validateRequest,
  asyncHandler(profileController.updateProfile),
);

/**
 * @route   DELETE /api/v1/profile
 * @desc    Delete user profile (soft delete)
 * @access  Private
 */
router.delete(
  "/",
  body("password")
    .notEmpty()
    .withMessage("Password is required for account deletion"),
  body("confirmation")
    .equals("DELETE_MY_ACCOUNT")
    .withMessage('Confirmation must be "DELETE_MY_ACCOUNT"'),
  validateRequest,
  asyncHandler(profileController.deleteProfile),
);

// Contact information

/**
 * @route   GET /api/v1/profile/contact
 * @desc    Get contact information
 * @access  Private
 */
router.get("/contact", asyncHandler(profileController.getContactInfo));

/**
 * @route   PUT /api/v1/profile/contact
 * @desc    Update contact information
 * @access  Private
 */
router.put(
  "/contact",
  updateContactValidation,
  validateRequest,
  asyncHandler(profileController.updateContactInfo),
);

// Avatar management

/**
 * @route   POST /api/v1/profile/avatar
 * @desc    Upload profile avatar
 * @access  Private
 */
router.post(
  "/avatar",
  upload.single("profilePicture"),
  asyncHandler(profileController.uploadAvatar),
);

/**
 * @route   DELETE /api/v1/profile/avatar
 * @desc    Delete profile avatar
 * @access  Private
 */
router.delete("/avatar", asyncHandler(profileController.deleteAvatar));

// Document management

/**
 * @route   GET /api/v1/profile/documents
 * @desc    Get uploaded documents
 * @access  Private
 */
router.get("/documents", asyncHandler(profileController.getDocuments));

/**
 * @route   POST /api/v1/profile/documents
 * @desc    Upload verification document
 * @access  Private
 */
router.post(
  "/documents",
  upload.single("document"),
  body("type")
    .isIn(["id", "passport", "license", "utility_bill", "bank_statement"])
    .withMessage("Invalid document type"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description must be less than 200 characters"),
  validateRequest,
  asyncHandler(profileController.uploadDocument),
);

/**
 * @route   DELETE /api/v1/profile/documents/:documentId
 * @desc    Delete a document
 * @access  Private
 */
router.delete(
  "/documents/:documentId",
  param("documentId").isMongoId().withMessage("Valid document ID is required"),
  validateRequest,
  asyncHandler(profileController.deleteDocument),
);

// Security settings

/**
 * @route   GET /api/v1/profile/security
 * @desc    Get security settings
 * @access  Private
 */
router.get(
  "/security",
  asyncHandler((req, res) => profileController.getSecuritySettings(req, res)),
);

/**
 * @route   PUT /api/v1/profile/security
 * @desc    Update security settings
 * @access  Private
 */
router.put(
  "/security",
  securitySettingsValidation,
  validateRequest,
  asyncHandler((req, res) =>
    profileController.updateSecuritySettings(req, res),
  ),
);

// Privacy settings

/**
 * @route   GET /api/v1/profile/privacy
 * @desc    Get privacy settings
 * @access  Private
 */
router.get("/privacy", asyncHandler(profileController.getPrivacySettings));

/**
 * @route   PUT /api/v1/profile/privacy
 * @desc    Update privacy settings
 * @access  Private
 */
router.put(
  "/privacy",
  privacySettingsValidation,
  validateRequest,
  asyncHandler(profileController.updatePrivacySettings),
);

// Notification preferences

/**
 * @route   GET /api/v1/profile/notifications
 * @desc    Get notification preferences
 * @access  Private
 */
router.get(
  "/notifications",
  asyncHandler(profileController.getNotificationPreferences),
);

/**
 * @route   PUT /api/v1/profile/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  "/notifications",
  body("email")
    .optional()
    .isObject()
    .withMessage("Email notifications must be an object"),
  body("sms")
    .optional()
    .isObject()
    .withMessage("SMS notifications must be an object"),
  body("push")
    .optional()
    .isObject()
    .withMessage("Push notifications must be an object"),
  validateRequest,
  asyncHandler(profileController.updateNotificationPreferences),
);

// Account verification

/**
 * @route   GET /api/v1/profile/verification
 * @desc    Get account verification status
 * @access  Private
 */
router.get(
  "/verification",
  asyncHandler(profileController.getVerificationStatus),
);

/**
 * @route   POST /api/v1/profile/verification/request
 * @desc    Request account verification
 * @access  Private
 */
router.post(
  "/verification/request",
  body("verificationType")
    .isIn(["basic", "enhanced", "premium"])
    .withMessage("Invalid verification type"),
  validateRequest,
  asyncHandler(profileController.requestVerification),
);

// Activity and sessions

/**
 * @route   GET /api/v1/profile/activity
 * @desc    Get account activity
 * @access  Private
 */
router.get(
  "/activity",
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("type")
    .optional()
    .isIn([
      "login",
      "logout",
      "password_change",
      "profile_update",
      "transaction",
    ])
    .withMessage("Invalid activity type"),
  validateRequest,
  asyncHandler(profileController.getActivity),
);

/**
 * @route   GET /api/v1/profile/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get(
  "/sessions",
  asyncHandler((req, res) => profileController.getActiveSessions(req, res)),
);

/**
 * @route   DELETE /api/v1/profile/sessions/:sessionId
 * @desc    Revoke a session
 * @access  Private
 */
router.delete(
  "/sessions/:sessionId",
  param("sessionId").notEmpty().withMessage("Session ID is required"),
  validateRequest,
  asyncHandler((req, res) => profileController.revokeSession(req, res)),
);

/**
 * @route   DELETE /api/v1/profile/sessions
 * @desc    Revoke all sessions except current
 * @access  Private
 */
router.delete(
  "/sessions",
  asyncHandler((req, res) => profileController.revokeAllSessions(req, res)),
);

// Data export

/**
 * @route   GET /api/v1/profile/export
 * @desc    Export user data
 * @access  Private
 */
router.get(
  "/export",
  query("format").isIn(["json", "csv"]).withMessage("Invalid export format"),
  query("includeTransactions")
    .optional()
    .isBoolean()
    .withMessage("Include transactions must be a boolean"),
  validateRequest,
  asyncHandler(profileController.exportData),
);

module.exports = router;
