/* eslint-disable no-console */
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM dd, yyyy')
 * @returns {string} Formatted date string
 */
export function formatDate(date, formatString = "MMM dd, yyyy") {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

/**
 * Format datetime for display
 * @param {string|Date} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM dd, yyyy HH:mm')
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(date, formatString = "MMM dd, yyyy HH:mm") {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "";
  }
}

/**
 * Format time for display
 * @param {string|Date} date - Date to format
 * @param {string} formatString - Format string (default: 'HH:mm')
 * @returns {string} Formatted time string
 */
export function formatTime(date, formatString = "HH:mm") {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "";
  }
}

/**
 * Format smart date (Today, Yesterday, or date)
 * @param {string|Date} date - Date to format
 * @returns {string} Smart formatted date string
 */
export function formatSmartDate(date) {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;

    if (isToday(dateObj)) {
      return `Today ${format(dateObj, "HH:mm")}`;
    }

    if (isYesterday(dateObj)) {
      return `Yesterday ${format(dateObj, "HH:mm")}`;
    }

    // If within the last 7 days, show day of week
    const daysDiff = Math.floor((new Date() - dateObj) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) {
      return format(dateObj, "EEEE HH:mm");
    }

    // If within the same year, don't show year
    if (dateObj.getFullYear() === new Date().getFullYear()) {
      return format(dateObj, "MMM dd, HH:mm");
    }

    return format(dateObj, "MMM dd, yyyy HH:mm");
  } catch (error) {
    console.error("Error formatting smart date:", error);
    return "";
  }
}

/**
 * Get date range string
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} Date range string
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return "";

  try {
    const start =
      typeof startDate === "string" ? parseISO(startDate) : startDate;
    const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

    const startFormatted = format(start, "MMM dd, yyyy");
    const endFormatted = format(end, "MMM dd, yyyy");

    if (startFormatted === endFormatted) {
      return startFormatted;
    }

    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error("Error formatting date range:", error);
    return "";
  }
}

/**
 * Check if date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in future
 */
export function isFutureDate(date) {
  if (!date) return false;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return dateObj > new Date();
  } catch (error) {
    return false;
  }
}

/**
 * Check if date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in past
 */
export function isPastDate(date) {
  if (!date) return false;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return dateObj < new Date();
  } catch (error) {
    return false;
  }
}

/**
 * Get start of day
 * @param {string|Date} date - Date
 * @returns {Date} Start of day
 */
export function startOfDay(date) {
  if (!date) return null;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
    );
  } catch (error) {
    return null;
  }
}

/**
 * Get end of day
 * @param {string|Date} date - Date
 * @returns {Date} End of day
 */
export function endOfDay(date) {
  if (!date) return null;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      23,
      59,
      59,
      999,
    );
  } catch (error) {
    return null;
  }
}

/**
 * Add days to date
 * @param {string|Date} date - Base date
 * @param {number} days - Days to add
 * @returns {Date} New date
 */
export function addDays(date, days) {
  if (!date) return null;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    const result = new Date(dateObj);
    result.setDate(result.getDate() + days);
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Subtract days from date
 * @param {string|Date} date - Base date
 * @param {number} days - Days to subtract
 * @returns {Date} New date
 */
export function subtractDays(date, days) {
  return addDays(date, -days);
}

/**
 * Get age from birth date
 * @param {string|Date} birthDate - Birth date
 * @returns {number} Age in years
 */
export function getAge(birthDate) {
  if (!birthDate) return 0;

  try {
    const birthDateObj =
      typeof birthDate === "string" ? parseISO(birthDate) : birthDate;
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDateObj.getDate())
    ) {
      age--;
    }

    return age;
  } catch (error) {
    return 0;
  }
}
