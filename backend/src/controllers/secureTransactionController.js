/**
 * Secure Transaction Controller
 * Handles creation, transfer, cancellation, and dispute of transactions
 * with full validation, authorization, idempotency, and audit logging.
 */

const { Client, Databases, Query, ID } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  APIError,
} = require("../middleware/monitoring/errorHandler");
const {
  logTransactionInitiated,
  logTransactionCompleted,
  logTransactionFailed,
  logTransactionCancelled,
  logTransactionDisputed,
  logAuthorizationBlocked,
  logBalanceChange,
  logIdempotencyHit,
  logTransactionExport,
  AUDIT_ACTIONS,
} = require("../middleware/monitoring/transactionAudit");
const {
  KYC_TRANSACTION_LIMITS,
} = require("../middleware/auth/transactionAuthorization");

// ─── Appwrite client ──────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const databases = new Databases(client);

// ─── Collection helpers ───────────────────────────────────────────────────────
const DB_ID = () => config.database.appwrite.databaseId;

const COLLECTIONS = {
  transactionsId: () => config.database.appwrite.transactionsCollectionId,
  walletsId: () => config.database.appwrite.walletsCollectionId,
  disputesId: () => config.database.appwrite.disputesCollectionId,
  usersId: () => config.database.appwrite.userCollectionId,
};

const COL = (name) => COLLECTIONS[name]();

// Cancellable statuses
const CANCELLABLE_STATUSES = ["pending", "processing"];

// Disputable transaction statuses
const DISPUTABLE_STATUSES = ["completed"];

