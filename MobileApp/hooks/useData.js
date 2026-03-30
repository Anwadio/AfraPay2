import { useState, useEffect, useCallback } from "react";
import { walletAPI, transactionAPI, notificationsAPI } from "../services/api";

export function useWallet() {
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await walletAPI.getBalances();
      setBalances(res.data?.balances || res.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, error, refetch: fetchBalances };
}

export function useTransactions(params = {}) {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(
    async (overrideParams = {}) => {
      try {
        setLoading(true);
        setError(null);
        const res = await transactionAPI.getTransactions({
          ...params,
          ...overrideParams,
        });
        const data = res.data;
        setTransactions(data?.transactions || data?.data || []);
        if (data?.pagination) setPagination(data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    },
    [JSON.stringify(params)],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    pagination,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifRes, countRes] = await Promise.all([
        notificationsAPI.getNotifications({ limit: 20 }),
        notificationsAPI.getUnreadCount(),
      ]);
      setNotifications(notifRes.data?.data?.notifications || []);
      setUnreadCount(countRes.data?.data?.unreadCount ?? 0);
    } catch {
      // silently fail for notifications
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, unreadCount, loading, refetch: fetchNotifications };
}
