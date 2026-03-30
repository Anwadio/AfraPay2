import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure base URL — update for production or use env variable
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://172.16.12.241:5000/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from storage on every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 by clearing tokens and throwing
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["accessToken", "user"]);
    }
    return Promise.reject(error);
  },
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) =>
    api.post("/auth/reset-password", { token, password }),
  changePassword: (currentPassword, newPassword) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  resendVerificationEmail: (email) =>
    api.post("/auth/resend-verification-email", { email }),
  enable2FA: () => api.post("/auth/enable-2fa"),
  verify2FA: (code) => api.post("/auth/verify-2fa", { code }),
  disable2FA: (code, password) =>
    api.post("/auth/disable-2fa", { code, password }),
  verifyMFA: (code, token) => api.post("/auth/verify-mfa", { code, token }),
  googleOAuth: (credential) => api.post("/auth/google", { credential }),
  facebookOAuth: (accessToken, userID) =>
    api.post("/auth/facebook", { accessToken, userID }),
};

// ─── User / Profile ──────────────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get("/profile"),
  updateProfile: (data) => api.put("/profile", data),
  uploadProfilePicture: (formData) =>
    api.post("/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getSessions: () => api.get("/profile/sessions"),
  revokeSession: (id) => api.delete(`/profile/sessions/${id}`),
  revokeAllSessions: () => api.delete("/profile/sessions"),
  getSecuritySettings: () => api.get("/profile/security"),
  updateSecuritySettings: (data) => api.put("/profile/security", data),
  deleteAccount: (password, confirmation) =>
    api.delete("/users/account", { data: { password, confirmation } }),
  updatePushToken: (expoPushToken) =>
    api.patch("/profile/push-token", { expoPushToken: expoPushToken ?? null }),
};

// ─── Wallet / Payments ───────────────────────────────────────────────────────
export const walletAPI = {
  getBalances: () => api.get("/payments/wallet/balance"),
  deposit: (data) => api.post("/payments/wallet/deposit", data),
  withdraw: (data) => api.post("/payments/wallet/withdraw", data),
  transfer: (data) => api.post("/payments/wallet/transfer", data),
  chargeCard: (data) => api.post("/payments/charge-card", data),
};

export const paymentAPI = {
  sendMoney: (data, idempotencyKey) =>
    api.post("/payments/send", data, {
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    }),
  getSendMoneyStatus: (transactionId) =>
    api.get(`/payments/send/${transactionId}/status`),
  getRecentTransfers: (limit = 5) =>
    api.get("/payments/recent", { params: { limit } }),
  getExchangeRates: (params) => api.get("/payments/exchange-rates", { params }),
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionAPI = {
  getTransactions: (params) => api.get("/transactions", { params }),
  getTransactionDetails: (id) => api.get(`/transactions/${id}`),
  getSummary: (params) =>
    api.get("/transactions/analytics/summary", { params }),
  exportTransactions: (format, params) =>
    api.get("/transactions/export", {
      params: { format, ...params },
      responseType: "blob",
    }),
};

// ─── Cards ────────────────────────────────────────────────────────────────────
export const cardAPI = {
  getCards: () => api.get("/cards"),
  addCard: (data) => api.post("/cards", data),
  deleteCard: (id) => api.delete(`/cards/${id}`),
  setDefaultCard: (id) => api.patch(`/cards/${id}/default`),
  updateCardStatus: (id, status) =>
    api.patch(`/cards/${id}/status`, { status }),
  updateCard: (id, data) => api.patch(`/cards/${id}`, data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getNotifications: (params) => api.get("/notifications", { params }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/mark-all-read"),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: (params) => api.get("/analytics/dashboard", { params }),
};

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptionAPI = {
  getPlans: () => api.get("/subscriptions/plans"),
  subscribe: (data) => api.post("/subscriptions/subscribe", data),
  getMySubscriptions: () => api.get("/subscriptions"),
  getSubscription: (id) => api.get(`/subscriptions/${id}`),
  cancelSubscription: (id) => api.post(`/subscriptions/${id}/cancel`),
  pauseSubscription: (id) => api.post(`/subscriptions/${id}/pause`),
  resumeSubscription: (id) => api.post(`/subscriptions/${id}/resume`),
};

// ─── Merchants ────────────────────────────────────────────────────────────────
export const merchantAPI = {
  register: (data) => api.post("/merchants/register", data),
  getMyMerchant: () => api.get("/merchants/me"),
  getAnalytics: (params) => api.get("/merchants/analytics", { params }),
  getWalletBalance: () => api.get("/merchants/wallet-balance"),
  requestPayout: (data) => api.post("/merchants/payout", data),
  getPayouts: () => api.get("/merchants/payouts"),
};

// ─── Education ────────────────────────────────────────────────────────────────
export const educationAPI = {
  getCategories: () => api.get("/education/categories"),
  getContent: (params) => api.get("/education/content", { params }),
  getFeaturedContent: () => api.get("/education/content/featured"),
  getContentById: (id) => api.get(`/education/content/${id}`),
  getLearningPaths: () => api.get("/education/paths"),
  // Backend route: GET /api/v1/education/my-content (user's enrolled content)
  getEnrollments: () => api.get("/education/my-content"),
  enrollInContent: (id) => api.post(`/education/content/${id}/enroll`),
  unenrollFromContent: (id) => api.delete(`/education/content/${id}/enroll`),
  markContentComplete: (id) => api.post(`/education/content/${id}/complete`),
  likeContent: (id) => api.post(`/education/content/${id}/like`),
};

// ─── Chat / AI Assistant ──────────────────────────────────────────────────────
export const chatAPI = {
  createSession: () => api.post("/chat/session"),
  getMessages: (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (sessionId, message) =>
    api.post(`/chat/sessions/${sessionId}/messages`, { message }),
  getActiveSessions: () => api.get("/chat/sessions"),
  endSession: (sessionId) => api.post(`/chat/sessions/${sessionId}/end`),
};

// ─── Support ──────────────────────────────────────────────────────────────────
export const supportAPI = {
  getFaqs: (params) => api.get("/support/faqs", { params }),
  getSystemStatus: () => api.get("/support/system-status"),
  createTicket: (data) => api.post("/support/tickets", data),
  getTickets: (params) => api.get("/support/tickets", { params }),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  addMessage: (id, message) =>
    api.post(`/support/tickets/${id}/messages`, { message }),
};

export default api;
