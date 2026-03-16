/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  DashboardSection,
  DashboardGrid,
} from "../components/layout/DashboardUtils";
import { Button } from "../components/ui";
import {
  TransactionHistoryHeader,
  BalanceCards,
  TransactionList,
  TransactionFilters,
  TransactionPagination,
  TransactionEmpty,
  TransactionLoading,
} from "../components/fintech/TransactionHistory";

// Mock user data
const mockUser = {
  name: "John Smith",
  email: "john.smith@example.com",
  avatar: null,
  role: "Premium Member",
};

// Mock balance data
const mockBalances = [
  {
    id: 1,
    type: "total",
    title: "Total Balance",
    amount: 24170.5,
    currency: "USD",
    change: "+2.5%",
    changeType: "positive",
    icon: "wallet",
  },
  {
    id: 2,
    type: "available",
    title: "Available Balance",
    amount: 22350.0,
    currency: "USD",
    change: "+1.8%",
    changeType: "positive",
    icon: "cash",
  },
  {
    id: 3,
    type: "pending",
    title: "Pending",
    amount: 1820.5,
    currency: "USD",
    change: "-15.2%",
    changeType: "negative",
    icon: "clock",
  },
];

// Mock transaction data
const mockTransactions = [
  {
    id: "tx_001",
    type: "received",
    amount: 2500.0,
    currency: "USD",
    description: "Salary Payment",
    from: "Employer Inc.",
    to: "Main Account",
    date: "2024-12-27T10:30:00Z",
    status: "completed",
    reference: "SAL_DEC_2024",
    category: "Income",
    balance: 24170.5,
  },
  {
    id: "tx_002",
    type: "sent",
    amount: 350.0,
    currency: "USD",
    description: "Grocery Shopping",
    from: "Main Account",
    to: "FreshMart",
    date: "2024-12-26T15:45:00Z",
    status: "completed",
    reference: "GRC_001234",
    category: "Food & Dining",
    balance: 21670.5,
  },
  {
    id: "tx_003",
    type: "bill",
    amount: 120.5,
    currency: "USD",
    description: "Internet Bill",
    from: "Main Account",
    to: "ISP Company",
    date: "2024-12-25T09:15:00Z",
    status: "completed",
    reference: "BILL_12345",
    category: "Utilities",
    balance: 22020.5,
  },
  {
    id: "tx_004",
    type: "sent",
    amount: 80.0,
    currency: "USD",
    description: "Coffee & Lunch",
    from: "Main Account",
    to: "Brew & Co.",
    date: "2024-12-25T12:30:00Z",
    status: "pending",
    reference: "CFE_5678",
    category: "Food & Dining",
    balance: 22141.0,
  },
  {
    id: "tx_005",
    type: "received",
    amount: 1200.0,
    currency: "USD",
    description: "Freelance Payment",
    from: "Tech Solutions",
    to: "Main Account",
    date: "2024-12-24T14:20:00Z",
    status: "completed",
    reference: "FRL_9876",
    category: "Income",
    balance: 22221.0,
  },
  {
    id: "tx_006",
    type: "transfer",
    amount: 500.0,
    currency: "USD",
    description: "Transfer to Savings",
    from: "Main Account",
    to: "Savings Account",
    date: "2024-12-23T16:00:00Z",
    status: "completed",
    reference: "TRF_3456",
    category: "Transfer",
    balance: 21021.0,
  },
];

const TransactionHistory = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    category: "all",
    dateRange: "30d",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const transactionsPerPage = 10;

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setTransactions(mockTransactions);
      setFilteredTransactions(mockTransactions);
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    // Filter by type
    if (filters.type !== "all") {
      filtered = filtered.filter((tx) => tx.type === filters.type);
    }

    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter((tx) => tx.status === filters.status);
    }

    // Filter by category
    if (filters.category !== "all") {
      filtered = filtered.filter((tx) => tx.category === filters.category);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (tx) =>
          tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, filters, searchTerm]);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Calculate pagination
  const totalPages = Math.ceil(
    filteredTransactions.length / transactionsPerPage
  );
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    endIndex
  );

  const handleExport = () => {
    console.log("Exporting transactions...");
    // Implement export functionality
  };

  return (
    <DashboardLayout user={mockUser} className="h-screen">
      <div className="space-y-6 h-full flex flex-col">
        {/* Header */}
        <TransactionHistoryHeader
          totalTransactions={filteredTransactions.length}
          onExport={handleExport}
        />

        {/* Balance Cards */}
        <div className="flex-shrink-0">
          <DashboardSection title="Account Overview">
            <BalanceCards balances={mockBalances} loading={loading} />
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
            title={`Transaction History (${filteredTransactions.length})`}
            className="h-full flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <TransactionLoading />
              ) : filteredTransactions.length === 0 ? (
                <TransactionEmpty
                  hasFilters={
                    filters.type !== "all" ||
                    filters.status !== "all" ||
                    filters.category !== "all" ||
                    searchTerm !== ""
                  }
                  onClearFilters={() => {
                    setFilters({
                      type: "all",
                      status: "all",
                      category: "all",
                      dateRange: "30d",
                    });
                    setSearchTerm("");
                  }}
                />
              ) : (
                <>
                  <div className="flex-1 overflow-auto">
                    <TransactionList transactions={paginatedTransactions} />
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4 flex-shrink-0">
                      <TransactionPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalItems={filteredTransactions.length}
                        itemsPerPage={transactionsPerPage}
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
