import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Animated as RNAnimated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { transactionAPI, walletAPI } from "../../services/api";
import TransactionItem from "../../components/TransactionItem";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../utils/formatters";

// ─── Constants ────────────────────────────────────────────────────────────────
const LIMIT = 20;

const TYPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Deposit", value: "deposit" },
  { label: "Transfer", value: "transfer" },
  { label: "Payment", value: "payment" },
  { label: "Withdrawal", value: "withdrawal" },
  { label: "Fee", value: "fee" },
];

const STATUS_FILTERS = [
  { label: "All Status", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

const DATE_RANGES = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "1 Year", value: "1y" },
  { label: "All time", value: "" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateRangeToParams(value) {
  if (!value) return {};
  const daysMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const days = daysMap[value] ?? 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

// ─── Skeleton Pulse ───────────────────────────────────────────────────────────
function SkeletonBox({ style }) {
  const anim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        RNAnimated.timing(anim, {
          toValue: 0,
          duration: 700,
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

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, iconName, iconColor, loading }) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[styles.summaryIconWrap, { backgroundColor: iconColor + "18" }]}
      >
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      {loading ? (
        <SkeletonBox style={{ width: "80%", height: 14, marginTop: 4 }} />
      ) : (
        <Text style={[styles.summaryValue, { color: iconColor }]}>{value}</Text>
      )}
    </View>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, active, onPress, tint = "#2563EB" }) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[
        styles.chip,
        active && { backgroundColor: tint, borderColor: tint },
      ]}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && { color: "#fff" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Filter Row ───────────────────────────────────────────────────────────────
function FilterRow({ items, activeValue, onSelect, tint }) {
  return (
    <FlatList
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.value}
      renderItem={({ item }) => (
        <FilterChip
          label={item.label}
          active={activeValue === item.value}
          onPress={() => onSelect(item.value)}
          tint={tint}
        />
      )}
      contentContainerStyle={styles.filterRowContent}
      style={styles.filterRow}
    />
  );
}

// ─── Transaction Skeleton ─────────────────────────────────────────────────────
function TxSkeletons() {
  return (
    <View style={styles.txCard}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={styles.txSkeletonRow}>
          <SkeletonBox style={{ width: 44, height: 44, borderRadius: 14 }} />
          <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
            <SkeletonBox style={{ width: "55%", height: 12 }} />
            <SkeletonBox style={{ width: "35%", height: 10 }} />
          </View>
          <SkeletonBox style={{ width: 64, height: 14, borderRadius: 7 }} />
        </View>
      ))}
    </View>
  );
}

