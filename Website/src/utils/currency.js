/**
 * Currency utilities
 * Maps African country codes to their default currencies and provides
 * metadata for all supported display currencies.
 */

// All currencies supported for display / user preference
export const SUPPORTED_CURRENCIES = [
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    flag: "🇳🇬",
    locale: "en-NG",
  },
  {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "₵",
    flag: "🇬🇭",
    locale: "en-GH",
  },
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    flag: "🇰🇪",
    locale: "en-KE",
  },
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    flag: "🇿🇦",
    locale: "en-ZA",
  },
  {
    code: "UGX",
    name: "Ugandan Shilling",
    symbol: "USh",
    flag: "🇺🇬",
    locale: "en-UG",
  },
  {
    code: "TZS",
    name: "Tanzanian Shilling",
    symbol: "TSh",
    flag: "🇹🇿",
    locale: "en-TZ",
  },
  {
    code: "RWF",
    name: "Rwandan Franc",
    symbol: "Fr",
    flag: "🇷🇼",
    locale: "fr-RW",
  },
  {
    code: "XOF",
    name: "West African CFA Franc",
    symbol: "CFA",
    flag: "🌍",
    locale: "fr-SN",
  },
  {
    code: "CFA",
    name: "Central African CFA",
    symbol: "FCFA",
    flag: "🌍",
    locale: "fr-CM",
  },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", locale: "en-IE" },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    flag: "🇬🇧",
    locale: "en-GB",
  },
  {
    code: "SSP",
    name: "South Sudanese Pound",
    symbol: "£",
    flag: "🇸🇸",
    locale: "en-SS",
  },
];

// Map of currency code → metadata (for O(1) lookups)
export const CURRENCY_META = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c]),
);

/**
 * Country code (ISO 3166-1 alpha-2) → default currency code.
 * Matches the country options in Register.jsx.
 */
export const COUNTRY_CURRENCY_MAP = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  UG: "UGX",
  TZ: "TZS",
  RW: "RWF",
  SN: "XOF",
  CI: "XOF",
  CM: "CFA",
  SS: "SSP",
};

/**
 * Return the default currency code for a country, or "USD" as fallback.
 * @param {string} countryCode - ISO alpha-2 country code (e.g. "NG")
 * @returns {string} Currency code
 */
export function getCurrencyByCountry(countryCode) {
  return COUNTRY_CURRENCY_MAP[countryCode] || "USD";
}

/**
 * Get currency metadata object by code.
 * @param {string} code - Currency code (e.g. "NGN")
 * @returns {{ code, name, symbol, flag, locale }}
 */
export function getCurrencyMeta(code) {
  return CURRENCY_META[code] || CURRENCY_META["USD"];
}

/**
 * Format a numeric amount using the given currency code and locale.
 * @param {number|null} amount
 * @param {string} currencyCode
 * @returns {string}
 */
export function formatCurrencyAmount(amount, currencyCode = "USD") {
  if (amount === null || amount === undefined || isNaN(amount)) return "—";
  const meta = getCurrencyMeta(currencyCode);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for any unsupported Intl locale/currency combo
    return `${meta.symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
