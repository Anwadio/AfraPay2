import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { transactionAPI } from "../services/adminAPI";
import toast from "react-hot-toast";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

// ── Status & Type metadata ────────────────────────────────────────────────────
const STATUS_META = {
  completed: { badge: "badge-green", label: "Completed", icon: "✓" },
  pending: { badge: "badge-yellow", label: "Pending", icon: "⏳" },
  processing: { badge: "badge-yellow", label: "Processing", icon: "⏳" },
  failed: { badge: "badge-red", label: "Failed", icon: "✕" },
  cancelled: { badge: "badge-gray", label: "Cancelled", icon: "—" },
  flagged: {
    badge:
      "badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20",
    label: "Flagged",
    icon: "⚑",
  },
};

const TYPE_META = {
  transfer: { badge: "badge-violet", label: "Transfer" },
  deposit: { badge: "badge-green", label: "Deposit" },
  withdrawal: { badge: "badge-yellow", label: "Withdrawal" },
  payment: { badge: "badge-blue", label: "Payment" },
  send_money: { badge: "badge-blue", label: "Send Money" },
  refund: { badge: "badge-gray", label: "Refund" },
};

function statusMeta(status) {
  return (
    STATUS_META[status] || {
      badge: "badge-gray",
      label: status || "Unknown",
      icon: "?",
    }
  );
}
function typeMeta(type) {
  return TYPE_META[type] || { badge: "badge-gray", label: type || "Unknown" };
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function formatAmount(amount, currency) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function shortId(id) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="table-container">
      <div className="p-5 space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 skeleton rounded w-24 shrink-0" />
            <div className="h-5 skeleton rounded-full w-16 shrink-0" />
            <div className="flex-1 h-4 skeleton rounded" />
            <div className="h-5 skeleton rounded w-20 shrink-0" />
            <div className="h-5 skeleton rounded-full w-16 shrink-0" />
            <div className="h-4 skeleton rounded w-24 shrink-0" />
            <div className="h-8 skeleton rounded-xl w-8 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="table-container">
      <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center">
          <BanknotesIcon className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          No transactions found
        </p>
        <p className="text-xs text-slate-400 max-w-xs text-center">
          {hasFilters
            ? "No results match the current filters."
            : "No transactions have been recorded yet."}
        </p>
        {hasFilters && (
          <button onClick={onClear} className="btn-secondary text-xs mt-1">
            <XMarkIcon className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, totalItems, limit } = pagination;
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);

  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <p className="text-xs text-slate-500 tabular">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of{" "}
        {totalItems.toLocaleString()} transactions
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-icon disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {/* Page numbers — show up to 7 around current */}
        {(() => {
          const pages = [];
          const delta = 2;
          for (
            let i = Math.max(1, page - delta);
            i <= Math.min(totalPages, page + delta);
            i++
          ) {
            pages.push(i);
          }
          return pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 rounded-xl text-xs font-medium transition-all ${
                p === page
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ));
        })()}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn-icon disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Transaction Detail Modal ──────────────────────────────────────────────────