// ─── TransactionsScreen ───────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const TYPE_FILTERS = [
    { label: t("transactions.all") || "All", value: "all" },
    { label: t("transactions.deposit"), value: "deposit" },
    { label: t("transactions.transfer"), value: "transfer" },
    { label: t("transactions.payment"), value: "payment" },
    { label: t("transactions.withdrawal"), value: "withdrawal" },
    { label: t("transactions.fee"), value: "fee" },
  ];

  const STATUS_FILTERS = [
    { label: t("transactions.allStatuses"), value: "all" },
    { label: t("transactions.completed"), value: "completed" },
    { label: t("transactions.pending"), value: "pending" },
    { label: t("transactions.failed"), value: "failed" },
  ];

  const DATE_RANGES = [
    { label: t("transactions.days7"), value: "7d" },
    { label: t("transactions.days30"), value: "30d" },
    { label: t("transactions.days90"), value: "90d" },
    { label: t("transactions.year1"), value: "1y" },
    { label: t("transactions.allTime"), value: "" },
  ];
  // ── Filter state ──────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Pagination + data ─────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // ── Summary ───────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [totalBalance, setTotalBalance] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Reset page when filters/search change
  useEffect(() => {
    setPage(1);
    setTransactions([]);
    setHasMore(true);
  }, [typeFilter, statusFilter, dateRange, debouncedSearch]);

  // ── Fetch transactions ─────────────────────────────────────────────────────
  const fetchTransactions = useCallback(
    async (targetPage = 1, append = false) => {
      try {
        if (targetPage === 1 && !append) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const params = {
          page: targetPage,
          limit: LIMIT,
          ...dateRangeToParams(dateRange),
          ...(typeFilter !== "all" && { type: typeFilter }),
          ...(statusFilter !== "all" && { status: statusFilter }),
          ...(debouncedSearch && { search: debouncedSearch }),
        };

        const res = await transactionAPI.getTransactions(params);
        const data = res.data;
        const newTxs = data?.transactions || data?.data || [];
        const pag = data?.pagination || {};
        const pages = pag.pages || pag.totalPages || 1;
        const total = pag.total || pag.totalItems || 0;

        setTotalItems(total);
        setHasMore(targetPage < pages);

        if (append) {
          setTransactions((prev) => [...prev, ...newTxs]);
        } else {
          setTransactions(newTxs);
        }
        setPage(targetPage);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load transactions");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [typeFilter, statusFilter, dateRange, debouncedSearch],
  );

  // Initial + filter-change fetch
  useEffect(() => {
    fetchTransactions(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, dateRange, debouncedSearch]);

  // ── Fetch summary once on mount ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setSummaryLoading(true);
        const [walletRes, summaryRes] = await Promise.all([
          walletAPI.getBalances().catch(() => null),
          transactionAPI.getSummary({ period: "month" }).catch(() => null),
        ]);
        const total =
          walletRes?.data?.totalValueUSD ?? walletRes?.data?.balance ?? null;
        setTotalBalance(total);
        setSummary(summaryRes?.data || null);
      } finally {
        setSummaryLoading(false);
      }
    })();
  }, []);

  // ── Pull to refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTransactions([]);
    setPage(1);
    await fetchTransactions(1, false);
  }, [fetchTransactions]);

  // ── Load more (infinite scroll) ────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchTransactions(page + 1, true);
  }, [hasMore, loadingMore, loading, page, fetchTransactions]);

  // ── Clear filters ──────────────────────────────────────────────────────────
  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setDateRange("30d");
    setSearchText("");
  };

  const hasActiveFilters =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    dateRange !== "30d" ||
    debouncedSearch !== "";

  // ─────────────────────────────────────────────────────────────────────────
  // LIST COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────

  const ListHeader = useMemo(
    () => (
      <View>
        {/* ── Page Header ─────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(0)}
          style={styles.pageHeader}
        >
          <View>
            <Text style={styles.pageTitle}>{t("transactions.title")}</Text>
            <Text style={styles.pageSubtitle}>
              {totalItems > 0
                ? t("transactions.totalCount", { count: totalItems })
                : t("transactions.history")}
            </Text>
          </View>
        </Animated.View>

        {/* ── Summary Row ─────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(60)}
          style={styles.summaryRow}
        >
          <SummaryCard
            label={t("transactions.totalBalance")}
            iconName="wallet-outline"
            iconColor="#2563EB"
            loading={summaryLoading}
            value={
              totalBalance !== null ? formatCurrency(totalBalance, "USD") : "—"
            }
          />
          <SummaryCard
            label={t("transactions.monthlyIn")}
            iconName="arrow-down-circle-outline"
            iconColor="#059669"
            loading={summaryLoading}
            value={formatCurrency(
              summary?.incomingAmount ?? summary?.totalReceived ?? 0,
            )}
          />
          <SummaryCard
            label={t("transactions.monthlyOut")}
            iconName="arrow-up-circle-outline"
            iconColor="#EF4444"
            loading={summaryLoading}
            value={formatCurrency(
              summary?.outgoingAmount ?? summary?.totalSent ?? 0,
            )}
          />
        </Animated.View>

        {/* ── Search Bar ──────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(120)}
          style={styles.searchWrap}
        >
          <Ionicons
            name="search-outline"
            size={17}
            color="#94A3B8"
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t("transactions.searchPlaceholder")}
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── Type Filter ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350).delay(160)}>
          <Text style={styles.filterGroupLabel}>{t("transactions.type")}</Text>
          <FilterRow
            items={TYPE_FILTERS}
            activeValue={typeFilter}
            onSelect={setTypeFilter}
            tint="#2563EB"
          />
        </Animated.View>

        {/* ── Status + Date Range ─────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350).delay(200)}>
          <Text style={styles.filterGroupLabel}>
            {t("transactions.status")}
          </Text>
          <FilterRow
            items={STATUS_FILTERS}
            activeValue={statusFilter}
            onSelect={setStatusFilter}
            tint="#059669"
          />
          <Text style={styles.filterGroupLabel}>
            {t("transactions.dateRange")}
          </Text>
          <FilterRow
            items={DATE_RANGES}
            activeValue={dateRange}
            onSelect={setDateRange}
            tint="#7C3AED"
          />
        </Animated.View>

        {/* ── Active filter indicator + clear ─────────────── */}
        {hasActiveFilters && (
          <Animated.View
            entering={FadeInDown.duration(250)}
            style={styles.activeFilterRow}
          >
            <View style={styles.activeFilterDot} />
            <Text style={styles.activeFilterText}>
              {t("transactions.filtersActive")}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>
                {t("transactions.clearAll")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Transactions heading ─────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(240)}
          style={styles.txSectionHeader}
        >
          <Text style={styles.txSectionTitle}>
            {totalItems > 0
              ? t("transactions.txCount", { count: totalItems })
              : t("transactions.title")}
          </Text>
          {loading && transactions.length > 0 && (
            <ActivityIndicator size="small" color="#2563EB" />
          )}
        </Animated.View>
      </View>
    ),
    [
      totalItems,
      totalBalance,
      summary,
      summaryLoading,
      searchText,
      typeFilter,
      statusFilter,
      dateRange,
      hasActiveFilters,
      loading,
      transactions.length,
    ],
  );

  const ListEmpty = useMemo(() => {
    if (loading) return <TxSkeletons />;
    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={44} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>{t("errors.generic")}</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchTransactions(1, false)}
          >
            <Ionicons
              name="refresh-outline"
              size={16}
              color="#2563EB"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.retryBtnText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="document-text-outline" size={44} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>
          {t("transactions.noTransactions")}
        </Text>
        <Text style={styles.emptySub}>
          {hasActiveFilters
            ? t("transactions.adjustFilters")
            : t("transactions.noTransactionsDesc")}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.retryBtn} onPress={clearFilters}>
            <Ionicons
              name="close-circle-outline"
              size={16}
              color="#2563EB"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.retryBtnText}>
              {t("transactions.clearFilters")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, hasActiveFilters]);

  const ListFooter = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 110 }} />;
    return (
      <View style={styles.loadMoreWrap}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.loadMoreText}>{t("transactions.loadingMore")}</Text>
      </View>
    );
  }, [loadingMore]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={transactions}
        keyExtractor={(item, i) => item._id || item.id || String(i)}
        renderItem={({ item }) => (
          <View style={styles.txItemWrap}>
            <TransactionItem
              transaction={item}
              onPress={(tx) => router.push(`/transaction/${tx._id || tx.id}`)}
            />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        style={styles.screen}
        contentContainerStyle={
          transactions.length === 0 ? { flexGrow: 1 } : undefined
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // ── Page header ──────────────────────────────────────
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
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

  // ── Summary cards ─────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 4,
  },
  summaryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ── Search bar ────────────────────────────────────────
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    paddingVertical: 0,
  },

  // ── Filter rows ───────────────────────────────────────
  filterGroupLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  filterRow: {
    flexGrow: 0,
  },
  filterRowContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  // ── Active filters banner ─────────────────────────────
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.12)",
  },
  activeFilterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  activeFilterText: {
    flex: 1,
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },

  // ── Transaction section header ────────────────────────
  txSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  txSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },

  // ── Transaction list container ────────────────────────
  txCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  txItemWrap: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  txSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F8FAFC",
  },

  // ── Empty / error states ──────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
  },
  retryBtnText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 13,
  },

  // ── Load more footer ──────────────────────────────────
  loadMoreWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 90,
  },
  loadMoreText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
