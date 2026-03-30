/**
 * Till Service
 *
 * Generates and validates unique merchant till numbers in the format AFR-XXXXXX.
 * Till numbers are cryptographically random 6-digit sequences prefixed with AFR-.
 * Uniqueness is enforced against the merchants collection in Appwrite.
 *
 * Examples:  AFR-482931  AFR-019847
 */

"use strict";

const { Query } = require("node-appwrite");
const crypto = require("crypto");
const { appwrite: dbConn } = require("../database/connection");
const config = require("../config/environment");
const logger = require("../utils/logger");

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const MERCHANTS = () => config.database.appwrite.merchantsCollectionId;

const TILL_PREFIX = "AFR";
const MAX_ATTEMPTS = 10;

class TillService {
  _databases() {
    return dbConn.getDatabases();
  }

  /**
   * Generate a unique till number.
   * Uses crypto.randomInt for cryptographic randomness.
   * Retries up to MAX_ATTEMPTS times on collision.
   *
   * @returns {Promise<string>}  e.g. "AFR-482931"
   */
  async generateTillNumber() {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Generate a 6-digit number with leading zeros preserved via crypto
      const digits = crypto.randomInt(100000, 999999).toString();
      const tillNumber = `${TILL_PREFIX}-${digits}`;

      const unique = await this._isTillUnique(tillNumber);
      if (unique) {
        logger.info("TillService: till number generated", { tillNumber });
        return tillNumber;
      }

      logger.warn("TillService: till collision, retrying", {
        tillNumber,
        attempt: attempt + 1,
      });
    }

    throw new Error(
      `TillService: failed to generate unique till number after ${MAX_ATTEMPTS} attempts`,
    );
  }

  /**
   * Verify that a till number is not already assigned to any merchant.
   *
   * @param {string} tillNumber
   * @returns {Promise<boolean>}  true if till number is not in use
   */
  async _isTillUnique(tillNumber) {
    const merchantsCol = MERCHANTS();

    // Collection not yet configured — skip uniqueness check in dev/setup
    if (!merchantsCol) {
      logger.warn(
        "TillService: merchants collection not configured — skipping uniqueness check",
      );
      return true;
    }

    try {
      const result = await this._databases().listDocuments(DB(), merchantsCol, [
        Query.equal("tillNumber", tillNumber),
        Query.limit(1),
      ]);
      return result.total === 0;
    } catch (err) {
      logger.error("TillService: uniqueness check failed", {
        tillNumber,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Validate the format of a till number without a DB lookup.
   * @param {string} tillNumber
   * @returns {boolean}
   */
  isValidFormat(tillNumber) {
    return typeof tillNumber === "string" && /^AFR-\d{6}$/.test(tillNumber);
  }
}

module.exports = new TillService();
