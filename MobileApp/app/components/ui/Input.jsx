import React from "react";
import { cn } from "../../utils";

/**
 * Accessible Input Component
 * Reusable input component with WCAG compliance features
 */
const Input = React.forwardRef(
  (
    {
      className,
      type = "text",
      error = false,
      success = false,
      disabled = false,
      id,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedby,
      "aria-required": ariaRequired,
      "aria-invalid": ariaInvalid,
      required,
      ...props
    },
    ref,
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <input
        id={inputId}
        type={type}
        ref={ref}
        className={cn(
          "w-full px-4 py-3 border rounded-lg shadow-sm",
          "text-base sm:text-sm", // Responsive text sizing
          "transition-all duration-200 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          "hover:border-gray-400 hover:shadow-md",
          "placeholder:text-gray-400 placeholder:transition-opacity placeholder:duration-200",
          "focus:placeholder:opacity-50",
          // Ensure minimum touch target size (44px)
          "min-h-[44px] sm:min-h-[40px]", // Responsive height
          // Improved typography
          "font-medium leading-tight",
          // Default styles with better contrast
          "border-gray-300 bg-white text-gray-900",
          // Error state
          error &&
            "border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 animate-shake",
          // Success state
          success &&
            "border-green-400 bg-green-50 text-green-900 focus:border-green-500 focus:ring-green-500 animate-pulse-once",
          // Disabled state
          disabled &&
            "opacity-50 cursor-not-allowed bg-gray-100 hover:border-gray-300 hover:shadow-none",
          className,
        )}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-required={required || ariaRequired}
        aria-invalid={error || ariaInvalid}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

/**
 * Accessible Textarea Component
 * Reusable textarea component with error states and accessibility features
 */
const Textarea = React.forwardRef(
  (
    {
      className,
      error = false,
      success = false,
      disabled = false,
      rows = 4,
      id,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedby,
      "aria-required": ariaRequired,
      "aria-invalid": ariaInvalid,
      required,
      ...props
    },
    ref,
  ) => {
    // Generate unique ID if not provided
    const textareaId =
      id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <textarea
        id={textareaId}
        ref={ref}
        rows={rows}
        className={cn(
          "w-full px-4 py-3 border rounded-lg shadow-sm resize-vertical",
          "text-base sm:text-sm", // Responsive text sizing
          "transition-all duration-200 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          "hover:border-gray-400 hover:shadow-md",
          "placeholder:text-gray-400 placeholder:transition-opacity placeholder:duration-200",
          "focus:placeholder:opacity-50",
          // Improved typography
          "font-medium leading-relaxed",
          // Default styles with better contrast
          "border-gray-300 bg-white text-gray-900",
          // Error state
          error &&
            "border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 animate-shake",
          // Success state
          success &&
            "border-green-400 bg-green-50 text-green-900 focus:border-green-500 focus:ring-green-500 animate-pulse-once",
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed bg-gray-100",
          className,
        )}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-required={required || ariaRequired}
        aria-invalid={error || ariaInvalid}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

/**
 * Accessible Select Component
 * Reusable select component with error states and accessibility features
 */
const Select = React.forwardRef(
  (
    {
      className,
      error = false,
      success = false,
      disabled = false,
      children,
      placeholder = "Select an option",
      id,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedby,
      "aria-required": ariaRequired,
      "aria-invalid": ariaInvalid,
      required,
      ...props
    },
    ref,
  ) => {
    // Generate unique ID if not provided
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <select
        id={selectId}
        ref={ref}
        className={cn(
          "w-full px-4 py-3 border rounded-lg shadow-sm",
          "text-base sm:text-sm", // Responsive text sizing
          "transition-all duration-200 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          "hover:border-gray-400 hover:shadow-md",
          // Ensure minimum touch target size (44px)
          "min-h-[44px] sm:min-h-[40px]", // Responsive height
          // Improved typography
          "font-medium",
          // Default styles with better contrast
          "border-gray-300 bg-white text-gray-900",
          // Error state
          error &&
            "border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 animate-shake",
          // Success state
          success &&
            "border-green-300 bg-green-50 text-green-900 focus:border-green-500 focus:ring-green-500",
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed bg-gray-100",
          className,
        )}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-describedby={ariaDescribedby}
        aria-required={required || ariaRequired}
        aria-invalid={error || ariaInvalid}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";

/**
 * Accessible FormField Component
 * Wrapper for form fields with proper labeling and error handling
 */
const FormField = ({
  label,
  error,
  helpText,
  required = false,
  children,
  className,
  id,
}) => {
  // Generate unique IDs for proper labeling
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;

  // Combine describedby IDs
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  // Clone children to add proper IDs and aria attributes
  const enhancedChildren = children
    ? React.cloneElement(children, {
        id: children.props?.id || fieldId,
        "aria-describedby": describedBy,
        "aria-required": required,
        "aria-invalid": !!error,
      })
    : null;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className={cn(
            "block text-sm font-semibold text-gray-800 leading-tight",
            "mb-2", // Consistent spacing
            required &&
              "after:content-['*'] after:text-red-500 after:ml-1.5 after:font-bold",
          )}
        >
          {label}
          {required && <span className="sr-only">Required</span>}
        </label>
      )}
      {enhancedChildren}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600 font-medium mt-1.5"
          role="alert"
        >
          {error}
        </p>
      )}
      {helpText && !error && (
        <p id={helpId} className="text-sm text-gray-600 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * Accessible InputGroup Component
 * Input with prefix/suffix elements and proper labeling
 */
const InputGroup = ({
  children,
  className,
  prefix,
  suffix,
  prefixLabel,
  suffixLabel,
}) => {
  return (
    <div className={cn("relative flex items-center", className)}>
      {prefix && (
        <div
          className="absolute left-3 z-10 flex items-center text-gray-500"
          aria-label={prefixLabel}
          role={prefixLabel ? "img" : undefined}
        >
          {prefix}
        </div>
      )}
      {React.cloneElement(children, {
        className: cn(
          children.props.className,
          prefix && "pl-10",
          suffix && "pr-10",
        ),
      })}
      {suffix && (
        <div
          className="absolute right-3 z-10 flex items-center text-gray-500"
          aria-label={suffixLabel}
          role={suffixLabel ? "img" : undefined}
        >
          {suffix}
        </div>
      )}
    </div>
  );
};

export { Input, Textarea, Select, FormField, InputGroup };
