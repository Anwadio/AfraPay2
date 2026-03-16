/**
 * Webhook Controller
 * Handles incoming webhooks from external payment processors
 */

const crypto = require('crypto');
const { Client, Databases, ID } = require('node-appwrite');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { ValidationError } = require('../middleware/monitoring/errorHandler');

// Initialize Appwrite clients
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const databases = new Databases(client);

class WebhookController {
  /**
   * Handle Stripe webhooks
   */
  async handleStripe(req, res) {
    try {
      const signature = req.webhookSignature;
      const payload = req.rawPayload;

      // Verify Stripe signature
      const isValid = this.verifyStripeSignature(payload, signature);
      if (!isValid) {
        throw new ValidationError('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      
      // Log webhook received
      logger.info('Stripe webhook received', {
        eventType: event.type,
        eventId: event.id,
        ip: req.ip
      });

      // Process webhook based on event type
      await this.processStripeEvent(event);

      // Store webhook log
      await this.storeWebhookLog({
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        payload: payload,
        status: 'success',
        processedAt: new Date().toISOString(),
        ipAddress: req.ip
      });

      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Stripe webhook processing failed', {
        error: error.message,
        payload: req.rawPayload,
        ip: req.ip
      });

      // Store failed webhook log
      await this.storeWebhookLog({
        provider: 'stripe',
        eventType: req.body?.type || 'unknown',
        payload: req.rawPayload,
        status: 'failed',
        error: error.message,
        processedAt: new Date().toISOString(),
        ipAddress: req.ip
      });

      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle Paystack webhooks
   */
  async handlePaystack(req, res) {
    try {
      const signature = req.webhookSignature;
      const payload = req.rawPayload;

      // Verify Paystack signature
      const isValid = this.verifyPaystackSignature(payload, signature);
      if (!isValid) {
        throw new ValidationError('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      
      logger.info('Paystack webhook received', {
        eventType: event.event,
        reference: event.data?.reference,
        ip: req.ip
      });

      // Process webhook based on event type
      await this.processPaystackEvent(event);

      // Store webhook log
      await this.storeWebhookLog({
        provider: 'paystack',
        eventType: event.event,
        reference: event.data?.reference,
        payload: payload,
        status: 'success',
        processedAt: new Date().toISOString(),
        ipAddress: req.ip
      });

      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Paystack webhook processing failed', {
        error: error.message,
        payload: req.rawPayload,
        ip: req.ip
      });

      await this.storeWebhookLog({
        provider: 'paystack',
        eventType: req.body?.event || 'unknown',
        payload: req.rawPayload,
        status: 'failed',
        error: error.message,
        processedAt: new Date().toISOString(),
        ipAddress: req.ip
      });

      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle Flutterwave webhooks
   */
  async handleFlutterwave(req, res) {
    try {
      const signature = req.webhookSignature;
      const payload = req.rawPayload;

      // Verify Flutterwave signature
      const isValid = this.verifyFlutterwaveSignature(payload, signature);
      if (!isValid) {
        throw new ValidationError('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      
      logger.info('Flutterwave webhook received', {
        eventType: event.event,
        transactionId: event.data?.id,
        ip: req.ip
      });

      // Process webhook
      await this.processFlutterwaveEvent(event);

      await this.storeWebhookLog({
        provider: 'flutterwave',
        eventType: event.event,
        transactionId: event.data?.id,
        payload: payload,
        status: 'success',
        processedAt: new Date().toISOString(),
        ipAddress: req.ip
      });

      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Flutterwave webhook processing failed', {
        error: error.message,
        payload: req.rawPayload,
        ip: req.ip
      });

      await this.storeWebhookLog({
        provider: 'flutterwave',
        eventType: req.body?.event || 'unknown',
        payload: req.rawPayload,
        status: 'failed',
        error: error.message,
        processedAt: new Date().toISOString(),
        ipAddress: req.ip
      });

      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle test webhooks (development only)
   */
  async handleTestWebhook(req, res) {
    try {
      const { provider, event, data } = req.body;
      
      logger.info('Test webhook received', {
        provider,
        event,
        data,
        ip: req.ip
      });

      // Store test webhook log
      await this.storeWebhookLog({
        provider: `test_${provider}`,
        eventType: event,
        payload: JSON.stringify(req.body),
        status: 'success',
        processedAt: new Date().toISOString(),
        ipAddress: req.ip
      });

      res.status(200).json({ 
        received: true, 
        message: 'Test webhook processed successfully' 
      });

    } catch (error) {
      logger.error('Test webhook processing failed', {
        error: error.message,
        body: req.body,
        ip: req.ip
      });

      res.status(500).json({ error: 'Test webhook processing failed' });
    }
  }

  /**
   * Get webhook logs (Admin only)
   */
  async getWebhookLogs(req, res) {
    try {
      const { 
        provider, 
        status, 
        startDate, 
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const queries = [];
      if (provider) queries.push(`provider=${provider}`);
      if (status) queries.push(`status=${status}`);
      if (startDate) queries.push(`processedAt>=${startDate}`);
      if (endDate) queries.push(`processedAt<=${endDate}`);

      const webhookLogs = await databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.webhookLogsId,
        queries,
        parseInt(limit),
        (parseInt(page) - 1) * parseInt(limit),
        '$createdAt',
        'DESC'
      );

      const logData = webhookLogs.documents.map(log => ({
        id: log.$id,
        provider: log.provider,
        eventType: log.eventType,
        status: log.status,
        processedAt: log.processedAt,
        error: log.error,
        ipAddress: log.ipAddress
      }));

      const totalPages = Math.ceil(webhookLogs.total / parseInt(limit));

      res.paginated(logData, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: webhookLogs.total,
        totalPages
      }, 'Webhook logs retrieved successfully');

    } catch (error) {
      logger.error('Get webhook logs failed', {
        adminId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(req, res) {
    try {
      const { period = 'day' } = req.query;
      
      // Calculate date range
      const dateRange = this.calculateDateRange(period);
      
      // Get webhook statistics
      const stats = await this.calculateWebhookStats(dateRange.start, dateRange.end);
      
      res.success(stats, 'Webhook statistics retrieved successfully');

    } catch (error) {
      logger.error('Get webhook stats failed', {
        adminId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods for webhook signature verification

  verifyStripeSignature(payload, signature) {
    try {
      const secret = config.webhooks.stripe.secret;
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      const expectedSignature = `sha256=${computedSignature}`;
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Stripe signature verification failed', { error: error.message });
      return false;
    }
  }

  verifyPaystackSignature(payload, signature) {
    try {
      const secret = config.webhooks.paystack.secret;
      const computedSignature = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      logger.error('Paystack signature verification failed', { error: error.message });
      return false;
    }
  }

  verifyFlutterwaveSignature(payload, signature) {
    try {
      const secret = config.webhooks.flutterwave.secret;
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      logger.error('Flutterwave signature verification failed', { error: error.message });
      return false;
    }
  }

  // Event processing methods

  async processStripeEvent(event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess({
          provider: 'stripe',
          transactionId: event.data.object.id,
          amount: event.data.object.amount / 100, // Stripe amounts are in cents
          currency: event.data.object.currency.toUpperCase(),
          metadata: event.data.object.metadata
        });
        break;
      
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure({
          provider: 'stripe',
          transactionId: event.data.object.id,
          error: event.data.object.last_payment_error?.message
        });
        break;
        
      default:
        logger.info('Unhandled Stripe event type', { eventType: event.type });
    }
  }

  async processPaystackEvent(event) {
    switch (event.event) {
      case 'charge.success':
        await this.handlePaymentSuccess({
          provider: 'paystack',
          transactionId: event.data.reference,
          amount: event.data.amount / 100, // Paystack amounts are in kobo
          currency: event.data.currency,
          metadata: event.data.metadata
        });
        break;
        
      case 'charge.failed':
        await this.handlePaymentFailure({
          provider: 'paystack',
          transactionId: event.data.reference,
          error: event.data.gateway_response
        });
        break;
        
      default:
        logger.info('Unhandled Paystack event type', { eventType: event.event });
    }
  }

  async processFlutterwaveEvent(event) {
    switch (event.event) {
      case 'charge.completed':
        if (event.data.status === 'successful') {
          await this.handlePaymentSuccess({
            provider: 'flutterwave',
            transactionId: event.data.flw_ref,
            amount: event.data.amount,
            currency: event.data.currency,
            metadata: event.data.meta
          });
        }
        break;
        
      default:
        logger.info('Unhandled Flutterwave event type', { eventType: event.event });
    }
  }

  async handlePaymentSuccess(paymentData) {
    try {
      // Update payment status in database
      // TODO: Find and update the corresponding payment record
      logger.info('Payment successful', paymentData);
      
      // Send notification to user
      // TODO: Implement notification service
      
    } catch (error) {
      logger.error('Handle payment success failed', {
        paymentData,
        error: error.message
      });
    }
  }

  async handlePaymentFailure(paymentData) {
    try {
      // Update payment status in database
      // TODO: Find and update the corresponding payment record
      logger.error('Payment failed', paymentData);
      
      // Send notification to user
      // TODO: Implement notification service
      
    } catch (error) {
      logger.error('Handle payment failure failed', {
        paymentData,
        error: error.message
      });
    }
  }

  async storeWebhookLog(logData) {
    try {
      await databases.createDocument(
        config.database.appwrite.databaseId,
        config.collections.webhookLogsId,
        ID.unique(),
        {
          ...logData,
          createdAt: new Date().toISOString()
        }
      );
    } catch (error) {
      logger.error('Store webhook log failed', {
        logData,
        error: error.message
      });
    }
  }

  calculateDateRange(period) {
    const now = new Date();
    let start;

    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return { start, end: now };
  }

  async calculateWebhookStats(startDate, endDate) {
    // TODO: Calculate actual webhook statistics from database
    return {
      totalWebhooks: 1250,
      successfulWebhooks: 1180,
      failedWebhooks: 70,
      successRate: 94.4,
      byProvider: {
        stripe: { total: 650, success: 625, failed: 25 },
        paystack: { total: 400, success: 385, failed: 15 },
        flutterwave: { total: 200, success: 170, failed: 30 }
      },
      recentFailures: [
        {
          provider: 'stripe',
          eventType: 'payment_intent.succeeded',
          error: 'Invalid signature',
          timestamp: new Date().toISOString()
        }
      ]
    };
  }
}

module.exports = new WebhookController();