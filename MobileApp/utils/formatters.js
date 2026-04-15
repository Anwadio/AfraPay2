/**
 * MobileApp locale-aware formatting utilities
 * ─────────────────────────────────────────────
 * Use these helpers instead of hardcoding "en-US" in Intl calls.
 * They read the current i18next language so formatting automatically
 * adjusts when the user switches language.
 *
 * Locale map:
 *   en → en-US  (USD default, MM/DD/YYYY style — users on Anglophone networks)
 *   fr → fr-FR  (EUR default, DD/MM/YYYY style — standard French formatting)
 */

import i18n from "../i18n";

/** Map i18n locale codes to BCP-47 tags used by Intl APIs */
const LOCALE_TAG = {
  en: "en-US",
  fr: "fr-FR",
};

function getIntlLocale() {
  return LOCALE_TAG[i18n.language] ?? "en-US";
}

/**
 * Format a monetary amount according to the current locale & the given currency.
 *
 * @param {number|string} amount
 * @param {string} [currency="USD"]
 * @returns {string}  e.g. "$1,234.56" (en) or "1 234,56 $US" (fr)
 */
export function formatCurrency(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat(getIntlLocale(), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount || 0));
  } catch {
    return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
  }
}

/**
 * Format a number (no currency symbol) using locale separators.
 *
 * @param {number|string} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatNumber(value, decimals = 2) {
  try {
    return new Intl.NumberFormat(getIntlLocale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(parseFloat(value || 0));
  } catch {
    return parseFloat(value || 0).toFixed(decimals);
  }
}

/**
 * Format a Date (or ISO string) as a short locale date.
 *
 * @param {Date|string} date
 * @returns {string}  e.g. "4/14/2026" (en) or "14/04/2026" (fr)
 */
export function formatDate(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(getIntlLocale(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Format a Date (or ISO string) as date + time.
 *
 * @param {Date|string} date
 * @returns {string}  e.g. "04/14/2026, 2:30 PM" (en) or "14/04/2026 14:30" (fr)
 */
export function formatDateTime(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(getIntlLocale(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Human-readable relative time (e.g. "2 minutes ago" / "il y a 2 minutes").
 * Falls back to a short date string.
 *
 * @param {Date|string} date
 * @returns {string}
 */
export function timeAgo(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (typeof Intl.RelativeTimeFormat !== "undefined") {
      const rtf = new Intl.RelativeTimeFormat(getIntlLocale(), {
        numeric: "auto",
      });
      if (diffSec < 60) return rtf.format(-diffSec, "second");
      if (diffSec < 3600)
        return rtf.format(-Math.floor(diffSec / 60), "minute");
      if (diffSec < 86400)
        return rtf.format(-Math.floor(diffSec / 3600), "hour");
      return rtf.format(-Math.floor(diffSec / 86400), "day");
    }

    // Fallback for older environments
    const m = Math.floor(diffSec / 60);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return "";
  }
}
