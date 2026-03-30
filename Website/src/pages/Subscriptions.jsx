/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Wallet,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  ChevronRight,
  Calendar,
  Clock,
  BadgeCheck,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  SectionHeader,
  GlassCard,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { subscriptionAPI, userAPI } from "../services/api";

/* ── helpers ──────────────────────────────────────────────────────────── */

function formatCurrency(amount, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function cycleLabel(cycle) {
  const MAP = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    yearly: "year",
  };
  return MAP[cycle] ?? cycle;
}

const STATUS_CONFIG = {
  active: {
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Active",
  },
  paused: {
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <PauseCircle className="w-3.5 h-3.5" />,
    label: "Paused",
  },
  canceled: {
    color: "bg-red-50 text-red-700 border border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: "Canceled",
  },
  past_due: {
    color: "bg-orange-50 text-orange-700 border border-orange-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: "Past Due",
  },
};

/* ── Plan Card ────────────────────────────────────────────────────────── */

function PlanCard({ plan, onSubscribe, subscribingPlanId, myActiveIds }) {
  const alreadySubscribed = myActiveIds.has(plan.$id);
  const isLoading = subscribingPlanId === plan.$id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6 gap-4 hover:border-blue-400 hover:shadow-sm transition-colors"
    >
      {/* Badge */}
      {alreadySubscribed && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <BadgeCheck className="w-3 h-3" /> Subscribed
        </span>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        {plan.description && (
          <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
        )}
      </div>

      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-gray-900">
          {formatCurrency(plan.price, plan.currency)}
        </span>
        <span className="mb-1 text-sm text-gray-400">
          / {cycleLabel(plan.billingCycle)}
        </span>
      </div>

      <Button
        variant={alreadySubscribed ? "secondary" : "primary"}
        className="mt-auto w-full"
        disabled={alreadySubscribed || isLoading}
        onClick={() => !alreadySubscribed && onSubscribe(plan)}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : alreadySubscribed ? (
          "Already subscribed"
        ) : (
          <>
            Subscribe <ChevronRight className="w-4 h-4 ml-1" />
          </>
        )}
      </Button>
    </motion.div>
  );
}

/* ── Subscription Row ─────────────────────────────────────────────────── */

