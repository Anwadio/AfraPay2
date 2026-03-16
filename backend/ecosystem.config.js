/**
 * PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # start all apps
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js         # zero-downtime restart
 *   pm2 stop   ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 *   pm2 logs afrapay-api
 *   pm2 monit                              # live dashboard
 *
 * Monitoring recommendations (see README for details):
 *   - pm2 plus / keymetrics  : hosted dashboard with alerts
 *   - Prometheus + Grafana   : set METRICS_API_KEY and scrape GET /metrics
 *   - Sentry                 : set SENTRY_DSN in .env.production
 *   - ELK / Loki + Grafana   : ship logs/ files to your log aggregation system
 */

module.exports = {
  apps: [
    {
      name: "afrapay-api",
      script: "src/server.js",
      cwd: __dirname,

      // ── Clustering ─────────────────────────────────────────────────────
      // 'max' forks one worker per logical CPU core.
      // Use a fixed number (e.g. 2) on memory-constrained hosts.
      instances: "max",
      exec_mode: "cluster",

      // ── Runtime ────────────────────────────────────────────────────────
      node_args: "--max-old-space-size=512",
      max_memory_restart: "512M",

      // ── Auto-restart policy ────────────────────────────────────────────
      autorestart: true,
      watch: false, // never watch in production
      restart_delay: 3000, // ms to wait before restart
      max_restarts: 10, // stop restarting after 10 failures in a row

      // ── Log files ──────────────────────────────────────────────────────
      // PM2 captures stdout/stderr separately.  Winston also writes to logs/
      // so these are the *process-level* streams only.
      out_file: "logs/pm2-out.log",
      error_file: "logs/pm2-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",

      // ── Health-check / signals ─────────────────────────────────────────
      // PM2 sends SIGINT; our gracefulShutdown handles it.
      kill_timeout: 10000, // ms before SIGKILL is sent
      listen_timeout: 10000, // ms for the app to become ready

      // ── Environment definitions ────────────────────────────────────────
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        // Explicitly disable dev-only features
        ENABLE_SWAGGER: "false",
      },
    },
  ],

  // ── PM2 Deploy configuration (optional CI/CD) ─────────────────────────
  // deploy: {
  //   production: {
  //     user: 'ubuntu',
  //     host: ['your-server-ip'],
  //     ref: 'origin/main',
  //     repo: 'git@github.com:your-org/afrapay.git',
  //     path: '/var/www/afrapay',
  //     'post-deploy': 'cd backend && npm ci --omit=dev && pm2 reload ecosystem.config.js --env production',
  //   },
  // },
};