function TransactionDetailModal({ txId, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["transactionDetail", txId],
    queryFn: () => transactionAPI.getTransactionById(txId),
    enabled: !!txId,
    staleTime: 30_000,
  });

  const tx = data?.data;

  const Field = ({ label, value, mono, copyable }) => (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5">
        <span
          className={`text-sm text-slate-800 break-all ${
            mono ? "font-mono text-xs" : "font-medium"
          }`}
        >
          {value || "—"}
        </span>
        {copyable && value && (
          <button
            onClick={() => copyToClipboard(value)}
            className="shrink-0 p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </dd>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Transaction details"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative min-h-full flex items-start justify-end pointer-events-none">
        <div
          className="relative w-full max-w-lg bg-white min-h-screen shadow-modal flex flex-col pointer-events-auto animate-fade-in"
          style={{ borderLeft: "1px solid #e2e8f0" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Transaction Details
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {shortId(txId)}
              </p>
            </div>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {isLoading && (
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2.5 skeleton rounded w-1/4" />
                    <div className="h-4 skeleton rounded w-3/4" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-700">
                  {error.response?.data?.message ||
                    "Failed to load transaction details."}
                </p>
              </div>
            )}

            {tx && (
              <>
                {/* Status + Amount hero */}
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900 tabular">
                      {formatAmount(tx.amount, tx.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={typeMeta(tx.type).badge}>
                        {typeMeta(tx.type).label}
                      </span>
                      <span className={statusMeta(tx.status).badge}>
                        {statusMeta(tx.status).label}
                      </span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <BanknotesIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>

                {/* Core fields */}
                <section>
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                    Transaction Info
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field
                      label="Transaction ID"
                      value={tx.$id || tx.id}
                      mono
                      copyable
                    />
                    <Field label="Type" value={typeMeta(tx.type).label} />
                    <Field label="Status" value={statusMeta(tx.status).label} />
                    <Field
                      label="Provider"
                      value={tx.provider || tx.paymentMethod || "—"}
                    />
                    <Field
                      label="Amount"
                      value={formatAmount(tx.amount, tx.currency)}
                    />
                    <Field label="Currency" value={tx.currency} />
                    {tx.description && (
                      <div className="col-span-2">
                        <Field label="Description" value={tx.description} />
                      </div>
                    )}
                    {tx.providerReference && (
                      <div className="col-span-2">
                        <Field
                          label="Provider Reference"
                          value={tx.providerReference}
                          mono
                          copyable
                        />
                      </div>
                    )}
                  </dl>
                </section>

                {/* Parties */}
                <section>
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                    Parties
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {(tx.senderId || tx.userId) && (
                      <Field
                        label="Sender ID"
                        value={tx.senderId || tx.userId}
                        mono
                        copyable
                      />
                    )}
                    {tx.user?.email && (
                      <Field label="Sender Email" value={tx.user.email} />
                    )}
                    {tx.user?.name && (
                      <Field label="Sender Name" value={tx.user.name} />
                    )}
                    {tx.user?.phone && (
                      <Field label="Sender Phone" value={tx.user.phone} />
                    )}
                    {tx.recipientPhone && (
                      <Field
                        label="Recipient Phone"
                        value={tx.recipientPhone}
                      />
                    )}
                    {tx.recipientEmail && (
                      <Field
                        label="Recipient Email"
                        value={tx.recipientEmail}
                      />
                    )}
                    {tx.recipientName && (
                      <Field label="Recipient Name" value={tx.recipientName} />
                    )}
                    {tx.recipientId && (
                      <Field
                        label="Recipient ID"
                        value={tx.recipientId}
                        mono
                        copyable
                      />
                    )}
                  </dl>
                </section>

                {/* Timestamps */}
                <section>
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                    Timestamps
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field
                      label="Created"
                      value={formatDate(tx.$createdAt || tx.createdAt)}
                    />
                    <Field
                      label="Updated"
                      value={formatDate(tx.$updatedAt || tx.updatedAt)}
                    />
                  </dl>
                </section>

                {/* Security / audit */}
                {(tx.ipAddress || tx.idempotencyKey) && (
                  <section>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                      Audit
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {tx.ipAddress && (
                        <Field label="IP Address" value={tx.ipAddress} mono />
                      )}
                      {tx.idempotencyKey && (
                        <div className="col-span-2">
                          <Field
                            label="Idempotency Key"
                            value={tx.idempotencyKey}
                            mono
                            copyable
                          />
                        </div>
                      )}
                    </dl>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary Stat Card ─────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, icon: Icon }) {
  const colorMap = {
    blue: "from-blue-500 to-blue-700",
    green: "from-emerald-500 to-teal-600",
    yellow: "from-amber-500 to-orange-500",
    red: "from-red-500 to-rose-600",
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className={`h-11 w-11 rounded-xl bg-gradient-to-br ${
          colorMap[color] || colorMap.blue
        } flex items-center justify-center shadow-sm shrink-0`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const INITIAL_FILTERS = {
  page: 1,
  limit: 25,
  status: "",
  type: "",
  provider: "",
  startDate: "",
  endDate: "",
  search: "",
};

const TransactionsPage = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedTxId, setSelectedTxId] = useState(null);

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => !["page", "limit"].includes(k) && v !== "",
  );

  // ── Data fetching ──
  const {
    data: txData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminTransactions", filters],
    queryFn: () => {
      // Strip empty strings from params
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== ""),
      );
      return transactionAPI.getTransactions(params);
    },
    keepPreviousData: true,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const transactions = useMemo(() => txData?.data ?? [], [txData]);
  const pagination = txData?.pagination ?? {
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 0,
  };

  // ── Client-side search filter (ID / phone / email substring) ──
  const displayed = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.id?.toLowerCase().includes(q) ||
        tx.recipientPhone?.toLowerCase().includes(q) ||
        tx.senderPhone?.toLowerCase().includes(q) ||
        tx.recipientEmail?.toLowerCase().includes(q) ||
        tx.description?.toLowerCase().includes(q),
    );
  }, [transactions, filters.search]);

  // ── Summary stats derived from current page ──
  const stats = useMemo(() => {
    const all = transactions;
    const completed = all.filter((t) => t.status === "completed");
    const pending = all.filter(
      (t) => t.status === "pending" || t.status === "processing",
    );
    const failed = all.filter((t) => t.status === "failed");
    const totalVol = completed.reduce(
      (s, t) => s + (parseFloat(t.amount) || 0),
      0,
    );
    return {
      count: pagination.totalItems,
      completed: completed.length,
      pending: pending.length,
      failed: failed.length,
      totalVol,
    };
  }, [transactions, pagination.totalItems]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  // ── Export handler ──
  const handleExport = async () => {
    try {
      const res = await transactionAPI.exportTransactions("csv", filters);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export started");
    } catch {
      toast.error("Export failed");
    }
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            Real-time view of all platform financial activity.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Total Transactions"
          value={pagination.totalItems?.toLocaleString() ?? "—"}
          sub="lifetime"
          color="blue"
          icon={BanknotesIcon}
        />
        <SummaryCard
          label="Completed"
          value={stats.completed.toLocaleString()}
          sub="this page"
          color="green"
          icon={CheckCircleIcon}
        />
        <SummaryCard
          label="Pending"
          value={stats.pending.toLocaleString()}
          sub="this page"
          color="yellow"
          icon={ClockIcon}
        />
        <SummaryCard
          label="Failed"
          value={stats.failed.toLocaleString()}
          sub="this page"
          color="red"
          icon={ExclamationTriangleIcon}
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Search */}
          <div className="relative xl:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ID, phone, email…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            className="select"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Type */}
          <select
            value={filters.type}
            onChange={(e) => setFilter("type", e.target.value)}
            className="select"
          >
            <option value="">All Types</option>
            <option value="transfer">Transfer</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="payment">Payment</option>
            <option value="send_money">Send Money</option>
            <option value="refund">Refund</option>
          </select>

          {/* Date from */}
          <input
            type="date"
            value={filters.startDate ? filters.startDate.slice(0, 10) : ""}
            onChange={(e) =>
              setFilter(
                "startDate",
                e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
              )
            }
            className="input text-slate-600"
            title="From date"
          />

          {/* Date to */}
          <input
            type="date"
            value={filters.endDate ? filters.endDate.slice(0, 10) : ""}
            onChange={(e) =>
              setFilter(
                "endDate",
                e.target.value ? `${e.target.value}T23:59:59.999Z` : "",
              )
            }
            className="input text-slate-600"
            title="To date"
          />
        </div>

        {/* Active filter chips + clear */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            <FunnelIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500">Filters active:</span>
            {filters.status && (
              <span className="badge-blue text-[10px]">{filters.status}</span>
            )}
            {filters.type && (
              <span className="badge-violet text-[10px]">{filters.type}</span>
            )}
            {filters.search && (
              <span className="badge-gray text-[10px]">
                &ldquo;{filters.search}&rdquo;
              </span>
            )}
            {(filters.startDate || filters.endDate) && (
              <span className="badge-gray text-[10px]">date range</span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Failed to load transactions
            </p>
            <p className="text-xs text-red-600 mt-1">
              {error.response?.data?.message || error.message}
            </p>
            <button
              onClick={() => refetch()}
              className="btn-danger text-xs mt-3"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : !error && displayed.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
      ) : !error ? (
        <div className="table-container">
          {/* Table header */}
          <div className="card-header">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                All Transactions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {(pagination.totalItems || 0).toLocaleString()} total records
                {isFetching && (
                  <span className="ml-2 text-blue-500">• refreshing…</span>
                )}
              </p>
            </div>
            <select
              value={filters.limit}
              onChange={(e) => setFilter("limit", parseInt(e.target.value))}
              className="select w-auto text-xs py-1.5"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className="table-header-cell">Transaction ID</th>
                  <th className="table-header-cell">Type</th>
                  <th className="table-header-cell">Sender / Recipient</th>
                  <th className="table-header-cell">Amount</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Provider</th>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell text-right pr-5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {displayed.map((tx) => {
                  const sm = statusMeta(tx.status);
                  const tm = typeMeta(tx.type);
                  const recipientDisplay =
                    tx.recipientPhone ||
                    tx.recipientEmail ||
                    tx.recipientName ||
                    tx.recipientId
                      ? tx.recipientPhone ||
                        tx.recipientEmail ||
                        tx.recipientName ||
                        shortId(tx.recipientId)
                      : "—";
                  return (
                    <tr key={tx.id} className="table-row">
                      {/* ID */}
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-600">
                            {shortId(tx.id)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(tx.id);
                            }}
                            className="text-slate-300 hover:text-slate-600 transition-colors"
                          >
                            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="table-cell">
                        <span className={tm.badge}>{tm.label}</span>
                      </td>
                      {/* Sender / Recipient */}
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <ArrowsRightLeftIcon className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500 truncate max-w-[140px]">
                              {shortId(tx.senderId) || "—"}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[140px] mt-0.5">
                              → {recipientDisplay}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Amount */}
                      <td className="table-cell">
                        <span className="font-semibold text-slate-900 tabular text-sm">
                          {formatAmount(tx.amount, tx.currency)}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="table-cell">
                        <span className={sm.badge}>{sm.label}</span>
                      </td>
                      {/* Provider */}
                      <td className="table-cell">
                        <span className="text-xs text-slate-500 capitalize">
                          {tx.provider || tx.paymentMethod || "—"}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="table-cell">
                        <span className="text-xs text-slate-500 whitespace-nowrap tabular">
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="table-cell text-right pr-5">
                        <button
                          onClick={() => setSelectedTxId(tx.id)}
                          className="btn-icon"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-slate-100">
            <Pagination
              pagination={pagination}
              onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
            />
          </div>
        </div>
      ) : null}

      {/* Transaction detail slide-over */}
      {selectedTxId && (
        <TransactionDetailModal
          txId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
