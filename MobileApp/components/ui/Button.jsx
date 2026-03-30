import React, { useRef } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  Animated,
} from "react-native";

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const VARIANTS = {
    primary: {
      bg: "#2563eb",
      text: "#fff",
      shadow: "#2563eb",
      border: "transparent",
    },
    secondary: {
      bg: "#059669",
      text: "#fff",
      shadow: "#059669",
      border: "transparent",
    },
    outline: {
      bg: "transparent",
      text: "#2563eb",
      shadow: "transparent",
      border: "#2563eb",
    },
    ghost: {
      bg: "#eff6ff",
      text: "#2563eb",
      shadow: "transparent",
      border: "transparent",
    },
    danger: {
      bg: "#ef4444",
      text: "#fff",
      shadow: "#ef4444",
      border: "transparent",
    },
  };

  const SIZES = {
    sm: { py: 10, px: 18, fs: 14 },
    md: { py: 13, px: 22, fs: 15 },
    lg: { py: 16, px: 28, fs: 16 },
  };

  const v = VARIANTS[variant];
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            paddingVertical: s.py,
            paddingHorizontal: s.px,
            backgroundColor: v.bg,
            borderWidth: variant === "outline" ? 1.5 : 0,
            borderColor: v.border,
            shadowColor: v.shadow,
            shadowOpacity: isDisabled ? 0 : 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: isDisabled ? 0 : 5,
            opacity: isDisabled ? 0.55 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={
              variant === "outline" || variant === "ghost" ? "#2563eb" : "#fff"
            }
            size="small"
          />
        ) : (
          <>
            {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
            <Text
              style={{
                fontSize: s.fs,
                fontWeight: "700",
                color: v.text,
                letterSpacing: 0.2,
              }}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
