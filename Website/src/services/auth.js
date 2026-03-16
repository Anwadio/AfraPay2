/* eslint-disable no-console */
/**
 * Auth API Service
 * Frontend service for authentication through backend API
 * No longer uses Appwrite directly - all calls go through backend
 */

import api from "./api.js";

class AuthService {
  constructor() {
    this.baseURL =
      process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api/v1";
  }

  // Authentication Methods

  /**
   * Create new user account
   */
  async createAccount({
    email,
    password,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    country,
  }) {
    try {
      const response = await api.post("/auth/register", {
        email,
        password,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        country,
      });

      return response;
    } catch (error) {
      console.error("Account creation failed:", error);
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  async login({ email, password }) {
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      // NOTE: tokens are httpOnly cookies set by the backend — not stored in localStorage
      if (response.success && response.data) {
        if (response.data.user)
          localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("loginTime", Date.now().toString());
      }

      return response;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  /**
   * Get current user account
   */
  async getCurrentUser() {
    try {
      const response = await api.get("/auth/me");
      return response;
    } catch (error) {
      console.error("Get current user failed:", error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // continue — server clears the httpOnly cookie; we still clear local state
    } finally {
      // Tokens are httpOnly cookies cleared by the server
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
    }
    return { success: true };
  }

  /**
   * Send email verification
   */
  async sendEmailVerification() {
    try {
      const response = await api.post("/auth/verify-email/send");
      return response;
    } catch (error) {
      console.error("Send email verification failed:", error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    try {
      const response = await api.post("/auth/verify-email/confirm", {
        token,
      });
      return response;
    } catch (error) {
      console.error("Email verification failed:", error);
      throw error;
    }
  }

  /**
   * Send password recovery email
   */
  async sendPasswordRecovery(email) {
    try {
      const response = await api.post("/auth/forgot-password", {
        email,
      });
      return response;
    } catch (error) {
      console.error("Send password recovery failed:", error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword({ token, password, confirmPassword }) {
    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const response = await api.post("/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      return response;
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put("/auth/profile", profileData);

      // Update stored user data
      if (response.success && response.data?.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      return response;
    } catch (error) {
      console.error("Update profile failed:", error);
      throw error;
    }
  }

  /**
   * Create phone verification (SMS OTP)
   */
  async createPhoneVerification(phone) {
    try {
      const response = await api.post("/auth/phone/send-otp", {
        phone,
      });
      return response;
    } catch (error) {
      console.error("Create phone verification failed:", error);
      throw error;
    }
  }

  /**
   * Verify phone with OTP
   */
  async verifyPhone({ phone, otp }) {
    try {
      const response = await api.post("/auth/phone/verify", {
        phone,
        otp,
      });
      return response;
    } catch (error) {
      console.error("Phone verification failed:", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    try {
      const response = await api.post("/auth/refresh");

      // Token arrives as an httpOnly cookie — nothing to store in localStorage
      return response;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  }

  /**
   * Get authentication status
   */
  isAuthenticated() {
    // Access token is an httpOnly cookie — not readable from JS.
    // Use user profile presence in localStorage as a soft indicator.
    // Always verify server-side via authAPI.me() for protected routes.
    return !!localStorage.getItem("user");
  }

  /**
   * Get stored user data
   */
  getStoredUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Get stored access token
   */
  // Access token is an httpOnly cookie — cannot be read from JS (by design).
  // Included for API compatibility; returns null.
  getAccessToken() {
    return null;
  }
}

// Create and export service instance
const authService = new AuthService();
export default authService;
