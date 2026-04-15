import axios from "axios";
import Cookies from "js-cookie";

// Create axios instance
const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "https://afra-pay-backend.onrender.com",
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("authToken") || localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Track if we're currently refreshing to prevent infinite loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for error handling and automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";

    // Skip refresh for auth endpoints to avoid infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !requestUrl.includes("/auth/me") &&
      !requestUrl.includes("/auth/refresh-token") &&
      !requestUrl.includes("/auth/login")
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const response = await api.post("/api/v1/auth/refresh-token", {
            refreshToken,
          });

          const { tokens } = response.data.data;
          const newAccessToken = tokens.accessToken;

          // Store new tokens
          Cookies.set("authToken", newAccessToken, { expires: 7 });
          localStorage.setItem("authToken", newAccessToken);
          if (tokens.refreshToken) {
            localStorage.setItem("refreshToken", tokens.refreshToken);
          }

          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Refresh failed — clear everything and redirect to login
          Cookies.remove("authToken");
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token stored — redirect to login
        Cookies.remove("authToken");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

// Authentication APIs
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post("/api/v1/auth/login", credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/api/v1/auth/logout");
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/api/v1/auth/me");
    return response.data;
  },
};

// Dashboard APIs - Connected to real backend endpoints
export const dashboardAPI = {
  // Dashboard Overview - Real data from backend
  getDashboard: async () => {
    const response = await api.get("/api/v1/admin/dashboard");
    return response.data;
  },

  // Analytics - Real aggregated data
  getAnalytics: async (params = {}) => {
    const response = await api.get("/api/v1/admin/analytics", { params });
    return response.data;
  },

  // System health
  getSystemHealth: async () => {
    const response = await api.get("/api/v1/admin/system/health");
    return response.data;
  },

  // Notifications
  getNotifications: async (params = {}) => {
    const response = await api.get("/api/v1/admin/notifications", { params });
    return response.data;
  },
};

