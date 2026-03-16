/**
 * Protected Route Component
 * Wraps routes that require authentication
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../common/LoadingSpinner";

const ProtectedRoute = ({
  children,
  requiredKYCLevel = 0,
  requiredPermissions = [],
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check KYC level requirement
  const userKYCLevel = user.profile?.kycLevel || 0;
  if (requiredKYCLevel > userKYCLevel) {
    return (
      <Navigate
        to="/kyc/verification"
        state={{
          requiredLevel: requiredKYCLevel,
          currentLevel: userKYCLevel,
          from: location,
        }}
        replace
      />
    );
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const userPermissions = user.prefs?.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasRequiredPermissions) {
      return (
        <Navigate
          to="/unauthorized"
          state={{
            requiredPermissions,
            userPermissions,
            from: location,
          }}
          replace
        />
      );
    }
  }

  // Check if email verification is required for certain routes
  if (!user.emailVerification && location.pathname.startsWith("/dashboard")) {
    return (
      <Navigate to="/auth/verify-email" state={{ from: location }} replace />
    );
  }

  return children;
};

export default ProtectedRoute;
