/**
 * AnalyticsPage — Admin BI Dashboard
 *
 * Real-time platform analytics powered by /api/v1/admin/analytics/* endpoints.
 * All data is live from the database — no hardcoded values.
 *
 * Sections:
 *   1. Filter bar   — period, date range, granularity, currency, tx type
 *   2. KPI cards    — revenue, transactions, users, merchants, payouts
 *   3. Revenue      — time-series line chart + source doughnut
 *   4. Transactions — volume bar chart + status doughnut + payment methods
 *   5. Top merchants table
 *   6. Forecast     — regression projection line chart
 *   7. Cohort table — retention grid
 */

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  CreditCardIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { analyticsAPI } from "../services/adminAPI";

// Register all required Chart.js components (idempotent — safe to call multiple times)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";
ChartJS.defaults.color = "#94a3b8";

// ── Design tokens ─────────────────────────────────────────────────────────────
const TOOLTIP = {
  backgroundColor: "#0f172a",
  titleColor: "#f8fafc",
  bodyColor: "#94a3b8",
  padding: 12,
  cornerRadius: 10,
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
};

const SOURCE_COLORS = {
  Card: "#3b82f6",
  "Mobile Money": "#10b981",
  Wallet: "#6366f1",
  "Bank Transfer": "#8b5cf6",
  Subscription: "#f59e0b",
  Other: "#64748b",
};

const METHOD_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

const STATUS_COLORS = {
  completed: "#10b981",
  failed: "#ef4444",
  pending: "#f59e0b",
  processing: "#3b82f6",
  cancelled: "#64748b",
};

const RETENTION_COLOR = (pct) => {
  if (pct === null) return "bg-slate-50 text-slate-300";
  if (pct >= 70) return "bg-emerald-50 text-emerald-700 font-semibold";
  if (pct >= 40) return "bg-blue-50 text-blue-700";
  if (pct >= 20) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-600";
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n, currency = "USD") {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function fmtPct(n) {
  if (n === null || n === undefined) return "—";
  return `${Number(n).toFixed(1)}%`;
}

// ── Reusable UI components ────────────────────────────────────────────────────

function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
  );
}

function ChartPanel({ title, subtitle, children, action }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center text-xs text-slate-400 gap-2">
      <ChartBarIcon className="h-4 w-4" />
      No data for this period
    </div>
  );
}

