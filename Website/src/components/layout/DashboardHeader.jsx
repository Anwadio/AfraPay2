import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../../utils";
import { useAuth } from "../../contexts/AuthContext";
import { Button, Avatar } from "../ui";
import { notificationsAPI, transactionAPI } from "../../services/api";

/**
 * Enhanced Fintech Dashboard Header
 * Responsive header with user menu, notifications, and search
 */
const DashboardHeader = ({
  user,
  onToggleSidebar,
  className,
  showSearch = true,
  showNotifications = true,
  ...props
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = closed
  const [searchLoading, setSearchLoading] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // ── Real notifications state ────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsAPI.getNotifications({ limit: 20 });
      if (res?.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount ?? 0);
      }
    } catch {
      // Silently ignore — network errors shouldn't crash the header
    }
  }, []);

  // Fetch on mount and every 30 s, refresh immediately when dropdown opens
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  useEffect(() => {
    if (isNotificationsOpen) fetchNotifications();
  }, [isNotificationsOpen, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.$id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.$id !== id));
      const deleted = notifications.find((n) => n.$id === id);
      if (deleted && !deleted.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  // Icon by notification type
  const notifIcon = (type) => {
    const icons = {
      transaction: {
        bg: "bg-green-100 dark:bg-green-900/30",
        svg: (
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16l-4-4m0 0l4-4m-4 4h18"
            />
          </svg>
        ),
      },
      payment: {
        bg: "bg-green-100 dark:bg-green-900/30",
        svg: (
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      security: {
        bg: "bg-red-100 dark:bg-red-900/30",
        svg: (
          <svg
            className="w-4 h-4 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        ),
      },
      system: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        svg: (
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
    };
    const entry = icons[type] || icons.system;
    return (
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          entry.bg,
        )}
      >
        {entry.svg}
      </div>
    );
  };

  // Relative time helper
  const relativeTime = (isoString) => {
    if (!isoString) return "";
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Quick-nav links always available in results ─────────────────────────────
  const NAV_LINKS = [
    { label: "Dashboard", path: "/dashboard", icon: "home" },
    { label: "Transactions", path: "/transactions", icon: "list" },
    { label: "Education Hub", path: "/education", icon: "book" },
    { label: "Profile", path: "/profile", icon: "user" },
    { label: "Settings", path: "/settings", icon: "cog" },
    { label: "Help & Support", path: "/help", icon: "help" },
  ];

  const navIcon = (icon) => {
    const paths = {
      home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      list: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
      help: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    };
    return (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={paths[icon] || paths.home}
        />
      </svg>
    );
  };

  // Debounced real-time search: nav links (instant) + transactions (API, 350 ms)
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchDebounceRef.current);

    if (!q.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    // Instant nav matches
    const lower = q.toLowerCase();
    const navMatches = NAV_LINKS.filter((l) =>
      l.label.toLowerCase().includes(lower),
    );
    setSearchResults({ nav: navMatches, transactions: [], loading: true });
    setSearchLoading(true);

    // Debounce API call by 350 ms
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await transactionAPI.getTransactions({
          search: q,
          limit: 5,
        });
        const txns = res?.data?.transactions || res?.data?.data || [];
        setSearchResults({
          nav: navMatches,
          transactions: txns,
          loading: false,
        });
      } catch {
        setSearchResults((prev) => (prev ? { ...prev, loading: false } : null));
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  };

  const handleSearchSelect = (path) => {
    setSearchQuery("");
    setSearchResults(null);
    navigate(path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(
        `/transactions?search=${encodeURIComponent(searchQuery.trim())}`,
      );
      setSearchQuery("");
      setSearchResults(null);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setSearchResults(null);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b-2 border-b-secondary-500 backdrop-blur-md bg-gradient-to-r from-primary-50 via-white to-secondary-50/60 dark:bg-neutral-900 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900 dark:border-b-neutral-700",
        "px-4 lg:px-6 h-16",
        "flex items-center justify-between",
        className,
      )}
      {...props}
    >
      {/* Left section */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 h-auto"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </Button>

        {/* Search - Desktop */}
        {showSearch && (
          <div className="hidden md:flex relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {searchLoading ? (
                    <svg
                      className="w-4 h-4 text-primary-500 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-neutral-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  )}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() =>
                    searchQuery.trim() && setSearchResults((r) => r)
                  }
                  placeholder="Search transactions, pages..."
                  autoComplete="off"
                  className={cn(
                    "w-56 lg:w-80 pl-10 pr-8 py-2 text-sm",
                    "border border-neutral-200 dark:border-neutral-600 rounded-lg",
                    "bg-primary-50/70 focus:bg-white dark:bg-neutral-800 dark:focus:bg-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-400",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                    "transition-all duration-200",
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults(null);
                    }}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            {/* Real-time search popover */}
            {searchResults !== null && (
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden">
                {/* Navigation matches */}
                {searchResults.nav.length > 0 && (
                  <div>
                    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Pages
                    </p>
                    {searchResults.nav.map((link) => (
                      <button
                        key={link.path}
                        onClick={() => handleSearchSelect(link.path)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                          {navIcon(link.icon)}
                        </span>
                        <span className="font-medium">{link.label}</span>
                        <svg
                          className="w-3.5 h-3.5 ml-auto text-neutral-300 dark:text-neutral-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}

                {/* Transaction matches */}
                {searchResults.loading && (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-neutral-400 dark:text-neutral-500">
                    <svg
                      className="w-4 h-4 animate-spin flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Searching transactions…
                  </div>
                )}

                {!searchResults.loading &&
                  searchResults.transactions.length > 0 && (
                    <div>
                      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                        Transactions
                      </p>
                      {searchResults.transactions.map((tx) => (
                        <button
                          key={tx.$id || tx.id}
                          onClick={() =>
                            handleSearchSelect(
                              `/transactions?search=${encodeURIComponent(searchQuery)}`,
                            )
                          }
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <span
                            className={cn(
                              "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                              tx.type === "credit"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                            )}
                          >
                            {tx.type === "credit" ? "↓" : "↑"}
                          </span>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                              {tx.description || tx.reference || "Transaction"}
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">
                              {tx.currency} {tx.amount?.toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-semibold flex-shrink-0",
                              tx.status === "completed"
                                ? "text-green-600 dark:text-green-400"
                                : "text-yellow-600 dark:text-yellow-400",
                            )}
                          >
                            {tx.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                {/* No results */}
                {!searchResults.loading &&
                  searchResults.nav.length === 0 &&
                  searchResults.transactions.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
                      <svg
                        className="w-8 h-8 mx-auto mb-2 opacity-30"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      No results for "
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">
                        {searchQuery}
                      </span>
                      "
                    </div>
                  )}

                {/* Press enter hint */}
                <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    Press{" "}
                    <kbd className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-mono text-[10px]">
                      Enter
                    </kbd>{" "}
                    to search all transactions
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    <kbd className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-mono text-[10px]">
                      Esc
                    </kbd>{" "}
                    to close
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center section - Breadcrumb or title can go here */}
      <div className="hidden lg:flex items-center">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          AfraPay
        </h1>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-2">
        {/* Search - Mobile */}
        {showSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden p-2 h-auto"
            aria-label="Search"
            onClick={() => navigate("/transactions")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Button>
        )}

        {/* Quick Actions */}
        <div className="hidden sm:flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/send")}
            className="p-2 h-auto"
            title="Send Money"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/receive")}
            className="p-2 h-auto"
            title="Receive Money"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16l-4-4m0 0l4-4m-4 4h18"
              />
            </svg>
          </Button>
        </div>

        {/* Notifications */}
        {showNotifications && (
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                "relative p-2 rounded-lg transition-colors",
                "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
                isNotificationsOpen &&
                  "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100",
              )}
              aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
            >
              {/* Bell icon */}
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>

              {/* Badge with pulse ring */}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 min-w-[1.1rem] h-[1.1rem]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate("/notifications");
                        }}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        title="Go to notifications page"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-400 dark:text-neutral-500">
                      <svg
                        className="w-10 h-10 mb-2 opacity-40"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.$id}
                        className={cn(
                          "p-4 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors group",
                          !notification.read &&
                            "bg-primary-50/30 dark:bg-primary-900/20",
                        )}
                        onClick={() => {
                          handleMarkAsRead(notification.$id);
                          if (notification.link) {
                            setIsNotificationsOpen(false);
                            navigate(notification.link);
                          }
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          {notifIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                {notification.title}
                              </p>
                              <div className="flex items-center ml-2 gap-1">
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                                )}
                                <button
                                  onClick={(e) =>
                                    handleDeleteNotification(
                                      e,
                                      notification.$id,
                                    )
                                  }
                                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all"
                                  title="Dismiss"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                              {relativeTime(notification.$createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
                  <button
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate("/notifications");
                    }}
                  >
                    <span>View all notifications</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition-colors"
            aria-label="User menu"
          >
            <Avatar
              src={user?.avatar}
              alt={user?.name}
              size="sm"
              fallback={user?.name?.charAt(0).toUpperCase()}
            />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {user?.role || "Member"}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* User dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {user?.name || "User Name"}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email || "user@example.com"}
                </p>
              </div>

              <div className="py-2">
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Profile</span>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Settings</span>
                </Link>

                <Link
                  to="/help"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Help & Support</span>
                </Link>
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-700 py-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export { DashboardHeader };
