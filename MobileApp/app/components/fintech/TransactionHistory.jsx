import React, { useState } from "react";
import { cn } from "../../utils";
import { Button, Badge } from "../ui";
import { DashboardCard, DashboardGrid } from "../layout/DashboardUtils";

/**
 * Transaction History Header
 */
const TransactionHistoryHeader = ({ totalTransactions, onExport }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Transaction History
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          View and manage your transaction history
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onExport}>
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export
        </Button>
      </div>
    </div>
  );
};

/**
 * Balance Cards Component
 */
const BalanceCards = ({ balances, loading = false }) => {
  if (loading) {
    return (
      <DashboardGrid columns={3} gap="md">
        {[1, 2, 3].map((index) => (
          <BalanceCardSkeleton key={index} />
        ))}
      </DashboardGrid>
    );
  }

  return (
    <DashboardGrid columns={3} gap="md">
      {balances.map((balance) => (
        <BalanceCard key={balance.id} {...balance} />
      ))}
    </DashboardGrid>
  );
};

/**
 * Individual Balance Card
 */
const BalanceCard = ({
  type,
  title,
  amount,
  currency,
  change,
  changeType,
  icon,
}) => {
  const getIcon = (iconType) => {
    const icons = {
      wallet: (
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
      cash: (
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
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"
          />
        </svg>
      ),
      clock: (
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };
    return icons[iconType] || icons.wallet;
  };

  const getChangeColor = (type) => {
    return (
      {
        positive: "text-green-600",
        negative: "text-red-600",
        neutral: "text-neutral-600",
      }[type] || "text-neutral-600"
    );
  };

  return (
    <DashboardCard className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
              {getIcon(icon)}
            </div>
            <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-neutral-900 currency">
              ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p
              className={cn("text-sm font-medium", getChangeColor(changeType))}
            >
              {change} from last month
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};

/**
 * Balance Card Skeleton
 */
const BalanceCardSkeleton = () => {
  return (
    <DashboardCard className="p-6">
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-neutral-200 rounded-lg"></div>
          <div className="h-4 bg-neutral-200 rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-8 bg-neutral-200 rounded w-32"></div>
          <div className="h-4 bg-neutral-200 rounded w-28"></div>
        </div>
      </div>
    </DashboardCard>
  );
};

/**
 * Transaction Filters
 */
const TransactionFilters = ({
  filters,
  onFilterChange,
  onSearch,
  searchTerm,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const filterOptions = {
    type: [
      { value: "all", label: "All Types" },
      { value: "received", label: "Received" },
      { value: "sent", label: "Sent" },
      { value: "transfer", label: "Transfer" },
      { value: "bill", label: "Bill Payment" },
    ],
    status: [
      { value: "all", label: "All Status" },
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
      { value: "failed", label: "Failed" },
    ],
    category: [
      { value: "all", label: "All Categories" },
      { value: "Income", label: "Income" },
      { value: "Food & Dining", label: "Food & Dining" },
      { value: "Utilities", label: "Utilities" },
      { value: "Transfer", label: "Transfer" },
      { value: "Shopping", label: "Shopping" },
    ],
    dateRange: [
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 3 months" },
      { value: "1y", label: "Last year" },
    ],
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400"
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
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {filterOptions.type.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {filterOptions.status.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => onFilterChange({ dateRange: e.target.value })}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {filterOptions.dateRange.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            More Filters
          </Button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => onFilterChange({ category: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                {filterOptions.category.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Amount Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onFilterChange({
                    type: "all",
                    status: "all",
                    category: "all",
                    dateRange: "30d",
                  });
                  onSearch("");
                }}
                className="w-full"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Transaction List
 */
const TransactionList = ({ transactions }) => {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Transaction
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Date
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Individual Transaction Item
 */
const TransactionItem = ({ transaction }) => {
  const getTypeIcon = (type) => {
    const icons = {
      received: (
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
      sent: (
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
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      ),
      transfer: (
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
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      bill: (
        <svg
          className="w-4 h-4 text-orange-600"
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
    };
    return icons[type] || icons.sent;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: "success", label: "Completed" },
      pending: { color: "warning", label: "Pending" },
      failed: { color: "error", label: "Failed" },
    };

    const config = statusConfig[status] || statusConfig.completed;
    return (
      <Badge variant={config.color} size="sm">
        {config.label}
      </Badge>
    );
  };

  const getAmountColor = (type) => {
    return (
      {
        received: "text-green-600",
        sent: "text-red-600",
        transfer: "text-blue-600",
        bill: "text-orange-600",
      }[type] || "text-neutral-900"
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-neutral-50 rounded-lg flex-shrink-0">
            {getTypeIcon(transaction.type)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-900 truncate">
              {transaction.description}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {transaction.type === "received"
                ? `From: ${transaction.from}`
                : `To: ${transaction.to}`}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Ref: {transaction.reference}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-neutral-600 capitalize">
          {transaction.type === "bill" ? "Bill Payment" : transaction.type}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <p
          className={cn(
            "text-sm font-semibold currency",
            getAmountColor(transaction.type)
          )}
        >
          {transaction.type === "received" ? "+" : "-"}$
          {transaction.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Balance: $
          {transaction.balance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </p>
      </td>
      <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <p className="text-neutral-900 font-medium">
            {formatDate(transaction.date)}
          </p>
          <p className="text-neutral-500 text-xs">
            {formatTime(transaction.date)}
          </p>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <Button variant="ghost" size="sm">
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
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </Button>
      </td>
    </tr>
  );
};

/**
 * Transaction Loading Skeleton
 */
const TransactionLoading = () => {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Transaction
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Date
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
              <tr key={index} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-neutral-200 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-neutral-200 rounded w-48"></div>
                      <div className="h-3 bg-neutral-200 rounded w-32"></div>
                      <div className="h-3 bg-neutral-200 rounded w-24"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-neutral-200 rounded w-16"></div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="space-y-2">
                    <div className="h-4 bg-neutral-200 rounded w-20 ml-auto"></div>
                    <div className="h-3 bg-neutral-200 rounded w-24 ml-auto"></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 bg-neutral-200 rounded w-20"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-neutral-200 rounded w-20"></div>
                    <div className="h-3 bg-neutral-200 rounded w-16"></div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="h-8 w-8 bg-neutral-200 rounded ml-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Transaction Empty State
 */
const TransactionEmpty = ({ hasFilters, onClearFilters }) => {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-12">
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-neutral-400"
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

        {hasFilters ? (
          <>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              No transactions found
            </h3>
            <p className="text-neutral-600 mb-6">
              No transactions match your current filters. Try adjusting your
              search criteria or clear all filters to see all transactions.
            </p>
            <Button onClick={onClearFilters}>Clear All Filters</Button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              No transactions yet
            </h3>
            <p className="text-neutral-600 mb-6">
              You haven't made any transactions yet. When you do, they'll appear
              here.
            </p>
            <Button>Make Your First Transaction</Button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Transaction Pagination
 */
const TransactionPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const maxVisiblePages = 5;
    const half = Math.floor(maxVisiblePages / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    if (end - start < maxVisiblePages - 1) {
      if (start === 1) {
        end = Math.min(totalPages, start + maxVisiblePages - 1);
      } else {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-neutral-200">
      <div className="flex-1 flex justify-between items-center">
        <div>
          <p className="text-sm text-neutral-700">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous
          </Button>

          <div className="flex space-x-1">
            {getVisiblePages().map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg transition-colors",
                  currentPage === page
                    ? "bg-primary-500 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <svg
              className="w-4 h-4 ml-1"
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
          </Button>
        </div>
      </div>
    </div>
  );
};

export {
  TransactionHistoryHeader,
  BalanceCards,
  BalanceCard,
  BalanceCardSkeleton,
  TransactionFilters,
  TransactionList,
  TransactionItem,
  TransactionLoading,
  TransactionEmpty,
  TransactionPagination,
};
