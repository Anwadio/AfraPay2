/* eslint-disable no-console */
import React, { useState, useEffect } from "react";
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
import { transactionAPI } from "../services/api";
import { cn } from "../utils";

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

/* ── Demo / fallback data ─────────────────────────────────────────────────── */
const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const DEMO_SUMMARY = {
  totalBalance: 8340.0,
  incomingAmount: 4200.0,
  outgoingAmount: 1860.0,
  netSavings: 2340.0,
  currency: "USD",
  transactionCount: 47,
};

const DEMO_MONTHLY = {
  income: [2800, 3100, 2600, 3800, 3500, 4200],
  expenses: [1900, 2100, 1700, 2300, 2000, 1860],
};

const DEMO_CATEGORIES = [
  { label: "Transfers", amount: 620, color: "#3b82f6", pct: 33 },
  { label: "Bills", amount: 390, color: "#8b5cf6", pct: 21 },
  { label: "Shopping", amount: 310, color: "#f59e0b", pct: 17 },
  { label: "Food", amount: 245, color: "#10b981", pct: 13 },
  { label: "Transport", amount: 185, color: "#ec4899", pct: 10 },
  { label: "Other", amount: 110, color: "#64748b", pct: 6 },
];

const DEMO_TOP_TXS = [
  {
    id: 1,
    desc: "Salary — Employer",
    type: "credit",
    amount: 3200,
    currency: "USD",
    date: "Mar 1",
  },
  {
    id: 2,
    desc: "Rent Payment",
    type: "debit",
    amount: 800,
    currency: "USD",
    date: "Mar 3",
  },
  {
    id: 3,
    desc: "MTN MoMo Transfer",
    type: "debit",
    amount: 250,
    currency: "GHS",
    date: "Mar 7",
  },
  {
    id: 4,
    desc: "Freelance Invoice",
    type: "credit",
    amount: 1000,
    currency: "USD",
    date: "Mar 10",
  },
  {
    id: 5,
    desc: "Electricity Bill",
    type: "debit",
    amount: 95,
    currency: "USD",
    date: "Mar 12",
  },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmt(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount ?? 0);
  } catch {
    return `${currency} ${Number(amount ?? 0).toFixed(2)}`;
  }
}

/* ── Chart shared options ─────────────────────────────────────────────────── */
const baseTooltip = {
  backgroundColor: "rgba(15,23,42,0.9)",
  titleColor: "#e2e8f0",
  bodyColor: "#94a3b8",
  padding: 10,
  cornerRadius: 8,
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
};

