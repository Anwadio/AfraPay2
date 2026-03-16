import React from "react";
import { cn } from "../../utils";

/**
 * Badge variants with enhanced color system and animations
 */
const badgeVariants = {
  primary: "bg-blue-50 text-blue-800 border-blue-200 ring-blue-600/20",
  secondary: "bg-gray-50 text-gray-700 border-gray-200 ring-gray-600/20",
  success: "bg-green-50 text-green-800 border-green-200 ring-green-600/20",
  warning: "bg-amber-50 text-amber-800 border-amber-200 ring-amber-600/20",
  error: "bg-red-50 text-red-800 border-red-200 ring-red-600/20",
  info: "bg-cyan-50 text-cyan-800 border-cyan-200 ring-cyan-600/20",
  outline:
    "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 ring-gray-600/20",
  solid: {
    primary: "bg-blue-600 text-white border-blue-600 ring-blue-600/20",
    secondary: "bg-gray-600 text-white border-gray-600 ring-gray-600/20",
    success: "bg-green-600 text-white border-green-600 ring-green-600/20",
    warning: "bg-amber-600 text-white border-amber-600 ring-amber-600/20",
    error: "bg-red-600 text-white border-red-600 ring-red-600/20",
    info: "bg-cyan-600 text-white border-cyan-600 ring-cyan-600/20",
  },
};

/**
 * Badge Component
 * Small status indicators and labels with micro-animations
 */
const Badge = React.forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "md",
      solid = false,
      children,
      interactive = false,
      pulse = false,
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-0.5 text-xs",
      lg: "px-3 py-1 text-sm",
    };

    const getVariantClass = () => {
      if (solid && badgeVariants.solid[variant]) {
        return badgeVariants.solid[variant];
      }
      return badgeVariants[variant] || badgeVariants.primary;
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-semibold border",
          "transition-all duration-200 ease-in-out",
          "transform-gpu", // Use GPU acceleration
          interactive && [
            "cursor-pointer",
            "hover:scale-105 active:scale-95",
            "hover:shadow-sm hover:ring-2",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
          ],
          pulse && "animate-pulse",
          sizes[size],
          getVariantClass(),
          className
        )}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

/**
 * StatusBadge Component
 * Badge with animated status dot indicator
 */
const StatusBadge = ({
  status = "pending",
  children,
  className,
  showDot = true,
  animated = true,
  ...props
}) => {
  const getStatusVariant = () => {
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
      case "success":
        return "success";
      case "pending":
      case "processing":
        return "warning";
      case "failed":
      case "error":
      case "cancelled":
        return "error";
      case "inactive":
      case "draft":
        return "secondary";
      default:
        return "primary";
    }
  };

  const getStatusDotColor = () => {
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
      case "success":
        return "bg-green-500";
      case "pending":
      case "processing":
        return "bg-yellow-500";
      case "failed":
      case "error":
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const shouldPulse =
    animated && (status === "pending" || status === "processing");

  return (
    <Badge
      variant={getStatusVariant()}
      className={cn("flex items-center gap-1.5", className)}
      pulse={shouldPulse}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-200",
            getStatusDotColor(),
            shouldPulse && "animate-ping"
          )}
        />
      )}
      {children || status}
    </Badge>
  );
};

/**
 * CountBadge Component
 * Badge for displaying counts/numbers
 */
const CountBadge = ({
  count,
  max = 99,
  showZero = false,
  className,
  ...props
}) => {
  // Don't show badge if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  // Show max+ if count exceeds maximum
  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge
      variant="error"
      className={cn(
        "min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-xs font-medium",
        className
      )}
      {...props}
    >
      {displayCount}
    </Badge>
  );
};

/**
 * PriorityBadge Component
 * Badge for priority levels
 */
const PriorityBadge = ({ priority = "medium", className, ...props }) => {
  const getPriorityVariant = () => {
    switch (priority.toLowerCase()) {
      case "high":
      case "urgent":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <Badge
      variant={getPriorityVariant()}
      className={cn("uppercase tracking-wide", className)}
      {...props}
    >
      {priority}
    </Badge>
  );
};

export { Badge, StatusBadge, CountBadge, PriorityBadge, badgeVariants };
