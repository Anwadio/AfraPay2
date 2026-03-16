/**
 * Response Handler Middleware
 * Standardizes API responses and adds helper methods to res object
 */

const logger = require('../../utils/logger');
const config = require('../../config/environment');

/**
 * Standard API response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - Success flag
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @param {Object} meta - Additional metadata
 */
function sendResponse(res, statusCode, success, data = null, message = null, meta = {}) {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    requestId: res.req?.id,
    ...(message && { message }),
    ...(data && { data }),
    ...(Object.keys(meta).length > 0 && { meta })
  };

  // Add pagination info if present
  if (meta.pagination) {
    response.pagination = meta.pagination;
  }

  // Remove sensitive data in production
  if (!config.app.isDevelopment) {
    delete response.requestId;
  }

  res.status(statusCode).json(response);
}

/**
 * Response Handler Middleware
 * Adds helper methods to the response object
 */
function responseHandler(req, res, next) {
  // Success responses
  res.success = (data = null, message = 'Success', statusCode = 200, meta = {}) => {
    sendResponse(res, statusCode, true, data, message, meta);
  };

  res.created = (data = null, message = 'Resource created successfully') => {
    sendResponse(res, 201, true, data, message);
  };

  res.updated = (data = null, message = 'Resource updated successfully') => {
    sendResponse(res, 200, true, data, message);
  };

  res.deleted = (message = 'Resource deleted successfully') => {
    sendResponse(res, 200, true, null, message);
  };

  res.noContent = () => {
    res.status(204).send();
  };

  // Error responses
  res.badRequest = (message = 'Bad request', details = null) => {
    const errorData = {
      code: 'BAD_REQUEST',
      message,
      ...(details && { details })
    };
    sendResponse(res, 400, false, null, null, { error: errorData });
  };

  res.unauthorized = (message = 'Authentication required') => {
    const errorData = {
      code: 'UNAUTHORIZED',
      message
    };
    sendResponse(res, 401, false, null, null, { error: errorData });
  };

  res.forbidden = (message = 'Access forbidden') => {
    const errorData = {
      code: 'FORBIDDEN',
      message
    };
    sendResponse(res, 403, false, null, null, { error: errorData });
  };

  res.notFound = (resource = 'Resource', message = null) => {
    const errorData = {
      code: 'NOT_FOUND',
      message: message || `${resource} not found`
    };
    sendResponse(res, 404, false, null, null, { error: errorData });
  };

  res.conflict = (message = 'Resource conflict') => {
    const errorData = {
      code: 'CONFLICT',
      message
    };
    sendResponse(res, 409, false, null, null, { error: errorData });
  };

  res.unprocessableEntity = (message = 'Unprocessable entity', details = null) => {
    const errorData = {
      code: 'UNPROCESSABLE_ENTITY',
      message,
      ...(details && { details })
    };
    sendResponse(res, 422, false, null, null, { error: errorData });
  };

  res.tooManyRequests = (message = 'Too many requests') => {
    const errorData = {
      code: 'TOO_MANY_REQUESTS',
      message
    };
    sendResponse(res, 429, false, null, null, { error: errorData });
  };

  res.internalServerError = (message = 'Internal server error') => {
    const errorData = {
      code: 'INTERNAL_SERVER_ERROR',
      message
    };
    sendResponse(res, 500, false, null, null, { error: errorData });
  };

  res.serviceUnavailable = (message = 'Service unavailable') => {
    const errorData = {
      code: 'SERVICE_UNAVAILABLE',
      message
    };
    sendResponse(res, 503, false, null, null, { error: errorData });
  };

  // Paginated response helper
  res.paginated = (data, pagination, message = 'Data retrieved successfully') => {
    const meta = {
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1
      }
    };
    sendResponse(res, 200, true, data, message, meta);
  };

  // Health check response
  res.healthy = (data = {}) => {
    const healthData = {
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: config.app.version,
      environment: config.app.env,
      ...data
    };
    sendResponse(res, 200, true, healthData, 'Service is healthy');
  };

  // Audit log helper
  res.auditLog = (action, data = {}) => {
    if (req.user) {
      logger.audit(action, req.user.id, {
        requestId: req.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...data
      });
    }
  };

  next();
}

module.exports = responseHandler;