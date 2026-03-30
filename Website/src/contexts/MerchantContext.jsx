/* eslint-disable no-console */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { merchantAPI } from "../services/api";

const MerchantContext = createContext(null);

/**
 * MerchantProvider — fetches and caches the current user's merchant profile.
 *
 * Exposes:
 *   merchant         — raw merchant document (null if none / not applied)
 *   merchantStatus   — "none" | "pending" | "approved" | "rejected"
 *   isLoading        — true while initial fetch is in-flight
 *   hasFetched       — true once at least one attempt has completed
 *   registerMerchant — POST /merchants/register, updates context state
 *   refetch          — manually re-fetch from backend
 */
export const MerchantProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [merchant, setMerchant] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchMerchant = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await merchantAPI.getMyMerchant();
      setMerchant(res?.success && res.data ? res.data : null);
    } catch {
      // 404 → user has no merchant application — treat as "none"
      setMerchant(null);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !hasFetched) {
      fetchMerchant();
    }
    if (!isAuthenticated) {
      setMerchant(null);
      setHasFetched(false);
    }
  }, [isAuthenticated, hasFetched, fetchMerchant]);

  const registerMerchant = async (data) => {
    const res = await merchantAPI.register(data);
    if (res?.success && res.data) {
      setMerchant(res.data);
      setHasFetched(true);
    }
    return res;
  };

  const merchantStatus = merchant?.status ?? "none";

  return (
    <MerchantContext.Provider
      value={{
        merchant,
        merchantStatus,
        isLoading,
        hasFetched,
        registerMerchant,
        refetch: fetchMerchant,
      }}
    >
      {children}
    </MerchantContext.Provider>
  );
};

/**
 * useMerchant — consume merchant context.
 * Returns sensible defaults when called outside the provider (e.g. tests).
 */
export const useMerchant = () => {
  const ctx = useContext(MerchantContext);
  if (!ctx) {
    return {
      merchant: null,
      merchantStatus: "none",
      isLoading: false,
      hasFetched: false,
      registerMerchant: async () => {},
      refetch: async () => {},
    };
  }
  return ctx;
};

export default MerchantContext;
