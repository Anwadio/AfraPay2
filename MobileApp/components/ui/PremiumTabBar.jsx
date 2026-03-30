/**
 * PremiumTabBar — fintech-grade floating bottom navigation
 * Reanimated 4 • Ionicons • Haptics • Safe-area aware
 */

import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const COLOR = {
  accent: "#3B82F6", // blue-500
  accentLight: "rgba(59,130,246,0.11)",
  accentBorder: "rgba(59,130,246,0.22)",
  inactive: "#94A3B8", // slate-400
  bar: "#FFFFFF",
  shadow: "#0F2B56", // rich navy shadow
};

const SPRING_PRESS = { damping: 18, stiffness: 500, mass: 0.6 };
const SPRING_RELEASE = { damping: 14, stiffness: 300, mass: 0.6 };

// ─── Tab Configuration ───────────────────────────────────────────────────────
const TAB_CONFIG = {
  index: {
    label: "Home",
    icon: "home-outline",
    iconActive: "home",
  },
  send: {
    label: "Send",
    icon: "paper-plane-outline",
    iconActive: "paper-plane",
  },
  transactions: {
    label: "History",
    icon: "receipt-outline",
    iconActive: "receipt",
  },
  cards: {
    label: "Cards",
    icon: "card-outline",
    iconActive: "card",
  },
  more: {
    label: "More",
    icon: "grid-outline",
    iconActive: "grid",
  },
};

// ─── Single Animated Tab ─────────────────────────────────────────────────────
function AnimatedTab({ route, focused, onPress, onLongPress }) {
  const cfg = TAB_CONFIG[route.name] ?? {
    label: route.name,
    icon: "ellipse-outline",
    iconActive: "ellipse",
  };

  // Shared values
  const scaleAnim = useSharedValue(1);
  const focusAnim = useSharedValue(focused ? 1 : 0);

  // Sync focus state with animation
  useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: 240 });
  }, [focused, focusAnim]);

  // ── Animated styles ──────────────────────────────────────────────────────
  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: focusAnim.value,
    transform: [
      {
        scale: interpolate(
          focusAnim.value,
          [0, 1],
          [0.7, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: focusAnim.value,
    transform: [
      {
        scaleX: interpolate(
          focusAnim.value,
          [0, 1],
          [0, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.84, SPRING_PRESS);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, SPRING_RELEASE);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const iconColor = focused ? COLOR.accent : COLOR.inactive;
  const iconSize = focused ? 22 : 21;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabTouchable}
      accessibilityRole="button"
      accessibilityLabel={cfg.label}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={[styles.tabInner, wrapperStyle]}>
        {/* Soft glow-pill background */}
        <Animated.View style={[styles.pill, pillStyle]} />

        {/* Icon */}
        <Ionicons
          name={focused ? cfg.iconActive : cfg.icon}
          size={iconSize}
          color={iconColor}
          style={styles.icon}
        />

        {/* Label */}
        <Text
          style={[styles.label, focused && styles.labelActive]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {cfg.label}
        </Text>

        {/* Active dot indicator */}
        <Animated.View style={[styles.activeDot, dotStyle]} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Premium Tab Bar ─────────────────────────────────────────────────────────
export default function PremiumTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View
      style={[styles.container, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      {/* Floating bar */}
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <AnimatedTab
              key={route.key}
              route={route}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Absolute wrapper — transparent, allows touches to pass through
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "transparent",
  },

  // The visible floating pill bar
  bar: {
    flexDirection: "row",
    backgroundColor: COLOR.bar,
    borderRadius: 28,
    height: 66,
    alignItems: "center",
    paddingHorizontal: 6,
    // iOS shadow
    shadowColor: COLOR.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    // Android elevation
    elevation: 20,
    // Hairline border for glass feel
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.18)",
    // Second shadow layer via overflow-visible trick (already covered by elevation)
  },

  // Per-tab touchable area fills the row
  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },

  // Inner container — animated scale applies here
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderRadius: 20,
    minWidth: 52,
  },

  // Soft pill behind active icon
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: COLOR.accentLight,
    borderWidth: 1,
    borderColor: COLOR.accentBorder,
  },

  icon: {
    // Slight z-index layering above pill (handled by render order)
  },

  label: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 3,
    color: COLOR.inactive,
    letterSpacing: 0.25,
  },

  labelActive: {
    color: COLOR.accent,
    fontWeight: "700",
  },

  // Tiny dot below label when active
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR.accent,
    marginTop: 2,
  },
});
