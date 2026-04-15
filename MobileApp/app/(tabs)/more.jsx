import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  Switch,
  Animated as RNAnimated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import {
  walletAPI,
  notificationsAPI,
  subscriptionAPI,
} from "../../services/api";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_VERSION = "1.0.0";

// ─── Quick actions (section/route config) ─────────────────────────────────────
const QUICK_SECTIONS = [
  {
    title: "Financial Tools",
    items: [
      {
        iconName: "bar-chart-outline",
        label: "Analytics",
        desc: "Spending insights",
        route: "/Screens/analytics",
        tint: "#7C3AED",
      },
      {
        iconName: "repeat-outline",
        label: "Subscriptions",
        desc: "Manage your plans",
        route: "/Screens/subscriptions",
        tint: "#2563EB",
      },
      {
        iconName: "storefront-outline",
        label: "Merchant",
        desc: "Business tools",
        route: "/Screens/merchant",
        tint: "#059669",
      },
      {
        iconName: "book-outline",
        label: "Education",
        desc: "Financial courses",
        route: "/Screens/education",
        tint: "#D97706",
      },
    ],
  },
  {
    title: "Support & Assistant",
    items: [
      {
        iconName: "chatbubble-ellipses-outline",
        label: "AI Assistant",
        desc: "Smart money help",
        route: "/Screens/ai-assistant",
        tint: "#2563EB",
      },
      {
        iconName: "notifications-outline",
        label: "Notifications",
        desc: "Alerts & updates",
        route: "/Screens/notifications",
        tint: "#64748B",
        badgeKey: "unread",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        iconName: "person-circle-outline",
        label: "Profile",
        desc: "Personal details",
        route: "/Screens/profile",
        tint: "#2563EB",
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(user) {
  if (!user) return "U";
  const fn = user.firstName || "";
  const ln = user.lastName || "";
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  const name = user.name || user.email || "U";
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(user) {
  if (!user) return "—";
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.name || user.email || "User";
}

function formatBalance(val, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(parseFloat(val || 0));
  } catch {
    return `${currency} ${parseFloat(val || 0).toFixed(2)}`;
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBox({ style }) {
  const anim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(anim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        RNAnimated.timing(anim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });
  return (
    <RNAnimated.View
      style={[{ backgroundColor: "#CBD5E1", borderRadius: 8, opacity }, style]}
    />
  );
}

// ─── ProfileCard ──────────────────────────────────────────────────────────────
function ProfileCard({ user, onPress, loading }) {
  if (loading) {
    return (
      <View style={styles.profileCard}>
        <SkeletonBox style={{ width: 58, height: 58, borderRadius: 29 }} />
        <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
          <SkeletonBox style={{ width: "55%", height: 14 }} />
          <SkeletonBox style={{ width: "70%", height: 11 }} />
        </View>
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.profileCard}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{getInitials(user)}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={styles.profileName}>{getDisplayName(user)}</Text>
        <Text style={styles.profileEmail} numberOfLines={1}>
          {user?.email || "—"}
        </Text>
        {user?.isVerified && (
          <View style={styles.verifiedPill}>
            <Ionicons
              name="checkmark-circle"
              size={11}
              color="#059669"
              style={{ marginRight: 3 }}
            />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

// ─── WalletStrip ──────────────────────────────────────────────────────────────
function WalletStrip({ wallet, loading }) {
  const [masked, setMasked] = useState(true);
  if (loading) {
    return (
      <View style={styles.walletStrip}>
        <SkeletonBox style={{ width: 80, height: 10, borderRadius: 5 }} />
        <SkeletonBox
          style={{ width: 120, height: 20, borderRadius: 6, marginVertical: 6 }}
        />
        <SkeletonBox style={{ width: 60, height: 10, borderRadius: 5 }} />
      </View>
    );
  }
  const balance = wallet?.totalValueUSD ?? wallet?.balance ?? 0;
  const currency = wallet?.primaryCurrency || "USD";
  const walletCount = wallet?.wallets?.length ?? 1;
  return (
    <View style={styles.walletStrip}>
      {/* Left info */}
      <View>
        <Text style={styles.walletLabel}>Total Balance</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {},
            );
            setMasked((m) => !m);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.walletBalance}>
            {masked ? "• • • • • •" : formatBalance(balance, currency)}
          </Text>
        </TouchableOpacity>
        <Text style={styles.walletMeta}>
          {walletCount} wallet{walletCount !== 1 ? "s" : ""}
        </Text>
      </View>
      {/* Right icons */}
      <View style={styles.walletActions}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {},
            );
            setMasked((m) => !m);
          }}
          style={styles.walletIconBtn}
        >
          <Ionicons
            name={masked ? "eye-outline" : "eye-off-outline"}
            size={18}
            color="#2563EB"
          />
        </TouchableOpacity>
        <View style={styles.walletIconBtn}>
          <Ionicons name="wallet-outline" size={18} color="#059669" />
        </View>
      </View>
    </View>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChips({ unreadCount, subCount }) {
  return (
    <View style={styles.statChipsRow}>
      <View style={styles.statChip}>
        <Ionicons
          name="notifications-outline"
          size={14}
          color="#2563EB"
          style={{ marginRight: 5 }}
        />
        <Text style={styles.statChipText}>
          {unreadCount > 0 ? `${unreadCount} unread` : "No new alerts"}
        </Text>
      </View>
      <View style={[styles.statChip, { backgroundColor: "#ECFDF5" }]}>
        <Ionicons
          name="repeat-outline"
          size={14}
          color="#059669"
          style={{ marginRight: 5 }}
        />
        <Text style={[styles.statChipText, { color: "#059669" }]}>
          {subCount > 0
            ? `${subCount} active plan${subCount !== 1 ? "s" : ""}`
            : "No subscriptions"}
        </Text>
      </View>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Quick Action Row ─────────────────────────────────────────────────────────
function QuickActionGrid({ items, onPress, unreadCount }) {
  return (
    <View style={styles.menuCard}>
      {items.map((item, i) => (
        <TouchableOpacity
          key={item.label}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {},
            );
            onPress(item.route);
          }}
          style={[styles.menuRow, i < items.length - 1 && styles.menuRowBorder]}
          activeOpacity={0.7}
        >
          <View
            style={[styles.menuIconWrap, { backgroundColor: item.tint + "18" }]}
          >
            <Ionicons name={item.iconName} size={19} color={item.tint} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.desc}</Text>
          </View>
          {item.badgeKey === "unread" && unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
          <Ionicons
            name="chevron-forward"
            size={15}
            color="#CBD5E1"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Recent Notifications ─────────────────────────────────────────────────────
function NotificationPreview({ items, onViewAll }) {
  if (!items || items.length === 0) {
    return (
      <View style={[styles.menuCard, styles.emptyNotifWrap]}>
        <Ionicons name="notifications-off-outline" size={26} color="#CBD5E1" />
        <Text style={styles.emptyNotifText}>No recent notifications</Text>
      </View>
    );
  }
  return (
    <View style={styles.menuCard}>
      {items.map((n, i) => (
        <View
          key={n._id || n.id || i}
          style={[
            styles.notifRow,
            i < items.length - 1 && styles.menuRowBorder,
          ]}
        >
          <View style={[styles.notifDot, !n.read && styles.notifDotUnread]} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.notifTitle} numberOfLines={1}>
              {n.title || n.message || "Notification"}
            </Text>
            <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
          onViewAll();
        }}
        style={styles.viewAllBtn}
      >
        <Text style={styles.viewAllBtnText}>View all notifications</Text>
        <Ionicons
          name="arrow-forward"
          size={13}
          color="#2563EB"
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Settings Row (toggle) ────────────────────────────────────────────────────
function SettingsToggle({ iconName, label, desc, tint, value, onChange }) {
  return (
    <View style={styles.settingsRow}>
      <View style={[styles.menuIconWrap, { backgroundColor: tint + "18" }]}>
        <Ionicons name={iconName} size={18} color={tint} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {desc ? <Text style={styles.menuDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
          onChange(v);
        }}
        trackColor={{ false: "#E2E8F0", true: "#BFDBFE" }}
        thumbColor={value ? "#2563EB" : "#94A3B8"}
        ios_backgroundColor="#E2E8F0"
      />
    </View>
  );
}

// ─── MoreScreen ───────────────────────────────────────────────────────────────
export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ── Data state ───────────────────────────────────────────────────────────
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [subCount, setSubCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ── Settings toggles (local pref only — backend write optional) ──────────
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [langPickerVisible, setLangPickerVisible] = useState(false);

  // ── Fetch all data ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    await Promise.allSettled([
      walletAPI
        .getBalances()
        .then((r) => setWallet(r.data?.data ?? r.data))
        .catch(() => {})
        .finally(() => setWalletLoading(false)),

      notificationsAPI
        .getUnreadCount()
        .then((r) => setUnreadCount(r.data?.unreadCount ?? r.data?.count ?? 0))
        .catch(() => {}),

      notificationsAPI
        .getNotifications({ limit: 4, page: 1 })
        .then((r) => {
          const arr = r.data?.notifications || r.data?.data || [];
          setRecentNotifs(arr.slice(0, 4));
        })
        .catch(() => {}),

      subscriptionAPI
        .getMySubscriptions()
        .then((r) => {
          const arr = r.data?.subscriptions || r.data?.data || [];
          const active = Array.isArray(arr)
            ? arr.filter((s) => s.status === "active").length
            : 0;
          setSubCount(active);
        })
        .catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    Alert.alert(t("more.logout"), t("more.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("more.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const profileLoading = !user;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Page Title ─────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(0)}
          style={styles.pageHeader}
        >
          <Text style={styles.pageTitle}>{t("more.title")}</Text>
          <Text style={styles.pageSubtitle}>{t("more.account")}</Text>
        </Animated.View>

        {/* ── Profile Card ──────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(50)}
          style={styles.section}
        >
          <ProfileCard
            user={user}
            loading={profileLoading}
            onPress={() => router.push("/Screens/profile")}
          />
        </Animated.View>

        {/* ── Wallet Strip ──────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(100)}
          style={styles.section}
        >
          <WalletStrip wallet={wallet} loading={walletLoading} />
        </Animated.View>

        {/* ── Stat chips ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350).delay(130)}>
          <StatChips unreadCount={unreadCount} subCount={subCount} />
        </Animated.View>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        {QUICK_SECTIONS.map((sec, si) => (
          <Animated.View
            key={sec.title}
            entering={FadeInDown.duration(350).delay(160 + si * 50)}
            style={styles.section}
          >
            <SectionHeader title={sec.title} />
            <QuickActionGrid
              items={sec.items}
              onPress={(route) => router.push(route)}
              unreadCount={unreadCount}
            />
          </Animated.View>
        ))}

        {/* ── Recent Notifications ──────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(330)}
          style={styles.section}
        >
          <SectionHeader title={t("notifications.title")} />
          <NotificationPreview
            items={recentNotifs}
            onViewAll={() => router.push("/Screens/notifications")}
          />
        </Animated.View>

        {/* ── Settings ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(380)}
          style={styles.section}
        >
          <SectionHeader title={t("settings.language")} />
          <View style={styles.menuCard}>
            <SettingsToggle
              iconName="notifications-outline"
              label="Push Notifications"
              desc="Receive real-time payment alerts"
              tint="#2563EB"
              value={notifEnabled}
              onChange={(v) => setNotifEnabled(v)}
            />
            <TouchableOpacity
              onPress={() => setLangPickerVisible(true)}
              style={[
                styles.settingsRow,
                { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
              ]}
              activeOpacity={0.75}
            >
              <View
                style={[styles.menuIconWrap, { backgroundColor: "#DBEAFE" }]}
              >
                <Ionicons name="language-outline" size={18} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuLabel}>{t("settings.language")}</Text>
                <Text style={styles.menuDesc}>{t("more.languageDesc")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          <LanguageSwitcher
            visible={langPickerVisible}
            onClose={() => setLangPickerVisible(false)}
          />
        </Animated.View>

        {/* ── Sign Out ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(420)}
          style={styles.section}
        >
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.signOutBtn}
            activeOpacity={0.75}
          >
            <View style={styles.signOutIconWrap}>
              <Ionicons name="log-out-outline" size={19} color="#EF4444" />
            </View>
            <Text style={styles.signOutText}>{t("more.logout")}</Text>
            <Ionicons name="chevron-forward" size={15} color="#FCA5A5" />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Footer ────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(450)}
          style={styles.footer}
        >
          <View style={styles.footerLogoWrap}>
            <Text style={styles.footerLogo}>AfraPay</Text>
          </View>
          <Text style={styles.footerVersion}>
            {t("more.version")} {APP_VERSION}
          </Text>
          <Text style={styles.footerCopy}>
            © 2026 AfraPay · All rights reserved
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 30,
  },

  // ── Page header ──────────────────────────────────────────────
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "500",
  },

  // ── Section spacing ──────────────────────────────────────────
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // ── Profile card ─────────────────────────────────────────────
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "700",
  },

  // ── Wallet strip ─────────────────────────────────────────────
  walletStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  walletLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  walletMeta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    fontWeight: "500",
  },
  walletActions: {
    flexDirection: "row",
    gap: 8,
  },
  walletIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Stat chips ───────────────────────────────────────────────
  statChipsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  statChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },

  // ── Menu card ────────────────────────────────────────────────
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  menuDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // ── Notifications ────────────────────────────────────────────
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notifDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  notifDotUnread: {
    backgroundColor: "#2563EB",
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  notifTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "500",
  },
  emptyNotifWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyNotifText: {
    fontSize: 13,
    color: "#CBD5E1",
    fontWeight: "500",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F1F5F9",
  },
  viewAllBtnText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },

  // ── Settings toggle ──────────────────────────────────────────
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  // ── Sign out ─────────────────────────────────────────────────
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  signOutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  signOutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 28,
    paddingBottom: 90,
    gap: 4,
  },
  footerLogoWrap: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  footerLogo: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  footerVersion: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  footerCopy: {
    fontSize: 11,
    color: "#CBD5E1",
    fontWeight: "500",
  },
});
