/* eslint-disable no-console */
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Wifi,
  CreditCard,
  Building2,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  DashboardSection,
  DashboardGrid,
} from "../components/layout/DashboardUtils";
import { Button } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  SectionHeader,
  GlassCard,
  DashboardStatCard,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { formatCurrencyAmount } from "../utils/currency";
import { transactionAPI } from "../services/api";
import { cn } from "../utils";
import useAnalytics from "../hooks/useAnalytics";

/* ── Register Chart.js components ────────────────────────────────────────── */
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

/* ── Chart shared tooltip style ──────────────────────────────────────────── */
const baseTooltip = {
  backgroundColor: "rgba(15,23,42,0.92)",
  titleColor: "#e2e8f0",
  bodyColor: "#94a3b8",
  padding: 10,
  cornerRadius: 8,
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
};

/* ── Skeleton loader component ────────────────────────────────────────────── */
const Skeleton = ({ className }) => (
  <div
    className={cn(
      "animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700",
      className,
    )}
  />
);

/* ── Provider icon resolver ───────────────────────────────────────────────── */
const PROVIDER_ICONS = {
  "M-Pesa": Smartphone,
  "MTN MoMo": Wifi,
  Wallet: DollarSign,
  Card: CreditCard,
  "Bank Transfer": Building2,
  Other: DollarSign,
};

/* ── Period tabs ─────────────────────────────────────────────────────────── */
const PERIODS = [
  { key: "week", label: "7 Days" },
  { key: "month", label: "30 Days" },
  { key: "year", label: "12 Months" },
];

