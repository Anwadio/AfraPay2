import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cardAPI } from "../services/adminAPI";
import toast from "react-hot-toast";
import {
  CreditCardIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckBadgeIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

// ── Brand & Status metadata ───────────────────────────────────────────────────
const BRAND_META = {
  visa: {
    label: "Visa",
    color: "text-blue-700 bg-blue-50 ring-1 ring-blue-200",
    gradient: "from-blue-700 via-blue-600 to-indigo-500",
  },
  mastercard: {
    label: "Mastercard",
    color: "text-rose-700 bg-rose-50 ring-1 ring-rose-200",
    gradient: "from-rose-600 via-red-500 to-orange-500",
  },
  amex: {
    label: "Amex",
    color: "text-teal-700 bg-teal-50 ring-1 ring-teal-200",
    gradient: "from-teal-700 via-teal-500 to-cyan-400",
  },
  discover: {
    label: "Discover",
    color: "text-amber-700 bg-amber-50 ring-1 ring-amber-200",
    gradient: "from-amber-500 via-orange-400 to-yellow-300",
  },
  other: {
    label: "Other",
    color: "text-slate-600 bg-slate-50 ring-1 ring-slate-200",
    gradient: "from-slate-700 via-slate-500 to-slate-400",
  },
};

const STATUS_META = {
  active: { badge: "badge-green", label: "Active" },
  frozen: { badge: "badge-red", label: "Frozen" },
};

function brandMeta(brand) {
  return BRAND_META[brand] || BRAND_META.other;
}
function statusMeta(status) {
  return (
    STATUS_META[status] || { badge: "badge-gray", label: status || "Unknown" }
  );
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function shortId(id) {
  if (!id) return "—";
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
}

// ── Visual card (shown in detail panel) ──────────────────────────────────────
function CardVisual({ card }) {
  const meta = brandMeta(card.cardBrand);
  return (
    <div
      className={`relative rounded-2xl p-5 text-white overflow-hidden shadow-lg bg-gradient-to-br ${meta.gradient}`}
      style={{ minHeight: 148 }}
    >
      {/* decorative circles */}
      <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -right-2 h-36 w-36 rounded-full bg-white/10 pointer-events-none" />

      <div className="relative flex items-start justify-between mb-6">
        <p className="text-xs font-medium opacity-70">
          {card.label ||
            (card.cardType === "virtual" ? "Virtual Card" : "Physical Card")}
        </p>
        <span className="text-xs font-bold uppercase tracking-widest opacity-90">
          {meta.label}
        </span>
      </div>

      <div className="relative">
        <p className="font-mono text-lg tracking-widest mb-3">
          •••• •••• •••• {card.cardLast4 || "••••"}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">
              Card Holder
            </p>
            <p className="text-sm font-semibold truncate max-w-[140px]">
              {card.holderName || "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">
              Expires
            </p>
            <p className="text-sm font-semibold tabular">
              {String(card.expiryMonth || 0).padStart(2, "0")}/
              {String(card.expiryYear || 0).slice(-2)}
            </p>
          </div>
        </div>
      </div>

      {card.status === "frozen" && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <LockClosedIcon className="h-4 w-4 text-white" />
            <span className="text-white text-xs font-bold tracking-widest">
              FROZEN
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Table Skeleton ────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="table-container">
      <div className="p-5 space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-8 w-8 skeleton rounded-xl shrink-0" />
            <div className="h-4 skeleton rounded w-32 shrink-0" />
            <div className="flex-1 h-4 skeleton rounded" />
            <div className="h-5 skeleton rounded-full w-14 shrink-0" />
            <div className="h-5 skeleton rounded-full w-16 shrink-0" />
            <div className="h-4 skeleton rounded w-20 shrink-0" />
            <div className="h-8 skeleton rounded-xl w-8 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="table-container">
      <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center">
          <CreditCardIcon className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-600">No cards found</p>
        <p className="text-xs text-slate-400 max-w-xs text-center">
          {hasFilters
            ? "No results match the current filters."
            : "No payment cards have been registered yet."}
        </p>
        {hasFilters && (
          <button onClick={onClear} className="btn-secondary text-xs mt-1">
            <XMarkIcon className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  const { page, totalPages, totalItems, limit } = pagination;
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <p className="text-xs text-slate-500 tabular">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of{" "}
        {totalItems.toLocaleString()} cards
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-icon disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {(() => {
          const pages = [];
          const delta = 2;
          for (
            let i = Math.max(1, page - delta);
            i <= Math.min(totalPages, page + delta);
            i++
          ) {
            pages.push(i);
          }
          return pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 rounded-xl text-xs font-medium transition-all ${
                p === page
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ));
        })()}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn-icon disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Summary Stat Card ─────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, icon: Icon }) {
  const colorMap = {
    blue: "from-blue-500 to-blue-700",
    green: "from-emerald-500 to-teal-600",
    red: "from-red-500 to-rose-600",
    violet: "from-violet-500 to-purple-700",
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className={`h-11 w-11 rounded-xl bg-gradient-to-br ${
          colorMap[color] || colorMap.blue
        } flex items-center justify-center shadow-sm shrink-0`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Card Table Row ────────────────────────────────────────────────────────────
function CardRow({ card, onView }) {
  const brand = brandMeta(card.cardBrand);
  const status = statusMeta(card.status);
  return (
    <tr
      className="table-row cursor-pointer hover:bg-slate-50/80 transition-colors"
      onClick={onView}
    >
      {/* Card number + brand icon */}
      <td className="table-cell">
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${brand.color}`}
          >
            <CreditCardIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-sm font-mono tabular">
              •••• {card.cardLast4 || "••••"}
            </span>
            {card.isDefault && (
              <span className="ml-2 badge-blue text-[10px]">Default</span>
            )}
          </div>
        </div>
      </td>

      {/* Brand */}
      <td className="table-cell">
        <span className="text-sm text-slate-700">{brand.label}</span>
      </td>

      {/* Holder */}
      <td className="table-cell text-slate-600 text-sm max-w-[140px] truncate">
        {card.holderName || "—"}
      </td>

      {/* User ID */}
      <td className="table-cell">
        <span className="font-mono text-xs text-slate-500">
          {shortId(card.userId)}
        </span>
      </td>

      {/* Expiry */}
      <td className="table-cell">
        <span className="font-mono text-sm text-slate-700 tabular">
          {String(card.expiryMonth || 0).padStart(2, "0")}/
          {String(card.expiryYear || 0).slice(-2)}
        </span>
      </td>

      {/* Type */}
      <td className="table-cell">
        <span className="capitalize text-sm text-slate-600">
          {card.cardType || "—"}
        </span>
      </td>

      {/* Status */}
      <td className="table-cell">
        <span className={status.badge}>{status.label}</span>
      </td>

      {/* Added date */}
      <td className="table-cell text-xs text-slate-500">
        {formatDate(card.createdAt)}
      </td>

      {/* View icon */}
      <td className="table-cell text-right">
        <button
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          title="View card details"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

// ── Card Detail Side Panel ────────────────────────────────────────────────────
function CardDetailPanel({ card, onClose, onStatusUpdated }) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ cardId, status }) =>
      cardAPI.updateCardStatus(cardId, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["adminCards"]);
      toast.success(data?.message || "Card status updated");
      onStatusUpdated?.(data?.data);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to update card status",
      );
    },
  });

  const isFrozen = card.status === "frozen";
  const isPending = statusMutation.isLoading;

  const Field = ({ label, value, mono, copyable }) => (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5">
        <span
          className={`text-sm text-slate-800 break-all ${
            mono ? "font-mono text-xs" : "font-medium"
          }`}
        >
          {value || "—"}
        </span>
        {copyable && value && (
          <button
            onClick={() => copyToClipboard(value)}
            className="shrink-0 p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Copy to clipboard"
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </dd>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Card details"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className="relative min-h-full flex items-start justify-end pointer-events-none">
        <div
          className="relative w-full max-w-md bg-white min-h-screen shadow-modal flex flex-col pointer-events-auto animate-slide-in"
          style={{ borderLeft: "1px solid #e2e8f0" }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Card Details
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {shortId(card.id)}
              </p>
            </div>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Visual card representation */}
            <CardVisual card={card} />

            {/* Freeze / Unfreeze action */}
            <button
              onClick={() =>
                statusMutation.mutate({
                  cardId: card.id,
                  status: isFrozen ? "active" : "frozen",
                })
              }
              disabled={isPending}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                isFrozen
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-100"
                  : "bg-red-50 text-red-700 ring-1 ring-red-300 hover:bg-red-100"
              }`}
            >
              {isFrozen ? (
                <>
                  <LockOpenIcon className="h-4 w-4" />
                  {isPending ? "Unfreezing…" : "Unfreeze Card"}
                </>
              ) : (
                <>
                  <LockClosedIcon className="h-4 w-4" />
                  {isPending ? "Freezing…" : "Freeze Card"}
                </>
              )}
            </button>

            {/* Card info section */}
            <section>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Card Info
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <Field label="Card ID" value={card.id} mono copyable />
                </div>
                <Field label="Brand" value={brandMeta(card.cardBrand).label} />
                <Field label="Last 4" value={card.cardLast4} mono />
                <Field
                  label="Expiry"
                  value={`${String(card.expiryMonth || 0).padStart(2, "0")}/${String(card.expiryYear || 0).slice(-2)}`}
                  mono
                />
                <Field label="Type" value={card.cardType} />
                <Field label="Status" value={statusMeta(card.status).label} />
                <Field label="Default" value={card.isDefault ? "Yes" : "No"} />
                {card.label && (
                  <div className="col-span-2">
                    <Field label="Label" value={card.label} />
                  </div>
                )}
                <Field label="Provider" value={card.provider} />
              </dl>
            </section>

            {/* Account section */}
            <section>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Account
              </h3>
              <dl className="space-y-4">
                <div className="col-span-2">
                  <Field label="User ID" value={card.userId} mono copyable />
                </div>
                <Field label="Card Holder" value={card.holderName} />
              </dl>
            </section>

            {/* Timestamps section */}
            <section>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Timestamps
              </h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Added" value={formatDate(card.createdAt)} />
                <Field
                  label="Last Updated"
                  value={formatDate(card.updatedAt)}
                />
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Initial filter state ──────────────────────────────────────────────────────
const INITIAL_FILTERS = {
  page: 1,
  limit: 25,
  status: "",
  cardBrand: "",
  cardType: "",
  search: "",
};

// ── Main CardsPage component ──────────────────────────────────────────────────
const CardsPage = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedCard, setSelectedCard] = useState(null);

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => !["page", "limit"].includes(k) && v !== "",
  );

  // ── Data fetching ──
  const {
    data: cardData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminCards", filters],
    queryFn: () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== ""),
      );
      return cardAPI.getCards(params);
    },
    keepPreviousData: true,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const cards = useMemo(() => cardData?.data ?? [], [cardData]);
  const pagination = cardData?.pagination ?? {
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 0,
  };
  // Global active/frozen counts returned by the backend
  const serverStats = cardData?.pagination?.stats ?? {};

  // ── Derived stats ──
  const stats = useMemo(() => {
    const pageActive = cards.filter((c) => c.status === "active").length;
    const pageFrozen = cards.filter((c) => c.status === "frozen").length;
    return {
      total: pagination.totalItems,
      active: serverStats.active ?? pageActive,
      frozen: serverStats.frozen ?? pageFrozen,
      defaults: cards.filter((c) => c.isDefault).length,
    };
  }, [cards, pagination.totalItems, serverStats]);

  // ── Client-side search filter (holder name / last-4 / userId substring) ──
  const displayed = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.cardLast4?.includes(q) ||
        c.userId?.toLowerCase().includes(q) ||
        c.holderName?.toLowerCase().includes(q) ||
        c.label?.toLowerCase().includes(q),
    );
  }, [cards, filters.search]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  // ── Keep panel in sync after freeze/unfreeze ──
  const handleStatusUpdated = useCallback((updated) => {
    if (updated) {
      setSelectedCard((prev) =>
        prev
          ? { ...prev, status: updated.status, updatedAt: updated.updatedAt }
          : null,
      );
    }
  }, []);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Payment Cards</h1>
          <p className="page-subtitle">
            Monitor and manage all linked payment cards.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5">
              <div className="h-4 skeleton rounded w-20 mb-3" />
              <div className="h-7 skeleton rounded w-12" />
            </div>
          ))}
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Payment Cards</h1>
          <p className="page-subtitle">
            Monitor and manage all linked payment cards.
          </p>
        </div>
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <ShieldExclamationIcon className="h-10 w-10 text-red-400" />
          <p className="text-sm font-semibold text-slate-700">
            Failed to load cards
          </p>
          <p className="text-xs text-slate-400 max-w-xs">
            {error.response?.data?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => refetch()}
            className="btn-secondary text-xs mt-1"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Payment Cards</h1>
          <p className="page-subtitle">
            Monitor linked payment cards and manage card security across all
            users.
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
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Cards"
          value={stats.total.toLocaleString()}
          icon={CreditCardIcon}
          color="blue"
        />
        <SummaryCard
          label="Active Cards"
          value={stats.active.toLocaleString()}
          icon={ShieldCheckIcon}
          color="green"
        />
        <SummaryCard
          label="Frozen Cards"
          value={stats.frozen.toLocaleString()}
          icon={ShieldExclamationIcon}
          color="red"
        />
        <SummaryCard
          label="Default Cards"
          value={stats.defaults.toLocaleString()}
          sub="on this page"
          icon={CheckBadgeIcon}
          color="violet"
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <FunnelIcon className="h-4 w-4 text-slate-400 shrink-0" />

          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="input pl-9 py-2 text-sm w-full"
              placeholder="Search by user ID, last 4 digits, or name…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            className="select py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
          </select>

          {/* Brand filter */}
          <select
            className="select py-2 text-sm"
            value={filters.cardBrand}
            onChange={(e) => setFilter("cardBrand", e.target.value)}
          >
            <option value="">All brands</option>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">Amex</option>
            <option value="discover">Discover</option>
            <option value="other">Other</option>
          </select>

          {/* Type filter */}
          <select
            className="select py-2 text-sm"
            value={filters.cardType}
            onChange={(e) => setFilter("cardType", e.target.value)}
          >
            <option value="">All types</option>
            <option value="virtual">Virtual</option>
            <option value="physical">Physical</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn-ghost text-xs gap-1.5"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table or empty state */}
      {displayed.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
      ) : (
        <div className="space-y-3">
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header-cell text-left">Card</th>
                    <th className="table-header-cell text-left">Brand</th>
                    <th className="table-header-cell text-left">Holder</th>
                    <th className="table-header-cell text-left">User ID</th>
                    <th className="table-header-cell text-left">Expiry</th>
                    <th className="table-header-cell text-left">Type</th>
                    <th className="table-header-cell text-left">Status</th>
                    <th className="table-header-cell text-left">Added</th>
                    <th className="table-header-cell" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map((card) => (
                    <CardRow
                      key={card.id}
                      card={card}
                      onView={() => setSelectedCard(card)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          />
        </div>
      )}

      {/* Card detail side panel */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
};

export default CardsPage;
