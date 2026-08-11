/**
 * CAPTCHA Verification Middleware
 * Integrates Google reCAPTCHA v3 for bot protection on login and registration.
 *
 * Environment variables:
 *   RECAPTCHA_SECRET_KEY  — Server-side secret key (from Google reCAPTCHA admin)
 *   RECAPTCHA_SITE_KEY    — Client-side site key (exposed via /api/v1/auth/config)
 *   RECAPTCHA_THRESHOLD   — Minimum score to accept (default: 0.5)
 *
 * If RECAPTCHA_SECRET_KEY is not set, the middleware passes all requests through
 * (degraded mode) so development is not blocked.
 */

const axios = require("axios");
const config = require("../../config/environment");
const logger = require("../../utils/logger");

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";
const RECAPTCHA_THRESHOLD = parseFloat(
  process.env.RECAPTCHA_THRESHOLD || "0.5",
);
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * Middleware to verify a reCAPTCHA v3 token from the client.
 *
 * The client must include a `recaptchaToken` field in the request body.
 * This middleware adds `req.recaptchaScore` so downstream handlers can
 * make fine-grained decisions (e.g., require MFA for low scores).
 *
 * Usage:
 *   router.post("/login", captchaMiddleware, validation, handler);
 */
async function verifyCaptcha(req, res, next) {
  // Degraded mode — skip verification if not configured
  if (!RECAPTCHA_SECRET_KEY) {
    logger.warn("CAPTCHA verification skipped — RECAPTCHA_SECRET_KEY not set");
    req.recaptchaScore = 1.0; // perfect score — pass
    return next();
  }

  const token = req.body?.recaptchaToken;

  if (!token) {
    logger.warn("CAPTCHA verification failed — no token provided", {
      ip: req.ip,
      path: req.path,
    });
    return res.status(400).json({
      success: false,
      error: {
        code: "CAPTCHA_REQUIRED",
        message: "Bot verification is required. Please try again.",
      },
    });
  }

  try {
    const { data } = await axios.post(RECAPTCHA_VERIFY_URL, null, {
      params: {
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
        remoteip: req.ip,
      },
      timeout: 5000,
    });

    if (!data.success) {
      logger.warn("CAPTCHA verification failed", {
        ip: req.ip,
        errorCodes: data["error-codes"],
      });
      return res.status(403).json({
        success: false,
        error: {
          code: "CAPTCHA_FAILED",
          message: "Bot verification failed. Please try again.",
        },
      });
    }

    req.recaptchaScore = data.score;

    // Reject low-score requests outright
    if (data.score < RECAPTCHA_THRESHOLD) {
      logger.warn("CAPTCHA score below threshold", {
        ip: req.ip,
        score: data.score,
        threshold: RECAPTCHA_THRESHOLD,
      });
      return res.status(403).json({
        success: false,
        error: {
          code: "CAPTCHA_LOW_SCORE",
          message: "Suspicious activity detected. Please try again.",
        },
      });
    }

    logger.debug("CAPTCHA verification passed", {
      ip: req.ip,
      score: data.score,
    });

    next();
  } catch (error) {
    logger.error("CAPTCHA verification error", {
      error: error.message,
      ip: req.ip,
    });
    // Fail open with warning for production, fail closed for high-security
    // Here we fail open to avoid blocking legitimate users during outages
    req.recaptchaScore = 0.5;
    next();
  }
}

module.exports = { verifyCaptcha };
