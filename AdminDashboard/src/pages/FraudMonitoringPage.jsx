import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fraudAPI } from "../services/adminAPI";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpCircleIcon,
  NoSymbolIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const SEVERITY_CLASS = {
  high: "badge-red",
  medium: "badge-yellow",
  low: "badge-green",
};

const STATUS_CLASS = {
  open: "badge-blue",
  resolved: "badge-green",
  escalated: "badge-red",
};

function SeverityBadge({ value }) {
  return (
    <span className={SEVERITY_CLASS[value] || "badge-gray"}>
      {value || "—"}
    </span>
  );
}

function StatusBadge({ value }) {
  return (
    <span className={STATUS_CLASS[value] || "badge-gray"}>
      {value || "open"}
    </span>
  );
}

const FraudMonitoringPage = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    severity: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState(null); // { flagId, action }
  const [notes, setNotes] = useState("");
  const limit = 50;

  const queryParams = {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
    page,
    limit,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["fraud-flags", queryParams],
    queryFn: () => fraudAPI.getFlags(queryParams),
    keepPreviousData: true,
  });

  const flags = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;

  const mutation = useMutation({
    mutationFn: ({ flagId, action, notes: n }) =>
      fraudAPI.updateFlag(flagId, { action, notes: n }),
    onSuccess: (_, vars) => {
      toast.success(`Flag ${vars.action.replace(/_/g, " ")} successfully`);
      queryClient.invalidateQueries({ queryKey: ["fraud-flags"] });
      setActionModal(null);
      setNotes("");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Action failed");
    },
  });

  const openModal = (flagId, action) => {
    setActionModal({ flagId, action });
    setNotes("");
  };

  const handleConfirm = () => {
    if (!actionModal) return;
    mutation.mutate({
      flagId: actionModal.flagId,
      action: actionModal.action,
      notes,
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            Fraud Monitoring
          </h1>
          <p className="page-subtitle">
            Review and action flagged transactions detected by the automated
            fraud engine.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary shrink-0">
          <ArrowPathIcon
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange("severity", e.target.value)}
              className="select"
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="select"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                handleFilterChange(
                  "startDate",
                  e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
                )
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                handleFilterChange(
                  "endDate",
                  e.target.value ? `${e.target.value}T23:59:59.999Z` : "",
                )
              }
              className="input"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setFilters({
                severity: "",
                status: "",
                startDate: "",
                endDate: "",
              });
              setPage(1);
            }}
            className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : flags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-slate-500">
              No flagged transactions found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="table-header-cell">Flagged At</th>
                  <th className="table-header-cell">Transaction ID</th>
                  <th className="table-header-cell">Reason</th>
                  <th className="table-header-cell">Severity</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Reviewed By</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flags.map((flag) => (
                  <tr key={flag.$id} className="table-row">
                    <td className="table-cell text-slate-500 font-mono text-xs tabular whitespace-nowrap">
                      {flag.createdAt
                        ? new Date(flag.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td
                      className="table-cell text-slate-700 font-mono text-xs max-w-[140px] truncate"
                      title={flag.transactionId}
                    >
                      {flag.transactionId || "—"}
                    </td>
                    <td className="table-cell text-slate-700 max-w-[200px] text-xs leading-relaxed">
                      {flag.reason || "—"}
                    </td>
                    <td className="table-cell">
                      <SeverityBadge value={flag.severity} />
                    </td>
                    <td className="table-cell">
                      <StatusBadge value={flag.status} />
                    </td>
                    <td
                      className="table-cell text-slate-400 font-mono text-xs max-w-[100px] truncate"
                      title={flag.reviewedBy}
                    >
                      {flag.reviewedBy || "—"}
                    </td>
                    <td className="table-cell">
                      {flag.status === "open" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openModal(flag.$id, "mark_safe")}
                            className="btn-ghost text-xs py-1 px-2 gap-1 text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            Safe
                          </button>
                          <button
                            onClick={() => openModal(flag.$id, "escalate")}
                            className="btn-ghost text-xs py-1 px-2 gap-1 text-amber-600 hover:bg-amber-50"
                          >
                            <ArrowUpCircleIcon className="h-3.5 w-3.5" />
                            Escalate
                          </button>
                          <button
                            onClick={() => openModal(flag.$id, "block_user")}
                            className="btn-ghost text-xs py-1 px-2 gap-1 text-red-600 hover:bg-red-50"
                          >
                            <NoSymbolIcon className="h-3.5 w-3.5" />
                            Block
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Page <span className="font-semibold">{page}</span> of{" "}
              <span className="font-semibold">{totalPages}</span> ·{" "}
              {pagination.totalItems} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(15,23,42,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md p-6 space-y-4 animate-scale-in">
            <h2 className="text-base font-semibold text-slate-900 capitalize">
              {actionModal.action.replace(/_/g, " ")}
            </h2>
            <p className="text-sm text-slate-500">
              {actionModal.action === "block_user"
                ? "This will suspend the user's account. This action is reversible from the Users page."
                : actionModal.action === "escalate"
                  ? "Flag will be marked for senior review."
                  : "Flag will be marked as resolved (no action required)."}
            </p>
            <div>
              <label className="label">
                Notes{" "}
                <span className="normal-case font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context for the audit trail…"
                className="input resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setActionModal(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={mutation.isLoading}
                className={`btn ${
                  actionModal.action === "block_user"
                    ? "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500"
                    : actionModal.action === "escalate"
                      ? "bg-amber-500 hover:bg-amber-600 text-white focus-visible:ring-amber-400"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500"
                } px-4 py-2.5 disabled:opacity-50`}
              >
                {mutation.isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudMonitoringPage;
