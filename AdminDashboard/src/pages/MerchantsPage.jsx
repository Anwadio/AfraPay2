import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantAPI, payoutAPI } from "../services/adminAPI";
import toast from "react-hot-toast";
import {
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

// ── Payout status metadata ───────────────────────────────────────────────────
const PAYOUT_STATUS_META = {
  pending: { badge: "badge-yellow", label: "Pending" },
  pending_review: { badge: "badge-orange", label: "Review" },
  processing: { badge: "badge-blue", label: "Processing" },
  success: { badge: "badge-green", label: "Success" },
  failed: { badge: "badge-red", label: "Failed" },
};
function payoutStatusMeta(status) {
  return (
    PAYOUT_STATUS_META[status] || {
      badge: "badge-gray",
      label: status || "Unknown",
    }
  );
}

// ── Status metadata ───────────────────────────────────────────────────────────
const STATUS_META = {
  pending: {
    badge: "badge-yellow",
    label: "Pending",
    icon: <ClockIcon className="h-3 w-3" />,
  },
  approved: {
    badge: "badge-green",
    label: "Approved",
    icon: <CheckCircleIcon className="h-3 w-3" />,
  },
  rejected: {
    badge: "badge-red",
    label: "Rejected",
    icon: <XCircleIcon className="h-3 w-3" />,
  },
};

function statusMeta(status) {
  return (
    STATUS_META[status] || {
      badge: "badge-gray",
      label: status || "Unknown",
      icon: null,
    }
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount, currency = "USD") {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function shortId(id) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="table-container">
      <div className="p-5 space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-9 w-9 skeleton rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 skeleton rounded w-2/5" />
              <div className="h-3 skeleton rounded w-1/4" />
            </div>
            <div className="h-5 skeleton rounded-full w-16 shrink-0" />
            <div className="h-4 skeleton rounded w-24 shrink-0" />
            <div className="h-4 skeleton rounded w-20 shrink-0" />
            <div className="h-7 skeleton rounded-lg w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="card card-body flex items-center gap-4">
      <div
        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-900 tabular">{value}</p>
      </div>
    </div>
  );
}

// ── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ merchant, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm(merchant.$id, reason);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Reject Merchant
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Rejecting{" "}
              <span className="font-medium text-slate-700">
                {merchant.businessName}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="reject-reason">
              Rejection Reason (optional)
            </label>
            <textarea
              id="reject-reason"
              className="input h-24 resize-none"
              placeholder="Provide a reason visible to the merchant owner…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {reason.length}/500
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-danger">
              {isLoading ? "Rejecting…" : "Reject Merchant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Merchant Detail Panel ─────────────────────────────────────────────────────
function MerchantDetailPanel({ merchantId, onClose }) {
  const queryClient = useQueryClient();

  const { data: merchantData, isLoading } = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => merchantAPI.getMerchantById(merchantId),
    enabled: !!merchantId,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["merchantAnalytics", merchantId],
    queryFn: () =>
      merchantAPI.getMerchantAnalytics(merchantId, { period: "month" }),
    enabled: !!merchantId,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["merchantPayouts", merchantId],
    queryFn: () => payoutAPI.getPayouts({ merchantId, limit: 20 }),
    enabled: !!merchantId,
  });

  const processPayoutMutation = useMutation({
    mutationFn: (payoutId) => payoutAPI.processPayout(payoutId),
    onSuccess: () => {
      toast.success("Payout processed");
      queryClient.invalidateQueries({
        queryKey: ["merchantPayouts", merchantId],
      });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Failed to process payout"),
  });

  const failPayoutMutation = useMutation({
    mutationFn: ({ payoutId, reason }) =>
      payoutAPI.failPayout(payoutId, reason),
    onSuccess: () => {
      toast.success("Payout marked as failed, wallet restored");
      queryClient.invalidateQueries({
        queryKey: ["merchantPayouts", merchantId],
      });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Failed to update payout"),
  });

  const merchant = merchantData?.data;
  const analytics = analyticsData?.data;
  const payouts = payoutsData?.data?.documents || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Merchant Details
          </h2>
          <button onClick={onClose} className="btn-icon">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 skeleton rounded-xl" />
              ))}
            </div>
          ) : !merchant ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Merchant not found.
            </p>
          ) : (
            <>
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <BuildingStorefrontIcon className="h-7 w-7 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    {merchant.businessName}
                  </h3>
                  <p className="text-sm text-slate-500 capitalize">
                    {merchant.businessType}
                  </p>
                </div>
                <span
                  className={`ml-auto shrink-0 ${statusMeta(merchant.status).badge} flex items-center gap-1`}
                >
                  {statusMeta(merchant.status).icon}
                  {statusMeta(merchant.status).label}
                </span>
              </div>

              {/* Details grid */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <DetailRow label="Merchant ID" value={merchant.$id} copy />
                <DetailRow label="Phone" value={merchant.phoneNumber} />
                <DetailRow
                  label="Registered"
                  value={formatDate(merchant.createdAt)}
                />
                {merchant.tillNumber && (
                  <DetailRow
                    label="Till Number"
                    value={merchant.tillNumber}
                    copy
                    highlight
                  />
                )}
                {merchant.rejectionReason && (
                  <DetailRow
                    label="Rejection Reason"
                    value={merchant.rejectionReason}
                  />
                )}
              </div>

              {/* Wallet */}
              {merchant.status === "approved" && merchant.wallet && (
                <div className="card card-body">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <BanknotesIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      Merchant Wallet
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tabular">
                    {formatCurrency(
                      merchant.wallet.balance,
                      merchant.wallet.currency,
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Last updated: {formatDate(merchant.wallet.updatedAt)}
                  </p>
                </div>
              )}

              {/* Analytics */}
              {merchant.status === "approved" && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <ChartBarIcon className="h-4 w-4 text-slate-400" />
                    Last 30 Days
                  </h4>
                  {analyticsLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-10 skeleton rounded-xl" />
                      ))}
                    </div>
                  ) : analytics ? (
                    <div className="grid grid-cols-2 gap-3">
                      <AnalyticTile
                        label="Total Sales"
                        value={formatCurrency(analytics.totalSales)}
                        color="bg-emerald-50 text-emerald-700"
                      />
                      <AnalyticTile
                        label="Transactions"
                        value={analytics.totalTransactions}
                        color="bg-blue-50 text-blue-700"
                      />
                      <AnalyticTile
                        label="Completed"
                        value={analytics.completedTransactions}
                        color="bg-slate-50 text-slate-700"
                      />
                      <AnalyticTile
                        label="Failed"
                        value={analytics.failedTransactions}
                        color="bg-red-50 text-red-700"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No analytics data.</p>
                  )}

                  {/* Recent payments */}
                  {analytics?.recentPayments?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Recent Payments
                      </p>
                      <div className="space-y-1.5">
                        {analytics.recentPayments.slice(0, 5).map((txn) => (
                          <div
                            key={txn.$id}
                            className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-xs text-slate-400">
                                {shortId(txn.$id)}
                              </span>
                              <p className="text-xs text-slate-500 truncate">
                                {txn.description || "Till payment"}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="font-semibold text-slate-900">
                                {formatCurrency(txn.amount, txn.currency)}
                              </p>
                              <span
                                className={
                                  statusMeta(txn.status).badge + " text-[10px]"
                                }
                              >
                                {statusMeta(txn.status).label}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Payout History ── */}
              {merchant.status === "approved" && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <BanknotesIcon className="h-4 w-4 text-slate-400" />
                    Payout History
                  </h4>

                  {payoutsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-14 skeleton rounded-xl" />
                      ))}
                    </div>
                  ) : payouts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                      No payouts yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {payouts.map((payout) => {
                        const meta = payoutStatusMeta(payout.status);
                        const canProcess =
                          payout.status === "pending" ||
                          payout.status === "pending_review";
                        const canFail =
                          payout.status === "pending" ||
                          payout.status === "pending_review" ||
                          payout.status === "processing";
                        return (
                          <div
                            key={payout.$id}
                            className="bg-slate-50 rounded-xl px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900 tabular">
                                    {formatCurrency(
                                      payout.amount,
                                      payout.currency,
                                    )}
                                  </span>
                                  <span
                                    className={`${meta.badge} text-[10px] shrink-0`}
                                  >
                                    {meta.label}
                                  </span>
                                  {payout.riskFlag && (
                                    <span className="badge-orange text-[10px] shrink-0">
                                      Risk
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">
                                  {payout.method} •{" "}
                                  {payout.destination || "****"}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {formatDate(payout.$createdAt)}
                                  {payout.reference && (
                                    <span className="ml-1 font-mono">
                                      · {payout.reference}
                                    </span>
                                  )}
                                  {payout.failureReason && (
                                    <span className="ml-1 text-red-400">
                                      · {payout.failureReason}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {(canProcess || canFail) && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {canProcess && (
                                    <button
                                      onClick={() =>
                                        processPayoutMutation.mutate(payout.$id)
                                      }
                                      disabled={processPayoutMutation.isPending}
                                      className="text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2 py-1 transition-colors disabled:opacity-50"
                                    >
                                      Process
                                    </button>
                                  )}
                                  {canFail && (
                                    <button
                                      onClick={() => {
                                        const reason = window.prompt(
                                          "Reason for failing this payout? (optional)",
                                          "",
                                        );
                                        if (reason !== null) {
                                          failPayoutMutation.mutate({
                                            payoutId: payout.$id,
                                            reason,
                                          });
                                        }
                                      }}
                                      disabled={failPayoutMutation.isPending}
                                      className="text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg px-2 py-1 transition-colors disabled:opacity-50"
                                    >
                                      Fail
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, copy = false, highlight = false }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={`font-medium truncate ${
            highlight
              ? "text-emerald-700 font-mono tracking-wider"
              : "text-slate-800"
          }`}
        >
          {value || "—"}
        </span>
        {copy && value && (
          <button
            onClick={() => copyToClipboard(value)}
            className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
            title="Copy"
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AnalyticTile({ label, value, color }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <p className="text-xs font-medium opacity-75 mb-1">{label}</p>
      <p className="text-lg font-bold tabular">{value ?? "—"}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const MerchantsPage = () => {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: merchantsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["merchants", filters],
    queryFn: () => merchantAPI.getMerchants(filters),
    keepPreviousData: true,
    refetchInterval: 30000,
  });

  // ── Approve mutation ───────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (merchantId) => merchantAPI.approveMerchant(merchantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["merchants"]);
      toast.success(
        data?.message ||
          "Merchant approved and till number assigned successfully",
      );
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Failed to approve merchant",
      );
    },
  });

  // ── Reject mutation ────────────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: ({ merchantId, reason }) =>
      merchantAPI.rejectMerchant(merchantId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["merchants"]);
      setRejectTarget(null);
      toast.success(data?.message || "Merchant application rejected");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Failed to reject merchant",
      );
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      setFilters((f) => ({ ...f, search: searchInput.trim(), page: 1 }));
    },
    [searchInput],
  );

  const handleFilterChange = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleApprove = useCallback(
    (merchantId) => {
      if (
        window.confirm(
          "Approve this merchant? A till number will be generated and a wallet created.",
        )
      ) {
        approveMutation.mutate(merchantId);
      }
    },
    [approveMutation],
  );

  const handleRejectConfirm = useCallback(
    (merchantId, reason) => {
      rejectMutation.mutate({ merchantId, reason });
    },
    [rejectMutation],
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const merchants = merchantsData?.data || merchantsData?.documents || [];
  const pagination =
    merchantsData?.pagination || merchantsData?.meta?.pagination || {};

  const totalMerchants = pagination.totalItems || merchants.length;
  const pendingCount = merchants.filter((m) => m.status === "pending").length;
  const approvedCount = merchants.filter((m) => m.status === "approved").length;
  const rejectedCount = merchants.filter((m) => m.status === "rejected").length;

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Merchants</h1>
          <p className="page-subtitle">
            Manage merchant accounts, approvals, and till systems.
          </p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">
              Failed to load merchants
            </h3>
            <p className="text-sm text-red-600 mb-4">{error.message}</p>
            <button onClick={() => refetch()} className="btn-danger text-xs">
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="page-title">Merchants</h1>
          <p className="page-subtitle">
            Manage merchant accounts, approvals, and till systems. Total:{" "}
            {pagination.totalItems ?? "—"}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary text-xs"
          >
            <ArrowPathIcon
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={totalMerchants}
            color="bg-slate-100 text-slate-600"
            icon={BuildingStorefrontIcon}
          />
          <StatCard
            label="Pending"
            value={
              filters.status
                ? pendingCount
                : (pagination.pendingCount ?? pendingCount)
            }
            color="bg-amber-50 text-amber-600"
            icon={ClockIcon}
          />
          <StatCard
            label="Approved"
            value={
              filters.status
                ? approvedCount
                : (pagination.approvedCount ?? approvedCount)
            }
            color="bg-emerald-50 text-emerald-600"
            icon={CheckCircleIcon}
          />
          <StatCard
            label="Rejected"
            value={
              filters.status
                ? rejectedCount
                : (pagination.rejectedCount ?? rejectedCount)
            }
            color="bg-red-50 text-red-600"
            icon={XCircleIcon}
          />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card card-body">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 flex-1"
          >
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Search by business name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary text-xs">
              Search
            </button>
            {filters.search && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  handleFilterChange("search", "");
                }}
                className="btn-icon"
                title="Clear search"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              className="select text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <TableSkeleton />
      ) : merchants.length === 0 ? (
        <div className="card card-body flex flex-col items-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">
            No merchants found
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
            {filters.search || filters.status
              ? "Try adjusting your filters."
              : "Merchant applications will appear here once users register."}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="table-header-cell">Merchant</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Till Number</th>
                <th className="table-header-cell">Registered</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {merchants.map((merchant) => {
                const sm = statusMeta(merchant.status);
                const isApproving =
                  approveMutation.isLoading &&
                  approveMutation.variables === merchant.$id;

                return (
                  <tr key={merchant.$id} className="table-row">
                    {/* Business name + phone */}
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <BuildingStorefrontIcon className="h-4.5 w-4.5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {merchant.businessName}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            {merchant.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Business type */}
                    <td className="table-cell">
                      <span className="badge-gray capitalize">
                        {merchant.businessType || "—"}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="table-cell">
                      <span
                        className={`${sm.badge} flex items-center gap-1 w-fit`}
                      >
                        {sm.icon}
                        {sm.label}
                      </span>
                    </td>

                    {/* Till number */}
                    <td className="table-cell">
                      {merchant.tillNumber ? (
                        <button
                          onClick={() => copyToClipboard(merchant.tillNumber)}
                          className="flex items-center gap-1.5 font-mono text-xs text-emerald-700 hover:text-emerald-900 transition-colors group"
                          title="Click to copy"
                        >
                          {merchant.tillNumber}
                          <ClipboardDocumentIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">
                          Not assigned
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="table-cell text-sm text-slate-500">
                      {formatDate(merchant.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        {/* View details */}
                        <button
                          onClick={() => setSelectedMerchantId(merchant.$id)}
                          className="btn-icon"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        {/* Approve (pending only) */}
                        {merchant.status === "pending" && (
                          <button
                            onClick={() => handleApprove(merchant.$id)}
                            disabled={isApproving}
                            className="btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 disabled:opacity-50"
                            title="Approve merchant"
                          >
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            {isApproving ? "Approving…" : "Approve"}
                          </button>
                        )}

                        {/* Reject (pending only) */}
                        {merchant.status === "pending" && (
                          <button
                            onClick={() => setRejectTarget(merchant)}
                            disabled={rejectMutation.isLoading}
                            className="btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-400 disabled:opacity-50"
                            title="Reject merchant"
                          >
                            <XCircleIcon className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── Pagination ── */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ·{" "}
                {pagination.totalItems} merchants
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="btn-icon disabled:opacity-40"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn-icon disabled:opacity-40"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {selectedMerchantId && (
        <MerchantDetailPanel
          merchantId={selectedMerchantId}
          onClose={() => setSelectedMerchantId(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          merchant={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          isLoading={rejectMutation.isLoading}
        />
      )}
    </div>
  );
};

export default MerchantsPage;
