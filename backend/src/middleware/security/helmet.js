/**
 * Security Headers Middleware
 * Configures Helmet.js for comprehensive security headers
 */

const helmet = require('helmet');
const config = require('../../config/environment');

/**
 * Configure Helmet security headers
 * @returns {Function} Helmet middleware
 */
function configureHelmet() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline styles in some cases
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        scriptSrc: [
          "'self'",
          config.app.isDevelopment ? "'unsafe-eval'" : null, // Only in development
          'https://js.stripe.com',
          'https://checkout.stripe.com'
        ].filter(Boolean),
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          'blob:'
        ],
        connectSrc: [
          "'self'",
          'https://api.stripe.com',
          'https://api.paystack.co',
          config.database.appwrite.endpoint
        ],
        frameSrc: [
          "'none'"
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      },
      reportOnly: config.app.isDevelopment // Use report-only mode in development
    },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // Frame Guard (X-Frame-Options)
    frameguard: {
      action: 'deny'
    },

    // Hide Powered By
    hidePoweredBy: true,

    // HSTS (HTTP Strict Transport Security)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // IE No Open
    ieNoOpen: true,

    // Don't Sniff Mimetype
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: false,

    // Referrer Policy
    referrerPolicy: {
      policy: ['no-referrer', 'strict-origin-when-cross-origin']
    },

    // X-XSS-Protection
    xssFilter: true,

    // Cross Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // May interfere with some integrations

    // Cross Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups' // Required for payment popups
    },

    // Cross Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  });
}

/**
 * Additional security headers middleware
 */
function additionalSecurityHeaders(req, res, next) {
  // Custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Financial-specific headers
  res.setHeader('X-Financial-Service', 'AfraPay');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Remove sensitive server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
}

/**
 * Create complete security headers middleware
 */
function createSecurityMiddleware() {
  return [
    configureHelmet(),
    additionalSecurityHeaders
  ];
}

module.exports = createSecurityMiddleware;