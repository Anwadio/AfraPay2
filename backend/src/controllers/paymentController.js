/**
 * Payment Controller
 * Handles payment processing, wallet operations, and payment methods
 */

const { Query, ID } = require("node-appwrite");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const config = require("../config/environment");
const logger = require("../utils/logger");
const auditService = require("../services/auditService");
const fraudService = require("../services/fraudService");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  PaymentError,
} = require("../middleware/monitoring/errorHandler");

// Use the shared singleton Appwrite Databases instance (initialised at startup)
const { appwrite: dbConn } = require("../database/connection");
const getDatabases = () => dbConn.getDatabases();

// ── Service layer ─────────────────────────────────────────────────────────
const paymentService = require("../services/paymentService");

// ── Alert helpers (lazy require to avoid circular deps) ───────────────────
const getCreateNotification = () =>
  require("./notificationController").createNotification;
const getCreateAdminNotification = () =>
  require("../services/notificationService").createAdminNotification;
const emailService = require("../services/emailService");
const getAlertUsers = () =>
  require("../database/connection").appwrite.getUsers();

// ── Collection ID helpers ──────────────────────────────────────────────────
const DB_ID = () => config.database.appwrite.databaseId;
const PAYMENTS_COL = () => config.database.appwrite.paymentsCollectionId;
// Transfers and withdrawals are stored as typed records in the transactions collection
const TRANSACTIONS_COL = () =>
  config.database.appwrite.transactionsCollectionId;
const WALLETS_COL = () => config.database.appwrite.walletsCollectionId;
const USERS_COL = () => config.database.appwrite.userCollectionId;

class PaymentController {
  /**
   * POST /api/v1/payments/send
   *
   * Send money to a phone number via M-Pesa, MTN MoMo, or internal wallet.
   *
   * Body:
   *   { amount, currency, provider, receiverPhone, description? }
   *
   * Required header:
   *   Idempotency-Key: <uuid-v4>
   */
  async sendMoney(req, res) {
    const { user } = req;
    const {
      amount,
      currency,
      provider,
      receiverPhone,
      receiverAccountNumber,
      receiverBankCode,
      receiverAccountName,
      description,
    } = req.body;

    // The idempotency middleware already validated the key format;
    // we read it here to pass through to the service.
    const idempotencyKey =
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      req.idempotencyKey;

    if (!idempotencyKey) {
      throw new ValidationError("Idempotency-Key header is required");
    }

    const result = await paymentService.sendMoney({
      idempotencyKey,
      senderId: user.id,
      senderEmail: user.email,
      receiverPhone,
      receiverAccountNumber,
      receiverBankCode,
      receiverAccountName,
      provider,
      amount,
      currency,
      description,
      ipAddress: req.ip,
    });

    // Audit log (legacy file + persistent collection)
    logger.audit("SEND_MONEY_INITIATED", user.id, {
      transactionId: result.transactionId,
      provider,
      amount,
      currency,
      status: result.status,
      ip: req.ip,
    });
    auditService.logAction({
      actorId: user.id,
      actorRole: "user",
      action: "SEND_MONEY_INITIATED",
      entity: "transaction",
      entityId: result.transactionId,
      metadata: { provider, amount, currency, status: result.status },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
    });

    // 202 Accepted for async providers (mpesa / mtn); 201 Created for wallet (synchronous)

    // Fraud check before finalizing
    const fraudResult = await fraudService.checkTransaction({
      userId: user.id,
      transactionId: result.transactionId,
      amount: parseFloat(amount),
      currency,
      deviceId: req.headers["x-device-id"] || "",
      phone: user.phone || "",
      type: "payment",
    });
    if (fraudResult.flagged) {
      // Optionally update transaction status to flagged (if business logic allows)
      // await ...
    }

    if (result.status === "completed") {
      this._fireTransactionAlert(user.id, {
        type: "payment",
        amount,
        currency,
        recipient: receiverPhone || receiverAccountNumber || undefined,
        status: result.status,
        txId: result.transactionId || "",
      });
      return res.created(result, "Transfer completed successfully");
    }

    return res.status(202).json({
      success: true,
      data: result,
      message: "Payment request accepted and is being processed",
    });
  }

  /**
   * GET /api/v1/payments/send/:transactionId/status
   *
   * Refresh and return the current status of a send-money transaction.
   * Front-ends can poll this endpoint for async providers (M-Pesa / MTN).
   */
  async getSendMoneyStatus(req, res) {
    const { user } = req;
    const { transactionId } = req.params;

    const result = await paymentService.refreshStatus(transactionId, user.id);
    res.success(result, "Transaction status retrieved");
  }

  /**
   * GET /api/v1/payments/recent
   *
   * Returns the authenticated user's last N outgoing send_money transfers,
   * sorted newest-first. Intended for the "Recent Transfers" panel on the
   * Send Money page. max limit is capped at 20 in the service layer.
   */
  async getRecentTransfers(req, res) {
    const { user } = req;
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const transfers = await paymentService.getRecentTransfers(user.id, limit);
    res.success({ transfers }, "Recent transfers retrieved");
  }

