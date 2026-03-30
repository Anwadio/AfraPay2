/**
 * Payout Controller
 *
 * HTTP handlers for merchant-facing payout endpoints:
 *   POST  /api/v1/merchants/payout          — request a payout
 *   GET   /api/v1/merchants/payouts         — payout history
 *   GET   /api/v1/merchants/payouts/:id     — single payout detail
 *   GET   /api/v1/merchants/wallet-balance  — wallet balance
 */

"use strict";

const logger = require("../utils/logger");
const auditService = require("../services/auditService");
const payoutService = require("../services/payoutService");
const merchantService = require("../services/merchantService");

// Mask last 4 chars for response (never expose full destination to logs)
function maskDest(dest) {
  if (!dest || dest.length <= 4) return "****";
  return `${"*".repeat(Math.max(dest.length - 4, 2))}${dest.slice(-4)}`;
}

class PayoutController {
  /**
   * POST /api/v1/merchants/payout
   *
   * Authenticated merchant requests a payout from their wallet.
   * Requires: amount, method (mpesa|mtn|bank), destination, currency
   * Header : Idempotency-Key: <uuid>
   */
  async requestPayout(req, res) {
    const { user } = req;
    const { amount, method, destination, currency = "USD" } = req.body;
    const idempotencyKey =
      req.headers["idempotency-key"] || req.body.idempotencyKey || "";

    // Resolve merchant from authenticated user
    const merchant = await merchantService.getMerchantByOwner(user.id);

    if (!merchant) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        message: "Merchant account not found. Register as a merchant first.",
      });
    }

    if (merchant.status !== "approved") {
      return res.status(403).json({
        statusCode: 403,
        success: false,
        message: `Your merchant account is "${merchant.status}". Only approved merchants can request payouts.`,
      });
    }

    const { payout, transaction, replayed } = await payoutService.requestPayout(
      {
        merchantId: merchant.$id,
        ownerId: user.id,
        amount,
        currency,
        method,
        destination,
        idempotencyKey,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "",
      },
    );

    auditService.logAction({
      actorId: user.id,
      actorRole: "user",
      action: "MERCHANT_PAYOUT_REQUESTED",
      entity: "payout",
      entityId: payout.$id,
      metadata: {
        merchantId: merchant.$id,
        amount,
        currency,
        method,
        destination: maskDest(destination),
        status: payout.status,
        replayed: replayed || false,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
    });

    logger.info("PayoutController: payout request processed", {
      payoutId: payout.$id,
      merchantId: merchant.$id,
      ownerId: user.id,
      status: payout.status,
      replayed,
    });

    const statusCode = replayed ? 200 : 201;
    return res.status(statusCode).json({
      statusCode,
      success: true,
      message: replayed
        ? "Payout already submitted (idempotency replay)"
        : payout.status === "pending_review"
          ? "Payout submitted and is under review"
          : `Payout ${payout.status === "success" ? "completed" : "initiated"} successfully`,
      data: {
        payoutId: payout.$id,
        status: payout.status,
        amount: payout.amount,
        currency: payout.currency,
        method: payout.method,
        destination: maskDest(payout.destination),
        reference: payout.reference,
        transactionId: transaction?.$id || null,
        createdAt: payout.$createdAt,
      },
    });
  }

  /**
   * GET /api/v1/merchants/payouts
   *
   * Return paginated payout history for the authenticated merchant.
   */
  async getPayoutHistory(req, res) {
    const { user } = req;
    const { page = 1, limit = 20, status } = req.query;

    const merchant = await merchantService.getMerchantByOwner(user.id);

    if (!merchant) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        message: "Merchant account not found",
      });
    }

    const result = await payoutService.getMerchantPayouts(merchant.$id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    // Mask destinations in response
    const documents = result.documents.map((p) => ({
      ...p,
      destination: maskDest(p.destination),
    }));

    const totalPages = Math.ceil(result.total / parseInt(limit));

    res.paginated(
      documents,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: result.total,
        totalPages,
      },
      "Payout history retrieved",
    );
  }

  /**
   * GET /api/v1/merchants/payouts/:payoutId
   *
   * Get a single payout record. Enforces ownership.
   */
  async getPayoutDetail(req, res) {
    const { user } = req;
    const { payoutId } = req.params;

    const merchant = await merchantService.getMerchantByOwner(user.id);
    if (!merchant) {
      return res
        .status(404)
        .json({
          statusCode: 404,
          success: false,
          message: "Merchant not found",
        });
    }

    const payoutsCol = require("../config/environment").database.appwrite
      .payoutsCollectionId;
    if (!payoutsCol) {
      return res
        .status(404)
        .json({ statusCode: 404, success: false, message: "Payout not found" });
    }

    const { appwrite: dbConn } = require("../database/connection");
    const db = dbConn.getDatabases();
    const config = require("../config/environment");

    const payout = await db.getDocument(
      config.database.appwrite.databaseId,
      payoutsCol,
      payoutId,
    );

    // Ownership check — merchant can only view own payouts
    if (payout.merchantId !== merchant.$id) {
      return res
        .status(403)
        .json({ statusCode: 403, success: false, message: "Access denied" });
    }

    res.success(
      { ...payout, destination: maskDest(payout.destination) },
      "Payout details retrieved",
    );
  }

  /**
   * GET /api/v1/merchants/wallet-balance
   *
   * Return the authenticated merchant's current wallet balance.
   */
  async getWalletBalance(req, res) {
    const { user } = req;

    const merchant = await merchantService.getMerchantByOwner(user.id);

    if (!merchant) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        message: "Merchant account not found",
      });
    }

    if (merchant.status !== "approved") {
      return res.success(
        { balance: 0, currency: "USD", status: merchant.status },
        "Merchant not yet approved",
      );
    }

    const wallet = merchant.wallet || null;
    const balance = wallet ? parseFloat(wallet.balance || 0) : 0;
    const currency = wallet?.currency || "USD";

    res.success(
      {
        merchantId: merchant.$id,
        balance,
        currency,
        walletId: wallet?.$id || null,
      },
      "Wallet balance retrieved",
    );
  }
}

module.exports = new PayoutController();
