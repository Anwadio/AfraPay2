import React from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardAPI } from "../services/adminAPI";
import StatCard from "../components/UI/StatCard";
import RecentActivity from "../components/UI/RecentActivity";
import DashboardCharts from "../components/UI/DashboardCharts";

const DashboardPage = () => {
  // Fetch real dashboard data from backend
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardAPI.getDashboard,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => dashboardAPI.getAnalytics(),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium mb-2">
          Error Loading Dashboard
        </h3>
        <p className="text-red-600 mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = dashboardData?.data?.stats || {};
  const activity = dashboardData?.data?.activity || [];
  const alerts = dashboardData?.data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your platform today.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => refetch()}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium mb-2">System Alerts</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="text-yellow-700 text-sm">
                • {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards - Real Data */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          change={`${stats.newUsersToday} new today`}
          changeType="positive"
          icon="users"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          change={`${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total`}
          changeType="neutral"
          icon="user-check"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          change={`${stats.transactionsToday} today`}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity - Real Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Activity
            </h3>
            <p className="text-sm text-gray-500">
              Latest system events and user actions
            </p>
          </div>
          <div className="p-6">
            <RecentActivity activities={activity} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Stats</h3>
            <p className="text-sm text-gray-500">Key metrics at a glance</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Success Rate
                </span>
                <span className="text-sm text-gray-600">98.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Avg. Transaction
                </span>
                <span className="text-sm text-gray-600">
                  $
                  {(stats.totalVolume / stats.totalTransactions || 0).toFixed(
                    2,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  System Uptime
                </span>
                <span className="text-sm text-gray-600">
                  {Math.floor((stats.systemUptime || 0) / 3600)}h{" "}
                  {Math.floor(((stats.systemUptime || 0) % 3600) / 60)}m
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts - Real Data */}
      {!analyticsLoading && analyticsData && (
        <DashboardCharts data={analyticsData.data} />
      )}
    </div>
  );
};

export default DashboardPage;
