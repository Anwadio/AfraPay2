import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  rightElement,
}) {
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 w-9 h-9 items-center justify-center rounded-full bg-slate-100"
          >
            <Text className="text-slate-700 text-lg">←</Text>
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-900">{title}</Text>
          {subtitle && (
            <Text className="text-sm text-slate-400 mt-0.5">{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
}
