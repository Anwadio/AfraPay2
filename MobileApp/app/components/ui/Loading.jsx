import React from "react";
import { cn } from "../../utils";

/**
 * Loading Spinner Component
 * Enhanced with smooth animations and multiple variants
 */
const Spinner = ({ size = "md", variant = "default", className, ...props }) => {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const variantClasses = {
    default: "border-gray-300 border-t-primary-600",
    primary: "border-primary-200 border-t-primary-600",
    white: "border-gray-100 border-t-white",
  };

  return (
    <div
      className={cn(
        "inline-block border-2 border-solid rounded-full animate-spin",
        "transition-all duration-200 ease-in-out",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * LoadingDots Component
 * Enhanced with staggered animations and better accessibility
 */
const LoadingDots = ({ size = "md", className, ...props }) => {
  const sizeClasses = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  };

  return (
    <div
      className={cn("flex items-center space-x-1", className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <div
        className={cn(
          "bg-current rounded-full animate-bounce",
          sizeClasses[size]
        )}
        style={{
          animationDelay: "0ms",
          animationDuration: "1.4s",
        }}
      />
      <div
        className={cn(
          "bg-current rounded-full animate-bounce",
          sizeClasses[size]
        )}
        style={{
          animationDelay: "160ms",
          animationDuration: "1.4s",
        }}
      />
      <div
        className={cn(
          "bg-current rounded-full animate-bounce",
          sizeClasses[size]
        )}
        style={{
          animationDelay: "320ms",
          animationDuration: "1.4s",
        }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * LoadingBar Component
 * Enhanced with smooth progress animations
 */
const LoadingBar = ({
  progress = 0,
  className,
  showPercentage = false,
  variant = "primary",
  ...props
}) => {
  const variantClasses = {
    primary: "bg-primary-500",
    secondary: "bg-gray-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  };

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin="0"
      aria-valuemax="100"
      {...props}
    >
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700 transition-opacity duration-200">
            {progress}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-500 ease-out",
            "relative overflow-hidden",
            variantClasses[variant]
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
};

/**
 * SkeletonLoader Component
 * Enhanced with wave animation and better accessibility
 */
const SkeletonLoader = ({
  lines = 1,
  className,
  variant = "default",
  ...props
}) => {
  const variantClasses = {
    default: "bg-gray-200",
    light: "bg-gray-100",
    card: "bg-white border border-gray-200",
  };

  return (
    <div
      className={cn("animate-pulse", className)}
      role="status"
      aria-label="Loading content"
      {...props}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "rounded h-4 relative overflow-hidden",
            variantClasses[variant],
            index !== lines - 1 && "mb-2",
            index === lines - 1 && lines > 1 && "w-3/4" // Last line shorter
          )}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
        </div>
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
};

/**
 * CardSkeleton Component
 */
const CardSkeleton = ({
  showAvatar = false,
  lines = 3,
  className,
  ...props
}) => {
  return (
    <div className={cn("card animate-pulse", className)} {...props}>
      <div className="card-content">
        <div className="flex items-center space-x-4">
          {showAvatar && (
            <div className="w-12 h-12 bg-neutral-200 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-3/4" />
            <div className="h-3 bg-neutral-200 rounded w-1/2" />
          </div>
        </div>
        {lines > 0 && (
          <div className="mt-4 space-y-2">
            {Array.from({ length: lines }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-4 bg-neutral-200 rounded",
                  index === lines - 1 ? "w-2/3" : "w-full"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * TableSkeleton Component
 */
const TableSkeleton = ({ rows = 5, cols = 4, className, ...props }) => {
  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Header */}
      <div
        className="grid gap-4 p-4 border-b border-neutral-200 bg-neutral-50"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, index) => (
          <div
            key={index}
            className="h-4 bg-neutral-200 rounded animate-pulse"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 p-4 border-b border-neutral-100"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-neutral-200 rounded animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * LoadingOverlay Component
 */
const LoadingOverlay = ({
  show = false,
  message = "Loading...",
  className,
  children,
  ...props
}) => {
  if (!show) return children;

  return (
    <div className={cn("relative", className)} {...props}>
      {children}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          {message && (
            <p className="text-sm text-neutral-600 font-medium">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * FullScreenLoader Component
 */
const FullScreenLoader = ({
  show = false,
  message = "Loading...",
  ...props
}) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-[9999]"
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        {message && (
          <p className="text-lg text-neutral-700 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export {
  Spinner,
  LoadingDots,
  LoadingBar,
  SkeletonLoader,
  CardSkeleton,
  TableSkeleton,
  LoadingOverlay,
  FullScreenLoader,
};
