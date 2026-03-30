/**
 * Merchant Controller
 *
 * HTTP handlers for merchant-facing endpoints:
 *   POST   /api/v1/merchants/register    — register new merchant
 *   GET    /api/v1/merchants/me          — get own merchant profile
 *   GET    /api/v1/merchants/analytics   — get own merchant analytics
 *
 * Admin endpoints are handled in adminController.js and dispatched via /api/v1/admin/merchants.
 */

"use strict";

const config = require("../config/environment");
const logger = require("../utils/logger");
const auditService = require("../services/auditService");
const merchantService = require("../services/merchantService");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");
const emailService = require("../services/emailService");

// Lazy require to avoid circular deps at module load time
const getCreateAdminNotification = () =>
  require("../services/notificationService").createAdminNotification;

class MerchantController {
  /**
   * POST /api/v1/merchants/register
   *
   * Register a new merchant application.
   * The authenticated user becomes the merchant owner (ownerId = req.user.id).
   * Returns 409 if the user already has a merchant account.
   */
  async register(req, res) {
    const { user } = req;
    const { businessName, businessType, phoneNumber } = req.body;

    // Service validates inputs and checks for duplicates
    const merchant = await merchantService.register({
      ownerId: user.id,
      businessName,
      businessType,
      phoneNumber,
    });

    // Audit log
    auditService.logAction({
      actorId: user.id,
      actorRole: "user",
      action: "MERCHANT_REGISTERED",
      entity: "merchant",
      entityId: merchant.$id,
      metadata: {
        businessName: merchant.businessName,
        businessType: merchant.businessType,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "",
    });

    // Notify admins about a new application (non-blocking)
    getCreateAdminNotification()(
      "merchant",
      "New Merchant Application",
      `${merchant.businessName} has submitted a merchant application pending review`,
      { link: `/merchants/${merchant.$id}` },
    );

    // Non-blocking confirmation email to applicant
    merchantService
      .getOwnerInfo(user.id)
      .then(({ email, firstName }) => {
        const recipientEmail = email || user.email;
        return emailService.sendMerchantApplicationReceivedEmail(
          recipientEmail,
          firstName,
          merchant.businessName,
        );
      })
      .catch((err) =>
        logger.warn(
          "MerchantController: application received email failed (non-fatal)",
          {
            userId: user.id,
            error: err.message,
          },
        ),
      );

    logger.info("MerchantController: registration successful", {
      merchantId: merchant.$id,
      ownerId: user.id,
    });

    res.created(
      {
        merchantId: merchant.$id,
        status: merchant.status,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        phoneNumber: merchant.phoneNumber,
        $createdAt: merchant.createdAt,
      },
      "Merchant application submitted successfully. You will be notified once your account is reviewed.",
    );
  }

  /**
   * GET /api/v1/merchants/me
   *
   * Returns the authenticated user's merchant profile.
   * Includes wallet balance if the merchant is approved.
   */
  async getMyMerchant(req, res) {
    const { user } = req;

    const merchant = await merchantService.getMerchantByOwner(user.id);

    if (!merchant) {
      throw new NotFoundError("Merchant profile");
    }

    res.success(merchant, "Merchant profile retrieved successfully");
  }

  /**
   * GET /api/v1/merchants/analytics
   *
   * Returns analytics for the authenticated user's approved merchant.
   * Query params: period (day | week | month | quarter | year)
   */
  async getAnalytics(req, res) {
    const { user } = req;
    const { period = "month" } = req.query;

    const merchant = await merchantService.getMerchantByOwner(user.id);

    if (!merchant) {
      throw new NotFoundError("Merchant profile");
    }

    if (merchant.status !== "approved") {
      throw new AuthorizationError(
        `Analytics are only available for approved merchants. Current status: ${merchant.status}`,
      );
    }

    const analytics = await merchantService.getAnalytics(merchant.$id, {
      period,
    });

    res.success(
      {
        merchant: {
          merchantId: merchant.$id,
          businessName: merchant.businessName,
          tillNumber: merchant.tillNumber,
          wallet: merchant.wallet || null,
        },
        analytics,
      },
      "Merchant analytics retrieved successfully",
    );
  }
}

module.exports = new MerchantController();
