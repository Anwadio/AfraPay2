"use strict";

/**
 * billingScheduler.js
 *
 * Wraps billingService.processDueSubscriptions() in a node-cron job.
 * Runs at the top of every hour (UTC) by default.
 * Call billingScheduler.start() once the server is initialised.
 */

const cron = require("node-cron");
const logger = require("../utils/logger");
const billingService = require("../services/billingService");

let scheduledJob = null;
let isRunning = false;

/**
 * Inner execution — guarded so overlapping cron ticks never double-bill.
 */
async function executeBillingRun() {
  if (isRunning) {
    logger.warn(
      "billingScheduler: previous run still in progress — skipping tick",
    );
    return;
  }

  isRunning = true;
  const start = Date.now();

  try {
    logger.info("billingScheduler: billing run starting");
    const summary = await billingService.processDueSubscriptions();
    const elapsed = Date.now() - start;

    logger.info("billingScheduler: billing run complete", {
      ...summary,
      elapsedMs: elapsed,
    });
  } catch (err) {
    logger.error("billingScheduler: billing run threw unexpectedly", {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

const billingScheduler = {
  /**
   * Start the scheduler.
   * @param {string} [cronExpression="0 * * * *"]  — cron expression (default: top of every hour)
   */
  start(cronExpression = "0 * * * *") {
    if (scheduledJob) {
      logger.warn(
        "billingScheduler: already started — ignoring duplicate start()",
      );
      return;
    }

    if (!cron.validate(cronExpression)) {
      logger.error("billingScheduler: invalid cron expression", {
        cronExpression,
      });
      return;
    }

    scheduledJob = cron.schedule(cronExpression, executeBillingRun, {
      scheduled: true,
      timezone: "UTC",
    });

    logger.info("billingScheduler: started", {
      expression: cronExpression,
      timezone: "UTC",
    });
  },

  /**
   * Stop the scheduler gracefully.
   */
  stop() {
    if (scheduledJob) {
      scheduledJob.stop();
      scheduledJob = null;
      logger.info("billingScheduler: stopped");
    }
  },

  /**
   * Trigger an immediate billing run outside the schedule (for admin or tests).
   * Returns the summary from processDueSubscriptions().
   */
  async runNow() {
    logger.info("billingScheduler: manual run triggered");
    return billingService.processDueSubscriptions();
  },

  /** True while a billing run is executing. */
  get running() {
    return isRunning;
  },
};

module.exports = billingScheduler;