  /**
   * GET /api/v1/payments/exchange-rates
   *
   * Returns live exchange rates for East African and major world currencies,
   * all relative to USD. Rates are cached in-memory for 10 minutes to avoid
   * hammering the upstream API.
   *
   * Optional query params:
   *   ?from=KES&to=USD   — returns a single conversion rate
   *   (no params)        — returns the full rate table
   */
  async getExchangeRates(req, res) {
    const { from, to } = req.query;

    // ── 10-minute in-memory cache ──────────────────────────────────────────
    const now = Date.now();
    const cache = PaymentController._rateCache;
    if (cache.rates && now - cache.fetchedAt < 10 * 60 * 1000) {
      return res.success(
        PaymentController._buildRateResponse(cache.rates, from, to),
        "Exchange rates retrieved",
      );
    }

    // ── Fetch from open.er-api.com (free, no key) ──────────────────────────
    let rawRates;
    try {
      const { data } = await axios.get(
        "https://open.er-api.com/v6/latest/USD",
        { timeout: 8000 },
      );
      if (data.result !== "success") throw new Error("Upstream API error");
      rawRates = data.rates;
    } catch (fetchErr) {
      logger.warn("PaymentController: exchange rate fetch failed", {
        error: fetchErr.message,
      });
      // Serve stale cache rather than returning a 500
      if (cache.rates) {
        return res.success(
          PaymentController._buildRateResponse(cache.rates, from, to),
          "Exchange rates retrieved (cached)",
        );
      }
      throw fetchErr;
    }

    // Update cache
    PaymentController._rateCache = { rates: rawRates, fetchedAt: now };

    return res.success(
      PaymentController._buildRateResponse(rawRates, from, to),
      "Exchange rates retrieved",
    );
  }

  /**
   * Build the response payload from raw rates.
   * Filters to East African + major currencies; if from/to are provided,
   * returns just the conversion rate.
   */
  static _buildRateResponse(rawRates, from, to) {
    const CURRENCIES = [
      "USD",
      "EUR",
      "GBP",
      "KES",
      "UGX",
      "TZS",
      "ETB",
      "RWF",
      "SSP", // East Africa
      "NGN",
      "GHS",
      "ZAR", // West / South Africa
    ];

    const rates = {};
    for (const code of CURRENCIES) {
      if (rawRates[code] !== undefined) rates[code] = rawRates[code];
    }

    if (from && to) {
      const fromRate = rawRates[from.toUpperCase()];
      const toRate = rawRates[to.toUpperCase()];
      if (!fromRate || !toRate) {
        return { from, to, rate: null, rates };
      }
      const rate = +(toRate / fromRate).toFixed(6);
      return { from: from.toUpperCase(), to: to.toUpperCase(), rate, rates };
    }

    return { base: "USD", rates, updatedAt: new Date().toISOString() };
  }