/* ── Analytics Page ───────────────────────────────────────────────────────── */
const Analytics = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([transactionAPI.getSummary({ period }).catch(() => null)]).then(
      ([summaryRes]) => {
        if (summaryRes?.success && summaryRes.data) setSummary(summaryRes.data);
        setLoading(false);
      },
    );
  }, [period]);

  const data = summary ?? DEMO_SUMMARY;
  const currency = data.currency || "USD";

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  /* ── Income vs Expense bar chart ────────────────────────────────────────── */
  const barData = {
    labels: MONTHS,
    datasets: [
      {
        label: "Income",
        data: DEMO_MONTHLY.income,
        backgroundColor: "rgba(16,185,129,0.75)",
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: "Expenses",
        data: DEMO_MONTHLY.expenses,
        backgroundColor: "rgba(59,130,246,0.65)",
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#94a3b8", font: { size: 12 }, usePointStyle: true },
      },
      tooltip: {
        ...baseTooltip,
        callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.y, currency)}` },
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
          callback: (v) => `$${(v / 1000).toFixed(1)}k`,
        },
      },
    },
  };

  /* ── Savings trend line chart ────────────────────────────────────────────── */
  const savingsTrend = DEMO_MONTHLY.income.map(
    (inc, i) => inc - DEMO_MONTHLY.expenses[i],
  );

  const lineData = {
    labels: MONTHS,
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

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...baseTooltip,
        callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.y, currency)}` },
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
          callback: (v) => `$${(v / 1000).toFixed(1)}k`,
        },
      },
    },
  };

  /* ── Spending doughnut ───────────────────────────────────────────────────── */
  const doughnutData = {
    labels: DEMO_CATEGORIES.map((c) => c.label),
    datasets: [
      {
        data: DEMO_CATEGORIES.map((c) => c.amount),
        backgroundColor: DEMO_CATEGORIES.map((c) => c.color),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...baseTooltip,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${fmt(ctx.parsed, currency)}`,
        },
      },
    },
  };

  /* ── Period tabs ────────────────────────────────────────────────────────── */
  const PERIODS = [
    { key: "week", label: "7 Days" },
    { key: "month", label: "30 Days" },
    { key: "year", label: "12 Months" },
  ];

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        {/* Header */}
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
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => {}}
              >
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>
          </div>
        </AnimatedSection>

        {/* Stat cards */}
        <AnimatedSection delay={0.05}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <DashboardStatCard
              title="Total Balance"
              value={loading ? "—" : fmt(data.totalBalance, currency)}
              change="All wallets combined"
              changeType="neutral"
              icon={DollarSign}
              iconColor="blue"
              trend={[40, 55, 50, 70, 60, 80, 75, 90]}
              index={0}
            />
            <DashboardStatCard
              title="Income"
              value={loading ? "—" : fmt(data.incomingAmount, currency)}
              change={`This ${period}`}
              changeType="positive"
              icon={TrendingUp}
              iconColor="green"
              trend={[30, 50, 60, 40, 75, 85, 70, 90]}
              index={1}
            />
            <DashboardStatCard
              title="Expenses"
              value={loading ? "—" : fmt(data.outgoingAmount, currency)}
              change={`This ${period}`}
              changeType="neutral"
              icon={TrendingDown}
              iconColor="amber"
              trend={[60, 40, 70, 50, 65, 45, 55, 50]}
              index={2}
            />
            <DashboardStatCard
              title="Net Savings"
              value={loading ? "—" : fmt(data.netSavings, currency)}
              change="Income − expenses"
              changeType={data.netSavings >= 0 ? "positive" : "negative"}
              icon={PiggyBank}
              iconColor="teal"
              trend={[20, 35, 45, 60, 50, 70, 65, 80]}
              index={3}
            />
          </div>
        </AnimatedSection>

        {/* Income vs Expenses bar + Savings trend line */}
        <AnimatedSection delay={0.08}>
          <DashboardGrid columns={2} className="mb-6">
            {/* Bar chart */}
            <DashboardSection
              title="Income vs Expenses"
              description="Last 6 months comparison"
            >
              <div className="h-64">
                <Bar data={barData} options={barOptions} />
              </div>
            </DashboardSection>

            {/* Line chart */}
            <DashboardSection
              title="Savings Trend"
              description="Net savings per month"
            >
              <div className="h-64">
                <Line data={lineData} options={lineOptions} />
              </div>
            </DashboardSection>
          </DashboardGrid>
        </AnimatedSection>

        {/* Spending breakdown + Top transactions */}
        <AnimatedSection delay={0.11}>
          <DashboardGrid columns={2} className="mb-6">
            {/* Doughnut + legend */}
            <DashboardSection
              title="Spending by Category"
              description="Breakdown of your outgoing transactions"
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-44 h-44 shrink-0">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {DEMO_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 flex-1 truncate">
                        {cat.label}
                      </span>
                      <div className="flex-1 bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5 mx-2">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${cat.pct}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
                        {cat.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardSection>

            {/* Top transactions */}
            <DashboardSection
              title="Top Transactions"
              description="Highest value transactions this period"
            >
              <div className="space-y-2">
                {DEMO_TOP_TXS.map((tx) => (
                  <div
                    key={tx.id}
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
                        {tx.desc}
                      </p>
                      <p className="text-xs text-neutral-400">{tx.date}</p>
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
                      {fmt(tx.amount, tx.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </DashboardSection>
          </DashboardGrid>
        </AnimatedSection>

        {/* Quick insights strip */}
        <AnimatedSection delay={0.14}>
          <DashboardSection title="Quick Insights">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Savings Rate",
                  value:
                    data.incomingAmount > 0
                      ? `${((data.netSavings / data.incomingAmount) * 100).toFixed(1)}%`
                      : "—",
                  sub: "Of total income saved",
                  color: "text-emerald-600 dark:text-emerald-400",
                  bg: "bg-emerald-50 dark:bg-emerald-900/20",
                },
                {
                  label: "Avg. Monthly Spend",
                  value: fmt(
                    DEMO_MONTHLY.expenses.reduce((a, b) => a + b, 0) /
                      DEMO_MONTHLY.expenses.length,
                    currency,
                  ),
                  sub: "Based on last 6 months",
                  color: "text-blue-600 dark:text-blue-400",
                  bg: "bg-blue-50 dark:bg-blue-900/20",
                },
                {
                  label: "Total Transactions",
                  value: data.transactionCount ?? 47,
                  sub: `This ${period}`,
                  color: "text-purple-600 dark:text-purple-400",
                  bg: "bg-purple-50 dark:bg-purple-900/20",
                },
              ].map((insight, i) => (
                <GlassCard
                  key={i}
                  className={cn("p-4 text-center", insight.bg)}
                >
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                    {insight.label}
                  </p>
                  <p className={cn("text-2xl font-bold mb-1", insight.color)}>
                    {insight.value}
                  </p>
                  <p className="text-xs text-neutral-400">{insight.sub}</p>
                </GlassCard>
              ))}
            </div>
          </DashboardSection>
        </AnimatedSection>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Analytics;
