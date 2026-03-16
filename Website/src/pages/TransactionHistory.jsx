import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardSection } from "../components/layout/DashboardUtils";
import { useAuth } from "../contexts/AuthContext";
import { userAPI, transactionAPI, walletAPI } from "../services/api";
import {
  TransactionHistoryHeader,
  BalanceCards,
  TransactionList,
  TransactionFilters,
  TransactionPagination,
  TransactionEmpty,
  TransactionLoading,
} from "../components/fintech/TransactionHistory";

const ITEMS_PER_PAGE = 10;

// Map a backend transaction document to the shape expected by TransactionItem
const mapTransaction = (t) => {
  const typeMap = {
    deposit: "received",
    refund: "received",
    withdrawal: "sent",
    fee: "sent",
    transfer: "transfer",
    payment: "bill",
  };
  const categoryMap = {
    deposit: "Income",
    refund: "Income",
    transfer: "Transfer",
    payment: "Payments",
    withdrawal: "Withdrawals",
    fee: "Fees",
  };
  const displayType = typeMap[t.type] || "sent";
  const isIncoming = displayType === "received";
  return {
    id: t.id,
    type: displayType,
    amount: t.amount,
    currency: t.currency,
    description: t.description || `${t.type} transaction`,
    from: isIncoming ? t.counterparty || "External" : "Your Account",
    to: isIncoming ? "Your Account" : t.counterparty || "External",
    date: t.createdAt,
    status: t.status,
    reference: t.reference,
    category: categoryMap[t.type] || "Other",
    balance: null,
  };
};

// Convert a dateRange key ("7d", "30d", etc.) to ISO startDate/endDate
const dateRangeToParams = (dateRange) => {
  const now = new Date();
  const daysMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const days = daysMap[dateRange] || 30;
  const start = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  return { startDate: start, endDate: now.toISOString() };
};

const TransactionHistory = () => {
  const { user } = useAuth();

  // Layout user
  const [profile, setProfile] = useState(null);

  // Balance cards
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  // Transaction list
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    dateRange: "30d",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters or debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearch]);

  // Fetch transactions from backend
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = dateRangeToParams(filters.dateRange);
        const params = {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          startDate,
          endDate,
        };
        if (filters.type !== "all") params.type = filters.type;
        if (filters.status !== "all") params.status = filters.status;
        if (debouncedSearch) params.search = debouncedSearch;

        const res = await transactionAPI.getTransactions(params);
        if (res.success) {
          setTransactions((res.data || []).map(mapTransaction));
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalItems(res.pagination?.totalItems || 0);
        }
      } catch (err) {
        toast.error("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [currentPage, filters, debouncedSearch]);

  // Fetch balances and profile once on mount
  useEffect(() => {
    Promise.all([
      walletAPI.getBalances().catch(() => null),
      transactionAPI.getSummary({ period: "month" }).catch(() => null),
      userAPI.getProfile().catch(() => null),
    ]).then(([walletRes, summaryRes, profileRes]) => {
      if (profileRes?.success && profileRes.data) setProfile(profileRes.data);
      const totalUSD = walletRes?.data?.totalValueUSD ?? 0;
      const income = summaryRes?.data?.incomingAmount ?? 0;
      const expenses = summaryRes?.data?.outgoingAmount ?? 0;
      const currency = summaryRes?.data?.currency || "USD";
      setBalances([
        {
          id: 1,
          type: "total",
          title: "Total Balance",
          amount: totalUSD,
          currency: "USD",
          change: "",
          changeType: "neutral",
          icon: "wallet",
        },
        {
          id: 2,
          type: "available",
          title: "Monthly Income",
          amount: income,
          currency,
          change: "",
          changeType: "positive",
          icon: "cash",
        },
        {
          id: 3,
          type: "pending",
          title: "Monthly Expenses",
          amount: expenses,
          currency,
          change: "",
          changeType: "negative",
          icon: "clock",
        },
      ]);
      setLoadingBalances(false);
    });
  }, []);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleExport = async () => {
    try {
      const { startDate, endDate } = dateRangeToParams(filters.dateRange);
      const params = { startDate, endDate };
      if (filters.type !== "all") params.type = filters.type;
      if (filters.status !== "all") params.status = filters.status;
      const res = await transactionAPI.exportTransactions("csv", params);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Transactions exported successfully");
    } catch (err) {
      toast.error("Failed to export transactions");
    }
  };

  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
      profile.name
    : user?.name || user?.email || "User";

  const dashboardUser = {
    name: displayName,
    email: profile?.email || user?.email || "",
    avatar: profile?.avatar || null,
    role: user?.role || "user",
  };

  const hasFilters =
    filters.type !== "all" || filters.status !== "all" || searchTerm !== "";

  return (
    <DashboardLayout user={dashboardUser} className="h-screen">
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <TransactionHistoryHeader
          totalTransactions={totalItems}
          onExport={handleExport}
        />

        {/* Balance Cards */}
        <div className="flex-shrink-0">
          <DashboardSection title="Account Overview">
            <BalanceCards balances={balances} loading={loadingBalances} />
          </DashboardSection>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0">
          <TransactionFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            searchTerm={searchTerm}
          />
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-hidden">
          <DashboardSection
            title={`Transaction History (${totalItems})`}
            className="h-full flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <TransactionLoading />
              ) : transactions.length === 0 ? (
                <TransactionEmpty
                  hasFilters={hasFilters}
                  onClearFilters={() => {
                    setFilters({
                      type: "all",
                      status: "all",
                      dateRange: "30d",
                    });
                    setSearchTerm("");
                  }}
                />
              ) : (
                <>
                  <div className="flex-1 overflow-auto">
                    <TransactionList transactions={transactions} />
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4 flex-shrink-0">
                      <TransactionPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalItems={totalItems}
                        itemsPerPage={ITEMS_PER_PAGE}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </DashboardSection>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TransactionHistory;
