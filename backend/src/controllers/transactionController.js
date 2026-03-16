/**
 * Transaction Controller
 * Handles transaction history, analytics, and reporting
 */

const { Client, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
} = require("../middleware/monitoring/errorHandler");
const { appwrite: dbConn } = require("../database/connection");

// Lazily resolve the shared Databases instance at request time (after DB init)
const getDatabases = () => dbConn.getDatabases();

class TransactionController {
  /**
   * Get user's transaction history
   */
  async getTransactions(req, res) {
    try {
      const { user } = req;
      const {
        page = 1,
        limit = 20,
        type,
        status,
        currency,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
      } = req.query;

      const queries = [
        Query.equal("userId", user.id),
        Query.orderDesc("$createdAt"),
      ];

      if (type) queries.push(Query.equal("type", type));
      if (status) queries.push(Query.equal("status", status));
      if (currency) queries.push(Query.equal("currency", currency));
      if (startDate)
        queries.push(Query.greaterThanEqual("$createdAt", startDate));
      if (endDate) queries.push(Query.lessThanEqual("$createdAt", endDate));
      if (minAmount)
        queries.push(Query.greaterThanEqual("amount", parseFloat(minAmount)));
      if (maxAmount)
        queries.push(Query.lessThanEqual("amount", parseFloat(maxAmount)));
      if (search) queries.push(Query.search("description", search));
      queries.push(Query.limit(parseInt(limit)));
      queries.push(Query.offset((parseInt(page) - 1) * parseInt(limit)));
      // Only fetch fields needed for the list view â€” reduces payload size
      queries.push(
        Query.select([
          "$id",
          "type",
          "amount",
          "currency",
          "description",
          "status",
          "reference",
          "counterparty",
          "createdAt",
          "updatedAt",
          "completedAt",
        ]),
      );

      const transactions = await getDatabases().listDocuments(
        config.database.appwrite.databaseId,
        config.database.appwrite.transactionsCollectionId,
        queries,
      );

      const transactionList = transactions.documents.map((transaction) => ({
        id: transaction.$id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        status: transaction.status,
        reference: transaction.reference,
        counterparty: transaction.counterparty,
        $createdAt: transaction.$createdAt,
        $updatedAt: transaction.$updatedAt,
        completedAt: transaction.completedAt,
      }));

      const totalPages = Math.ceil(transactions.total / parseInt(limit));

      res.paginated(
        transactionList,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: transactions.total,
          totalPages,
        },
        "Transactions retrieved successfully",
      );
    } catch (error) {
      logger.error("Get transactions failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(req, res) {
    try {
      const { user } = req;
      const { transactionId } = req.params;

      const transaction = await getDatabases().getDocument(
        config.database.appwrite.databaseId,
        config.database.appwrite.transactionsCollectionId,
        transactionId,
      );

      // Check if user has access to this transaction
      if (transaction.userId !== user.id) {
        throw new NotFoundError("Transaction");
      }

      const transactionDetails = {
        id: transaction.$id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        status: transaction.status,
        reference: transaction.reference,
        counterparty: transaction.counterparty,
        fees: transaction.fees,
        exchangeRate: transaction.exchangeRate,
        metadata: transaction.metadata
          ? JSON.parse(transaction.metadata)
          : null,
        processorTransactionId: transaction.processorTransactionId,
        $createdAt: transaction.$createdAt,
        $updatedAt: transaction.$updatedAt,
        completedAt: transaction.completedAt,
      };

      res.success(
        transactionDetails,
        "Transaction details retrieved successfully",
      );
    } catch (error) {
      logger.error("Get transaction failed", {
        userId: req.user?.id,
        transactionId: req.params.transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(req, res) {
    try {
      const { user } = req;
      const { transactionId } = req.params;

      const transaction = await getDatabases().getDocument(
        config.database.appwrite.databaseId,
        config.database.appwrite.transactionsCollectionId,
        transactionId,
      );

      if (transaction.userId !== user.id) {
        throw new NotFoundError("Transaction");
      }

      // Generate receipt data
      // req.user only carries id/email/role from the JWT — fetch the display name from DB
      let userName = req.user.email; // safe fallback always available
      try {
        const profile = await getDatabases().getDocument(
          config.database.appwrite.databaseId,
          config.database.appwrite.userCollectionId,
          user.id,
        );
        if (profile.firstName || profile.lastName) {
          userName =
            `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
        }
      } catch {
        // Non-fatal — fall back to email
      }

      const receipt = {
        receiptId: `RCP_${transaction.$id.slice(-8).toUpperCase()}`,
        transactionId: transaction.$id,
        transactionReference: transaction.reference,
        date: transaction.completedAt || transaction.createdAt,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        status: transaction.status,
        fees: transaction.fees || 0,
        counterparty: transaction.counterparty,
        paymentMethod: transaction.paymentMethod,
        user: {
          name: userName,
          email: req.user.email || "",
        },
      };

      res.success(receipt, "Receipt generated successfully");
    } catch (error) {
      logger.error("Get transaction receipt failed", {
        userId: req.user?.id,
        transactionId: req.params.transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get transaction summary analytics
   */
  async getTransactionSummary(req, res) {
    try {
      const { user } = req;
      const { period = "month", startDate, endDate, currency } = req.query;

      // Calculate date range based on period
      const dateRange = this.calculateDateRange(period, startDate, endDate);

      // Get transaction analytics
      const summary = await this.calculateTransactionSummary(
        user.id,
        dateRange.start,
        dateRange.end,
        currency,
      );

      res.success(summary, "Transaction summary retrieved successfully");
    } catch (error) {
      logger.error("Get transaction summary failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get transaction trends
   */
  async getTransactionTrends(req, res) {
    try {
      const { user } = req;
      const { period = "month", startDate, endDate, currency } = req.query;

      const dateRange = this.calculateDateRange(period, startDate, endDate);

      // Get transaction trends data
      const trends = await this.calculateTransactionTrends(
        user.id,
        dateRange.start,
        dateRange.end,
        currency,
        period,
      );

      res.success(trends, "Transaction trends retrieved successfully");
    } catch (error) {
      logger.error("Get transaction trends failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get spending by categories
   */
  async getSpendingByCategory(req, res) {
    try {
      const { user } = req;
      const { period = "month", startDate, endDate, currency } = req.query;

      const dateRange = this.calculateDateRange(period, startDate, endDate);

      // Calculate spending by categories
      const categorySpending = await this.calculateSpendingByCategory(
        user.id,
        dateRange.start,
        dateRange.end,
        currency,
      );

      res.success(categorySpending, "Category spending retrieved successfully");
    } catch (error) {
      logger.error("Get spending by category failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export transactions
   */
  async exportTransactions(req, res) {
    try {
      const { user } = req;
      const { format, startDate, endDate, type, status } = req.query;

      // Get transactions to export — use proper Query builders and the correct collection ID
      const exportQueries = [
        Query.equal("userId", user.id),
        Query.orderDesc("$createdAt"),
        Query.limit(250), // Bounded export limit; large data should use paginated streaming
      ];
      if (type) exportQueries.push(Query.equal("type", type));
      if (status) exportQueries.push(Query.equal("status", status));
      if (startDate)
        exportQueries.push(Query.greaterThanEqual("$createdAt", startDate));
      if (endDate)
        exportQueries.push(Query.lessThanEqual("$createdAt", endDate));

      const transactions = await getDatabases().listDocuments(
        config.database.appwrite.databaseId,
        config.database.appwrite.transactionsCollectionId,
        exportQueries,
      );

      // Generate export based on format
      let exportData;
      switch (format) {
        case "csv":
          exportData = this.generateCSVExport(transactions.documents);
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=transactions.csv",
          );
          break;
        case "pdf":
          exportData = await this.generatePDFExport(
            transactions.documents,
            user,
          );
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=transactions.pdf",
          );
          break;
        case "xlsx":
          exportData = this.generateXLSXExport(transactions.documents);
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=transactions.xlsx",
          );
          break;
        default:
          throw new ValidationError("Unsupported export format");
      }

      logger.audit("TRANSACTIONS_EXPORTED", user.id, {
        format,
        transactionCount: transactions.documents.length,
        startDate,
        endDate,
        ip: req.ip,
      });

      res.send(exportData);
    } catch (error) {
      logger.error("Export transactions failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create transaction dispute
   */
  async createDispute(req, res) {
    try {
      const { user } = req;
      const { transactionId } = req.params;
      const { reason, description, evidence } = req.body;

      // Get transaction — use correct collection ID
      const transaction = await getDatabases().getDocument(
        config.database.appwrite.databaseId,
        config.database.appwrite.transactionsCollectionId,
        transactionId,
      );

      // Ownership check: transfers store the owner as senderId; other types use userId
      const isOwner =
        transaction.userId === user.id || transaction.senderId === user.id;
      if (!isOwner) {
        throw new NotFoundError("Transaction");
      }

      // Check if dispute already exists — use Query builders
      const existingDisputes = await getDatabases().listDocuments(
        config.database.appwrite.databaseId,
        config.database.appwrite.disputesCollectionId,
        [
          Query.equal("transactionId", transactionId),
          Query.notEqual("status", "resolved"),
          Query.limit(1),
        ],
      );

      if (existingDisputes.total > 0) {
        throw new ConflictError(
          "A dispute already exists for this transaction",
        );
      }

      // Create dispute — use correct collection ID
      const disputeId = ID.unique();
      const dispute = await getDatabases().createDocument(
        config.database.appwrite.databaseId,
        config.database.appwrite.disputesCollectionId,
        disputeId,
        {
          userId: user.id,
          transactionId,
          reason,
          description,
          evidence: evidence ? JSON.stringify(evidence) : null,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      logger.audit("DISPUTE_CREATED", user.id, {
        disputeId,
        transactionId,
        reason,
        ip: req.ip,
      });

      res.created(
        {
          disputeId,
          transactionId,
          reason,
          status: "pending",
          createdAt: dispute.createdAt,
        },
        "Dispute created successfully",
      );
    } catch (error) {
      logger.error("Create dispute failed", {
        userId: req.user?.id,
        transactionId: req.params.transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  // Helper methods

  calculateDateRange(period, startDate, endDate) {
    const now = new Date();

    if (startDate && endDate) {
      // Cap endDate to now so callers cannot request unbounded future ranges
      const end = new Date(endDate);
      return {
        start: new Date(startDate),
        end: end > now ? now : end,
      };
    }

    let start;

    switch (period) {
      case "day":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end: now };
  }

  async calculateTransactionSummary(userId, startDate, endDate, currency) {
    const databases = getDatabases();
    const databaseId = config.database.appwrite.databaseId;
    const collectionId = config.database.appwrite.transactionsCollectionId;

    const INCOME_TYPES = ["deposit", "refund"];
    const EXPENSE_TYPES = ["withdrawal", "transfer", "payment", "fee"];

    // Paginate through ALL matching documents (handles >100 rows)
    const fetchAll = async (baseQueries) => {
      const docs = [];
      let offset = 0;
      const batchSize = 100;
      while (true) {
        const result = await databases.listDocuments(databaseId, collectionId, [
          ...baseQueries,
          Query.limit(batchSize),
          Query.offset(offset),
          Query.select(["$id", "type", "amount", "currency", "status"]),
        ]);
        docs.push(...result.documents);
        offset += result.documents.length;
        if (result.documents.length < batchSize) break;
      }
      return docs;
    };

    // Period queries — all completed transactions in the requested date range
    const periodBase = [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
      Query.greaterThanEqual("$createdAt", startDate.toISOString()),
      Query.lessThanEqual("$createdAt", endDate.toISOString()),
    ];
    if (currency) periodBase.push(Query.equal("currency", currency));

    // All-time queries — for total balance calculation
    const allTimeBase = [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
    ];
    if (currency) allTimeBase.push(Query.equal("currency", currency));

    const [periodTxns, allTimeTxns] = await Promise.all([
      fetchAll(periodBase),
      fetchAll(allTimeBase),
    ]);

    // Compute period totals
    let incomingAmount = 0;
    let outgoingAmount = 0;
    const byType = {
      deposit: 0,
      withdrawal: 0,
      transfer: 0,
      payment: 0,
      refund: 0,
      fee: 0,
    };

    for (const t of periodTxns) {
      const amt = t.amount || 0;
      if (INCOME_TYPES.includes(t.type)) incomingAmount += amt;
      else if (EXPENSE_TYPES.includes(t.type)) outgoingAmount += amt;
      if (t.type in byType) byType[t.type]++;
    }

    // Compute all-time net balance
    let totalBalance = 0;
    for (const t of allTimeTxns) {
      const amt = t.amount || 0;
      if (INCOME_TYPES.includes(t.type)) totalBalance += amt;
      else if (EXPENSE_TYPES.includes(t.type)) totalBalance -= amt;
    }

    return {
      totalBalance: Math.max(0, totalBalance),
      totalTransactions: periodTxns.length,
      incomingAmount,
      outgoingAmount,
      netSavings: incomingAmount - outgoingAmount,
      currency: currency || "USD",
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      transactionsByType: byType,
    };
  }

  async calculateTransactionTrends(
    userId,
    startDate,
    endDate,
    currency,
    period,
  ) {
    const databases = getDatabases();
    const databaseId = config.database.appwrite.databaseId;
    const collectionId = config.database.appwrite.transactionsCollectionId;

    const INCOME_TYPES = ["deposit", "refund"];
    const EXPENSE_TYPES = ["withdrawal", "transfer", "payment", "fee"];

    // Fetch all completed transactions in the date range
    const allDocs = [];
    let offset = 0;
    const batchSize = 100;
    const baseQueries = [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
      Query.greaterThanEqual("$createdAt", startDate.toISOString()),
      Query.lessThanEqual("$createdAt", endDate.toISOString()),
    ];
    if (currency) baseQueries.push(Query.equal("currency", currency));

    while (true) {
      const result = await databases.listDocuments(databaseId, collectionId, [
        ...baseQueries,
        Query.limit(batchSize),
        Query.offset(offset),
        Query.select(["$id", "type", "amount", "$createdAt"]),
      ]);
      allDocs.push(...result.documents);
      offset += result.documents.length;
      if (result.documents.length < batchSize) break;
    }

    // Determine bucket format based on period
    const getBucket = (dateStr) => {
      const d = new Date(dateStr);
      if (period === "day") {
        return (
          d.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }) +
          ":00"
        );
      } else if (period === "week") {
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      } else if (period === "year") {
        return d.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      } else {
        // month / quarter — bucket by day
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    };

    // Build ordered label list across the date range
    const bucketMap = new Map(); // label -> { income, expenses }
    const now = endDate;
    const cursor = new Date(startDate);

    const step =
      period === "day"
        ? 60 * 60 * 1000 // hourly
        : period === "week"
          ? 24 * 60 * 60 * 1000 // daily
          : period === "year"
            ? 30 * 24 * 60 * 60 * 1000 // monthly (approx)
            : 24 * 60 * 60 * 1000; // daily for month/quarter

    while (cursor <= now) {
      const label = getBucket(cursor.toISOString());
      if (!bucketMap.has(label))
        bucketMap.set(label, { income: 0, expenses: 0 });
      cursor.setTime(cursor.getTime() + step);
    }

    // Aggregate transactions into buckets
    for (const doc of allDocs) {
      const label = getBucket(doc.$createdAt);
      if (!bucketMap.has(label))
        bucketMap.set(label, { income: 0, expenses: 0 });
      const bucket = bucketMap.get(label);
      const amt = doc.amount || 0;
      if (INCOME_TYPES.includes(doc.type)) bucket.income += amt;
      else if (EXPENSE_TYPES.includes(doc.type)) bucket.expenses += amt;
    }

    const labels = [...bucketMap.keys()];
    const incomeData = labels.map((l) => bucketMap.get(l).income);
    const expensesData = labels.map((l) => bucketMap.get(l).expenses);

    return {
      labels,
      datasets: [
        { label: "Income", data: incomeData },
        { label: "Expenses", data: expensesData },
      ],
      currency: currency || "USD",
    };
  }

  async calculateSpendingByCategory(userId, startDate, endDate, currency) {
    const databases = getDatabases();
    const databaseId = config.database.appwrite.databaseId;
    const collectionId = config.database.appwrite.transactionsCollectionId;

    // Expense-type transactions only
    const EXPENSE_TYPES = ["withdrawal", "transfer", "payment", "fee"];

    const baseQueries = [
      Query.equal("userId", userId),
      Query.equal("status", "completed"),
      Query.greaterThanEqual("$createdAt", startDate.toISOString()),
      Query.lessThanEqual("$createdAt", endDate.toISOString()),
    ];
    if (currency) baseQueries.push(Query.equal("currency", currency));

    // Fetch all expense transactions
    const allDocs = [];
    let offset = 0;
    const batchSize = 100;
    while (true) {
      const result = await databases.listDocuments(databaseId, collectionId, [
        ...baseQueries,
        Query.limit(batchSize),
        Query.offset(offset),
        Query.select(["$id", "type", "amount"]),
      ]);
      // Only keep expense types
      allDocs.push(
        ...result.documents.filter((d) => EXPENSE_TYPES.includes(d.type)),
      );
      offset += result.documents.length;
      if (result.documents.length < batchSize) break;
    }

    // Group by type (used as category)
    const CATEGORY_LABELS = {
      payment: "Payments",
      transfer: "Transfers",
      withdrawal: "Withdrawals",
      fee: "Fees",
    };

    const totals = {};
    let totalSpent = 0;
    for (const doc of allDocs) {
      const key = doc.type;
      totals[key] = (totals[key] || 0) + (doc.amount || 0);
      totalSpent += doc.amount || 0;
    }

    const categories = Object.entries(totals).map(([type, amount]) => ({
      name: CATEGORY_LABELS[type] || type,
      amount: Math.round(amount * 100) / 100,
      percentage:
        totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0,
    }));

    // Sort descending by amount
    categories.sort((a, b) => b.amount - a.amount);

    return {
      categories,
      totalSpent: Math.round(totalSpent * 100) / 100,
      currency: currency || "USD",
    };
  }

  generateCSVExport(transactions) {
    // TODO: Implement CSV generation
    let csv = "Date,Type,Amount,Currency,Description,Status\n";
    transactions.forEach((t) => {
      csv += `${t.createdAt},${t.type},${t.amount},${t.currency},"${t.description}",${t.status}\n`;
    });
    return csv;
  }

  async generatePDFExport(transactions, user) {
    // TODO: Implement PDF generation using a library like PDFKit
    return Buffer.from("PDF content placeholder");
  }

  generateXLSXExport(transactions) {
    // TODO: Implement Excel export using a library like exceljs
    return Buffer.from("Excel content placeholder");
  }
}

module.exports = new TransactionController();
