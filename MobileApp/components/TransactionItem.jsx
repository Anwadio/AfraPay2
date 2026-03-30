import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Badge from "./ui/Badge";

function formatAmount(amount, currency = "USD") {
  const num = parseFloat(amount || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    num,
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TYPE_ICONS = {
  send: "↗",
  receive: "↙",
  deposit: "⬇",
  withdrawal: "⬆",
  payment: "💳",
  transfer: "↔",
};

const STATUS_VARIANT = {
  completed: "completed",
  success: "success",
  pending: "pending",
  failed: "failed",
  cancelled: "error",
};

export default function TransactionItem({ transaction, onPress }) {
  const isDebit = ["send", "withdrawal", "payment"].includes(
    transaction.type?.toLowerCase(),
  );
  const icon = TYPE_ICONS[transaction.type?.toLowerCase()] || "💸";
  const statusVariant =
    STATUS_VARIANT[transaction.status?.toLowerCase()] || "default";
  const amountColor = isDebit ? "text-red-500" : "text-emerald-600";
  const sign = isDebit ? "-" : "+";

  return (
    <TouchableOpacity
      onPress={() => onPress?.(transaction)}
      className="flex-row items-center py-3.5 px-4 bg-white border-b border-slate-100"
      activeOpacity={0.7}
    >
      {/* Icon circle */}
      <View
        className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${isDebit ? "bg-red-50" : "bg-emerald-50"}`}
      >
        <Text className="text-lg">{icon}</Text>
      </View>

      {/* Description */}
      <View className="flex-1">
        <Text
          className="text-sm font-semibold text-slate-800"
          numberOfLines={1}
        >
          {transaction.description || transaction.type || "Transaction"}
        </Text>
        <Text className="text-xs text-slate-400 mt-0.5">
          {formatDate(transaction.createdAt || transaction.date)}
        </Text>
      </View>

      {/* Amount + Status */}
      <View className="items-end">
        <Text className={`text-sm font-bold ${amountColor}`}>
          {sign}
          {formatAmount(transaction.amount, transaction.currency)}
        </Text>
        <View className="mt-1">
          <Badge
            label={transaction.status || "unknown"}
            variant={statusVariant}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
