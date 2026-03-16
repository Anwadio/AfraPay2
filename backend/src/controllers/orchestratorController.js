/**
 * OrchestratorController
 *
 * HTTP layer for the payment orchestration system.
 * Delegates all provider interaction to PaymentOrchestrator (single responsibility).
 *
 * Endpoints surfaced
 * ──────────────────
 *   POST   /api/v1/payments/orchestrate          — Initiate an orchestrated charge
 *   POST   /api/v1/payments/:paymentId/refund     — Partial or full refund
 *   GET    /api/v1/payments/providers/health      — Circuit-breaker health dashboard
 *   POST   /api/v1/payments/providers/:name/reset — Admin: reset circuit breaker
 *   POST   /api/v1/webhooks/orchestrator          — Unified webhook handler
 */

"use strict";

const { Client, Databases, ID } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const orchestrator = require("../payments/PaymentOrchestrator");
const { encryptObject } = require("../payments/tokenVault");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// ── Appwrite client ──────────────────────────────────────────────────────────
const _appwrite = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);
const _db = new Databases(_appwrite);

// ── Supported values ─────────────────────────────────────────────────────────
const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "UGX",
  "TZS",
  "RWF",
  "ZMW",
  "MWK",
  "ETB",
  "EGP",
  "XOF",
  "XAF",
  "MXN",
  "BRL",
  "INR",
  "SGD",
];

// ── Controller class ─────────────────────────────────────────────────────────

class OrchestratorController {
  /**
   * POST /api/v1/payments/orchestrate
   *
   * Create a new payment through the orchestration layer.
   * Idempotency is enforced by the upstream `idempotency` middleware — the
   * `Idempotency-Key` header becomes the `idempotencyKey` passed to providers.
   */
  async initiatePayment(req, res) {
    const { user } = req;
    const idempotencyKey = req.headers["idempotency-key"];

    const {
      amount,
      currency,
      method,
      recipientId,
      recipientEmail,
      description,
      vaultToken, // encrypted vault token (optional for saved methods)
      email,
      phone,
      metadata = {},
      callbackUrl,
    } = req.body;

    // ── Input validation ───────────────────────────────────────────────────
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError("amount must be a positive number");
    }
    if (!SUPPORTED_CURRENCIES.includes((currency || "").toUpperCase())) {
      throw new ValidationError(`currency '${currency}' is not supported`);
    }
    if (!["card", "bank_transfer", "mobile_money"].includes(method)) {
      throw new ValidationError(
        "method must be 'card', 'bank_transfer', or 'mobile_money'",
      );
    }
    if (!email && !user.email) {
      throw new ValidationError("email is required for payment processing");
    }

    const payerEmail = email || user.email;

    // ── Assemble charge request ────────────────────────────────────────────
    const chargeRequest = {
      idempotencyKey,
      amount: parsedAmount,
      currency: currency.toUpperCase(),
      method,
      vaultToken: vaultToken || undefined,
      email: payerEmail,
      phone,
      description,
      metadata: {
        ...metadata,
        userId: user.id || user.$id,
        recipientId: recipientId || undefined,
        recipientEmail: recipientEmail || undefined,
      },
      callbackUrl,
    };

    // ── Execute orchestrated charge ────────────────────────────────────────
    const chargeResult = await orchestrator.charge(
      chargeRequest,
      user.id || user.$id,
    );

    // ── Persist the payment record in Appwrite ─────────────────────────────
    const paymentId = ID.unique();
    await _db.createDocument(
      config.database.appwrite.databaseId,
      config.database.appwrite.paymentsCollectionId,
      paymentId,
      {
        idempotencyKey,
        senderId: user.id || user.$id,
        recipientId: recipientId || null,
        recipientEmail: recipientEmail || null,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        description: description || "",
        paymentMethod: method,
        providerName: chargeResult.providerName,
        providerRef: chargeResult.providerRef,
        status: chargeResult.status,
        requiresAction: chargeResult.status === "requires_action",
        nextAction: chargeResult.nextAction
          ? JSON.stringify(chargeResult.nextAction)
          : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || null,
      },
    );

    logger.audit("ORCHESTRATED_PAYMENT_INITIATED", user.id || user.$id, {
      paymentId,
      idempotencyKey,
      provider: chargeResult.providerName,
      amount: parsedAmount,
      currency,
      status: chargeResult.status,
      ip: req.ip,
    });

    const response = {
      paymentId,
      idempotencyKey,
      provider: chargeResult.providerName,
      providerRef: chargeResult.providerRef,
      status: chargeResult.status,
      amount: parsedAmount,
      currency: currency.toUpperCase(),
    };

    // If the provider requires a redirect (hosted checkout, 3DS, OTP)
    if (chargeResult.nextAction) {
      response.nextAction = chargeResult.nextAction;
    }

