/**
 * AfraPay Backend Server
 * Production-ready Express.js server with comprehensive security and monitoring
 */

require("express-async-errors");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const requestId = require("express-request-id").default;

const config = require("./config/environment");
const logger = require("./utils/logger");
const {
  connectDatabase,
  disconnectDatabase,
} = require("./database/connection");

// Import middleware
const helmetMiddleware = require("./middleware/security/helmet");
const { globalLimiter } = require("./middleware/security/rateLimiter");
const sanitize = require("./middleware/security/sanitize");
const requestLogger = require("./middleware/monitoring/requestLogger");
const responseHandler = require("./middleware/common/responseHandler");
const {
  metricsCollector,
  createMetricsHandler,
  attachConnectionTracker,
} = require("./middleware/monitoring/metrics");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/monitoring/errorHandler");

// Import routes
const setupRoutes = require("./routes");

class AfrPayServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
  }

  async initialize() {
    try {
      // Database connection — non-fatal: server starts even if Appwrite is temporarily unreachable
      try {
        await connectDatabase();
        logger.info("Database connected successfully");
      } catch (dbError) {
        logger.warn(
          `⚠️  Database connection failed at startup (${dbError.message}). Server will start without a confirmed DB connection.`,
        );
      }

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Error handling
      this.setupErrorHandling();

      // WebSocket setup
      this.setupWebSocket();

      logger.info("AfraPay server initialized successfully");
    } catch (error) {
      logger.error("Server initialization failed:", error);
      throw error;
    }
  }

  setupMiddleware() {
    // Request ID for tracing
    this.app.use(requestId());

    // CORS must be first — before Helmet and rate limiting so that preflight
    // OPTIONS requests always receive Access-Control-Allow-* headers regardless
    // of any downstream middleware rejecting the request.
    this.app.use(
      cors({
        origin: config.security.cors.allowedOrigins,
        methods: config.security.cors.allowedMethods,
        allowedHeaders: config.security.cors.allowedHeaders,
        credentials: config.security.cors.credentials,
        maxAge: config.security.cors.maxAge,
        optionsSuccessStatus: 204,
      }),
    );
    // Respond to all preflight requests immediately without going further
    this.app.options(
      "*",
      cors({
        origin: config.security.cors.allowedOrigins,
        credentials: config.security.cors.credentials,
        optionsSuccessStatus: 204,
      }),
    );

    // Security middleware — helmetMiddleware exports a factory that returns an array
    this.app.use(...helmetMiddleware());

    // Rate limiting
    this.app.use(globalLimiter);

    // Cache-Control headers for read-heavy GET endpoints
    this.app.use((req, res, next) => {
      if (req.method === "GET") {
        if (req.path.startsWith("/api/v1/profile")) {
          // Profile data: allow client to cache for 60s, revalidate in background
          res.setHeader(
            "Cache-Control",
            "private, max-age=60, stale-while-revalidate=300",
          );
        } else if (req.path.startsWith("/api/v1/transactions")) {
          // Transaction list: short cache, always revalidate (financial data must be fresh)
          res.setHeader(
            "Cache-Control",
            "private, max-age=10, stale-while-revalidate=30",
          );
        } else {
          res.setHeader("Cache-Control", "no-store");
        }
      } else {
        res.setHeader("Cache-Control", "no-store");
      }
      next();
    });

    // Body parsing — generous limit only for upload routes; keep JSON/form tight
    // to prevent memory-exhaustion (DoS) via oversized request bodies.
    this.app.use(
      express.json({
        limit: "100kb",
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      }),
    );
    this.app.use(express.urlencoded({ extended: true, limit: "50kb" }));
    this.app.use(cookieParser());

    // Sanitize all inputs: prototype-pollution, null-byte injection, HPP
    this.app.use(sanitize);

    // Compression — only for responses >= 1KB, skip already-compressed content types
    this.app.use(compression({ threshold: 1024, level: 6 }));

    // Logging
    if (config.app.isDevelopment) {
      this.app.use(morgan("dev"));
    }
    this.app.use(requestLogger());

    // Request counting for /metrics
    this.app.use(metricsCollector);

    // Response helpers
    this.app.use(responseHandler);

    logger.info("Middleware configured successfully");
  }

  setupRoutes() {
    // Internal metrics endpoint — restricted by API key in production
    const metricsApiKey = process.env.METRICS_API_KEY;
    this.app.get(
      "/metrics",
      createMetricsHandler(
        metricsApiKey
          ? { apiKeyHeader: "x-metrics-key", apiKeyValue: metricsApiKey }
          : {},
      ),
    );

    setupRoutes(this.app);
    logger.info("Routes configured successfully");
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);

    logger.info("Error handling configured");
  }

  setupWebSocket() {
    this.server = http.createServer(this.app);

    this.io = new Server(this.server, {
      cors: {
        origin: config.security.cors.allowedOrigins,
        methods: config.security.cors.allowedMethods,
        credentials: config.security.cors.credentials,
      },
      transports: ["websocket", "polling"],
    });

    // WebSocket authentication — use optional auth for chat (allows guests)
    const {
      optionalAuthenticateWebSocket,
    } = require("./middleware/auth/authenticate");
    this.io.use(optionalAuthenticateWebSocket);

    // Initialize chat WebSocket handler
    const ChatWebSocketHandler = require("./services/chatWebSocket");
    this.chatHandler = new ChatWebSocketHandler(this.io);

    // Start recurring billing scheduler
    const billingScheduler = require("./jobs/billingScheduler");
    billingScheduler.start();

    this.io.on("connection", (socket) => {
      logger.info("WebSocket client connected", {
        socketId: socket.id,
        userId: socket.user?.id,
        ip: socket.request.connection.remoteAddress,
      });

      socket.on("disconnect", (reason) => {
        logger.info("WebSocket client disconnected", {
          socketId: socket.id,
          userId: socket.user?.id,
          reason,
        });
      });
    });

    logger.info("WebSocket server configured");
  }

  async start() {
    try {
      await this.initialize();

      const port = config.server.port;
      const host = config.server.host;

      if (this.server) {
        this.server.listen(port, host, () => {
          const localUrl =
            host === "0.0.0.0"
              ? `http://localhost:${port}`
              : `http://${host}:${port}`;
          logger.info(`🚀 AfraPay server running on ${host}:${port}`, {
            environment: config.app.env,
            version: config.app.version,
            port,
            host,
            processId: process.pid,
          });
          logger.info(`🌐 Server accessible at: ${localUrl}`);
          logger.info(`📖 API Documentation: ${localUrl}/api-docs`);
          logger.info(`📥 Metrics: ${localUrl}/metrics`);
        });
        // Track active TCP connections for the /metrics endpoint
        attachConnectionTracker(this.server);
      } else {
        this.app.listen(port, host, () => {
          const localUrl =
            host === "0.0.0.0"
              ? `http://localhost:${port}`
              : `http://${host}:${port}`;
          logger.info(
            `\uD83D\uDE80 AfraPay server running on ${host}:${port}`,
            {
              environment: config.app.env,
              version: config.app.version,
              port,
              host,
              processId: process.pid,
            },
          );
          logger.info(`\uD83C\uDF10 Server accessible at: ${localUrl}`);
          logger.info(`\uD83D\uDCD6 API Documentation: ${localUrl}/api-docs`);
          logger.info(`\uD83D\uDCE5 Metrics: ${localUrl}/metrics`);
        });
      }

      // Graceful shutdown handling
      this.setupShutdownHandling();
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  setupShutdownHandling() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        if (this.server) {
          await new Promise((resolve) => {
            this.server.close(resolve);
          });
        }

        // Close WebSocket connections
        if (this.io) {
          this.io.close();
        }

        // Stop billing scheduler before disconnecting
        try {
          const billingScheduler = require("./jobs/billingScheduler");
          billingScheduler.stop();
        } catch (_) {
          /* ignore if not loaded */
        }

        // Disconnect from databases
        await disconnectDatabase();

        logger.info("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("UNHANDLED_REJECTION");
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new AfrPayServer();
  server.start();
}

module.exports = AfrPayServer;
