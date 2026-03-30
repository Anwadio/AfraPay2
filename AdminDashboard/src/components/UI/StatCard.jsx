import React from "react";
import {
  UsersIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

const THEMES = {
  users: {
    icon: UsersIcon,
    accent: "from-blue-500 to-blue-700",
    soft: "bg-blue-50",
    text: "text-blue-600",
  },
  "user-check": {
    icon: UserIcon,
    accent: "from-emerald-500 to-teal-600",
    soft: "bg-emerald-50",
    text: "text-emerald-600",
  },
  "credit-card": {
    icon: CreditCardIcon,
    accent: "from-violet-500 to-purple-700",
    soft: "bg-violet-50",
    text: "text-violet-600",
  },
  banknotes: {
    icon: BanknotesIcon,
    accent: "from-amber-500 to-orange-600",
    soft: "bg-amber-50",
    text: "text-amber-600",
  },
};

const StatCard = ({ title, value, change, changeType, icon }) => {
  const theme = THEMES[icon] || THEMES.users;
  const Icon = theme.icon;

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover border border-slate-100 transition-all duration-200 hover:-translate-y-0.5 group overflow-hidden">
      {/* Accent bar */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${theme.accent}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.08em] leading-none">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900 tabular tracking-tight leading-none">
            {value?.toLocaleString?.() || value || "0"}
          </p>
          {change && (
            <div
              className={`mt-3 flex items-center gap-1 text-xs font-semibold leading-none ${
                changeType === "positive"
                  ? "text-emerald-600"
                  : changeType === "negative"
                    ? "text-red-500"
                    : "text-slate-500"
              }`}
            >
              {changeType === "positive" && <ArrowUpIcon className="h-3 w-3" />}
              {changeType === "negative" && (
                <ArrowDownIcon className="h-3 w-3" />
              )}
              {changeType === "neutral" && <MinusIcon className="h-3 w-3" />}
              <span>{change}</span>
            </div>
          )}
        </div>

        {/* Icon badge */}
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${theme.accent} shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
