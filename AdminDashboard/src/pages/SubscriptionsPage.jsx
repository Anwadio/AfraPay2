import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionAdminAPI } from "../services/adminAPI";
import toast from "react-hot-toast";
import {
  CurrencyDollarIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  PauseCircleIcon,
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

// ── helpers ────────────────────────────────────────────────────────────────

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
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function shortId(id) {
  if (!id) return "—";
  return id.length > 14 ? `${id.slice(0, 8)}\u2026${id.slice(-4)}` : id;
}

const SUB_STATUS_META = {
  active: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    label: "Active",
    Icon: CheckCircleIcon,
  },
  paused: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    label: "Paused",
    Icon: PauseCircleIcon,
  },
  canceled: {
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    label: "Canceled",
    Icon: XCircleIcon,
  },
  past_due: {
    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    label: "Past Due",
    Icon: ExclamationCircleIcon,
  },
};

function subStatusMeta(status) {
  return (
    SUB_STATUS_META[status] ?? {
      badge: "bg-gray-100 text-gray-600",
      label: status ?? "Unknown",
      Icon: ClockIcon,
    }
  );
}

const BILLING_STATUS_META = {
  success: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    label: "Success",
  },
  failed: {
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    label: "Failed",
  },
};

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value ?? "—"}</p>
    </div>
  );
}

// ── Plan Modal (Create / Edit) ─────────────────────────────────────────────

const EMPTY_PLAN = {
  name: "",
  description: "",
  price: "",
  currency: "KES",
  billingCycle: "monthly",
  isActive: true,
};

const CURRENCIES = ["KES", "USD", "EUR", "GBP", "NGN", "GHS", "ZAR", "UGX"];
const CYCLES = ["daily", "weekly", "monthly", "yearly"];

function PlanModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState(
    plan
      ? {
          name: plan.name ?? "",
          description: plan.description ?? "",
          price: String(plan.price ?? ""),
          currency: plan.currency ?? "KES",
          billingCycle: plan.billingCycle ?? "monthly",
          isActive: plan.isActive !== false,
        }
      : EMPTY_PLAN,
  );
  const [saving, setSaving] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        currency: form.currency,
        billingCycle: form.billingCycle,
        isActive: form.isActive,
      };

      if (plan) {
        await subscriptionAdminAPI.updatePlan(plan.$id, payload);
        toast.success("Plan updated");
      } else {
        await subscriptionAdminAPI.createPlan(payload);
        toast.success("Plan created");
      }
      onSaved();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Failed to save plan",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {plan ? "Edit Plan" : "Create Plan"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Cycle
            </label>
            <select
              value={form.billingCycle}
              onChange={(e) => set("billingCycle", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {CYCLES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">
              Plan is active (visible to users)
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : plan ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const TABS = ["Plans", "Subscriptions", "Billing History"];
const SUB_STATUSES = ["all", "active", "paused", "canceled", "past_due"];

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("Plans");
  const [planModal, setPlanModal] = useState(null); // null | "create" | planObject
  const [subStatus, setSubStatus] = useState("all");
  const [subPage, setSubPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Queries ──────────────────────────────────────────────────────────────

  const statsQuery = useQuery({
    queryKey: ["sub-stats"],
    queryFn: subscriptionAdminAPI.getStats,
    staleTime: 30_000,
  });

  const plansQuery = useQuery({
    queryKey: ["admin-sub-plans"],
    queryFn: () => subscriptionAdminAPI.getPlans(),
    staleTime: 60_000,
  });

  const subsQuery = useQuery({
    queryKey: ["admin-subs", subStatus, subPage],
    queryFn: () =>
      subscriptionAdminAPI.getSubscriptions({
        status: subStatus === "all" ? undefined : subStatus,
        page: subPage,
        limit: PAGE_SIZE,
      }),
    staleTime: 15_000,
    keepPreviousData: true,
  });

  const billingQuery = useQuery({
    queryKey: ["admin-billing", billingPage],
    queryFn: () =>
      subscriptionAdminAPI.getBillingHistory({
        page: billingPage,
        limit: PAGE_SIZE,
      }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const runBillingMutation = useMutation({
    mutationFn: subscriptionAdminAPI.runBilling,
    onSuccess: (data) => {
      toast.success(
        `Billing run complete — ${data?.data?.summary?.billed ?? 0} billed, ${data?.data?.summary?.failed ?? 0} failed`,
      );
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
      qc.invalidateQueries({ queryKey: ["sub-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-billing"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? "Billing run failed");
    },
  });

  // ── Plan saved callback ──────────────────────────────────────────────────

  function onPlanSaved() {
    setPlanModal(null);
    qc.invalidateQueries({ queryKey: ["admin-sub-plans"] });
    qc.invalidateQueries({ queryKey: ["sub-stats"] });
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const stats = statsQuery.data?.data ?? statsQuery.data ?? {};
  const plans = plansQuery.data?.data?.plans ?? plansQuery.data?.plans ?? [];
  const subsData = subsQuery.data?.data ?? subsQuery.data ?? {};
  const subs = subsData?.subscriptions ?? [];
  const subsTotal = subsData?.total ?? 0;
  const billingData = billingQuery.data?.data ?? billingQuery.data ?? {};
  const billingRecords = billingData?.records ?? [];
  const billingTotal = billingData?.total ?? 0;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2">
            <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-sm text-gray-500">
              Manage plans, subscriptions, and billing runs
            </p>
          </div>
        </div>

        <button
          onClick={() => runBillingMutation.mutate()}
          disabled={runBillingMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <BoltIcon className="h-4 w-4" />
          {runBillingMutation.isPending ? "Running…" : "Run Billing Now"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Active"
          value={stats.active}
          color="text-emerald-700"
        />
        <StatCard label="Paused" value={stats.paused} color="text-amber-600" />
        <StatCard
          label="Past Due"
          value={stats.past_due}
          color="text-orange-600"
        />
        <StatCard
          label="Canceled"
          value={stats.canceled}
          color="text-red-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── PLANS TAB ────────────────────────────────────────────────── */}
      {tab === "Plans" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setPlanModal("create")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              New Plan
            </button>
          </div>

          {plansQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : plansQuery.isError ? (
            <p className="text-center text-red-500 text-sm py-6">
              {plansQuery.error?.message ?? "Failed to load plans"}
            </p>
          ) : plans.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              No plans yet. Create one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Cycle</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plans.map((plan) => (
                    <tr
                      key={plan.$id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-[220px] truncate">
                            {plan.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(plan.price, plan.currency)}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">
                        {plan.billingCycle}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            plan.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(plan.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setPlanModal(plan)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Edit plan"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SUBSCRIPTIONS TAB ────────────────────────────────────────── */}
      {tab === "Subscriptions" && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {SUB_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSubStatus(s);
                  setSubPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  subStatus === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>

          {subsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : subsQuery.isError ? (
            <p className="text-center text-red-500 text-sm py-6">
              {subsQuery.error?.message ?? "Failed to load subscriptions"}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Plan</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Method</th>
                      <th className="px-4 py-3 text-left">Next Billing</th>
                      <th className="px-4 py-3 text-left">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-gray-400 text-sm"
                        >
                          No subscriptions found.
                        </td>
                      </tr>
                    ) : (
                      subs.map((sub) => {
                        const meta = subStatusMeta(sub.status);
                        return (
                          <tr
                            key={sub.$id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {shortId(sub.userId)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {sub.planName}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatCurrency(
                                  sub.planPrice,
                                  sub.planCurrency,
                                )}{" "}
                                / {sub.planBillingCycle}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                              >
                                <meta.Icon className="h-3 w-3" />
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 capitalize text-gray-600">
                              {sub.paymentMethod}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatDate(sub.nextBillingDate)}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {formatDate(sub.startDate)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {subsTotal > PAGE_SIZE && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Showing {(subPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(subPage * PAGE_SIZE, subsTotal)} of {subsTotal}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                      disabled={subPage === 1}
                      className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSubPage((p) => p + 1)}
                      disabled={subPage * PAGE_SIZE >= subsTotal}
                      className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── BILLING HISTORY TAB ──────────────────────────────────────── */}
      {tab === "Billing History" && (
        <div className="space-y-4">
          {billingQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : billingQuery.isError ? (
            <p className="text-center text-red-500 text-sm py-6">
              {billingQuery.error?.message ?? "Failed to load billing history"}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                      <th className="px-4 py-3 text-left">Subscription</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Attempt</th>
                      <th className="px-4 py-3 text-left">Billing Period</th>
                      <th className="px-4 py-3 text-left">Failure Reason</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {billingRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-gray-400 text-sm"
                        >
                          No billing records yet.
                        </td>
                      </tr>
                    ) : (
                      billingRecords.map((rec) => {
                        const meta = BILLING_STATUS_META[rec.status] ?? {
                          badge: "bg-gray-100 text-gray-600",
                          label: rec.status,
                        };
                        return (
                          <tr
                            key={rec.$id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {shortId(rec.subscriptionId)}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {formatCurrency(rec.amount, rec.currency)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                              >
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              #{rec.attemptNumber}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {rec.billingPeriodKey}
                            </td>
                            <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                              {rec.failureReason ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {formatDate(rec.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {billingTotal > PAGE_SIZE && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Showing {(billingPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(billingPage * PAGE_SIZE, billingTotal)} of{" "}
                    {billingTotal}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBillingPage((p) => Math.max(1, p - 1))}
                      disabled={billingPage === 1}
                      className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setBillingPage((p) => p + 1)}
                      disabled={billingPage * PAGE_SIZE >= billingTotal}
                      className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Plan modal */}
      {planModal && (
        <PlanModal
          plan={planModal === "create" ? null : planModal}
          onClose={() => setPlanModal(null)}
          onSaved={onPlanSaved}
        />
      )}
    </div>
  );
}
