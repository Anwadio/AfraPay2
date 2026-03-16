/**
 * Logger Utility
 * Centralized logging with Winston, file rotation, and structured logging
 */

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const config = require("../config/environment");

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;

    const logObject = {
      timestamp,
      level,
      message,
      ...(stack && { stack }),
      ...(Object.keys(meta).length > 0 && { meta }),
    };

    return JSON.stringify(logObject);
  }),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  }),
);

// Transport configurations
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: config.app.isDevelopment ? "debug" : "info",
    format: config.app.isDevelopment ? consoleFormat : logFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
);

// File transports (production and staging)
if (!config.app.isDevelopment) {
  // Application logs with rotation
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "application-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      level: config.logging.level,
      format: logFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );

  // Error logs (errors only)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "90d",
      level: "error",
      format: logFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );

  // Security logs (audit trail)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "security-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "365d", // Keep security logs for 1 year
      level: "info",
      format: logFormat,
    }),
  );
}

// Create winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add request ID to log context
logger.addRequestId = (requestId) => {
  return logger.child({ requestId });
};

// Security logging helper
logger.security = (message, meta = {}) => {
  logger.info(message, {
    ...meta,
    category: "SECURITY",
    timestamp: new Date().toISOString(),
  });
};

// Audit logging helper
logger.audit = (action, userId, meta = {}) => {
  logger.info(`AUDIT: ${action}`, {
    ...meta,
    category: "AUDIT",
    userId,
    timestamp: new Date().toISOString(),
  });
};

// Payment logging helper (for financial transactions)
logger.payment = (message, transactionData = {}) => {
  logger.info(message, {
    ...transactionData,
    category: "PAYMENT",
    timestamp: new Date().toISOString(),
  });
};

// Performance logging helper
logger.performance = (operation, duration, meta = {}) => {
  logger.info(`PERFORMANCE: ${operation} completed in ${duration}ms`, {
    ...meta,
    category: "PERFORMANCE",
    operation,
    duration,
    timestamp: new Date().toISOString(),
  });
};

// Error logging with context
logger.errorWithContext = (error, context = {}) => {
  logger.error(error.message, {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    timestamp: new Date().toISOString(),
  });
};

// Structured logging methods
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    requestId: req.id,
    userId: req.user?.id,
  };

  if (res.statusCode >= 400) {
    logger.warn("HTTP Request Warning", logData);
  } else {
    logger.info("HTTP Request", logData);
  }
};

// NOTE: process-level uncaughtException / unhandledRejection handlers are
// registered in server.js (setupShutdownHandling) which calls gracefulShutdown
// before exiting.  We do NOT register duplicate handlers here because the
// second handler would suppress the graceful-shutdown logic.

module.exports = logger;
