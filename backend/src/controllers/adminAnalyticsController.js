/**
 * Admin Analytics Controller
 *
 * Thin HTTP layer over analyticsService.
 * All routes are pre-protected by authenticate + authorize(["admin","super_admin"])
 * in the admin router — no additional auth checks needed here.
 *
 * Endpoints:
 *   GET /api/v1/admin/analytics/overview
 *   GET /api/v1/admin/analytics/revenue
 *   GET /api/v1/admin/analytics/transactions
 *   GET /api/v1/admin/analytics/cohorts
 *   GET /api/v1/admin/analytics/forecast
 */

"use strict";

const analyticsService = require("../services/analyticsService");
const logger = require("../utils/logger");

class AdminAnalyticsController {
  /**
   * GET /api/v1/admin/analytics/overview
   *
   * Query params:
   *   period      string  day | week | month | quarter | year
   *   startDate   ISO     custom range start
   *   endDate     ISO     custom range end
   *   currency    string  USD | EUR | GBP | KES | NGN | GHS | ZAR
   */
  async getOverview(req, res) {
    try {
      const data = await analyticsService.getOverview({
        period: req.query.period,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        currency: req.query.currency,
      });

      res.success(data, "Analytics overview retrieved successfully");
    } catch (error) {
      logger.error("Admin analytics overview failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/revenue
   *
   * Query params:
   *   period      string  day | week | month | quarter | year
   *   startDate   ISO     custom range start
   *   endDate     ISO     custom range end
   *   granularity string  day | week | month
   *   currency    string
   */
  async getRevenue(req, res) {
    try {
      const data = await analyticsService.getRevenue({
        period: req.query.period,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        granularity: req.query.granularity,
        currency: req.query.currency,
      });

      res.success(data, "Revenue analytics retrieved successfully");
    } catch (error) {
      logger.error("Admin analytics revenue failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/transactions
   *
   * Query params:
   *   period      string
   *   startDate   ISO
   *   endDate     ISO
   *   granularity string  day | week | month
   *   currency    string
   *   type        string  deposit | withdrawal | transfer | payment | fee | refund
   */
  async getTransactions(req, res) {
    try {
      const data = await analyticsService.getTransactions({
        period: req.query.period,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        granularity: req.query.granularity,
        currency: req.query.currency,
        type: req.query.type,
      });

      res.success(data, "Transaction analytics retrieved successfully");
    } catch (error) {
      logger.error("Admin analytics transactions failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/cohorts
   *
   * Query params:
   *   months  integer  1-12, how many cohort months to show (default 6)
   */
  async getCohorts(req, res) {
    try {
      const data = await analyticsService.getCohorts({
        months: req.query.months,
      });

      res.success(data, "Cohort analytics retrieved successfully");
    } catch (error) {
      logger.error("Admin analytics cohorts failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/forecast
   *
   * Query params:
   *   currency  string
   */
  async getForecast(req, res) {
    try {
      const data = await analyticsService.getForecast({
        currency: req.query.currency,
      });

      res.success(data, "Revenue forecast retrieved successfully");
    } catch (error) {
      logger.error("Admin analytics forecast failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export bound instance so methods retain `this` when destructured by Express
const ctrl = new AdminAnalyticsController();
module.exports = {
  getOverview: ctrl.getOverview.bind(ctrl),
  getRevenue: ctrl.getRevenue.bind(ctrl),
  getTransactions: ctrl.getTransactions.bind(ctrl),
  getCohorts: ctrl.getCohorts.bind(ctrl),
  getForecast: ctrl.getForecast.bind(ctrl),
};
