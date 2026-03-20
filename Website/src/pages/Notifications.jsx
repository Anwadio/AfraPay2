/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  ArrowLeftRight,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Info,
  Gift,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  SectionHeader,
  GlassCard,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { notificationsAPI } from "../services/api";
import { cn } from "../utils";

/* ── Demo fallback data ───────────────────────────────────────────────────── */
const DEMO_NOTIFICATIONS = [
  {
    $id: "n1",
    type: "payment",
    title: "Payment Received",
    message: "You received $1,000.00 from Freelance Invoice #2048.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    $id: "n2",
    type: "transaction",
    title: "Transfer Sent",
    message: "GHS 150.00 sent to Kofi Mensah via MTN MoMo.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    $id: "n3",
    type: "security",
    title: "New Login Detected",
    message:
      "A new sign-in was detected from Chrome on Windows. If this wasn't you, secure your account.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    $id: "n4",
    type: "alert",
    title: "Low Balance Warning",
    message: "Your USD wallet balance is below $100. Consider topping up.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    $id: "n5",
    type: "promo",
    title: "Referral Bonus Unlocked 🎉",
    message:
      "Your friend joined AfraPay using your code. $5 has been credited to your wallet.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    $id: "n6",
    type: "info",
    title: "System Maintenance Scheduled",
    message:
      "AfraPay will undergo scheduled maintenance on Mar 20, 2026 from 2–4 AM UTC.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function timeAgo(isoString) {
  if (!isoString) return "";
  const ts = new Date(isoString).getTime();
  if (isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_META = {
  payment: {
    icon: DollarSign,
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    color: "text-emerald-600 dark:text-emerald-400",
    badge: "success",
  },
  transaction: {
    icon: ArrowLeftRight,
    bg: "bg-blue-100 dark:bg-blue-900/40",
    color: "text-blue-600 dark:text-blue-400",
    badge: "primary",
  },
  security: {
    icon: ShieldCheck,
    bg: "bg-red-100 dark:bg-red-900/40",
    color: "text-red-600 dark:text-red-400",
    badge: "danger",
  },
  alert: {
    icon: AlertTriangle,
    bg: "bg-amber-100 dark:bg-amber-900/40",
    color: "text-amber-600 dark:text-amber-400",
    badge: "warning",
  },
  promo: {
    icon: Gift,
    bg: "bg-purple-100 dark:bg-purple-900/40",
    color: "text-purple-600 dark:text-purple-400",
    badge: "secondary",
  },
  info: {
    icon: Info,
    bg: "bg-neutral-100 dark:bg-neutral-700",
    color: "text-neutral-500 dark:text-neutral-400",
    badge: "default",
  },
};

function getMeta(type) {
  return TYPE_META[type] ?? TYPE_META.info;
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

/* ── NotificationItem ─────────────────────────────────────────────────────── */
function NotificationItem({ notif, onMarkRead, onDelete }) {
  const meta = getMeta(notif.type);
  const Icon = meta.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl transition-colors group",
        notif.read
          ? "bg-neutral-50 dark:bg-neutral-800/40"
          : "bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700/60",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          meta.bg,
        )}
      >
        <Icon className={cn("w-4 h-4", meta.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p
            className={cn(
              "text-sm font-semibold truncate",
              notif.read
                ? "text-neutral-600 dark:text-neutral-300"
                : "text-neutral-900 dark:text-white",
            )}
          >
            {notif.title}
          </p>
          {!notif.read && (
            <span
              className="w-2 h-2 rounded-full bg-blue-500 shrink-0"
              aria-label="Unread"
            />
          )}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-1">
          {notif.message}
        </p>
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
          {timeAgo(notif.$createdAt || notif.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.read && (
          <button
            onClick={() => onMarkRead(notif.$id)}
            title="Mark as read"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(notif.$id)}
          title="Delete"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getNotifications({ limit: 50 });
      if (res?.success && res.data) {
        setNotifications(res.data.notifications || []);
      } else {
        setNotifications(DEMO_NOTIFICATIONS);
      }
    } catch {
      setNotifications(DEMO_NOTIFICATIONS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
    } catch {
      // optimistic — ignore API error
    }
    setNotifications((prev) =>
      prev.map((n) => (n.$id === id ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
    } catch {
      // optimistic
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.deleteNotification(id);
    } catch {
      // optimistic
    }
    setNotifications((prev) => prev.filter((n) => n.$id !== id));
  };

  const handleClearAll = () => setNotifications([]);

  /* ── Derived ──────────────────────────────────────────────────────────────── */
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  /* ── Category summary counts ──────────────────────────────────────────────── */
  const typeCounts = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        {/* Header */}
        <AnimatedSection>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <SectionHeader
              title="Notifications"
              subtitle={
                unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "You're all caught up"
              }
              icon={<Bell className="w-6 h-6" />}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </Button>
              )}
            </div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main list */}
          <div className="lg:col-span-3">
            <AnimatedSection delay={0.05}>
              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 mb-4 w-fit">
                {FILTER_TABS.map((tab) => {
                  const count =
                    tab.key === "all"
                      ? notifications.length
                      : tab.key === "unread"
                        ? unreadCount
                        : notifications.length - unreadCount;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5",
                        filter === tab.key
                          ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white",
                      )}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                            filter === tab.key
                              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                              : "bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* List */}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
                  <BellOff className="w-14 h-14 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <p className="text-base font-semibold text-neutral-600 dark:text-neutral-400">
                    {filter === "unread"
                      ? "No unread notifications"
                      : filter === "read"
                        ? "No read notifications"
                        : "No notifications yet"}
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    {filter === "all"
                      ? "We'll notify you when something happens."
                      : `Switch to "All" to see everything.`}
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {filtered.map((notif) => (
                      <NotificationItem
                        key={notif.$id}
                        notif={notif}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </AnimatedSection>
          </div>

          {/* Right column: summary */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Overview card */}
            <AnimatedSection delay={0.08}>
              <GlassCard className="p-4">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-3">
                  Overview
                </p>
                <div className="space-y-2">
                  {[
                    {
                      label: "Total",
                      value: notifications.length,
                      color: "text-neutral-700 dark:text-neutral-200",
                    },
                    {
                      label: "Unread",
                      value: unreadCount,
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      label: "Read",
                      value: notifications.length - unreadCount,
                      color: "text-neutral-400",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center"
                    >
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {row.label}
                      </span>
                      <span className={cn("text-sm font-bold", row.color)}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </AnimatedSection>

            {/* By category */}
            <AnimatedSection delay={0.11}>
              <GlassCard className="p-4">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-3">
                  By Category
                </p>
                <div className="space-y-2">
                  {Object.entries(TYPE_META).map(([type, meta]) => {
                    const count = typeCounts[type] || 0;
                    if (!count) return null;
                    const Icon = meta.icon;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                            meta.bg,
                          )}
                        >
                          <Icon className={cn("w-3 h-3", meta.color)} />
                        </div>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 flex-1 capitalize">
                          {type}
                        </span>
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </AnimatedSection>

            {/* Preferences hint */}
            <AnimatedSection delay={0.14}>
              <GlassCard className="p-4 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  Notification Preferences
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed mb-3">
                  Manage which alerts you receive in Settings.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-blue-300 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  onClick={() => window.location.assign("/settings")}
                >
                  Go to Settings
                </Button>
              </GlassCard>
            </AnimatedSection>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Notifications;
