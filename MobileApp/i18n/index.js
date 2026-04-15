/**
 * AfraPay Mobile i18n Configuration
 * ───────────────────────────────────
 * Stack: i18next + react-i18next + expo-localization
 *
 * Supported locales:
 *   en  → English (default)
 *   fr  → French
 *
 * Language preference is persisted via AsyncStorage under key "afrapay_lang".
 * All locale files are bundled eagerly to prevent flash on cold start.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import en from "./en.json";
import fr from "./fr.json";

// ── Constants ────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "afrapay_lang";

export const SUPPORTED_LANGUAGES = ["en", "fr"];

/** Display metadata for each locale — used by the LanguageSwitcher. */
export const LANGUAGE_META = {
  en: {
    code: "en",
    nativeName: "English",
    englishName: "English",
    flag: "🇬🇧",
  },
  fr: {
    code: "fr",
    nativeName: "Français",
    englishName: "French",
    flag: "🇫🇷",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Read the persisted language from AsyncStorage.
 * Falls back to the device locale, then "en".
 */
export const getStoredLanguage = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;

    // Use device locale (e.g. "fr-FR" → "fr")
    const deviceLocale = Localization.getLocales()?.[0]?.languageCode ?? "en";
    if (SUPPORTED_LANGUAGES.includes(deviceLocale)) return deviceLocale;
  } catch (_) {
    // storage error — fall through to default
  }
  return "en";
};

/**
 * Persist the chosen language and change it within i18next.
 * @param {string} lang - one of SUPPORTED_LANGUAGES
 */
export const setLanguage = async (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {
    // non-fatal
  }
  await i18n.changeLanguage(lang);
};

// ── i18next initialisation ────────────────────────────────────────────────────
// We call init synchronously with a known default so the app never renders
// without translations. The stored language is applied in _layout.jsx after
// AsyncStorage resolves.

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },

  // Start with English; the layout will switch to the stored locale on mount.
  lng: "en",
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,

  // Log missing keys in dev for easier discovery
  parseMissingKeyHandler: (key) => {
    if (__DEV__) {
      console.warn(`[i18n] Missing key: "${key}"`);
    }
    return key;
  },

  interpolation: {
    escapeValue: false, // React Native already escapes
    prefix: "{{",
    suffix: "}}",
  },

  react: {
    useSuspense: false,
  },
});

export default i18n;
