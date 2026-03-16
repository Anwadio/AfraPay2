# Security Boundaries & Implementation

## Security Architecture Overview

AfraPay implements defense-in-depth security with multiple layers of protection to ensure financial transaction integrity and regulatory compliance.

## Network Security Boundaries

### 1. Perimeter Security (DMZ Zone)

```
Internet → [WAF] → [DDoS Protection] → [Load Balancer] → [Application]
            ↓           ↓                    ↓              ↓
        [Block Bad]  [Rate Limit]      [SSL/TLS Term]   [Health Check]
        [Requests]   [Traffic Spike]    [Certificate]    [Routing]
```

**Components:**

- **Web Application Firewall (WAF)**

  - SQL injection protection
  - XSS attack prevention
  - OWASP Top 10 rule sets
  - Custom fintech security rules
  - Real-time threat intelligence

- **DDoS Protection**
  - Layer 3/4 volumetric attack mitigation
  - Layer 7 application-layer attack defense
  - Automatic traffic analysis and filtering
  - Emergency traffic diversion capabilities

### 2. Application Security Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐│
│  │   React     │  │  API Gateway │  │   Business Logic    ││
│  │  Frontend   │◄►│  (Express)   │◄►│    Services         ││
│  │             │  │              │  │                     ││
│  └─────────────┘  └──────────────┘  └─────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
        ↑                    ↑                       ↑
   [Input Valid]      [Auth & Author]         [Business Rules]
   [XSS Protection]   [Rate Limiting]         [Fraud Detection]
   [CSRF Tokens]      [JWT Validation]        [Transaction Limits]
```

### 3. Data Security Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐│
│  │  Appwrite   │  │   Encrypted  │  │    Audit Logs      ││
│  │  Database   │  │   File Store │  │    & Monitoring     ││
│  │             │  │              │  │                     ││
│  └─────────────┘  └──────────────┘  └─────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
        ↑                    ↑                       ↑
   [Encryption]        [Key Management]          [Access Control]
   [Backup/Recovery]   [Secure Storage]          [Audit Trail]
   [Access Logs]       [Data Classification]     [Compliance Logging]
```

## Application Security Implementation

### Input Validation & Sanitization

```javascript
// Frontend Validation (React)
const validatePaymentAmount = (amount) => {
  const sanitized = DOMPurify.sanitize(amount.toString());
  const parsed = parseFloat(sanitized);

  if (isNaN(parsed) || parsed <= 0) {
    throw new ValidationError("Invalid amount");
  }

  if (parsed > 10000) {
    // Daily limit
    throw new ValidationError("Amount exceeds daily limit");
  }

  return parsed;
};

// Backend Validation (Express)
const paymentValidation = [
  body("amount")
    .isNumeric()
    .withMessage("Amount must be numeric")
    .custom((value) => {
      if (value <= 0 || value > 10000) {
        throw new Error("Invalid amount range");
      }
      return true;
    }),
  body("recipient")
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid recipient email"),
  body("description")
    .trim()
    .escape()
    .isLength({ max: 200 })
    .withMessage("Description too long"),
];
```

### Cross-Site Scripting (XSS) Protection

```javascript
// Content Security Policy Headers
const cspConfig = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", "data:", "*.amazonaws.com"],
  connectSrc: ["'self'", "*.appwrite.io"],
  fontSrc: ["'self'", "fonts.gstatic.com"],
  objectSrc: ["'none'"],
  mediaSrc: ["'none'"],
  frameSrc: ["'none'"],
};

// React Component XSS Protection
const TransactionDescription = ({ description }) => {
  const sanitizedDescription = DOMPurify.sanitize(description, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return <p>{sanitizedDescription}</p>;
};
```

### Cross-Site Request Forgery (CSRF) Protection

```javascript
// CSRF Token Implementation
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Middleware for CSRF Protection
const csrfProtection = (req, res, next) => {
  if (req.method === "GET") return next();

  const token = req.headers["x-csrf-token"];
  const sessionToken = req.session.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
};

// React Integration
const useCSRFToken = () => {
  const [csrfToken, setCsrfToken] = useState(null);

  useEffect(() => {
    api.get("/csrf-token").then((response) => {
      setCsrfToken(response.data.token);
    });
  }, []);

  return csrfToken;
};
```

## Data Protection & Privacy

### Encryption Implementation

```javascript
// Field-Level Encryption
const encryptSensitiveData = (data, field) => {
  const algorithm = "aes-256-gcm";
  const key = process.env.ENCRYPTION_KEY; // 32 bytes key
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipher(algorithm, key, iv);
  let encrypted = cipher.update(data[field], "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    ...data,
    [field]: {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    },
  };
};

// PII Data Masking for Logs
const maskSensitiveData = (data) => {
  const masked = { ...data };

  if (masked.email) {
    masked.email = masked.email.replace(/(.{2}).*(@.*)/, "$1***$2");
  }

  if (masked.phone) {
    masked.phone = masked.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2");
  }

  if (masked.accountNumber) {
    masked.accountNumber = "****" + masked.accountNumber.slice(-4);
  }

  return masked;
};
```

