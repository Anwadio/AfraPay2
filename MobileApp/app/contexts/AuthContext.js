/**
 * Authentication Context
 * Global authentication state management with Appwrite integration
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import appwriteService from "../services/appwrite";
import { isSessionValid, getCurrentUser, logout } from "../utils/auth";
import toast from "react-hot-toast";

const AuthContext = createContext({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  register: () => Promise.resolve(),
  updateUser: () => Promise.resolve(),
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

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check if session is valid
      const sessionValid = await isSessionValid();

      if (sessionValid) {
        // Get current user
        const currentUser = await getCurrentUser();

        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);

          // Try to get additional user profile data
          try {
            const userProfile = await appwriteService.getUserProfile(
              currentUser.$id,
            );
            setUser((prev) => ({ ...prev, profile: userProfile }));
          } catch (profileError) {
            // Profile might not exist yet, that's okay
            console.log(
              "User profile not found, will be created on first update",
            );
          }
        }
      } else {
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

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);

      // Login with Appwrite
      const session = await appwriteService.login(credentials);

      // Get user data
      const user = await appwriteService.getCurrentUser();

      if (user) {
        setUser(user);
        setIsAuthenticated(true);

        // Get user profile if exists
        try {
          const userProfile = await appwriteService.getUserProfile(user.$id);
          setUser((prev) => ({ ...prev, profile: userProfile }));
        } catch (error) {
          // Profile doesn't exist yet
          console.log("User profile not found");
        }

        toast.success("Successfully logged in!");
        return { user, session };
      }
    } catch (error) {
      console.error("Login failed:", error);
      let errorMessage = "Login failed. Please try again.";

      if (error.code === 401) {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 429) {
        errorMessage = "Too many login attempts. Please try again later.";
      }

      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);

      // Create account with Appwrite
      const account = await appwriteService.createAccount(userData);

      // Login immediately after registration
      const session = await appwriteService.login({
        email: userData.email,
        password: userData.password,
      });

      // Get user data
      const user = await appwriteService.getCurrentUser();

      if (user) {
        // Create user profile document
        const profileData = {
          userId: user.$id,
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          phone: userData.phone || "",
          dateOfBirth: userData.dateOfBirth || null,
          country: userData.country || "",
          kycLevel: 0,
          kycStatus: "pending",
          accountStatus: "active",
          emailVerified: user.emailVerification,
          phoneVerified: user.phoneVerification,
          mfaEnabled: true,
          preferredMfaMethod: "sms",
          failedLoginAttempts: 0,
          riskScore: 0.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          const profile = await appwriteService.createUserProfile(
            user.$id,
            profileData,
          );
          setUser({ ...user, profile });
        } catch (profileError) {
          console.error("Profile creation failed:", profileError);
          // Continue without profile for now
          setUser(user);
        }

        setIsAuthenticated(true);
        toast.success(
          "Account created successfully! Please verify your email.",
        );
        return { user, session, account };
      }
    } catch (error) {
      console.error("Registration failed:", error);
      let errorMessage = "Registration failed. Please try again.";

      if (error.code === 409) {
        errorMessage = "An account with this email already exists.";
      } else if (error.type === "user_password_mismatch") {
        errorMessage = "Password must be at least 8 characters long.";
      }

      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear state even if logout fails
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user function
  const updateUser = useCallback(
    async (updateData) => {
      try {
        if (!user) return;

        setIsLoading(true);

        // Update user preferences in Appwrite
        if (updateData.prefs) {
          await appwriteService.updatePreferences(updateData.prefs);
        }

        // Update user profile if profile data is provided
        if (updateData.profile) {
          const updatedProfile = await appwriteService.updateUserProfile(
            user.$id,
            { ...updateData.profile, updatedAt: new Date().toISOString() },
          );

          setUser((prev) => ({
            ...prev,
            profile: updatedProfile,
          }));
        }

        // Refresh user data
        const updatedUser = await appwriteService.getCurrentUser();
        setUser((prev) => ({ ...prev, ...updatedUser }));

        toast.success("Profile updated successfully!");
        return updatedUser;
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

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "appwrite_session" && !e.newValue) {
        // Session was cleared in another tab
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout: handleLogout,
    register,
    updateUser,
    initializeAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