function ErrorPanel({ message, onRetry }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
      <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-red-700">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-danger text-xs mt-2">
            <ArrowPathIcon className="h-3 w-3" /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, trendDir, icon: Icon, accent }) {
  const accentMap = {
    blue: {
      bar: "from-blue-500 to-blue-700",
      soft: "bg-blue-50",
      text: "text-blue-600",
    },
    green: {
      bar: "from-emerald-500 to-teal-600",
      soft: "bg-emerald-50",
      text: "text-emerald-600",
    },
    violet: {
      bar: "from-violet-500 to-purple-700",
      soft: "bg-violet-50",
      text: "text-violet-600",
    },
    amber: {
      bar: "from-amber-500 to-orange-600",
      soft: "bg-amber-50",
      text: "text-amber-600",
    },
    teal: {
      bar: "from-teal-500 to-cyan-600",
      soft: "bg-teal-50",
      text: "text-teal-600",
    },
    rose: {
      bar: "from-rose-500 to-red-600",
      soft: "bg-rose-50",
      text: "text-rose-600",
    },
  };
  const t = accentMap[accent] || accentMap.blue;

  return (
    <div className="relative bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-100 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden group">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.bar}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.08em]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular tracking-tight leading-none truncate">
            {value}
          </p>
          {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
          {trend && (
            <div
              className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
                trendDir === "up"
                  ? "text-emerald-600"
                  : trendDir === "down"
                    ? "text-red-500"
                    : "text-slate-500"
              }`}
            >
              {trendDir === "up" && <ArrowTrendingUpIcon className="h-3 w-3" />}
              {trendDir === "down" && (
                <ArrowTrendingDownIcon className="h-3 w-3" />
              )}
              {trend}
            </div>
          )}
        </div>
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${t.bar} shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Filters Bar ───────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "Today", value: "day" },
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "KES", "NGN", "GHS", "ZAR"];
const TX_TYPES = [
  { label: "All types", value: "" },
  { label: "Deposits", value: "deposit" },
  { label: "Payments", value: "payment" },
  { label: "Transfers", value: "transfer" },
  { label: "Withdrawals", value: "withdrawal" },
  { label: "Fees", value: "fee" },
  { label: "Refunds", value: "refund" },
];
const GRANULARITIES = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

function FiltersBar({ filters, onChange, onRefresh, isRefreshing }) {
  const { period, startDate, endDate, currency, granularity, type } = filters;

  return (
    <div className="card card-body">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Period quick-select */}
        <div>
          <p className="label">Period</p>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() =>
                  onChange({ period: p.value, startDate: "", endDate: "" })
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                  period === p.value && !startDate
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        <div>
          <p className="label">From</p>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) =>
              onChange({ startDate: e.target.value, period: "" })
            }
            className="input py-2 text-xs"
          />
        </div>
        <div>
          <p className="label">To</p>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onChange({ endDate: e.target.value, period: "" })}
            className="input py-2 text-xs"
          />
        </div>

        {/* Granularity */}
        <div>
          <p className="label">Granularity</p>
          <select
            value={granularity}
            onChange={(e) => onChange({ granularity: e.target.value })}
            className="select py-2 text-xs"
          >
            {GRANULARITIES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div>
          <p className="label">Currency</p>
          <select
            value={currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            className="select py-2 text-xs"
          >
            <option value="">All</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Transaction type */}
        <div>
          <p className="label">Type</p>
          <select
            value={type}
            onChange={(e) => onChange({ type: e.target.value })}
            className="select py-2 text-xs"
          >
            {TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-secondary py-2 self-end"
          title="Refresh all data"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="text-xs">Refresh</span>
        </button>
      </div>
    </div>
  );
}

// ── KPI Section ───────────────────────────────────────────────────────────────

function KpiSection({ data, currency, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }
  if (error)
    return <ErrorPanel message="Failed to load KPIs" onRetry={onRetry} />;
  if (!data) return null;

  const d = data.data || data;
  const cur = currency || d.currency || "USD";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        label="Total Revenue"
        value={fmtCurrency(d.totalRevenue, cur)}
        sub={`${d.periodTransactions ?? 0} transactions this period`}
        icon={BanknotesIcon}
        accent="green"
      />
      <KpiCard
        label="Total Transactions"
        value={fmt(d.totalTransactions, 0)}
        sub={`${fmtPct(d.successRate)} success rate`}
        trend={`${fmt(d.periodTransactions, 0)} this period`}
        icon={CreditCardIcon}
        accent="blue"
      />
      <KpiCard
        label="Total Users"
        value={fmt(d.totalUsers, 0)}
        sub={`+${fmt(d.newUsersInPeriod, 0)} new`}
        trendDir="up"
        trend={`+${fmt(d.newUsersInPeriod, 0)} new this period`}
        icon={UsersIcon}
        accent="violet"
      />
      <KpiCard
        label="Merchants"
        value={fmt(d.totalMerchants, 0)}
        sub={`${fmt(d.activeMerchants, 0)} active`}
        icon={BuildingStorefrontIcon}
        accent="amber"
      />
      <KpiCard
        label="Payout Volume"
        value={fmtCurrency(d.payoutVolume, cur)}
        sub={`${fmt(d.payoutCount, 0)} payouts`}
        icon={ArrowTrendingUpIcon}
        accent="teal"
      />
      <KpiCard
        label="Failed Transactions"
        value={fmt(d.failedTransactions, 0)}
        sub={`${fmtPct(
          d.totalTransactions > 0
            ? (d.failedTransactions / (d.periodTransactions || 1)) * 100
            : 0,
        )} failure rate`}
        icon={ExclamationTriangleIcon}
        accent="rose"
      />
    </div>
  );
}

// ── Revenue Section ───────────────────────────────────────────────────────────

function RevenueSection({ data, currency, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (error)
    return (
      <ErrorPanel message="Failed to load revenue data" onRetry={onRetry} />
    );
  if (!data) return null;

  const d = data.data || data;
  const { timeline = [], bySource = [], totals = {} } = d;
  const cur = currency || d.currency || "USD";

  const hasTimeline = timeline.some((b) => b.revenue > 0);
  const hasSource = bySource.length > 0;

  const lineData = {
    labels: timeline.map((b) => b.label),
    datasets: [
      {
        label: "Revenue",
        data: timeline.map((b) => b.revenue),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        borderWidth: 2,
        pointRadius: timeline.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP,
        callbacks: {
          label: (ctx) => ` ${fmtCurrency(ctx.raw, cur)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 10 }, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: "#f1f5f9" },
        border: { display: false, dash: [4, 4] },
        ticks: {
          font: { size: 10 },
          callback: (v) => fmtCurrency(v, cur),
        },
      },
    },
  };

  const sourceColors = bySource.map(
    (s) => SOURCE_COLORS[s.source] || "#64748b",
  );
  const doughnutData = {
    labels: bySource.map((s) => s.source),
    datasets: [
      {
        data: bySource.map((s) => s.revenue),
        backgroundColor: sourceColors,
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { padding: 12, usePointStyle: true, font: { size: 11 } },
      },
      tooltip: {
        ...TOOLTIP,
        callbacks: {
          label: (ctx) =>
            ` ${ctx.label}: ${fmtCurrency(ctx.raw, cur)} (${fmtPct(
              bySource[ctx.dataIndex]?.share,
            )})`,
        },
      },
    },
    cutout: "68%",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <ChartPanel
        title="Revenue Over Time"
        subtitle={`${fmtCurrency(totals.revenue, cur)} total — avg ${fmtCurrency(totals.avgPerTxn, cur)}/txn`}
        className="lg:col-span-2"
        action={
          <span className="text-xs text-slate-500 font-medium">
            {fmt(totals.transactions, 0)} txns
          </span>
        }
      >
        <div className="h-56 lg:h-64">
          {hasTimeline ? (
            <Line data={lineData} options={lineOptions} />
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Revenue source summary row */}
        {bySource.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {bySource.slice(0, 6).map((s) => (
              <div
                key={s.source}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl"
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: SOURCE_COLORS[s.source] || "#64748b",
                  }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {s.source}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmtCurrency(s.revenue, cur)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartPanel>

      <ChartPanel
        title="Revenue by Source"
        subtitle="Payment channel breakdown"
      >
        <div className="h-52">
          {hasSource ? (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          ) : (
            <EmptyChart />
          )}
        </div>
        {hasSource && (
          <div className="mt-3 space-y-1.5">
            {bySource.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: SOURCE_COLORS[s.source] || "#64748b",
                    }}
                  />
                  {s.source}
                </span>
                <span className="font-medium text-slate-800">
                  {fmtPct(s.share)}
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartPanel>
    </div>
  );
}

// ── Transaction Section ───────────────────────────────────────────────────────

function TransactionSection({ data, currency, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (error)
    return (
      <ErrorPanel message="Failed to load transaction data" onRetry={onRetry} />
    );
  if (!data) return null;

  const d = data.data || data;
  const {
    timeline = [],
    statusDist = {},
    methods = [],
    topMerchants = [],
    totals = {},
  } = d;

  const hasTimeline = timeline.some((b) => b.total > 0);

  const barData = {
    labels: timeline.map((b) => b.label),
    datasets: [
      {
        label: "Completed",
        data: timeline.map((b) => b.completed),
        backgroundColor: "rgba(16,185,129,0.85)",
        borderRadius: 4,
        stack: "txn",
      },
      {
        label: "Failed",
        data: timeline.map((b) => b.failed),
        backgroundColor: "rgba(239,68,68,0.75)",
        borderRadius: 4,
        stack: "txn",
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { padding: 12, usePointStyle: true, font: { size: 11 } },
      },
      tooltip: TOOLTIP,
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 10 }, maxTicksLimit: 12 },
      },
      y: {
        stacked: true,
        grid: { color: "#f1f5f9" },
        border: { display: false, dash: [4, 4] },
        ticks: { font: { size: 10 } },
      },
    },
  };

  const statusEntries = Object.entries(statusDist).filter(([, v]) => v > 0);
  const statusDoughnut = {
    labels: statusEntries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [
      {
        data: statusEntries.map(([, v]) => v),
        backgroundColor: statusEntries.map(
          ([k]) => STATUS_COLORS[k] || "#64748b",
        ),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };
  const statusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { padding: 10, usePointStyle: true, font: { size: 11 } },
      },
      tooltip: TOOLTIP,
    },
    cutout: "62%",
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartPanel
          title="Transaction Volume"
          subtitle={`${fmt(totals.total, 0)} total — ${fmtPct(totals.successRate)} success rate`}
        >
          <div className="h-56 lg:h-64">
            {hasTimeline ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <EmptyChart />
            )}
          </div>
        </ChartPanel>

        <ChartPanel
          title="Status Distribution"
          subtitle="All transaction statuses"
        >
          <div className="h-44">
            {statusEntries.length > 0 ? (
              <Doughnut data={statusDoughnut} options={statusOptions} />
            ) : (
              <EmptyChart />
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {statusEntries.map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[k] || "#64748b" }}
                />
                <span className="text-slate-600 truncate capitalize">{k}</span>
                <span className="ml-auto font-medium text-slate-800">
                  {fmt(v, 0)}
                </span>
              </div>
            ))}
          </div>
        </ChartPanel>

        <ChartPanel
          title="Payment Methods"
          subtitle="Transaction count and volume"
        >
          {methods.length > 0 ? (
            <div className="space-y-3">
              {methods.map((m, i) => (
                <div key={m.method}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            METHOD_PALETTE[i % METHOD_PALETTE.length],
                        }}
                      />
                      <span className="font-medium text-slate-700">
                        {m.method}
                      </span>
                    </span>
                    <span className="text-slate-500">
                      {fmt(m.count, 0)} txns · {fmtPct(m.share)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${m.share}%`,
                        backgroundColor:
                          METHOD_PALETTE[i % METHOD_PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartPanel>
      </div>

      {/* Top merchants table */}
      {topMerchants.length > 0 && (
        <ChartPanel
          title="Top Merchants by Volume"
          subtitle="Merchants ranked by transaction volume this period"
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-header-cell text-left pl-1">#</th>
                  <th className="table-header-cell text-left">Merchant</th>
                  <th className="table-header-cell text-right">Transactions</th>
                  <th className="table-header-cell text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topMerchants.map((m, i) => (
                  <tr
                    key={m.merchantId}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 pl-1 text-slate-400 font-medium">
                      {i + 1}
                    </td>
                    <td className="py-2.5 font-medium text-slate-800 max-w-xs truncate">
                      {m.name || m.merchantId}
                    </td>
                    <td className="py-2.5 text-right tabular text-slate-700">
                      {fmt(m.txnCount, 0)}
                    </td>
                    <td className="py-2.5 text-right tabular font-semibold text-slate-900">
                      {fmtCurrency(m.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartPanel>
      )}
    </div>
  );
}

// ── Forecast Section ──────────────────────────────────────────────────────────

function ForecastSection({ data, currency, isLoading, error, onRetry }) {
  if (isLoading) return <Skeleton className="h-72" />;
  if (error)
    return <ErrorPanel message="Failed to load forecast" onRetry={onRetry} />;
  if (!data) return null;

  const d = data.data || data;
  const { historical = [], forecast = [], model = {} } = d;
  const cur = currency || d.currency || "USD";

  const allLabels = [
    ...historical.map((h) => h.date),
    ...forecast.map((f) => f.date),
  ];

  const lineData = {
    labels: allLabels,
    datasets: [
      {
        label: "Historical",
        data: [
          ...historical.map((h) => h.revenue),
          ...Array(forecast.length).fill(null),
        ],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.06)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: true,
      },
      {
        label: "Forecast",
        data: [
          ...Array(historical.length - 1).fill(null),
          historical[historical.length - 1]?.revenue ?? null,
          ...forecast.map((f) => f.revenue),
        ],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.06)",
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { padding: 12, usePointStyle: true, font: { size: 11 } },
      },
      tooltip: {
        ...TOOLTIP,
        callbacks: {
          label: (ctx) =>
            ` ${ctx.dataset.label}: ${fmtCurrency(ctx.raw ?? 0, cur)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 9 }, maxTicksLimit: 15 },
      },
      y: {
        grid: { color: "#f1f5f9" },
        border: { display: false, dash: [4, 4] },
        ticks: {
          font: { size: 10 },
          callback: (v) => fmtCurrency(v, cur),
        },
      },
    },
  };

  const confidenceColor =
    {
      high: "text-emerald-600 bg-emerald-50",
      medium: "text-amber-600 bg-amber-50",
      low: "text-red-500 bg-red-50",
    }[model.confidence] || "text-slate-600 bg-slate-100";

  return (
    <ChartPanel
      title="Revenue Forecast"
      subtitle="Linear regression on last 90 days · 30-day projection"
      action={
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${confidenceColor}`}
        >
          {model.confidence} confidence · R² {model.r2}
        </span>
      }
    >
      <div className="h-56">
        {historical.length > 0 ? (
          <Line data={lineData} options={lineOptions} />
        ) : (
          <EmptyChart />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          <span className="font-medium text-slate-700">Slope</span>{" "}
          {model.slope > 0 ? "+" : ""}
          {model.slope} {cur}/day
        </span>
        <span>
          <span className="font-medium text-slate-700">Trend</span>{" "}
          {model.slope > 0
            ? "↑ Growing revenue"
            : model.slope < 0
              ? "↓ Declining revenue"
              : "→ Flat"}
        </span>
        <span className="ml-auto text-slate-400">
          Note: forecast is indicative, not financial advice.
        </span>
      </div>
    </ChartPanel>
  );
}

// ── Cohort Section ────────────────────────────────────────────────────────────

function CohortSection({ data, isLoading, error, onRetry }) {
  if (isLoading) return <Skeleton className="h-64" />;
  if (error)
    return (
      <ErrorPanel message="Failed to load cohort data" onRetry={onRetry} />
    );
  if (!data) return null;

  const d = data.data || data;
  const { cohorts = [], maxPeriods = 6 } = d;

  if (cohorts.length === 0 || cohorts.every((c) => c.size === 0)) {
    return (
      <ChartPanel
        title="User Cohort Retention"
        subtitle="Users grouped by first-transaction month"
      >
        <EmptyChart />
      </ChartPanel>
    );
  }

  const periodHeaders = Array.from({ length: maxPeriods }, (_, i) =>
    i === 0 ? "Month 0" : `+${i}m`,
  );

  return (
    <ChartPanel
      title="User Cohort Retention"
      subtitle="% of users still active N months after first transaction"
    >
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="table-header-cell text-left py-2 pl-1 min-w-[90px]">
                Cohort
              </th>
              <th className="table-header-cell text-right py-2 pr-4">Users</th>
              {periodHeaders.map((h) => (
                <th
                  key={h}
                  className="table-header-cell text-center py-2 min-w-[52px]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cohorts.map((c) => (
              <tr
                key={c.cohortMonth}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="py-2.5 pl-1 font-medium text-slate-700">
                  {c.cohortMonth}
                </td>
                <td className="py-2.5 text-right pr-4 tabular text-slate-700 font-medium">
                  {fmt(c.size, 0)}
                </td>
                {c.retention.map((pct, i) => (
                  <td key={i} className="py-2.5 text-center">
                    {pct === null ? (
                      <span className="text-slate-200">—</span>
                    ) : (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-md text-xs ${RETENTION_COLOR(pct)}`}
                      >
                        {pct}%
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Colour scale: <span className="text-emerald-600 font-medium">≥70%</span>{" "}
        <span className="text-blue-600">≥40%</span>{" "}
        <span className="text-amber-600">≥20%</span>{" "}
        <span className="text-red-500">&lt;20%</span>
      </p>
    </ChartPanel>
  );
}

