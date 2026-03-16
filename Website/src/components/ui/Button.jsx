import React, { useCallback, useState } from "react";
import { cn } from "../../utils";
import { useTranslation } from "../../utils/accessibility";

/**
 * Button variants and sizes with enhanced animations
 */
const buttonVariants = {
  primary:
    "bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 active:from-primary-800 active:to-secondary-800 text-white focus:ring-primary-500 focus:ring-2 focus:ring-offset-2 hover:shadow-lg active:shadow-md transform hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 focus:ring-gray-500 focus:ring-2 focus:ring-offset-2 hover:shadow-md active:shadow-sm transform hover:-translate-y-0.5 active:translate-y-0",
  outline:
    "border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 focus:ring-primary-500 focus:ring-2 focus:ring-offset-2 hover:shadow-md active:shadow-sm hover:border-gray-400 transform hover:-translate-y-0.5 active:translate-y-0",
  ghost:
    "bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 focus:ring-gray-500 focus:ring-2 focus:ring-offset-2 transform hover:scale-105 active:scale-95",
  destructive:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-500 focus:ring-2 focus:ring-offset-2 hover:shadow-lg active:shadow-md transform hover:-translate-y-0.5 active:translate-y-0",
};

const buttonSizes = {
  xs: "px-2.5 py-1.5 text-xs min-h-[32px] font-medium",
  sm: "px-3 py-2 text-sm min-h-[36px] font-medium",
  md: "px-4 py-2.5 text-sm min-h-[44px] font-semibold",
  lg: "px-6 py-3 text-base min-h-[48px] font-semibold",
  xl: "px-8 py-4 text-lg min-h-[52px] font-bold",
};

/**
 * Accessible Button Component
 * Reusable button component with WCAG compliance features
 */
const Button = React.forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      children,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedby,
      "aria-pressed": ariaPressed,
      type = "button",
      onClick,
      ...props
    },
    ref,
  ) => {
    // Safely use translation with error handling
    let t;
    try {
      const translation = useTranslation();
      t = translation.t;
    } catch (error) {
      // Fallback if translation hook fails
      t = (key) => (key === "common.loading" ? "Loading..." : key);
    }

    // Generate accessible loading state description with fallback
    const loadingText = loading ? t("common.loading") || "Loading..." : "";
    const buttonAriaLabel =
      loading && ariaLabel ? `${ariaLabel} - ${loadingText}` : ariaLabel;

    const [ripples, setRipples] = useState([]);
    const handleClick = useCallback(
      (e) => {
        if (disabled || loading) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setRipples((prev) => [...prev, { id, x, y }]);
        setTimeout(
          () => setRipples((prev) => prev.filter((r) => r.id !== id)),
          600,
        );
        if (onClick) onClick(e);
      },
      [disabled, loading, onClick],
    );

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium",
          "transition-all duration-200 ease-in-out",
          "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          "disabled:transform-none disabled:shadow-none",
          "relative overflow-hidden",
          "min-w-[44px]",
          "tracking-wide",
          buttonVariants[variant],
          buttonSizes[size],
          loading && "cursor-wait animate-pulse",
          className,
        )}
        disabled={disabled || loading}
        aria-label={buttonAriaLabel}
        aria-describedby={ariaDescribedby}
        aria-pressed={ariaPressed}
        aria-disabled={disabled || loading}
        {...props}
        onClick={handleClick}
      >
        {/* CSS ripple effects */}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/30 pointer-events-none animate-ping"
            style={{
              left: r.x - 16,
              top: r.y - 16,
              width: 32,
              height: 32,
              animationDuration: "0.5s",
              animationIterationCount: 1,
            }}
          />
        ))}
        {loading && (
          <svg
            className="w-4 h-4 mr-2 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
            <title>{loadingText}</title>
          </svg>
        )}
        <span className={loading ? "sr-only sm:not-sr-only" : ""}>
          {children}
        </span>
        {loading && (
          <span className="sr-only" aria-live="polite">
            {loadingText}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants, buttonSizes };
