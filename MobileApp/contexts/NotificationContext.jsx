/**
 * NotificationContext
 *
 * Global context that provides:
 *   - `unreadCount`          — live count of unread notifications
 *   - `notifications`        — latest notification list (most-recent 20)
 *   - `refresh()`            — manually re-fetch
 *   - `markRead(id)`         — optimistically mark one as read
 *   - `markAllRead()`        — optimistically mark all as read
 *
 * Polling strategy:
 *   - Polls every POLL_INTERVAL_MS while the app is mounted and user is
 *     authenticated.
 *   - Incremental: only the unread-count endpoint is polled; the full list
 *     is fetched on demand or when a foreground push arrives (via the
 *     `shouldRefreshAt` state updated by `_handleForegroundNotification`).
 *
 * Usage:
 *   <NotificationProvider>…app…</NotificationProvider>
 *   const { unreadCount, notifications, refresh, markRead } = useNotificationContext();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { notificationsAPI } from "../services/api";
import {
  addForegroundListener,
  addResponseListener,
  removeSubscriptions,
} from "../services/pushNotificationService";

// ── Constants ────────────────────────────────────────────────────────────────
/** Poll unread count every 30 seconds while the app is in the foreground */
const POLL_INTERVAL_MS = 30_000;

// ── Context ───────────────────────────────────────────────────────────────────
const NotificationContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Trigger a full list re-fetch when a push arrives in foreground
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const pollingRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // ── Fetch full list ────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await notificationsAPI.getNotifications({ limit: 20 });
      // Backend: res.data = { success, data: { notifications: [], unreadCount, total } }
      const payload = res.data?.data || {};
      setNotifications(payload.notifications || []);
      setUnreadCount(payload.unreadCount ?? 0);
    } catch {
      // silently fail — stale data is acceptable for notifications
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // ── Poll unread count (lightweight) ────────────────────────────────────────
  const pollUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      const count = res.data?.data?.unreadCount ?? 0;
      setUnreadCount(count);
    } catch {
      // non-fatal
    }
  }, []);

  // ── Start / stop polling when AppState changes ─────────────────────────────
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // already running
    pollingRef.current = setInterval(pollUnreadCount, POLL_INTERVAL_MS);
  }, [pollUnreadCount]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ── Listen for app foreground / background transitions ─────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // App came back to foreground — refresh immediately then restart polling
        pollUnreadCount();
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        stopPolling();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [pollUnreadCount, startPolling, stopPolling]);

  // ── Initial fetch + start polling on mount ─────────────────────────────────
  useEffect(() => {
    fetchNotifications();
    startPolling();
    return () => stopPolling();
  }, [fetchNotifications, startPolling, stopPolling]);

  // ── Re-fetch full list when trigger changes ────────────────────────────────
  useEffect(() => {
    if (refreshTrigger > 0) fetchNotifications(true);
  }, [refreshTrigger, fetchNotifications]);

  // ── Foreground push notification listener ──────────────────────────────────
  useEffect(() => {
    const foregroundSub = addForegroundListener(() => {
      // New notification arrived while app is open — trigger a re-fetch
      setRefreshTrigger((t) => t + 1);
    });

    const responseSub = addResponseListener(() => {
      // User tapped a notification — refresh list so it shows as unread
      setRefreshTrigger((t) => t + 1);
    });

    return () => removeSubscriptions(foregroundSub, responseSub);
  }, []);

  // ── Optimistic helpers ─────────────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ((n.$id || n.id) === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await notificationsAPI.markAsRead(id);
    } catch {
      // Revert on failure
      setRefreshTrigger((t) => t + 1);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await notificationsAPI.markAllAsRead();
    } catch {
      setRefreshTrigger((t) => t + 1);
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    refresh: () => fetchNotifications(),
    markRead,
    markAllRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to consume the NotificationContext.
 * Must be used inside <NotificationProvider>.
 */
export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider",
    );
  }
  return ctx;
}