/* ── Analytics Page ───────────────────────────────────────────────────────── */
const Analytics = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState("month");
  const { currency: displayCurrency } = useCurrency();

  // Fetch all dashboard data in one call — real-time from the backend
  const { data, loading, error, refetch } = useAnalytics(period);

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  /* ── Derived chart datasets ─────────────────────────────────────────────── */

  // Income vs Expenses bar chart — uses live 6-month trend data
  const barData = useMemo(() => {
    const labels = data?.monthlyTrend?.labels ?? [];
    return {
      labels,
      datasets: [
        {
          label: "Income",
          data: data?.monthlyTrend?.income ?? [],
          backgroundColor: "rgba(16,185,129,0.75)",
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "Expenses",
          data: data?.monthlyTrend?.expenses ?? [],
          backgroundColor: "rgba(59,130,246,0.65)",
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [data]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#94a3b8",
            font: { size: 12 },
            usePointStyle: true,
          },
        },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) =>
              ` ${formatCurrencyAmount(ctx.parsed.y, displayCurrency)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#64748b" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#64748b",
            callback: (v) => {
              if (v >= 1000)
                return `${formatCurrencyAmount(v / 1000, displayCurrency).replace(/\.\d+/, "")}k`;
              return formatCurrencyAmount(v, displayCurrency);
            },
          },
        },
      },
    }),
    [displayCurrency],
  );

  // Savings trend line chart — computed from monthly income/expenses
  const savingsTrend = useMemo(() => {
    const income = data?.monthlyTrend?.income ?? [];
    const expenses = data?.monthlyTrend?.expenses ?? [];
    return income.map((inc, i) => inc - (expenses[i] ?? 0));
  }, [data]);

  const lineData = useMemo(() => {
    const labels = data?.monthlyTrend?.labels ?? [];
    return {
      labels,
      datasets: [
        {
          label: "Net Savings",
          data: savingsTrend,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.12)",
          pointBackgroundColor: "#6366f1",
          pointRadius: 4,
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [data, savingsTrend]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) =>
              ` ${formatCurrencyAmount(ctx.parsed.y, displayCurrency)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#64748b" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#64748b",
            callback: (v) => {
              if (v >= 1000)
                return `${formatCurrencyAmount(v / 1000, displayCurrency).replace(/\.\d+/, "")}k`;
              return formatCurrencyAmount(v, displayCurrency);
            },
          },
        },
      },
    }),
    [displayCurrency],
  );

  // Spending doughnut chart — live category breakdown
  const doughnutData = useMemo(() => {
    const cats = data?.categories ?? [];
    return {
      labels: cats.map((c) => c.name),
      datasets: [
        {
          data: cats.map((c) => c.amount),
          backgroundColor: cats.map((c) => c.color),
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  }, [data]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) =>
              ` ${ctx.label}: ${formatCurrencyAmount(ctx.parsed, displayCurrency)}`,
          },
        },
      },
    }),
    [displayCurrency],
  );

  /* ── Summary values with safe defaults while loading ─────────────────────── */
  const summary = data?.summary ?? {};
  const avgMonthlyExpenses = useMemo(() => {
    const expenses = data?.monthlyTrend?.expenses ?? [];
    if (!expenses.length) return 0;
    return expenses.reduce((a, b) => a + b, 0) / expenses.length;
  }, [data]);

  /* ── Error state ─────────────────────────────────────────────────────────── */
  if (error && !data) {
    return (
      <DashboardLayout user={dashboardUser}>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-1">
                Unable to load analytics
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
                {error}. Please check your connection and try again.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <AnimatedSection>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <SectionHeader
              title="Analytics"
              subtitle="Track your income, expenses, and savings trends"
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <div className="flex items-center gap-2">
              {/* Period selector */}
              <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      period === p.key
                        ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={refetch}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("w-4 h-4", loading && "animate-spin")}
                />
                Refresh
              </Button>

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() =>
                  transactionAPI
                    .exportTransactions("csv", { period })
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `afrapay-transactions-${period}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    })
                    .catch((err) => console.error("Export failed:", err))
                }
              >
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>
          </div>
        </AnimatedSection>

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <AnimatedSection delay={0.05}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {loading ? (
              // Skeleton placeholder cards while data loads
              Array.from({ length: 4 }).map((_, i) => (
                <GlassCard key={i} className="p-5 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-36" />
                  <Skeleton className="h-3 w-20" />
                </GlassCard>
              ))
            ) : (
              <>
                <DashboardStatCard
                  title="Total Balance"
                  value={formatCurrencyAmount(
                    summary.totalBalance ?? 0,
                    displayCurrency,
                  )}
                  change="All-time net balance"
                  changeType="neutral"
                  icon={DollarSign}
                  iconColor="blue"
                  trend={[40, 55, 50, 70, 60, 80, 75, 90]}
                  index={0}
                />
                <DashboardStatCard
                  title="Income"
                  value={formatCurrencyAmount(
                    summary.incomingAmount ?? 0,
                    displayCurrency,
                  )}
                  change={`This ${period}`}
                  changeType="positive"
                  icon={TrendingUp}
                  iconColor="green"
                  trend={[30, 50, 60, 40, 75, 85, 70, 90]}
                  index={1}
                />
                <DashboardStatCard
                  title="Expenses"
                  value={formatCurrencyAmount(
                    summary.outgoingAmount ?? 0,
                    displayCurrency,
                  )}
                  change={`This ${period}`}
                  changeType="neutral"
                  icon={TrendingDown}
                  iconColor="amber"
                  trend={[60, 40, 70, 50, 65, 45, 55, 50]}
                  index={2}
                />
                <DashboardStatCard
                  title="Net Savings"
                  value={formatCurrencyAmount(
                    summary.netSavings ?? 0,
                    displayCurrency,
                  )}
                  change="Income − expenses"
                  changeType={
                    (summary.netSavings ?? 0) >= 0 ? "positive" : "negative"
                  }
                  icon={PiggyBank}
                  iconColor="teal"
                  trend={[20, 35, 45, 60, 50, 70, 65, 80]}
                  index={3}
                />
              </>
            )}
          </div>
        </AnimatedSection>

        {/* ── Bar + Line charts ─────────────────────────────────────────────── */}
        <AnimatedSection delay={0.08}>
          <DashboardGrid columns={2} className="mb-6">
            <DashboardSection
              title="Income vs Expenses"
              description="Last 6 months comparison"
            >
              <div className="h-64">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <Bar data={barData} options={barOptions} />
                )}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Savings Trend"
              description="Net savings per month"
            >
              <div className="h-64">
                {loading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <Line data={lineData} options={lineOptions} />
                )}
              </div>
            </DashboardSection>
          </DashboardGrid>
        </AnimatedSection>

        {/* ── Category breakdown + Top transactions ─────────────────────────── */}
        <AnimatedSection delay={0.11}>
          <DashboardGrid columns={2} className="mb-6">
            {/* Doughnut + legend */}
            <DashboardSection
              title="Spending by Category"
              description="Breakdown of outgoing transactions"
            >
              {loading ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <Skeleton className="w-44 h-44 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3 w-full">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ) : (data?.categories ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                  <p className="text-sm">No expense data for this period</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-44 h-44 shrink-0">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    {(data?.categories ?? []).map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 flex-1 truncate">
                          {cat.name}
                        </span>
                        <div className="flex-1 bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5 mx-2">
                          <motion.div
                            className="h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
                          {cat.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DashboardSection>

            {/* Top transactions by amount */}
            <DashboardSection
              title="Top Transactions"
              description="Highest value transactions this period"
            >
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : (data?.topTransactions ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                  <p className="text-sm">
                    No transactions found for this period
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(data?.topTransactions ?? []).map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          tx.type === "credit"
                            ? "bg-emerald-100 dark:bg-emerald-900/40"
                            : "bg-red-100 dark:bg-red-900/40",
                        )}
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {tx.date} · {tx.provider}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "text-sm font-bold shrink-0",
                          tx.type === "credit"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500",
                        )}
                      >
                        {tx.type === "credit" ? "+" : "−"}
                        {formatCurrencyAmount(tx.amount, tx.currency)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </DashboardSection>
          </DashboardGrid>
        </AnimatedSection>

        {/* ── Provider breakdown ────────────────────────────────────────────── */}
        <AnimatedSection delay={0.13}>
          <DashboardSection
            title="Transactions by Provider"
            description="Breakdown by payment method (M-Pesa, MTN MoMo, Wallet, etc.)"
            className="mb-6"
          >
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (data?.providerBreakdown ?? []).length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <p className="text-sm">No provider data available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(data?.providerBreakdown ?? []).map((p, i) => {
                  const Icon = PROVIDER_ICONS[p.provider] ?? DollarSign;
                  return (
                    <motion.div
                      key={p.provider}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <GlassCard className="p-4 text-center hover:scale-105 transition-transform cursor-default">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                          style={{ backgroundColor: `${p.color}20` }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: p.color }}
                          />
                        </div>
                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-0.5">
                          {p.provider}
                        </p>
                        <p
                          className="text-base font-bold"
                          style={{ color: p.color }}
                        >
                          {formatCurrencyAmount(p.volume, displayCurrency)}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {p.count} txn{p.count !== 1 ? "s" : ""} ·{" "}
                          {p.percentage}%
                        </p>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </DashboardSection>
        </AnimatedSection>

        {/* ── Quick insights strip ──────────────────────────────────────────── */}
        <AnimatedSection delay={0.15}>
          <DashboardSection title="Quick Insights">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))
              ) : (
                <>
                  {/* Savings rate */}
                  <GlassCard className="p-4 text-center bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Savings Rate
                    </p>
                    <p className="text-2xl font-bold mb-1 text-emerald-600 dark:text-emerald-400">
                      {(summary.incomingAmount ?? 0) > 0
                        ? `${(((summary.netSavings ?? 0) / (summary.incomingAmount ?? 1)) * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Of total income saved
                    </p>
                  </GlassCard>

                  {/* Average monthly spend */}
                  <GlassCard className="p-4 text-center bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Avg. Monthly Spend
                    </p>
                    <p className="text-2xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                      {formatCurrencyAmount(
                        avgMonthlyExpenses,
                        displayCurrency,
                      )}
                    </p>
                    <p className="text-xs text-neutral-400">
                      Based on last 6 months
                    </p>
                  </GlassCard>

                  {/* Transaction count */}
                  <GlassCard className="p-4 text-center bg-purple-50 dark:bg-purple-900/20">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Total Transactions
                    </p>
                    <p className="text-2xl font-bold mb-1 text-purple-600 dark:text-purple-400">
                      {summary.transactionCount ?? 0}
                    </p>
                    <p className="text-xs text-neutral-400">This {period}</p>
                  </GlassCard>
                </>
              )}
            </div>
          </DashboardSection>
        </AnimatedSection>

        {/* ── Recent transactions ───────────────────────────────────────────── */}
        <AnimatedSection delay={0.17}>
          <DashboardSection
            title="Recent Activity"
            description="Your latest transactions"
            className="mt-6"
          >
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : (data?.recentTransactions ?? []).length === 0 ? (
              <div className="text-center py-10 text-neutral-400">
                <p className="text-sm">No recent transactions found</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {(data?.recentTransactions ?? []).map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          tx.type === "credit"
                            ? "bg-emerald-100 dark:bg-emerald-900/40"
                            : "bg-red-100 dark:bg-red-900/40",
                        )}
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {tx.date} · {tx.provider}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                          tx.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : tx.status === "pending"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400",
                        )}
                      >
                        {tx.status}
                      </span>
                      <p
                        className={cn(
                          "text-sm font-bold shrink-0",
                          tx.type === "credit"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500",
                        )}
                      >
                        {tx.type === "credit" ? "+" : "−"}
                        {formatCurrencyAmount(tx.amount, tx.currency)}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </DashboardSection>
        </AnimatedSection>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Analytics;
