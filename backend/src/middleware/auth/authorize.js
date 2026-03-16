/**
 * Authorization Middleware
 * Checks user roles and permissions
 */

const logger = require('../../utils/logger');
const { AuthorizationError } = require('../monitoring/errorHandler');

/**
 * Authorization middleware factory
 * @param {Array} allowedRoles - Array of roles that are allowed to access the resource
 * @param {Array} requiredPermissions - Array of specific permissions required (optional)
 * @returns {Function} Authorization middleware function
 */
function authorize(allowedRoles = [], requiredPermissions = []) {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];
      const userId = req.user.id;

      // Super admin has access to everything
      if (userRole === 'super_admin') {
        logger.debug('Super admin access granted', {
          userId,
          userRole,
          requestedRoles: allowedRoles,
          requestedPermissions: requiredPermissions,
          requestId: req.id
        });
        return next();
      }

      // Check role-based authorization
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        logger.warn('Role-based authorization failed', {
          userId,
          userRole,
          allowedRoles,
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          requestId: req.id
        });
        throw new AuthorizationError('Insufficient privileges');
      }

      // Check permission-based authorization
      if (requiredPermissions.length > 0) {
        const hasRequiredPermissions = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
          const missingPermissions = requiredPermissions.filter(permission => 
            !userPermissions.includes(permission)
          );

          logger.warn('Permission-based authorization failed', {
            userId,
            userRole,
            userPermissions,
            requiredPermissions,
            missingPermissions,
            ip: req.ip,
            method: req.method,
            url: req.originalUrl,
            requestId: req.id
          });
          throw new AuthorizationError('Missing required permissions');
        }
      }

      // Authorization successful
      logger.debug('Authorization successful', {
        userId,
        userRole,
        allowedRoles,
        requiredPermissions,
        requestId: req.id
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Resource ownership authorization
 * Checks if the authenticated user owns the resource or has admin privileges
 * @param {string} resourceUserIdField - Field name in request params/body that contains the resource owner's user ID
 * @returns {Function} Authorization middleware function
 */
function authorizeResourceOwner(resourceUserIdField = 'userId') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const currentUserId = req.user.id;
      const userRole = req.user.role;
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

      // Admin and super_admin can access any resource
      if (['admin', 'super_admin'].includes(userRole)) {
        return next();
      }

      // Check if user owns the resource
      if (!resourceUserId) {
        logger.warn('Resource user ID not found in request', {
          userId: currentUserId,
          resourceUserIdField,
          params: req.params,
          requestId: req.id
        });
        throw new AuthorizationError('Resource owner not specified');
      }

      if (currentUserId !== resourceUserId) {
        logger.warn('Resource ownership authorization failed', {
          userId: currentUserId,
          resourceUserId,
          resourceUserIdField,
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          requestId: req.id
        });
        throw new AuthorizationError('Access denied: not resource owner');
      }

      // Authorization successful
      logger.debug('Resource ownership authorization successful', {
        userId: currentUserId,
        resourceUserId,
        requestId: req.id
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Conditional authorization based on request context
 * @param {Function} conditionFn - Function that takes (req) and returns boolean
 * @param {string} errorMessage - Error message if condition fails
 * @returns {Function} Authorization middleware function
 */
function authorizeConditional(conditionFn, errorMessage = 'Access denied') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const isAuthorized = conditionFn(req);
      
      if (!isAuthorized) {
        logger.warn('Conditional authorization failed', {
          userId: req.user.id,
          userRole: req.user.role,
          errorMessage,
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          requestId: req.id
        });
        throw new AuthorizationError(errorMessage);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has any of the specified permissions
 * @param {Array} permissions - Array of permissions to check
 * @returns {Function} Authorization middleware function
 */
function hasAnyPermission(permissions) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        logger.warn('Permission check failed', {
          userId: req.user.id,
          userPermissions,
          requiredPermissions: permissions,
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          requestId: req.id
        });
        throw new AuthorizationError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has all of the specified permissions
 * @param {Array} permissions - Array of permissions to check
 * @returns {Function} Authorization middleware function
 */
function hasAllPermissions(permissions) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = permissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => 
          !userPermissions.includes(permission)
        );

        logger.warn('Permission check failed', {
          userId: req.user.id,
          userPermissions,
          requiredPermissions: permissions,
          missingPermissions,
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          requestId: req.id
        });
        throw new AuthorizationError('Missing required permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authorize,
  authorizeResourceOwner,
  authorizeConditional,
  hasAnyPermission,
  hasAllPermissions
};