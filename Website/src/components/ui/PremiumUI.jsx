/**
 * PremiumUI.jsx
 * AfraPay Premium Component Library
 *
 * Fintech-grade UI components with Framer Motion micro-interactions,
 * 3D tilt effects, glassmorphism, and polished design tokens.
 * Inspired by Stripe, Apple Pay, and Wise dashboards.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Activity,
} from "lucide-react";
import { cn } from "../../utils";

/* ─────────────────────────────────────────────
   ANIMATION VARIANTS  (reusable motion configs)
───────────────────────────────────────────── */
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* ─────────────────────────────────────────────
   PAGE CONTAINER  – full-page fade + slide up
───────────────────────────────────────────── */
export const PageContainer = ({ children, className, ...props }) => (
  <motion.div
    variants={staggerContainer}
    initial="hidden"
    animate="visible"
    className={cn("w-full", className)}
    {...props}
  >
    {children}
  </motion.div>
);

/* ─────────────────────────────────────────────
   ANIMATED SECTION  – staggered reveal wrapper
───────────────────────────────────────────── */
export const AnimatedSection = ({
  children,
  className,
  delay = 0,
  ...props
}) => (
  <motion.div
    variants={fadeUp}
    custom={delay}
    className={cn("w-full", className)}
    {...props}
  >
    {children}
  </motion.div>
);

/* ─────────────────────────────────────────────
   GLASS CARD  – frosted glass premium card
───────────────────────────────────────────── */
export const GlassCard = React.forwardRef(
  ({ children, className, glow = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Glassmorphism base
        "relative rounded-2xl border border-white/20",
        "bg-white/70 backdrop-blur-xl",
        // Layered depth shadow (3-level)
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.04)]",
        "transition-all duration-300 ease-out",
        // Hover elevation
        "hover:shadow-[0_4px_24px_rgba(37,99,235,0.10),0_12px_48px_rgba(37,99,235,0.08)]",
        "hover:-translate-y-1",
        glow && "ring-1 ring-blue-500/20 hover:ring-blue-500/40",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
GlassCard.displayName = "GlassCard";

/* ─────────────────────────────────────────────
   TILT CARD  – 3D perspective tilt on hover
───────────────────────────────────────────── */
export const TiltCard = ({ children, className, intensity = 8, ...props }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 300, damping: 30, mass: 0.6 };
  const rotateX = useSpring(
    useTransform(y, [-0.5, 0.5], [intensity, -intensity]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(x, [-0.5, 0.5], [-intensity, intensity]),
    springConfig,
  );
  const scale = useSpring(1, { stiffness: 400, damping: 30 });

  const handleMouseMove = useCallback(
    (e) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width - 0.5;
      const yPct = (e.clientY - rect.top) / rect.height - 0.5;
      x.set(xPct);
      y.set(yPct);
    },
    [x, y],
  );

  const handleMouseEnter = () => scale.set(1.02);
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
  };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("cursor-default", className)}
      {...props}
    >
      {/* Depth shadow that strengthens on tilt */}
      <div
        className={cn(
          "rounded-2xl border border-white/20",
          "bg-white/80 backdrop-blur-xl",
          "shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.08)]",
          "transition-shadow duration-300",
          "hover:shadow-[0_8px_40px_rgba(37,99,235,0.14),0_24px_64px_rgba(0,0,0,0.1)]",
        )}
      >
        {children}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   ANIMATED BUTTON  – premium CTA with ripple
