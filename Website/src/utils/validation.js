/**
 * Validation utilities for forms and data
 */

/**
 * Validation rules
 */
export const ValidationRules = {
  // Email validation
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },

  // Phone validation (international format)
  phone: {
    pattern: /^\+?[\d\s()-]{7,15}$/,
    message: "Please enter a valid phone number",
  },

  // Password validation (strong password)
  password: {
    pattern:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    message:
      "Password must be at least 8 characters with uppercase, lowercase, number and special character",
  },

  // Name validation
  name: {
    pattern: /^[a-zA-Z\s]{2,50}$/,
    message: "Name must be between 2-50 characters and contain only letters",
  },

  // Amount validation (financial)
  amount: {
    pattern: /^\d+(\.\d{1,2})?$/,
    message: "Please enter a valid amount (up to 2 decimal places)",
  },

  // Account number validation
  accountNumber: {
    pattern: /^\d{8,20}$/,
    message: "Account number must be between 8-20 digits",
  },

  // Routing number validation (US)
  routingNumber: {
    pattern: /^\d{9}$/,
    message: "Routing number must be 9 digits",
  },

  // SSN validation (US)
  ssn: {
    pattern: /^\d{3}-?\d{2}-?\d{4}$/,
    message: "Please enter a valid SSN (XXX-XX-XXXX)",
  },

  // ZIP code validation (US)
  zipCode: {
    pattern: /^\d{5}(-\d{4})?$/,
    message: "Please enter a valid ZIP code",
  },
};

/**
 * Validate field value against a rule
 * @param {string} value - Value to validate
 * @param {string} rule - Validation rule name
 * @returns {object} Validation result
 */
export function validateField(value, rule) {
  if (!value || !rule) {
    return { isValid: false, message: "Value and rule are required" };
  }

  const validationRule = ValidationRules[rule];
  if (!validationRule) {
    return { isValid: false, message: "Invalid validation rule" };
  }

  const isValid = validationRule.pattern.test(value);
  return {
    isValid,
    message: isValid ? "" : validationRule.message,
  };
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {object} Validation result
 */
export function validateRequired(value, fieldName = "Field") {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);

  return {
    isValid: !isEmpty,
    message: isEmpty ? `${fieldName} is required` : "",
  };
}

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @param {string} fieldName - Field name for error message
 * @returns {object} Validation result
 */
export function validateMinLength(value, minLength, fieldName = "Field") {
  if (!value) {
    return { isValid: false, message: `${fieldName} is required` };
  }

  const isValid = value.length >= minLength;
  return {
    isValid,
    message: isValid
      ? ""
      : `${fieldName} must be at least ${minLength} characters`,
  };
}

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {object} Validation result
 */
export function validateMaxLength(value, maxLength, fieldName = "Field") {
  if (!value) return { isValid: true, message: "" };

  const isValid = value.length <= maxLength;
  return {
    isValid,
    message: isValid
      ? ""
      : `${fieldName} must not exceed ${maxLength} characters`,
  };
}

/**
 * Validate minimum value
 * @param {number} value - Value to validate
 * @param {number} minValue - Minimum value
 * @param {string} fieldName - Field name for error message
 * @returns {object} Validation result
 */
export function validateMinValue(value, minValue, fieldName = "Value") {
  if (value === null || value === undefined || value === "") {
    return { isValid: false, message: `${fieldName} is required` };
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }

  const isValid = numValue >= minValue;
  return {
    isValid,
    message: isValid ? "" : `${fieldName} must be at least ${minValue}`,
  };
}

/**
 * Validate maximum value
 * @param {number} value - Value to validate
 * @param {number} maxValue - Maximum value
 * @param {string} fieldName - Field name for error message
 * @returns {object} Validation result
 */
export function validateMaxValue(value, maxValue, fieldName = "Value") {
  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" };
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }

  const isValid = numValue <= maxValue;
  return {
    isValid,
    message: isValid ? "" : `${fieldName} must not exceed ${maxValue}`,
  };
}

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {object} Validation result
 */
export function validatePasswordConfirmation(password, confirmPassword) {
  if (!confirmPassword) {
    return { isValid: false, message: "Please confirm your password" };
  }

  const isValid = password === confirmPassword;
  return {
    isValid,
    message: isValid ? "" : "Passwords do not match",
  };
}

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {object} Validation result
 */
