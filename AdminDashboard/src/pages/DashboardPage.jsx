import React from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardAPI } from "../services/adminAPI";
import StatCard from "../components/UI/StatCard";
import RecentActivity from "../components/UI/RecentActivity";
import DashboardCharts from "../components/UI/DashboardCharts";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative bg-white rounded-2xl p-6 border border-slate-100 shadow-card overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 skeleton" />
            <div className="space-y-3">
              <div className="h-3 skeleton rounded w-1/2" />
              <div className="h-8 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card"
          >
            <div className="h-4 skeleton rounded w-1/3 mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-10 skeleton rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardAPI.getDashboard,
    refetchInterval: 30000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => dashboardAPI.getAnalytics(),
    refetchInterval: 60000,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-8 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            Error loading dashboard
          </h3>
          <p className="text-sm text-red-600 mb-4">{error.message}</p>
          <button onClick={() => refetch()} className="btn-danger text-xs">
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.data?.stats || {};
  const activity = dashboardData?.data?.activity || [];
  const alerts = dashboardData?.data?.alerts || [];

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's an overview of your platform right now.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary shrink-0"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-amber-800">
              System Alerts
            </h3>
          </div>
          <ul className="space-y-1">
            {alerts.map((alert, i) => (
              <li
                key={i}
                className="text-xs text-amber-700 flex items-start gap-2"
              >
                <span className="mt-1 h-1 w-1 rounded-full bg-amber-500 flex-shrink-0" />
                {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          change={`${stats.newUsersToday || 0} new today`}
          changeType="positive"
          icon="users"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          change={`${(
            (stats.activeUsers / stats.totalUsers) * 100 || 0
          ).toFixed(1)}% of total`}
          changeType="neutral"
          icon="user-check"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          change={`${stats.transactionsToday || 0} today`}
          changeType="positive"
          icon="credit-card"
        />
        <StatCard
          title="Total Volume"
          value={`$${stats.totalVolume?.toLocaleString() || "0"}`}
          change={`$${stats.volumeToday?.toLocaleString() || "0"} today`}
          changeType="positive"
          icon="banknotes"
        />
      </div>

      {/* ── Activity + Quick stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
          <div className="card-header">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Recent Activity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Latest system events
              </p>
            </div>
            <ClockIcon className="h-4 w-4 text-slate-300" />
          </div>
          <div className="px-4 py-3">
            <RecentActivity activities={activity} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
          <div className="card-header">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Quick Stats
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Key metrics at a glance
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-4 w-4 text-slate-300" />
          </div>
          <div className="card-body space-y-0">
            {[
              {
                label: "Transaction Success Rate",
                value: "98.5%",
                color: "text-emerald-600",
              },
              {
                label: "Avg. Transaction Value",
                value: `$${(
                  stats.totalVolume / stats.totalTransactions || 0
                ).toFixed(2)}`,
                color: "text-blue-600",
              },
              {
                label: "System Uptime",
                value: `${Math.floor(
                  (stats.systemUptime || 0) / 3600,
                )}h ${Math.floor(((stats.systemUptime || 0) % 3600) / 60)}m`,
                color: "text-violet-600",
              },
              {
                label: "New Users Today",
                value: stats.newUsersToday || 0,
                color: "text-amber-600",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0"
              >
                <span className="text-sm text-slate-600">{label}</span>
                <span className={`text-sm font-bold tabular ${color}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      {!analyticsLoading && analyticsData && (
        <DashboardCharts data={analyticsData.data} />
      )}
    </div>
  );
};

export default DashboardPage;