───────────────────────────────────────────── */
export const AnimatedButton = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = "left",
  className,
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    // Ripple effect origin
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = {
      id: Date.now(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setRipples((r) => [...r, ripple]);
    setTimeout(
      () => setRipples((r) => r.filter((rr) => rr.id !== ripple.id)),
      600,
    );
    onClick?.(e);
  };

  const variants = {
    primary: [
      "bg-gradient-to-r from-blue-600 via-blue-600 to-teal-500",
      "hover:from-blue-700 hover:via-blue-600 hover:to-teal-600",
      "text-white shadow-lg shadow-blue-500/25",
      "hover:shadow-xl hover:shadow-blue-500/35",
      "focus-visible:ring-4 focus-visible:ring-blue-500/40",
    ].join(" "),
    secondary: [
      "bg-gradient-to-r from-emerald-500 to-teal-500",
      "hover:from-emerald-600 hover:to-teal-600",
      "text-white shadow-lg shadow-emerald-500/25",
      "hover:shadow-xl hover:shadow-emerald-500/35",
      "focus-visible:ring-4 focus-visible:ring-emerald-500/40",
    ].join(" "),
    outline: [
      "bg-white border border-slate-200",
      "hover:bg-slate-50 hover:border-blue-300",
      "text-slate-700 shadow-sm",
      "hover:shadow-md focus-visible:ring-4 focus-visible:ring-blue-500/30",
    ].join(" "),
    ghost: [
      "bg-transparent hover:bg-slate-100",
      "text-slate-600 hover:text-slate-900",
      "focus-visible:ring-4 focus-visible:ring-slate-400/30",
    ].join(" "),
    danger: [
      "bg-gradient-to-r from-red-500 to-rose-600",
      "hover:from-red-600 hover:to-rose-700",
      "text-white shadow-lg shadow-red-500/25",
      "hover:shadow-xl hover:shadow-red-500/35",
      "focus-visible:ring-4 focus-visible:ring-red-500/40",
    ].join(" "),
  };

  const sizes = {
    xs: "h-8 px-3 text-xs gap-1.5",
    sm: "h-9 px-4 text-sm gap-2",
    md: "h-11 px-5 text-sm gap-2 font-semibold",
    lg: "h-12 px-6 text-base gap-2.5 font-semibold",
    xl: "h-14 px-8 text-base gap-3 font-bold tracking-wide",
  };

  return (
    <motion.button
      whileHover={{
        scale: disabled || loading ? 1 : 1.02,
        y: disabled || loading ? 0 : -1,
      }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center justify-center",
        "rounded-xl font-medium tracking-tight",
        "overflow-hidden select-none",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus-visible:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{ left: r.x - 20, top: r.y - 20 }}
            initial={{ width: 40, height: 40, opacity: 0.6 }}
            animate={{ width: 200, height: 200, opacity: 0, x: -80, y: -80 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Loading spinner */}
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === "left" && (
            <Icon className="w-4 h-4 shrink-0" />
          )}
          <span className="relative z-10">{children}</span>
          {Icon && iconPosition === "right" && (
            <Icon className="w-4 h-4 shrink-0" />
          )}
        </>
      )}
    </motion.button>
  );
};

