/* eslint-disable no-unused-vars */
import React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Wallet,
  Send,
  Download,
  FileText,
  RefreshCcw,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  DollarSign,
  PiggyBank,
  BarChart2,
} from "lucide-react";
import { cn } from "../../utils";
import { Button, Badge } from "../ui";
import {
  DashboardCard,
  DashboardWidget,
  DashboardGrid,
} from "../layout/DashboardUtils";

/* ── Shared animation variants ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/**
 * Enhanced Stats Card for Financial Metrics
 * Premium design: gradient icon, sparkline, glow hover
 */
const FinanceStatsCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  trend,
  subtitle,
  loading = false,
  index = 0,
  className,
  ...props
}) => {
  const changeConfig = {
    positive: {
      Icon: TrendingUp,
      textColor: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      barColor: "bg-emerald-200 group-hover:bg-emerald-300",
    },
    negative: {
      Icon: TrendingDown,
      textColor: "text-red-500",
      bg: "bg-red-50",
      ring: "ring-red-100",
      barColor: "bg-red-200 group-hover:bg-red-300",
    },
    neutral: {
      Icon: Minus,
      textColor: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-100",
      barColor: "bg-blue-200 group-hover:bg-blue-300",
    },
  };

  const cfg = changeConfig[changeType] || changeConfig.neutral;
  const ChangeIcon = cfg.Icon;

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-slate-100 bg-white p-5 animate-pulse",
          className,
        )}
      >
        <div className="flex justify-between mb-3">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-8 bg-slate-100 rounded w-32 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-20" />
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={cn(
        "group relative rounded-2xl p-5 overflow-hidden",
        "bg-white border border-slate-100/80",
        "shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]",
        "transition-all duration-300 ease-out",
        "hover:shadow-[0_4px_20px_rgba(37,99,235,0.08),0_12px_40px_rgba(37,99,235,0.06)]",
        "hover:-translate-y-1 hover:border-blue-100",
        className,
      )}
      {...props}
    >
      {/* Subtle gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-teal-50/0 group-hover:from-blue-50/30 group-hover:to-teal-50/20 transition-all duration-500 rounded-2xl pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-500 leading-none pt-0.5">
            {title}
          </p>
          {icon && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
              <span className="text-white">{icon}</span>
            </div>
          )}
        </div>

        {/* Value */}
        <p className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1 tabular">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-400 mb-2.5">{subtitle}</p>
        )}

        {/* Change pill */}
        {change && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1",
              cfg.bg,
              cfg.textColor,
              cfg.ring,
            )}
          >
            <ChangeIcon className="w-3 h-3" />
            <span>{change}</span>
          </div>
        )}

        {/* Mini sparkline */}
        {trend && (
          <div className="flex items-end gap-0.5 h-6 mt-3">
            {Array.from({ length: 8 }, (_, i) => {
              const h = Math.round(30 + Math.random() * 70);
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{
                    delay: index * 0.05 + i * 0.03,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "flex-1 rounded-full transition-colors duration-200",
                    cfg.barColor,
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Financial Transaction List Item
 * Premium animated row with lucide icons and status chip
 */
const FinanceTransactionItem = ({
  transaction,
  onClick,
  className,
  showDate = true,
  index = 0,
  ...props
}) => {
  const getTransactionConfig = (type) => {
    switch (type) {
      case "received":
        return {
          Icon: ArrowDownLeft,
          bg: "bg-emerald-50",
          color: "text-emerald-600",
          ring: "ring-emerald-100",
        };
      case "sent":
        return {
          Icon: ArrowUpRight,
          bg: "bg-red-50",
          color: "text-red-500",
          ring: "ring-red-100",
        };
      case "bill":
        return {
          Icon: Receipt,
          bg: "bg-blue-50",
          color: "text-blue-600",
          ring: "ring-blue-100",
        };
      default:
        return {
          Icon: Wallet,
          bg: "bg-slate-50",
          color: "text-slate-600",
          ring: "ring-slate-100",
        };
    }
  };

  const cfg = getTransactionConfig(transaction?.type);
  const { Icon, bg, color, ring } = cfg;
  const isCredit = transaction?.type === "received";

  const getAmountColor = (type) => {
    switch (type) {
      case "received":
        return "text-emerald-600";
      case "sent":
        return "text-slate-800";
      default:
        return "text-slate-800";
    }
  };

  const formatAmount = (amount, type) => {
    const prefix = type === "received" ? "+" : type === "sent" ? "-" : "";
    const currency = transaction?.currency || "USD";
    return `${prefix}${currency} ${Math.abs(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
      case "success":
        return {
          Icon: CheckCircle2,
          color: "text-emerald-500",
          label: "Completed",
        };
      case "pending":
        return { Icon: Clock, color: "text-amber-500", label: "Pending" };
      default:
        return { Icon: AlertCircle, color: "text-red-400", label: status };
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-4 py-3.5",
        "hover:bg-slate-50/80 transition-colors duration-150",
        "cursor-pointer rounded-xl",
        className,
      )}
      {...props}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 group-hover:scale-105 transition-transform duration-200",
          bg,
          color,
          ring,
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate leading-none mb-1">
          {transaction?.description || transaction?.recipient || "Transaction"}
        </p>
        <div className="flex items-center gap-2">
          {showDate && transaction?.date && (
            <p className="text-xs text-slate-400 leading-none">
              {new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
              }).format(new Date(transaction.date))}
            </p>
          )}
          {transaction?.status &&
            transaction.status !== "completed" &&
            (() => {
              const sc = getStatusConfig(transaction.status);
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    sc.color,
                  )}
                >
                  <sc.Icon className="w-3 h-3" /> {sc.label}
                </span>
              );
            })()}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0 flex items-center gap-1.5">
        <p
          className={cn(
            "text-sm font-bold tabular",
            getAmountColor(transaction?.type),
          )}
        >
          {formatAmount(transaction?.amount, transaction?.type)}
        </p>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </motion.div>
  );
};

/**
 * Financial Account/Wallet Card — premium version
 */
const FinanceAccountCard = ({
  account,
  onClick,
  className,
  showBalance = true,
  actions,
  ...props
}) => {
  const getAccountConfig = (type) => {
    switch (type) {
      case "checking":
        return {
          Icon: CreditCard,
          gradient: "from-blue-500 to-blue-600",
          shadow: "shadow-blue-500/25",
        };
      case "savings":
        return {
          Icon: PiggyBank,
          gradient: "from-emerald-400 to-teal-500",
          shadow: "shadow-emerald-500/25",
        };
      case "crypto":
        return {
          Icon: BarChart2,
          gradient: "from-violet-500 to-purple-600",
          shadow: "shadow-violet-500/25",
        };
      default:
        return {
          Icon: Wallet,
          gradient: "from-blue-500 to-blue-600",
          shadow: "shadow-blue-500/25",
        };
    }
  };

  const cfg = getAccountConfig(account?.type);
  const { Icon, gradient, shadow } = cfg;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "rounded-2xl p-5 bg-white border border-slate-100",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(37,99,235,0.10)]",
        "cursor-pointer transition-all duration-300 hover:border-blue-100",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              gradient,
              shadow,
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm leading-none mb-0.5">
              {account?.name}
            </h3>
            <p className="text-xs text-slate-400 capitalize">
              {account?.type} · {account?.number}
            </p>
          </div>
        </div>
        {account?.status && (
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1",
              account.status === "active"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-amber-50 text-amber-700 ring-amber-100",
            )}
          >
            {account.status}
          </span>
        )}
      </div>

      {showBalance && (
        <div className="mb-4">
          <p className="text-2xl font-bold text-slate-900 tabular tracking-tight">
            ${account?.balance?.toLocaleString()}
          </p>
          {account?.availableBalance &&
            account.availableBalance !== account.balance && (
              <p className="text-xs text-slate-400 mt-0.5">
                ${account.availableBalance.toLocaleString()} available
              </p>
            )}
        </div>
      )}

      {actions && (
        <div className="flex gap-2 pt-4 border-t border-slate-100">
          {actions}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Quick Actions Grid — premium icon tiles with spring animations
 */
const FinanceQuickActions = ({ actions = [], className, ...props }) => {
  const defaultActions = [
    { id: "send", label: "Send", Icon: Send, color: "blue", href: "/send" },
    {
      id: "receive",
      label: "Receive",
      Icon: Download,
      color: "green",
      href: "/receive",
    },
    {
      id: "bills",
      label: "Pay Bills",
      Icon: FileText,
      color: "purple",
      href: "/bills",
    },
    {
      id: "exchange",
      label: "Exchange",
      Icon: RefreshCcw,
      color: "teal",
      href: "/exchange",
    },
  ];

  const colorMap = {
    blue: "bg-blue-50   text-blue-600   hover:bg-blue-100   ring-blue-100",
    green:
      "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-emerald-100",
    purple:
      "bg-violet-50 text-violet-600  hover:bg-violet-100  ring-violet-100",
    teal: "bg-teal-50   text-teal-600   hover:bg-teal-100   ring-teal-100",
    amber: "bg-amber-50  text-amber-600  hover:bg-amber-100  ring-amber-100",
  };

  const actionsToShow = actions.length > 0 ? actions : defaultActions;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}
      {...props}
    >
      {actionsToShow.map((action, i) => {
        const { Icon: ActionIcon } = action;
        return (
          <motion.button
            key={action.id}
            variants={fadeUp}
            custom={i}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-4 px-3",
              "rounded-2xl ring-1 transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              colorMap[action.color] || colorMap.blue,
            )}
            onClick={() =>
              action.onClick
                ? action.onClick()
                : (window.location.href = action.href)
            }
          >
            <div className="w-9 h-9 flex items-center justify-center">
              {ActionIcon && <ActionIcon className="w-5 h-5" />}
            </div>
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export {
  FinanceStatsCard,
  FinanceTransactionItem,
  FinanceAccountCard,
  FinanceQuickActions,
};
