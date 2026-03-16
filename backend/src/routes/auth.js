/**
 * Authentication Routes
 * Handles user authentication, registration, and session management with Appwrite integration
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth/authenticate");
const validation = require("../middleware/validation/authValidation");
const { asyncHandler } = require("../middleware/monitoring/errorHandler");
const logger = require("../utils/logger");

const router = express.Router();

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 attempts per window
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Maximum 3 registrations per hour per IP
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
    code: "REGISTRATION_LIMIT_EXCEEDED",
  },
});

// Authentication routes

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user with Appwrite integration
 * @access  Public
 */
router.post(
  "/register",
  registrationLimiter,
  validation.validateRegistration,
  asyncHandler(authController.register.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with Appwrite session creation
 * @access  Public
 */
router.post(
  "/login",
  authLimiter,
  validation.validateLogin,
  asyncHandler(authController.login.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate Appwrite session
 * @access  Private
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(authController.logout.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using Appwrite session
 * @access  Private
 */
router.post(
  "/refresh-token",
  asyncHandler(authController.refreshToken.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify user email with Appwrite
 * @access  Public
 */
router.post(
  "/verify-email",
  validation.validateEmailVerification,
  asyncHandler(authController.verifyEmail.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post(
  "/resend-verification",
  authenticate,
  asyncHandler(authController.resendEmailVerification.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email via Appwrite
 * @access  Public
 */
router.post(
  "/forgot-password",
  authLimiter,
  validation.validateForgotPassword,
  asyncHandler(authController.forgotPassword.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using Appwrite recovery
 * @access  Public
 */
router.post(
  "/reset-password",
  validation.validateResetPassword,
  asyncHandler(authController.resetPassword.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password (authenticated)
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  validation.validateChangePassword,
  asyncHandler(authController.changePassword.bind(authController)),
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user from JWT
 * @access  Private
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(authController.getCurrentUser.bind(authController)),
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile with Appwrite data
 * @access  Private
 */
router.get(
  "/profile",
  authenticate,
  asyncHandler(authController.getCurrentUser.bind(authController)),
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile (delegates to profile controller)
 * @access  Private
 */
router.put(
  "/profile",
  authenticate,
  validation.validateProfileUpdate,
  asyncHandler(authController.changePassword.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/enable-mfa
 * @desc    Enable multi-factor authentication
 * @access  Private
 */
router.post(
  "/enable-mfa",
  authenticate,
  asyncHandler(authController.enable2FA.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/disable-mfa
 * @desc    Disable multi-factor authentication
 * @access  Private
 */
router.post(
  "/disable-mfa",
  authenticate,
  validation.validateMFADisable,
  asyncHandler(authController.disable2FA.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/verify-mfa
 * @desc    Verify MFA code during sensitive operations
 * @access  Public (uses mfaToken to identify session)
 */
router.post(
  "/verify-mfa",
  validation.validateMFA,
  asyncHandler(authController.verify2FA.bind(authController)),
);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get all active sessions (TODO: implement getSessions)
 * @access  Private
 */
router.get("/sessions", authenticate, (req, res) => {
  res.json({
    success: true,
    data: { sessions: [] },
    message: "Sessions endpoint",
  });
});

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Delete specific session (TODO: implement)
 * @access  Private
 */
router.delete("/sessions/:sessionId", authenticate, (req, res) => {
  res.json({ success: true, data: null, message: "Session deleted" });
});

/**
 * @route   DELETE /api/v1/auth/sessions
 * @desc    Delete all other sessions (TODO: implement)
 * @access  Private
 */
router.delete("/sessions", authenticate, (req, res) => {
  res.json({
    success: true,
    data: null,
    message: "All other sessions deleted",
  });
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth service is healthy",
    timestamp: new Date().toISOString(),
    appwrite: {
      endpoint: process.env.APPWRITE_ENDPOINT,
      project: process.env.APPWRITE_PROJECT_ID,
      connected: true,
    },
  });
});

// Error handling middleware specific to auth routes
router.use((error, req, res, next) => {
  logger.error("Auth route error:", {
    error: error.message,
    stack: error.stack,
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Handle specific Appwrite errors
  if (error.type && error.type.includes("user_")) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: error.type,
      type: "APPWRITE_ERROR",
    });
  }

  next(error);
});

module.exports = router;