### Key Management

```javascript
// Key Rotation Service
class KeyManager {
  constructor() {
    this.currentKey = process.env.CURRENT_ENCRYPTION_KEY;
    this.previousKeys = JSON.parse(process.env.PREVIOUS_KEYS || "[]");
  }

  rotateKey() {
    const newKey = crypto.randomBytes(32).toString("hex");
    this.previousKeys.push(this.currentKey);
    this.currentKey = newKey;

    // Update environment variables
    process.env.CURRENT_ENCRYPTION_KEY = newKey;
    process.env.PREVIOUS_KEYS = JSON.stringify(this.previousKeys);
  }

  decryptWithFallback(encryptedData) {
    try {
      return this.decrypt(encryptedData, this.currentKey);
    } catch (error) {
      // Try previous keys
      for (const oldKey of this.previousKeys) {
        try {
          return this.decrypt(encryptedData, oldKey);
        } catch (e) {
          continue;
        }
      }
      throw new Error("Unable to decrypt data with any available key");
    }
  }
}
```

## Access Control & Authorization

### Role-Based Access Control (RBAC)

```javascript
// Permission Matrix
const permissions = {
  // User Management
  "user:read": ["USER", "ADMIN", "SUPPORT"],
  "user:write": ["ADMIN"],
  "user:delete": ["ADMIN"],

  // Payment Operations
  "payment:send": ["USER", "VERIFIED_USER"],
  "payment:receive": ["USER", "VERIFIED_USER"],
  "payment:high_amount": ["VERIFIED_USER"],
  "payment:admin": ["ADMIN"],

  // System Operations
  "system:monitor": ["ADMIN", "SUPPORT"],
  "system:configure": ["ADMIN"],
  "audit:view": ["ADMIN", "COMPLIANCE"],
};

// Middleware for Permission Checking
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const userRoles = user.labels.roles || [];
      const allowedRoles = permissions[permission] || [];

      const hasPermission = userRoles.some((role) =>
        allowedRoles.includes(role)
      );

      if (!hasPermission) {
        await auditLogger.logUnauthorizedAccess({
          userId: user.$id,
          permission,
          userRoles,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        return res.status(403).json({
          error: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
};
```

### Resource-Level Access Control

```javascript
// Transaction Access Control
const canAccessTransaction = async (userId, transactionId) => {
  const transaction = await appwrite.database.getDocument(
    "transactions",
    transactionId
  );

  // Users can only access their own transactions
  if (transaction.senderId === userId || transaction.recipientId === userId) {
    return true;
  }

  // Admins can access any transaction
  const user = await appwrite.users.get(userId);
  const userRoles = user.labels.roles || [];

  return userRoles.includes("ADMIN") || userRoles.includes("SUPPORT");
};

// Middleware Implementation
const transactionAccess = async (req, res, next) => {
  const { transactionId } = req.params;
  const userId = req.user.$id;

  if (!(await canAccessTransaction(userId, transactionId))) {
    return res.status(403).json({ error: "Access denied" });
  }

  next();
};
```

## Fraud Detection & Prevention

### Real-time Fraud Scoring

```javascript
class FraudDetectionEngine {
  async calculateRiskScore(transaction, user) {
    let riskScore = 0;

    // Velocity checks
    const recentTransactions = await this.getRecentTransactions(user.$id, "1h");
    if (recentTransactions.length > 5) riskScore += 30;

    // Amount anomaly
    const avgAmount = await this.getAverageTransactionAmount(user.$id);
    if (transaction.amount > avgAmount * 3) riskScore += 25;

    // Time-based checks
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) riskScore += 10;

    // Geographic anomaly
    const lastKnownLocation = user.lastKnownLocation;
    const currentLocation = await this.getLocationFromIP(transaction.ipAddress);
    if (this.calculateDistance(lastKnownLocation, currentLocation) > 1000) {
      riskScore += 40;
    }

    // Device fingerprint
    if (transaction.deviceFingerprint !== user.knownDeviceFingerprint) {
      riskScore += 20;
    }

    return Math.min(riskScore, 100);
  }

  async processTransaction(transaction) {
    const riskScore = await this.calculateRiskScore(
      transaction,
      transaction.user
    );

    if (riskScore > 80) {
      // Block and require manual review
      return { action: "BLOCK", reason: "High risk score" };
    } else if (riskScore > 50) {
      // Require additional verification
      return { action: "CHALLENGE", reason: "Medium risk score" };
    }

    return { action: "ALLOW", riskScore };
  }
}
```

## Security Monitoring & Incident Response

### Security Event Logging

