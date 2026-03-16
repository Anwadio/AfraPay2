/* eslint-disable no-console */
/**
 * Authentication Context
 * Global authentication state management backed by the Express/JWT API.
 * All Appwrite calls have been removed - the backend handles them.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { authAPI, userAPI } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  register: () => Promise.resolve(),
  updateUser: () => Promise.resolve(),
  setAuthFromBackend: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // NOTE: We intentionally do NOT read JWTs from localStorage here.
  // Tokens live in httpOnly cookies set by the backend.
  // We call /auth/me on every app load to verify the cookie is still valid.
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      // Optimistically show cached profile while the network call is in-flight
      // (avoids UI flash; gets replaced by the server-verified value below)
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
          setIsAuthenticated(true);
        } catch (_) {}
      }

      // Always verify auth via cookie — /auth/me returns 401 if the cookie is
      // missing, expired, or the access token was blacklisted
      try {
        const res = await authAPI.me();
        if (res.success && res.data) {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("user");
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (_) {
        // 401 / network error — treat as unauthenticated
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuthFromBackend = useCallback((userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);
      if (response.success && response.data) {
        const { user: userData } = response.data;
        // NOTE: tokens are httpOnly cookies — not stored in localStorage
        localStorage.setItem("loginTime", Date.now().toString());
        if (userData) {
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          setIsAuthenticated(true);
        }
        toast.success("Successfully logged in!");
        return response.data;
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      if (response.success) {
        toast.success(
          "Account created successfully! Please verify your email.",
        );
        return response.data;
      }
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      try {
        await authAPI.logout();
      } catch (_) {}
      // Tokens are httpOnly cookies cleared by the server on logout
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("sessionId");
      setUser(null);
      setIsAuthenticated(false);
      toast.success("Successfully logged out");
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout failed:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(
    async (updateData) => {
      try {
        if (!user) return;
        setIsLoading(true);
        const response = await userAPI.updateProfile(updateData);
        if (response.success) {
          const fresh = { ...user, ...updateData };
          localStorage.setItem("user", JSON.stringify(fresh));
          setUser(fresh);
          toast.success("Profile updated successfully!");
          return fresh;
        }
      } catch (error) {
        console.error("Update user failed:", error);
        toast.error("Failed to update profile. Please try again.");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Sync logout across tabs: if the "user" key is removed in another tab
    // (e.g. the user logged out there), clear auth state here too
    const handleStorageChange = (e) => {
      if (e.key === "user" && !e.newValue) {
        setUser(null);
        setIsAuthenticated(false);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      login,
      logout: handleLogout,
      register,
      updateUser,
      initializeAuth,
      setAuthFromBackend,
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      login,
      handleLogout,
      register,
      updateUser,
      initializeAuth,
      setAuthFromBackend,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