// ── Main AnalyticsPage ────────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  period: "month",
  startDate: "",
  endDate: "",
  granularity: "week",
  currency: "",
  type: "",
};

const AnalyticsPage = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const updateFilters = useCallback((partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  // Build query params from filters
  const queryParams = {
    ...(filters.period && !filters.startDate ? { period: filters.period } : {}),
    ...(filters.startDate ? { startDate: filters.startDate } : {}),
    ...(filters.endDate ? { endDate: filters.endDate } : {}),
    ...(filters.granularity ? { granularity: filters.granularity } : {}),
    ...(filters.currency ? { currency: filters.currency } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  };

  const sharedOptions = {
    staleTime: 2 * 60 * 1000, // 2 min
    refetchInterval: 60 * 1000, // auto-refresh every 60s
    retry: 1,
  };

  const overviewQuery = useQuery({
    queryKey: ["admin-analytics-overview", queryParams],
    queryFn: () => analyticsAPI.getOverview(queryParams),
    ...sharedOptions,
  });

  const revenueQuery = useQuery({
    queryKey: ["admin-analytics-revenue", queryParams],
    queryFn: () => analyticsAPI.getRevenue(queryParams),
    ...sharedOptions,
  });

  const transactionsQuery = useQuery({
    queryKey: ["admin-analytics-transactions", queryParams],
    queryFn: () => analyticsAPI.getTransactions(queryParams),
    ...sharedOptions,
  });

  const cohortQuery = useQuery({
    queryKey: ["admin-analytics-cohorts"],
    queryFn: () => analyticsAPI.getCohorts({ months: 6 }),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const forecastQuery = useQuery({
    queryKey: ["admin-analytics-forecast", filters.currency],
    queryFn: () =>
      analyticsAPI.getForecast(
        filters.currency ? { currency: filters.currency } : {},
      ),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const anyFetching =
    overviewQuery.isFetching ||
    revenueQuery.isFetching ||
    transactionsQuery.isFetching;

  const refreshAll = useCallback(() => {
    overviewQuery.refetch();
    revenueQuery.refetch();
    transactionsQuery.refetch();
    cohortQuery.refetch();
    forecastQuery.refetch();
  }, [
    overviewQuery,
    revenueQuery,
    transactionsQuery,
    cohortQuery,
    forecastQuery,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Real-time platform metrics, revenue analytics, and business
            intelligence.
          </p>
        </div>
        {anyFetching && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-blue-500" />
            Updating…
          </div>
        )}
      </div>

      {/* Filters */}
      <FiltersBar
        filters={filters}
        onChange={updateFilters}
        onRefresh={refreshAll}
        isRefreshing={anyFetching}
      />

      {/* KPI Cards */}
      <KpiSection
        data={overviewQuery.data}
        currency={filters.currency}
        isLoading={overviewQuery.isLoading}
        error={overviewQuery.error}
        onRetry={() => overviewQuery.refetch()}
      />

      {/* Revenue */}
      <RevenueSection
        data={revenueQuery.data}
        currency={filters.currency}
        isLoading={revenueQuery.isLoading}
        error={revenueQuery.error}
        onRetry={() => revenueQuery.refetch()}
      />

      {/* Transactions */}
      <TransactionSection
        data={transactionsQuery.data}
        currency={filters.currency}
        isLoading={transactionsQuery.isLoading}
        error={transactionsQuery.error}
        onRetry={() => transactionsQuery.refetch()}
      />

      {/* Forecast */}
      <ForecastSection
        data={forecastQuery.data}
        currency={filters.currency}
        isLoading={forecastQuery.isLoading}
        error={forecastQuery.error}
        onRetry={() => forecastQuery.refetch()}
      />

      {/* Cohort */}
      <CohortSection
        data={cohortQuery.data}
        isLoading={cohortQuery.isLoading}
        error={cohortQuery.error}
        onRetry={() => cohortQuery.refetch()}
      />

      {/* Auto-refresh indicator */}
      <p className="text-center text-xs text-slate-400 pb-2">
        Data refreshes automatically every 60 seconds. Last updated:{" "}
        {overviewQuery.dataUpdatedAt
          ? new Date(overviewQuery.dataUpdatedAt).toLocaleTimeString()
          : "—"}
      </p>
    </div>
  );
};

export default AnalyticsPage;
