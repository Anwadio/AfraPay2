/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  DashboardSection,
  DashboardGrid,
  DashboardStatsGrid,
} from "../components/layout/DashboardUtils";
import {
  FinanceTransactionItem,
  FinanceQuickActions,
} from "../components/fintech/FinanceComponents";
import { Button } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  DashboardStatCard,
  SectionHeader,
  StatusBadge,
  GlassCard,
  AnimatedButton,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { userAPI, transactionAPI } from "../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Fetch profile, recent transactions, and financial summary in parallel
  useEffect(() => {
    Promise.all([
      userAPI.getProfile().catch((err) => {
        console.error("Profile fetch failed:", err);
        return null;
      }),
      transactionAPI.getTransactions({ limit: 5 }).catch((err) => {
        console.error("Transactions fetch failed:", err);
        return null;
      }),
      transactionAPI.getSummary({ period: "month" }).catch((err) => {
        console.error("Summary fetch failed:", err);
        return null;
      }),
    ]).then(([profileRes, txRes, summaryRes]) => {
      if (profileRes?.success && profileRes.data) setProfile(profileRes.data);
      if (txRes?.success && txRes.data) {
        setTransactions(
          Array.isArray(txRes.data)
            ? txRes.data
            : txRes.data.transactions || txRes.data.data || [],
        );
      }
      if (summaryRes?.success && summaryRes.data) setSummary(summaryRes.data);
      setLoadingProfile(false);
      setLoadingTransactions(false);
      setLoadingSummary(false);
    });
  }, []);

  // Derive display name from profile or AuthContext user
  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
      profile.name
    : user?.name || user?.email || "User";

  const dashboardUser = {
    name: displayName,
    email: profile?.email || user?.email || "",
    avatar: profile?.avatar || null,
    role: user?.role || "user",
  };

  // Financial stats from the summary endpoint
  const totalBalance = summary?.totalBalance ?? null;
  const monthlyIncome = summary?.incomingAmount ?? null;
  const monthlyExpenses = summary?.outgoingAmount ?? null;
  const netSavings = summary?.netSavings ?? null;
  const summaryLoading = loadingSummary;
  const summaryCurrency = summary?.currency || "USD";

  const formatAmount = (val) =>
    val !== null
      ? `${summaryCurrency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";

  const handleTransactionClick = (transaction) => {
    console.log("Transaction clicked:", transaction);
  };

  return (
    <DashboardLayout user={dashboardUser} className="h-screen">
      <PageContainer className="space-y-6 pb-8">
        {/* ── Welcome Header ─────────────────────────────────── */}
        <AnimatedSection className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
                Overview
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
              Welcome back, {displayName.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-slate-400">
              Here's what's happening with your money today.
            </p>
          </div>
          <AnimatedButton
            variant="outline"
            size="sm"
            icon={ArrowUpRight}
            iconPosition="right"
            onClick={() => navigate("/transactions")}
          >
            View All
          </AnimatedButton>
        </AnimatedSection>

        {/* ── Stats Grid ──────────────────────────────────────── */}
        <AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Total Balance"
              value={summaryLoading ? "—" : formatAmount(totalBalance)}
              change={summaryLoading ? "Loading…" : "All-time net"}
              changeType="neutral"
              icon={DollarSign}
              iconColor="blue"
              trend={[40, 60, 45, 80, 55, 70, 85, 65]}
              index={0}
            />
            <DashboardStatCard
              title="Monthly Income"
              value={summaryLoading ? "—" : formatAmount(monthlyIncome)}
              change={summaryLoading ? "Loading…" : "This month"}
              changeType="positive"
              icon={TrendingUp}
              iconColor="green"
              trend={[30, 50, 60, 40, 75, 85, 70, 90]}
              index={1}
            />
            <DashboardStatCard
              title="Monthly Expenses"
              value={summaryLoading ? "—" : formatAmount(monthlyExpenses)}
              change={summaryLoading ? "Loading…" : "Payments & bills"}
              changeType="neutral"
              icon={TrendingDown}
              iconColor="amber"
              trend={[60, 40, 70, 50, 65, 45, 55, 50]}
              index={2}
            />
            <DashboardStatCard
              title="Net Savings"
              value={summaryLoading ? "—" : formatAmount(netSavings)}
              change={summaryLoading ? "Loading…" : "Income − expenses"}
              changeType={
                netSavings !== null && netSavings >= 0 ? "positive" : "negative"
              }
              icon={PiggyBank}
              iconColor="teal"
              trend={[20, 35, 45, 60, 50, 70, 65, 80]}
              index={3}
            />
          </div>
        </AnimatedSection>

        {/* ── Quick Actions ───────────────────────────────────── */}
        <AnimatedSection delay={1}>
          <SectionHeader
            title="Quick Actions"
            description="Common financial operations"
          />
          <FinanceQuickActions />
        </AnimatedSection>

        {/* ── Main Grid: Account Info + Transactions ──────────── */}
        <AnimatedSection delay={2}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Info Card */}
            <GlassCard className="p-6">
              <SectionHeader title="Account Info" badge="Live" />
              {loadingProfile ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-3 bg-slate-100 rounded w-24" />
                      <div className="h-3 bg-slate-100 rounded w-32" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Full Name", value: displayName },
                    { label: "Email", value: dashboardUser.email },
                    { label: "Country", value: profile?.country || "—" },
                    {
                      label: "KYC Level",
                      value: String(profile?.kycLevel ?? user?.kycLevel ?? 0),
                    },
                    {
                      label: "Email Verified",
                      value: profile?.emailVerified ? "Verified" : "Pending",
                      valueClass: profile?.emailVerified
                        ? "text-emerald-600"
                        : "text-amber-600",
                    },
                    {
                      label: "Account Status",
                      value: profile?.accountStatus || "active",
                    },
                  ].map(({ label, value, valueClass }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-xs font-medium text-slate-400">
                        {label}
                      </span>
                      <span
                        className={`text-xs font-semibold text-slate-700 capitalize ${valueClass || ""}`}
                      >
                        {label === "Account Status" ? (
                          <StatusBadge status={value} />
                        ) : (
                          value
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Recent Transactions */}
            <GlassCard className="flex flex-col">
              <div className="px-6 pt-6 pb-4">
                <SectionHeader
                  title="Recent Transactions"
                  action={
                    <AnimatedButton
                      variant="outline"
                      size="xs"
                      icon={ChevronRight}
                      iconPosition="right"
                      onClick={() => navigate("/transactions")}
                    >
                      See all
                    </AnimatedButton>
                  }
                />
              </div>

              <div className="flex-1 overflow-auto">
                {loadingTransactions ? (
                  <div className="px-4 pb-4 space-y-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 animate-pulse"
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-100 rounded w-32" />
                          <div className="h-2 bg-slate-100 rounded w-20" />
                        </div>
                        <div className="h-3 bg-slate-100 rounded w-16" />
                      </div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                      <Clock className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      No transactions yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Your activity will appear here
                    </p>
                  </div>
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    className="px-2 pb-4"
                  >
                    {transactions.slice(0, 5).map((transaction, i) => (
                      <FinanceTransactionItem
                        key={transaction.id || transaction.$id}
                        transaction={transaction}
                        onClick={() => handleTransactionClick(transaction)}
                        index={i}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            </GlassCard>
          </div>
        </AnimatedSection>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Dashboard;
