/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/**
 * @deprecated This file is deprecated. Use ./auth.js instead.
 *
 * This file now redirects to the new auth service that communicates with backend API
 * instead of using Appwrite directly from the frontend.
 */

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";
import authService from "./auth.js";

// Initialize Appwrite Client
export const client = new Client()
  .setEndpoint(
    process.env.REACT_APP_APPWRITE_ENDPOINT || "http://localhost:8080/v1",
  )
  .setProject(process.env.REACT_APP_APPWRITE_PROJECT_ID || "afrapay");

// Initialize Appwrite Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

class AppwriteService {
  constructor() {
    this.account = account;
    this.databases = databases;
    this.storage = storage;
  }

  // Authentication Methods

  /**
   * Create new user account
   */
  async createAccount({ email, password, name, phone }) {
    try {
      const userAccount = await this.account.create(
        ID.unique(),
        email,
        password,
        name,
      );

      // Send email verification
      await this.sendEmailVerification();

      return userAccount;
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
      const session = await this.account.createEmailSession(email, password);

      // Store session info in localStorage
      localStorage.setItem("appwrite_session", session.$id);
      localStorage.setItem("loginTime", Date.now().toString());

      return session;
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
      return await this.account.get();
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
      await this.account.deleteSession("current");

      // Clear local storage
      localStorage.removeItem("appwrite_session");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");

      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification() {
    try {
      const verification = await this.account.createVerification(
        `${window.location.origin}/auth/verify`,
      );
      return verification;
    } catch (error) {
      console.error("Send email verification failed:", error);
      throw error;
    }
  }

  /**
   * Verify email with secret
   */
  async verifyEmail(userId, secret) {
    try {
      return await this.account.updateVerification(userId, secret);
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
      return await this.account.createRecovery(
        email,
        `${window.location.origin}/auth/reset-password`,
      );
    } catch (error) {
      console.error("Send password recovery failed:", error);
      throw error;
    }
  }

  /**
   * Reset password with secret
   */
  async resetPassword({ userId, secret, password, confirmPassword }) {
    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      return await this.account.updateRecovery(
        userId,
        secret,
        password,
        confirmPassword,
      );
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    }
  }

  /**
   * Update user preferences/labels
   */
  async updatePreferences(prefs) {
    try {
      return await this.account.updatePrefs(prefs);
    } catch (error) {
      console.error("Update preferences failed:", error);
      throw error;
    }
  }

  /**
   * Create phone session (SMS OTP)
   */
  async createPhoneSession(phone) {
    try {
      return await this.account.createPhoneSession(ID.unique(), phone);
    } catch (error) {
      console.error("Create phone session failed:", error);
      throw error;
    }
  }

  /**
   * Complete phone session with OTP
   */
  async confirmPhoneSession(userId, otp) {
    try {
      const session = await this.account.updatePhoneSession(userId, otp);

      // Store session info
      localStorage.setItem("appwrite_session", session.$id);
      localStorage.setItem("loginTime", Date.now().toString());

      return session;
    } catch (error) {
      console.error("Phone session confirmation failed:", error);
      throw error;
    }
  }

  // Database Methods

  /**
   * Create user profile document
   */
  async createUserProfile(userId, data) {
    try {
      return await this.databases.createDocument(
        process.env.REACT_APP_APPWRITE_DATABASE_ID || "afrapay-db",
        process.env.REACT_APP_APPWRITE_USERS_COLLECTION_ID || "users",
        userId,
        data,
      );
    } catch (error) {
      console.error("Create user profile failed:", error);
      throw error;
    }
  }

  /**
   * Get user profile document
   */
  async getUserProfile(userId) {
    try {
      return await this.databases.getDocument(
        process.env.REACT_APP_APPWRITE_DATABASE_ID || "afrapay-db",
        process.env.REACT_APP_APPWRITE_USERS_COLLECTION_ID || "users",
        userId,
      );
    } catch (error) {
      console.error("Get user profile failed:", error);
      throw error;
    }
  }

  /**
   * Update user profile document
   */
  async updateUserProfile(userId, data) {
    try {
      return await this.databases.updateDocument(
        process.env.REACT_APP_APPWRITE_DATABASE_ID || "afrapay-db",
        process.env.REACT_APP_APPWRITE_USERS_COLLECTION_ID || "users",
        userId,
        data,
      );
    } catch (error) {
      console.error("Update user profile failed:", error);
      throw error;
    }
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(userId, limit = 50, offset = 0) {
    try {
      return await this.databases.listDocuments(
        process.env.REACT_APP_APPWRITE_DATABASE_ID || "afrapay-db",
        process.env.REACT_APP_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
          "transactions",
        [
          Query.equal("userId", userId),
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc("$createdAt"),
        ],
      );
    } catch (error) {
      console.error("Get user transactions failed:", error);
      throw error;
    }
  }

  // File Storage Methods

  /**
   * Upload file to storage
   */
  async uploadFile(file, bucketId = "documents") {
    try {
      return await this.storage.createFile(bucketId, ID.unique(), file);
    } catch (error) {
      console.error("File upload failed:", error);
      throw error;
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(bucketId, fileId) {
    return this.storage.getFileView(bucketId, fileId);
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucketId, fileId) {
    try {
      return await this.storage.deleteFile(bucketId, fileId);
    } catch (error) {
      console.error("File deletion failed:", error);
      throw error;
    }
  }

  // Session Management

  /**
   * Check if user has valid session
   */
  async isAuthenticated() {
    try {
      await this.account.get();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all active sessions
   */
  async getSessions() {
    try {
      return await this.account.listSessions();
    } catch (error) {
      console.error("Get sessions failed:", error);
      throw error;
    }
  }

  /**
   * Delete specific session
   */
  async deleteSession(sessionId) {
    try {
      return await this.account.deleteSession(sessionId);
    } catch (error) {
      console.error("Delete session failed:", error);
      throw error;
    }
  }

  /**
   * Delete all sessions except current
   */
  async deleteOtherSessions() {
    try {
      return await this.account.deleteSessions();
    } catch (error) {
      console.error("Delete other sessions failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const appwriteService = authService;
export default authService;
