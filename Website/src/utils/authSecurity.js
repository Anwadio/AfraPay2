// Security utilities for authentication
export class AuthSecurity {
  static #loginAttempts = new Map();
  static #rateLimitWindow = 15 * 60 * 1000; // 15 minutes
  static #maxAttempts = 5;

  /**
   * Rate limiting for login attempts
   * @param {string} identifier - Email or IP address
   * @returns {Object} - { allowed: boolean, attemptsLeft: number, resetTime: Date }
   */
  static checkRateLimit(identifier) {
    const now = Date.now();
    const userAttempts = this.#loginAttempts.get(identifier) || {
      count: 0,
      firstAttempt: now,
    };

    // Reset attempts if window has passed
    if (now - userAttempts.firstAttempt > this.#rateLimitWindow) {
      this.#loginAttempts.set(identifier, { count: 0, firstAttempt: now });
      return {
        allowed: true,
        attemptsLeft: this.#maxAttempts,
        resetTime: null,
      };
    }

    // Check if max attempts exceeded
    if (userAttempts.count >= this.#maxAttempts) {
      const resetTime = new Date(
        userAttempts.firstAttempt + this.#rateLimitWindow
      );
      return { allowed: false, attemptsLeft: 0, resetTime };
    }

    return {
      allowed: true,
      attemptsLeft: this.#maxAttempts - userAttempts.count,
      resetTime: null,
    };
  }

  /**
   * Record a failed login attempt
   * @param {string} identifier - Email or IP address
   */
  static recordFailedAttempt(identifier) {
    const now = Date.now();
    const userAttempts = this.#loginAttempts.get(identifier) || {
      count: 0,
      firstAttempt: now,
    };

    // Reset if window has passed
    if (now - userAttempts.firstAttempt > this.#rateLimitWindow) {
      this.#loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    } else {
      this.#loginAttempts.set(identifier, {
        ...userAttempts,
        count: userAttempts.count + 1,
      });
    }
  }

  /**
   * Clear failed attempts (on successful login)
   * @param {string} identifier - Email or IP address
   */
  static clearFailedAttempts(identifier) {
    this.#loginAttempts.delete(identifier);
  }

  /**
   * Generate CSRF token
   * @returns {string} - CSRF token
   */
  static generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Validate CSRF token (placeholder for backend validation)
   * @param {string} token - CSRF token to validate
   * @returns {boolean} - Token validity
   */
  static validateCSRFToken(token) {
    // In a real app, this would validate against server-side token
    return typeof token === "string" && token.length === 64;
  }

  /**
   * Sanitize input to prevent XSS
   * @param {string} input - User input
   * @returns {string} - Sanitized input
   */
  static sanitizeInput(input) {
    if (typeof input !== "string") return "";

    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Generate secure password reset token
   * @returns {string} - Reset token
   */
  static generateResetToken() {
    const array = new Uint8Array(48);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Check if password was compromised (placeholder for API check)
   * @param {string} password - Password to check
   * @returns {Promise<boolean>} - Whether password is compromised
   */
  static async checkPasswordCompromised(password) {
    // In production, this would check against HaveIBeenPwned API
    // For now, just check against common passwords
    const commonPasswords = [
      "password",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password123",
      "admin",
      "letmein",
      "welcome",
      "monkey",
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Generate secure session ID
   * @returns {string} - Session ID
   */
  static generateSessionId() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Hash sensitive data (client-side hashing for additional security)
   * @param {string} data - Data to hash
   * @returns {Promise<string>} - Hashed data
   */
  static async hashData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Validate session timeout
   * @param {number} loginTime - Login timestamp
   * @param {number} maxAge - Maximum session age in milliseconds
   * @returns {boolean} - Whether session is still valid
   */
  static isSessionValid(loginTime, maxAge = 24 * 60 * 60 * 1000) {
    // 24 hours default
    return Date.now() - loginTime < maxAge;
  }

  /**
   * Create secure headers for requests
   * @returns {Object} - Security headers
   */
  static getSecurityHeaders() {
    return {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };
  }
}

/**
 * Device fingerprinting for additional security
 */
export class DeviceFingerprint {
  /**
   * Generate device fingerprint
   * @returns {Promise<string>} - Device fingerprint
   */
  static async generate() {
    const components = [
      navigator.userAgent,
      navigator.language,
      (typeof window.screen !== 'undefined' ? window.screen.width + "x" + window.screen.height : 'unknown'),
      (typeof window.screen !== 'undefined' ? window.screen.colorDepth : 'unknown'),
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.cookieEnabled,
      navigator.doNotTrack || "unknown",
    ];

    const fingerprint = components.join("|");
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Detect unusual device characteristics that might indicate bot activity
   * @returns {Object} - Suspicion indicators
   */
  static detectSuspiciousActivity() {
    const indicators = [];

    // Check for headless browser indicators
    if (navigator.webdriver) {
      indicators.push("webdriver_detected");
    }

    // Check for unusual screen dimensions
    if (typeof window.screen !== 'undefined' && (window.screen.width < 100 || window.screen.height < 100)) {
      indicators.push("unusual_screen_size");
    }

    // Check for missing features that real browsers have
    if (!window.speechSynthesis) {
      indicators.push("missing_speech_synthesis");
    }

    // Check for automation frameworks
    if (window.phantom || window._phantom || window.callPhantom) {
      indicators.push("phantom_detected");
    }

    if (window.selenium || document.documentElement.getAttribute("selenium")) {
      indicators.push("selenium_detected");
    }

    return {
      suspicious: indicators.length > 0,
      indicators,
      riskLevel:
        indicators.length === 0
          ? "low"
          : indicators.length < 3
            ? "medium"
            : "high",
    };
  }
}
