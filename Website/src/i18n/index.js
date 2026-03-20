/**
 * AfraPay Internationalization (i18n) Configuration
 * ─────────────────────────────────────────────────
 * Stack:  i18next + react-i18next + browser language detector
 *
 * Supported locales (initial release):
 *   en        → English (default)
 *   sw        → Kiswahili
 *   ar-juba   → Juba Arabic (RTL)
 *
 * Architecture:
 *   - English is bundled eagerly (no flash on first load)
 *   - All other locales are lazy-loaded on first use via dynamic import()
 *   - Language preference stored in localStorage under key "afrapay_lang"
 *   - RTL is applied automatically for ar-juba
 *
 * Adding a new language:
 *   1. Create src/i18n/{locale}.json with the full translation object
 *   2. Add the locale code to SUPPORTED_LANGUAGES below
 *   3. Add an entry to LANGUAGE_META below
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// ── Eagerly-bundled locales ──────────────────────────────────────────────────
// All three locale files are small (< 5 KB gzip each) — bundling them
// together prevents the "refresh reverts to English" problem caused by
// lazy-loading: on a fresh page load the LanguageDetector reads the stored
// locale from localStorage before the async chunk arrives, so i18next would
// fall back to English. Eager bundling ensures every locale is available the
// instant i18next initialises.
import enTranslations from "./en.json";
import swTranslations from "./sw.json";
import arJubaTranslations from "./ar-juba.json";

// ── Constants ────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "afrapay_lang";

/** All locale codes the app supports. */
export const SUPPORTED_LANGUAGES = ["en", "sw", "ar-juba"];

/**
 * Locale codes that require an RTL layout.
 * Checked by useLanguage / App.jsx to set <html dir="rtl">.
 */
export const RTL_LANGUAGES = ["ar-juba"];

/**
 * Display metadata for each locale — used by the LanguageSwitcher component.
 * flag: Unicode flag emoji (rendered via OS font)
 * nativeName: name of the language in the language itself
 */
export const LANGUAGE_META = {
  en: {
    code: "en",
    nativeName: "English",
    englishName: "English",
    flag: "🇬🇧",
    dir: "ltr",
  },
  sw: {
    code: "sw",
    nativeName: "Kiswahili",
    englishName: "Swahili",
    flag: "🇰🇪",
    dir: "ltr",
  },
  "ar-juba": {
    code: "ar-juba",
    nativeName: "عربي جوبا",
    englishName: "Juba Arabic",
    flag: "🇸🇸",
    dir: "rtl",
  },
};

// ── Lazy-load helper ─────────────────────────────────────────────────────────
/**
 * Dynamically loads a locale's translations and registers them with i18next.
 * Safe to call multiple times — skips locales already loaded.
 *
 * @param {string} locale - One of the SUPPORTED_LANGUAGES codes
 * @returns {Promise<void>}
 */
export const loadLocale = async (locale) => {
  // All current locales are eagerly bundled — this is a no-op for them.
  // Kept as a hook for future locales that may be added without re-bundling.
  if (i18n.hasResourceBundle(locale, "translation")) return;

  try {
    const module = await import(`./${locale}.json`);
    i18n.addResourceBundle(
      locale,
      "translation",
      module.default ?? module,
      true,
      true,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[i18n] Failed to load locale "${locale}":`, err);
  }
};

// ── i18next initialisation ───────────────────────────────────────────────────
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // All locales bundled eagerly so the stored preference is applied
    // immediately on page load without waiting for an async chunk.
    resources: {
      en: { translation: enTranslations },
      sw: { translation: swTranslations },
      "ar-juba": { translation: arJubaTranslations },
    },

    // The browser language detector reads, in order:
    //   1. localStorage ("afrapay_lang")
    //   2. navigator.language
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },

    // Resolved language that could not be found in resources falls back to en
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,

    // Keep unknown keys visible in dev so missing translations are obvious
    parseMissingKeyHandler: (key) => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing key: "${key}"`);
      }
      return key;
    },

    interpolation: {
      // React already escapes output — no need to double-escape
      escapeValue: false,
      // Support the {{variable}} placeholder format used throughout the app
      prefix: "{{",
      suffix: "}}",
    },

    react: {
      // Suspend React rendering while a locale is loading (works with <Suspense>)
      useSuspense: false,
    },
  });

// ── Auto-apply RTL direction on language change ──────────────────────────────
const applyDirection = (lang) => {
  const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lang === "ar-juba" ? "ar" : lang;
};

i18n.on("languageChanged", (lang) => {
  applyDirection(lang);
});

// Apply direction for the initial language (detected or default)
applyDirection(i18n.language);

export default i18n;
