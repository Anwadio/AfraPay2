/**
 * Newsletter Controller
 * Handles newsletter subscription management
 */

const { Client, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");

class NewsletterController {
  constructor() {
    this.client = new Client()
      .setEndpoint(config.database.appwrite.endpoint)
      .setProject(config.database.appwrite.projectId)
      .setKey(config.database.appwrite.apiKey);

    this.databases = new Databases(this.client);
    this.databaseId = config.database.appwrite.databaseId;
    this.collectionId = config.database.appwrite.newsletterCollectionId;
  }

  /**
   * Subscribe to newsletter
   */
  async subscribe(req, res) {
    try {
      const { email, source = "website", interests = [] } = req.body;

      // Validate email
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required",
        });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      // Check if email already exists
      try {
        const existing = await this.databases.listDocuments(
          this.databaseId,
          this.collectionId,
          [Query.equal("email", email)],
        );

        if (existing.documents.length > 0) {
          return res.status(409).json({
            success: false,
            message: "This email is already subscribed to our newsletter",
          });
        }
      } catch (error) {
        logger.error("Error checking existing subscription:", error);
      }

      // Create subscription
      const subscription = await this.databases.createDocument(
        this.databaseId,
        this.collectionId,
        ID.unique(),
        {
          email,
          source,
          interests,
          subscribedAt: new Date().toISOString(),
          isActive: true,
          preferences: {
            blog: true,
            productUpdates: true,
            financialTips: true,
          },
        },
      );

      logger.info(`New newsletter subscription: ${email}`);

      res.status(201).json({
        success: true,
        message: "Successfully subscribed to newsletter!",
        data: {
          subscriptionId: subscription.$id,
          email: subscription.email,
          subscribedAt: subscription.subscribedAt,
        },
      });
    } catch (error) {
      logger.error("Newsletter subscription error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process newsletter subscription",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Unsubscribe from newsletter
   */
  async unsubscribe(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required",
        });
      }

      // Find subscription
      const existing = await this.databases.listDocuments(
        this.databaseId,
        this.collectionId,
        [Query.equal("email", email)],
      );

      if (existing.documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Email address not found in our newsletter list",
        });
      }

      // Update subscription status
      await this.databases.updateDocument(
        this.databaseId,
        this.collectionId,
        existing.documents[0].$id,
        {
          isActive: false,
          unsubscribedAt: new Date().toISOString(),
        },
      );

      logger.info(`Newsletter unsubscription: ${email}`);

      res.json({
        success: true,
        message: "Successfully unsubscribed from newsletter",
      });
    } catch (error) {
      logger.error("Newsletter unsubscription error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process unsubscription",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Update subscription preferences
   */
  async updatePreferences(req, res) {
    try {
      const { email, preferences } = req.body;

      if (!email || !preferences) {
        return res.status(400).json({
          success: false,
          message: "Email and preferences are required",
        });
      }

      // Find subscription
      const existing = await this.databases.listDocuments(
        this.databaseId,
        this.collectionId,
        [Query.equal("email", email), Query.equal("isActive", true)],
      );

      if (existing.documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active subscription not found for this email address",
        });
      }

      // Update preferences
      await this.databases.updateDocument(
        this.databaseId,
        this.collectionId,
        existing.documents[0].$id,
        {
          preferences,
          updatedAt: new Date().toISOString(),
        },
      );

      res.json({
        success: true,
        message: "Newsletter preferences updated successfully",
        data: {
          email,
          preferences,
        },
      });
    } catch (error) {
      logger.error("Newsletter preferences update error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update preferences",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get all newsletter subscribers (Admin only)
   */
  async getSubscribers(req, res) {
    try {
      const { page = 1, limit = 50, active = true } = req.query;
      const offset = (page - 1) * limit;

      const queries = [
        Query.limit(parseInt(limit)),
        Query.offset(offset),
        Query.orderDesc("subscribedAt"),
      ];

      if (active !== undefined) {
        queries.push(Query.equal("isActive", active === "true"));
      }

      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collectionId,
        queries,
      );

      res.json({
        success: true,
        data: {
          subscribers: result.documents.map((doc) => ({
            id: doc.$id,
            email: doc.email,
            source: doc.source,
            interests: doc.interests,
            subscribedAt: doc.subscribedAt,
            isActive: doc.isActive,
            preferences: doc.preferences,
          })),
          pagination: {
            total: result.total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching newsletter subscribers:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch subscribers",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

const newsletterController = new NewsletterController();

module.exports = {
  subscribe: (req, res) => newsletterController.subscribe(req, res),
  unsubscribe: (req, res) => newsletterController.unsubscribe(req, res),
  updatePreferences: (req, res) =>
    newsletterController.updatePreferences(req, res),
  getSubscribers: (req, res) => newsletterController.getSubscribers(req, res),
};
