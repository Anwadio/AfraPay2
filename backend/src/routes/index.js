/**
 * Routes Setup
 * Main routing configuration and API versioning
 */

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { getDatabaseHealth } = require('../database/connection');

// Import route modules
const v1Routes = require('./v1');
// Future versions can be added here
// const v2Routes = require('./v2');

/**
 * Configure all routes for the application
 * @param {Express} app - Express application instance
 */
function setupRoutes(app) {
  // Health check endpoint (before API routes)
  app.get('/health', async (req, res) => {
    try {
      const dbHealth = await getDatabaseHealth();
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: config.app.version,
        environment: config.app.env,
        services: {
          api: 'OK',
          database: dbHealth.overall ? 'OK' : 'DEGRADED',
          appwrite: dbHealth.appwrite ? 'OK' : 'DOWN',
          redis: dbHealth.redis ? 'OK' : 'DOWN'
        }
      };

      const statusCode = dbHealth.overall ? 200 : 503;
      res.status(statusCode).json({
        success: dbHealth.overall,
        data: health
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed'
        }
      });
    }
  });

  // API Documentation (Swagger)
  if (config.features.swagger && config.app.isDevelopment) {
    try {
      const swaggerDocument = require('../../docs/swagger.json');
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'AfraPay API Documentation'
      }));
      logger.info('Swagger documentation available at /api-docs');
    } catch (error) {
      logger.warn('Swagger documentation not available:', error.message);
    }
  }

  // API status endpoint
  app.get('/api', (req, res) => {
    res.success({
      name: config.app.name,
      version: config.app.version,
      environment: config.app.env,
      documentation: config.features.swagger ? '/api-docs' : null,
      availableVersions: ['v1']
    }, 'AfraPay API is running');
  });

  // API v1 routes
  app.use('/api/v1', v1Routes);

  // Future API versions
  // app.use('/api/v2', v2Routes);

  // Catch-all route for API endpoints
  app.all('/api/*', (req, res) => {
    res.notFound('API Endpoint');
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.success({
      message: 'Welcome to AfraPay API',
      version: config.app.version,
      environment: config.app.env,
      documentation: config.features.swagger ? `${req.protocol}://${req.get('host')}/api-docs` : null,
      health: `${req.protocol}://${req.get('host')}/health`,
      api: `${req.protocol}://${req.get('host')}/api/v1`
    });
  });

  logger.info('All routes configured successfully');
}

module.exports = setupRoutes;