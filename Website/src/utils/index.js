import { clsx } from "clsx";

// Import and re-export date utilities
export {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatSmartDate,
  formatDateRange,
  isFutureDate,
  isPastDate,
  startOfDay,
  endOfDay,
  addDays,
  subtractDays,
  getAge,
} from "./date";

// Import and re-export accessibility utilities
export {
  useTranslation,
  LanguageProvider,
  announceToScreenReader,
  useFocusTrap,
  useKeyboardNavigation,
  SkipLinks,
} from "./accessibility";

// Import and re-export animation utilities
export {
  animations,
  staggerDelays,
  performantAnimations,
  durations,
  easings,
  createStaggeredAnimation,
  combineAnimations,
  useScrollAnimation,
  componentAnimations,
  sequences,
} from "./animations";

/**
 * Utility function to combine class names
 * @param {...any} inputs - Class names to combine
 * @returns {string} Combined class names
 */
export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = "USD", locale = "en-US") {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "0.00";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (typeof num !== "number" || isNaN(num)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Abbreviate large numbers (e.g., 1000000 -> 1M)
 * @param {number} num - Number to abbreviate
 * @param {number} digits - Number of decimal places (default: 1)
 * @returns {string} Abbreviated number string
 */
export function abbreviateNumber(num, digits = 1) {
  if (typeof num !== "number" || isNaN(num)) {
    return "0";
  }

  const units = ["", "K", "M", "B", "T"];
  let unitIndex = 0;
  let value = Math.abs(num);

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }

  const formatted = value.toFixed(digits);
  const sign = num < 0 ? "-" : "";

  return `${sign}${formatted}${units[unitIndex]}`;
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted file size string
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (typeof str !== "string" || str.length === 0) {
    return "";
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (typeof text !== "string" || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Generate random ID
 * @param {number} length - Length of ID (default: 8)
 * @returns {string} Random ID string
 */
export function generateId(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }

  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * Check if value is empty
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @param {number} count - Number of initials (default: 2)
 * @returns {string} Initials
 */
export function getInitials(name, count = 2) {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .split(" ")
    .filter((word) => word.length > 0)
    .slice(0, count)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {object} RGB values
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Generate contrasting text color for background
 * @param {string} backgroundColor - Background color in hex
 * @returns {string} Text color ('white' or 'black')
 */
export function getContrastColor(backgroundColor) {
  const rgb = hexToRgb(backgroundColor);

  if (!rgb) {
    return "black";
  }

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? "black" : "white";
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
export function isValidPhone(phone) {
  const phoneRegex = /^\+?[\d\s\-()+]{7,17}$/;
  return phoneRegex.test(phone);
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return "";

  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "");

  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone; // Return original if can't format
}
