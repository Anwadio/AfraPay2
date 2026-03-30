/**
 * Admin Analytics Service
 *
 * Provides platform-wide aggregation for the admin BI dashboard.
 * All queries are admin-scoped — no per-user isolation.
 *
 * Supports:
 *   - Overview KPIs  (users, transactions, revenue, merchants, payouts)
 *   - Revenue        (time-series + source breakdown)
 *   - Transactions   (volume timeline, status ratios, payment-method mix)
 *   - Cohorts        (user retention by first-transaction month)
 *   - Forecasting    (linear regression on recent daily revenue)
 *   - Top Merchants  (by transaction volume)
 *
 * Heavy aggregations page through Appwrite in 100-doc batches.
 * Results are optionally cached in Redis (5-min TTL).
 */

"use strict";

const { Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  appwrite: dbConn,
  redis: redisConn,
} = require("../database/connection");

// ── DB helpers ────────────────────────────────────────────────────────────────

const getDatabases = () => dbConn.getDatabases();
const getUsers = () => dbConn.getUsers();

const DB_ID = config.database.appwrite.databaseId;

// Collection IDs (gracefully fallback to "" so all guards work)
const COLLECTIONS = {
  transactions: config.collections.transactionsId || "",
  wallets: config.collections.walletsId || "",
  merchants: config.collections.merchantsId || "",
  payouts: config.database.appwrite.payoutsCollectionId || "",
  subscriptions: config.database.appwrite.subscriptionsCollectionId || "",
  billingHistory: config.database.appwrite.billingHistoryCollectionId || "",
};

// ── Domain constants ──────────────────────────────────────────────────────────

const PROVIDER_SOURCE_MAP = {
  mpesa: "Mobile Money",
  m_pesa: "Mobile Money",
  "m-pesa": "Mobile Money",
  mtn: "Mobile Money",
  mtn_momo: "Mobile Money",
  mtn_mobile_money: "Mobile Money",
  card: "Card",
  stripe: "Card",
  paystack: "Card",
  flutterwave: "Card",
  wallet: "Wallet",
  wallet_transfer: "Wallet",
  internal: "Wallet",
  bank: "Bank Transfer",
  bank_transfer: "Bank Transfer",
};

// Transaction types counted as platform revenue
const REVENUE_TYPES = new Set(["payment", "deposit", "fee"]);

// ── Low-level Appwrite utilities ──────────────────────────────────────────────

/**
 * Paginate through ALL documents in a collection matching the given queries.
 * Returns an empty array if the collection ID is blank.
 */
async function fetchAll(collectionId, queries = [], selectFields = []) {
  if (!collectionId) return [];
  const databases = getDatabases();
  const docs = [];
  let offset = 0;
  const PAGE = 100;

  while (true) {
    const q = [...queries, Query.limit(PAGE), Query.offset(offset)];
    if (selectFields.length) q.push(Query.select(selectFields));

    let result;
    try {
      result = await databases.listDocuments(DB_ID, collectionId, q);
    } catch (err) {
      logger.warn(
        `analyticsService.fetchAll failed for ${collectionId}: ${err.message}`,
      );
      break;
    }

    docs.push(...result.documents);
    offset += result.documents.length;
    if (result.documents.length < PAGE) break;
  }

  return docs;
}

/**
 * Returns just the `.total` count without fetching any documents.
 * Returns 0 on any error.
 */
async function countDocs(collectionId, queries = []) {
  if (!collectionId) return 0;
  try {
    const databases = getDatabases();
    const result = await databases.listDocuments(DB_ID, collectionId, [
      ...queries,
      Query.limit(1),
      Query.offset(0),
    ]);
    return result.total;
  } catch {
    return 0;
  }
}

// ── Redis caching helper ──────────────────────────────────────────────────────

async function cacheGet(key) {
  try {
    const client = redisConn.getClient();
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    const client = redisConn.getClient();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Redis optional — cache miss is acceptable
  }
}

// ── Bucketing / grouping utilities ────────────────────────────────────────────

