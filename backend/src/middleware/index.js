/**
 * Middleware Setup
 * Centralized middleware configuration for Express app
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const config = require("../config/environment");
const logger = require("../utils/logger");
const rateLimiter = require("./security/rateLimiter");
const securityHeaders = require("./security/helmet");
const requestLogger = require("./monitoring/requestLogger");
const responseHandler = require("./common/responseHandler");

/**
 * Configure all middleware for the Express application
 * @param {Express} app - Express application instance
 */
function setupMiddleware(app) {
  // Trust proxy for production deployments
  if (config.app.isProduction) {
    app.set("trust proxy", 1);
  }

  // Security middleware
  app.use(securityHeaders());

  // CORS configuration
  app.use(
    cors({
      origin: config.security.cors.origin,
      credentials: config.security.cors.credentials,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Accept-Language",
        "Authorization",
        "X-API-Key",
        "X-App-Language",
        "X-Device-ID",
        "X-Request-ID",
      ],
      exposedHeaders: ["X-Request-ID", "X-Rate-Limit-Remaining"],
    }),
  );

  // Rate limiting
  if (config.features.rateLimiting) {
    app.use("/api/", rateLimiter.globalLimiter);
    app.use("/api/auth/", rateLimiter.authLimiter);
    app.use("/api/payments/", rateLimiter.paymentLimiter);
  }

  // Compression middleware
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024,
    }),
  );

  // Body parsing middleware
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, res, buf, encoding) => {
        // Store raw body for webhook verification
        if (req.originalUrl.startsWith("/webhooks/")) {
          req.rawBody = buf;
        }
      },
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: "10mb",
    }),
  );

  // Cookie parsing
  app.use(cookieParser(config.security.cookie.secret));

  // Request logging
  if (config.logging.enableRequestLogging) {
    app.use(requestLogger());
  }

  // HTTP request logging for development
  if (config.app.isDevelopment) {
    app.use(morgan("dev"));
  }

  // Custom response handler
  app.use(responseHandler);

  // Request ID middleware for tracing
  app.use((req, res, next) => {
    req.id = req.headers["x-request-id"] || require("crypto").randomUUID();
    res.setHeader("X-Request-ID", req.id);
    next();
  });

  // Request timeout middleware
  app.use((req, res, next) => {
    res.setTimeout(30000, () => {
      res.status(408).json({
        success: false,
        error: {
          code: "REQUEST_TIMEOUT",
          message: "Request timeout",
        },
      });
    });
    next();
  });

  logger.info("All middleware configured successfully");
}

module.exports = setupMiddleware;
