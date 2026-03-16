/**
 * Public Route Component
 * Wraps routes that should only be accessible to unauthenticated users
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't redirect while auth is still initializing
  if (isLoading) return null;

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