// Notification APIs - Admin-targeted real-time notifications
export const notificationAPI = {
  getNotifications: async (params = {}) => {
    const response = await api.get("/api/v1/admin/notifications", { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/api/v1/admin/notifications", {
      params: { read: false, limit: 1 },
    });
    return response.data?.pagination?.unreadCount ?? 0;
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/api/v1/admin/notifications/${id}/read`);
    return response.data;
  },
};

// User Management APIs - Real user data
export const userAPI = {
  getUsers: async (params = {}) => {
    const response = await api.get("/api/v1/admin/users", { params });
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await api.get(`/api/v1/admin/users/${userId}`);
    return response.data;
  },

  updateUserStatus: async (userId, data) => {
    const response = await api.put(
      `/api/v1/admin/users/${userId}/status`,
      data,
    );
    return response.data;
  },

  updateUserVerification: async (userId, data) => {
    const response = await api.put(
      `/api/v1/admin/users/${userId}/verification`,
      data,
    );
    return response.data;
  },

  exportUsers: async (format = "csv") => {
    const response = await api.get(`/api/v1/admin/reports/users`, {
      params: { format },
      responseType: "blob",
    });
    return response;
  },
};

// Transaction Management APIs - Real transaction data
export const transactionAPI = {
  getTransactions: async (params = {}) => {
    const response = await api.get("/api/v1/admin/transactions", { params });
    return response.data;
  },

  getTransactionById: async (transactionId) => {
    const response = await api.get(
      `/api/v1/admin/transactions/${transactionId}`,
    );
    return response.data;
  },

  updateTransactionStatus: async (transactionId, data) => {
    const response = await api.put(
      `/api/v1/admin/transactions/${transactionId}`,
      data,
    );
    return response.data;
  },

  flagTransaction: async (transactionId, data) => {
    const response = await api.post(
      `/api/v1/admin/transactions/${transactionId}/flag`,
      data,
    );
    return response.data;
  },

  exportTransactions: async (format = "csv", params = {}) => {
    const response = await api.get(`/api/v1/admin/reports/transactions`, {
      params: { format, ...params },
      responseType: "blob",
    });
    return response;
  },
};

// Merchant Management APIs - Real merchant data
export const merchantAPI = {
  getMerchants: async (params = {}) => {
    const response = await api.get("/api/v1/admin/merchants", { params });
    return response.data;
  },

  getMerchantById: async (merchantId) => {
    const response = await api.get(`/api/v1/admin/merchants/${merchantId}`);
    return response.data;
  },

  /**
   * Approve a pending merchant — generates till + wallet.
   */
  approveMerchant: async (merchantId) => {
    const response = await api.patch(
      `/api/v1/admin/merchants/${merchantId}/approve`,
    );
    return response.data;
  },

  /**
   * Reject a pending merchant application.
   */
  rejectMerchant: async (merchantId, reason = "") => {
    const response = await api.patch(
      `/api/v1/admin/merchants/${merchantId}/reject`,
      { reason },
    );
    return response.data;
  },

  updateMerchantStatus: async (merchantId, data) => {
    const response = await api.put(
      `/api/v1/admin/merchants/${merchantId}/status`,
      data,
    );
    return response.data;
  },

  getTills: async (params = {}) => {
    const response = await api.get("/api/v1/admin/tills", { params });
    return response.data;
  },

  /**
   * Get analytics for a specific merchant.
   */
  getMerchantAnalytics: async (merchantId, params = {}) => {
    const response = await api.get(
      `/api/v1/admin/merchants/${merchantId}/analytics`,
      { params },
    );
    return response.data;
  },
};

// Card Management APIs - Real card data
export const cardAPI = {
  getCards: async (params = {}) => {
    const response = await api.get("/api/v1/admin/cards", { params });
    return response.data;
  },

  updateCardStatus: async (cardId, data) => {
    const response = await api.put(
      `/api/v1/admin/cards/${cardId}/status`,
      data,
    );
    return response.data;
  },
};

// Education Content APIs - Real education data
export const educationAPI = {
  // ── Content ──────────────────────────────────────────────────────────────
  getContent: async (params = {}) => {
    const response = await api.get("/api/v1/education/content", { params });
    return response.data;
  },
  getContentById: async (contentId) => {
    const response = await api.get(`/api/v1/education/content/${contentId}`);
    return response.data;
  },
  createContent: async (data) => {
    const response = await api.post("/api/v1/education/content", data);
    return response.data;
  },
  updateContent: async (contentId, data) => {
    const response = await api.put(
      `/api/v1/education/content/${contentId}`,
      data,
    );
    return response.data;
  },
  deleteContent: async (contentId) => {
    const response = await api.delete(`/api/v1/education/content/${contentId}`);
    return response.data;
  },
  publishContent: async (contentId) => {
    const response = await api.post(
      `/api/v1/education/content/${contentId}/publish`,
    );
    return response.data;
  },
  unpublishContent: async (contentId) => {
    const response = await api.post(
      `/api/v1/education/content/${contentId}/unpublish`,
    );
    return response.data;
  },
  // ── Categories ────────────────────────────────────────────────────────────
  getCategories: async () => {
    const response = await api.get("/api/v1/education/categories");
    return response.data;
  },
  createCategory: async (data) => {
    const response = await api.post("/api/v1/education/categories", data);
    return response.data;
  },
  updateCategory: async (categoryId, data) => {
    const response = await api.put(
      `/api/v1/education/categories/${categoryId}`,
      data,
    );
    return response.data;
  },
  // ── Learning Paths ────────────────────────────────────────────────────────
  getPaths: async (params = {}) => {
    const response = await api.get("/api/v1/education/paths", { params });
    return response.data;
  },
  createPath: async (data) => {
    const response = await api.post("/api/v1/education/paths", data);
    return response.data;
  },
  updatePath: async (pathId, data) => {
    const response = await api.put(`/api/v1/education/paths/${pathId}`, data);
    return response.data;
  },
  deletePath: async (pathId) => {
    const response = await api.delete(`/api/v1/education/paths/${pathId}`);
    return response.data;
  },
  publishPath: async (pathId) => {
    const response = await api.put(`/api/v1/education/paths/${pathId}`, {
      status: "published",
    });
    return response.data;
  },
  // ── Admin Stats ───────────────────────────────────────────────────────────
  getAdminStats: async () => {
    const response = await api.get("/api/v1/education/admin/stats");
    return response.data;
  },
};

// Reports API - Real report generation
export const reportsAPI = {
  generateReport: async (type, params = {}) => {
    const response = await api.get(`/api/v1/admin/reports/${type}`, {
      params,
      responseType: "blob",
    });
    return response;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get("/api/v1/admin/audit-logs", { params });
    return response.data;
  },
};

// Audit Logs API
export const auditAPI = {
  getLogs: async (params = {}) => {
    const response = await api.get("/api/v1/admin/audit-logs", { params });
    return response.data;
  },
};

// Payout Administration API
export const payoutAPI = {
  /**
   * List all payouts with optional filters.
   * @param {Object} params - page, limit, status, merchantId, method
   */
  getPayouts: async (params = {}) => {
    const response = await api.get("/api/v1/admin/payouts", { params });
    return response.data;
  },

  /**
   * Admin manually processes a pending/pending_review payout.
   */
  processPayout: async (payoutId) => {
    const response = await api.patch(
      `/api/v1/admin/payouts/${payoutId}/process`,
    );
    return response.data;
  },

  /**
   * Admin manually fails a payout and restores merchant wallet.
   */
  failPayout: async (payoutId, reason = "") => {
    const response = await api.patch(`/api/v1/admin/payouts/${payoutId}/fail`, {
      reason,
    });
    return response.data;
  },
};

// Fraud Monitoring API
export const fraudAPI = {
  getFlags: async (params = {}) => {
    const response = await api.get("/api/v1/admin/fraud-flags", { params });
    return response.data;
  },

  updateFlag: async (flagId, data) => {
    const response = await api.put(`/api/v1/admin/fraud-flags/${flagId}`, data);
    return response.data;
  },
};

// Subscription Administration API
export const subscriptionAdminAPI = {
  // Plan management
  getPlans: async (params = {}) => {
    const response = await api.get("/api/v1/subscriptions/admin/plans", {
      params,
    });
    return response.data;
  },

  createPlan: async (data) => {
    const response = await api.post("/api/v1/subscriptions/admin/plans", data);
    return response.data;
  },

  updatePlan: async (planId, data) => {
    const response = await api.put(
      `/api/v1/subscriptions/admin/plans/${planId}`,
      data,
    );
    return response.data;
  },

  // Subscription viewer
  getSubscriptions: async (params = {}) => {
    const response = await api.get("/api/v1/subscriptions/admin/list", {
      params,
    });
    return response.data;
  },

  // Dashboard stats
  getStats: async () => {
    const response = await api.get("/api/v1/subscriptions/admin/stats");
    return response.data;
  },

  // Billing attempt history
  getBillingHistory: async (params = {}) => {
    const response = await api.get(
      "/api/v1/subscriptions/admin/billing-history",
      { params },
    );
    return response.data;
  },

  // Trigger an immediate billing run (admin only)
  runBilling: async () => {
    const response = await api.post("/api/v1/subscriptions/admin/run-billing");
    return response.data;
  },
};

// ── Admin BI Analytics API ─────────────────────────────────────────────────
// Connected to the new /api/v1/admin/analytics/* endpoints powered by
// analyticsService.js. All data is computed from real Appwrite collections.
export const analyticsAPI = {
  /**
   * Platform-wide KPI snapshot.
   * @param {Object} params  period | startDate | endDate | currency
   */
  getOverview: async (params = {}) => {
    const response = await api.get("/api/v1/admin/analytics/overview", {
      params,
    });
    return response.data;
  },

  /**
   * Revenue over time + breakdown by payment source.
   * @param {Object} params  period | startDate | endDate | granularity | currency
   */
  getRevenue: async (params = {}) => {
    const response = await api.get("/api/v1/admin/analytics/revenue", {
      params,
    });
    return response.data;
  },

  /**
   * Transaction volume, status distribution, payment-method mix.
   * @param {Object} params  period | startDate | endDate | granularity | currency | type
   */
  getTransactions: async (params = {}) => {
    const response = await api.get("/api/v1/admin/analytics/transactions", {
      params,
    });
    return response.data;
  },

  /**
   * User retention cohort analysis (grouped by first-transaction month).
   * @param {Object} params  months (1-12)
   */
  getCohorts: async (params = {}) => {
    const response = await api.get("/api/v1/admin/analytics/cohorts", {
      params,
    });
    return response.data;
  },

  /**
   * 30-day revenue forecast via linear regression on the last 90 days.
   * @param {Object} params  currency
   */
  getForecast: async (params = {}) => {
    const response = await api.get("/api/v1/admin/analytics/forecast", {
      params,
    });
    return response.data;
  },
};

export default api;