/**
 * Return a bucket key string for an ISO timestamp based on granularity.
 *   day   → "YYYY-MM-DD"
 *   week  → "YYYY-MM-DD" (Monday of the week)
 *   month → "YYYY-MM"
 */
function bucketKey(isoString, granularity) {
  const d = new Date(isoString);
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "week") {
    const day = d.getDay() || 7; // Sunday → 7
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

/**
 * Generate all bucket label strings between startDate and endDate
 * inclusive, for the given granularity.
 */
function buildBucketLabels(startDate, endDate, granularity) {
  const labels = [];
  const cursor = new Date(startDate);

  if (granularity === "month") {
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      labels.push(cursor.toISOString().slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (granularity === "week") {
    const day = cursor.getDay() || 7;
    cursor.setDate(cursor.getDate() - day + 1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      labels.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    // day
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      labels.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return labels;
}

function resolveSource(rawMethod) {
  if (!rawMethod) return "Wallet";
  const key = String(rawMethod).toLowerCase().replace(/[\s-]/g, "_");
  return PROVIDER_SOURCE_MAP[key] || "Other";
}

// ── Simple linear regression  ─────────────────────────────────────────────────

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Service Class
// ─────────────────────────────────────────────────────────────────────────────

class AnalyticsService {
  /**
   * Parse and normalise the date-range / granularity parameters
   * coming from the HTTP query string.
   *
   * @param {object} params  - { period, startDate, endDate, granularity }
   * @returns {{ start: Date, end: Date, granularity: string }}
   */
  parseDateRange(params = {}) {
    const { period = "month", startDate, endDate, granularity } = params;

    let start, end;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      end = now;
      switch (period) {
        case "day":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          start = new Date(now.getFullYear(), 0, 1);
          break;
        case "month":
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    // Auto-select granularity based on range if not supplied
    const rangeDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let gran = granularity;
    if (!gran) {
      if (rangeDays <= 14) gran = "day";
      else if (rangeDays <= 90) gran = "week";
      else gran = "month";
    }

    return { start, end, granularity: gran };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. OVERVIEW
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Platform-wide KPI snapshot.
   *
   * Returns:
   *   totalUsers, newUsersInPeriod, totalTransactions,
   *   completedTransactions, totalRevenue (currency-normalised to primary),
   *   totalMerchants, activeMerchants, totalPayouts, payoutVolume
   */
  async getOverview(filters = {}) {
    const { start, end } = this.parseDateRange(filters);
    const { currency } = filters;

    const cacheKey = `admin:analytics:overview:${start.toISOString()}:${end.toISOString()}:${currency || "all"}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const periodTxnQueries = [
      Query.greaterThanEqual("$createdAt", startISO),
      Query.lessThanEqual("$createdAt", endISO),
    ];
    if (currency) periodTxnQueries.push(Query.equal("currency", currency));

    const [
      totalTxns,
      periodTxnDocs,
      totalMerchants,
      activeMerchants,
      periodPayouts,
      usersResult,
      periodNewUsers,
    ] = await Promise.all([
      countDocs(COLLECTIONS.transactions),
      fetchAll(
        COLLECTIONS.transactions,
        [...periodTxnQueries],
        ["$id", "type", "amount", "currency", "status", "paymentMethod"],
      ),
      countDocs(COLLECTIONS.merchants),
      countDocs(COLLECTIONS.merchants, [Query.equal("status", "active")]),
      fetchAll(
        COLLECTIONS.payouts,
        [...periodTxnQueries, Query.equal("status", "completed")],
        ["$id", "amount", "currency"],
      ),
      this._getUsersTotal(),
      this._getNewUsersInPeriod(startISO, endISO),
    ]);

    // Aggregate revenue and transaction metrics from the period docs
    let totalRevenue = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const txn of periodTxnDocs) {
      if (txn.status === "completed") {
        completedCount++;
        if (REVENUE_TYPES.has(txn.type)) {
          totalRevenue += txn.amount || 0;
        }
      } else if (txn.status === "failed") {
        failedCount++;
      }
    }

    const payoutVolume = periodPayouts.reduce((s, p) => s + (p.amount || 0), 0);

    const result = {
      totalUsers: usersResult,
      newUsersInPeriod: periodNewUsers,
      totalTransactions: totalTxns,
      periodTransactions: periodTxnDocs.length,
      completedTransactions: completedCount,
      failedTransactions: failedCount,
      successRate:
        periodTxnDocs.length > 0
          ? Math.round((completedCount / periodTxnDocs.length) * 10000) / 100
          : 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalMerchants,
      activeMerchants,
      payoutCount: periodPayouts.length,
      payoutVolume: Math.round(payoutVolume * 100) / 100,
      currency: currency || "USD",
      period: {
        start: startISO,
        end: endISO,
      },
      generatedAt: new Date().toISOString(),
    };

    await cacheSet(cacheKey, result, 300);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. REVENUE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Revenue over time (bucketed) + breakdown by payment source.
   *
   * Returns:
   *   timeline: [{ label, revenue, transactions }]   — one point per bucket
   *   bySource: [{ source, revenue, count, share }]  — payment method breakdown
   *   totals:   { revenue, transactions, avgPerTxn }
   */
  async getRevenue(filters = {}) {
    const { start, end, granularity } = this.parseDateRange(filters);
    const { currency } = filters;

    const cacheKey = `admin:analytics:revenue:${start.toISOString()}:${end.toISOString()}:${granularity}:${currency || "all"}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const queries = [
      Query.equal("status", "completed"),
      Query.greaterThanEqual("$createdAt", start.toISOString()),
      Query.lessThanEqual("$createdAt", end.toISOString()),
    ];
    if (currency) queries.push(Query.equal("currency", currency));

    const [txnDocs, billingDocs] = await Promise.all([
      fetchAll(COLLECTIONS.transactions, queries, [
        "$id",
        "type",
        "amount",
        "currency",
        "paymentMethod",
        "$createdAt",
      ]),
      COLLECTIONS.billingHistory
        ? fetchAll(
            COLLECTIONS.billingHistory,
            [
              Query.equal("status", "paid"),
              Query.greaterThanEqual("$createdAt", start.toISOString()),
              Query.lessThanEqual("$createdAt", end.toISOString()),
            ],
            ["$id", "amount", "currency", "$createdAt"],
          )
        : Promise.resolve([]),
    ]);

    // Build timeline buckets
    const bucketLabels = buildBucketLabels(start, end, granularity);
    const timelineMap = new Map(
      bucketLabels.map((l) => [l, { label: l, revenue: 0, transactions: 0 }]),
    );

    // Source aggregation
    const sourceMap = new Map();

    for (const txn of txnDocs) {
      if (!REVENUE_TYPES.has(txn.type)) continue;

      const amt = txn.amount || 0;
      const bk = bucketKey(txn.$createdAt, granularity);
      const bucket = timelineMap.get(bk);
      if (bucket) {
        bucket.revenue += amt;
        bucket.transactions++;
      }

      const source = resolveSource(txn.paymentMethod);
      const existing = sourceMap.get(source) || {
        source,
        revenue: 0,
        count: 0,
      };
      existing.revenue += amt;
      existing.count++;
      sourceMap.set(source, existing);
    }

    // Add subscription billing as revenue
    for (const bill of billingDocs) {
      const amt = bill.amount || 0;
      const bk = bucketKey(bill.$createdAt, granularity);
      const bucket = timelineMap.get(bk);
      if (bucket) {
        bucket.revenue += amt;
        bucket.transactions++;
      }

      const source = "Subscription";
      const existing = sourceMap.get(source) || {
        source,
        revenue: 0,
        count: 0,
      };
      existing.revenue += amt;
      existing.count++;
      sourceMap.set(source, existing);
    }

    const timeline = [...timelineMap.values()].map((b) => ({
      ...b,
      revenue: Math.round(b.revenue * 100) / 100,
    }));

    const totalRevenue = timeline.reduce((s, b) => s + b.revenue, 0);
    const totalTxns = timeline.reduce((s, b) => s + b.transactions, 0);

    const bySource = [...sourceMap.values()]
      .map((s) => ({
        ...s,
        revenue: Math.round(s.revenue * 100) / 100,
        share:
          totalRevenue > 0
            ? Math.round((s.revenue / totalRevenue) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const result = {
      timeline,
      bySource,
      totals: {
        revenue: Math.round(totalRevenue * 100) / 100,
        transactions: totalTxns,
        avgPerTxn:
          totalTxns > 0
            ? Math.round((totalRevenue / totalTxns) * 100) / 100
            : 0,
      },
      granularity,
      currency: currency || "USD",
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };

    await cacheSet(cacheKey, result, 300);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. TRANSACTION ANALYTICS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Transaction volume, status distribution, and payment-method breakdown.
   *
   * Returns:
   *   timeline:   [{ label, total, completed, failed }]
   *   statusDist: { completed, failed, pending, processing, cancelled }
   *   methods:    [{ method, count, volume, share }]
   *   topMerchants: [{ merchantId, name, txnCount, volume }]
   */
  async getTransactions(filters = {}) {
    const { start, end, granularity } = this.parseDateRange(filters);
    const { currency, type } = filters;

    const cacheKey = `admin:analytics:txns:${start.toISOString()}:${end.toISOString()}:${granularity}:${currency || "all"}:${type || "all"}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const queries = [
      Query.greaterThanEqual("$createdAt", start.toISOString()),
      Query.lessThanEqual("$createdAt", end.toISOString()),
    ];
    if (currency) queries.push(Query.equal("currency", currency));
    if (type) queries.push(Query.equal("type", type));

    const docs = await fetchAll(COLLECTIONS.transactions, queries, [
      "$id",
      "type",
      "amount",
      "currency",
      "status",
      "paymentMethod",
      "merchantId",
      "$createdAt",
    ]);

    // Timeline bucketed counts
    const bucketLabels = buildBucketLabels(start, end, granularity);
    const timelineMap = new Map(
      bucketLabels.map((l) => [
        l,
        { label: l, total: 0, completed: 0, failed: 0 },
      ]),
    );

    // Status distribution
    const statusDist = {
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      cancelled: 0,
    };

    // Payment method breakdown
    const methodMap = new Map();

    // Merchant aggregation
    const merchantMap = new Map();

    for (const doc of docs) {
      const bk = bucketKey(doc.$createdAt, granularity);
      const bucket = timelineMap.get(bk);
      if (bucket) {
        bucket.total++;
        if (doc.status === "completed") bucket.completed++;
        if (doc.status === "failed") bucket.failed++;
      }

      const st = doc.status || "pending";
      if (st in statusDist) statusDist[st]++;

      const method = resolveSource(doc.paymentMethod);
      const existing = methodMap.get(method) || { method, count: 0, volume: 0 };
      existing.count++;
      existing.volume += doc.amount || 0;
      methodMap.set(method, existing);

      if (doc.merchantId) {
        const m = merchantMap.get(doc.merchantId) || {
          merchantId: doc.merchantId,
          txnCount: 0,
          volume: 0,
        };
        m.txnCount++;
        m.volume += doc.amount || 0;
        merchantMap.set(doc.merchantId, m);
      }
    }

    const totalCount = docs.length;
    const methods = [...methodMap.values()]
      .map((m) => ({
        ...m,
        volume: Math.round(m.volume * 100) / 100,
        share:
          totalCount > 0 ? Math.round((m.count / totalCount) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Enrich top-10 merchants with names from merchants collection
    const topMerchantEntries = [...merchantMap.values()]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    const topMerchants = await this._enrichMerchants(topMerchantEntries);

    const result = {
      timeline: [...timelineMap.values()],
      statusDist,
      methods,
      topMerchants,
      totals: {
        total: totalCount,
        completed: statusDist.completed,
        failed: statusDist.failed,
        successRate:
          totalCount > 0
            ? Math.round((statusDist.completed / totalCount) * 10000) / 100
            : 0,
      },
      granularity,
      currency: currency || "USD",
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };

    await cacheSet(cacheKey, result, 300);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 4. COHORT ANALYSIS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * User retention cohort analysis.
   *
   * Strategy:
   *   - "First transaction month" defines the cohort (month 0).
   *   - Subsequent months show what % of that cohort was still active.
   *   - Active = had at least one completed transaction that month.
   *
   * Returns:
   *   cohorts: [
   *     {
   *       cohortMonth: "2025-10",
   *       size: 48,
   *       retention: [100, 62, 41, 35, 28, 22]  (month 0..5, as %)
   *     }
   *   ]
   *   maxPeriods: 6
   */
  async getCohorts(filters = {}) {
    const cohortMonths = Math.min(parseInt(filters.months || 6, 10), 12);

    const cacheKey = `admin:analytics:cohorts:${cohortMonths}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    // We look back (cohortMonths + cohortMonths) of data to allow activity tracking
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth() - (cohortMonths * 2 - 1),
      1,
    );
    const windowEnd = now;

    // Fetch only completed transactions in the window
    const docs = await fetchAll(
      COLLECTIONS.transactions,
      [
        Query.equal("status", "completed"),
        Query.greaterThanEqual("$createdAt", windowStart.toISOString()),
        Query.lessThanEqual("$createdAt", windowEnd.toISOString()),
      ],
      ["userId", "$createdAt"],
    );

    // Build per-user activity month sets
    // firstMonth[userId] = "YYYY-MM" of their first transaction
    // activityMonths[userId] = Set of "YYYY-MM" they were active
    const firstMonth = new Map();
    const activityMonths = new Map();

    for (const doc of docs) {
      if (!doc.userId) continue;
      const month = doc.$createdAt.slice(0, 7);

      const cur = firstMonth.get(doc.userId);
      if (!cur || month < cur) firstMonth.set(doc.userId, month);

      if (!activityMonths.has(doc.userId))
        activityMonths.set(doc.userId, new Set());
      activityMonths.get(doc.userId).add(month);
    }

    // Build the cohort months list (oldest first, last cohortMonths months)
    const cohortMonthLabels = [];
    for (let i = cohortMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cohortMonthLabels.push(d.toISOString().slice(0, 7));
    }

    const cohorts = cohortMonthLabels.map((cohortLabel) => {
      // Collect users whose first transaction was in this cohort month
      const cohortUsers = [...firstMonth.entries()]
        .filter(([, m]) => m === cohortLabel)
        .map(([userId]) => userId);

      const size = cohortUsers.length;
      if (size === 0) {
        return {
          cohortMonth: cohortLabel,
          size: 0,
          retention: Array(cohortMonths).fill(0),
        };
      }

      // For each subsequent month (period 0 = cohort month itself), calc retention %
      const retention = [];
      for (let period = 0; period < cohortMonths; period++) {
        const [y, m] = cohortLabel.split("-").map(Number);
        const checkDate = new Date(y, m - 1 + period, 1);
        // Don't compute future periods
        if (checkDate > windowEnd) {
          retention.push(null);
          continue;
        }
        const checkMonth = checkDate.toISOString().slice(0, 7);
        const activeCount = cohortUsers.filter((uid) =>
          activityMonths.get(uid)?.has(checkMonth),
        ).length;
        retention.push(Math.round((activeCount / size) * 100));
      }

      return { cohortMonth: cohortLabel, size, retention };
    });

    const result = {
      cohorts,
      maxPeriods: cohortMonths,
      generatedAt: new Date().toISOString(),
    };

    await cacheSet(cacheKey, result, 600);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. FORECASTING
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Revenue forecast using linear regression on the last 90 days of daily revenue.
   *
   * Returns:
   *   historical:  [{ date: "YYYY-MM-DD", revenue }]  — last 90 days
   *   forecast:    [{ date: "YYYY-MM-DD", revenue }]  — next 30 days
   *   model:       { slope, intercept, r2 }            — regression quality
   */
  async getForecast(filters = {}) {
    const { currency } = filters;

    const cacheKey = `admin:analytics:forecast:${currency || "all"}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const queries = [
      Query.equal("status", "completed"),
      Query.greaterThanEqual("$createdAt", start.toISOString()),
      Query.lessThanEqual("$createdAt", now.toISOString()),
    ];
    if (currency) queries.push(Query.equal("currency", currency));

    const docs = await fetchAll(COLLECTIONS.transactions, queries, [
      "$id",
      "type",
      "amount",
      "$createdAt",
    ]);

    // Build daily revenue map
    const dailyMap = new Map();
    for (const doc of docs) {
      if (!REVENUE_TYPES.has(doc.type)) continue;
      const day = doc.$createdAt.slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + (doc.amount || 0));
    }

    // Fill all days in range
    const allDays = buildBucketLabels(start, now, "day");
    const historical = allDays.map((d) => ({
      date: d,
      revenue: Math.round((dailyMap.get(d) || 0) * 100) / 100,
    }));

    // Regression: x = sequential day index, y = revenue
    const points = historical.map((h, i) => ({ x: i, y: h.revenue }));
    const { slope, intercept } = linearRegression(points);

    // R² (coefficient of determination)
    const yMean = points.reduce((s, p) => s + p.y, 0) / points.length;
    const ssTot = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
    const ssRes = points.reduce(
      (s, p) => s + (p.y - (intercept + slope * p.x)) ** 2,
      0,
    );
    const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

    // Project next 30 days
    const forecast = [];
    const baseIdx = historical.length;
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i + 1);
      const projected = Math.max(0, intercept + slope * (baseIdx + i));
      forecast.push({
        date: date.toISOString().slice(0, 10),
        revenue: Math.round(projected * 100) / 100,
      });
    }

    const result = {
      historical,
      forecast,
      model: {
        slope: Math.round(slope * 10000) / 10000,
        intercept: Math.round(intercept * 100) / 100,
        r2: Math.round(r2 * 10000) / 10000,
        confidence: r2 > 0.7 ? "high" : r2 > 0.4 ? "medium" : "low",
      },
      currency: currency || "USD",
    };

    await cacheSet(cacheKey, result, 600);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────────────

  async _getUsersTotal() {
    try {
      const usersApi = getUsers();
      const result = await usersApi.list([Query.limit(1)]);
      return result.total;
    } catch {
      return 0;
    }
  }

  async _getNewUsersInPeriod(startISO, endISO) {
    try {
      const usersApi = getUsers();
      const result = await usersApi.list([
        Query.greaterThanEqual("$createdAt", startISO),
        Query.lessThanEqual("$createdAt", endISO),
        Query.limit(1),
      ]);
      return result.total;
    } catch {
      return 0;
    }
  }

  /**
   * Enrich a list of { merchantId, ... } objects with merchant names
   * from the merchants collection.
   */
  async _enrichMerchants(entries) {
    if (!entries.length || !COLLECTIONS.merchants) return entries;

    try {
      const databases = getDatabases();
      const ids = entries.map((e) => e.merchantId).filter(Boolean);

      // Batch lookup
      const results = await Promise.allSettled(
        ids.map((id) =>
          databases.getDocument(DB_ID, COLLECTIONS.merchants, id),
        ),
      );

      const nameMap = new Map();
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "fulfilled") {
          const doc = results[i].value;
          nameMap.set(
            doc.$id,
            doc.businessName || doc.name || doc.email || doc.$id,
          );
        }
      }

      return entries.map((e) => ({
        ...e,
        name: nameMap.get(e.merchantId) || e.merchantId,
        volume: Math.round(e.volume * 100) / 100,
      }));
    } catch {
      return entries.map((e) => ({
        ...e,
        name: e.merchantId,
        volume: Math.round((e.volume || 0) * 100) / 100,
      }));
    }
  }
}

module.exports = new AnalyticsService();