```javascript
class SecurityLogger {
  async logSecurityEvent(eventType, details) {
    const event = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: eventType,
      severity: this.getSeverity(eventType),
      details: maskSensitiveData(details),
      source: "afrapay-api",
      version: "1.0.0",
    };

    // Log to multiple destinations
    await Promise.all([
      this.logToDatabase(event),
      this.logToSIEM(event),
      this.sendToMonitoring(event),
    ]);

    // Send alerts for high severity events
    if (event.severity === "HIGH") {
      await this.sendSecurityAlert(event);
    }
  }

  getSeverity(eventType) {
    const severityMap = {
      LOGIN_FAILED: "LOW",
      MFA_BYPASS_ATTEMPT: "HIGH",
      SUSPICIOUS_TRANSACTION: "MEDIUM",
      DATA_BREACH_ATTEMPT: "CRITICAL",
      UNAUTHORIZED_ACCESS: "HIGH",
    };

    return severityMap[eventType] || "MEDIUM";
  }
}
```

### Automated Incident Response

```javascript
class IncidentResponseSystem {
  async handleSecurityIncident(event) {
    const response = await this.analyzeIncident(event);

    switch (response.action) {
      case "AUTO_BLOCK":
        await this.blockUser(event.userId);
        await this.notifySecurityTeam(event, "User automatically blocked");
        break;

      case "RATE_LIMIT":
        await this.applyRateLimit(event.ipAddress);
        await this.logIncident(event, "Rate limit applied");
        break;

      case "MANUAL_REVIEW":
        await this.queueForReview(event);
        await this.notifySecurityTeam(event, "Manual review required");
        break;

      case "IGNORE":
        await this.logIncident(event, "Event ignored - false positive");
        break;
    }
  }

  async analyzeIncident(event) {
    // Machine learning-based incident analysis
    const pattern = await this.detectPattern(event);
    const severity = this.calculateSeverity(event);
    const confidence = await this.calculateConfidence(event);

    if (severity === "CRITICAL" && confidence > 0.9) {
      return { action: "AUTO_BLOCK" };
    }

    if (severity === "HIGH" && confidence > 0.7) {
      return { action: "MANUAL_REVIEW" };
    }

    return { action: "MONITOR" };
  }
}
```

## Compliance & Audit Controls

### PCI DSS Compliance

```javascript
// Cardholder Data Environment (CDE) Controls
const pciControls = {
  dataEncryption: {
    algorithm: "AES-256",
    keyRotation: "90days",
    implementation: "field-level",
  },

  accessControl: {
    principleOfLeastPrivilege: true,
    roleBasedAccess: true,
    multiFactorAuth: "required",
  },

  networkSecurity: {
    firewall: "enabled",
    networkSegmentation: true,
    intrusionDetection: "active",
  },

  vulnerabilityManagement: {
    regularScanning: "weekly",
    patchManagement: "automated",
    penetrationTesting: "quarterly",
  },
};
```

### Audit Trail Implementation

```javascript
class AuditTrail {
  async logUserAction(userId, action, resource, metadata = {}) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      action, // CREATE, READ, UPDATE, DELETE
      resource, // transaction, user, etc.
      resourceId: metadata.resourceId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      sessionId: metadata.sessionId,
      success: metadata.success ?? true,
      errorMessage: metadata.errorMessage,
      changesSummary: metadata.changes,
      riskScore: metadata.riskScore,
    };

    // Store in immutable audit log
    await appwrite.database.createDocument("audit_logs", auditEntry);

    // Send to external audit system
    await this.sendToExternalAuditSystem(auditEntry);
  }

  async generateComplianceReport(startDate, endDate) {
    const auditLogs = await appwrite.database.listDocuments("audit_logs", [
      Query.greaterThanEqual("timestamp", startDate),
      Query.lessThanEqual("timestamp", endDate),
    ]);

    return {
      period: { startDate, endDate },
      totalEvents: auditLogs.total,
      userActions: this.categorizeByAction(auditLogs.documents),
      securityEvents: this.filterSecurityEvents(auditLogs.documents),
      complianceViolations: this.identifyViolations(auditLogs.documents),
    };
  }
}
```

## Security Testing & Validation

### Penetration Testing Checklist

```javascript
const securityTestSuite = {
  authentication: [
    "test_password_brute_force",
    "test_session_fixation",
    "test_jwt_tampering",
    "test_mfa_bypass",
  ],

  authorization: [
    "test_privilege_escalation",
    "test_horizontal_access_control",
    "test_vertical_access_control",
  ],

  inputValidation: [
    "test_sql_injection",
    "test_xss_reflection",
    "test_xss_stored",
    "test_command_injection",
  ],

  dataProtection: [
    "test_encryption_strength",
    "test_key_management",
    "test_data_leakage",
    "test_backup_security",
  ],
};
```