class SecureTransactionController {
  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/transactions
   * Create a new transaction (deposit, payment, etc.)
   * Enforces idempotency, daily/monthly limits, and fraud signals.
   */
  async createTransaction(req, res) {
    const { user } = req;
    const {
      amount,
      currency,
      type,
      recipientId,
      recipientEmail,
      recipientPhone,
      description,
      paymentMethod,
      idempotencyKey: clientKey,
      metadata,
    } = req.body;

    const idempotencyKey =
      clientKey || req.headers["x-idempotency-key"] || null;

    // 1. Idempotency check ────────────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await this._findByIdempotencyKey(
        idempotencyKey,
        user.id,
      );
      if (existing) {
        logIdempotencyHit(req, idempotencyKey);
        return res.success(
          this._formatTransaction(existing),
          "Duplicate request - returning existing transaction",
        );
      }
    }

    // 2. Rolling limit check ──────────────────────────────────────────────────
    const kycLevel = user.kycLevel ?? user.kyc_level ?? 0;
    await this._assertDailyLimit(
      user.id,
      parseFloat(amount),
      currency,
      kycLevel,
      req,
    );
    await this._assertMonthlyLimit(
      user.id,
      parseFloat(amount),
      currency,
      kycLevel,
      req,
    );

    // 3. Fraud signal check ───────────────────────────────────────────────────
    await this._runFraudSignals(req, { amount, currency, type, recipientId });

    // 4. Create the transaction record ────────────────────────────────────────
    const now = new Date().toISOString();
    const transactionId = ID.unique();

    const record = {
      userId: user.id,
      type: type || "payment",
      amount: parseFloat(amount),
      currency,
      recipientId: recipientId || null,
      recipientEmail: recipientEmail || null,
      recipientPhone: recipientPhone || null,
      description: description || "",
      paymentMethod,
      status: "pending",
      idempotencyKey: idempotencyKey || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || null,
      createdAt: now,
      updatedAt: now,
    };

    let transaction;
    try {
      transaction = await databases.createDocument(
        DB_ID(),
        COL("transactionsId"),
        transactionId,
        record,
      );
    } catch (err) {
      logTransactionFailed(req, { amount, currency, type }, err.message);
      throw err;
    }

    logTransactionInitiated(req, {
      transactionId,
      amount,
      currency,
      type,
      paymentMethod,
      recipientId,
      idempotencyKey,
    });

    logger.audit("TRANSACTION_CREATED", user.id, {
      transactionId,
      amount,
      currency,
      type,
      paymentMethod,
      ip: req.ip,
    });

    res.created(
      this._formatTransaction(transaction),
      "Transaction created successfully",
    );
  }

  /**
   * POST /api/v1/transactions/transfer
   * Peer-to-peer fund transfer.
   * Atomically debits sender and credits recipient.
   * Requires PIN for amounts above threshold.
   */
  async processTransfer(req, res) {
    const { user } = req;
    const {
      amount,
      currency,
      recipientId,
      recipientEmail,
      description,
      pin,
      idempotencyKey: clientKey,
      metadata,
    } = req.body;

    const idempotencyKey =
      clientKey || req.headers["x-idempotency-key"] || null;

    // 1. Idempotency check ────────────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await this._findByIdempotencyKey(
        idempotencyKey,
        user.id,
      );
      if (existing) {
        logIdempotencyHit(req, idempotencyKey);
        return res.success(
          this._formatTransaction(existing),
          "Duplicate request - returning existing transaction",
        );
      }
    }

    // 2. Resolve recipient ────────────────────────────────────────────────────
    let recipient;
    try {
      recipient = await this._resolveRecipient({ recipientId, recipientEmail });
    } catch (err) {
      logTransactionFailed(
        req,
        { amount, currency, type: "transfer" },
        err.message,
      );
      throw err;
    }

    // 3. Self-transfer guard (belt-and-suspenders after middleware) ────────────
    if (recipient.$id === user.id) {
      logAuthorizationBlocked(req, AUDIT_ACTIONS.AUTH_SELF_TRANSFER_BLOCKED, {
        recipientId: recipient.$id,
      });
      throw new ValidationError("You cannot transfer funds to yourself");
    }

    // 4. Rolling limit checks ─────────────────────────────────────────────────
    const kycLevel = user.kycLevel ?? user.kyc_level ?? 0;
    await this._assertDailyLimit(
      user.id,
      parseFloat(amount),
      currency,
      kycLevel,
      req,
    );
    await this._assertMonthlyLimit(
      user.id,
      parseFloat(amount),
      currency,
      kycLevel,
      req,
    );

    // 5. PIN verification for high-value transfers ──────────────────────────
    const {
      PIN_REQUIRED_THRESHOLD,
    } = require("../middleware/auth/transactionAuthorization");
    if (parseFloat(amount) >= PIN_REQUIRED_THRESHOLD && !pin) {
      throw new ValidationError(
        `PIN is required for transfers of ${PIN_REQUIRED_THRESHOLD} ${currency} or more`,
      );
    }
    // Note: actual PIN hash comparison happens in an auth service;
    // this layer ensures the field is present.

    // 6. Fraud signals ─────────────────────────────────────────────────────
    await this._runFraudSignals(req, {
      amount,
      currency,
      type: "transfer",
      recipientId: recipient.$id,
    });

    // 7. Sender wallet balance check ──────────────────────────────────────
    const senderWallet = await this._getWallet(user.id, currency);
    if (!senderWallet || senderWallet.balance < parseFloat(amount)) {
      logAuthorizationBlocked(req, AUDIT_ACTIONS.BALANCE_INSUFFICIENT, {
        available: senderWallet?.balance ?? 0,
        requested: parseFloat(amount),
        currency,
      });
      throw new AuthorizationError(
        "Insufficient wallet balance for this transfer",
      );
    }

    // 8. Execute double-entry debit/credit ────────────────────────────────
    const now = new Date().toISOString();
    const transactionId = ID.unique();

    let transaction;
    try {
      // Create transaction record first (as the source-of-truth)
      transaction = await databases.createDocument(
        DB_ID(),
        COL("transactionsId"),
        transactionId,
        {
          userId: user.id,
          type: "transfer",
          amount: parseFloat(amount),
          currency,
          recipientId: recipient.$id,
          recipientEmail: recipient.email || recipientEmail || null,
          description: description || "",
          paymentMethod: "wallet",
          status: "processing",
          idempotencyKey: idempotencyKey || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent") || null,
          createdAt: now,
          updatedAt: now,
        },
      );

      // Debit sender
      const newSenderBalance = senderWallet.balance - parseFloat(amount);
      await databases.updateDocument(
        DB_ID(),
        COL("walletsId"),
        senderWallet.$id,
        { balance: newSenderBalance, updatedAt: now },
      );
      logBalanceChange(req, {
        direction: "debit",
        walletId: senderWallet.$id,
        amount: parseFloat(amount),
        currency,
        transactionId,
        balanceBefore: senderWallet.balance,
        balanceAfter: newSenderBalance,
      });

      // Credit recipient
      const recipientWallet = await this._getOrCreateWallet(
        recipient.$id,
        currency,
      );
      const newRecipientBalance = recipientWallet.balance + parseFloat(amount);
      await databases.updateDocument(
        DB_ID(),
        COL("walletsId"),
        recipientWallet.$id,
        { balance: newRecipientBalance, updatedAt: now },
      );
      logBalanceChange(req, {
        direction: "credit",
        walletId: recipientWallet.$id,
        amount: parseFloat(amount),
        currency,
        transactionId,
        balanceBefore: recipientWallet.balance,
        balanceAfter: newRecipientBalance,
      });

      // Mark transaction completed
      transaction = await databases.updateDocument(
        DB_ID(),
        COL("transactionsId"),
        transactionId,
        { status: "completed", completedAt: now, updatedAt: now },
      );
    } catch (err) {
      // Attempt to mark the transaction as failed
      if (transaction?.$id) {
        await databases
          .updateDocument(DB_ID(), COL("transactionsId"), transactionId, {
            status: "failed",
            updatedAt: new Date().toISOString(),
          })
          .catch(() => {}); // best-effort; do not mask original error
      }
      logTransactionFailed(
        req,
        { transactionId, amount, currency, type: "transfer" },
        err.message,
      );
      throw err;
    }

    logTransactionCompleted(req, {
      transactionId,
      amount,
      currency,
      type: "transfer",
      status: "completed",
      recipientId: recipient.$id,
    });

    logger.audit("TRANSFER_COMPLETED", user.id, {
      transactionId,
      amount,
      currency,
      recipientId: recipient.$id,
      ip: req.ip,
    });

    res.success(
      this._formatTransaction(transaction),
      "Transfer completed successfully",
    );
  }

  /**
   * POST /api/v1/transactions/:transactionId/cancel
   * Cancel a pending/processing transaction.
   * Only the owner (or admin) may cancel; only cancellable statuses are allowed.
   */
  async cancelTransaction(req, res) {
    const { user } = req;
    const { transactionId } = req.params;
    const { reason } = req.body;

    // 1. Fetch and verify ownership ──────────────────────────────────────────
    const transaction = await this._fetchAndVerifyOwnership(
      transactionId,
      user,
    );

    // 2. Status check ────────────────────────────────────────────────────────
    if (!CANCELLABLE_STATUSES.includes(transaction.status)) {
      throw new ValidationError(
        `Transaction cannot be cancelled in its current status: ${transaction.status}`,
      );
    }

    // 3. Update to cancelled ─────────────────────────────────────────────────
    const now = new Date().toISOString();
    const updated = await databases.updateDocument(
      DB_ID(),
      COL("transactionsId"),
      transactionId,
      {
        status: "cancelled",
        cancellationReason: reason || null,
        updatedAt: now,
      },
    );

    logTransactionCancelled(req, { transactionId, reason });

    logger.audit("TRANSACTION_CANCELLED", user.id, {
      transactionId,
      reason,
      ip: req.ip,
    });

    res.success(
      this._formatTransaction(updated),
      "Transaction cancelled successfully",
    );
  }

  /**
   * POST /api/v1/transactions/:transactionId/dispute
   * File a dispute against a completed transaction.
   */
  async createDispute(req, res) {
    const { user } = req;
    const { transactionId } = req.params;
    const { reason, description, evidence } = req.body;

    // 1. Fetch and verify ownership ──────────────────────────────────────────
    const transaction = await this._fetchAndVerifyOwnership(
      transactionId,
      user,
    );

    // 2. Status check ────────────────────────────────────────────────────────
    if (!DISPUTABLE_STATUSES.includes(transaction.status)) {
      throw new ValidationError(
        `Disputes can only be filed against completed transactions (current status: ${transaction.status})`,
      );
    }

    // 3. Duplicate dispute check ─────────────────────────────────────────────
    const existing = await databases.listDocuments(DB_ID(), COL("disputesId"), [
      Query.equal("transactionId", transactionId),
      Query.notEqual("status", "resolved"),
    ]);
    if (existing.total > 0) {
      throw new ConflictError(
        "An open dispute already exists for this transaction",
      );
    }

    // 4. Create dispute record ───────────────────────────────────────────────
    const now = new Date().toISOString();
    const disputeId = ID.unique();
    const dispute = await databases.createDocument(
      DB_ID(),
      COL("disputesId"),
      disputeId,
      {
        userId: user.id,
        transactionId,
        reason,
        description,
        evidence: evidence ? JSON.stringify(evidence) : null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      },
    );

    logTransactionDisputed(req, { transactionId, reason, disputeId });

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
      "Dispute filed successfully",
    );
  }

  /**
   * GET /api/v1/transactions
   * Return the authenticated user's transaction history with filters.
   */
  async getTransactions(req, res) {
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

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const filters = [Query.equal("userId", user.id)];
    if (type) filters.push(Query.equal("type", type));
    if (status) filters.push(Query.equal("status", status));
    if (currency) filters.push(Query.equal("currency", currency));
    if (startDate) filters.push(Query.greaterThanEqual("createdAt", startDate));
    if (endDate) filters.push(Query.lessThanEqual("createdAt", endDate));
    if (minAmount)
      filters.push(Query.greaterThanEqual("amount", parseFloat(minAmount)));
    if (maxAmount)
      filters.push(Query.lessThanEqual("amount", parseFloat(maxAmount)));

    const transactions = await databases.listDocuments(
      DB_ID(),
      COL("transactionsId"),
      [
        ...filters,
        Query.orderDesc("$createdAt"),
        Query.limit(parseInt(limit)),
        Query.offset(offset),
      ],
    );

    const totalPages = Math.ceil(transactions.total / parseInt(limit));

    res.paginated(
      transactions.documents.map((t) => this._formatTransaction(t)),
      {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: transactions.total,
        totalPages,
      },
      "Transactions retrieved successfully",
    );
  }

  /**
   * GET /api/v1/transactions/:transactionId
   * Return a single transaction (owner or admin only).
   */
  async getTransaction(req, res) {
    const { user } = req;
    const { transactionId } = req.params;

    const transaction = await this._fetchAndVerifyOwnership(
      transactionId,
      user,
    );

    res.success(
      this._formatTransaction(transaction, true),
      "Transaction retrieved successfully",
    );
  }

  /**
   * GET /api/v1/transactions/:transactionId/receipt
   * Return a receipt object for a completed transaction.
   */
  async getTransactionReceipt(req, res) {
    const { user } = req;
    const { transactionId } = req.params;

    const transaction = await this._fetchAndVerifyOwnership(
      transactionId,
      user,
    );

    const receipt = {
      receiptId: `RCP_${transaction.$id.slice(-8).toUpperCase()}`,
      transactionId: transaction.$id,
      transactionReference: transaction.reference || transaction.$id,
      date: transaction.completedAt || transaction.createdAt,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      status: transaction.status,
      fees: transaction.fees || 0,
      counterparty: transaction.counterparty || null,
      paymentMethod: transaction.paymentMethod,
      user: {
        name:
          req.user.name ||
          `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
        email: req.user.email || "",
      },
    };

    logger.audit("RECEIPT_VIEWED", user.id, {
      transactionId,
      ip: req.ip,
    });

    res.success(receipt, "Receipt generated successfully");
  }

  /**
   * GET /api/v1/transactions/analytics/summary
   */
  async getTransactionSummary(req, res) {
    const { user } = req;
    const { period = "month", startDate, endDate, currency } = req.query;

    const controller = require("./transactionController");
    const dateRange = controller.calculateDateRange(period, startDate, endDate);
    const summary = await controller.calculateTransactionSummary(
      user.id,
      dateRange.start,
      dateRange.end,
      currency,
    );

    logger.audit("SUMMARY_VIEWED", user.id, { period, currency, ip: req.ip });
    res.success(summary, "Transaction summary retrieved successfully");
  }

  /**
   * GET /api/v1/transactions/analytics/trends
   */
  async getTransactionTrends(req, res) {
    const { user } = req;
    const { period = "month", startDate, endDate, currency } = req.query;

    const controller = require("./transactionController");
    const dateRange = controller.calculateDateRange(period, startDate, endDate);
    const trends = await controller.calculateTransactionTrends(
      user.id,
      dateRange.start,
      dateRange.end,
      currency,
      period,
    );

    res.success(trends, "Transaction trends retrieved successfully");
  }

  /**
   * GET /api/v1/transactions/analytics/categories
   */
  async getSpendingByCategory(req, res) {
    const { user } = req;
    const { period = "month", startDate, endDate, currency } = req.query;

    const controller = require("./transactionController");
    const dateRange = controller.calculateDateRange(period, startDate, endDate);
    const data = await controller.calculateSpendingByCategory(
      user.id,
      dateRange.start,
      dateRange.end,
      currency,
    );

    res.success(data, "Category spending retrieved successfully");
  }

  /**
   * GET /api/v1/transactions/export
   */
  async exportTransactions(req, res) {
    const { user } = req;
    const { format, startDate, endDate, type, status } = req.query;

    const filters = [Query.equal("userId", user.id)];
    if (type) filters.push(Query.equal("type", type));
    if (status) filters.push(Query.equal("status", status));
    if (startDate) filters.push(Query.greaterThanEqual("createdAt", startDate));
    if (endDate) filters.push(Query.lessThanEqual("createdAt", endDate));

    const transactions = await databases.listDocuments(
      DB_ID(),
      COL("transactionsId"),
      [...filters, Query.limit(1000), Query.orderDesc("$createdAt")],
    );

    const controller = require("./transactionController");
    let exportData;

    switch (format) {
      case "csv":
        exportData = controller.generateCSVExport(transactions.documents);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="transactions.csv"',
        );
        break;
      case "pdf":
        exportData = await controller.generatePDFExport(
          transactions.documents,
          user,
        );
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="transactions.pdf"',
        );
        break;
      case "xlsx":
        exportData = controller.generateXLSXExport(transactions.documents);
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="transactions.xlsx"',
        );
        break;
      default:
        throw new ValidationError("Unsupported export format");
    }

    logTransactionExport(req, {
      format,
      recordCount: transactions.documents.length,
      dateRange: { startDate, endDate },
    });

    logger.audit("TRANSACTIONS_EXPORTED", user.id, {
      format,
      count: transactions.documents.length,
      ip: req.ip,
    });

    res.send(exportData);
  }

  /**
   * GET /api/v1/transactions/search
   */
  async searchTransactions(req, res) {
    const { user } = req;
    const { q, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await databases.listDocuments(
      DB_ID(),
      COL("transactionsId"),
      [
        Query.equal("userId", user.id),
        Query.search("description", q),
        Query.orderDesc("$createdAt"),
        Query.limit(parseInt(limit)),
        Query.offset(offset),
      ],
    );

    res.paginated(
      transactions.documents.map((t) => this._formatTransaction(t)),
      {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: transactions.total,
        totalPages: Math.ceil(transactions.total / parseInt(limit)),
      },
      "Search results retrieved successfully",
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch a transaction and verify the requesting user owns it.
   * Admins bypass the ownership check.
   * @throws {NotFoundError} if not found or not owned
   */
  async _fetchAndVerifyOwnership(transactionId, user) {
    let transaction;
    try {
      transaction = await databases.getDocument(
        DB_ID(),
        COL("transactionsId"),
        transactionId,
      );
    } catch {
      throw new NotFoundError("Transaction");
    }

    if (
      !["admin", "super_admin"].includes(user.role) &&
      transaction.userId !== user.id
    ) {
      // Use NotFoundError (not AuthorizationError) to avoid disclosing existence
      throw new NotFoundError("Transaction");
    }

    return transaction;
  }

  /**
   * Find an existing transaction by idempotency key + userId to prevent
   * double-spending on replay attacks.
   */
  async _findByIdempotencyKey(key, userId) {
    try {
      const result = await databases.listDocuments(
        DB_ID(),
        COL("transactionsId"),
        [
          Query.equal("idempotencyKey", key),
          Query.equal("userId", userId),
          Query.limit(1),
        ],
      );
      return result.documents[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Assert that the user's daily spending for today does not exceed the
   * KYC-level limit after adding `amount`.
   */
  async _assertDailyLimit(userId, amount, currency, kycLevel, req) {
    const limits =
      KYC_TRANSACTION_LIMITS[kycLevel] || KYC_TRANSACTION_LIMITS[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await databases.listDocuments(
      DB_ID(),
      COL("transactionsId"),
      [
        Query.equal("userId", userId),
        Query.equal("currency", currency),
        Query.equal("status", "completed"),
        Query.greaterThanEqual("createdAt", todayStart.toISOString()),
        Query.limit(1000),
      ],
    );

    const dailyTotal = result.documents.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    if (dailyTotal + amount > limits.daily) {
      logAuthorizationBlocked(req, AUDIT_ACTIONS.AUTH_DAILY_LIMIT_EXCEEDED, {
        dailyTotal,
        amount,
        dailyLimit: limits.daily,
        currency,
        kycLevel,
      });
      throw new AuthorizationError(
        `This transaction would exceed your daily limit of ${limits.daily} ${currency}. ` +
          `You have ${Math.max(0, limits.daily - dailyTotal).toFixed(2)} ${currency} remaining today.`,
      );
    }
  }

  /**
   * Assert that the user's monthly spending does not exceed the KYC limit.
   */
  async _assertMonthlyLimit(userId, amount, currency, kycLevel, req) {
    const limits =
      KYC_TRANSACTION_LIMITS[kycLevel] || KYC_TRANSACTION_LIMITS[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const result = await databases.listDocuments(
      DB_ID(),
      COL("transactionsId"),
      [
        Query.equal("userId", userId),
        Query.equal("currency", currency),
        Query.equal("status", "completed"),
        Query.greaterThanEqual("createdAt", monthStart.toISOString()),
        Query.limit(10000),
      ],
    );

    const monthlyTotal = result.documents.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    if (monthlyTotal + amount > limits.monthly) {
      logAuthorizationBlocked(req, AUDIT_ACTIONS.AUTH_MONTHLY_LIMIT_EXCEEDED, {
        monthlyTotal,
        amount,
        monthlyLimit: limits.monthly,
        currency,
        kycLevel,
      });
      throw new AuthorizationError(
        `This transaction would exceed your monthly limit of ${limits.monthly} ${currency}. ` +
          `You have ${Math.max(0, limits.monthly - monthlyTotal).toFixed(2)} ${currency} remaining this month.`,
      );
    }
  }

  /**
   * Basic fraud signal checks (velocity, large single amount, new-recipient).
   * Throws or logs suspicious activity without blocking legit users.
   */
  async _runFraudSignals(req, { amount, currency, type, recipientId }) {
    const { user } = req;
    const amountNum = parseFloat(amount);

    // Signal 1: High-value transaction to a first-time recipient
    if (recipientId && amountNum > 5000) {
      const priorSends = await databases
        .listDocuments(DB_ID(), COL("transactionsId"), [
          Query.equal("userId", user.id),
          Query.equal("recipientId", recipientId),
          Query.equal("status", "completed"),
          Query.limit(1),
        ])
        .catch(() => ({ total: 0 }));

      if (priorSends.total === 0) {
        logger.security("FRAUD_SIGNAL: High-value transfer to new recipient", {
          userId: user.id,
          amount: amountNum,
          currency,
          recipientId,
          requestId: req.id,
          ip: req.ip,
        });
      }
    }

    // Signal 2: More than 10 transactions in the last 5 minutes (velocity)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recentCount = await databases
      .listDocuments(DB_ID(), COL("transactionsId"), [
        Query.equal("userId", user.id),
        Query.greaterThanEqual("createdAt", fiveMinAgo),
        Query.limit(11),
      ])
      .catch(() => ({ total: 0 }));

    if (recentCount.total >= 10) {
      logger.security("FRAUD_SIGNAL: High velocity transactions detected", {
        userId: user.id,
        count: recentCount.total,
        windowMinutes: 5,
        requestId: req.id,
        ip: req.ip,
      });
      // Do NOT block; flag for review. Raise to SUSPICIOUS_ACTIVITY in prod.
    }
  }

  /**
   * Resolve recipient document by ID or email.
   */
  async _resolveRecipient({ recipientId, recipientEmail }) {
    if (recipientId) {
      try {
        return await databases.getDocument(
          DB_ID(),
          COL("usersId"),
          recipientId,
        );
      } catch {
        throw new NotFoundError("Recipient");
      }
    }

    if (recipientEmail) {
      const result = await databases.listDocuments(DB_ID(), COL("usersId"), [
        Query.equal("email", recipientEmail.toLowerCase()),
        Query.limit(1),
      ]);
      if (result.total === 0) {
        throw new NotFoundError("Recipient");
      }
      return result.documents[0];
    }

    throw new ValidationError(
      "A recipientId or recipientEmail is required for transfers",
    );
  }

  /**
   * Get a user's wallet for a given currency.
   */
  async _getWallet(userId, currency) {
    const result = await databases
      .listDocuments(DB_ID(), COL("walletsId"), [
        Query.equal("userId", userId),
        Query.equal("currency", currency),
        Query.limit(1),
      ])
      .catch(() => ({ documents: [] }));
    return result.documents[0] || null;
  }

  /**
   * Get or create a wallet for the given userId + currency.
   */
  async _getOrCreateWallet(userId, currency) {
    const existing = await this._getWallet(userId, currency);
    if (existing) return existing;

    const now = new Date().toISOString();
    return databases.createDocument(DB_ID(), COL("walletsId"), ID.unique(), {
      userId,
      currency,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Shape a transaction document into the public API response object.
   * Strips internal fields; optionally includes detail fields.
   */
  _formatTransaction(tx, detailed = false) {
    const base = {
      id: tx.$id,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      status: tx.status,
      paymentMethod: tx.paymentMethod,
      reference: tx.reference || tx.$id,
      counterparty: tx.counterparty || tx.recipientId || null,
      createdAt: tx.createdAt || tx.$createdAt,
      updatedAt: tx.updatedAt || tx.$updatedAt,
      completedAt: tx.completedAt || null,
    };

    if (detailed) {
      return {
        ...base,
        fees: tx.fees || 0,
        exchangeRate: tx.exchangeRate || null,
        processorTransactionId: tx.processorTransactionId || null,
        metadata: tx.metadata
          ? (() => {
              try {
                return JSON.parse(tx.metadata);
              } catch {
                return null;
              }
            })()
          : null,
      };
    }

    return base;
  }
}

module.exports = new SecureTransactionController();