/* ─────────────────────────────────────────────
   DASHBOARD STAT CARD  – premium KPI tile
   Features: animated counter, trend sparkline,
   gradient icon bg, change pill
───────────────────────────────────────────── */
export const DashboardStatCard = ({
  title,
  value,
  change,
  changeType = "neutral", // "positive" | "negative" | "neutral"
  icon: IconComponent,
  iconColor = "blue",
  trend = [], // array of numbers for mini sparkline
  subtitle,
  loading = false,
  index = 0, // for stagger delay
  className,
  ...props
}) => {
  const changeConfig = {
    positive: {
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
    },
    negative: {
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50",
      ring: "ring-red-100",
    },
    neutral: {
      icon: Minus,
      color: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-100",
    },
  };

  const iconBgConfig = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
    green: "from-emerald-400 to-teal-500 shadow-emerald-500/30",
    purple: "from-violet-500 to-purple-600 shadow-violet-500/30",
    amber: "from-amber-400 to-orange-500 shadow-amber-500/30",
    rose: "from-rose-500 to-pink-600 shadow-rose-500/30",
    teal: "from-teal-400 to-cyan-500 shadow-teal-500/30",
  };

  const config = changeConfig[changeType];
  const ChangeIcon = config.icon;

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-slate-100 bg-white p-5",
          "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
          className,
        )}
      >
        <div className="animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-3 bg-slate-100 rounded w-24" />
            <div className="w-10 h-10 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-8 bg-slate-100 rounded w-32" />
          <div className="h-3 bg-slate-100 rounded w-20" />
        </div>
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
        // Layered depth shadow
        "shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]",
        "transition-all duration-300 ease-out",
        // Hover elevation with blue glow hint
        "hover:shadow-[0_4px_20px_rgba(37,99,235,0.08),0_12px_40px_rgba(37,99,235,0.06)]",
        "hover:-translate-y-1",
        "hover:border-blue-100",
        className,
      )}
      {...props}
    >
      {/* Subtle gradient bg on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-teal-50/0 group-hover:from-blue-50/40 group-hover:to-teal-50/30 transition-all duration-500 rounded-2xl pointer-events-none" />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-500 leading-none pt-0.5">
            {title}
          </p>
          {IconComponent && (
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br shadow-lg",
                iconBgConfig[iconColor] || iconBgConfig.blue,
              )}
            >
              <IconComponent className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2.5">
          <p className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>
          )}
        </div>

        {/* Change pill */}
        {change && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1",
              config.bg,
              config.color,
              config.ring,
            )}
          >
            <ChangeIcon className="w-3 h-3" />
            <span>{change}</span>
          </div>
        )}

        {/* Mini sparkline trend bars */}
        {trend.length > 0 && (
          <div className="flex items-end gap-0.5 h-6 mt-3">
            {trend.map((val, i) => {
              const max = Math.max(...trend, 1);
              const height = Math.round((val / max) * 100);
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{
                    delay: index * 0.07 + i * 0.03,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "flex-1 rounded-full",
                    changeType === "positive"
                      ? "bg-emerald-300 group-hover:bg-emerald-400"
                      : changeType === "negative"
                        ? "bg-red-300 group-hover:bg-red-400"
                        : "bg-blue-200 group-hover:bg-blue-300",
                    "transition-colors duration-200",
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

/* ─────────────────────────────────────────────
   TRANSACTION ITEM  – animated list row
───────────────────────────────────────────── */
const TRANSACTION_ICONS = {
  received: {
    Icon: ArrowDownLeft,
    bg: "bg-emerald-50",
    color: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  sent: {
    Icon: ArrowUpRight,
    bg: "bg-red-50",
    color: "text-red-500",
    ring: "ring-red-100",
  },
  bill: {
    Icon: Receipt,
    bg: "bg-blue-50",
    color: "text-blue-600",
    ring: "ring-blue-100",
  },
  default: {
    Icon: Wallet,
    bg: "bg-slate-50",
    color: "text-slate-600",
    ring: "ring-slate-100",
  },
};

export const TransactionItem = ({
  transaction,
  onClick,
  index = 0,
  className,
  ...props
}) => {
  const type = transaction?.type || "default";
  const cfg = TRANSACTION_ICONS[type] || TRANSACTION_ICONS.default;
  const { Icon, bg, color, ring } = cfg;

  const isCredit = type === "received";
  const amount = transaction?.amount ?? 0;
  const currency = transaction?.currency || "USD";
  const formattedAmount = `${isCredit ? "+" : "-"}${currency} ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const date = transaction?.createdAt || transaction?.date;
  const displayDate = date
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
        new Date(date),
      )
    : null;

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
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          "ring-1 transition-all duration-200",
          "group-hover:scale-105",
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
        <p className="text-xs text-slate-400 leading-none">
          {displayDate}
          {transaction?.status && (
            <span
              className={cn(
                "ml-2 inline-flex items-center gap-1",
                transaction.status === "completed" ||
                  transaction.status === "success"
                  ? "text-emerald-500"
                  : transaction.status === "pending"
                    ? "text-amber-500"
                    : "text-red-500",
              )}
            >
              {transaction.status === "completed" ||
              transaction.status === "success" ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : transaction.status === "pending" ? (
                <Activity className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              <span className="capitalize">{transaction.status}</span>
            </span>
          )}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p
          className={cn(
            "text-sm font-bold leading-none mb-1",
            isCredit ? "text-emerald-600" : "text-slate-800",
          )}
        >
          {formattedAmount}
        </p>
        <div className="flex justify-end">
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   LOADING SKELETON  – premium shimmer skeleton
───────────────────────────────────────────── */
export const Skeleton = ({ className, ...props }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-lg bg-slate-100",
      "before:absolute before:inset-0",
      "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
      "before:animate-[shimmer_1.5s_infinite]",
      className,
    )}
    {...props}
  />
);

/* ─────────────────────────────────────────────
   STATUS BADGE  – semantic status indicator
───────────────────────────────────────────── */
export const StatusBadge = ({ status, className }) => {
  const config = {
    active: {
      label: "Active",
      classes: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    inactive: {
      label: "Inactive",
      classes: "bg-slate-50 text-slate-500 ring-slate-200",
    },
    pending: {
      label: "Pending",
      classes: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    completed: {
      label: "Completed",
      classes: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    failed: { label: "Failed", classes: "bg-red-50 text-red-600 ring-red-200" },
    verified: {
      label: "Verified",
      classes: "bg-blue-50 text-blue-700 ring-blue-200",
    },
  };

  const cfg = config[status] || {
    label: status,
    classes: "bg-slate-50 text-slate-500 ring-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1",
        cfg.classes,
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   SECTION HEADER  – consistent section titles
───────────────────────────────────────────── */
export const SectionHeader = ({
  title,
  description,
  action,
  badge,
  className,
}) => (
  <div className={cn("flex items-start justify-between gap-4 mb-5", className)}>
    <div className="min-w-0">
      <div className="flex items-center gap-2.5 mb-1">
        <h2 className="text-base font-bold text-slate-900 leading-tight tracking-tight">
          {title}
        </h2>
        {badge && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold ring-1 ring-blue-100">
            <Sparkles className="w-2.5 h-2.5" />
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-slate-400 leading-snug">{description}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/* ─────────────────────────────────────────────
   QUICK ACTION BUTTON  – icon + label tile
───────────────────────────────────────────── */
export const QuickActionTile = ({
  icon: Icon,
  label,
  onClick,
  color = "blue",
  className,
}) => {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-100 ring-blue-100",
    green:
      "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-emerald-100",
    purple: "bg-violet-50 text-violet-600 hover:bg-violet-100 ring-violet-100",
    amber: "bg-amber-50 text-amber-600 hover:bg-amber-100 ring-amber-100",
    rose: "bg-rose-50 text-rose-600 hover:bg-rose-100 ring-rose-100",
    teal: "bg-teal-50 text-teal-600 hover:bg-teal-100 ring-teal-100",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        "p-4 rounded-2xl ring-1 transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        colorMap[color] || colorMap.blue,
        className,
      )}
    >
      <div className="w-9 h-9 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
        {label}
      </span>
    </motion.button>
  );
};

/* ─────────────────────────────────────────────
   MARQUEE TRUST STRIP  – scrolling trust logos
───────────────────────────────────────────── */
export const TrustStrip = ({ items = [], className }) => (
  <div className={cn("relative overflow-hidden", className)}>
    <div className="flex gap-8 items-center animate-[marquee_20s_linear_infinite]">
      {[...items, ...items].map((item, i) => (
        <div
          key={i}
          className="shrink-0 text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap"
        >
          {item}
        </div>
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   FEATURE CARD  – landing page feature tile
───────────────────────────────────────────── */
export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  index = 0,
  accent = "blue",
  className,
}) => {
  const accentMap = {
    blue: {
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      glow: "group-hover:shadow-blue-500/20",
      border: "hover:border-blue-200",
    },
    green: {
      iconBg: "bg-gradient-to-br from-emerald-400 to-teal-500",
      glow: "group-hover:shadow-emerald-500/20",
      border: "hover:border-emerald-200",
    },
    purple: {
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      glow: "group-hover:shadow-violet-500/20",
      border: "hover:border-violet-200",
    },
  };

  const cfg = accentMap[accent] || accentMap.blue;

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={cn(
        "group relative rounded-2xl p-6 bg-white border border-slate-100",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        "hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
        "hover:-translate-y-1.5 transition-all duration-300 ease-out",
        cfg.border,
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg",
          cfg.iconBg,
          cfg.glow,
        )}
      >
        {Icon && <Icon className="w-6 h-6 text-white" />}
      </div>

      <h3 className="text-base font-bold text-slate-900 mb-2 leading-tight">
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>

      {/* Hover arrow */}
      <div className="flex items-center gap-1 mt-4 text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
        Learn more <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </motion.div>
  );
};
