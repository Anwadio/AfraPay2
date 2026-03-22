import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import { authAPI } from "../services/adminAPI";
import toast from "react-hot-toast";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Read user synchronously from localStorage (used as useState lazy initializer)
function getStoredUser() {
  try {
    const token = Cookies.get("authToken") || localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (e) {
    // ignore parse errors
  }
  return null;
}

export const AuthProvider = ({ children }) => {
  // Initialize synchronously from localStorage — no race condition on refresh
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(false);

  // Background token validation on mount (non-blocking)
  useEffect(() => {
    const token = Cookies.get("authToken") || localStorage.getItem("authToken");
    if (!token) return;

    authAPI
      .getCurrentUser()
      .then((currentUser) => {
        if (currentUser.success && currentUser.data) {
          setUser(currentUser.data);
          localStorage.setItem("user", JSON.stringify(currentUser.data));
        }
      })
      .catch((error) => {
        // Silent fail — token refresh interceptor handles expired tokens
        console.log("Background token validation:", error.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authAPI.login(credentials);

      if (response.success && response.data) {
        const { user: userData, tokens } = response.data;
        const accessToken = tokens.accessToken;

        // Verify user has admin role
        if (userData.role !== "admin" && userData.role !== "super_admin") {
          throw new Error("Unauthorized: Admin access required");
        }

        // Store auth data
        Cookies.set("authToken", accessToken, { expires: 7 }); // 7 days
        localStorage.setItem("authToken", accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem("refreshToken", tokens.refreshToken);
        }
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);

        toast.success("Login successful");
        return { success: true, user: userData };
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login failed:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Login failed";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthData();
      toast.success("Logged out successfully");
    }
  };

  const clearAuthData = () => {
    Cookies.remove("authToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const isAdmin = () => {
    return user && (user.role === "admin" || user.role === "super_admin");
  };

  const isSuperAdmin = () => {
    return user && user.role === "super_admin";
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    isSuperAdmin,
    clearAuthData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