  /**
   * Create a new payment
   */
  async createPayment(req, res) {
    try {
      const { user } = req;
      const {
        amount,
        currency,
        recipientId,
        recipientEmail,
        description,
        paymentMethod,
        metadata,
      } = req.body;

      // Validate payment amount against user limits
      await this.validatePaymentLimits(user.id, amount, currency);

      // Get or create recipient
      let recipient = null;
      if (recipientId) {
        recipient = await this.getRecipient(recipientId);
      } else if (recipientEmail) {
        recipient = await this.getRecipientByEmail(recipientEmail);
      }

      // Self-payment guard
      if (recipient && recipient.$id === user.id) {
        throw new ValidationError("You cannot make a payment to yourself");
      }

      // Create payment record
      const paymentId = ID.unique();
      const payment = await getDatabases().createDocument(
        DB_ID(),
        PAYMENTS_COL(),
        paymentId,
        {
          senderId: user.id,
          recipientId: recipient?.$id,
          recipientEmail,
          amount: parseFloat(amount),
          currency,
          description: description || "",
          paymentMethod,
          status: "pending",
          metadata: metadata ? JSON.stringify(metadata) : null,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      );

      // Process payment based on method
      const paymentResult = await this.processPayment(payment, paymentMethod);

      // Update payment status
      await getDatabases().updateDocument(DB_ID(), PAYMENTS_COL(), paymentId, {
        status: paymentResult.status,
        processorTransactionId: paymentResult.transactionId,
        processorResponse: JSON.stringify(paymentResult.response),
        updatedAt: new Date().toISOString(),
      });

      logger.audit("PAYMENT_CREATED", user.id, {
        paymentId,
        amount,
        currency,
        recipientId: recipient?.$id,
        paymentMethod,
        status: paymentResult.status,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: user.id,
        actorRole: "user",
        action: "PAYMENT_CREATED",
        entity: "transaction",
        entityId: paymentId,
        metadata: {
          amount,
          currency,
          recipientId: recipient?.$id,
          paymentMethod,
          status: paymentResult.status,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });

      res.created(
        {
          id: paymentId,
          amount,
          currency,
          status: paymentResult.status,
          recipient: recipient
            ? {
                id: recipient.$id,
                name: recipient.name,
                email: recipient.email,
              }
            : { email: recipientEmail },
          createdAt: payment.createdAt,
          requiresConfirmation: paymentResult.requiresConfirmation || false,
        },
        "Payment created successfully",
      );
    } catch (error) {
      logger.error("Payment creation failed", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get user's payments
   */
  async getUserPayments(req, res) {
    try {
      const { user } = req;
      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate,
        type = "all",
      } = req.query;

      const queries = [
        Query.equal("senderId", user.id),
        Query.orderDesc("$createdAt"),
        Query.limit(parseInt(limit)),
        Query.offset((parseInt(page) - 1) * parseInt(limit)),
      ];

      if (status) queries.push(Query.equal("status", status));
      if (startDate)
        queries.push(Query.greaterThanEqual("$createdAt", startDate));
      if (endDate) queries.push(Query.lessThanEqual("$createdAt", endDate));

      // Include received payments if type is 'all' or 'received'
      if (type === "all" || type === "received") {
        // TODO: Handle received payments query
      }

      const payments = await getDatabases().listDocuments(
        DB_ID(),
        PAYMENTS_COL(),
        queries,
      );

      const paymentList = payments.documents.map((payment) => ({
        id: payment.$id,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        recipientEmail: payment.recipientEmail,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }));

      const totalPages = Math.ceil(payments.total / parseInt(limit));

      res.paginated(
        paymentList,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: payments.total,
          totalPages,
        },
        "Payments retrieved successfully",
      );
    } catch (error) {
      logger.error("Get payments failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(req, res) {
    try {
      const { user } = req;
      const { paymentId } = req.params;

      const payment = await getDatabases().getDocument(
        DB_ID(),
        PAYMENTS_COL(),
        paymentId,
      );

      // Check if user has access to this payment
      if (payment.senderId !== user.id && payment.recipientId !== user.id) {
        throw new NotFoundError("Payment");
      }

      const paymentDetails = {
        id: payment.$id,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        senderId: payment.senderId,
        recipientId: payment.recipientId,
        recipientEmail: payment.recipientEmail,
        metadata: payment.metadata ? JSON.parse(payment.metadata) : null,
        processorTransactionId: payment.processorTransactionId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        completedAt: payment.completedAt,
      };

      res.success(paymentDetails, "Payment details retrieved successfully");
    } catch (error) {
      logger.error("Get payment failed", {
        userId: req.user?.id,
        paymentId: req.params.paymentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(req, res) {
    try {
      const { user } = req;

      // Get wallet balances for different currencies
      const walletBalances = await this.calculateWalletBalances(user.id);

      res.success(
        {
          balances: walletBalances,
          totalValueUSD: await this.calculateTotalValueUSD(walletBalances),
          lastUpdated: new Date().toISOString(),
        },
        "Wallet balance retrieved successfully",
      );
    } catch (error) {
      logger.error("Get wallet balance failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Transfer money between users
   */
  async transferMoney(req, res) {
    try {
      const { user } = req;
      const { amount, currency, recipientId, description, pin } = req.body;

      // Verify PIN
      await this.verifyPIN(user.id, pin);

      // Check sufficient balance using the real wallet helper
      const balances = await this.calculateWalletBalances(user.id);
      const balance = balances[currency] ?? 0;
      if (balance < parseFloat(amount)) {
        throw new ValidationError("Insufficient balance");
      }

      // Get recipient
      const recipient = await this.getRecipient(recipientId);
      if (!recipient) {
        throw new NotFoundError("Recipient not found");
      }

      // Self-transfer guard
      if (recipient.$id === user.id) {
        throw new ValidationError("You cannot transfer funds to yourself");
      }

      // Create transfer transaction
      const transferId = ID.unique();
      const transfer = await getDatabases().createDocument(
        DB_ID(),
        TRANSACTIONS_COL(),
        transferId,
        {
          senderId: user.id,
          recipientId,
          amount: parseFloat(amount),
          currency,
          description: description || "",
          status: "processing",
          type: "transfer",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      // Process the transfer
      await this.processWalletTransfer(
        user.id,
        recipientId,
        amount,
        currency,
        transferId,
      );

      // Update transfer status
      await getDatabases().updateDocument(
        DB_ID(),
        TRANSACTIONS_COL(),
        transferId,
        {
          status: "completed",
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      logger.audit("MONEY_TRANSFERRED", user.id, {
        transferId,
        recipientId,
        amount,
        currency,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: user.id,
        actorRole: "user",
        action: "MONEY_TRANSFERRED",
        entity: "transaction",
        entityId: transferId,
        metadata: { recipientId, amount, currency },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });
      // Fraud check
      const fraudResult = await fraudService.checkTransaction({
        userId: user.id,
        transactionId: transferId,
        amount: parseFloat(amount),
        currency,
        deviceId: req.headers["x-device-id"] || "",
        phone: user.phone || "",
        type: "transfer",
      });
      if (fraudResult.flagged) {
        // Optionally update transaction status to flagged
      }

      this._fireTransactionAlert(user.id, {
        type: "transfer",
        amount,
        currency,
        recipient: recipient.name || recipient.email || recipientId,
        status: "completed",
        txId: transferId,
      });

      res.success(
        {
          transferId,
          amount,
          currency,
          recipient: {
            id: recipient.$id,
            name: recipient.name,
            email: recipient.email,
          },
          status: "completed",
          completedAt: new Date().toISOString(),
        },
        "Transfer completed successfully",
      );
    } catch (error) {
      logger.error("Money transfer failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Withdraw money to external account
   */
  async withdrawMoney(req, res) {
    try {
      const { user } = req;
      const { amount, currency, paymentMethodId, pin } = req.body;

      // Verify PIN
      await this.verifyPIN(user.id, pin);

      // Check sufficient balance using the real wallet helper
      const balances = await this.calculateWalletBalances(user.id);
      const balance = balances[currency] ?? 0;
      if (balance < parseFloat(amount)) {
        throw new ValidationError("Insufficient balance");
      }

      // Get payment method
      const paymentMethod = await this.getPaymentMethod(paymentMethodId);
      if (!paymentMethod || paymentMethod.userId !== user.id) {
        throw new NotFoundError("Payment method not found");
      }

      // Create withdrawal request
      const withdrawalId = ID.unique();
      const withdrawal = await getDatabases().createDocument(
        DB_ID(),
        TRANSACTIONS_COL(),
        withdrawalId,
        {
          userId: user.id,
          amount: parseFloat(amount),
          currency,
          paymentMethodId,
          status: "processing",
          type: "withdrawal",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      // Process withdrawal (this would integrate with external payment processors)
      const withdrawalResult = await this.processWithdrawal(
        withdrawal,
        paymentMethod,
      );

      logger.audit("MONEY_WITHDRAWN", user.id, {
        withdrawalId,
        amount,
        currency,
        paymentMethodId,
        status: withdrawalResult.status,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: user.id,
        actorRole: "user",
        action: "MONEY_WITHDRAWN",
        entity: "transaction",
        entityId: withdrawalId,
        metadata: {
          amount,
          currency,
          paymentMethodId,
          status: withdrawalResult.status,
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });
      // Fraud check
      const fraudResult = await fraudService.checkTransaction({
        userId: user.id,
        transactionId: withdrawalId,
        amount: parseFloat(amount),
        currency,
        deviceId: req.headers["x-device-id"] || "",
        phone: user.phone || "",
        type: "withdrawal",
      });
      if (fraudResult.flagged) {
        // Optionally update transaction status to flagged
      }

      this._fireTransactionAlert(user.id, {
        type: "withdrawal",
        amount,
        currency,
        status: withdrawalResult.status,
        txId: withdrawalId,
      });

      res.success(
        {
          withdrawalId,
          amount,
          currency,
          status: withdrawalResult.status,
          estimatedArrival: withdrawalResult.estimatedArrival,
          fee: withdrawalResult.fee,
        },
        "Withdrawal request submitted successfully",
      );
    } catch (error) {
      logger.error("Money withdrawal failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Deposit money to wallet
   */
  async depositMoney(req, res) {
    try {
      const { user } = req;
      const { amount, currency } = req.body;

      // Create a pending deposit record
      const depositId = ID.unique();
      const deposit = await getDatabases().createDocument(
        DB_ID(),
        TRANSACTIONS_COL(),
        depositId,
        {
          userId: user.id,
          amount: parseFloat(amount),
          currency,
          status: "pending",
          type: "deposit",
          description: `Wallet deposit – ${currency}`,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        },
      );

      logger.audit("DEPOSIT_INITIATED", user.id, {
        depositId,
        amount,
        currency,
        ip: req.ip,
      });
      auditService.logAction({
        actorId: user.id,
        actorRole: "user",
        action: "DEPOSIT_INITIATED",
        entity: "transaction",
        entityId: depositId,
        metadata: { amount, currency },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      });
      // Fraud check
      const fraudResult = await fraudService.checkTransaction({
        userId: user.id,
        transactionId: depositId,
        amount: parseFloat(amount),
        currency,
        deviceId: req.headers["x-device-id"] || "",
        phone: user.phone || "",
        type: "deposit",
      });
      if (fraudResult.flagged) {
        // Optionally update transaction status to flagged
      }

      this._fireTransactionAlert(user.id, {
        type: "deposit",
        amount,
        currency,
        status: "pending",
        txId: depositId,
      });

      res.created(
        {
          depositId,
          amount: parseFloat(amount),
          currency,
          status: "pending",
          message:
            "Deposit initiated. A payment processor will be integrated to complete this flow.",
        },
        "Deposit request received",
      );
    } catch (error) {
      logger.error("Money deposit failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  // Helper methods

  async validatePaymentLimits(userId, amount, currency) {
    // TODO: Implement payment limits validation based on user's KYC level
    const limits = await this.getUserPaymentLimits(userId);
    const dailySpent = await this.getDailySpentAmount(userId, currency);

    if (dailySpent + amount > limits.dailyLimit) {
      throw new ValidationError("Daily payment limit exceeded");
    }
  }

  async processPayment(payment, paymentMethod) {
    // TODO: Integrate with actual payment processors (Stripe, Paystack, etc.)
    // This is a mock implementation

    switch (paymentMethod) {
      case "card":
        return await this.processCardPayment(payment);
      case "bank_transfer":
        return await this.processBankTransfer(payment);
      case "mobile_money":
        return await this.processMobileMoneyPayment(payment);
      default:
        throw new ValidationError("Unsupported payment method");
    }
  }

  async processCardPayment(payment) {
    // Mock card payment processing
    return {
      status: "processing",
      transactionId: `card_${Date.now()}`,
      response: { message: "Payment processing" },
      requiresConfirmation: true,
    };
  }

  async processBankTransfer(payment) {
    // Mock bank transfer processing
    return {
      status: "pending",
      transactionId: `bank_${Date.now()}`,
      response: { message: "Bank transfer initiated" },
      requiresConfirmation: false,
    };
  }

  async processMobileMoneyPayment(payment) {
    // Mock mobile money processing
    return {
      status: "processing",
      transactionId: `momo_${Date.now()}`,
      response: { message: "Mobile money payment processing" },
      requiresConfirmation: true,
    };
  }

  async calculateWalletBalances(userId) {
    const result = await getDatabases().listDocuments(DB_ID(), WALLETS_COL(), [
      Query.equal("userId", userId),
      Query.limit(20),
    ]);
    const balances = {};
    for (const wallet of result.documents) {
      balances[wallet.currency] = wallet.balance ?? 0;
    }
    return balances;
  }

  async calculateTotalValueUSD(balances) {
    // NOTE: Real exchange-rate conversion requires an FX service.
    // Until one is integrated, only the USD balance is returned to avoid
    // silently summing incompatible currency amounts.
    return balances["USD"] ?? 0;
  }

  async verifyPIN(userId, pin) {
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      throw new ValidationError("Invalid PIN format");
    }
    // Fetch the stored PIN hash from user prefs
    const { appwrite: dwConn } = require("../database/connection");
    let userRecord;
    try {
      userRecord = await dwConn
        .getDatabases()
        .getDocument(DB_ID(), USERS_COL(), userId);
    } catch {
      throw new ValidationError("Unable to verify PIN");
    }
    const pinHash = userRecord?.pinHash;
    if (!pinHash) {
      // No PIN set — PIN-gated operations are not available until user sets one
      throw new ValidationError(
        "Transaction PIN has not been set. Please set a PIN in your profile settings.",
      );
    }
    const isValid = await bcrypt.compare(pin, pinHash);
    if (!isValid) {
      throw new ValidationError("Incorrect PIN");
    }
  }

  async getRecipient(recipientId) {
    try {
      const doc = await getDatabases().getDocument(
        DB_ID(),
        USERS_COL(),
        recipientId,
      );
      return doc;
    } catch {
      return null;
    }
  }

  async getRecipientByEmail(email) {
    try {
      const result = await getDatabases().listDocuments(DB_ID(), USERS_COL(), [
        Query.equal("email", email),
        Query.limit(1),
      ]);
      return result.documents[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Fire transaction alert (in-app notification + email) for a user.
   * Completely fire-and-forget — never throws or delays the caller.
   *
   * @param {string} userId
   * @param {object} txInfo  { type, amount, currency, recipient?, status, txId }
   */
  async _fireTransactionAlert(userId, txInfo) {
    setImmediate(async () => {
      try {
        const userRec = await getAlertUsers().get(userId);

        const {
          type = "transaction",
          amount,
          currency,
          recipient,
          status = "completed",
          txId = "",
        } = txInfo;
        const typeLabel =
          type === "transfer"
            ? "Transfer"
            : type === "withdrawal"
              ? "Withdrawal"
              : type === "deposit"
                ? "Deposit"
                : type === "card_topup"
                  ? "Card Top-Up"
                  : "Payment";

        const message = recipient
          ? `${typeLabel} of ${currency} ${amount} to ${recipient} — ${status}`
          : `${typeLabel} of ${currency} ${amount} — ${status}`;

        // Notify the user (only if they have transaction alerts enabled)
        if (userRec.prefs?.transactionAlerts === "true") {
          await getCreateNotification()(
            userId,
            "transaction",
            `${typeLabel} ${status}`,
            message,
            "/transactions",
          );

          const firstName = (userRec.name || userRec.email || "User").split(
            " ",
          )[0];
          await emailService.sendTransactionAlertEmail(
            userRec.email,
            firstName,
            txInfo,
          );
        }

        // Always notify admins of new transactions
        await getCreateAdminNotification()(
          "transaction",
          `New ${typeLabel}`,
          `${message}${txId ? ` (ID: ${txId})` : ""}`,
          { link: txId ? `/transactions/${txId}` : "/transactions" },
        );
      } catch (err) {
        logger.warn("Transaction alert dispatch failed (non-fatal)", {
          userId,
          error: err.message,
        });
      }
    });
  }

  // ── Till Payment ──────────────────────────────────────────────────────────

  /**
   * POST /api/v1/payments/pay-till
   *
   * Send money to a merchant via their till number.
   *
   * Body:
   *   { tillNumber, amount, currency, description? }
   *
   * Flow:
   *   1. Validate till number format
   *   2. Look up approved merchant by till
   *   3. Debit sender's wallet
   *   4. Credit merchant wallet
   *   5. Record transaction in Appwrite
   *   6. Emit audit log + admin notification
   *
   * Requires:  Idempotency-Key header (UUID v4)
   */
  async payTill(req, res) {
    const { user } = req;
    const { tillNumber, amount, currency, description } = req.body;

    // Idempotency key (enforced by middleware AND here as double-guard)
    const idempotencyKey =
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      req.idempotencyKey;

    if (!idempotencyKey) {
      throw new ValidationError("Idempotency-Key header is required");
    }

    // ── 1. Validate till format ──────────────────────────────────────────
    const tillService = require("../services/tillService");
    if (!tillService.isValidFormat(tillNumber)) {
      throw new ValidationError(
        "Invalid till number format. Expected AFR-XXXXXX (e.g. AFR-482931)",
      );
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError("Amount must be a positive number");
    }

    const VALID_CURRENCIES = [
      "USD",
      "EUR",
      "GBP",
      "NGN",
      "GHS",
      "KES",
      "ZAR",
      "UGX",
    ];
    if (!VALID_CURRENCIES.includes(currency)) {
      throw new ValidationError(`Unsupported currency: ${currency}`);
    }

    // ── 2. Idempotency check — prevent duplicate till payments ───────────
    const existingTxns = await getDatabases().listDocuments(
      DB_ID(),
      TRANSACTIONS_COL(),
      [
        Query.equal("idempotencyKey", idempotencyKey),
        Query.equal("senderId", user.id),
        Query.limit(1),
      ],
    );

    if (existingTxns.total > 0) {
      const existing = existingTxns.documents[0];
      logger.info("PaymentController.payTill: idempotent replay", {
        idempotencyKey,
        transactionId: existing.$id,
      });
      return res.success(
        {
          transactionId: existing.$id,
          status: existing.status,
          tillNumber: existing.tillNumber,
          amount: existing.amount,
          currency: existing.currency,
        },
        "Payment already processed (idempotent response)",
      );
    }

    // ── 3. Look up merchant by till ──────────────────────────────────────
    const merchantService = require("../services/merchantService");
    const merchant = await merchantService.getMerchantByTill(tillNumber);

    if (!merchant) {
      throw new NotFoundError(`Merchant with till number ${tillNumber}`);
    }

    // Self-payment guard
    if (merchant.ownerId === user.id) {
      throw new ValidationError("You cannot pay your own merchant till");
    }

    // ── 4. Debit sender wallet ───────────────────────────────────────────
    // Load sender wallet
    const senderWalletResult = await getDatabases().listDocuments(
      DB_ID(),
      WALLETS_COL(),
      [Query.equal("userId", user.id), Query.limit(1)],
    );

    const senderWallet =
      senderWalletResult.total > 0 ? senderWalletResult.documents[0] : null;

    if (!senderWallet) {
      throw new ValidationError(
        "You do not have a wallet. Please fund your AfraPay wallet to make payments.",
      );
    }

    // Check balance in the requested currency
    let senderBalance = 0;
    try {
      const balanceMap =
        typeof senderWallet.balances === "string"
          ? JSON.parse(senderWallet.balances)
          : senderWallet.balances || {};
      senderBalance = parseFloat(balanceMap[currency] || 0);
    } catch {
      // Fallback to top-level balance field if balances is not a JSON map
      senderBalance = parseFloat(senderWallet.balance || 0);
    }

    if (senderBalance < parsedAmount) {
      throw new ValidationError(
        `Insufficient ${currency} balance. Available: ${senderBalance.toFixed(2)}, Required: ${parsedAmount.toFixed(2)}`,
      );
    }

    // Debit sender wallet
    let newSenderBalance = senderBalance - parsedAmount;
    try {
      const balanceMap =
        typeof senderWallet.balances === "string"
          ? JSON.parse(senderWallet.balances)
          : senderWallet.balances || {};
      balanceMap[currency] = newSenderBalance;

      await getDatabases().updateDocument(
        DB_ID(),
        WALLETS_COL(),
        senderWallet.$id,
        {
          balances: JSON.stringify(balanceMap),
          updatedAt: new Date().toISOString(),
        },
      );
    } catch (debitErr) {
      // Try fallback single-balance field
      newSenderBalance = parseFloat(senderWallet.balance || 0) - parsedAmount;
      if (newSenderBalance < 0) {
        throw new ValidationError("Insufficient balance");
      }
      await getDatabases().updateDocument(
        DB_ID(),
        WALLETS_COL(),
        senderWallet.$id,
        {
          balance: newSenderBalance,
          updatedAt: new Date().toISOString(),
        },
      );
    }

    // ── 5. Record transaction FIRST (before credit, for audit trail) ─────
    const now = new Date().toISOString();
    const transactionRecord = await getDatabases().createDocument(
      DB_ID(),
      TRANSACTIONS_COL(),
      ID.unique(),
      {
        senderId: user.id,
        merchantId: merchant.$id,
        tillNumber,
        amount: parsedAmount,
        currency,
        description: (
          description || `Payment to ${merchant.businessName}`
        ).slice(0, 500),
        status: "processing",
        type: "till_payment",
        provider: "wallet",
        idempotencyKey,
        createdAt: now,
        updatedAt: now,
      },
    );

    // ── 6. Credit merchant wallet ────────────────────────────────────────
    let creditError = null;
    try {
      await merchantService.creditMerchantWallet(merchant.$id, parsedAmount);
    } catch (err) {
      creditError = err;
      logger.error("PaymentController.payTill: merchant wallet credit failed", {
        merchantId: merchant.$id,
        transactionId: transactionRecord.$id,
        error: err.message,
      });
    }

    // Determine final transaction status
    const finalStatus = creditError ? "reversal_pending" : "completed";

    // Update transaction to final status
    await getDatabases().updateDocument(
      DB_ID(),
      TRANSACTIONS_COL(),
      transactionRecord.$id,
      {
        status: finalStatus,
        updatedAt: new Date().toISOString(),
        ...(creditError && { errorMessage: creditError.message }),
      },
    );

    // ── 7. Audit log + notifications ─────────────────────────────────────
    auditService.logAction({
      actorId: user.id,
      actorRole: "user",
      action: "TILL_PAYMENT",
      entity: "transaction",
      entityId: transactionRecord.$id,
      metadata: {
        tillNumber,
        merchantId: merchant.$id,
        businessName: merchant.businessName,
        amount: parsedAmount,
        currency,
        status: finalStatus,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
    });

    // Fraud check (non-blocking on result)
    fraudService
      .checkTransaction({
        userId: user.id,
        transactionId: transactionRecord.$id,
        amount: parsedAmount,
        currency,
        deviceId: req.headers["x-device-id"] || "",
        phone: user.phone || "",
        type: "till_payment",
      })
      .catch((err) =>
        logger.warn("Fraud check failed (non-fatal)", { error: err.message }),
      );

    if (creditError) {
      // Payment debited but merchant credit failed — needs reconciliation
      logger.error("PaymentController.payTill: reversal_pending", {
        transactionId: transactionRecord.$id,
        merchantId: merchant.$id,
      });

      return res.status(202).json({
        success: true,
        data: {
          transactionId: transactionRecord.$id,
          status: "reversal_pending",
          message:
            "Payment debited but merchant credit is pending reconciliation. Contact support.",
        },
      });
    }

    this._fireTransactionAlert(user.id, {
      type: "till_payment",
      amount: parsedAmount,
      currency,
      recipient: merchant.businessName,
      status: finalStatus,
      txId: transactionRecord.$id,
    });

    return res.created(
      {
        transactionId: transactionRecord.$id,
        status: finalStatus,
        tillNumber,
        merchantName: merchant.businessName,
        amount: parsedAmount,
        currency,
        createdAt: transactionRecord.createdAt,
      },
      `Payment of ${parsedAmount} ${currency} sent to ${merchant.businessName} successfully`,
    );
  }

  // ── Card Top-Up ───────────────────────────────────────────────────────────

  /**
   * POST /api/v1/payments/charge-card
   *
   * Fund user wallet by charging a saved card.
   *
   * Body:
   *   { cardId: string, amount: number, currency: string }
   *
   * Required header:
   *   Idempotency-Key: <uuid-v4>
   *
   * Flow:
   *   1. Idempotency check
   *   2. Pre-charge fraud check (never throws — high severity blocks, medium flags)
   *   3. Validate & charge card via cardPaymentService
   *   4. Create transaction record (status: "processing")
   *   5. Credit user wallet
   *   6. Finalise status: "completed" | "flagged" | "reversal_pending"
   *   7. Audit log + alerts
   */
  async chargeCard(req, res) {
    const { user } = req;
    const { cardId, amount, currency } = req.body;
    const idempotencyKey =
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      req.idempotencyKey;

    if (!idempotencyKey) {
      throw new ValidationError("Idempotency-Key header is required");
    }

    const parsedAmount = parseFloat(amount);

    // ── 1. Idempotency check ────────────────────────────────────────────────
    const existingTxns = await getDatabases().listDocuments(
      DB_ID(),
      TRANSACTIONS_COL(),
      [
        Query.equal("idempotencyKey", idempotencyKey),
        Query.equal("senderId", user.id),
        Query.limit(1),
      ],
    );

    if (existingTxns.total > 0) {
      const existing = existingTxns.documents[0];
      logger.info("PaymentController.chargeCard: idempotent replay", {
        idempotencyKey,
        transactionId: existing.$id,
      });
      return res.success(
        {
          transactionId: existing.$id,
          status: existing.status,
          amount: existing.amount,
          currency: existing.currency,
        },
        "Payment already processed (idempotent response)",
      );
    }

    // ── 2. Pre-charge fraud check ──────────────────────────────────────────
    // fraudService never throws — always returns { flagged, reason, severity }.
    const fraudResult = await fraudService.checkTransaction({
      userId: user.id,
      transactionId: "pre-charge",
      amount: parsedAmount,
      currency,
      deviceId: req.headers["x-device-id"] || "",
      phone: user.phone || "",
      type: "card_topup",
    });

    // High-severity: hard block (e.g. rapid-fire, stolen device pattern)
    if (fraudResult.flagged && fraudResult.severity === "high") {
      logger.security("chargeCard: high-severity fraud block", {
        userId: user.id,
        cardId,
        amount: parsedAmount,
        currency,
        reason: fraudResult.reason,
        ip: req.ip,
      });
      throw new ValidationError(
        "This transaction has been blocked for security review. Please contact support.",
      );
    }

    // ── 3. Validate and charge the card ───────────────────────────────────
    // Lazy require avoids circular dependencies (same pattern as tillService)
    const cardPaymentService = require("../services/cardPaymentService");

    // Validates ownership, active status, expiry, currency, then charges.
    // Throws NotFoundError | ValidationError | PaymentError on failure.
    const chargeResult = await cardPaymentService.chargeCard(
      user.id,
      cardId,
      parsedAmount,
      currency,
    );

    // ── 4. Create transaction record (before wallet credit — audit trail) ─
    const now = new Date().toISOString();
    let transactionDoc;
    try {
      transactionDoc = await getDatabases().createDocument(
        DB_ID(),
        TRANSACTIONS_COL(),
        ID.unique(),
        {
          senderId: user.id,
          amount: parsedAmount,
          currency,
          status: "processing",
          type: "card_topup",
          provider: "card",
          description: `Card top-up \u2013 **** ${chargeResult.cardLast4} (${chargeResult.cardBrand})`,
          providerReference: chargeResult.providerReference,
          idempotencyKey,
          ipAddress: req.ip,
          flagged: false,
          createdAt: now,
          updatedAt: now,
        },
      );
    } catch (txCreateErr) {
      // CRITICAL: card is already charged. Surface this immediately so
      // monitoring/reconciliation jobs can detect the orphaned charge.
      logger.error(
        "chargeCard: CRITICAL — card charged but transaction record creation failed",
        {
          userId: user.id,
          cardId,
          providerReference: chargeResult.providerReference,
          error: txCreateErr.message,
        },
      );
      throw txCreateErr;
    }

    // ── 5. Credit user wallet ─────────────────────────────────────────────
    let walletCreditError = null;
    try {
      await this._creditUserWallet(user.id, currency, parsedAmount);
    } catch (walletErr) {
      walletCreditError = walletErr;
      logger.error(
        "chargeCard: wallet credit failed after successful card charge",
        {
          userId: user.id,
          transactionId: transactionDoc.$id,
          providerReference: chargeResult.providerReference,
          error: walletErr.message,
        },
      );
    }

    // ── 6. Finalise transaction status ────────────────────────────────────
    //   reversal_pending — card charged but wallet not credited (needs reconciliation)
    //   flagged          — medium-severity fraud, allowed but under review
    //   completed        — normal success path
    const finalStatus = walletCreditError
      ? "reversal_pending"
      : fraudResult.flagged
        ? "flagged"
        : "completed";

    await getDatabases().updateDocument(
      DB_ID(),
      TRANSACTIONS_COL(),
      transactionDoc.$id,
      {
        status: finalStatus,
        flagged: fraudResult.flagged || false,
        updatedAt: new Date().toISOString(),
        ...(walletCreditError && {
          description:
            transactionDoc.description +
            " [REVERSAL REQUIRED \u2014 contact support]",
        }),
      },
    );

    // ── 7. Audit log + notifications ──────────────────────────────────────
    auditService.logAction({
      actorId: user.id,
      actorRole: "user",
      action: "CARD_TOPUP",
      entity: "transaction",
      entityId: transactionDoc.$id,
      metadata: {
        cardId,
        cardLast4: chargeResult.cardLast4,
        cardBrand: chargeResult.cardBrand,
        amount: parsedAmount,
        currency,
        providerReference: chargeResult.providerReference,
        status: finalStatus,
        fraudFlagged: fraudResult.flagged || false,
        gateway: chargeResult.gateway,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
    });

    logger.audit("CARD_TOPUP", user.id, {
      transactionId: transactionDoc.$id,
      cardId,
      cardLast4: chargeResult.cardLast4,
      amount: parsedAmount,
      currency,
      status: finalStatus,
      ip: req.ip,
    });

    // If wallet credit failed respond 202 Accepted — charge succeeded, credit pending
    if (walletCreditError) {
      return res.status(202).json({
        success: true,
        data: {
          transactionId: transactionDoc.$id,
          status: finalStatus,
          message:
            "Card was charged but wallet credit is pending reconciliation. Our team has been alerted.",
        },
      });
    }

    // Notify admins of fraud-flagged transactions
    if (fraudResult.flagged) {
      getCreateAdminNotification()(
        "fraud",
        "Flagged Card Top-Up",
        `User ${user.id} card top-up of ${currency} ${parsedAmount} was flagged (${fraudResult.reason}).`,
        { link: `/transactions/${transactionDoc.$id}` },
      );
    }

    this._fireTransactionAlert(user.id, {
      type: "card_topup",
      amount: parsedAmount,
      currency,
      status: finalStatus,
      txId: transactionDoc.$id,
    });

    return res.created(
      {
        transactionId: transactionDoc.$id,
        status: finalStatus,
        amount: parsedAmount,
        currency,
        cardLast4: chargeResult.cardLast4,
        cardBrand: chargeResult.cardBrand,
        providerReference: chargeResult.providerReference,
        createdAt: transactionDoc.createdAt,
      },
      `Wallet funded with ${currency} ${parsedAmount.toFixed(2)} successfully`,
    );
  }

  /**
   * Credit a user wallet for the given currency.
   *
   * Queries walletsCollectionId for a document matching (userId, currency).
   * If one exists, increments its balance. If not, creates a new wallet document.
   *
   * Used exclusively by chargeCard after a successful card charge.
   *
   * @param {string} userId
   * @param {string} currency - ISO-4217 code (e.g. "KES")
   * @param {number} amount   - Positive float to add
   */
  async _creditUserWallet(userId, currency, amount) {
    const walletResult = await getDatabases().listDocuments(
      DB_ID(),
      WALLETS_COL(),
      [
        Query.equal("userId", userId),
        Query.equal("currency", currency),
        Query.limit(1),
      ],
    );

    const now = new Date().toISOString();

    if (walletResult.total > 0) {
      const wallet = walletResult.documents[0];
      const currentBalance = parseFloat(wallet.balance ?? 0);
      const newBalance = parseFloat((currentBalance + amount).toFixed(8));

      await getDatabases().updateDocument(DB_ID(), WALLETS_COL(), wallet.$id, {
        balance: newBalance,
        updatedAt: now,
      });
    } else {
      // No wallet document for this currency yet — create one
      await getDatabases().createDocument(DB_ID(), WALLETS_COL(), ID.unique(), {
        userId,
        currency,
        balance: parseFloat(amount.toFixed(8)),
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

// Static in-memory cache for exchange rates (shared across all requests)
PaymentController._rateCache = { rates: null, fetchedAt: 0 };

module.exports = new PaymentController();
