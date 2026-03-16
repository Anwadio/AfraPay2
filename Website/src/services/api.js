/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/**
 * API Service
 * Centralized HTTP client for backend communication
 */

import axios from "axios";
import toast from "react-hot-toast";

// Create axios instance with default configuration
const api = axios.create({
  baseURL: "https://afra-pay-backend.onrender.com/api/v1",
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies for session management
});

// Request interceptor
// NOTE: We intentionally do NOT add an Authorization header here.
// The backend sets httpOnly cookies (accessToken, refreshToken) on login.
// withCredentials:true (above) ensures those cookies are sent automatically
// on every request — no localStorage token storage needed.
// Storing JWTs in localStorage exposes them to XSS attacks.
api.interceptors.request.use(
  (config) => {
    // Add device fingerprint if available (non-sensitive — used for anomaly detection)
    const deviceFingerprint = localStorage.getItem("deviceFingerprint");
    if (deviceFingerprint) {
      config.headers["X-Device-Fingerprint"] = deviceFingerprint;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common responses and errors
api.interceptors.response.use(
  (response) => {
    // Return the data portion of successful responses
    return response.data;
  },
  async (error) => {
    const { response, config } = error;

    // Handle different HTTP status codes
    if (response) {
      const { status, data } = response;

      switch (status) {
        case 400:
          toast.error(data.error?.message || "Bad request");
          break;
        case 401:
          // For auth endpoints, let the caller/AuthContext handle the error
          if (
            config.url?.includes("/auth/login") ||
            config.url?.includes("/auth/register") ||
            config.url?.includes("/auth/me") ||
            config.url?.includes("/auth/refresh-token")
          ) {
            break; // Just reject — prevents infinite reload loop
          }
          // For other protected endpoints, attempt a silent token refresh.
          // The refresh token is in an httpOnly cookie — just call the endpoint
          // with credentials and the browser will send it automatically.
          if (!config._retry) {
            config._retry = true;
            try {
              await axios.post(
                `${process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api/v1"}/auth/refresh-token`,
                {},
                { withCredentials: true },
              );
              // Retry the original request — cookies now contain a fresh access token
              return api(config);
            } catch (refreshError) {
              // Refresh failed — clear non-sensitive local state.
              // ProtectedRoute will redirect to /auth/login via <Navigate> without a full page reload.
              localStorage.removeItem("user");
              localStorage.removeItem("sessionId");
              localStorage.removeItem("loginTime");
            }
          }
          break;
        case 403:
          // Let the login page handle EMAIL_NOT_VERIFIED itself (shows a resend prompt)
          if (
            config.url?.includes("/auth/login") &&
            data?.error?.code === "EMAIL_NOT_VERIFIED"
          ) {
            break;
          }
          toast.error("Access forbidden");
          break;
        case 404:
          toast.error("Resource not found");
          break;
        case 429:
          toast.error("Too many requests. Please try again later.");
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          toast.error("Server error. Please try again later.");
          break;
        default:
          toast.error(data.error?.message || "An unexpected error occurred");
      }
    } else if (error.code === "ECONNABORTED") {
      toast.error("Request timeout. Please check your connection.");
    } else if (error.code === "ERR_NETWORK") {
      toast.error("Network error. Please check your connection.");
    } else {
      toast.error("An unexpected error occurred");
    }

    return Promise.reject(error);
  },
);

// Authentication API calls
export const authAPI = {
  // User registration
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response;
  },

  // User login
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);

    // Store tokens and user data
    if (response.success && response.data) {
      const { tokens, user, session } = response.data;

      // NOTE: tokens are purposely NOT stored in localStorage.
      // The backend sets them as httpOnly cookies; withCredentials:true ensures
      // they are sent on every subsequent request automatically.

      // Store non-sensitive user profile metadata for UI display
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      // Store session metadata (non-secret)
      if (session) {
        localStorage.setItem("sessionId", session.id);
        localStorage.setItem("loginTime", Date.now().toString());
      }
    }

    return response;
  },

  // User logout
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // Clear only non-sensitive local state (tokens live in httpOnly cookies)
      localStorage.removeItem("user");
      localStorage.removeItem("sessionId");
      localStorage.removeItem("loginTime");
    }
  },

  // Refresh access token (cookie-based — no body required)
  refreshToken: async () => {
    const response = await api.post("/auth/refresh-token");
    return response;
  },

  // Verify email — GET request with token as path param (matches backend route)
  verifyEmail: async (token) => {
    const response = await api.get(
      `/auth/verify-email/${encodeURIComponent(token)}`,
    );
    return response;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response;
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    const response = await api.post("/auth/reset-password", {
      token,
      password: newPassword,
    });
    return response;
  },

  // Get current user
  me: async () => {
    const response = await api.get("/auth/me");
    return response;
  },

  // Resend verification email — public, no auth required
  resendVerificationEmail: async (email) => {
    const response = await api.post("/auth/resend-verification-email", {
      email,
    });
    return response;
  },

  // MFA verification
  verifyMFA: async (mfaCode, mfaToken) => {
    const response = await api.post("/auth/verify-mfa", {
      mfaCode,
      mfaToken,
    });
    // Tokens arrive as httpOnly cookies — nothing to store in localStorage
    return response;
  },

  // Facebook OAuth — send FB access token + userID, receive JWT cookies + user profile
  // mfaCode is optional; only needed when the first call returned mfaRequired:true
  facebookLogin: async (accessToken, userID, mfaCode) => {
    const response = await api.post("/auth/facebook", {
      accessToken,
      userID,
      ...(mfaCode ? { mfaCode } : {}),
    });
    if (response.success && response.data?.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
      if (response.data.session) {
        localStorage.setItem("sessionId", response.data.session.id);
        localStorage.setItem("loginTime", Date.now().toString());
      }
    }
    return response;
  },

  // Google OAuth — send Google ID token (credential), receive JWT cookies + user profile
  // mfaCode is optional; only needed when the first call returned mfaRequired:true
  googleLogin: async (credential, mfaCode) => {
    const response = await api.post("/auth/google", {
      credential,
      ...(mfaCode ? { mfaCode } : {}),
    });
    if (response.success && response.data?.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
      if (response.data.session) {
        localStorage.setItem("sessionId", response.data.session.id);
        localStorage.setItem("loginTime", Date.now().toString());
      }
    }
    return response;
  },

  // Change password (authenticated)
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response;
  },

  // 2FA / TOTP — initiate setup, returns QR code data URL + base32 secret
  enable2FA: async () => {
    const response = await api.post("/auth/enable-2fa");
    return response;
  },

  // Confirm 2FA setup with first valid TOTP code, or re-verify if already active
  verify2FA: async (code) => {
    const response = await api.post("/auth/verify-2fa", { code });
    return response;
  },

  // Disable 2FA — requires current TOTP code + account password
  disable2FA: async (code, password) => {
    const response = await api.post("/auth/disable-2fa", { code, password });
    return response;
  },
};

