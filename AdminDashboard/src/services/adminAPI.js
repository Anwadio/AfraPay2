import axios from "axios";
import Cookies from "js-cookie";

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
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
  getContent: async (params = {}) => {
    const response = await api.get("/api/v1/admin/education/content", {
      params,
    });
    return response.data;
  },

  createContent: async (data) => {
    const response = await api.post("/api/v1/admin/education/content", data);
    return response.data;
  },

  updateContent: async (contentId, data) => {
    const response = await api.put(
      `/api/v1/admin/education/content/${contentId}`,
      data,
    );
    return response.data;
  },

  deleteContent: async (contentId) => {
    const response = await api.delete(
      `/api/v1/admin/education/content/${contentId}`,
    );
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get("/api/v1/admin/education/categories");
    return response.data;
  },

  createCategory: async (data) => {
    const response = await api.post("/api/v1/admin/education/categories", data);
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

export default api;
