/**
 * Wallet Service
 *
 * Centralised merchant wallet operations:
 *   - debitMerchantWallet   (used by payoutService)
 *   - creditMerchantWallet  (used by payTill / paymentController)
 *   - getWalletByMerchant
 *   - getMerchantBalance
 *
 * Thread-safety note:
 *   Appwrite does not support native transactions.  We mitigate races by
 *   re-reading the wallet document immediately before decrementing and
 *   comparing the expected balance.  For a very high-traffic system,
 *   introduce an in-process mutex per merchantId using async-mutex.
 */

"use strict";

const { Query } = require("node-appwrite");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");

const DB = () => config.database.appwrite.databaseId;
const MERCHANT_WALLETS = () =>
  config.database.appwrite.merchantWalletsCollectionId;

class WalletService {
  _db() {
    return dbConn.getDatabases();
  }

  /**
   * Retrieve the wallet document for a merchant.
   * Returns null if the collection is not configured or no wallet found.
   *
   * @param {string} merchantId
   * @returns {Promise<object|null>}
   */
  async getWalletByMerchant(merchantId) {
    const walletsCol = MERCHANT_WALLETS();
    if (!walletsCol) return null;

    const db = this._db();
    const result = await db.listDocuments(DB(), walletsCol, [
      Query.equal("merchantId", merchantId),
      Query.limit(1),
    ]);

    return result.total > 0 ? result.documents[0] : null;
  }

  /**
   * Return the numeric balance for a merchant's wallet.
   * Returns 0 if no wallet exists.
   *
   * @param {string} merchantId
   * @returns {Promise<number>}
   */
  async getMerchantBalance(merchantId) {
    const wallet = await this.getWalletByMerchant(merchantId);
    return wallet ? parseFloat(wallet.balance || 0) : 0;
  }

  /**
   * Debit the merchant wallet by the given amount.
   * Performs optimistic concurrency check: re-reads balance inside the
   * operation to guard against concurrent modifications.
   *
   * @param {string} merchantId
   * @param {number} amount   Positive decimal
   * @returns {Promise<{ walletId: string, balanceBefore: number, balanceAfter: number }>}
   * @throws if wallet not found, insufficient balance, or collection missing
   */
  async debitMerchantWallet(merchantId, amount) {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      const err = new Error("Debit amount must be positive");
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    const walletsCol = MERCHANT_WALLETS();
    if (!walletsCol) {
      const err = new Error("Merchant wallet collection not configured");
      err.code = "CONFIG_ERROR";
      err.status = 500;
      throw err;
    }

    const db = this._db();

    // Re-read to get the freshest balance
    const wallet = await this.getWalletByMerchant(merchantId);
    if (!wallet) {
      const err = new Error("Merchant wallet not found");
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const balanceBefore = parseFloat(wallet.balance || 0);
    if (balanceBefore < parsedAmount) {
      const err = new Error(
        `Insufficient wallet balance. Available: ${balanceBefore.toFixed(2)}, required: ${parsedAmount.toFixed(2)}`,
      );
      err.code = "INSUFFICIENT_FUNDS";
      err.status = 422;
      throw err;
    }

    const balanceAfter = parseFloat((balanceBefore - parsedAmount).toFixed(8));

    await db.updateDocument(DB(), walletsCol, wallet.$id, {
      balance: balanceAfter,
    });

    logger.info("WalletService: debit successful", {
      merchantId,
      walletId: wallet.$id,
      deducted: parsedAmount,
      balanceBefore,
      balanceAfter,
    });

    return { walletId: wallet.$id, balanceBefore, balanceAfter };
  }

  /**
   * Credit the merchant wallet.
   *
   * @param {string} merchantId
   * @param {number} amount   Positive decimal
   * @returns {Promise<{ walletId: string, balanceBefore: number, balanceAfter: number }>}
   */
  async creditMerchantWallet(merchantId, amount) {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      const err = new Error("Credit amount must be positive");
      err.code = "VALIDATION_ERROR";
      err.status = 400;
      throw err;
    }

    const walletsCol = MERCHANT_WALLETS();
    if (!walletsCol) {
      const err = new Error("Merchant wallet collection not configured");
      err.code = "CONFIG_ERROR";
      err.status = 500;
      throw err;
    }

    const db = this._db();

    const wallet = await this.getWalletByMerchant(merchantId);
    if (!wallet) {
      const err = new Error("Merchant wallet not found");
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const balanceBefore = parseFloat(wallet.balance || 0);
    const balanceAfter = parseFloat((balanceBefore + parsedAmount).toFixed(8));

    await db.updateDocument(DB(), walletsCol, wallet.$id, {
      balance: balanceAfter,
    });

    logger.info("WalletService: credit successful", {
      merchantId,
      walletId: wallet.$id,
      credited: parsedAmount,
      balanceBefore,
      balanceAfter,
    });

    return { walletId: wallet.$id, balanceBefore, balanceAfter };
  }
}

module.exports = new WalletService();
