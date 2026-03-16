/**
 * Authentication Validation Middleware
 * Validates authentication-related requests using express-validator
 */

const { body } = require("express-validator");
const validateRequest = require("./validateRequest");

/**
 * Validation for user registration
 */
const validateRegistration = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]+$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "First name can only contain letters, spaces, hyphens, and apostrophes",
    ),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens, and apostrophes",
    ),

  body("phone")
    .optional()
    .isMobilePhone("any", { strictMode: false })
    .withMessage("Please provide a valid phone number"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be in ISO 8601 format (YYYY-MM-DD)")
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      if (age < 18) {
        throw new Error("You must be at least 18 years old to register");
      }

      return true;
    }),

  body("country")
    .optional()
    .isLength({ min: 2, max: 3 })
    .withMessage("Country code must be 2-3 characters")
    .isAlpha()
    .withMessage("Country code must contain only letters"),

  validateRequest,
];

/**
 * Validation for user login
 */
const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),

  body("mfaCode")
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("MFA code must be 6 digits"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me must be a boolean value"),

  validateRequest,
];

/**
 * Validation for refresh token
 */
const validateRefreshToken = [
  body("refreshToken")
    .optional()
    .isJWT()
    .withMessage("Invalid refresh token format"),

  validateRequest,
];

/**
 * Validation for email verification
 */
const validateEmailVerification = [
  body("token")
    .isLength({ min: 32, max: 64 })
    .isAlphanumeric()
    .withMessage("Invalid verification token format"),

  validateRequest,
];

/**
 * Validation for password reset request
 */
const validatePasswordResetRequest = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  validateRequest,
];

/**
 * Validation for password reset
 */
const validatePasswordReset = [
  body("token")
    .isLength({ min: 32, max: 64 })
    .isAlphanumeric()
    .withMessage("Invalid reset token format"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]+$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  validateRequest,
];

/**
 * Validation for MFA setup
 */
const validateMFASetup = [
  body("method")
    .isIn(["sms", "email", "totp"])
    .withMessage("MFA method must be sms, email, or totp"),

  body("phone")
    .if(body("method").equals("sms"))
    .isMobilePhone("any", { strictMode: false })
    .withMessage("Valid phone number is required for SMS MFA"),

  validateRequest,
];

/**
 * Validation for MFA verification
 */
const validateMFAVerification = [
  body("code")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("MFA code must be 6 digits"),

  body("mfaToken").notEmpty().withMessage("MFA token is required"),

  validateRequest,
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateEmailVerification,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateMFASetup,
  validateMFAVerification,
  // Aliases used by auth routes
  validateForgotPassword: validatePasswordResetRequest,
  validateResetPassword: validatePasswordReset,
  validateChangePassword: validateLogin, // password + auth fields — reuse login validation
  validateProfileUpdate: [], // no strict validation needed; controller validates fields
  validateMFA: validateMFAVerification,
  validateMFADisable: validateMFAVerification,
};
