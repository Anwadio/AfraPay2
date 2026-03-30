/**
 * AdminNotifications
 *
 * Bell-icon dropdown that shows admin-targeted real-time notifications.
 * - Polls /api/v1/admin/notifications every 15 s via React Query
 * - Shows unread count badge on the bell
 * - Color-codes notifications by type
 * - Marks individual notifications as read on click
 * - "Mark all" shortcut button
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { BellAlertIcon } from "@heroicons/react/24/solid";
import { notificationAPI } from "../../services/adminAPI";

// ── Type metadata ──────────────────────────────────────────────────────────
const TYPE_META = {
  fraud: {
    badgeClass: "badge-red",
    dot: "bg-red-500",
    label: "Fraud Alert",
    icon: "🚨",
  },
  transaction: {
    badgeClass: "badge-blue",
    dot: "bg-blue-500",
    label: "Transaction",
    icon: "💳",
  },
  user_signup: {
    badgeClass: "badge-green",
    dot: "bg-emerald-500",
    label: "New User",
    icon: "👤",
  },
  enrollment: {
    badgeClass: "badge-violet",
    dot: "bg-violet-500",
    label: "Enrollment",
    icon: "🎓",
  },
  merchant: {
    badgeClass: "badge-yellow",
    dot: "bg-amber-500",
    label: "Merchant",
    icon: "🏪",
  },
  system: {
    badgeClass: "badge-gray",
    dot: "bg-slate-400",
    label: "System",
    icon: "⚙️",
  },
};

function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.system;
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch notifications — polls every 15 s
  const { data, isLoading } = useQuery({
    queryKey: ["adminNotifications"],
    queryFn: () => notificationAPI.getNotifications({ limit: 20 }),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });

  const notifications = useMemo(() => data?.data ?? [], [data]);
  const unreadCount = data?.pagination?.unreadCount ?? 0;
  const displayCount =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  // Mark-as-read mutation
  const markRead = useMutation({
    mutationFn: (id) => notificationAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
    },
  });

  // Mark all visible unread as read
  const markAllRead = useCallback(() => {
    const unread = notifications.filter((n) => !n.read);
    unread.forEach((n) => markRead.mutate(n.$id));
  }, [notifications, markRead]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-5 w-5 text-blue-600" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}
        {displayCount && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center tabular">
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] flex flex-col
                     bg-white rounded-2xl border border-slate-100 shadow-modal
                     animate-fade-in z-50 overflow-hidden"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <BellIcon className="h-4.5 w-4.5 text-slate-500" />
              <span className="font-semibold text-slate-800 text-sm">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="badge-blue text-[10px] px-1.5 py-0.5">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Mark all as read"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close notifications"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-3/4 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
                <BellIcon className="h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs">No notifications yet.</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const meta = typeMeta(n.type);
                  const isUnread = !n.read;
                  return (
                    <li key={n.$id}>
                      <button
                        className={`w-full text-left px-5 py-3.5 flex gap-3 hover:bg-slate-50 transition-colors duration-100 border-b border-slate-50 last:border-0 ${
                          isUnread ? "bg-blue-50/40" : ""
                        }`}
                        onClick={() => {
                          if (isUnread) markRead.mutate(n.$id);
                        }}
                        disabled={markRead.isPending}
                      >
                        {/* Type indicator dot */}
                        <div className="shrink-0 mt-1">
                          <span
                            className={`flex h-2 w-2 rounded-full mt-1 ${
                              isUnread ? meta.dot : "bg-slate-200"
                            }`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isUnread ? "text-slate-900" : "text-slate-600"
                              }`}
                            >
                              {meta.icon} {n.title}
                            </span>
                            <span className="shrink-0">
                              <span className={meta.badgeClass}>
                                {meta.label}
                              </span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[11px] text-slate-400 mt-1 block tabular">
                            {timeAgo(n.$createdAt)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 shrink-0 bg-slate-50/60">
              <p className="text-xs text-slate-400 text-center">
                Showing latest {notifications.length} notifications •
                Auto-refreshes every 15 s
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
