import React from "react";
import { View } from "react-native";

export default function Card({ children, className = "", style }) {
  return (
    <View
      className={`bg-white rounded-2xl p-4 shadow-sm ${className}`}
      style={[
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
