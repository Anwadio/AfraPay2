/**
 * Session Management Middleware
 * Handles Appwrite session integration with Express
 */

const jwt = require("jsonwebtoken");
const { Users, Account } = require("node-appwrite");
const config = require("../../config/environment");
const logger = require("../../utils/logger");
const { AuthenticationError } = require("../monitoring/errorHandler");

class SessionManager {
  constructor() {
    this.client = require("../../database/connection").getAppwriteClient();
    this.users = new Users(this.client);
    this.account = new Account(this.client);
  }

  /**
   * Validate Appwrite session
   */
  async validateAppwriteSession(sessionId) {
    try {
      // Create a new client instance for this session
      const { Client } = require("node-appwrite");
      const sessionClient = new Client()
        .setEndpoint(config.database.appwrite.endpoint)
        .setProject(config.database.appwrite.projectId)
        .setSession(sessionId);

      const sessionAccount = new Account(sessionClient);
      const user = await sessionAccount.get();

      return { valid: true, user };
    } catch (error) {
      logger.warn("Appwrite session validation failed", {
        sessionId,
        error: error.message,
      });
      return { valid: false, error: error.message };
    }
  }

  /**
   * Middleware to authenticate requests using Appwrite sessions
   */
  authenticateSession() {
    return async (req, res, next) => {
      try {
        // Get session ID from various sources
        const sessionId = this.extractSessionId(req);

        if (!sessionId) {
          throw new AuthenticationError("No session provided");
        }

        // Validate Appwrite session
        const { valid, user, error } =
          await this.validateAppwriteSession(sessionId);

        if (!valid) {
          throw new AuthenticationError(`Invalid session: ${error}`);
        }

        // Check if user account is active
        const userDetails = await this.users.get(user.$id);
        const accountStatus = userDetails.labels?.accountStatus || "active";

        if (accountStatus !== "active") {
          throw new AuthenticationError("Account is inactive or suspended");
        }

        // Check Redis session data for additional validation
        if (req.redis) {
          const redisSessionData = await req.redis.get(`session:${sessionId}`);
          if (redisSessionData) {
            const sessionData = JSON.parse(redisSessionData);

            // Update last activity
            sessionData.lastActivity = new Date().toISOString();
            await req.redis.setex(
              `session:${sessionId}`,
              24 * 60 * 60,
              JSON.stringify(sessionData),
            );
          }
        }

        // Attach user and session info to request
        req.user = {
          id: user.$id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          emailVerified: user.emailVerification,
          phoneVerified: user.phoneVerification,
          labels: userDetails.labels || {},
          prefs: user.prefs || {},
        };

        req.session = {
          id: sessionId,
          appwriteUser: user,
        };

        next();
      } catch (error) {
        logger.error("Session authentication failed", {
          error: error.message,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });

        return res.status(401).json({
          success: false,
          message: error.message || "Authentication failed",
          code: "AUTHENTICATION_FAILED",
        });
      }
    };
  }

  /**
   * Extract session ID from request
   */
  extractSessionId(req) {
    // Check Authorization header
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      // Try to decode JWT to get session ID
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.sessionId) {
          return decoded.sessionId;
        }
      } catch (error) {
        // If JWT decode fails, token might be Appwrite session ID
        return token;
      }
    }

    // Check cookies
    if (req.cookies) {
      return (
        req.cookies["appwrite-session"] ||
        req.cookies["sessionId"] ||
        req.cookies["session"]
      );
    }

    // Check custom headers
    return req.get("X-Appwrite-Session") || req.get("X-Session-ID");
  }

  /**
   * Middleware to require specific KYC level
   */
  requireKYCLevel(minLevel) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const userKYCLevel = parseInt(req.user.labels.kycLevel || "0");

      if (userKYCLevel < minLevel) {
        return res.status(403).json({
          success: false,
          message: `KYC Level ${minLevel} required. Current level: ${userKYCLevel}`,
          code: "INSUFFICIENT_KYC_LEVEL",
          data: {
            required: minLevel,
            current: userKYCLevel,
          },
        });
      }

      next();
    };
  }

  /**
   * Middleware to require specific permissions
   */
  requirePermissions(permissions) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const userPermissions = req.user.prefs.permissions || [];
      const hasRequiredPermissions = permissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasRequiredPermissions) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
          data: {
            required: permissions,
            current: userPermissions,
          },
        });
      }

      next();
    };
  }

  /**
   * Middleware for optional authentication
   */
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const sessionId = this.extractSessionId(req);

        if (sessionId) {
          const { valid, user } = await this.validateAppwriteSession(sessionId);

          if (valid && user) {
            const userDetails = await this.users.get(user.$id);

            req.user = {
              id: user.$id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              emailVerified: user.emailVerification,
              phoneVerified: user.phoneVerification,
              labels: userDetails.labels || {},
              prefs: user.prefs || {},
            };

            req.session = {
              id: sessionId,
              appwriteUser: user,
            };
          }
        }
      } catch (error) {
        // Log error but don't block request
        logger.warn("Optional auth failed", {
          error: error.message,
          ip: req.ip,
        });
      }

      next();
    };
  }
}

module.exports = new SessionManager();
