/**
 * Public Route Component
 * Wraps routes that should only be accessible to unauthenticated users
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
