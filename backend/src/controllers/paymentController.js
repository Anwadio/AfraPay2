/**
 * Payment Controller
 * Handles payment processing, wallet operations, and payment methods
 */

const { Query, ID } = require("node-appwrite");
const bcrypt = require("bcryptjs");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// Use the shared singleton Appwrite Databases instance (initialised at startup)
const { appwrite: dbConn } = require("../database/connection");
const getDatabases = () => dbConn.getDatabases();

// ── Service layer ─────────────────────────────────────────────────────────
const paymentService = require("../services/paymentService");

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

    logger.audit("SEND_MONEY_INITIATED", user.id, {
      transactionId: result.transactionId,
      provider,
      amount,
      currency,
      status: result.status,
      ip: req.ip,
    });

    // 202 Accepted for async providers (mpesa / mtn); 201 Created for wallet (synchronous)
    if (result.status === "completed") {
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
}

module.exports = new PaymentController();
