import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditAPI } from "../services/adminAPI";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ENTITY_OPTIONS = [
  "",
  "user",
  "transaction",
  "merchant",
  "card",
  "content",
];
const ROLE_OPTIONS = ["", "user", "admin"];

function Badge({ value }) {
  const cls =
    {
      admin: "badge-violet",
      user: "badge-blue",
      transaction: "badge-green",
      merchant: "badge-yellow",
      card: "badge-blue",
      content: "badge-gray",
    }[value] || "badge-gray";
  return <span className={cls}>{value || "—"}</span>;
}

const AuditLogsPage = () => {
  const [filters, setFilters] = useState({
    actorRole: "",
    entity: "",
    action: "",
    actorId: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const limit = 50;

  const queryParams = {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
    page,
    limit,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["audit-logs", queryParams],
    queryFn: () => auditAPI.getLogs(queryParams),
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || {};
  const totalPages = pagination.totalPages || 1;

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleReset = () => {
    setFilters({
      actorRole: "",
      entity: "",
      action: "",
      actorId: "",
      startDate: "",
      endDate: "",
    });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">
            Complete, tamper-evident record of every action performed on the
            platform.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="label">Actor Role</label>
            <select
              value={filters.actorRole}
              onChange={(e) => handleFilterChange("actorRole", e.target.value)}
              className="select"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r || "All"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Entity</label>
            <select
              value={filters.entity}
              onChange={(e) => handleFilterChange("entity", e.target.value)}
              className="select"
            >
              {ENTITY_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e || "All"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Action</label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. USER_BLOCKED"
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="label">Actor ID</label>
            <input
              type="text"
              placeholder="User or admin ID"
              value={filters.actorId}
              onChange={(e) => handleFilterChange("actorId", e.target.value)}
              className="input"
            />
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
            onClick={handleReset}
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
            <div className="h-8 w-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-slate-500">
              No audit logs found.
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
                  <th className="table-header-cell">Timestamp</th>
                  <th className="table-header-cell">Actor</th>
                  <th className="table-header-cell">Role</th>
                  <th className="table-header-cell">Action</th>
                  <th className="table-header-cell">Entity</th>
                  <th className="table-header-cell">Entity ID</th>
                  <th className="table-header-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.$id} className="table-row">
                    <td className="table-cell text-slate-500 font-mono text-xs tabular whitespace-nowrap">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td
                      className="table-cell text-slate-700 font-mono text-xs max-w-[120px] truncate"
                      title={log.actorId}
                    >
                      {log.actorId || "—"}
                    </td>
                    <td className="table-cell">
                      <Badge value={log.actorRole} />
                    </td>
                    <td className="table-cell font-medium text-slate-800 whitespace-nowrap">
                      {log.action || "—"}
                    </td>
                    <td className="table-cell">
                      <Badge value={log.entity} />
                    </td>
                    <td
                      className="table-cell text-slate-500 font-mono text-xs max-w-[120px] truncate"
                      title={log.entityId}
                    >
                      {log.entityId || "—"}
                    </td>
                    <td className="table-cell text-slate-400 font-mono text-xs whitespace-nowrap">
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
};

export default AuditLogsPage;
