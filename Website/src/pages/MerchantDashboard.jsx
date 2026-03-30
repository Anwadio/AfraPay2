/* eslint-disable no-console */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Store,
  TrendingUp,
  Wallet,
  Hash,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  DollarSign,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  Send,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  PageContainer,
  AnimatedSection,
  DashboardStatCard,
  SectionHeader,
  GlassCard,
  AnimatedButton,
} from "../components/ui/PremiumUI";
import { useMerchant } from "../contexts/MerchantContext";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { merchantAPI } from "../services/api";
import { formatCurrencyAmount } from "../utils/currency";
import toast from "react-hot-toast";

// ── Business types ───────────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  "retail",
  "restaurant",
  "services",
  "wholesale",
  "salon",
  "pharmacy",
  "supermarket",
  "tech",
  "logistics",
  "other",
];

// ── Application form ─────────────────────────────────────────────────────────
function MerchantApplicationForm({ onSuccess }) {
  const { registerMerchant } = useMerchant();
  const [form, setForm] = useState({
    businessName: "",
    businessType: "retail",
    phoneNumber: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    const name = form.businessName.trim();
    if (!name || name.length < 2)
      e.businessName = "Business name must be at least 2 characters";
    else if (name.length > 120)
      e.businessName = "Business name must be ≤ 120 characters";
    if (!BUSINESS_TYPES.includes(form.businessType))
      e.businessType = "Select a valid business type";
    if (!/^\+?[\d\s\-()]{7,20}$/.test(form.phoneNumber))
      e.phoneNumber = "Enter a valid phone number (e.g. +211 912 345 678)";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length) {
      setErrors(ve);
      return;
    }
    setSubmitting(true);
    try {
      await registerMerchant(form);
      toast.success(
        "Application submitted! We'll review it within 24–48 hours.",
      );
      onSuccess?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to submit application",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const field = (id, label, type = "text", extra = {}) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={form[id]}
        onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
        {...extra}
      />
      {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {field("businessName", "Business Name", "text", {
        placeholder: "e.g. Nile Supermarket",
        maxLength: 120,
      })}

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Business Type
        </label>
        <select
          value={form.businessType}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, businessType: e.target.value }))
          }
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors capitalize"
        >
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        {errors.businessType && (
          <p className="text-xs text-red-500 mt-1">{errors.businessType}</p>
        )}
      </div>

      {field("phoneNumber", "Business Phone Number", "tel", {
        placeholder: "+211 912 345 678",
      })}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        {submitting ? "Submitting…" : "Submit Application"}
      </button>
    </motion.form>
  );
}

