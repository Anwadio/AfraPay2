import React from "react";
import { cn } from "../../utils";

/**
 * Card Component
 * Reusable card container with header, content, and footer sections
 * Enhanced with hover animations and micro-interactions
 */
const Card = React.forwardRef(
  (
    {
      className,
      children,
      hoverable = false,
      interactive = false,
      variant = "default",
      size = "md",
      ...props
    },
    ref,
  ) => {
    const variants = {
      default: "bg-white border-primary-100 shadow-sm",
      elevated: "bg-white border-primary-200 shadow-md",
      outlined: "bg-white border-2 border-primary-200 shadow-none",
      filled:
        "bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-100 shadow-sm",
    };

    /* const sizes = {
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
      xl: "p-10",
    }; */

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border transition-all duration-200 ease-in-out",
          variants[variant],
          hoverable && [
            "hover:shadow-lg hover:-translate-y-1",
            "hover:border-gray-300",
          ],
          interactive && [
            "cursor-pointer",
            "active:transform-none active:shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          ],
          className,
        )}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

/**
 * CardHeader Component
 * Enhanced with consistent spacing and typography
 */
const CardHeader = React.forwardRef(
  ({ className, children, size = "md", ...props }, ref) => {
    const sizes = {
      sm: "p-4 pb-2",
      md: "p-6 pb-4",
      lg: "p-8 pb-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "space-y-2",
          "transition-colors duration-200",
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardHeader.displayName = "CardHeader";

/**
 * CardTitle Component
 * Enhanced with text animations
 */
const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold text-gray-900 leading-tight",
        "transition-colors duration-200",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = "CardTitle";

/**
 * CardDescription Component
 * Enhanced with smooth text transitions
 */
const CardDescription = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-sm text-gray-600 mt-1",
          "transition-colors duration-200",
          className,
        )}
        {...props}
      >
        {children}
      </p>
    );
  },
);

CardDescription.displayName = "CardDescription";

/**
 * CardContent Component
 * Enhanced with consistent spacing system
 */
const CardContent = React.forwardRef(
  ({ className, children, size = "md", ...props }, ref) => {
    const sizes = {
      sm: "px-4 py-2",
      md: "px-6 py-4",
      lg: "px-8 py-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "space-y-4",
          "transition-all duration-200 ease-in-out",
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardContent.displayName = "CardContent";

/**
 * CardFooter Component
 * Enhanced with consistent spacing and borders
 */
const CardFooter = React.forwardRef(
  ({ className, children, size = "md", bordered = true, ...props }, ref) => {
    const sizes = {
      sm: "p-4 pt-3",
      md: "p-6 pt-4",
      lg: "p-8 pt-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between",
          bordered && "border-t border-gray-200",
          "transition-colors duration-200",
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = "CardFooter";

/**
 * StatsCard Component
 * Specialized card for displaying statistics
 */
const StatsCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
  ...props
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-success-600";
      case "negative":
        return "text-error-600";
      default:
        return "text-neutral-600";
    }
  };

  const getChangeIcon = () => {
    if (changeType === "positive") return "↗";
    if (changeType === "negative") return "↙";
    return "";
  };

  return (
    <Card className={cn("", className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            <p className="text-2xl font-bold text-neutral-900 currency">
              {value}
            </p>
            {change && (
              <p
                className={cn(
                  "text-sm flex items-center gap-1",
                  getChangeColor(),
                )}
              >
                <span>{getChangeIcon()}</span>
                {change}
              </p>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatsCard,
};
