import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { analyticsAPI, transactionAPI } from "../../services/api";
import Card from "../../components/ui/Card";
import { LoadingState, ErrorState } from "../../components/ui/States";

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    parseFloat(amount || 0),
  );
}

function KPICard({
  icon,
  label,
  value,
  change,
  color = "text-blue-600",
  bgColor = "bg-blue-50",
}) {
  const isPositive = parseFloat(change) >= 0;
  return (
    <Card className="flex-1 mx-1">
      <View
        className={`w-10 h-10 rounded-xl ${bgColor} items-center justify-center mb-2`}
      >
        <Text className="text-xl">{icon}</Text>
      </View>
      <Text className={`text-xl font-bold ${color}`}>{value}</Text>
      <Text
        className="text-xs text-slate-600 font-medium mt-0.5"
        numberOfLines={1}
      >
        {label}
      </Text>
      {change !== undefined && (
        <View
          className={`flex-row items-center mt-1 ${isPositive ? "text-emerald-600" : "text-red-500"}`}
        >
          <Text
            className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}
          >
            {isPositive ? "▲" : "▼"} {Math.abs(parseFloat(change)).toFixed(1)}%
          </Text>
          <Text className="text-xs text-slate-400 ml-1">vs last period</Text>
        </View>
      )}
    </Card>
  );
}

