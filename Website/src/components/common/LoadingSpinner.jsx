/**
 * Loading Spinner Component
 * Simple loading spinner for authentication and other loading states
 */

import React from "react";

const LoadingSpinner = ({ className = "", size = "md" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
        role="status"
        aria-label="Loading..."
      />
    </div>
  );
};

export default LoadingSpinner;
