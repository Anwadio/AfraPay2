import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../utils";
import { Button, Badge, Avatar } from "../ui";

const DashboardSidebar = ({ isOpen, onClose, className, user, ...props }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    {
      section: "Overview",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: (
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
          ),
          badge: null,
        },
      ],
    },
    {
      section: "Accounts",
      items: [
        {
          name: "Wallets",
          href: "/wallets",
          icon: (
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          ),
          badge: { text: "2", variant: "primary" },
        },
        {
          name: "Transactions",
          href: "/transactions",
          icon: (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
          badge: null,
        },
      ],
    },
    {
      section: "Learning",
      items: [
        {
          name: "Education Hub",
          href: "/education",
          icon: (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          ),
          badge: { text: "New", variant: "success" },
        },
      ],
    },
  ];

  const isActive = (href) => location.pathname === href;

  const handleLinkClick = (href) => {
    navigate(href);
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-neutral-200 z-50 transition-all duration-300 ease-in-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static",
          isCollapsed ? "lg:w-16" : "lg:w-64",
          "w-64",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <Link
            to="/dashboard"
            className={cn(
              "flex items-center space-x-3 font-bold text-xl text-primary-600",
              isCollapsed && "lg:justify-center lg:space-x-0"
            )}
            onClick={() => handleLinkClick("/dashboard")}
          >
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AP</span>
            </div>
            {(!isCollapsed || window.innerWidth < 1024) && <span>AfraPay</span>}
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="hidden lg:flex p-1.5 h-auto"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              )}
            </svg>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden p-1.5 h-auto"
            aria-label="Close sidebar"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {user && (
          <div
            className={cn(
              "p-4 border-b border-neutral-200",
              isCollapsed && "lg:p-2"
            )}
          >
            <div
              className={cn(
                "flex items-center space-x-3",
                isCollapsed && "lg:justify-center lg:space-x-0"
              )}
            >
              <Avatar
                src={user.avatar}
                alt={user.name}
                size={isCollapsed ? "sm" : "md"}
                fallback={user.name?.charAt(0).toUpperCase()}
              />
              {(!isCollapsed || window.innerWidth < 1024) && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationItems.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {(!isCollapsed || window.innerWidth < 1024) && (
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  {section.section}
                </h3>
              )}

              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const active = isActive(item.href);
                  return (
                    <button
                      key={itemIndex}
                      onClick={() => handleLinkClick(item.href)}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                        "hover:bg-primary-50 hover:text-primary-700",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                        active
                          ? "bg-primary-100 text-primary-700 border-r-2 border-primary-500"
                          : "text-neutral-600 hover:text-neutral-900",
                        isCollapsed && "lg:justify-center lg:space-x-0"
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {(!isCollapsed || window.innerWidth < 1024) && (
                        <>
                          <span className="flex-1 text-left">{item.name}</span>
                          {item.badge && (
                            <Badge
                              variant={item.badge.variant}
                              size="sm"
                              className="ml-auto"
                            >
                              {item.badge.text}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            "p-4 border-t border-neutral-200",
            isCollapsed && "lg:p-2"
          )}
        >
          {(!isCollapsed || window.innerWidth < 1024) && (
            <div className="text-xs text-neutral-500 text-center">
              <p>&copy; 2026 AfraPay</p>
              <p>v2.1.0</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export { DashboardSidebar };
