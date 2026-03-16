/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardSection } from "../components/layout/DashboardUtils";
import { Button } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { userAPI, walletAPI, transactionAPI } from "../services/api";
import { cn } from "../utils";
import SendMoneyModal from "../components/fintech/SendMoneyModal";

// ── Currency metadata ────────────────────────────────────────────────────────
const CURRENCY_META = {
  USD: { label: "US Dollar", flag: "🇺🇸", color: "from-blue-500 to-blue-700" },
  EUR: { label: "Euro", flag: "🇪🇺", color: "from-indigo-500 to-indigo-700" },
  GBP: {
    label: "British Pound",
    flag: "🇬🇧",
    color: "from-purple-500 to-purple-700",
  },
  GHS: {
    label: "Ghanaian Cedi",
    flag: "🇬🇭",
    color: "from-green-500 to-green-700",
  },
  NGN: {
    label: "Nigerian Naira",
    flag: "🇳🇬",
    color: "from-emerald-500 to-emerald-700",
  },
  KES: {
    label: "Kenyan Shilling",
    flag: "🇰🇪",
    color: "from-red-500 to-red-700",
  },
  ZAR: {
    label: "South African Rand",
    flag: "🇿🇦",
    color: "from-yellow-500 to-yellow-700",
  },
};

const getCurrencyMeta = (code) =>
  CURRENCY_META[code] ?? {
    label: code,
    flag: "💳",
    color: "from-neutral-500 to-neutral-700",
  };

const formatBalance = (amount, currency) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);

// ── WalletCard ───────────────────────────────────────────────────────────────
const WalletCard = ({ currency, balance, onSend, onDeposit }) => {
  const meta = getCurrencyMeta(currency);
  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 text-white overflow-hidden",
        "bg-gradient-to-br",
        meta.color,
        "shadow-lg",
      )}
    >
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
      <div className="absolute -bottom-8 -right-2 w-20 h-20 bg-white/10 rounded-full" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
              {meta.label}
            </p>
            <p className="text-3xl font-bold mt-1 tabular-nums">
              {formatBalance(balance, currency)}
            </p>
          </div>
          <span className="text-3xl">{meta.flag}</span>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onDeposit}
            className="flex-1 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
          >
            + Add Funds
          </button>
          <button
            onClick={onSend}
            className="flex-1 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
          >
            ↑ Send
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal wrapper ────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const Wallets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState({});
  const [totalUSD, setTotalUSD] = useState(0);
  const [recentTxns, setRecentTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New: Send Money modal (M-Pesa / MTN / Wallet)
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false);

  // Modal state (deposit / legacy internal transfer)
  const [modal, setModal] = useState(null); // "deposit" | null

  // Deposit form (informational — real integration would use a payment processor)
  const [depositForm, setDepositForm] = useState({
    amount: "",
    currency: "USD",
  });

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [profileRes, balanceRes, txRes] = await Promise.all([
        userAPI.getProfile().catch(() => null),
        walletAPI.getBalances().catch(() => null),
        transactionAPI.getTransactions({ limit: 8 }).catch(() => null),
      ]);

      if (profileRes?.success && profileRes.data) setProfile(profileRes.data);

      if (balanceRes?.success && balanceRes.data) {
        setBalances(balanceRes.data.balances ?? {});
        setTotalUSD(balanceRes.data.totalValueUSD ?? 0);
      }

      if (txRes?.success && txRes.data) {
        const list = Array.isArray(txRes.data)
          ? txRes.data
          : (txRes.data.transactions ?? txRes.data.data ?? []);
        setRecentTxns(list);
      }
    } catch (err) {
      console.error("Wallets fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const walletEntries = Object.entries(balances);
  const hasWallets = walletEntries.length > 0;

  return (
    <DashboardLayout user={dashboardUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Wallets
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Manage your multi-currency balances
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="gap-1.5"
            >
              <svg
                className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </Button>
            <Button size="sm" onClick={() => setSendMoneyOpen(true)}>
              Send Money
            </Button>
          </div>
        </div>

        {/* Total value banner */}
        {!loading && (
          <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-600 p-5 text-white flex items-center justify-between shadow-lg">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wider font-medium">
                Total Portfolio Value (USD)
              </p>
              <p className="text-3xl font-bold mt-1 tabular-nums">
                {formatBalance(totalUSD, "USD")}
              </p>
              <p className="text-white/60 text-xs mt-1">
                {walletEntries.length} wallet
                {walletEntries.length !== 1 ? "s" : ""}
              </p>
            </div>
            <svg
              className="w-14 h-14 opacity-20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
        )}

        {/* Wallet cards */}
        <DashboardSection title="My Wallets">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse h-40"
                />
              ))}
            </div>
          ) : !hasWallets ? (
            <div className="rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 p-10 text-center">
              <svg
                className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                No wallets found
              </p>
              <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-1">
                Contact support to set up your wallets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {walletEntries.map(([currency, balance]) => (
                <WalletCard
                  key={currency}
                  currency={currency}
                  balance={balance}
                  onSend={() => setSendMoneyOpen(true)}
                  onDeposit={() => {
                    setDepositForm((f) => ({ ...f, currency }));
                    setModal("deposit");
                  }}
                />
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Recent transactions */}
        <DashboardSection
          title="Recent Transactions"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/transactions")}
            >
              View All
            </Button>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse"
                />
              ))}
            </div>
          ) : recentTxns.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
              No transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
              {recentTxns.map((tx) => {
                const isIncoming =
                  tx.type === "deposit" || tx.type === "refund";
                return (
                  <div
                    key={tx.id || tx.$id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                        isIncoming
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      )}
                    >
                      {isIncoming ? "↓" : "↑"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        {tx.$createdAt
                          ? new Date(tx.$createdAt).toLocaleDateString()
                          : "—"}
                        {tx.status && tx.status !== "completed" && (
                          <span className="ml-2 text-yellow-600 dark:text-yellow-400 capitalize">
                            {tx.status}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isIncoming
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {isIncoming ? "+" : "−"}
                        {formatBalance(tx.amount, tx.currency || "USD")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* ── Send Money Modal (M-Pesa / MTN / Wallet) ──────────────────────── */}
      <SendMoneyModal
        open={sendMoneyOpen}
        onClose={() => setSendMoneyOpen(false)}
        onSuccess={() => {
          toast.success("Payment submitted successfully!");
          fetchData(true);
        }}
      />

      {/* ── Deposit Info Modal ─────────────────────────────────────────────── */}
      <Modal
        open={modal === "deposit"}
        onClose={() => setModal(null)}
        title={`Add Funds — ${depositForm.currency}`}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">Payment processing coming soon</p>
            <p>
              Direct deposits via card or mobile money will be available
              shortly. Contact support to manually top up your wallet in the
              meantime.
            </p>
          </div>

          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Currency</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {depositForm.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Current balance</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatBalance(
                  balances[depositForm.currency] ?? 0,
                  depositForm.currency,
                )}
              </span>
            </div>
          </div>

          <Button onClick={() => setModal(null)} className="w-full">
            Got it
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Wallets;
