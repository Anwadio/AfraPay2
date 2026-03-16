import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../../utils";
import { Button, Badge, Avatar } from "../ui";

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: "transaction",
      title: "Payment Received",
      message: "$500.00 from John Smith",
      time: "2 min ago",
      unread: true,
      icon: (
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
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
        </div>
      ),
    },
    {
      id: 2,
      type: "security",
      title: "Security Alert",
      message: "New device login detected",
      time: "1 hour ago",
      unread: true,
      icon: (
        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
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
        </div>
      ),
    },
    {
      id: 3,
      type: "system",
      title: "System Update",
      message: "New features available",
      time: "2 hours ago",
      unread: false,
      icon: (
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
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
        </div>
      ),
    },
  ];

  const unreadNotifications = notifications.filter((n) => n.unread).length;

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    // Add logout logic here
    navigate("/login");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-white border-b border-neutral-200 backdrop-blur-md bg-white/95",
        "px-4 lg:px-6 h-16",
        "flex items-center justify-between",
        className
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
          <form onSubmit={handleSearch} className="hidden md:flex">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions, contacts..."
                className={cn(
                  "w-80 pl-10 pr-4 py-2 text-sm",
                  "border border-neutral-200 rounded-lg",
                  "bg-neutral-50 focus:bg-white",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                  "transition-all duration-200"
                )}
              />
            </div>
          </form>
        )}
      </div>

      {/* Center section - Breadcrumb or title can go here */}
      <div className="hidden lg:flex items-center">
        <h1 className="text-lg font-semibold text-neutral-900">Dashboard</h1>
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
            onClick={() => navigate("/search")}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 h-auto relative"
              aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ""}`}
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
                  d="M15 17h5l-5 5v-5zM4.06189 13c.863-.497 1.5-1.43 1.5-2.5s-.637-2.003-1.5-2.5L18 12l5-8-11.938 8z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 8a3 3 0 01-3-3V3a3 3 0 00-6 0v2a3 3 0 01-3 3"
                />
              </svg>
              {unreadNotifications > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center p-0 text-xs font-medium"
                  variant="destructive"
                >
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </Badge>
              )}
            </Button>

            {/* Notifications dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-neutral-200 z-50">
                <div className="p-4 border-b border-neutral-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900">
                      Notifications
                    </h3>
                    {unreadNotifications > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors",
                        notification.unread && "bg-primary-50/30"
                      )}
                      onClick={() => setIsNotificationsOpen(false)}
                    >
                      <div className="flex items-start space-x-3">
                        {notification.icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-neutral-900">
                              {notification.title}
                            </p>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full ml-2"></div>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-neutral-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-center text-primary-600 hover:text-primary-700"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate("/notifications");
                    }}
                  >
                    View all notifications
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            aria-label="User menu"
          >
            <Avatar
              src={user?.avatar}
              alt={user?.name}
              size="sm"
              fallback={user?.name?.charAt(0).toUpperCase()}
            />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-neutral-900">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-neutral-500">
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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 z-50">
              <div className="p-4 border-b border-neutral-200">
                <p className="text-sm font-medium text-neutral-900">
                  {user?.name || "User Name"}
                </p>
                <p className="text-xs text-neutral-500">
                  {user?.email || "user@example.com"}
                </p>
              </div>

              <div className="py-2">
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
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
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
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
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
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

              <div className="border-t border-neutral-200 py-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