export function validateFileType(file, allowedTypes) {
  if (!file) {
    return { isValid: false, message: "Please select a file" };
  }

  if (!allowedTypes || !Array.isArray(allowedTypes)) {
    return { isValid: false, message: "Invalid file type configuration" };
  }

  const isValid = allowedTypes.includes(file.type);
  return {
    isValid,
    message: isValid
      ? ""
      : `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
  };
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeBytes - Maximum size in bytes
 * @returns {object} Validation result
 */
export function validateFileSize(file, maxSizeBytes) {
  if (!file) {
    return { isValid: false, message: "Please select a file" };
  }

  const isValid = file.size <= maxSizeBytes;
  const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);

  return {
    isValid,
    message: isValid ? "" : `File size must not exceed ${maxSizeMB}MB`,
  };
}

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {object} Validation result
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { isValid: false, message: "Both start and end dates are required" };
  }

  const isValid = startDate <= endDate;
  return {
    isValid,
    message: isValid ? "" : "End date must be after start date",
  };
}

/**
 * Validate credit card number using Luhn algorithm
 * @param {string} cardNumber - Card number to validate
 * @returns {object} Validation result
 */
export function validateCreditCard(cardNumber) {
  if (!cardNumber) {
    return { isValid: false, message: "Card number is required" };
  }

  // Remove spaces and non-digits
  const cleanedNumber = cardNumber.replace(/\D/g, "");

  // Check length
  if (cleanedNumber.length < 13 || cleanedNumber.length > 19) {
    return {
      isValid: false,
      message: "Card number must be between 13-19 digits",
    };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleanedNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanedNumber[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit = (digit % 10) + 1;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  const isValid = sum % 10 === 0;
  return {
    isValid,
    message: isValid ? "" : "Invalid card number",
  };
}

/**
 * Validate CVV code
 * @param {string} cvv - CVV code
 * @param {string} cardType - Card type (optional)
 * @returns {object} Validation result
 */
export function validateCVV(cvv, cardType) {
  if (!cvv) {
    return { isValid: false, message: "CVV is required" };
  }

  const cleanedCVV = cvv.replace(/\D/g, "");
  const expectedLength = cardType === "amex" ? 4 : 3;

  const isValid = cleanedCVV.length === expectedLength;
  return {
    isValid,
    message: isValid ? "" : `CVV must be ${expectedLength} digits`,
  };
}

/**
 * Validate form data with multiple rules
 * @param {object} data - Form data to validate
 * @param {object} rules - Validation rules configuration
 * @returns {object} Validation results
 */
export function validateForm(data, rules) {
  const errors = {};
  let isValid = true;

  for (const field in rules) {
    const fieldRules = rules[field];
    const fieldValue = data[field];
    const fieldErrors = [];

    // Check each rule for the field
    for (const rule of fieldRules) {
      let result = { isValid: true, message: "" };

      switch (rule.type) {
        case "required":
          result = validateRequired(fieldValue, rule.fieldName || field);
          break;
        case "email":
          if (fieldValue) result = validateField(fieldValue, "email");
          break;
        case "phone":
          if (fieldValue) result = validateField(fieldValue, "phone");
          break;
        case "password":
          if (fieldValue) result = validateField(fieldValue, "password");
          break;
        case "minLength":
          if (fieldValue)
            result = validateMinLength(
              fieldValue,
              rule.value,
              rule.fieldName || field,
            );
          break;
        case "maxLength":
          if (fieldValue)
            result = validateMaxLength(
              fieldValue,
              rule.value,
              rule.fieldName || field,
            );
          break;
        case "minValue":
          if (
            fieldValue !== null &&
            fieldValue !== undefined &&
            fieldValue !== ""
          ) {
            result = validateMinValue(
              fieldValue,
              rule.value,
              rule.fieldName || field,
            );
          }
          break;
        case "maxValue":
          if (
            fieldValue !== null &&
            fieldValue !== undefined &&
            fieldValue !== ""
          ) {
            result = validateMaxValue(
              fieldValue,
              rule.value,
              rule.fieldName || field,
            );
          }
          break;
        default:
          if (typeof rule.validator === "function") {
            result = rule.validator(fieldValue);
          }
      }

      if (!result.isValid) {
        fieldErrors.push(result.message);
        isValid = false;
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }

  return {
    isValid,
    errors,
  };
}
