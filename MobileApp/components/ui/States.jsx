import React from "react";
import { View, ActivityIndicator, Text } from "react-native";

export function LoadingState({ message = "Loading..." }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="text-slate-500 mt-3 text-sm">{message}</Text>
    </View>
  );
}

export function EmptyState({ icon = "📭", title, message }) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <Text className="text-5xl mb-4">{icon}</Text>
      {title && (
        <Text className="text-lg font-semibold text-slate-700 text-center mb-2">
          {title}
        </Text>
      )}
      {message && (
        <Text className="text-slate-400 text-sm text-center">{message}</Text>
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  const Button = require("./Button").default;
  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <Text className="text-4xl mb-4">⚠️</Text>
      <Text className="text-slate-600 text-sm text-center mb-4">
        {message || "Something went wrong"}
      </Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          size="sm"
        />
      )}
    </View>
  );
}
