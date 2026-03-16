import React from "react";

const Select = ({
  name,
  value,
  onChange,
  placeholder,
  error = false,
  disabled = false,
  children,
  className = "",
  ...props
}) => {
  const baseStyles = `
    w-full px-3 py-2.5 border rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors duration-200
  `;

  const errorStyles = error
    ? "border-error-300 text-error-900 focus:ring-error-500"
    : "border-neutral-300 text-neutral-900 hover:border-neutral-400";

  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${baseStyles} ${errorStyles} ${className}`}
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
};

export default Select;