/** Simple bar chart using flex layout — no external dependency */
function SimpleBarChart({
  data,
  maxValue,
  labelKey = "label",
  valueKey = "value",
  color = "#2563eb",
}) {
  if (!data?.length) return null;
  const max = maxValue || Math.max(...data.map((d) => d[valueKey] || 0), 1);

  return (
    <View className="mt-2">
      <View
        className="flex-row items-end justify-between"
        style={{ height: 80 }}
      >
        {data.slice(0, 12).map((item, i) => {
          const barHeight = Math.max(4, ((item[valueKey] || 0) / max) * 72);
          return (
            <View key={i} className="flex-1 items-center mx-0.5">
              <View
                style={{
                  width: "100%",
                  height: barHeight,
                  backgroundColor: color,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row justify-between mt-1">
        {data.slice(0, 12).map((item, i) => (
          <Text
            key={i}
            className="text-slate-400 flex-1 text-center"
            style={{ fontSize: 8 }}
            numberOfLines={1}
          >
            {String(item[labelKey] || "").slice(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const PERIODS = [
  { label: "7D", value: "7d" },
  { label: "1M", value: "30d" },
  { label: "3M", value: "90d" },
  { label: "1Y", value: "365d" },
];

// Map UI period values to backend-accepted values (day | week | month | year)
function toApiPeriod(uiPeriod) {
  const map = { "7d": "week", "30d": "month", "90d": "month", "365d": "year" };
  return map[uiPeriod] || "month";
}

export default function AnalyticsScreen() {
  const [dashboard, setDashboard] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("30d");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const apiPeriod = toApiPeriod(period);
      const [dashRes, sumRes] = await Promise.all([
        analyticsAPI.getDashboard({ period: apiPeriod }),
        transactionAPI.getSummary({ period: apiPeriod }),
      ]);
      setDashboard(dashRes.data?.analytics || dashRes.data || {});
      setSummary(sumRes.data?.summary || sumRes.data || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <LoadingState message="Loading analytics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const kpis = dashboard?.kpis || {};
  const trends = dashboard?.trends || summary?.trends || [];
  const categories = dashboard?.categories || summary?.categories || [];
  const topRecipients = dashboard?.topRecipients || [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-xl font-bold text-slate-900">Analytics</Text>
          <Text className="text-slate-400 text-sm mt-0.5">
            Your financial insights
          </Text>
        </View>

        {/* Period Selector */}
        <View className="flex-row px-5 mb-4 gap-2">
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.value}
              onPress={() => setPeriod(p.value)}
              className={`flex-1 py-2 rounded-xl border items-center ${
                period === p.value
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${period === p.value ? "text-white" : "text-slate-600"}`}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Cards */}
        <View className="px-5 mb-4">
          <View className="flex-row mb-3">
            <KPICard
              icon="💸"
              label="Total Sent"
              value={formatCurrency(kpis.totalSent || summary?.totalSent || 0)}
              change={kpis.sentChange}
              color="text-red-500"
              bgColor="bg-red-50"
            />
            <KPICard
              icon="⬇"
              label="Total Received"
              value={formatCurrency(
                kpis.totalReceived || summary?.totalReceived || 0,
              )}
              change={kpis.receivedChange}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
            />
          </View>
          <View className="flex-row">
            <KPICard
              icon="📊"
              label="Transactions"
              value={String(kpis.count || summary?.count || 0)}
              change={kpis.countChange}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <KPICard
              icon="💰"
              label="Net Balance"
              value={formatCurrency(
                parseFloat(kpis.totalReceived || summary?.totalReceived || 0) -
                  parseFloat(kpis.totalSent || summary?.totalSent || 0),
              )}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
          </View>
        </View>

        {/* Spending Trend Chart */}
        {trends.length > 0 && (
          <View className="px-5 mb-4">
            <Card>
              <Text className="text-sm font-bold text-slate-800 mb-1">
                Spending Trend
              </Text>
              <Text className="text-xs text-slate-400 mb-2">
                Transaction volume over time
              </Text>
              <SimpleBarChart
                data={trends}
                labelKey={
                  Object.keys(trends[0] || {}).find(
                    (k) => k !== "amount" && k !== "value" && k !== "count",
                  ) || "date"
                }
                valueKey={
                  Object.keys(trends[0] || {}).find((k) =>
                    ["amount", "value", "total"].includes(k),
                  ) || "amount"
                }
                color="#2563eb"
              />
            </Card>
          </View>
        )}

        {/* Categories Breakdown */}
        {categories.length > 0 && (
          <View className="px-5 mb-4">
            <Card>
              <Text className="text-sm font-bold text-slate-800 mb-4">
                By Category
              </Text>
              {categories.slice(0, 6).map((cat, i) => {
                const total =
                  categories.reduce(
                    (s, c) => s + (c.amount || c.total || 0),
                    0,
                  ) || 1;
                const pct = Math.round(
                  ((cat.amount || cat.total || 0) / total) * 100,
                );
                const colors = [
                  "#2563eb",
                  "#059669",
                  "#7c3aed",
                  "#d97706",
                  "#dc2626",
                  "#0891b2",
                ];
                return (
                  <View key={cat._id || cat.name || i} className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm text-slate-700 font-medium">
                        {cat.name || cat._id || `Category ${i + 1}`}
                      </Text>
                      <Text className="text-sm font-bold text-slate-800">
                        {formatCurrency(cat.amount || cat.total || 0)}
                        <Text className="text-xs text-slate-400 font-normal">
                          {" "}
                          ({pct}%)
                        </Text>
                      </Text>
                    </View>
                    <View className="h-2 bg-slate-100 rounded-full">
                      <View
                        style={{
                          width: `${pct}%`,
                          height: 8,
                          backgroundColor: colors[i % colors.length],
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* Top Recipients */}
        {topRecipients.length > 0 && (
          <View className="px-5 mb-4">
            <Card>
              <Text className="text-sm font-bold text-slate-800 mb-3">
                Top Recipients
              </Text>
              {topRecipients.slice(0, 5).map((r, i) => (
                <View key={r._id || i} className="flex-row items-center mb-3">
                  <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Text className="text-blue-700 font-bold text-xs">
                      {(r.name || r.email || "U")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium text-slate-800"
                      numberOfLines={1}
                    >
                      {r.name || r.email || "Unknown"}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {r.count} transactions
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-blue-600">
                    {formatCurrency(r.totalAmount || 0)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Insights */}
        {dashboard?.insights?.length > 0 && (
          <View className="px-5 mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-3">
              💡 Insights
            </Text>
            {dashboard.insights.map((insight, i) => (
              <View
                key={i}
                className={`rounded-xl p-4 mb-3 ${insight.type === "warning" ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"}`}
              >
                <Text
                  className={`text-sm font-medium ${insight.type === "warning" ? "text-amber-700" : "text-blue-700"}`}
                >
                  {insight.message || insight.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