function SubscriptionRow({ sub, onCancel, onPause, onResume, actionId }) {
  const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active;
  const isActing = actionId === sub.$id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col md:flex-row md:items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      {/* Left: plan info */}
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{sub.planName}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatCurrency(sub.planPrice, sub.planCurrency)} /{" "}
          {cycleLabel(sub.planBillingCycle)}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Next billing: {formatDate(sub.nextBillingDate)}
          </span>
          {sub.paymentMethod === "card" ? (
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Card
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Wallet
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${cfg.color}`}
      >
        {cfg.icon}
        {cfg.label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {sub.status === "active" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={isActing}
            onClick={() => onPause(sub.$id)}
            title="Pause subscription"
          >
            {isActing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PauseCircle className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
        {sub.status === "paused" && (
          <Button
            size="sm"
            variant="primary"
            disabled={isActing}
            onClick={() => onResume(sub.$id)}
            title="Resume subscription"
          >
            {isActing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlayCircle className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
        {(sub.status === "active" ||
          sub.status === "paused" ||
          sub.status === "past_due") && (
          <Button
            size="sm"
            variant="danger"
            disabled={isActing}
            onClick={() => onCancel(sub.$id)}
            title="Cancel subscription"
          >
            {isActing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Subscribe Modal ──────────────────────────────────────────────────── */

function SubscribeModal({ plan, onClose, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [cardId, setCardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = { planId: plan.$id, paymentMethod };
      if (paymentMethod === "card") {
        if (!cardId.trim()) {
          setError("Card ID is required for card payments.");
          setLoading(false);
          return;
        }
        payload.cardId = cardId.trim();
      }
      await subscriptionAPI.subscribe(payload);
      onSuccess(`You are now subscribed to ${plan.name}!`);
    } catch (err) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to subscribe. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 border border-gray-200 rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Subscribe</h2>
            <p className="text-sm text-gray-500 mt-0.5">{plan.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price summary */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-5">
          <span className="text-gray-500 text-sm">Amount</span>
          <span className="text-gray-900 font-bold">
            {formatCurrency(plan.price, plan.currency)}{" "}
            <span className="font-normal text-gray-400 text-sm">
              / {cycleLabel(plan.billingCycle)}
            </span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment method */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Payment method
            </label>
            <div className="flex gap-3">
              {[
                { id: "wallet", label: "Wallet", Icon: Wallet },
                { id: "card", label: "Card", Icon: CreditCard },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    paymentMethod === id
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Card ID input when card is selected */}
          {paymentMethod === "card" && (
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Card ID
              </label>
              <input
                type="text"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                placeholder="Your saved card ID"
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none placeholder-gray-400 transition-colors"
              />
              <p className="mt-1 text-xs text-gray-400">
                Find your card ID in the Cards section.
              </p>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirm Subscription"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */

export default function Subscriptions() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [plansError, setPlansError] = useState(null);
  const [subsError, setSubsError] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null); // triggers subscribe modal
  const [subscribingPlanId] = useState(null);
  const [actionId, setActionId] = useState(null); // sub ID being acted upon
  const [successMsg, setSuccessMsg] = useState(null);

  /* ── data loaders ─────────────────────────────────────────────────── */

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setPlansError(null);
    try {
      const res = await subscriptionAPI.getPlans();
      setPlans(res?.data?.data?.plans ?? res?.data?.plans ?? []);
    } catch (err) {
      setPlansError(
        err?.response?.data?.message ?? err?.message ?? "Failed to load plans.",
      );
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    setSubsError(null);
    try {
      const res = await subscriptionAPI.getMySubscriptions();
      setSubscriptions(
        res?.data?.data?.subscriptions ?? res?.data?.subscriptions ?? [],
      );
    } catch (err) {
      setSubsError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to load subscriptions.",
      );
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
    loadSubscriptions();
    userAPI
      .getProfile()
      .then((res) => {
        if (res?.data) setProfile(res.data);
      })
      .catch(() => {});
  }, [loadPlans, loadSubscriptions]);

  /* ── computed ─────────────────────────────────────────────────────── */

  const myActiveIds = new Set(
    subscriptions
      .filter((s) => s.status === "active" || s.status === "paused")
      .map((s) => s.planId),
  );

  /* ── actions ──────────────────────────────────────────────────────── */

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  function handleSubscribeClick(plan) {
    setSelectedPlan(plan);
  }

  async function handleSubscribeSuccess(msg) {
    setSelectedPlan(null);
    showSuccess(msg);
    await loadSubscriptions();
  }

  async function handleCancel(id) {
    setActionId(id);
    try {
      await subscriptionAPI.cancelSubscription(id);
      showSuccess("Subscription canceled.");
      await loadSubscriptions();
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setActionId(null);
    }
  }

  async function handlePause(id) {
    setActionId(id);
    try {
      await subscriptionAPI.pauseSubscription(id);
      showSuccess("Subscription paused.");
      await loadSubscriptions();
    } catch (err) {
      console.error("Pause failed:", err);
    } finally {
      setActionId(null);
    }
  }

  async function handleResume(id) {
    setActionId(id);
    try {
      await subscriptionAPI.resumeSubscription(id);
      showSuccess("Subscription resumed.");
      await loadSubscriptions();
    } catch (err) {
      console.error("Resume failed:", err);
    } finally {
      setActionId(null);
    }
  }

  /* ── render ───────────────────────────────────────────────────────── */

  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
      profile.name ||
      ""
    : user?.name || user?.email || "User";

  const dashboardUser = {
    name: displayName,
    email: profile?.email || user?.email || "",
    avatar: profile?.avatar || null,
  };

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        {/* Header */}
        <AnimatedSection delay={0}>
          <SectionHeader
            title="Subscriptions"
            subtitle="Choose a plan and manage your recurring billing."
          />
        </AnimatedSection>

        {/* Success toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Available Plans */}
        <AnimatedSection delay={0.05}>
          <GlassCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Available Plans
              </h2>
              <button
                onClick={loadPlans}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                title="Refresh plans"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingPlans ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : plansError ? (
              <p className="text-red-400 text-sm text-center py-4">
                {plansError}
              </p>
            ) : plans.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                No subscription plans available yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.$id}
                    plan={plan}
                    onSubscribe={handleSubscribeClick}
                    subscribingPlanId={subscribingPlanId}
                    myActiveIds={myActiveIds}
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </AnimatedSection>

        {/* My Subscriptions */}
        <AnimatedSection delay={0.1}>
          <GlassCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                My Subscriptions
              </h2>
              <button
                onClick={loadSubscriptions}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                title="Refresh subscriptions"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingSubs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : subsError ? (
              <p className="text-red-400 text-sm text-center py-4">
                {subsError}
              </p>
            ) : subscriptions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                <Clock className="w-8 h-8" />
                <p className="text-sm">No subscriptions yet.</p>
                <p className="text-xs">
                  Subscribe to a plan above to get started.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {subscriptions.map((sub) => (
                    <SubscriptionRow
                      key={sub.$id}
                      sub={sub}
                      onCancel={handleCancel}
                      onPause={handlePause}
                      onResume={handleResume}
                      actionId={actionId}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </GlassCard>
        </AnimatedSection>
      </PageContainer>

      {/* Subscribe Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <SubscribeModal
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            onSuccess={handleSubscribeSuccess}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
