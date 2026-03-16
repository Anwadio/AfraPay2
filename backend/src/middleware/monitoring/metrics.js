/**
 * Metrics Middleware
 *
 * Exposes a lightweight `/metrics` endpoint containing process and
 * application health data.  In production this should be behind an
 * internal network or protected by an API key — it is intentionally
 * simple and dependency-free (no Prometheus client required).
 *
 * Metrics included:
 *   - process: uptime, memory (rss / heapUsed / heapTotal / external), CPU usage
 *   - application: active HTTP connections, request counters, error counters
 *   - runtime: Node.js version, platform, PID
 *
 * To integrate with Prometheus / Grafana, replace the JSON response with
 * the `prom-client` library's `register.metrics()` call and set the
 * Content-Type to `text/plain; version=0.0.4`.
 *
 * To restrict access, pass `apiKeyHeader` option (string) and set the
 * METRICS_API_KEY environment variable.
 */

const os = require("os");
const logger = require("../../utils/logger");

// ─── In-process counters ──────────────────────────────────────────────────
// These are reset when the process restarts; for durable counters use Redis.
const counters = {
  requests: { total: 0, success: 0, clientError: 0, serverError: 0 },
  auth: { failures: 0, successes: 0 },
  payments: { attempted: 0, succeeded: 0, failed: 0 },
};

// Expose counter mutation so other parts of the app can increment them.
function increment(path /* 'requests.total' | 'payments.failed' | ... */) {
  const parts = path.split(".");
  let target = counters;
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
    if (!target) return;
  }
  if (typeof target[parts[parts.length - 1]] === "number") {
    target[parts[parts.length - 1]]++;
  }
}

// Track active HTTP connections
let activeConnections = 0;

/**
 * Attach to an http.Server to track active connection count.
 * Call this after server.listen().
 *
 * @param {import('http').Server} server
 */
function attachConnectionTracker(server) {
  server.on("connection", () => {
    activeConnections++;
  });
  server.on("close", () => {
    activeConnections = Math.max(0, activeConnections - 1);
  });
}

// ─── Middleware that counts requests ──────────────────────────────────────

/**
 * Express middleware that automatically increments request counters.
 * Mount this before route handlers.
 */
function metricsCollector(req, res, next) {
  counters.requests.total++;

  // Hook into the response to record outcome
  const origEnd = res.end.bind(res);
  res.end = function (...args) {
    if (res.statusCode >= 500) {
      counters.requests.serverError++;
    } else if (res.statusCode >= 400) {
      counters.requests.clientError++;
    } else {
      counters.requests.success++;
    }
    return origEnd(...args);
  };

  next();
}

// ─── /metrics handler ─────────────────────────────────────────────────────

/**
 * Express route handler that serialises collected metrics as JSON.
 *
 * @param {string} [options.apiKeyHeader]  Header name to check (e.g. 'x-metrics-key').
 * @param {string} [options.apiKeyValue]   Expected value of that header.
 * @returns {import('express').RequestHandler}
 */
function createMetricsHandler(options = {}) {
  const { apiKeyHeader, apiKeyValue } = options;

  return (req, res) => {
    // Optional API-key gate
    if (apiKeyHeader && apiKeyValue) {
      const provided = req.get(apiKeyHeader);
      if (!provided || provided !== apiKeyValue) {
        logger.warn("Metrics endpoint: unauthorised access attempt", {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.id,
        });
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid metrics API key" },
        });
      }
    }

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime_seconds: Math.floor(process.uptime()),
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          rss_mb: +(memUsage.rss / 1024 / 1024).toFixed(2),
          heap_used_mb: +(memUsage.heapUsed / 1024 / 1024).toFixed(2),
          heap_total_mb: +(memUsage.heapTotal / 1024 / 1024).toFixed(2),
          external_mb: +(memUsage.external / 1024 / 1024).toFixed(2),
        },
        cpu: {
          user_ms: Math.floor(cpuUsage.user / 1000),
          system_ms: Math.floor(cpuUsage.system / 1000),
        },
      },
      system: {
        load_avg: os.loadavg(),
        total_memory_mb: +(os.totalmem() / 1024 / 1024).toFixed(2),
        free_memory_mb: +(os.freemem() / 1024 / 1024).toFixed(2),
        cpus: os.cpus().length,
      },
      http: {
        active_connections: activeConnections,
        requests: { ...counters.requests },
      },
      application: {
        auth: { ...counters.auth },
        payments: { ...counters.payments },
      },
    };

    // Cache-Control: private, no-store  — metrics must not be cached
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ success: true, data: metrics });
  };
}

module.exports = {
  metricsCollector,
  createMetricsHandler,
  attachConnectionTracker,
  increment,
};
