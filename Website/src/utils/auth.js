/**
 * Authentication utilities
 * Helper functions for authentication state management via backend JWT API.
 */

import { authAPI } from "../services/api";
import toast from "react-hot-toast";

/**
 * Logout user and clear all authentication data
 */
export const logout = async () => {
  try {
    await authAPI.logout();
  } catch (error) {
    // silence — tokens are httpOnly cookies cleared server-side
  } finally {
    // Clear only non-sensitive metadata (tokens are never in localStorage)
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("sessionId");
    sessionStorage.clear();

    // Show logout message
    toast.success("Successfully logged out");

    // Redirect to login page
    window.location.href = "/auth/login";
  }
};

// Access token is an httpOnly cookie — not readable from JS.
// This always returns true when a user profile is cached (soft check only).
// For a hard check call authAPI.me() which will 401 if the cookie expired.
export const isSessionValid = () => {
  return !!localStorage.getItem("user");
};

/**
 * Get current authenticated user from localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (_) {
    return null;
  }
};

/**
 * Get user permissions from stored user data
 */
export const getUserPermissions = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.permissions || [];
};

/**
 * Check if user has specific role
 */
export const hasRole = (role) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.role === role;
};

/**
 * Get user's KYC level
 */
export const getKYCLevel = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.kycLevel || 0;
};