// ── "none" — no application yet ──────────────────────────────────────────────
function NoneSection({ dashboardUser }) {
  return (
    <DashboardLayout user={dashboardUser} className="h-screen">
      <PageContainer className="space-y-6 pb-8">
        <AnimatedSection>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
              Merchant Hub
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
            Start Accepting Payments
          </h1>
          <p className="text-sm text-slate-400">
            Get a dedicated till number, merchant wallet, and real-time
            analytics — free to set up.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Application form */}
          <GlassCard className="p-7">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Store className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Apply for a Business Account
                </h2>
                <p className="text-sm text-slate-500">
                  Takes less than 2 minutes
                </p>
              </div>
            </div>
            <MerchantApplicationForm />
          </GlassCard>

          {/* Benefits */}
          <div className="space-y-3">
            {[
              {
                Icon: Hash,
                color: "bg-blue-50 text-blue-600",
                title: "Dedicated Till Number",
                desc: "Receive customer payments directly to your unique till code.",
              },
              {
                Icon: Wallet,
                color: "bg-emerald-50 text-emerald-600",
                title: "Merchant Wallet",
                desc: "Separate business wallet to track merchant funds independently.",
              },
              {
                Icon: BarChart3,
                color: "bg-violet-50 text-violet-600",
                title: "Sales Analytics",
                desc: "Track daily revenue, customer counts, and transaction trends.",
              },
              {
                Icon: Send,
                color: "bg-amber-50 text-amber-600",
                title: "Instant Payouts",
                desc: "Withdraw funds to M-Pesa, MTN, or your bank instantly.",
              },
            ].map(({ Icon, color, title, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 4 }}
                className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}

// ── "pending" — application under review ─────────────────────────────────────
function PendingSection({ dashboardUser }) {
  const { refetch } = useMerchant();
  return (
    <DashboardLayout user={dashboardUser} className="h-screen">
      <PageContainer className="space-y-6 pb-8">
        <AnimatedSection>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">
              Application Status
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
            Your Application Is Under Review
          </h1>
          <p className="text-sm text-slate-400">
            Our team typically reviews applications within 24–48 hours.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={1}>
          <GlassCard className="p-8 max-w-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <Clock className="w-7 h-7 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-900">
                  Pending Review
                </p>
                <p className="text-sm text-slate-500">Application submitted</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0">
                Pending
              </span>
            </div>

            <div className="space-y-4 text-sm">
              {[
                { step: "1", text: "Application received", done: true },
                { step: "2", text: "Identity verification", done: false },
                { step: "3", text: "Business verification", done: false },
                { step: "4", text: "Account activation", done: false },
              ].map(({ step, text, done }) => (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : step}
                  </div>
                  <span
                    className={
                      done ? "text-slate-700 font-medium" : "text-slate-400"
                    }
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={refetch}
              className="mt-6 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Check latest status
            </button>
          </GlassCard>
        </AnimatedSection>
      </PageContainer>
    </DashboardLayout>
  );
}

// ── "rejected" ───────────────────────────────────────────────────────────────
function RejectedSection({ dashboardUser, merchant }) {
  const navigate = useNavigate();
  return (
    <DashboardLayout user={dashboardUser} className="h-screen">
      <PageContainer className="space-y-6 pb-8">
        <AnimatedSection>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-red-600 uppercase tracking-widest">
              Application Status
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
            Application Not Approved
          </h1>
          <p className="text-sm text-slate-400">
            Your merchant application was not approved at this time.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={1}>
          <GlassCard className="p-8 max-w-lg">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Not Approved</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                  Rejected
                </span>
              </div>
            </div>

            {merchant?.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold mb-1">
                      Reason for rejection:
                    </p>
                    <p className="text-sm">{merchant.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-slate-500 mb-5">
              You may contact our support team to appeal this decision or
              correct the issues and re-apply.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/help")}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Contact Support
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </GlassCard>
        </AnimatedSection>
      </PageContainer>
    </DashboardLayout>
  );
}

// ── "approved" — full merchant dashboard ─────────────────────────────────────
function ApprovedDashboard({ dashboardUser, merchant }) {
  const navigate = useNavigate();
  const { currency: displayCurrency } = useCurrency();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const wallet = merchant?.wallet;
  const balance = wallet?.balance ?? 0;
  const walletCurrency = wallet?.currency || "SSP";
  const formatAmount = (val) => formatCurrencyAmount(val ?? 0, displayCurrency);

  useEffect(() => {
    merchantAPI
      .getAnalytics({ period: "month" })
      .then((res) => {
        if (res?.success && res.data?.analytics)
          setAnalytics(res.data.analytics);
      })
      .catch(console.error)
      .finally(() => setAnalyticsLoading(false));
  }, []);

  const successRate = (() => {
    const total = analytics?.totalTransactions || 0;
    const completed = analytics?.completedTransactions || 0;
    return total > 0 ? `${Math.round((completed / total) * 100)}%` : "—";
  })();

  return (
    <DashboardLayout user={dashboardUser} className="h-screen">
      <PageContainer className="space-y-6 pb-8">
        {/* Header */}
        <AnimatedSection className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
                Merchant Hub
              </span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                Active
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
              {merchant?.businessName}
            </h1>
            <p className="text-sm text-slate-400 capitalize">
              {merchant?.businessType} · Till #{merchant?.tillNumber || "—"}
            </p>
          </div>
          <AnimatedButton
            variant="outline"
            size="sm"
            icon={ArrowUpRight}
            iconPosition="right"
            onClick={() => navigate("/transactions")}
          >
            View Transactions
          </AnimatedButton>
        </AnimatedSection>

        {/* Stat cards */}
        <AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Wallet Balance"
              value={
                analyticsLoading
                  ? "—"
                  : formatCurrencyAmount(balance, walletCurrency)
              }
              change={walletCurrency}
              changeType="neutral"
              icon={Wallet}
              iconColor="blue"
              trend={[40, 55, 60, 75, 55, 80, 85, 90]}
              index={0}
            />
            <DashboardStatCard
              title="Monthly Revenue"
              value={
                analyticsLoading ? "—" : formatAmount(analytics?.totalSales)
              }
              change="This month"
              changeType="positive"
              icon={TrendingUp}
              iconColor="green"
              trend={[30, 50, 60, 45, 75, 85, 70, 90]}
              index={1}
            />
            <DashboardStatCard
              title="Transactions"
              value={
                analyticsLoading
                  ? "—"
                  : String(analytics?.totalTransactions ?? 0)
              }
              change="All time"
              changeType="neutral"
              icon={BarChart3}
              iconColor="violet"
              trend={[20, 40, 50, 45, 60, 70, 65, 80]}
              index={2}
            />
            <DashboardStatCard
              title="Success Rate"
              value={analyticsLoading ? "—" : successRate}
              change="Completed"
              changeType="positive"
              icon={CheckCircle2}
              iconColor="teal"
              trend={[70, 75, 80, 78, 85, 82, 88, 90]}
              index={3}
            />
          </div>
        </AnimatedSection>

        {/* Business details + Wallet actions */}
        <AnimatedSection delay={2}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business info */}
            <GlassCard className="p-6">
              <SectionHeader title="Business Details" badge="Live" />
              <div className="space-y-3 mt-4">
                {[
                  { label: "Business Name", value: merchant?.businessName },
                  {
                    label: "Type",
                    value: merchant?.businessType,
                    capitalize: true,
                  },
                  {
                    label: "Till Number",
                    value: `#${merchant?.tillNumber || "—"}`,
                    highlight: true,
                  },
                  { label: "Phone", value: merchant?.phoneNumber },
                  {
                    label: "Status",
                    value: merchant?.status,
                    capitalize: true,
                  },
                  {
                    label: "Member Since",
                    value: merchant?.createdAt
                      ? new Date(merchant.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "—",
                  },
                ].map(({ label, value, highlight, capitalize }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-xs font-medium text-slate-400">
                      {label}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        highlight
                          ? "text-blue-600 font-mono tracking-wider"
                          : "text-slate-700"
                      } ${capitalize ? "capitalize" : ""}`}
                    >
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Wallet + Quick actions */}
            <GlassCard className="p-6">
              <SectionHeader title="Merchant Wallet" />
              <div className="mt-4 mb-5">
                <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
                  <p className="text-sm font-medium opacity-80 mb-1">
                    Available Balance
                  </p>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrencyAmount(balance, walletCurrency)}
                  </p>
                  <p className="text-sm opacity-70 mt-1">
                    {merchant?.businessName}
                  </p>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick Actions
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: "Request Payout",
                    sub: "Withdraw to M-Pesa, MTN, or bank",
                    icon: Send,
                    color:
                      "border-blue-200 hover:border-blue-300 hover:bg-blue-50",
                    iconBg: "bg-blue-50 group-hover:bg-blue-100",
                    iconColor: "text-blue-600",
                    chevronColor: "group-hover:text-blue-400",
                    path: "/merchant/payout",
                  },
                  {
                    label: "Sales Analytics",
                    sub: "View detailed performance metrics",
                    icon: BarChart3,
                    color:
                      "border-violet-200 hover:border-violet-300 hover:bg-violet-50",
                    iconBg: "bg-violet-50 group-hover:bg-violet-100",
                    iconColor: "text-violet-600",
                    chevronColor: "group-hover:text-violet-400",
                    path: "/analytics",
                  },
                ].map(
                  ({
                    label,
                    sub,
                    icon: Icon,
                    color,
                    iconBg,
                    iconColor,
                    chevronColor,
                    path,
                  }) => (
                    <button
                      key={label}
                      onClick={() => navigate(path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${color} transition-all group`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center transition-colors shrink-0`}
                      >
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-slate-800">
                          {label}
                        </p>
                        <p className="text-xs text-slate-400">{sub}</p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-300 ${chevronColor} transition-colors`}
                      />
                    </button>
                  ),
                )}
              </div>
            </GlassCard>
          </div>
        </AnimatedSection>

        {/* Recent sales */}
        {analytics?.recentPayments?.length > 0 && (
          <AnimatedSection delay={3}>
            <SectionHeader
              title="Recent Sales"
              action={
                <AnimatedButton
                  variant="outline"
                  size="xs"
                  icon={ChevronRight}
                  iconPosition="right"
                  onClick={() => navigate("/transactions")}
                >
                  See All
                </AnimatedButton>
              }
            />
            <GlassCard className="mt-3">
              <div className="divide-y divide-slate-50">
                {analytics.recentPayments.slice(0, 8).map((txn) => (
                  <div
                    key={txn.$id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {txn.description || "Till payment"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {txn.$createdAt
                            ? new Date(txn.$createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatAmount(txn.amount)}
                      </p>
                      <span
                        className={`text-xs capitalize font-medium ${
                          txn.status === "success" || txn.status === "completed"
                            ? "text-emerald-600"
                            : txn.status === "pending"
                              ? "text-amber-600"
                              : "text-red-500"
                        }`}
                      >
                        {txn.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </AnimatedSection>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const MerchantDashboard = () => {
  const { merchant, merchantStatus, isLoading, hasFetched } = useMerchant();
  const { user } = useAuth();

  const dashboardUser = {
    name: user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.email ||
        "User"
      : "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
    role: user?.role || "user",
  };

  if (!hasFetched || isLoading) {
    return (
      <DashboardLayout user={dashboardUser} className="h-screen">
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  if (merchantStatus === "pending") {
    return <PendingSection dashboardUser={dashboardUser} />;
  }
  if (merchantStatus === "rejected") {
    return (
      <RejectedSection dashboardUser={dashboardUser} merchant={merchant} />
    );
  }
  if (merchantStatus === "approved") {
    return (
      <ApprovedDashboard dashboardUser={dashboardUser} merchant={merchant} />
    );
  }

  // "none" — no application yet
  return <NoneSection dashboardUser={dashboardUser} />;
};

export default MerchantDashboard;
