/**
 * useAnalytics
 *
 * Data-fetching hook for the Analytics dashboard.
 * Calls GET /api/v1/analytics/dashboard and exposes the response together
 * with loading and error state.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useAnalytics(period);
 *
 * `data` shape when successful:
 *   {
 *     summary:           { totalBalance, incomingAmount, outgoingAmount, netSavings, transactionCount, currency }
 *     monthlyTrend:      { labels[6], income[6], expenses[6] }
 *     categories:        [{ name, amount, percentage, color }]
 *     categoryTotalSpent: number
 *     providerBreakdown: [{ provider, count, volume, percentage, color }]
 *     topTransactions:   [{ id, type, txType, amount, currency, description, date, provider }]
 *     recentTransactions:[{ id, type, status, amount, currency, description, date, provider }]
 *     meta:              { period, generatedAt }
 *   }
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { analyticsAPI } from "../services/api";

const useAnalytics = (period = "month") => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track the latest in-flight request so stale responses are discarded
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Increment a monotonic counter — we only accept the response matching
    // the most recently initiated request (avoids race conditions on rapid
    // period changes).
    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;

    try {
      const result = await analyticsAPI.getDashboard({ period });

      // Discard if a newer request has already been initiated
      if (thisRequestId !== requestIdRef.current) return;

      if (result?.success && result.data) {
        setData(result.data);
      } else {
        setError(result?.error?.message || "Failed to load analytics data");
      }
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return;
      // Axios cancelled requests are not real errors
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      setError(err.message || "Failed to load analytics data");
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export default useAnalytics;
