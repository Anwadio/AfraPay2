/**
 * Admin Controller
 * Handles administrative functions and system management
 */

const { Client, Users, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const auditService = require("../services/auditService");
const fraudService = require("../services/fraudService");
const { getDatabaseHealth } = require("../database/connection");
const { NotFoundError } = require("../middleware/monitoring/errorHandler");
const emailService = require("../services/emailService");

// Initialize Appwrite clients
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const users = new Users(client);
const databases = new Databases(client);

class AdminController {
  constructor() {
    // Store database instances in the class for proper context
    this.databases = databases;
    this.users = users;
  }

  /**
   * Get admin dashboard data
   */
  async getDashboard(req, res) {
    try {
      // Get system overview statistics
      const stats = await this.getSystemStats();
      const recentActivity = await this.getRecentActivity();
      const alerts = await this.getSystemAlerts();

      const dashboardData = {
        stats,
        recentActivity,
        alerts,
        systemHealth: await getDatabaseHealth(),
        lastUpdated: new Date().toISOString(),
      };

      res.success(dashboardData, "Dashboard data retrieved successfully");
    } catch (error) {
      logger.error("Get dashboard failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get system analytics
   */
  async getAnalytics(req, res) {
    try {
      const { period = "month", startDate, endDate } = req.query;

      const dateRange = this.calculateDateRange(period, startDate, endDate);

      const analytics = {
        users: await this.getUserAnalytics(dateRange),
        transactions: await this.getTransactionAnalytics(dateRange),
        revenue: await this.getRevenueAnalytics(dateRange),
        performance: await this.getPerformanceMetrics(dateRange),
      };

      res.success(analytics, "Analytics retrieved successfully");
    } catch (error) {
      logger.error("Get analytics failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all users with filters
   */
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        verified,
        role,
        search,
      } = req.query;

      const queries = [];

      // Labels in Appwrite are stored as an array of strings, not object properties
      if (status && status.trim() !== "") {
        queries.push(Query.equal("labels", status));
      }
      if (
        verified !== undefined &&
        verified !== null &&
        verified.toString().trim() !== ""
      ) {
        // Convert string to boolean for proper query
        const isVerified = verified === "true" || verified === true;
        queries.push(Query.equal("emailVerification", isVerified));
      }
      if (role && role.trim() !== "") {
        queries.push(Query.equal("labels", role));
      }
      if (search && search.trim() !== "") {
        // Search in email and name
        queries.push(Query.search("email", search));
      }

      // Debug logging
      console.log("🔍 User query parameters:", {
        adminId: req.user.userId,
        page: parseInt(page),
        limit: parseInt(limit),
        queries: queries,
        queryCount: queries.length,
        rawParams: { status, verified, role, search },
      });

      // Try basic list call first - Appwrite Users.list signature: list(queries?, search?, limit?, offset?)
      const userList = await this.users.list(
        queries.length > 0 ? queries : undefined, // queries parameter
        undefined, // search parameter (deprecated, use Query.search in queries)
        parseInt(limit), // limit parameter
        (parseInt(page) - 1) * parseInt(limit), // offset parameter
      );

      // Debug the response
      console.log("📊 Appwrite users response:", {
        adminId: req.user.userId,
        totalUsers: userList.total,
        usersCount: userList.users ? userList.users.length : 0,
        firstUserSample:
          userList.users && userList.users.length > 0
            ? {
                id: userList.users[0].$id,
                email: userList.users[0].email,
                labels: userList.users[0].labels,
              }
            : null,
      });

      const userData = userList.users.map((user) => {
        try {
          console.log("🔄 Mapping user:", user.$id, user.email);

          // Extract role from labels array - look for admin, user, etc.
          const userLabels = user.labels || [];
          let role = "user"; // default role
          if (userLabels.includes("admin")) role = "admin";
          else if (userLabels.includes("super_admin")) role = "super_admin";

          // For status, we'll use the user.status boolean or look for status labels
          let status = user.status ? "active" : "inactive";

          // Extract other data from labels if needed - with safer parsing
          const kycLabelMatch = userLabels.find((label) =>
            label.startsWith("kyc:"),
          );
          const kycLevel = kycLabelMatch
            ? parseInt(kycLabelMatch.split(":")[1] || "0")
            : 0;

          const countryLabelMatch = userLabels.find((label) =>
            label.startsWith("country:"),
          );
          const country = countryLabelMatch
            ? countryLabelMatch.split(":")[1]
            : null;

          const lastLoginLabelMatch = userLabels.find((label) =>
            label.startsWith("lastLogin:"),
          );
          const lastLogin = lastLoginLabelMatch
            ? lastLoginLabelMatch.split(":")[1]
            : null;

          const mappedUser = {
            id: user.$id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: role,
            status: status,
            kycLevel: kycLevel,
            emailVerified: user.emailVerification,
            phoneVerified: user.phoneVerification,
            createdAt: user.$createdAt,
            lastLogin: lastLogin,
            country: country,
          };

          console.log(
            "✅ Successfully mapped user:",
            mappedUser.id,
            mappedUser.email,
            mappedUser.role,
          );
          return mappedUser;
        } catch (error) {
          console.error("❌ Error mapping user:", user.$id, error.message);
          // Return basic user info as fallback
          return {
            id: user.$id,
            email: user.email,
            name: user.name || "N/A",
            phone: user.phone || null,
            role: "user",
            status: "active",
            kycLevel: 0,
            emailVerified: user.emailVerification || false,
            phoneVerified: user.phoneVerification || false,
            createdAt: user.$createdAt,
            lastLogin: null,
            country: null,
          };
        }
      });

      const totalPages = Math.ceil(userList.total / parseInt(limit));

      console.log("📤 Final response data:", {
        userDataLength: userData.length,
        totalItems: userList.total,
        userData: userData.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
        })),
        totalPages: totalPages,
      });

      res.paginated(
        userData,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: userList.total,
          totalPages,
        },
        "Users retrieved successfully",
      );
    } catch (error) {
      logger.error("Get users failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user details
   */
  async getUserDetails(req, res) {
    try {
      const { userId } = req.params;

      const user = await this.users.get(userId);

      // Get user's transactions summary
      const transactionSummary = await this.getUserTransactionSummary(userId);

      // Get user's documents (if documents collection exists)
      let documents = { documents: [] };
      if (config.collections.documentsId) {
        try {
          documents = await this.databases.listDocuments(
            config.database.appwrite.databaseId,
            config.collections.documentsId,
            [`userId=${userId}`],
          );
        } catch (error) {
          logger.warn("Documents collection not available", {
            error: error.message,
          });
        }
      }

      const userDetails = {
        id: user.$id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        firstName: user.labels?.firstName,
        lastName: user.labels?.lastName,
        country: user.labels?.country,
        dateOfBirth: user.labels?.dateOfBirth,
        role: user.labels?.role || "user",
        status: user.labels?.accountStatus || "active",
        kycLevel: parseInt(user.labels?.kycLevel || "0"),
        emailVerified: user.emailVerification,
        phoneVerified: user.phoneVerification,
        mfaEnabled: user.labels?.mfaEnabled === "true",
        createdAt: user.$createdAt,
        updatedAt: user.$updatedAt,
        lastLogin: user.labels?.lastLogin,
        lastLoginIP: user.labels?.lastLoginIP,
        registrationIP: user.labels?.registrationIP,
        transactionSummary,
        documents: documents.documents.map((doc) => ({
          id: doc.$id,
          type: doc.type,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
          reviewedAt: doc.reviewedAt,
        })),
        preferences: {
          notifications: user.labels?.notificationPreferences
            ? JSON.parse(user.labels.notificationPreferences)
            : {},
          privacy: user.labels?.privacySettings
            ? JSON.parse(user.labels.privacySettings)
            : {},
          security: user.labels?.securitySettings
            ? JSON.parse(user.labels.securitySettings)
            : {},
        },
      };

      res.success(userDetails, "User details retrieved successfully");
    } catch (error) {
      logger.error("Get user details failed", {
        adminId: req.user?.id,
        userId: req.params.userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      const user = await this.users.get(userId);

      // Update user status
      await this.users.updateLabels(userId, {
        accountStatus: status,
        statusReason: reason || "",
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date().toISOString(),
      });

      logger.audit("USER_STATUS_UPDATED", req.user.id, {
        targetUserId: userId,
        oldStatus: user.labels?.accountStatus,
        newStatus: status,
        reason,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "USER_STATUS_UPDATED",
        entity: "user",
        entityId: userId,
        metadata: {
          oldStatus: user.labels?.accountStatus,
          newStatus: status,
          reason,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(
        {
          userId,
          status,
          updatedAt: new Date().toISOString(),
        },
        "User status updated successfully",
      );
    } catch (error) {
      logger.error("Update user status failed", {
        adminId: req.user?.id,
        userId: req.params.userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update user verification status
   */
  async updateUserVerification(req, res) {
    try {
      const { userId } = req.params;
      const { verified, verificationLevel, notes } = req.body;

      const user = await this.users.get(userId);
      const currentKYCLevel = parseInt(user.labels?.kycLevel || "0");

      const updateLabels = {
        verificationReviewedBy: req.user.id,
        verificationReviewedAt: new Date().toISOString(),
        verificationNotes: notes || "",
      };

      if (verified) {
        updateLabels.kycLevel =
          verificationLevel === "enhanced"
            ? "2"
            : verificationLevel === "premium"
              ? "3"
              : "1";
        updateLabels.verificationStatus = "verified";

        // Update email verification if not already verified
        if (!user.emailVerification) {
          await this.users.updateEmailVerification(userId, true);
        }
      } else {
        updateLabels.verificationStatus = "rejected";
      }

      await this.users.updateLabels(userId, updateLabels);

      logger.audit("USER_VERIFICATION_UPDATED", req.user.id, {
        targetUserId: userId,
        oldKYCLevel: currentKYCLevel,
        newKYCLevel: updateLabels.kycLevel || currentKYCLevel,
        verified,
        verificationLevel,
        notes,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "USER_VERIFICATION_UPDATED",
        entity: "user",
        entityId: userId,
        metadata: {
          oldKYCLevel: currentKYCLevel,
          newKYCLevel: updateLabels.kycLevel || currentKYCLevel,
          verified,
          verificationLevel,
          notes,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(
        {
          userId,
          verified,
          kycLevel: parseInt(updateLabels.kycLevel || currentKYCLevel),
          updatedAt: new Date().toISOString(),
        },
        "User verification updated successfully",
      );
    } catch (error) {
      logger.error("Update user verification failed", {
        adminId: req.user?.id,
        userId: req.params.userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get system settings
   */
  async getSystemSettings(req, res) {
    try {
      // TODO: Retrieve system settings from database
      const settings = {
        features: {
          registration: true,
          twoFactorAuth: true,
          cardPayments: true,
          bankTransfers: true,
          mobilePayments: true,
          cryptocurrency: false,
        },
        limits: {
          dailyTransactionLimit: 10000,
          monthlyTransactionLimit: 100000,
          maxTransactionAmount: 50000,
          minTransactionAmount: 1,
        },
        fees: {
          transferFeePercentage: 1.5,
          withdrawalFeeFixed: 2.5,
          currencyConversionFee: 2.0,
          internationalTransferFee: 5.0,
        },
        maintenance: {
          enabled: false,
          message: "",
          scheduledStart: null,
          scheduledEnd: null,
        },
        security: {
          passwordMinLength: 8,
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          lockoutDuration: 1800,
        },
      };

      res.success(settings, "System settings retrieved successfully");
    } catch (error) {
      logger.error("Get system settings failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate reports
   */
  async generateUserReport(req, res) {
    try {
      const { format, startDate, endDate } = req.query;

      // Get user data for the specified date range
      const dateRange = this.calculateDateRange("custom", startDate, endDate);
      const userData = await this.getUserReportData(
        dateRange.start,
        dateRange.end,
      );

      let reportData;
      switch (format) {
        case "csv":
          reportData = this.generateUserCSVReport(userData);
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=users-report.csv",
          );
          break;
        case "pdf":
          reportData = await this.generateUserPDFReport(userData);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=users-report.pdf",
          );
          break;
        case "xlsx":
          reportData = this.generateUserXLSXReport(userData);
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=users-report.xlsx",
          );
          break;
        default:
          throw new ValidationError("Unsupported report format");
      }

      logger.audit("USER_REPORT_GENERATED", req.user.id, {
        format,
        startDate,
        endDate,
        recordCount: userData.length,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "USER_REPORT_GENERATED",
        entity: "user",
        entityId: "report",
        metadata: { format, startDate, endDate, recordCount: userData.length },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.send(reportData);
    } catch (error) {
      logger.error("Generate user report failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  // Helper methods

  async getSystemStats() {
    try {
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Get total users count
      const totalUsersResult = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.usersId,
        [],
        1,
        0,
      );
      const totalUsers = totalUsersResult.total;

      // Get active users (use email verification or account status from labels)
      let activeUsers = totalUsers; // Default to all users
      try {
        // Try to get email verified users first
        const verifiedUsersResult = await this.databases.listDocuments(
          config.database.appwrite.databaseId,
          config.collections.usersId,
          [Query.equal("emailVerification", true)],
          1,
          0,
        );
        activeUsers = verifiedUsersResult.total;
      } catch (error) {
        // Silently fall back to total users count - this is normal for new setups
        activeUsers = totalUsers;
      }

      // Get new users today
      const newUsersResult = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.usersId,
        [
          Query.greaterThanEqual("$createdAt", todayStart.toISOString()),
          Query.lessThan("$createdAt", todayEnd.toISOString()),
        ],
        1,
        0,
      );
      const newUsersToday = newUsersResult.total;

      // Get total transactions count
      const totalTransactionsResult = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [],
        1,
        0,
      );
      const totalTransactions = totalTransactionsResult.total;

      // Get today's transactions
      const todayTransactionsResult = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [
          Query.greaterThanEqual("$createdAt", todayStart.toISOString()),
          Query.lessThan("$createdAt", todayEnd.toISOString()),
        ],
        1000,
        0,
      );
      const transactionsToday = todayTransactionsResult.total;

      // Calculate total volume from completed transactions
      const completedTransactions = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [Query.equal("status", "completed")],
        25000,
        0,
      );

      const totalVolume = completedTransactions.documents.reduce(
        (sum, transaction) => {
          return sum + (parseFloat(transaction.amount) || 0);
        },
        0,
      );

      // Calculate today's volume
      const todayCompletedTransactions =
        todayTransactionsResult.documents.filter(
          (transaction) => transaction.status === "completed",
        );
      const volumeToday = todayCompletedTransactions.reduce(
        (sum, transaction) => {
          return sum + (parseFloat(transaction.amount) || 0);
        },
        0,
      );

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        totalTransactions,
        transactionsToday,
        totalVolume: Math.round(totalVolume * 100) / 100,
        volumeToday: Math.round(volumeToday * 100) / 100,
        systemUptime: process.uptime(),
      };
    } catch (error) {
      logger.error("Get system stats failed", {
        error: error.message,
      });
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        totalTransactions: 0,
        transactionsToday: 0,
        totalVolume: 0,
        volumeToday: 0,
        systemUptime: process.uptime(),
      };
    }
  }

  async getRecentActivity() {
    try {
      const activities = [];
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get recent user registrations
      const recentUsers = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.usersId,
        [Query.greaterThanEqual("$createdAt", last24Hours.toISOString())],
        5,
        0,
      );

      recentUsers.documents.forEach((user) => {
        activities.push({
          id: `user_${user.$id}`,
          type: "USER_REGISTRATION",
          description: "New user registered",
          user: user.email,
          timestamp: user.$createdAt,
        });
      });

      // Get recent large transactions (>$1000)
      const largeTransactions = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [
          Query.greaterThanEqual("$createdAt", last24Hours.toISOString()),
          Query.greaterThanEqual("amount", 1000),
          Query.equal("status", "completed"),
        ],
        5,
        0,
      );

      largeTransactions.documents.forEach((transaction) => {
        activities.push({
          id: `transaction_${transaction.$id}`,
          type: "LARGE_TRANSACTION",
          description: `Large transaction detected - ${transaction.currency} ${transaction.amount}`,
          amount: parseFloat(transaction.amount),
          timestamp: transaction.$createdAt,
        });
      });

      // Sort all activities by timestamp and return latest 10
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    } catch (error) {
      logger.error("Get recent activity failed", {
        error: error.message,
      });
      return [];
    }
  }

  async getSystemAlerts() {
    // TODO: Get system alerts and warnings
    return [
      {
        id: "1",
        type: "warning",
        title: "High Transaction Volume",
        message: "Transaction volume is 150% above average",
        timestamp: new Date().toISOString(),
      },
    ];
  }

  async getUserAnalytics(dateRange) {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get all users for analysis
      const allUsersResult = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.usersId,
        [],
        25000, // Large limit to get all users
        0,
      );
      const allUsers = allUsersResult.documents;

      const totalUsers = allUsers.length;

      // Count new users (last 30 days)
      const newUsers = allUsers.filter(
        (user) => new Date(user.$createdAt) >= last30Days,
      ).length;

      // Count active users (not suspended/blocked)
      const activeUsers = allUsers.filter(
        (user) => user.status === "active" || user.status === "verified",
      ).length;

      // Count verified users
      const verifiedUsers = allUsers.filter(
        (user) => user.verified === true,
      ).length;

      // Group by country
      const countryStats = {};
      allUsers.forEach((user) => {
        const country = user.country || "Unknown";
        countryStats[country] = (countryStats[country] || 0) + 1;
      });

      // Get top 4 countries and group others
      const sortedCountries = Object.entries(countryStats).sort(
        ([, a], [, b]) => b - a,
      );

      const usersByCountry = {};
      let othersCount = 0;

      sortedCountries.forEach(([country, count], index) => {
        if (index < 4) {
          usersByCountry[country] = count;
        } else {
          othersCount += count;
        }
      });

      if (othersCount > 0) {
        usersByCountry["Others"] = othersCount;
      }

      // Group by KYC level
      const kycStats = {};
      allUsers.forEach((user) => {
        const level = user.kycLevel || "Level 0";
        const levelStr = String(level);
        const levelKey = levelStr.startsWith("Level")
          ? levelStr
          : `Level ${levelStr}`;
        kycStats[levelKey] = (kycStats[levelKey] || 0) + 1;
      });

      return {
        totalUsers,
        newUsers,
        activeUsers,
        verifiedUsers,
        usersByCountry,
        usersByKYCLevel: kycStats,
      };
    } catch (error) {
      logger.error("Get user analytics failed", {
        error: error.message,
      });
      return {
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        usersByCountry: {},
        usersByKYCLevel: {},
      };
    }
  }

  async getTransactionAnalytics(dateRange) {
    try {
      // Get all transactions
      const allTransactionsResult = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [],
        25000, // Large limit to get all transactions
        0,
      );
      const allTransactions = allTransactionsResult.documents;

      const totalTransactions = allTransactions.length;

      // Calculate total volume from completed transactions only
      const completedTransactions = allTransactions.filter(
        (t) => t.status === "completed",
      );
      const totalVolume = completedTransactions.reduce((sum, transaction) => {
        return sum + (parseFloat(transaction.amount) || 0);
      }, 0);

      // Calculate average transaction size
      const averageTransactionSize =
        completedTransactions.length > 0
          ? Math.round((totalVolume / completedTransactions.length) * 100) / 100
          : 0;

      // Group by transaction type
      const typeStats = {};
      allTransactions.forEach((transaction) => {
        const type = transaction.type || "unknown";
        typeStats[type] = (typeStats[type] || 0) + 1;
      });

      // Group by currency and calculate volume
      const currencyStats = {};
      completedTransactions.forEach((transaction) => {
        const currency = transaction.currency || "USD";
        const amount = parseFloat(transaction.amount) || 0;
        currencyStats[currency] = (currencyStats[currency] || 0) + amount;
      });

      // Round currency amounts
      Object.keys(currencyStats).forEach((currency) => {
        currencyStats[currency] =
          Math.round(currencyStats[currency] * 100) / 100;
      });

      return {
        totalTransactions,
        totalVolume: Math.round(totalVolume * 100) / 100,
        averageTransactionSize,
        transactionsByType: typeStats,
        transactionsByCurrency: currencyStats,
      };
    } catch (error) {
      logger.error("Get transaction analytics failed", {
        error: error.message,
      });
      return {
        totalTransactions: 0,
        totalVolume: 0,
        averageTransactionSize: 0,
        transactionsByType: {},
        transactionsByCurrency: {},
      };
    }
  }

  calculateDateRange(period, startDate, endDate) {
    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    const now = new Date();
    let start;

    switch (period) {
      case "day":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end: now };
  }

  generateUserCSVReport(userData) {
    // TODO: Generate actual CSV report
    let csv = "ID,Email,Name,Status,KYC Level,Created At,Last Login\n";
    userData.forEach((user) => {
      csv += `${user.id},${user.email},"${user.name}",${user.status},${user.kycLevel},${user.createdAt},${user.lastLogin || "Never"}\n`;
    });
    return csv;
  }

  /**
   * Transaction Management Methods
   */

  /**
   * Get all transactions with filters, sort, and pagination (SDK v12)
   */
  async getTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        type,
        provider,
        flagged,
        startDate,
        endDate,
        search,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));

      // Build Appwrite v12 query array — limit/offset go inside queries
      const queries = [
        Query.orderDesc("$createdAt"),
        Query.limit(pageLimit),
        Query.offset((pageNum - 1) * pageLimit),
      ];

      if (status) queries.push(Query.equal("status", status));
      if (type) queries.push(Query.equal("type", type));
      if (provider) queries.push(Query.equal("provider", provider));
      if (flagged !== undefined)
        queries.push(Query.equal("flagged", flagged === "true"));
      if (startDate)
        queries.push(Query.greaterThanEqual("$createdAt", startDate));
      if (endDate) queries.push(Query.lessThanEqual("$createdAt", endDate));
      // Search by transaction $id (exact match)
      if (search && search.trim().length >= 8) {
        queries.push(Query.equal("$id", search.trim()));
      }

      const transactionList = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        queries,
      );

      const transactions = transactionList.documents.map((tx) => ({
        id: tx.$id,
        // Sender — varies per transaction type
        senderId: tx.senderId || tx.userId || "",
        senderEmail: tx.senderEmail || "",
        // Recipient / receiver
        recipientId: tx.recipientId || "",
        recipientEmail: tx.recipientEmail || "",
        recipientPhone: tx.recipientPhone || tx.receiverPhone || "",
        recipientName: tx.recipientName || tx.receiverAccountName || "",
        // Core financial data
        amount: tx.amount,
        currency: tx.currency || "USD",
        status: tx.status,
        type: tx.type,
        provider: tx.provider || tx.receiverProvider || "",
        description: tx.description || "",
        // Reference data
        providerReference: tx.providerReference || "",
        idempotencyKey: tx.idempotencyKey || "",
        paymentMethod: tx.paymentMethod || "",
        flagged: tx.flagged || false,
        // Security / audit
        ipAddress: tx.ipAddress || "",
        // Timestamps
        createdAt: tx.$createdAt,
        updatedAt: tx.$updatedAt,
      }));

      res.paginated(
        transactions,
        {
          page: pageNum,
          limit: pageLimit,
          totalItems: transactionList.total,
          totalPages: Math.ceil(transactionList.total / pageLimit),
        },
        "Transactions retrieved successfully",
      );
    } catch (error) {
      logger.error("Get transactions failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(req, res) {
    try {
      const { transactionId } = req.params;

      const transaction = await this.databases.getDocument(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        transactionId,
      );

      // Get related user details
      const user = await this.users.get(transaction.userId);

      const transactionDetails = {
        ...transaction,
        user: {
          id: user.$id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      };

      res.success(
        transactionDetails,
        "Transaction details retrieved successfully",
      );
    } catch (error) {
      logger.error("Get transaction details failed", {
        adminId: req.user?.id,
        transactionId: req.params.transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(req, res) {
    try {
      const { transactionId } = req.params;
      const { status, reason } = req.body;

      const transaction = await this.databases.updateDocument(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        transactionId,
        {
          status,
          statusReason: reason || "",
          statusUpdatedBy: req.user.id,
          statusUpdatedAt: new Date().toISOString(),
        },
      );

      logger.audit("TRANSACTION_STATUS_UPDATED", req.user.id, {
        transactionId,
        oldStatus: transaction.status,
        newStatus: status,
        reason,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "TRANSACTION_STATUS_UPDATED",
        entity: "transaction",
        entityId: transactionId,
        metadata: { oldStatus: transaction.status, newStatus: status, reason },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(
        {
          transactionId,
          status,
          updatedAt: new Date().toISOString(),
        },
        "Transaction status updated successfully",
      );
    } catch (error) {
      logger.error("Update transaction status failed", {
        adminId: req.user?.id,
        transactionId: req.params.transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Merchant Management Methods
   */

  /**
   * Get all merchants with filters
   */
  async getMerchants(req, res) {
    try {
      // Check if merchants collection exists
      if (!config.collections.merchantsId) {
        return res.success(
          {
            merchants: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 50,
              totalPages: 0,
            },
          },
          "Merchants feature not configured",
        );
      }

      const { page = 1, limit = 50, status, search } = req.query;

      const queries = [];
      if (status) queries.push(Query.equal("status", status));

      const merchantList = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.merchantsId,
        queries,
        parseInt(limit),
        (parseInt(page) - 1) * parseInt(limit),
        "$createdAt",
        "DESC",
      );

      const merchants = merchantList.documents.map((merchant) => ({
        id: merchant.$id,
        businessName: merchant.businessName,
        contactEmail: merchant.contactEmail,
        contactPhone: merchant.contactPhone,
        status: merchant.status,
        category: merchant.category,
        registrationDate: merchant.$createdAt,
        lastActive: merchant.lastActive,
        totalTransactions: merchant.totalTransactions || 0,
        totalVolume: merchant.totalVolume || 0,
      }));

      const totalPages = Math.ceil(merchantList.total / parseInt(limit));

      res.paginated(
        merchants,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: merchantList.total,
          totalPages,
        },
        "Merchants retrieved successfully",
      );
    } catch (error) {
      logger.error("Get merchants failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get merchant details
   */
  async getMerchantDetails(req, res) {
    try {
      // Check if merchants collection exists
      if (!config.collections.merchantsId) {
        return res.error("Merchants feature not configured", 404);
      }

      const { merchantId } = req.params;

      const merchant = await this.databases.getDocument(
        config.database.appwrite.databaseId,
        config.collections.merchantsId,
        merchantId,
      );

      // Get merchant's tills
      const tills = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.tillsId,
        [`merchantId=${merchantId}`],
      );

      // Get recent transactions
      const recentTransactions = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [`merchantId=${merchantId}`],
        10,
      );

      const merchantDetails = {
        ...merchant,
        tills: tills.documents,
        recentTransactions: recentTransactions.documents,
        stats: {
          totalTills: tills.total,
          activeTills: tills.documents.filter(
            (till) => till.status === "active",
          ).length,
          totalTransactions: recentTransactions.total,
          monthlyVolume: 0, // Calculate from transactions
        },
      };

      res.success(merchantDetails, "Merchant details retrieved successfully");
    } catch (error) {
      logger.error("Get merchant details failed", {
        adminId: req.user?.id,
        merchantId: req.params.merchantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update merchant status
   */
  async updateMerchantStatus(req, res) {
    try {
      const { merchantId } = req.params;
      const { status, reason } = req.body;

      const merchant = await this.databases.updateDocument(
        config.database.appwrite.databaseId,
        config.collections.merchantsId,
        merchantId,
        {
          status,
          statusReason: reason || "",
          statusUpdatedBy: req.user.id,
          statusUpdatedAt: new Date().toISOString(),
        },
      );

      logger.audit("MERCHANT_STATUS_UPDATED", req.user.id, {
        merchantId,
        oldStatus: merchant.status,
        newStatus: status,
        reason,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "MERCHANT_STATUS_UPDATED",
        entity: "merchant",
        entityId: merchantId,
        metadata: { oldStatus: merchant.status, newStatus: status, reason },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(
        {
          merchantId,
          status,
          updatedAt: new Date().toISOString(),
        },
        "Merchant status updated successfully",
      );
    } catch (error) {
      logger.error("Update merchant status failed", {
        adminId: req.user?.id,
        merchantId: req.params.merchantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Till Management Methods
   */

  /**
   * Get all tills with filters
   */
  async getTills(req, res) {
    try {
      // Check if tills collection exists
      if (!config.collections.tillsId) {
        return res.success(
          {
            tills: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 50,
              totalPages: 0,
            },
          },
          "Tills feature not configured",
        );
      }

      const { page = 1, limit = 50, status, merchantId } = req.query;

      const queries = [];
      if (status) queries.push(Query.equal("status", status));
      if (merchantId) queries.push(Query.equal("merchantId", merchantId));

      const tillList = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.tillsId,
        queries,
        parseInt(limit),
        (parseInt(page) - 1) * parseInt(limit),
        "$createdAt",
        "DESC",
      );

      const tills = tillList.documents.map((till) => ({
        id: till.$id,
        tillNumber: till.tillNumber,
        merchantId: till.merchantId,
        merchantName: till.merchantName,
        status: till.status,
        location: till.location,
        createdAt: till.$createdAt,
        lastTransaction: till.lastTransaction,
      }));

      const totalPages = Math.ceil(tillList.total / parseInt(limit));

      res.paginated(
        tills,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: tillList.total,
          totalPages,
        },
        "Tills retrieved successfully",
      );
    } catch (error) {
      logger.error("Get tills failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Card Management Methods
   */

  /**
   * Get all linked cards with filters
   */
  async getCards(req, res) {
    try {
      const { page = 1, limit = 50, status, userId } = req.query;

      const queries = [];
      if (status) queries.push(Query.equal("status", status));
      if (userId) queries.push(Query.equal("userId", userId));

      const cardList = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.cardsId,
        queries,
        parseInt(limit),
        (parseInt(page) - 1) * parseInt(limit),
        "$createdAt",
        "DESC",
      );

      const cards = cardList.documents.map((card) => ({
        id: card.$id,
        userId: card.userId,
        maskedNumber: card.maskedNumber,
        cardType: card.cardType,
        issuer: card.issuer,
        status: card.status,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        createdAt: card.$createdAt,
        lastUsed: card.lastUsed,
        transactionCount: card.transactionCount || 0,
      }));

      const totalPages = Math.ceil(cardList.total / parseInt(limit));

      res.paginated(
        cards,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: cardList.total,
          totalPages,
        },
        "Cards retrieved successfully",
      );
    } catch (error) {
      logger.error("Get cards failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update card status
   */
  async updateCardStatus(req, res) {
    try {
      const { cardId } = req.params;
      const { status, reason } = req.body;

      const card = await this.databases.updateDocument(
        config.database.appwrite.databaseId,
        config.collections.cardsId,
        cardId,
        {
          status,
          statusReason: reason || "",
          statusUpdatedBy: req.user.id,
          statusUpdatedAt: new Date().toISOString(),
        },
      );

      logger.audit("CARD_STATUS_UPDATED", req.user.id, {
        cardId,
        userId: card.userId,
        oldStatus: card.status,
        newStatus: status,
        reason,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "CARD_STATUS_UPDATED",
        entity: "card",
        entityId: cardId,
        metadata: {
          userId: card.userId,
          oldStatus: card.status,
          newStatus: status,
          reason,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(
        {
          cardId,
          status,
          updatedAt: new Date().toISOString(),
        },
        "Card status updated successfully",
      );
    } catch (error) {
      logger.error("Update card status failed", {
        adminId: req.user?.id,
        cardId: req.params.cardId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Education Content Management Methods
   */

  /**
   * Get education content with filters
   */
  async getEducationContent(req, res) {
    try {
      const { page = 1, limit = 50, status, category } = req.query;

      const queries = [];
      if (status) queries.push(Query.equal("status", status));
      if (category) queries.push(Query.equal("categoryId", category));

      const contentList = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.educationContentId,
        queries,
        parseInt(limit),
        (parseInt(page) - 1) * parseInt(limit),
        "$updatedAt",
        "DESC",
      );

      const content = contentList.documents.map((item) => ({
        id: item.$id,
        title: item.title,
        slug: item.slug,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        status: item.status,
        author: item.author,
        publishedAt: item.publishedAt,
        createdAt: item.$createdAt,
        updatedAt: item.$updatedAt,
        viewCount: item.viewCount || 0,
        completionRate: item.completionRate || 0,
      }));

      const totalPages = Math.ceil(contentList.total / parseInt(limit));

      res.paginated(
        content,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: contentList.total,
          totalPages,
        },
        "Education content retrieved successfully",
      );
    } catch (error) {
      logger.error("Get education content failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create education content
   */
  async createEducationContent(req, res) {
    try {
      const { title, content, categoryId, status = "draft" } = req.body;

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const newContent = await this.databases.createDocument(
        config.database.appwrite.databaseId,
        config.collections.educationContentId,
        ID.unique(),
        {
          title,
          slug,
          content,
          categoryId,
          status,
          author: req.user.name || req.user.email,
          authorId: req.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      logger.audit("EDUCATION_CONTENT_CREATED", req.user.id, {
        contentId: newContent.$id,
        title,
        categoryId,
        status,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "EDUCATION_CONTENT_CREATED",
        entity: "content",
        entityId: newContent.$id,
        metadata: { title, categoryId, status },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(newContent, "Education content created successfully");
    } catch (error) {
      logger.error("Create education content failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update education content
   */
  async updateEducationContent(req, res) {
    try {
      const { contentId } = req.params;
      const { title, content, categoryId, status } = req.body;

      const updatedContent = await this.databases.updateDocument(
        config.database.appwrite.databaseId,
        config.collections.educationContentId,
        contentId,
        {
          title,
          content,
          categoryId,
          status,
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: req.user.id,
        },
      );

      logger.audit("EDUCATION_CONTENT_UPDATED", req.user.id, {
        contentId,
        title,
        categoryId,
        status,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "EDUCATION_CONTENT_UPDATED",
        entity: "content",
        entityId: contentId,
        metadata: { title, categoryId, status },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(updatedContent, "Education content updated successfully");
    } catch (error) {
      logger.error("Update education content failed", {
        adminId: req.user?.id,
        contentId: req.params.contentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete education content
   */
  async deleteEducationContent(req, res) {
    try {
      const { contentId } = req.params;

      await this.databases.deleteDocument(
        config.database.appwrite.databaseId,
        config.collections.educationContentId,
        contentId,
      );

      logger.audit("EDUCATION_CONTENT_DELETED", req.user.id, {
        contentId,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "EDUCATION_CONTENT_DELETED",
        entity: "content",
        entityId: contentId,
        metadata: {},
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success({ contentId }, "Education content deleted successfully");
    } catch (error) {
      logger.error("Delete education content failed", {
        adminId: req.user?.id,
        contentId: req.params.contentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get education categories
   */
  async getEducationCategories(req, res) {
    try {
      const categories = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.educationCategoriesId,
        [],
        100,
      );

      res.success(
        categories.documents,
        "Education categories retrieved successfully",
      );
    } catch (error) {
      logger.error("Get education categories failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create education category
   */
  async createEducationCategory(req, res) {
    try {
      const { name, description, icon, color } = req.body;

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const newCategory = await this.databases.createDocument(
        config.database.appwrite.databaseId,
        config.collections.educationCategoriesId,
        ID.unique(),
        {
          name,
          slug,
          description: description || "",
          icon: icon || "book",
          color: color || "blue",
          createdAt: new Date().toISOString(),
          createdBy: req.user.id,
        },
      );

      logger.audit("EDUCATION_CATEGORY_CREATED", req.user.id, {
        categoryId: newCategory.$id,
        name,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "EDUCATION_CATEGORY_CREATED",
        entity: "content",
        entityId: newCategory.$id,
        metadata: { name },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(newCategory, "Education category created successfully");
    } catch (error) {
      logger.error("Create education category failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * System Health and Notifications
   */

  /**
   * Get system health status
   */
  async getSystemHealth(req, res) {
    try {
      const health = await getDatabaseHealth();

      const systemHealth = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: health.status === "connected" ? "healthy" : "unhealthy",
          api: "healthy",
          redis: "healthy", // TODO: Check actual Redis status
          storage: "healthy", // TODO: Check actual storage status
        },
        metrics: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
      };

      res.success(systemHealth, "System health retrieved successfully");
    } catch (error) {
      logger.error("Get system health failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get admin notifications
   */
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, read } = req.query;
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      const notifCollectionId =
        config.database.appwrite.notificationsCollectionId;
      if (!notifCollectionId) {
        return res.paginated(
          [],
          {
            page: pageNum,
            limit: limitNum,
            totalItems: 0,
            totalPages: 0,
            unreadCount: 0,
          },
          "Notifications retrieved successfully",
        );
      }

      // Query by userId: "__admin__" — this sentinel is written on every admin
      // notification and uses the existing indexed userId field. This avoids any
      // dependency on the optional targetRole attribute which requires a migration.
      const baseFilter = Query.equal("userId", "__admin__");

      const queries = [
        baseFilter,
        Query.orderDesc("$createdAt"),
        Query.limit(limitNum),
        Query.offset(offset),
      ];

      if (read !== undefined) {
        queries.push(Query.equal("read", read === "true"));
      }

      const [result, unreadResult] = await Promise.all([
        this.databases.listDocuments(
          config.database.appwrite.databaseId,
          notifCollectionId,
          queries,
        ),
        this.databases.listDocuments(
          config.database.appwrite.databaseId,
          notifCollectionId,
          [
            Query.equal("userId", "__admin__"),
            Query.equal("read", false),
            Query.limit(1),
          ],
        ),
      ]);

      res.paginated(
        result.documents,
        {
          page: pageNum,
          limit: limitNum,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / limitNum),
          unreadCount: unreadResult.total,
        },
        "Notifications retrieved successfully",
      );
    } catch (error) {
      logger.error("Get notifications failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Mark a single admin notification as read
   */
  async markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      const notifCollectionId =
        config.database.appwrite.notificationsCollectionId;

      // Verify the document exists and belongs to the admin scope
      let doc;
      try {
        doc = await this.databases.getDocument(
          config.database.appwrite.databaseId,
          notifCollectionId,
          id,
        );
      } catch {
        throw new NotFoundError("Notification");
      }

      if (doc.userId !== "__admin__") {
        throw new NotFoundError("Notification");
      }

      const updated = await this.databases.updateDocument(
        config.database.appwrite.databaseId,
        notifCollectionId,
        id,
        { read: true },
      );

      res.success(updated, "Notification marked as read");
    } catch (error) {
      logger.error("Mark notification read failed", {
        adminId: req.user?.id,
        notificationId: req.params?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get revenue analytics - Real calculation
   */
  async getRevenueAnalytics(dateRange) {
    try {
      // Get completed transactions for revenue calculation
      const revenueTransactions = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [Query.equal("status", "completed")],
        25000,
        0,
      );

      const totalRevenue = revenueTransactions.documents.reduce(
        (sum, transaction) => {
          return sum + (parseFloat(transaction.amount) || 0);
        },
        0,
      );

      // Calculate monthly revenue (last 30 days)
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const monthlyTransactions = revenueTransactions.documents.filter(
        (transaction) => new Date(transaction.$createdAt) >= last30Days,
      );

      const monthlyRevenue = monthlyTransactions.reduce((sum, transaction) => {
        return sum + (parseFloat(transaction.amount) || 0);
      }, 0);

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        transactionCount: revenueTransactions.documents.length,
        averageTransaction:
          totalRevenue / revenueTransactions.documents.length || 0,
      };
    } catch (error) {
      logger.error("Get revenue analytics failed", {
        error: error.message,
      });
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        transactionCount: 0,
        averageTransaction: 0,
      };
    }
  }

  /**
   * Get performance metrics - Real calculation
   */
  async getPerformanceMetrics(dateRange) {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get transaction success rate
      const allTransactions = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [Query.greaterThanEqual("$createdAt", last24Hours.toISOString())],
        5000,
        0,
      );

      const completedTransactions = allTransactions.documents.filter(
        (t) => t.status === "completed",
      ).length;
      const failedTransactions = allTransactions.documents.filter(
        (t) => t.status === "failed",
      ).length;
      const totalTransactions = allTransactions.documents.length;

      const successRate =
        totalTransactions > 0
          ? (completedTransactions / totalTransactions) * 100
          : 0;

      // Get system uptime
      const systemUptime = process.uptime();

      return {
        transactionSuccessRate: Math.round(successRate * 100) / 100,
        totalTransactions24h: totalTransactions,
        completedTransactions24h: completedTransactions,
        failedTransactions24h: failedTransactions,
        systemUptime: Math.round(systemUptime),
        averageResponseTime: 250, // TODO: Implement real response time tracking
      };
    } catch (error) {
      logger.error("Get performance metrics failed", {
        error: error.message,
      });
      return {
        transactionSuccessRate: 0,
        totalTransactions24h: 0,
        completedTransactions24h: 0,
        failedTransactions24h: 0,
        systemUptime: process.uptime(),
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Get user transaction summary - Real calculation
   */
  async getUserTransactionSummary(userId) {
    try {
      const userTransactions = await this.databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.transactionsId,
        [`userId=${userId}`],
        1000,
        0,
      );

      const transactions = userTransactions.documents;
      const completedTransactions = transactions.filter(
        (t) => t.status === "completed",
      );

      const totalTransactions = transactions.length;
      const totalVolume = completedTransactions.reduce(
        (sum, t) => sum + (parseFloat(t.amount) || 0),
        0,
      );
      const averageTransaction =
        completedTransactions.length > 0
          ? totalVolume / completedTransactions.length
          : 0;

      // Get transaction types breakdown
      const typeBreakdown = {};
      transactions.forEach((transaction) => {
        const type = transaction.type || "unknown";
        typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
      });

      // Get recent transactions (last 10)
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))
        .slice(0, 10);

      return {
        totalTransactions,
        completedTransactions: completedTransactions.length,
        totalVolume: Math.round(totalVolume * 100) / 100,
        averageTransaction: Math.round(averageTransaction * 100) / 100,
        typeBreakdown,
        recentTransactions,
      };
    } catch (error) {
      logger.error("Get user transaction summary failed", {
        userId,
        error: error.message,
      });
      return {
        totalTransactions: 0,
        completedTransactions: 0,
        totalVolume: 0,
        averageTransaction: 0,
        typeBreakdown: {},
        recentTransactions: [],
      };
    }
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/admin/audit-logs
   * Returns paginated audit log entries, filterable by actorId, actorRole,
   * action, entity, date range.
   */
  async getAuditLogs(req, res) {
    try {
      const {
        actorId,
        actorRole,
        action,
        entity,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const { logs, total } = await auditService.queryLogs({
        actorId,
        actorRole,
        action,
        entity,
        startDate,
        endDate,
        page,
        limit,
      });

      const totalPages = Math.ceil(total / parseInt(limit));

      res.paginated(
        logs,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: total,
          totalPages,
        },
        "Audit logs retrieved successfully",
      );
    } catch (error) {
      logger.error("Get audit logs failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  // ── Fraud Monitoring ───────────────────────────────────────────────────────

  /**
   * GET /api/v1/admin/fraud-flags
   * Returns paginated fraud flag records, filterable by severity and status.
   */
  async getFraudFlags(req, res) {
    try {
      const {
        severity,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const { flags, total } = await fraudService.queryFlags({
        severity,
        status,
        startDate,
        endDate,
        page,
        limit,
      });

      const totalPages = Math.ceil(total / parseInt(limit));

      res.paginated(
        flags,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: total,
          totalPages,
        },
        "Fraud flags retrieved successfully",
      );
    } catch (error) {
      logger.error("Get fraud flags failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * PUT /api/v1/admin/fraud-flags/:flagId
   * Actions: mark_safe | escalate | block_user
   * For block_user the transaction userId is resolved and the account is suspended.
   */
  async updateFraudFlag(req, res) {
    try {
      const { flagId } = req.params;
      const { action, notes } = req.body;

      const allowedActions = ["mark_safe", "escalate", "block_user"];
      if (!allowedActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action. Must be one of: ${allowedActions.join(", ")}`,
        });
      }

      let flagStatus;
      switch (action) {
        case "mark_safe":
          flagStatus = "resolved";
          break;
        case "escalate":
          flagStatus = "escalated";
          break;
        case "block_user":
          flagStatus = "escalated";
          break;
        default:
          flagStatus = "open";
      }

      // Update the flag record
      const updated = await fraudService.updateFlag(flagId, {
        status: flagStatus,
        reviewedBy: req.user.id,
        notes,
      });

      // If block_user, fetch the transaction to get userId and suspend the account
      if (action === "block_user") {
        try {
          const flag = await this.databases.getDocument(
            config.database.appwrite.databaseId,
            config.collections.fraudFlagsId,
            flagId,
          );
          if (flag?.transactionId) {
            const tx = await this.databases.getDocument(
              config.database.appwrite.databaseId,
              config.collections.transactionsId,
              flag.transactionId,
            );
            if (tx?.userId) {
              await this.users.updateLabels(tx.userId, {
                accountStatus: "blocked",
                statusReason: `Blocked by admin ${req.user.id} via fraud flag ${flagId}`,
                statusUpdatedBy: req.user.id,
                statusUpdatedAt: new Date().toISOString(),
              });
            }
          }
        } catch (_blockErr) {
          // Non-fatal — log but don't fail the request
          logger.warn("block_user step failed during fraud flag update", {
            flagId,
            error: _blockErr.message,
          });
        }
      }

      // Audit the admin action
      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: `FRAUD_FLAG_${action.toUpperCase()}`,
        entity: "transaction",
        entityId: flagId,
        metadata: { action, notes },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      logger.audit(`FRAUD_FLAG_${action.toUpperCase()}`, req.user.id, {
        flagId,
        action,
        notes,
        ip: req.ip,
      });

      res.success(updated, "Fraud flag updated successfully");
    } catch (error) {
      logger.error("Update fraud flag failed", {
        adminId: req.user?.id,
        flagId: req.params.flagId,
        error: error.message,
      });
      throw error;
    }
  }

  // ── Merchant Administration ───────────────────────────────────────────────

  /**
   * GET /api/v1/admin/merchants
   *
   * List all merchants with optional filters.
   * Query params: page, limit, status (pending|approved|rejected), search
   */
  async getMerchants(req, res) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;

      const merchantService = require("../services/merchantService");
      const result = await merchantService.listMerchants({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
      });

      const totalPages = Math.ceil(result.total / parseInt(limit));

      res.paginated(
        result.documents,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: result.total,
          totalPages,
        },
        "Merchants retrieved successfully",
      );
    } catch (error) {
      logger.error("Get merchants failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/merchants/:merchantId
   *
   * Get a single merchant with wallet details.
   */
  async getMerchantById(req, res) {
    try {
      const { merchantId } = req.params;
      const merchantService = require("../services/merchantService");

      const merchant = await merchantService.getMerchantById(merchantId);

      if (!merchant) {
        throw new NotFoundError("Merchant");
      }

      res.success(merchant, "Merchant retrieved successfully");
    } catch (error) {
      logger.error("Get merchant by ID failed", {
        adminId: req.user?.id,
        merchantId: req.params.merchantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * PATCH /api/v1/admin/merchants/:merchantId/approve
   *
   * Approve a pending merchant:
   *   - generate till number
   *   - create merchant wallet
   *   - set status = "approved"
   */
  async approveMerchant(req, res) {
    try {
      const { merchantId } = req.params;
      const merchantService = require("../services/merchantService");

      const merchant = await merchantService.approve(merchantId);

      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "MERCHANT_APPROVED",
        entity: "merchant",
        entityId: merchantId,
        metadata: {
          tillNumber: merchant.tillNumber,
          businessName: merchant.businessName,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      logger.audit("MERCHANT_APPROVED", req.user.id, {
        merchantId,
        tillNumber: merchant.tillNumber,
        businessName: merchant.businessName,
        ip: req.ip,
      });

      // Non-blocking approval email to merchant owner
      this.users
        .get(merchant.ownerId)
        .then((ownerUser) => {
          const firstName = ownerUser.name
            ? ownerUser.name.split(" ")[0]
            : "there";
          return emailService.sendMerchantApprovedEmail(
            ownerUser.email,
            firstName,
            merchant.businessName,
            merchant.tillNumber,
          );
        })
        .catch((err) =>
          logger.warn(
            "AdminController: merchant approved email failed (non-fatal)",
            {
              merchantId,
              error: err.message,
            },
          ),
        );

      res.success(
        {
          merchantId: merchant.$id,
          status: merchant.status,
          tillNumber: merchant.tillNumber,
          businessName: merchant.businessName,
        },
        `Merchant "${merchant.businessName}" approved. Till number: ${merchant.tillNumber}`,
      );
    } catch (error) {
      logger.error("Approve merchant failed", {
        adminId: req.user?.id,
        merchantId: req.params.merchantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * PATCH /api/v1/admin/merchants/:merchantId/reject
   *
   * Reject a pending merchant application.
   * Body: { reason? }
   */
  async rejectMerchant(req, res) {
    try {
      const { merchantId } = req.params;
      const { reason = "" } = req.body;

      const merchantService = require("../services/merchantService");
      const merchant = await merchantService.reject(merchantId, reason);

      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "MERCHANT_REJECTED",
        entity: "merchant",
        entityId: merchantId,
        metadata: {
          businessName: merchant.businessName,
          reason: reason.trim(),
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      logger.audit("MERCHANT_REJECTED", req.user.id, {
        merchantId,
        businessName: merchant.businessName,
        reason,
        ip: req.ip,
      });

      // Non-blocking rejection email + in-app notification to merchant owner
      this.users
        .get(merchant.ownerId)
        .then((ownerUser) => {
          const firstName = ownerUser.name
            ? ownerUser.name.split(" ")[0]
            : "there";
          return emailService.sendMerchantRejectedEmail(
            ownerUser.email,
            firstName,
            merchant.businessName,
            reason,
          );
        })
        .catch((err) =>
          logger.warn(
            "AdminController: merchant rejected email failed (non-fatal)",
            {
              merchantId,
              error: err.message,
            },
          ),
        );

      res.success(
        {
          merchantId: merchant.$id,
          status: merchant.status,
          businessName: merchant.businessName,
        },
        `Merchant "${merchant.businessName}" rejected`,
      );
    } catch (error) {
      logger.error("Reject merchant failed", {
        adminId: req.user?.id,
        merchantId: req.params.merchantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/merchants/:merchantId/analytics
   *
   * Get transaction analytics for a specific merchant.
   * Query params: period (day | week | month | quarter | year)
   */
  async getMerchantAnalytics(req, res) {
    try {
      const { merchantId } = req.params;
      const { period = "month" } = req.query;

      const merchantService = require("../services/merchantService");
      const analytics = await merchantService.getAnalytics(merchantId, {
        period,
      });

      res.success(analytics, "Merchant analytics retrieved successfully");
    } catch (error) {
      logger.error("Get merchant analytics failed", {
        adminId: req.user?.id,
        merchantId: req.params.merchantId,
        error: error.message,
      });
      throw error;
    }
  }

  // ── Payout Administration ─────────────────────────────────────────────────

  /**
   * GET /api/v1/admin/payouts
   *
   * List all payouts with optional filters.
   * Query params: page, limit, status, merchantId, method
   */
  async getPayouts(req, res) {
    try {
      const { page = 1, limit = 20, status, merchantId, method } = req.query;

      const payoutService = require("../services/payoutService");
      const result = await payoutService.listPayouts({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        merchantId,
        method,
      });

      const totalPages = Math.ceil(result.total / parseInt(limit));

      // Mask destination in admin list view
      const documents = result.documents.map((p) => ({
        ...p,
        destination: p.destination
          ? `${"*".repeat(Math.max(p.destination.length - 4, 2))}${p.destination.slice(-4)}`
          : "****",
      }));

      res.paginated(
        documents,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: result.total,
          totalPages,
        },
        "Payouts retrieved successfully",
      );
    } catch (error) {
      logger.error("Admin get payouts failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/payouts/:payoutId
   *
   * Get a single payout record including full destination (admin only).
   */
  async getPayoutById(req, res) {
    try {
      const { payoutId } = req.params;
      const payoutsColId = config.database.appwrite.payoutsCollectionId;

      if (!payoutsColId) {
        throw new NotFoundError("Payout");
      }

      const payout = await this.databases.getDocument(
        config.database.appwrite.databaseId,
        payoutsColId,
        payoutId,
      );

      res.success(payout, "Payout retrieved successfully");
    } catch (error) {
      logger.error("Admin get payout by ID failed", {
        adminId: req.user?.id,
        payoutId: req.params.payoutId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * PATCH /api/v1/admin/payouts/:payoutId/process
   *
   * Admin manually processes a pending or pending_review payout.
   */
  async processPayout(req, res) {
    try {
      const { payoutId } = req.params;
      const payoutService = require("../services/payoutService");

      const payout = await payoutService.adminProcessPayout(
        payoutId,
        req.user.id,
      );

      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "PAYOUT_PROCESSED",
        entity: "payout",
        entityId: payoutId,
        metadata: {
          merchantId: payout.merchantId,
          amount: payout.amount,
          method: payout.method,
          status: payout.status,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      logger.audit("PAYOUT_PROCESSED", req.user.id, {
        payoutId,
        merchantId: payout.merchantId,
        status: payout.status,
        ip: req.ip,
      });

      // Notify admin dashboard of outcome
      setImmediate(() => {
        try {
          const {
            createAdminNotification,
          } = require("../services/notificationService");
          createAdminNotification(
            "transaction",
            `Payout ${payout.status === "success" ? "Completed" : "Failed"}`,
            `Admin-processed payout of ${payout.amount} ${payout.currency} is now ${payout.status}`,
            { link: `/payouts/${payoutId}` },
          );
        } catch (_) {
          /* non-fatal */
        }
      });

      res.success(
        {
          payoutId: payout.$id,
          status: payout.status,
          reference: payout.reference,
        },
        `Payout processed — status: ${payout.status}`,
      );
    } catch (error) {
      logger.error("Admin process payout failed", {
        adminId: req.user?.id,
        payoutId: req.params.payoutId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * PATCH /api/v1/admin/payouts/:payoutId/fail
   *
   * Admin manually marks a payout as failed and restores merchant wallet.
   * Body: { reason? }
   */
  async failPayout(req, res) {
    try {
      const { payoutId } = req.params;
      const { reason = "Manually failed by admin" } = req.body;

      const payoutService = require("../services/payoutService");
      const payout = await payoutService.adminFailPayout(
        payoutId,
        req.user.id,
        reason,
      );

      auditService.logAction({
        actorId: req.user.id,
        actorRole: "admin",
        action: "PAYOUT_FAILED",
        entity: "payout",
        entityId: payoutId,
        metadata: {
          merchantId: payout.merchantId,
          amount: payout.amount,
          method: payout.method,
          reason,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      logger.audit("PAYOUT_FAILED", req.user.id, {
        payoutId,
        merchantId: payout.merchantId,
        reason,
        ip: req.ip,
      });

      res.success(
        { payoutId: payout.$id, status: payout.status },
        "Payout marked as failed and wallet balance restored",
      );
    } catch (error) {
      logger.error("Admin fail payout failed", {
        adminId: req.user?.id,
        payoutId: req.params.payoutId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all payment cards across all users (admin view)
   * Supports pagination and filtering by status, cardBrand, cardType, and search (userId or cardLast4).
   */
  async getAdminCards(req, res) {
    try {
      const {
        page = 1,
        limit = 25,
        status,
        cardBrand,
        cardType,
        search,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit) || 25));

      if (!config.collections.cardsId) {
        return res.paginated(
          [],
          { page: pageNum, limit: pageLimit, totalItems: 0, totalPages: 0 },
          "Cards collection not configured",
        );
      }

      // Build Appwrite query array for the paginated result
      const queries = [
        Query.orderDesc("$createdAt"),
        Query.limit(pageLimit),
        Query.offset((pageNum - 1) * pageLimit),
      ];

      if (status) queries.push(Query.equal("status", status));
      if (cardBrand) queries.push(Query.equal("cardBrand", cardBrand));
      if (cardType) queries.push(Query.equal("cardType", cardType));

      // search: exact cardLast4 (exactly 4 digits) or exact userId (alphanumeric)
      if (search && search.trim()) {
        const q = search.trim();
        if (/^\d{4}$/.test(q)) {
          queries.push(Query.equal("cardLast4", q));
        } else {
          queries.push(Query.equal("userId", q));
        }
      }

      // Fetch main dataset + global active/frozen totals in parallel
      const [cardList, activeResult, frozenResult] = await Promise.all([
        this.databases.listDocuments(
          config.database.appwrite.databaseId,
          config.collections.cardsId,
          queries,
        ),
        this.databases.listDocuments(
          config.database.appwrite.databaseId,
          config.collections.cardsId,
          [Query.equal("status", "active"), Query.limit(1)],
        ),
        this.databases.listDocuments(
          config.database.appwrite.databaseId,
          config.collections.cardsId,
          [Query.equal("status", "frozen"), Query.limit(1)],
        ),
      ]);

      // Strip sensitive fields — never expose token or fingerprint
      const cards = cardList.documents.map((card) => ({
        id: card.$id,
        userId: card.userId,
        cardLast4: card.cardLast4,
        cardBrand: card.cardBrand,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        holderName: card.holderName,
        label: card.label || null,
        cardType: card.cardType,
        status: card.status,
        isDefault: card.isDefault,
        provider: card.provider || "internal",
        color: card.color || "from-blue-600 via-blue-500 to-teal-500",
        createdAt: card.createdAt || card.$createdAt,
        updatedAt: card.updatedAt || card.$updatedAt,
      }));

      res.paginated(
        cards,
        {
          page: pageNum,
          limit: pageLimit,
          totalItems: cardList.total,
          totalPages: Math.ceil(cardList.total / pageLimit),
          stats: {
            active: activeResult.total,
            frozen: frozenResult.total,
          },
        },
        "Cards retrieved successfully",
      );
    } catch (error) {
      logger.error("Get admin cards failed", {
        adminId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Freeze or unfreeze a user's card (admin override — no ownership restriction).
   */
  async adminUpdateCardStatus(req, res) {
    try {
      const { cardId } = req.params;
      const { status } = req.body;

      if (!config.collections.cardsId) {
        return res
          .status(503)
          .json({ success: false, message: "Cards collection not configured" });
      }

      // Fetch the card — Appwrite throws a 404 AppwriteException if not found
      const card = await this.databases.getDocument(
        config.database.appwrite.databaseId,
        config.collections.cardsId,
        cardId,
      );

      // Idempotent — return early if already in desired state
      if (card.status === status) {
        return res.success(
          {
            id: card.$id,
            userId: card.userId,
            cardLast4: card.cardLast4,
            cardBrand: card.cardBrand,
            status: card.status,
            updatedAt: card.updatedAt || card.$updatedAt,
          },
          `Card is already ${status}`,
        );
      }

      const updatedCard = await this.databases.updateDocument(
        config.database.appwrite.databaseId,
        config.collections.cardsId,
        cardId,
        {
          status,
          updatedAt: new Date().toISOString(),
        },
      );

      const action =
        status === "frozen" ? "ADMIN_CARD_FROZEN" : "ADMIN_CARD_UNFROZEN";

      logger.audit(action, req.user?.id, {
        cardId,
        userId: card.userId,
        cardLast4: card.cardLast4,
        oldStatus: card.status,
        newStatus: status,
        ip: req.ip,
      });

      auditService.logAction({
        actorId: req.user?.id,
        actorRole: req.user?.role || "admin",
        action,
        entity: "card",
        entityId: cardId,
        metadata: {
          userId: card.userId,
          cardLast4: card.cardLast4,
          oldStatus: card.status,
          newStatus: status,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.success(
        {
          id: updatedCard.$id,
          userId: updatedCard.userId,
          cardLast4: updatedCard.cardLast4,
          cardBrand: updatedCard.cardBrand,
          status: updatedCard.status,
          updatedAt: updatedCard.updatedAt || updatedCard.$updatedAt,
        },
        `Card ${status === "frozen" ? "frozen" : "unfrozen"} successfully`,
      );
    } catch (error) {
      logger.error("Admin update card status failed", {
        adminId: req.user?.id,
        cardId: req.params.cardId,
        error: error.message,
      });
      throw error;
    }
  }
}

const adminControllerInstance = new AdminController();

// Bind all methods to the instance to preserve 'this' context
const boundMethods = {};
Object.getOwnPropertyNames(Object.getPrototypeOf(adminControllerInstance))
  .filter(
    (name) =>
      name !== "constructor" &&
      typeof adminControllerInstance[name] === "function",
  )
  .forEach((name) => {
    boundMethods[name] = adminControllerInstance[name].bind(
      adminControllerInstance,
    );
  });

module.exports = boundMethods;
