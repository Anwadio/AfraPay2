/**
 * Authentication Routes
 * Handles user authentication, registration, and token management
 */

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { body, query } = require("express-validator");

// Import middleware
const validateRequest = require("../../middleware/validation/validateRequest");
const { authenticate } = require("../../middleware/auth/authenticate");
const { asyncHandler } = require("../../middleware/monitoring/errorHandler");
const { authLimiter } = require("../../middleware/security/rateLimiter");

// Import controllers (to be created)
const authController = require("../../controllers/authController");

// Strict login limiter (5 attempts / 15 min per IP+email)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message: "Too many login attempts, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
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
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
];

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
];

// Authentication routes

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  authLimiter,
  registerValidation,
  validateRequest,
  asyncHandler(authController.register.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  "/login",
  loginLimiter,
  loginValidation,
  validateRequest,
  asyncHandler(authController.login.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(authController.logout.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Private
 */
router.post(
  "/refresh-token",
  asyncHandler(authController.refreshToken.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
  "/forgot-password",
  authLimiter,
  forgotPasswordValidation,
  validateRequest,
  asyncHandler(authController.forgotPassword.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  "/reset-password",
  authLimiter,
  resetPasswordValidation,
  validateRequest,
  asyncHandler(authController.resetPassword.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  changePasswordValidation,
  validateRequest,
  asyncHandler(authController.changePassword.bind(authController)),
);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get(
  "/verify-email/:token",
  asyncHandler(authController.verifyEmail.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification (authenticated user)
 * @access  Private
 */
router.post(
  "/resend-verification",
  authenticate,
  authLimiter,
  asyncHandler(authController.resendVerification.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/resend-verification-email
 * @desc    Resend verification email by address — no auth needed (for unverified users at login)
 * @access  Public
 */
router.post(
  "/resend-verification-email",
  authLimiter,
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  validateRequest,
  asyncHandler(authController.resendVerificationByEmail.bind(authController)),
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(authController.getCurrentUser.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/facebook
 * @desc    Sign in (or sign up) with a Facebook access token
 * @access  Public
 */
router.post(
  "/facebook",
  authLimiter,
  body("accessToken")
    .notEmpty()
    .withMessage("Facebook access token is required"),
  body("userID").notEmpty().withMessage("Facebook user ID is required"),
  validateRequest,
  asyncHandler(authController.facebookOAuth.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Sign in (or sign up) with a Google ID token
 * @access  Public
 */
router.post(
  "/google",
  authLimiter,
  body("credential").notEmpty().withMessage("Google credential is required"),
  validateRequest,
  asyncHandler(authController.googleOAuth.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/enable-2fa
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post(
  "/enable-2fa",
  authenticate,
  asyncHandler(authController.enable2FA.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/verify-2fa
 * @desc    Verify two-factor authentication code
 * @access  Private
 */
router.post(
  "/verify-2fa",
  authenticate,
  body("code")
    .isLength({ min: 6, max: 6 })
    .withMessage("2FA code must be 6 digits"),
  validateRequest,
  asyncHandler(authController.verify2FA.bind(authController)),
);

/**
 * @route   POST /api/v1/auth/disable-2fa
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post(
  "/disable-2fa",
  authenticate,
  body("code")
    .isLength({ min: 6, max: 6 })
    .withMessage("2FA code must be 6 digits"),
  body("password")
    .notEmpty()
    .withMessage("Password is required to disable 2FA"),
  validateRequest,
  asyncHandler(authController.disable2FA.bind(authController)),
);

module.exports = router;
