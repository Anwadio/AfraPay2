/* eslint-disable no-console */
/**
 * CurrencyContext
 *
 * Provides the user's active display currency to the whole app.
 *
 * Priority order:
 *   1. Explicit user preference saved in localStorage ("afrapay_currency")
 *   2. Default currency for the user's registered country (from profile)
 *   3. "USD" as universal fallback
 *
 * When the user changes their preference via setCurrency(), the selection is
 * persisted to localStorage immediately and also synced to the backend profile
 * (best-effort — failures are silently ignored so the UI never blocks).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { userAPI } from "../services/api";
import { getCurrencyByCountry, getCurrencyMeta } from "../utils/currency";

const STORAGE_KEY = "afrapay_currency";

const CurrencyContext = createContext({
  currency: "USD",
  currencyMeta: null,
  setCurrency: () => {},
  isLoading: true,
});

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(() => {
    // Initialise synchronously from localStorage so there's no flash
    return localStorage.getItem(STORAGE_KEY) || "USD";
  });
  const [isLoading, setIsLoading] = useState(true);

  // On mount, fetch the user's profile to derive country-based default
  // (only used when no explicit preference is stored yet)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // User already has an explicit preference — nothing to derive
      setIsLoading(false);
      return;
    }

    userAPI
      .getProfile()
      .then((res) => {
        if (res?.success && res.data) {
          const profile = res.data;
          // Prefer the stored backend preference, then fall back to country default
          const derived =
            profile.preferredCurrency ||
            getCurrencyByCountry(profile.country) ||
            "USD";
          setCurrencyState(derived);
          localStorage.setItem(STORAGE_KEY, derived);
        }
      })
      .catch(() => {
        // Not logged in or network error — keep fallback "USD"
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCurrency = useCallback((code) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);

    // Best-effort backend sync — fire and forget
    userAPI
      .updateProfile({ preferredCurrency: code })
      .catch((err) =>
        console.warn("Failed to sync currency preference to backend:", err),
      );
  }, []);

  const currencyMeta = useMemo(() => getCurrencyMeta(currency), [currency]);

  const value = useMemo(
    () => ({ currency, currencyMeta, setCurrency, isLoading }),
    [currency, currencyMeta, setCurrency, isLoading],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
