import React from "react";
import { View, Text } from "react-native";

const VARIANTS = {
  success: { bg: "bg-emerald-100", text: "text-emerald-700" },
  error: { bg: "bg-red-100", text: "text-red-700" },
  warning: { bg: "bg-amber-100", text: "text-amber-700" },
  info: { bg: "bg-blue-100", text: "text-blue-700" },
  default: { bg: "bg-slate-100", text: "text-slate-700" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-700" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
};

export default function Badge({ label, variant = "default", className = "" }) {
  const style = VARIANTS[variant] || VARIANTS.default;
  return (
    <View className={`px-2 py-0.5 rounded-full ${style.bg} ${className}`}>
      <Text className={`text-xs font-medium ${style.text}`}>{label}</Text>
    </View>
  );
}
