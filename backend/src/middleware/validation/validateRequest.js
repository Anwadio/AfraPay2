/**
 * Request Validation Middleware
 * Validates incoming requests using express-validator
 */

const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

/**
 * Middleware to handle validation results from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    // Log validation failures for monitoring
    logger.warn('Request validation failed', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      errors: validationErrors
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors
      }
    });
  }

  next();
}

module.exports = validateRequest;