    res
      .status(201)
      .json({
        success: true,
        data: response,
        message: "Payment initiated successfully",
      });
  }

  /**
   * POST /api/v1/payments/:paymentId/refund
   *
   * Refund a settled payment (partial or full).
   * Only the sender (payer) or an admin may refund.
   */
  async refundPayment(req, res) {
    const { user } = req;
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    // Load payment record
    let payment;
    try {
      payment = await _db.getDocument(
        config.database.appwrite.databaseId,
        config.database.appwrite.paymentsCollectionId,
        paymentId,
      );
    } catch {
      throw new NotFoundError("Payment");
    }

    // Only the original payer or admins may issue refunds
    if (payment.senderId !== (user.id || user.$id) && !user.isAdmin) {
      throw new AuthorizationError(
        "You are not authorised to refund this payment",
      );
    }

    if (payment.status !== "completed") {
      throw new ValidationError(
        `Cannot refund a payment with status '${payment.status}'`,
      );
    }

    const parsedAmount = amount != null ? parseFloat(amount) : undefined;
    if (
      parsedAmount !== undefined &&
      (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
    ) {
      throw new ValidationError("amount must be a positive number");
    }
    if (parsedAmount !== undefined && parsedAmount > payment.amount) {
      throw new ValidationError(
        "Refund amount cannot exceed original payment amount",
      );
    }

    const refundResult = await orchestrator.refund(
      payment.providerName,
      payment.providerRef,
      parsedAmount,
    );

    // Mark original payment as refunded/partially-refunded
    const newStatus =
      parsedAmount == null || parsedAmount === payment.amount
        ? "refunded"
        : "partially_refunded";

    await _db.updateDocument(
      config.database.appwrite.databaseId,
      config.database.appwrite.paymentsCollectionId,
      paymentId,
      { status: newStatus, updatedAt: new Date().toISOString() },
    );

    logger.audit("PAYMENT_REFUNDED", user.id || user.$id, {
      paymentId,
      refundProviderRef: refundResult.providerRef,
      amount: parsedAmount || payment.amount,
      reason,
    });

    res.json({
      success: true,
      data: {
        paymentId,
        refundId: refundResult.id,
        providerRef: refundResult.providerRef,
        status: refundResult.status,
        amount: refundResult.amount,
      },
      message: "Refund initiated successfully",
    });
  }

  /**
   * GET /api/v1/payments/providers/health
   *
   * Returns circuit-breaker state for every registered provider.
   * Useful for ops dashboards and automated health checks.
   */
  async getProviderHealth(req, res) {
    const health = orchestrator.getProviderHealth();

    const allAvailable = health.every((h) => h.available);
    const statusCode = allAvailable ? 200 : 207; // 207 Multi-Status if degraded

    res.status(statusCode).json({
      success: true,
      data: { providers: health },
    });
  }

  /**
   * POST /api/v1/payments/providers/:providerName/reset
   *
   * Admin-only: reset the circuit breaker for a provider.
   */
  async resetProviderCircuit(req, res) {
    const { providerName } = req.params;

    if (!req.user?.isAdmin) {
      throw new AuthorizationError("Admin privileges required");
    }

    orchestrator.resetCircuit(providerName);

    logger.audit("CIRCUIT_BREAKER_RESET", req.user.id || req.user.$id, {
      providerName,
    });

    res.json({
      success: true,
      message: `Circuit breaker for '${providerName}' has been reset`,
    });
  }

  /**
   * POST /api/v1/webhooks/orchestrator
   *
   * Unified webhook endpoint for all payment providers.
   * Providers are identified by the `X-Provider` header or by signature matching.
   *
   * IMPORTANT: Express must be configured to expose the raw body for this route.
   * Add `express.raw({ type: '*\/*' })` BEFORE `express.json()` for this path.
   */
  async handleWebhook(req, res) {
    // Raw body is attached by the webhook-specific body-parser middleware
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const providerHint =
      (req.headers["x-provider"] || "").toLowerCase() || null;

    const normalised = orchestrator.handleWebhook(
      providerHint,
      rawBody,
      req.headers,
      req.body,
    );

    if (!normalised) {
      logger.warn(
        "OrchestratorController: webhook rejected — signature mismatch",
        {
          providerHint,
          ip: req.ip,
        },
      );
      // Return 200 to prevent provider from retrying — we still reject logically
      return res.status(200).json({ received: true, accepted: false });
    }

    // Update payment record based on webhook event
    await this._applyWebhookEvent(normalised);

    res.status(200).json({ received: true, accepted: true });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  async _applyWebhookEvent({ event, data, providerName }) {
    if (!data?.providerRef) return;

    const STATUS_MAP = {
      "payment.completed": "completed",
      "payment.failed": "failed",
      "payment.requires_action": "requires_action",
      "refund.completed": "refunded",
      "transfer.completed": "completed",
      "transfer.failed": "failed",
    };

    const newStatus = STATUS_MAP[event];
    if (!newStatus) return;

    try {
      // Find the payment record by providerRef
      const result = await _db.listDocuments(
        config.database.appwrite.databaseId,
        config.database.appwrite.paymentsCollectionId,
        [`providerRef=${data.providerRef}`],
      );

      for (const doc of result.documents || []) {
        await _db.updateDocument(
          config.database.appwrite.databaseId,
          config.database.appwrite.paymentsCollectionId,
          doc.$id,
          {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            completedAt:
              newStatus === "completed"
                ? new Date().toISOString()
                : doc.completedAt,
          },
        );

        logger.info(
          "OrchestratorController: payment status updated via webhook",
          {
            paymentId: doc.$id,
            providerRef: data.providerRef,
            provider: providerName,
            event,
            newStatus,
          },
        );
      }
    } catch (err) {
      logger.error(
        "OrchestratorController: failed to update payment from webhook",
        {
          error: err.message,
          event,
          providerRef: data.providerRef,
        },
      );
    }
  }
}

module.exports = new OrchestratorController();
