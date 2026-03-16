/* eslint-disable no-unused-vars */
import React from "react";
import { cn } from "../../utils";
import { Button, Badge } from "../ui";
import {
  DashboardCard,
  DashboardWidget,
  DashboardGrid,
} from "../layout/DashboardUtils";

/**
 * Enhanced Stats Card for Financial Metrics
 * Mobile-optimized with responsive text sizing
 */
const FinanceStatsCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  trend,
  subtitle,
  loading = false,
  className,
  ...props
}) => {
  const changeTypeColors = {
    positive: "text-green-600 bg-green-50",
    negative: "text-red-600 bg-red-50",
    neutral: "text-neutral-600 bg-neutral-50",
  };

  const changeIcon = {
    positive: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    negative: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  if (loading) {
    return (
      <DashboardCard className={className} {...props}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="w-4 h-4 bg-neutral-200 rounded"></div>
            <div className="w-8 h-8 bg-neutral-200 rounded-lg"></div>
          </div>
          <div className="w-24 h-8 bg-neutral-200 rounded mb-1"></div>
          <div className="w-16 h-4 bg-neutral-200 rounded"></div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className={className} {...props}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        {icon && (
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
            {icon}
          </div>
        )}
      </div>

      <div className="mb-2">
        <p className="text-2xl lg:text-3xl font-bold text-neutral-900">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
        )}
      </div>

      {change && (
        <div
          className={cn(
            "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
            changeTypeColors[changeType]
          )}
        >
          {changeType !== "neutral" && changeIcon[changeType]}
          <span>{change}</span>
        </div>
      )}

      {trend && (
        <div className="mt-3 h-8">
          {/* Placeholder for trend chart - can be replaced with actual chart */}
          <div className="flex items-end space-x-1 h-full">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-sm",
                  changeType === "positive" ? "bg-green-200" : "bg-red-200"
                )}
                style={{ height: `${Math.random() * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
};

/**
 * Financial Transaction List Item
 * Mobile-optimized transaction display
 */
const FinanceTransactionItem = ({
  transaction,
  onClick,
  className,
  showDate = true,
  ...props
}) => {
  const getTransactionIcon = (type) => {
    const iconClass = "w-8 h-8 rounded-lg flex items-center justify-center";

    switch (type) {
      case "received":
        return (
          <div className={cn(iconClass, "bg-green-100")}>
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
        );
      case "sent":
        return (
          <div className={cn(iconClass, "bg-red-100")}>
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>
        );
      case "bill":
        return (
          <div className={cn(iconClass, "bg-blue-100")}>
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className={cn(iconClass, "bg-neutral-100")}>
            <svg
              className="w-4 h-4 text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
        );
    }
  };

  const getAmountColor = (type) => {
    switch (type) {
      case "received":
        return "text-green-600";
      case "sent":
        return "text-red-600";
      default:
        return "text-neutral-900";
    }
  };

  const formatAmount = (amount, type) => {
    const prefix = type === "received" ? "+" : type === "sent" ? "-" : "";
    return `${prefix}$${Math.abs(amount).toLocaleString()}`;
  };

  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-4 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {getTransactionIcon(transaction.type)}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {transaction.description || transaction.recipient || "Transaction"}
          </p>
          <p
            className={cn(
              "text-sm font-semibold ml-2",
              getAmountColor(transaction.type)
            )}
          >
            {formatAmount(transaction.amount, transaction.type)}
          </p>
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-neutral-500">
            {transaction.category || "General"}
          </p>
          {showDate && (
            <p className="text-xs text-neutral-500">
              {new Date(transaction.date).toLocaleDateString()}
            </p>
          )}
        </div>

        {transaction.status && transaction.status !== "completed" && (
          <div className="mt-2">
            <Badge
              variant={
                transaction.status === "pending" ? "warning" : "destructive"
              }
              size="sm"
            >
              {transaction.status}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Financial Account/Wallet Card
 * Mobile-optimized account display
 */
const FinanceAccountCard = ({
  account,
  onClick,
  className,
  showBalance = true,
  actions,
  ...props
}) => {
  const getAccountIcon = (type) => {
    switch (type) {
      case "checking":
        return (
          <svg
            className="w-6 h-6"
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
        );
      case "savings":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case "crypto":
        return (
          <svg
            className="w-6 h-6"
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
        );
      default:
        return (
          <svg
            className="w-6 h-6"
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
        );
    }
  };

  return (
    <DashboardCard
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200",
        "hover:border-primary-200",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
            {getAccountIcon(account.type)}
          </div>
          <div>
            <h3 className="font-medium text-neutral-900">{account.name}</h3>
            <p className="text-sm text-neutral-500">
              {account.type} • {account.number}
            </p>
          </div>
        </div>

        {account.status && (
          <Badge
            variant={account.status === "active" ? "success" : "warning"}
            size="sm"
          >
            {account.status}
          </Badge>
        )}
      </div>

      {showBalance && (
        <div className="mb-4">
          <p className="text-2xl font-bold text-neutral-900">
            ${account.balance?.toLocaleString()}
          </p>
          {account.availableBalance &&
            account.availableBalance !== account.balance && (
              <p className="text-sm text-neutral-500">
                ${account.availableBalance.toLocaleString()} available
              </p>
            )}
        </div>
      )}

      {actions && (
        <div className="flex space-x-2 pt-4 border-t border-neutral-100">
          {actions}
        </div>
      )}
    </DashboardCard>
  );
};

/**
 * Quick Actions Grid
 * Mobile-optimized action buttons for financial operations
 */
const FinanceQuickActions = ({ actions = [], className, ...props }) => {
  const defaultActions = [
    {
      id: "send",
      label: "Send Money",
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
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      ),
      color: "bg-blue-500 hover:bg-blue-600",
      href: "/send",
    },
    {
      id: "receive",
      label: "Receive",
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
            d="M7 16l-4-4m0 0l4-4m-4 4h18"
          />
        </svg>
      ),
      color: "bg-green-500 hover:bg-green-600",
      href: "/receive",
    },
    {
      id: "bills",
      label: "Pay Bills",
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
      color: "bg-purple-500 hover:bg-purple-600",
      href: "/bills",
    },
    {
      id: "exchange",
      label: "Exchange",
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
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      color: "bg-indigo-500 hover:bg-indigo-600",
      href: "/exchange",
    },
  ];

  const actionsToShow = actions.length > 0 ? actions : defaultActions;

  return (
    <DashboardGrid
      columns={2}
      gap="sm"
      className={cn("sm:grid-cols-4", className)}
      {...props}
    >
      {actionsToShow.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          className={cn(
            "flex flex-col items-center justify-center h-20 space-y-2",
            "text-white border-0 rounded-xl",
            "transition-all duration-200 transform hover:scale-105",
            action.color || "bg-primary-500 hover:bg-primary-600"
          )}
          onClick={() =>
            action.onClick
              ? action.onClick()
              : (window.location.href = action.href)
          }
        >
          {action.icon}
          <span className="text-xs font-medium">{action.label}</span>
        </Button>
      ))}
    </DashboardGrid>
  );
};

export {
  FinanceStatsCard,
  FinanceTransactionItem,
  FinanceAccountCard,
  FinanceQuickActions,
};
