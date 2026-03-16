/**
 * Admin Controller
 * Handles administrative functions and system management
 */

const { Client, Users, Databases, ID } = require('node-appwrite');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { getDatabaseHealth } = require('../database/connection');
const { NotFoundError } = require('../middleware/monitoring/errorHandler');

// Initialize Appwrite clients
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const users = new Users(client);
const databases = new Databases(client);

class AdminController {
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
        lastUpdated: new Date().toISOString()
      };

      res.success(dashboardData, 'Dashboard data retrieved successfully');

    } catch (error) {
      logger.error('Get dashboard failed', {
        adminId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get system analytics
   */
  async getAnalytics(req, res) {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      
      const dateRange = this.calculateDateRange(period, startDate, endDate);
      
      const analytics = {
        users: await this.getUserAnalytics(dateRange),
        transactions: await this.getTransactionAnalytics(dateRange),
        revenue: await this.getRevenueAnalytics(dateRange),
        performance: await this.getPerformanceMetrics(dateRange)
      };

      res.success(analytics, 'Analytics retrieved successfully');

    } catch (error) {
      logger.error('Get analytics failed', {
        adminId: req.user?.id,
        error: error.message
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
        search 
      } = req.query;

      const queries = [];
      if (status) queries.push(`labels.accountStatus=${status}`);
      if (verified !== undefined) queries.push(`emailVerification=${verified}`);
      if (role) queries.push(`labels.role=${role}`);
      if (search) {
        // Search in email and name
        queries.push(`email=${search}`);
      }

      const userList = await users.list(
        queries,
        search ? `${search}*` : undefined,
        parseInt(limit),
        (parseInt(page) - 1) * parseInt(limit),
        '$createdAt',
        'DESC'
      );

      const userData = userList.users.map(user => ({
        id: user.$id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.labels?.role || 'user',
        status: user.labels?.accountStatus || 'active',
        kycLevel: parseInt(user.labels?.kycLevel || '0'),
        emailVerified: user.emailVerification,
        phoneVerified: user.phoneVerification,
        createdAt: user.$createdAt,
        lastLogin: user.labels?.lastLogin,
        country: user.labels?.country
      }));

      const totalPages = Math.ceil(userList.total / parseInt(limit));

      res.paginated(userData, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: userList.total,
        totalPages
      }, 'Users retrieved successfully');

    } catch (error) {
      logger.error('Get users failed', {
        adminId: req.user?.id,
        error: error.message
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

      const user = await users.get(userId);
      
      // Get user's transactions summary
      const transactionSummary = await this.getUserTransactionSummary(userId);
      
      // Get user's documents
      const documents = await databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.documentsId,
        [`userId=${userId}`]
      );

      const userDetails = {
        id: user.$id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        firstName: user.labels?.firstName,
        lastName: user.labels?.lastName,
        country: user.labels?.country,
        dateOfBirth: user.labels?.dateOfBirth,
        role: user.labels?.role || 'user',
        status: user.labels?.accountStatus || 'active',
        kycLevel: parseInt(user.labels?.kycLevel || '0'),
        emailVerified: user.emailVerification,
        phoneVerified: user.phoneVerification,
        mfaEnabled: user.labels?.mfaEnabled === 'true',
        createdAt: user.$createdAt,
        updatedAt: user.$updatedAt,
        lastLogin: user.labels?.lastLogin,
        lastLoginIP: user.labels?.lastLoginIP,
        registrationIP: user.labels?.registrationIP,
        transactionSummary,
        documents: documents.documents.map(doc => ({
          id: doc.$id,
          type: doc.type,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
          reviewedAt: doc.reviewedAt
        })),
        preferences: {
          notifications: user.labels?.notificationPreferences ? 
            JSON.parse(user.labels.notificationPreferences) : {},
          privacy: user.labels?.privacySettings ? 
            JSON.parse(user.labels.privacySettings) : {},
          security: user.labels?.securitySettings ? 
            JSON.parse(user.labels.securitySettings) : {}
        }
      };

      res.success(userDetails, 'User details retrieved successfully');

    } catch (error) {
      logger.error('Get user details failed', {
        adminId: req.user?.id,
        userId: req.params.userId,
        error: error.message
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

      const user = await users.get(userId);
      
      // Update user status
      await users.updateLabels(userId, {
        accountStatus: status,
        statusReason: reason || '',
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date().toISOString()
      });

      logger.audit('USER_STATUS_UPDATED', req.user.id, {
        targetUserId: userId,
        oldStatus: user.labels?.accountStatus,
        newStatus: status,
        reason,
        ip: req.ip
      });

      res.success({
        userId,
        status,
        updatedAt: new Date().toISOString()
      }, 'User status updated successfully');

    } catch (error) {
      logger.error('Update user status failed', {
        adminId: req.user?.id,
        userId: req.params.userId,
        error: error.message
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

      const user = await users.get(userId);
      const currentKYCLevel = parseInt(user.labels?.kycLevel || '0');
      
      const updateLabels = {
        verificationReviewedBy: req.user.id,
        verificationReviewedAt: new Date().toISOString(),
        verificationNotes: notes || ''
      };

      if (verified) {
        updateLabels.kycLevel = verificationLevel === 'enhanced' ? '2' : 
                               verificationLevel === 'premium' ? '3' : '1';
        updateLabels.verificationStatus = 'verified';
        
        // Update email verification if not already verified
        if (!user.emailVerification) {
          await users.updateEmailVerification(userId, true);
        }
      } else {
        updateLabels.verificationStatus = 'rejected';
      }

      await users.updateLabels(userId, updateLabels);

      logger.audit('USER_VERIFICATION_UPDATED', req.user.id, {
        targetUserId: userId,
        oldKYCLevel: currentKYCLevel,
        newKYCLevel: updateLabels.kycLevel || currentKYCLevel,
        verified,
        verificationLevel,
        notes,
        ip: req.ip
      });

      res.success({
        userId,
        verified,
        kycLevel: parseInt(updateLabels.kycLevel || currentKYCLevel),
        updatedAt: new Date().toISOString()
      }, 'User verification updated successfully');

    } catch (error) {
      logger.error('Update user verification failed', {
        adminId: req.user?.id,
        userId: req.params.userId,
        error: error.message
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
          cryptocurrency: false
        },
        limits: {
          dailyTransactionLimit: 10000,
          monthlyTransactionLimit: 100000,
          maxTransactionAmount: 50000,
          minTransactionAmount: 1
        },
        fees: {
          transferFeePercentage: 1.5,
          withdrawalFeeFixed: 2.50,
          currencyConversionFee: 2.0,
          internationalTransferFee: 5.0
        },
        maintenance: {
          enabled: false,
          message: '',
          scheduledStart: null,
          scheduledEnd: null
        },
        security: {
          passwordMinLength: 8,
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          lockoutDuration: 1800
        }
      };

      res.success(settings, 'System settings retrieved successfully');

    } catch (error) {
      logger.error('Get system settings failed', {
        adminId: req.user?.id,
        error: error.message
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
      const dateRange = this.calculateDateRange('custom', startDate, endDate);
      const userData = await this.getUserReportData(dateRange.start, dateRange.end);
      
      let reportData;
      switch (format) {
        case 'csv':
          reportData = this.generateUserCSVReport(userData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=users-report.csv');
          break;
        case 'pdf':
          reportData = await this.generateUserPDFReport(userData);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=users-report.pdf');
          break;
        case 'xlsx':
          reportData = this.generateUserXLSXReport(userData);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=users-report.xlsx');
          break;
        default:
          throw new ValidationError('Unsupported report format');
      }

      logger.audit('USER_REPORT_GENERATED', req.user.id, {
        format,
        startDate,
        endDate,
        recordCount: userData.length,
        ip: req.ip
      });

      res.send(reportData);

    } catch (error) {
      logger.error('Generate user report failed', {
        adminId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods

  async getSystemStats() {
    // TODO: Get actual system statistics from database
    return {
      totalUsers: 15420,
      activeUsers: 12750,
      newUsersToday: 45,
      totalTransactions: 89340,
      transactionsToday: 234,
      totalVolume: 2450000.00,
      volumeToday: 45600.00,
      systemUptime: process.uptime()
    };
  }

  async getRecentActivity() {
    // TODO: Get recent system activity from audit logs
    return [
      {
        id: '1',
        type: 'USER_REGISTRATION',
        description: 'New user registered',
        user: 'john.doe@example.com',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        type: 'LARGE_TRANSACTION',
        description: 'Large transaction detected',
        amount: 25000,
        timestamp: new Date(Date.now() - 300000).toISOString()
      }
    ];
  }

  async getSystemAlerts() {
    // TODO: Get system alerts and warnings
    return [
      {
        id: '1',
        type: 'warning',
        title: 'High Transaction Volume',
        message: 'Transaction volume is 150% above average',
        timestamp: new Date().toISOString()
      }
    ];
  }

  async getUserAnalytics(dateRange) {
    // TODO: Calculate actual user analytics
    return {
      totalUsers: 15420,
      newUsers: 342,
      activeUsers: 12750,
      verifiedUsers: 8960,
      usersByCountry: {
        'Nigeria': 4500,
        'Ghana': 3200,
        'Kenya': 2800,
        'South Africa': 2100,
        'Others': 2820
      },
      usersByKYCLevel: {
        'Level 0': 6460,
        'Level 1': 5230,
        'Level 2': 2890,
        'Level 3': 840
      }
    };
  }

  async getTransactionAnalytics(dateRange) {
    // TODO: Calculate actual transaction analytics
    return {
      totalTransactions: 89340,
      totalVolume: 2450000.00,
      averageTransactionSize: 27.43,
      transactionsByType: {
        transfers: 45230,
        payments: 32100,
        withdrawals: 8900,
        deposits: 3110
      },
      transactionsByCurrency: {
        'USD': 1225000.00,
        'EUR': 612500.00,
        'GBP': 367500.00,
        'NGN': 122500000.00,
        'Others': 122500.00
      }
    };
  }

  calculateDateRange(period, startDate, endDate) {
    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    const now = new Date();
    let start;

    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end: now };
  }

  generateUserCSVReport(userData) {
    // TODO: Generate actual CSV report
    let csv = 'ID,Email,Name,Status,KYC Level,Created At,Last Login\n';
    userData.forEach(user => {
      csv += `${user.id},${user.email},"${user.name}",${user.status},${user.kycLevel},${user.createdAt},${user.lastLogin || 'Never'}\n`;
    });
    return csv;
  }
}

module.exports = new AdminController();