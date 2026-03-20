/* eslint-disable no-console */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeftRight,
  RefreshCcw,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Clock,
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
import { paymentAPI } from "../services/api";
import { cn } from "../utils";

/* ── East Africa currencies (primary focus) + majors ──────────────────── */
const CURRENCIES = [
  { code: "KES", flag: "🇰🇪", name: "Kenyan Shilling", region: "ea" },
  { code: "UGX", flag: "🇺🇬", name: "Ugandan Shilling", region: "ea" },
  { code: "TZS", flag: "🇹🇿", name: "Tanzanian Shilling", region: "ea" },
  { code: "ETB", flag: "🇪🇹", name: "Ethiopian Birr", region: "ea" },
  { code: "RWF", flag: "🇷🇼", name: "Rwandan Franc", region: "ea" },
  { code: "SSP", flag: "🇸🇸", name: "South Sudanese Pound", region: "ea" },
  { code: "NGN", flag: "🇳🇬", name: "Nigerian Naira", region: "afr" },
  { code: "GHS", flag: "🇬🇭", name: "Ghanaian Cedi", region: "afr" },
  { code: "ZAR", flag: "🇿🇦", name: "South African Rand", region: "afr" },
  { code: "USD", flag: "🇺🇸", name: "US Dollar", region: "maj" },
  { code: "EUR", flag: "🇪🇺", name: "Euro", region: "maj" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound", region: "maj" },
];

function currencyMeta(code) {
  return (
    CURRENCIES.find((c) => c.code === code) || { code, flag: "💱", name: code }
  );
}

function formatRate(rate, toCode) {
  if (rate == null) return "—";
  // For large-unit currencies (like UGX, TZS, ETB) use 2 dp; for small ones use 6
  if (rate >= 100)
    return rate.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (rate >= 1) return rate.toFixed(4);
  return rate.toFixed(6);
}

function CurrencySelect({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const meta = currencyMeta(value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border text-sm font-semibold",
          "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700",
          "hover:border-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "transition-colors",
        )}
      >
        <span className="text-xl">{meta.flag}</span>
        <span className="text-neutral-900 dark:text-white">{meta.code}</span>
        <span className="text-xs text-neutral-400 truncate flex-1 text-left">
          {meta.name}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-neutral-400 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20",
                c.code === value &&
                  "bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-semibold",
              )}
            >
              <span className="text-base">{c.flag}</span>
              <span className="font-medium">{c.code}</span>
              <span className="text-xs text-neutral-400 truncate">
                {c.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
const Exchange = () => {
  const { user } = useAuth();

  const [rates, setRates] = useState(null); // { KES: 130.5, ... }
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Converter state
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("KES");
  const [fromAmount, setFromAmount] = useState("1");

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentAPI.getExchangeRates();
      const data = res?.data || res;
      setRates(data.rates);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load exchange rates.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    // Auto-refresh every 10 minutes
    const interval = setInterval(fetchRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  // Converter calculation (all rates are USD-based)
  const convertedAmount = (() => {
    if (!rates || !fromAmount || isNaN(parseFloat(fromAmount))) return null;
    const usdFrom = parseFloat(fromAmount) / (rates[fromCurrency] ?? 1);
    const result = usdFrom * (rates[toCurrency] ?? 1);
    return result;
  })();

  const directRate = (() => {
    if (!rates) return null;
    const from = rates[fromCurrency];
    const to = rates[toCurrency];
    if (!from || !to) return null;
    return to / from;
  })();

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        <AnimatedSection>
          <SectionHeader
            title="Exchange Rates"
            subtitle="Live currency rates — East Africa & major currencies"
            icon={<RefreshCcw className="w-6 h-6" />}
            className="mb-6"
          />
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Converter ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <AnimatedSection delay={0.04}>
              <GlassCard className="p-5">
                <p className="text-sm font-semibold text-neutral-800 dark:text-white mb-4 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                  Currency Converter
                </p>

                <CurrencySelect
                  label="From"
                  value={fromCurrency}
                  onChange={setFromCurrency}
                />

                <div className="my-3">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl border text-sm font-mono",
                      "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600",
                      "text-neutral-900 dark:text-white",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                    )}
                  />
                </div>

                {/* Swap button */}
                <div className="flex justify-center my-2">
                  <button
                    type="button"
                    onClick={swap}
                    className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    title="Swap currencies"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </div>

                <CurrencySelect
                  label="To"
                  value={toCurrency}
                  onChange={setToCurrency}
                />

                {/* Result */}
                <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  {loading ? (
                    <div className="h-6 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" />
                  ) : error ? (
                    <p className="text-xs text-red-500">{error}</p>
                  ) : (
                    <>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                        {fromAmount || "1"} {fromCurrency} =
                      </p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {convertedAmount != null
                          ? convertedAmount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                        <span className="text-sm font-medium ml-2">
                          {toCurrency}
                        </span>
                      </p>
                      {directRate != null && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          1 {fromCurrency} ={" "}
                          {formatRate(directRate, toCurrency)} {toCurrency}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </GlassCard>
            </AnimatedSection>

            {/* Last updated + refresh */}
            <AnimatedSection delay={0.07}>
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {updatedAt
                    ? `Updated ${new Date(updatedAt).toLocaleTimeString()}`
                    : "—"}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={fetchRates}
                  disabled={loading}
                  className="flex items-center gap-1"
                >
                  <RefreshCcw
                    className={cn("w-3 h-3", loading && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
            </AnimatedSection>
          </div>

          {/* ── Right: Rate table ────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <AnimatedSection delay={0.06}>
              <GlassCard className="p-5">
                <p className="text-sm font-semibold text-neutral-800 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-500" />
                  Live Rates vs USD
                </p>

                {loading && (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 animate-pulse"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                          <div className="space-y-1">
                            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-10" />
                            <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded w-24" />
                          </div>
                        </div>
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
                      </div>
                    ))}
                  </div>
                )}

                {error && !loading && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <p className="text-sm text-neutral-500">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchRates}>
                      Retry
                    </Button>
                  </div>
                )}

                {!loading && !error && rates && (
                  <div className="space-y-1.5">
                    {CURRENCIES.filter((c) => c.code !== "USD").map((c) => {
                      const rate = rates[c.code];
                      const isEA = c.region === "ea";
                      return (
                        <div
                          key={c.code}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl transition-colors",
                            "hover:bg-neutral-50 dark:hover:bg-neutral-800/70",
                            isEA
                              ? "bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30"
                              : "bg-neutral-50/50 dark:bg-neutral-800/30",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl leading-none">
                              {c.flag}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-neutral-800 dark:text-white">
                                {c.code}
                                {isEA && (
                                  <span className="ml-1.5 text-[10px] font-medium text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/40 px-1.5 py-0.5 rounded-full">
                                    EA
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-neutral-400">
                                {c.name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                              {rate != null ? formatRate(rate, c.code) : "N/A"}
                            </p>
                            <p className="text-xs text-neutral-400">
                              per 1 USD
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </AnimatedSection>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Exchange;
