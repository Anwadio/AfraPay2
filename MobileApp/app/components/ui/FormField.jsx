import React from "react";

const FormField = ({
  label,
  error,
  required = false,
  helpText,
  children,
  className = "",
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-neutral-900">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && (
        <p className="text-xs text-neutral-600">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
