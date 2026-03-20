/**
 * useLanguage — AfraPay language management hook
 * ─────────────────────────────────────────────
 * Wraps react-i18next and exposes a clean, app-specific API:
 *
 *   const { language, setLanguage, direction, isRTL, languages, t } = useLanguage();
 *
 * Features:
 *  - Lazy-loads the requested locale before switching
 *  - Persists the choice to localStorage (key: "afrapay_lang")
 *  - Optionally syncs the preference to the backend (fire-and-forget)
 *  - Returns rich locale metadata for the LanguageSwitcher UI
 */

import { useCallback } from "react";
import { useTranslation as useI18nTranslation } from "react-i18next";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_META,
  RTL_LANGUAGES,
  STORAGE_KEY,
  loadLocale,
} from "../i18n";

/**
 * Attempt to persist the language preference to the backend.
 * Fire-and-forget — never throws, never blocks the UI.
 *
 * @param {string} lang
 */
const syncLanguageToBackend = async (lang) => {
  try {
    const { userAPI } = await import("../services/api");
    await userAPI.setPreferredLanguage(lang);
  } catch {
    // Silently ignore — localStorage is the source of truth for language
  }
};

/**
 * @typedef {Object} UseLanguageReturn
 * @property {string}   language     - Current locale code (e.g. "sw")
 * @property {Function} setLanguage  - Switch to a given locale code
 * @property {string}   direction    - "ltr" | "rtl"
 * @property {boolean}  isRTL        - Shorthand for direction === "rtl"
 * @property {Array}    languages    - All supported locales with metadata
 * @property {Object}   currentMeta  - Metadata for the active locale
 * @property {Function} t            - i18next translation function
 */

/**
 * Primary hook for language management throughout the AfraPay app.
 *
 * @param {Object}  [opts]
 * @param {boolean} [opts.syncBackend=false]  Persist preference to backend
 * @returns {UseLanguageReturn}
 */
export const useLanguage = ({ syncBackend = false } = {}) => {
  const { t, i18n } = useI18nTranslation();

  const language = i18n.language || "en";
  const isRTL = RTL_LANGUAGES.includes(language);
  const direction = isRTL ? "rtl" : "ltr";
  const currentMeta = LANGUAGE_META[language] ?? LANGUAGE_META.en;

  /**
   * Switch to a new locale.
   * Handles lazy-loading + DOM direction update + persistence.
   *
   * @param {string} locale - Must be one of SUPPORTED_LANGUAGES
   */
  const setLanguage = useCallback(
    async (locale) => {
      if (!SUPPORTED_LANGUAGES.includes(locale)) {
        // eslint-disable-next-line no-console
        console.warn(`[useLanguage] Unsupported locale: "${locale}"`);
        return;
      }

      // 1. Lazy-load translation bundle if needed
      await loadLocale(locale);

      // 2. Tell i18next to switch (this also updates localStorage via the detector)
      await i18n.changeLanguage(locale);

      // 3. Persist manually as belt-and-suspenders
      localStorage.setItem(STORAGE_KEY, locale);

      // 4. Optionally sync to backend (fire-and-forget)
      if (syncBackend) {
        syncLanguageToBackend(locale);
      }
    },
    [i18n, syncBackend],
  );

  /** Rich metadata array powering the LanguageSwitcher dropdown */
  const languages = SUPPORTED_LANGUAGES.map((code) => ({
    ...LANGUAGE_META[code],
    isActive: code === language,
  }));

  return {
    language,
    setLanguage,
    direction,
    isRTL,
    languages,
    currentMeta,
    t,
  };
};

export default useLanguage;
