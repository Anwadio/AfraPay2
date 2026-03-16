/**
 * useAuth Hook
 * Custom hook for authentication operations
 */

import { useState } from "react";
import { useAuth as useAuthContext } from "../contexts/AuthContext";
import appwriteService from "../services/appwrite";
import toast from "react-hot-toast";

export const useAuth = () => {
  return useAuthContext();
};

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    try {
      return await login(credentials);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { login: handleLogin, isLoading };
};

export const useRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async (userData) => {
    setIsLoading(true);
    try {
      return await register(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { register: handleRegister, isLoading };
};

export const useLogout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return { logout: handleLogout, isLoading };
};

export const usePasswordReset = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendResetEmail = async (email) => {
    setIsLoading(true);
    try {
      await appwriteService.sendPasswordRecovery(email);
      toast.success("Password reset email sent successfully!");
      return true;
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to send reset email. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (resetData) => {
    setIsLoading(true);
    try {
      await appwriteService.resetPassword(resetData);
      toast.success("Password reset successfully!");
      return true;
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Password reset failed. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendResetEmail, resetPassword, isLoading };
};

export const useEmailVerification = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendVerification = async () => {
    setIsLoading(true);
    try {
      await appwriteService.sendEmailVerification();
      toast.success("Verification email sent successfully!");
      return true;
    } catch (error) {
      console.error("Email verification error:", error);
      toast.error("Failed to send verification email.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (userId, secret) => {
    setIsLoading(true);
    try {
      await appwriteService.verifyEmail(userId, secret);
      toast.success("Email verified successfully!");
      return true;
    } catch (error) {
      console.error("Email verification error:", error);
      toast.error("Email verification failed.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendVerification, verifyEmail, isLoading };
};

export default useAuth;
