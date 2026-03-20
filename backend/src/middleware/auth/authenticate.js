/**
 * Authentication Middleware
 * Verifies JWT tokens and authenticates users
 */

const jwt = require("jsonwebtoken");
const config = require("../../config/environment");
const logger = require("../../utils/logger");
const { AuthenticationError } = require("../monitoring/errorHandler");
const { isBlacklisted } = require("../../utils/tokenBlacklist");

/**
 * Extract token from request headers or cookies.
 * NOTE: Query-parameter tokens are intentionally NOT supported here.
 * Tokens in URLs are logged by proxies, access logs, and appear in
 * browser history and Referer headers, leaking credentials.
 * WebSocket handshake tokens are passed via socket.handshake.auth.
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
function extractToken(req) {
  // Check Authorization header (Bearer token)
  const authHeader = req.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7); // Remove 'Bearer ' prefix
  }

  // Check cookies (for web sessions)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

/**
 * Verify JWT token and decode payload
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.security.jwt.secret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid token");
    } else {
      throw new AuthenticationError("Token verification failed");
    }
  }
}

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from request
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError("Authentication token is required");
    }

    // Verify and decode token
    const decoded = verifyToken(token);

    // Check if token type is correct (access token)
    if (decoded.type !== "access") {
      throw new AuthenticationError("Invalid token type");
    }

    // Check if token has been revoked (e.g. user logged out)
    if (await isBlacklisted(decoded, token)) {
      throw new AuthenticationError("Token has been revoked");
    }

    // TODO: Load user from database and attach to request
    // const user = await getUserById(decoded.userId);
    // if (!user) {
    //   throw new AuthenticationError('User not found');
    // }

    // if (user.status !== 'active') {
    //   throw new AuthenticationError('User account is not active');
    // }

    // For now, attach decoded token data to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    req.token = token;
    req.tokenPayload = decoded;

    // Log successful authentication
    logger.info("User authenticated successfully", {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      sessionId: req.user.sessionId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.id,
    });

    next();
  } catch (error) {
    // Log authentication failure
    logger.warn("Authentication failed", {
      error: error.message,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
    });

    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token is provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyToken(token);

      if (decoded.type === "access") {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
          sessionId: decoded.sessionId,
          iat: decoded.iat,
          exp: decoded.exp,
        };
        req.token = token;
        req.tokenPayload = decoded;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on authentication errors
    // Just proceed without user data
    logger.debug("Optional authentication failed", {
      error: error.message,
      ip: req.ip,
      requestId: req.id,
    });

    next();
  }
}

/**
 * WebSocket authentication middleware
 * @param {Object} socket - Socket.io socket object
 * @param {Function} next - Next function
 */
function authenticateWebSocket(socket, next) {
  try {
    const token =
      socket.request.headers.authorization?.slice(7) ||
      socket.handshake.auth.token ||
      socket.handshake.query.token;

    if (!token) {
      return next(new AuthenticationError("Authentication token is required"));
    }

    const decoded = verifyToken(token);

    if (decoded.type !== "access") {
      return next(new AuthenticationError("Invalid token type"));
    }

    socket.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId,
    };

    logger.info("WebSocket user authenticated", {
      userId: socket.user.id,
      email: socket.user.email,
      socketId: socket.id,
      ip: socket.request.connection.remoteAddress,
    });

    next();
  } catch (error) {
    logger.warn("WebSocket authentication failed", {
      error: error.message,
      socketId: socket.id,
      ip: socket.request.connection.remoteAddress,
    });

    next(error);
  }
}

/**
 * Optional WebSocket authentication middleware for guest and authenticated users
 * @param {Object} socket - Socket.io socket object
 * @param {Function} next - Next function
 */
function optionalAuthenticateWebSocket(socket, next) {
  try {
    const token =
      socket.request.headers.authorization?.slice(7) ||
      socket.handshake.auth.token ||
      socket.handshake.query.token;

    if (!token) {
      // Allow guest users
      socket.user = null;
      logger.info("WebSocket guest user connected", {
        socketId: socket.id,
        ip: socket.request.connection.remoteAddress,
      });
      return next();
    }

    try {
      const decoded = verifyToken(token);

      if (decoded.type !== "access") {
        // Invalid token - treat as guest
        socket.user = null;
        return next();
      }

      socket.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        sessionId: decoded.sessionId,
      };

      logger.info("WebSocket user authenticated", {
        userId: socket.user.id,
        email: socket.user.email,
        socketId: socket.id,
        ip: socket.request.connection.remoteAddress,
      });
    } catch (authError) {
      // Authentication failed - treat as guest
      socket.user = null;
      logger.info("WebSocket guest user connected (auth failed)", {
        socketId: socket.id,
        ip: socket.request.connection.remoteAddress,
        authError: authError.message,
      });
    }

    next();
  } catch (error) {
    // Unexpected error - still allow as guest
    socket.user = null;
    logger.warn("WebSocket authentication error, treating as guest", {
      error: error.message,
      socketId: socket.id,
      ip: socket.request.connection.remoteAddress,
    });
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authenticateWebSocket,
  optionalAuthenticateWebSocket,
  extractToken,
  verifyToken,
};
