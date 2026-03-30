import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  Animated as RNAnimated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../contexts/AuthContext";
import {
  useWallet,
  useTransactions,
  useNotifications,
} from "../../hooks/useData";
import { transactionAPI } from "../../services/api";
import TransactionItem from "../../components/TransactionItem";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    parseFloat(amount || 0),
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Skeleton Pulse ──────────────────────────────────────────────────────────
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

// ─── Wallet Card Skeleton ────────────────────────────────────────────────────
function WalletHeroSkeleton() {
  return (
    <View style={[styles.heroCard, styles.heroCardSkeletonBg]}>
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />
      <View style={{ gap: 14 }}>
        <SkeletonBox style={{ width: 110, height: 26, borderRadius: 13 }} />
        <SkeletonBox style={{ width: 200, height: 42, borderRadius: 10 }} />
        <View style={styles.heroDivider} />
        <View style={{ flexDirection: "row", gap: 28 }}>
          <SkeletonBox style={{ width: 80, height: 14 }} />
          <SkeletonBox style={{ width: 80, height: 14 }} />
        </View>
      </View>
    </View>
  );
}

// ─── Wallet Hero Card ────────────────────────────────────────────────────────
function WalletHeroCard({ walletList, masked, onToggleMask }) {
  const primary = walletList[0];
  const total = walletList.reduce(
    (acc, w) => acc + parseFloat(w?.balance || 0),
    0,
  );

  return (
    <View style={styles.heroCard}>
      {/* Decorative blobs — simulated blue→green gradient */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* Top row: badge + eye toggle */}
      <View style={styles.heroTopRow}>
        <View style={styles.currencyBadge}>
          <Ionicons
            name="wallet-outline"
            size={12}
            color="rgba(255,255,255,0.85)"
            style={{ marginRight: 5 }}
          />
          <Text style={styles.currencyBadgeText}>
            {primary?.currency || "USD"} Wallet
          </Text>
        </View>
        <TouchableOpacity
          onPress={onToggleMask}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={masked ? "eye-off-outline" : "eye-outline"}
            size={19}
            color="rgba(255,255,255,0.75)"
          />
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
      <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
        {masked ? "• • • • • •" : formatCurrency(total, primary?.currency)}
      </Text>

      <View style={styles.heroDivider} />

      {/* Stats row */}
      <View style={styles.heroStatsRow}>
        <View>
          <Text style={styles.heroStatLabel}>Available</Text>
          <Text style={styles.heroStatValue}>
            {masked
              ? "•••"
              : formatCurrency(
                  primary?.availableBalance || primary?.balance,
                  primary?.currency,
                )}
          </Text>
        </View>

        {primary?.lockedBalance !== undefined && (
          <>
            <View style={styles.heroStatSep} />
            <View>
              <Text style={styles.heroStatLabel}>Locked</Text>
              <Text style={styles.heroStatValue}>
                {masked
                  ? "•••"
                  : formatCurrency(primary?.lockedBalance, primary?.currency)}
              </Text>
            </View>
          </>
        )}

        {walletList.length > 1 && (
          <>
            <View style={styles.heroStatSep} />
            <View>
              <Text style={styles.heroStatLabel}>Wallets</Text>
              <Text style={styles.heroStatValue}>{walletList.length}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function ActionButton({ iconName, label, tint, onPress }) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      activeOpacity={0.75}
      style={styles.actionBtn}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={iconName} size={22} color="#fff" />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, iconName, iconColor }) {
  return (
    <View style={styles.statCard}>
      <View
        style={[styles.statIconWrap, { backgroundColor: iconColor + "18" }]}
      >
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: iconColor }]}>{value}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, linkText, onLink }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {linkText && (
        <TouchableOpacity onPress={onLink} activeOpacity={0.7}>
          <Text style={styles.sectionLink}>{linkText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Transaction Skeleton ─────────────────────────────────────────────────────
function TxSkeleton() {
  return (
    <View style={styles.txCard}>
      {[...Array(4)].map((_, i) => (
        <View key={i} style={styles.txSkeletonRow}>
          <SkeletonBox style={{ width: 44, height: 44, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
            <SkeletonBox style={{ width: "55%", height: 12 }} />
            <SkeletonBox style={{ width: "35%", height: 10 }} />
          </View>
          <SkeletonBox style={{ width: 60, height: 14, borderRadius: 7 }} />
        </View>
      ))}
    </View>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    balances,
    loading: walletsLoading,
    refetch: refetchWallets,
  } = useWallet();
  const {
    transactions,
    loading: txLoading,
    refetch: refetchTx,
  } = useTransactions({ limit: 7 });
  const { unreadCount } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [masked, setMasked] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await transactionAPI.getSummary({ period: "month" });
      setSummary(res.data);
    } catch {
      /* summary is optional */
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await Promise.all([refetchWallets(), refetchTx(), fetchSummary()]);
    setRefreshing(false);
  }, [refetchWallets, refetchTx]);

  const firstName = user?.firstName || user?.name?.split(" ")?.[0] || "User";
  const walletList = balances?.wallets || (balances ? [balances] : []);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(380).delay(0)}
          style={styles.headerRow}
        >
          <View>
            <Text style={styles.greetingSub}>{getGreeting()},</Text>
            <Text style={styles.greetingName}>{firstName} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/screens/notifications")}
              style={styles.iconCircle}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#475569"
              />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/screens/profile")}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarText}>
                {(user?.firstName?.[0] || user?.name?.[0] || "U").toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Wallet Hero ─────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(70)}
          style={styles.sectionPad}
        >
          {walletsLoading && !balances ? (
            <WalletHeroSkeleton />
          ) : walletList.length > 0 ? (
            <WalletHeroCard
              walletList={walletList}
              masked={masked}
              onToggleMask={() => setMasked((m) => !m)}
            />
          ) : (
            <View style={[styles.heroCard, styles.heroEmpty]}>
              <Ionicons
                name="wallet-outline"
                size={34}
                color="rgba(255,255,255,0.45)"
              />
              <Text style={styles.heroEmptyText}>No wallet connected</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Quick Actions ──────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(140)}
          style={styles.sectionPad}
        >
          <SectionHeader title="Quick Actions" />
          <View style={styles.actionsRow}>
            <ActionButton
              iconName="paper-plane"
              label="Send"
              tint="#2563EB"
              onPress={() => router.push("/(tabs)/send")}
            />
            <ActionButton
              iconName="add-circle"
              label="Deposit"
              tint="#059669"
              onPress={() =>
                Alert.alert("Coming soon", "Deposit feature coming soon")
              }
            />
            <ActionButton
              iconName="receipt-outline"
              label="Pay Bills"
              tint="#7C3AED"
              onPress={() =>
                Alert.alert("Coming soon", "Bill payments coming soon")
              }
            />
            <ActionButton
              iconName="card-outline"
              label="Cards"
              tint="#D97706"
              onPress={() => router.push("/(tabs)/cards")}
            />
          </View>
        </Animated.View>

        {/* ── Monthly Stats ───────────────────────────────────── */}
        {summary && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(210)}
            style={styles.sectionPad}
          >
            <SectionHeader title="This Month" />
            <View style={styles.statsRow}>
              <StatCard
                label="Sent"
                iconName="arrow-up-circle-outline"
                iconColor="#EF4444"
                value={formatCurrency(summary?.totalSent || summary?.sent || 0)}
              />
              <StatCard
                label="Received"
                iconName="arrow-down-circle-outline"
                iconColor="#10B981"
                value={formatCurrency(
                  summary?.totalReceived || summary?.received || 0,
                )}
              />
              <StatCard
                label="Count"
                iconName="swap-horizontal-outline"
                iconColor="#3B82F6"
                value={`${summary?.count || summary?.total || 0}`}
              />
            </View>
          </Animated.View>
        )}

        {/* ── Recent Activity ─────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(280)}
          style={[styles.sectionPad, { marginBottom: 12 }]}
        >
          <SectionHeader
            title="Recent Activity"
            linkText="See all"
            onLink={() => router.push("/(tabs)/transactions")}
          />

          {txLoading && transactions.length === 0 ? (
            <TxSkeleton />
          ) : transactions.length === 0 ? (
            <View style={styles.txCard}>
              <View style={styles.emptyTxWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={38}
                  color="#CBD5E1"
                />
                <Text style={styles.emptyTxTitle}>No transactions yet</Text>
                <Text style={styles.emptyTxSub}>
                  Your recent activity will appear here
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.txCard}>
              {transactions.slice(0, 7).map((tx, i) => (
                <TransactionItem
                  key={tx._id || tx.id || i}
                  transaction={tx}
                  onPress={(t) => router.push(`/transaction/${t._id || t.id}`)}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BLUE_DEEP = "#1E3A8A";
const GREEN_BLOB = "rgba(16, 185, 129, 0.32)";
const BLUE_BLOB = "rgba(147, 197, 253, 0.18)";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 110,
  },

  // ── Header ──────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  greetingSub: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  notifBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  // ── Section ──────────────────────────────────────────
  sectionPad: {
    paddingHorizontal: 20,
    marginTop: 26,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },

  // ── Hero Wallet Card ──────────────────────────────────
  heroCard: {
    borderRadius: 24,
    backgroundColor: BLUE_DEEP,
    padding: 22,
    overflow: "hidden",
    minHeight: 200,
    justifyContent: "flex-end",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 18,
  },
  heroCardSkeletonBg: {
    justifyContent: "center",
  },
  blobTopLeft: {
    position: "absolute",
    top: -45,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: BLUE_BLOB,
  },
  blobBottomRight: {
    position: "absolute",
    bottom: -55,
    right: -35,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: GREEN_BLOB,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  currencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  currencyBadgeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    marginTop: 18,
    marginBottom: 6,
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 18,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroStatSep: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  heroEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 160,
  },
  heroEmptyText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
  },

  // ── Quick Actions ─────────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  actionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },

  // ── Stats ──────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 5,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ── Transactions ───────────────────────────────────────
  txCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  txSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  emptyTxWrap: {
    alignItems: "center",
    paddingVertical: 42,
    gap: 10,
  },
  emptyTxTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  emptyTxSub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
});
