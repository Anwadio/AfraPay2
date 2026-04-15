/**
 * LanguageContext
 * ──────────────
 * Provides the current language code and a `changeLanguage(lang)` function
 * to every component in the tree.
 *
 * Usage:
 *   const { language, changeLanguage, supportedLanguages } = useLanguage();
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_META,
  getStoredLanguage,
  setLanguage,
} from "../i18n";
import { userAPI } from "../services/api";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLang] = useState("en");
  const [isReady, setIsReady] = useState(false);

  // On mount: read the persisted locale and apply it
  useEffect(() => {
    getStoredLanguage().then((stored) => {
      setLang(stored);
      setLanguage(stored).finally(() => setIsReady(true));
    });
  }, []);

  const changeLanguage = useCallback(async (lang) => {
    await setLanguage(lang);
    setLang(lang);
    // Persist preference to backend so push notifications use the right locale
    try {
      await userAPI.updateProfile({ preferredLocale: lang });
    } catch {
      // non-fatal — preference stored locally regardless
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
        languageMeta: LANGUAGE_META,
        isReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
