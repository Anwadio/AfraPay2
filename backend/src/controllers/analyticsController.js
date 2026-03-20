/**
 * Analytics Controller
 * Aggregates key financial metrics for the AfraPay analytics dashboard.
 *
 * All queries are strictly scoped to the authenticated user — no cross-user
 * data leakage is possible. The single `getDashboardAnalytics` endpoint
 * fans out all required Appwrite queries in parallel to minimise latency.
 *
 * Endpoint shape returned:
 *   {
 *     summary:           { totalBalance, incomingAmount, outgoingAmount, netSavings, transactionCount, currency }
 *     monthlyTrend:      { labels[6], income[6], expenses[6] }             ← always last 6 calendar months
 *     categories:        { categories[], totalSpent, currency }            ← expense type breakdown
 *     providerBreakdown: [{ provider, count, volume, percentage, color }]  ← by paymentMethod
 *     topTransactions:   [{ id, type, txType, amount, currency, description, date, provider }]
 *     recentTransactions:[{ id, type, status, amount, currency, description, date, provider }]
 *     meta:              { period, generatedAt }
 *   }
 */

const { Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const { appwrite: dbConn } = require("../database/connection");

// Lazily resolve the shared Databases instance at request time (after DB init)
const getDatabases = () => dbConn.getDatabases();

// ── Transaction classification ────────────────────────────────────────────────
const INCOME_TYPES = ["deposit", "refund"];
const EXPENSE_TYPES = ["withdrawal", "transfer", "payment", "fee"];

// ── Provider normalisation ────────────────────────────────────────────────────
// Maps raw paymentMethod values (from transaction documents) → display names
const PROVIDER_LABEL_MAP = {
  mpesa: "M-Pesa",
  m_pesa: "M-Pesa",
  "m-pesa": "M-Pesa",
  mtn: "MTN MoMo",
  mtn_momo: "MTN MoMo",
  "mtn-momo": "MTN MoMo",
  mtn_mobile_money: "MTN MoMo",
  wallet: "Wallet",
  wallet_transfer: "Wallet",
  internal: "Wallet",
  card: "Card",
  stripe: "Card",
  paystack: "Card",
  flutterwave: "Card",
  bank: "Bank Transfer",
  bank_transfer: "Bank Transfer",
};

const PROVIDER_COLORS = {
  "M-Pesa": "#10b981",
  "MTN MoMo": "#f59e0b",
  Wallet: "#6366f1",
  Card: "#3b82f6",
  "Bank Transfer": "#8b5cf6",
  Other: "#64748b",
};

const CATEGORY_LABELS = {
  payment: "Payments",
  transfer: "Transfers",
  withdrawal: "Withdrawals",
  fee: "Fees",
  deposit: "Deposits",
  refund: "Refunds",
};

const CATEGORY_COLORS = {
  Payments: "#3b82f6",
  Transfers: "#8b5cf6",
  Withdrawals: "#f59e0b",
  Fees: "#64748b",
  Deposits: "#10b981",
  Refunds: "#ec4899",
};

// ── Helper: normalise a raw paymentMethod string → display label ──────────────
function resolveProvider(rawMethod) {
  if (!rawMethod) return "Wallet";
  const key = String(rawMethod).toLowerCase().replace(/[\s-]/g, "_");
  return PROVIDER_LABEL_MAP[key] || "Other";
}

class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard?period=month&currency=USD
   * Returns all data required to render the analytics dashboard in a single round-trip.
   */
  async getDashboardAnalytics(req, res) {
    try {
      const { user } = req;
      const { period = "month", currency } = req.query;

      const dateRange = this._calcDateRange(period);
      const sixMonthMeta = this._calcSixMonthMeta();

      // Fan-out all Appwrite queries concurrently — dramatically reduces wall-clock time
      const [
        summary,
        monthlyTrend,
        categoryResult,
        topTransactions,
        recentTransactions,
      ] = await Promise.all([
        this._calcSummary(user.id, dateRange.start, dateRange.end, currency),
        this._calcMonthlyTrend(user.id, sixMonthMeta.months),
        this._calcCategoryAndProviderBreakdown(
          user.id,
          dateRange.start,
          dateRange.end,
          currency,
        ),
        this._calcTopTransactions(user.id, dateRange.start, dateRange.end, 5),
        this._calcRecentTransactions(user.id, 5),
      ]);

      res.success(
        {
          summary,
          monthlyTrend,
          categories: categoryResult.categories,
          categoryTotalSpent: categoryResult.totalSpent,
          providerBreakdown: categoryResult.providerBreakdown,
          topTransactions,
          recentTransactions,
          meta: {
            period,
            generatedAt: new Date().toISOString(),
          },
        },
        "Dashboard analytics retrieved successfully",
      );
    } catch (error) {
      logger.error("Get dashboard analytics failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Paginate through ALL matching documents.
   * Appwrite caps a single listDocuments call at 100 results; this helper
   * keeps fetching until no more pages are available.
   *
   * @param {string[]} baseQueries  - Appwrite Query expressions (no limit/offset)
   * @param {string[]} [selectFields] - Optional Query.select() field list
   * @returns {Promise<object[]>}
   */
  async _fetchAll(baseQueries, selectFields) {
    const databases = getDatabases();
    const databaseId = config.database.appwrite.databaseId;
    const collectionId = config.database.appwrite.transactionsCollectionId;

    const docs = [];
    let offset = 0;
    const batchSize = 100;

    while (true) {
      const pageQueries = [
        ...baseQueries,
        Query.limit(batchSize),
        Query.offset(offset),
      ];
      if (selectFields?.length) {
        pageQueries.push(Query.select(selectFields));
      }

      const result = await databases.listDocuments(
        databaseId,
        collectionId,
        pageQueries,
      );
      docs.push(...result.documents);
      offset += result.documents.length;
      // Stop when we get fewer results than the batch size (last page)
      if (result.documents.length < batchSize) break;
    }

    return docs;
  }

  /** Resolve the start/end Date pair for a named period relative to now */
  _calcDateRange(period) {
    const now = new Date();
    let start;

    switch (period) {
      case "day":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case "month":
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end: now };
  }

  /**
   * Build an ordered array of the last 6 calendar months.
   * Each entry carries: { label: "Mar", start: Date, end: Date }
   */
  _calcSixMonthMeta() {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const last = new Date(
        first.getFullYear(),
        first.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      months.push({
        label: first.toLocaleString("en-US", { month: "short" }),
        start: first,
        end: last,
      });
    }

    return { months };
  }

  /**
   * Compute the financial summary for a given date range.
   * - Period totals: incoming, outgoing, net savings, transaction count
   * - All-time balance: running net across all completed transactions
   */
  async _calcSummary(userId, startDate, endDate, currency) {
    const periodBase = [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
      Query.greaterThanEqual("$createdAt", startDate.toISOString()),
      Query.lessThanEqual("$createdAt", endDate.toISOString()),
    ];
    if (currency) periodBase.push(Query.equal("currency", currency));

    const allTimeBase = [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
    ];
    if (currency) allTimeBase.push(Query.equal("currency", currency));

    // Run period and all-time queries in parallel
    const [periodTxns, allTimeTxns] = await Promise.all([
      this._fetchAll(periodBase, [
        "$id",
        "type",
        "amount",
        "currency",
        "status",
      ]),
      this._fetchAll(allTimeBase, [
        "$id",
        "type",
        "amount",
        "currency",
        "status",
      ]),
    ]);

    // Aggregate period totals
    let incomingAmount = 0;
    let outgoingAmount = 0;

    for (const t of periodTxns) {
      const amt = t.amount || 0;
      if (INCOME_TYPES.includes(t.type)) incomingAmount += amt;
      else if (EXPENSE_TYPES.includes(t.type)) outgoingAmount += amt;
    }

    // Compute all-time running net balance
    let totalBalance = 0;
    for (const t of allTimeTxns) {
      const amt = t.amount || 0;
      if (INCOME_TYPES.includes(t.type)) totalBalance += amt;
      else if (EXPENSE_TYPES.includes(t.type)) totalBalance -= amt;
    }

    return {
      totalBalance: Math.max(0, Math.round(totalBalance * 100) / 100),
      incomingAmount: Math.round(incomingAmount * 100) / 100,
      outgoingAmount: Math.round(outgoingAmount * 100) / 100,
      netSavings: Math.round((incomingAmount - outgoingAmount) * 100) / 100,
      transactionCount: periodTxns.length,
      currency: currency || "USD",
    };
  }

  /**
   * Build the 6-month income/expenses time series.
   * Strategy: fetch the entire 6-month window in one paginated query then
   * bucket in-memory — far cheaper than 6 individual Appwrite queries.
   */
  async _calcMonthlyTrend(userId, months) {
    const windowStart = months[0].start;
    const windowEnd = months[months.length - 1].end;

    const docs = await this._fetchAll(
      [
        Query.equal("userId", userId),
        Query.equal("status", "completed"),
        Query.greaterThanEqual("$createdAt", windowStart.toISOString()),
        Query.lessThanEqual("$createdAt", windowEnd.toISOString()),
      ],
      ["$id", "type", "amount", "$createdAt"],
    );

    // Pre-build label → bucket map (preserves insertion/month order)
    const buckets = new Map(
      months.map((m) => [
        m.label,
        { income: 0, expenses: 0, start: m.start, end: m.end },
      ]),
    );

    // Assign each transaction to its matching month bucket
    for (const doc of docs) {
      const created = new Date(doc.$createdAt);
      for (const [label, bucket] of buckets) {
        if (created >= bucket.start && created <= bucket.end) {
          const amt = doc.amount || 0;
          if (INCOME_TYPES.includes(doc.type)) bucket.income += amt;
          else if (EXPENSE_TYPES.includes(doc.type)) bucket.expenses += amt;
          break;
        }
      }
    }

    const labels = [...buckets.keys()];
    return {
      labels,
      income: labels.map((l) => Math.round(buckets.get(l).income * 100) / 100),
      expenses: labels.map(
        (l) => Math.round(buckets.get(l).expenses * 100) / 100,
      ),
    };
  }

  /**
   * Compute spending-by-category AND payment-provider breakdown together.
   * Both use the same underlying transaction set — fetch once, aggregate twice.
   */
  async _calcCategoryAndProviderBreakdown(
    userId,
    startDate,
    endDate,
    currency,
  ) {
    const queries = [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
      Query.greaterThanEqual("$createdAt", startDate.toISOString()),
      Query.lessThanEqual("$createdAt", endDate.toISOString()),
    ];
    if (currency) queries.push(Query.equal("currency", currency));

    const docs = await this._fetchAll(queries, [
      "$id",
      "type",
      "amount",
      "paymentMethod",
    ]);

    // ── Category breakdown (expense types only) ────────────────────────────
    const categoryTotals = {};
    let totalSpent = 0;

    // ── Provider breakdown (all transaction types) ─────────────────────────
    const providerTotals = {};
    let totalProviderVol = 0;

    for (const doc of docs) {
      const amt = doc.amount || 0;

      // Category: only count expense-side transactions
      if (EXPENSE_TYPES.includes(doc.type)) {
        const catName = CATEGORY_LABELS[doc.type] || doc.type;
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amt;
        totalSpent += amt;
      }

      // Provider: count every transaction
      const provider = resolveProvider(doc.paymentMethod);
      if (!providerTotals[provider])
        providerTotals[provider] = { count: 0, volume: 0 };
      providerTotals[provider].count += 1;
      providerTotals[provider].volume += amt;
      totalProviderVol += amt;
    }

    const categories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
        percentage:
          totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0,
        color: CATEGORY_COLORS[name] || "#64748b",
      }))
      .sort((a, b) => b.amount - a.amount);

    const providerBreakdown = Object.entries(providerTotals)
      .map(([provider, { count, volume }]) => ({
        provider,
        count,
        volume: Math.round(volume * 100) / 100,
        percentage:
          totalProviderVol > 0
            ? Math.round((volume / totalProviderVol) * 1000) / 10
            : 0,
        color: PROVIDER_COLORS[provider] || "#64748b",
      }))
      .sort((a, b) => b.volume - a.volume);

    return {
      categories,
      totalSpent: Math.round(totalSpent * 100) / 100,
      providerBreakdown,
    };
  }

  /**
   * Return the `limit` highest-value transactions within the date range.
   * Appwrite does not support ORDER BY amount natively, so we fetch the
   * entire date-range window and sort in-memory.
   */
  async _calcTopTransactions(userId, startDate, endDate, limit = 5) {
    const docs = await this._fetchAll(
      [
        Query.equal("userId", userId),
        Query.equal("status", "completed"),
        Query.greaterThanEqual("$createdAt", startDate.toISOString()),
        Query.lessThanEqual("$createdAt", endDate.toISOString()),
      ],
      [
        "$id",
        "type",
        "amount",
        "currency",
        "description",
        "$createdAt",
        "paymentMethod",
      ],
    );

    return docs
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, limit)
      .map((doc) => ({
        id: doc.$id,
        type: INCOME_TYPES.includes(doc.type) ? "credit" : "debit",
        txType: doc.type,
        amount: doc.amount || 0,
        currency: doc.currency || "USD",
        description: doc.description || doc.type,
        date: new Date(doc.$createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        provider: resolveProvider(doc.paymentMethod),
      }));
  }

  /**
   * Return the `limit` most recent transactions (any status).
   * Used for the Recent Activity section.
   */
  async _calcRecentTransactions(userId, limit = 5) {
    const databases = getDatabases();
    const databaseId = config.database.appwrite.databaseId;
    const collectionId = config.database.appwrite.transactionsCollectionId;

    const result = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.select([
        "$id",
        "type",
        "amount",
        "currency",
        "description",
        "$createdAt",
        "status",
        "paymentMethod",
      ]),
    ]);

    return result.documents.map((doc) => ({
      id: doc.$id,
      type: INCOME_TYPES.includes(doc.type) ? "credit" : "debit",
      txType: doc.type,
      amount: doc.amount || 0,
      currency: doc.currency || "USD",
      description: doc.description || doc.type,
      status: doc.status,
      date: new Date(doc.$createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      provider: resolveProvider(doc.paymentMethod),
    }));
  }
}

module.exports = new AnalyticsController();