// User API calls
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get("/profile");
    return response;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put("/profile", profileData);
    return response;
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append("profilePicture", file);

    const response = await api.post("/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  },

  // Delete account — requires password + exact string "DELETE_MY_ACCOUNT"
  deleteAccount: async (password, confirmation) => {
    const response = await api.delete("/users/account", {
      data: { password, confirmation },
    });
    return response;
  },
};

// Support API calls
export const supportAPI = {
  getFaqs: async (params = {}) => {
    const response = await api.get("/support/faqs", { params });
    return response;
  },
  getSystemStatus: async () => {
    const response = await api.get("/support/system-status");
    return response;
  },
  createTicket: async (data) => {
    const response = await api.post("/support/tickets", data);
    return response;
  },
  getTickets: async (params = {}) => {
    const response = await api.get("/support/tickets", { params });
    return response;
  },
  getTicket: async (id) => {
    const response = await api.get(`/support/tickets/${id}`);
    return response;
  },
  addMessage: async (id, message) => {
    const response = await api.post(`/support/tickets/${id}/messages`, {
      message,
    });
    return response;
  },
};

// Payment API calls
export const paymentAPI = {
  /**
   * Send money via M-Pesa, MTN MoMo, or internal wallet.
   *
   * @param {Object} paymentData  { amount, currency, provider, receiverPhone, description? }
   * @param {string} idempotencyKey  UUID v4 — prevents duplicate charges on retry
   */
  sendMoney: async (paymentData, idempotencyKey) => {
    const response = await api.post("/payments/send", paymentData, {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    });
    return response;
  },

  /**
   * Poll the status of an async send-money transaction (M-Pesa / MTN).
   */
  getSendMoneyStatus: async (transactionId) => {
    const response = await api.get(
      `/payments/send/${encodeURIComponent(transactionId)}/status`,
    );
    return response;
  },

  // Send payment (legacy — kept for backward compatibility)
  sendPayment: async (paymentData) => {
    const response = await api.post("/payments/send", paymentData);
    return response;
  },

  // Get payment history
  getPayments: async (params = {}) => {
    const response = await api.get("/payments", { params });
    return response;
  },

  // Get payment details
  getPaymentDetails: async (paymentId) => {
    const response = await api.get(`/payments/${paymentId}`);
    return response;
  },
};

// Wallet API calls
export const walletAPI = {
  // Get wallet balances for all currencies
  getBalances: async () => {
    const response = await api.get("/payments/wallet/balance");
    return response;
  },

  // Transfer funds to another user
  transfer: async (data) => {
    const response = await api.post("/payments/wallet/transfer", data);
    return response;
  },

  // Withdraw to external account
  withdraw: async (data) => {
    const response = await api.post("/payments/wallet/withdraw", data);
    return response;
  },

  // Deposit to wallet
  deposit: async (data) => {
    const response = await api.post("/payments/wallet/deposit", data);
    return response;
  },
};

// Transaction API calls
export const transactionAPI = {
  // Get transaction history
  getTransactions: async (params = {}) => {
    const response = await api.get("/transactions", { params });
    return response;
  },

  // Get transaction details
  getTransactionDetails: async (transactionId) => {
    const response = await api.get(`/transactions/${transactionId}`);
    return response;
  },

  // Get financial summary (income, expenses, balance) for a period
  getSummary: async (params = {}) => {
    const response = await api.get("/transactions/analytics/summary", {
      params,
    });
    return response;
  },

  // Export transactions
  exportTransactions: async (format = "csv", params = {}) => {
    const response = await api.get("/transactions/export", {
      params: { format, ...params },
      responseType: "blob",
    });
    return response;
  },
};

// Notifications API calls
export const notificationsAPI = {
  // Get paginated notifications (+ unreadCount in response)
  getNotifications: async (params = {}) => {
    const response = await api.get("/notifications", { params });
    return response;
  },

  // Lightweight badge count only
  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return response;
  },

  // Mark a single notification as read
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.patch("/notifications/mark-all-read");
    return response;
  },

  // Delete a notification
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response;
  },
};

// Access token lives in an httpOnly cookie — not readable from JS.
// Use cached user profile as a soft indicator; verify via /auth/me for certainty.
export const isAuthenticated = () => {
  return !!localStorage.getItem("user");
};

// Utility function to get current user from storage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
};

export default api;
