/**
 * Fallback Route Component
 * Handles redirects based on authentication status
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const FallbackRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't redirect while auth is still initializing
  if (isLoading) return null;

  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/" replace />
  );
};

export default FallbackRoute;
