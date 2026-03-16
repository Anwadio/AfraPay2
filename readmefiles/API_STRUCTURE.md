# API Structure & Documentation

## API Architecture Overview

AfraPay's API follows RESTful design principles with GraphQL capabilities for complex queries, built on Express.js with comprehensive security, validation, and monitoring.

## API Design Principles

### REST API Standards

- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Status Codes**: Standard HTTP status codes with consistent error responses
- **Resource Naming**: Plural nouns for collections (`/users`, `/transactions`)
- **Versioning**: URL-based versioning (`/api/v1/`, `/api/v2/`)
- **HATEOAS**: Hypermedia links for resource navigation

### API Base Structure

```
https://api.afrapay.com/v1/
├── auth/          # Authentication endpoints
├── users/         # User management
├── wallets/       # Wallet operations
├── payments/      # Payment processing
├── transactions/  # Transaction history
├── kyc/           # KYC verification
├── admin/         # Administrative functions
└── webhooks/      # Webhook endpoints
```

## Authentication API

### POST /auth/register

```javascript
// Request
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "country": "US"
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "userId": "user_123456789",
    "status": "pending_verification",
    "verificationRequired": ["email", "phone"]
  },
  "message": "Registration successful. Please verify your email and phone."
}

// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

### POST /auth/login

```javascript
// Request
{
  "identifier": "user@example.com", // email or phone
  "password": "SecurePass123!",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "deviceFingerprint": "abc123..."
  }
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900, // 15 minutes
    "tokenType": "Bearer",
    "user": {
      "id": "user_123456789",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "kycLevel": 1,
      "permissions": ["user:read", "payment:send"]
    }
  },
  "mfa": {
    "required": true,
    "methods": ["sms", "email"],
    "sessionToken": "temp_session_token"
  }
}
```

### POST /auth/mfa/verify

```javascript
// Request
{
  "sessionToken": "temp_session_token",
  "method": "sms",
  "code": "123456"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

## User Management API

### GET /users/profile

```javascript
// Headers
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "X-CSRF-Token": "csrf_token_here"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "user_123456789",
    "email": "user@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "country": "US",
    "kycLevel": 1,
    "emailVerified": true,
    "phoneVerified": true,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-03T10:30:00Z",
    "preferences": {
      "notifications": {
        "email": true,
        "sms": true,
        "push": false
      },
      "language": "en",
      "currency": "USD"
    }
  },
  "_links": {
    "self": "/api/v1/users/profile",
    "wallet": "/api/v1/wallets/user_123456789",
    "transactions": "/api/v1/transactions?userId=user_123456789"
  }
}
```

### PUT /users/profile

```javascript
// Request
{
  "firstName": "John Updated",
  "preferences": {
    "notifications": {
      "email": false,
      "sms": true
    }
  }
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "user_123456789",
    "firstName": "John Updated",
    // ... other fields
  },
  "message": "Profile updated successfully"
}
```

## Wallet API

### GET /wallets/{walletId}

```javascript
// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "wallet_123456789",
    "userId": "user_123456789",
    "balances": [
      {
        "currency": "USD",
        "available": 1250.50,
        "pending": 0.00,
        "total": 1250.50
      },
      {
        "currency": "NGN",
        "available": 500000.00,
        "pending": 25000.00,
        "total": 525000.00
      }
    ],
    "status": "active",
    "dailyLimits": {
      "USD": {
        "send": 5000.00,
        "used": 1250.50,
        "remaining": 3749.50
      }
    },
    "monthlyLimits": {
      "USD": {
        "send": 50000.00,
        "used": 12500.00,
        "remaining": 37500.00
      }
    }
  }
}
```

## Payment API

### POST /payments/send

```javascript
// Request
{
  "recipientId": "user_987654321", // or email/phone
  "amount": 100.00,
  "currency": "USD",
  "description": "Payment for services",
  "reference": "REF-123456",
  "metadata": {
    "orderId": "order_789",
    "category": "services"
  }
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "transactionId": "txn_abcdef123456",
    "status": "pending",
    "amount": 100.00,
    "currency": "USD",
    "fee": 2.50,
    "totalAmount": 102.50,
    "recipient": {
      "id": "user_987654321",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "estimatedCompletion": "2024-01-03T10:35:00Z",
    "reference": "REF-123456"
  },
  "_links": {
    "self": "/api/v1/transactions/txn_abcdef123456",
    "cancel": "/api/v1/payments/txn_abcdef123456/cancel"
  }
}

// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient wallet balance",
    "details": {
      "required": 102.50,
      "available": 50.25,
      "currency": "USD"
    }
  }
}
```

### GET /payments/{transactionId}/status

```javascript
// Response (200 OK)
{
  "success": true,
  "data": {
    "transactionId": "txn_abcdef123456",
    "status": "completed",
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": "2024-01-03T10:30:00Z"
      },
      {
        "status": "processing",
        "timestamp": "2024-01-03T10:31:00Z"
      },
      {
        "status": "completed",
        "timestamp": "2024-01-03T10:33:00Z"
      }
    ],
    "completedAt": "2024-01-03T10:33:00Z"
  }
}
```

## Transaction API

### GET /transactions

```javascript
// Query Parameters
// ?page=1&limit=20&status=completed&startDate=2024-01-01&endDate=2024-01-31&currency=USD

// Response (200 OK)
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_abcdef123456",
        "type": "send",
        "status": "completed",
        "amount": 100.00,
        "currency": "USD",
        "fee": 2.50,
        "recipient": {
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "description": "Payment for services",
        "reference": "REF-123456",
        "createdAt": "2024-01-03T10:30:00Z",
        "completedAt": "2024-01-03T10:33:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalAmount": 15000.00,
      "totalFees": 375.00,
      "transactionCount": 150,
      "period": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-31T23:59:59Z"
      }
    }
  },
  "_links": {
    "self": "/api/v1/transactions?page=1&limit=20",
    "next": "/api/v1/transactions?page=2&limit=20",
    "first": "/api/v1/transactions?page=1&limit=20",
    "last": "/api/v1/transactions?page=8&limit=20"
  }
}
```

## KYC API

### POST /kyc/documents

```javascript
// Request (multipart/form-data)
{
  "documentType": "passport",
  "document": [File], // Binary file data
  "documentNumber": "A12345678",
  "expiryDate": "2030-05-15",
  "country": "US"
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "documentId": "doc_123456789",
    "status": "pending_review",
    "documentType": "passport",
    "uploadedAt": "2024-01-03T10:30:00Z",
    "estimatedReviewTime": "24-48 hours"
  }
}
```

### GET /kyc/status

```javascript
// Response (200 OK)
{
  "success": true,
  "data": {
    "kycLevel": 1,
    "status": "verified",
    "documents": [
      {
        "id": "doc_123456789",
        "type": "passport",
        "status": "approved",
        "reviewedAt": "2024-01-03T15:30:00Z"
      }
    ],
    "limits": {
      "daily": {
        "send": 5000.00,
        "receive": 10000.00
      },
      "monthly": {
        "send": 50000.00,
        "receive": 100000.00
      }
    },
    "nextLevel": {
      "level": 2,
      "requirements": [
        "proof_of_address",
        "income_verification"
      ],
      "benefits": [
        "Increased daily limit: $10,000",
        "International transfers",
        "Investment products"
      ]
    }
  }
}
```

## Webhook API

### POST /webhooks/payment-status

```javascript
// Webhook payload sent to client endpoints
{
  "eventId": "evt_123456789",
  "eventType": "payment.status.changed",
  "timestamp": "2024-01-03T10:33:00Z",
  "data": {
    "transactionId": "txn_abcdef123456",
    "previousStatus": "processing",
    "currentStatus": "completed",
    "amount": 100.00,
    "currency": "USD",
    "userId": "user_123456789"
  },
  "signature": "sha256=abc123..." // HMAC signature for verification
}
```

## Error Handling

### Standard Error Response Format

```javascript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "type": "validation_error|authentication_error|business_error|system_error",
    "timestamp": "2024-01-03T10:30:00Z",
    "requestId": "req_123456789",
    "details": {
      // Additional error context
    }
  }
}
```

### Common Error Codes

```javascript
const errorCodes = {
  // Authentication & Authorization
  INVALID_TOKEN: "The provided token is invalid or expired",
  INSUFFICIENT_PERMISSIONS: "User lacks required permissions",
  MFA_REQUIRED: "Multi-factor authentication required",

  // Validation
  VALIDATION_ERROR: "Input validation failed",
  INVALID_AMOUNT: "Transaction amount is invalid",
  CURRENCY_NOT_SUPPORTED: "Currency not supported",

  // Business Logic
  INSUFFICIENT_FUNDS: "Wallet balance insufficient",
  DAILY_LIMIT_EXCEEDED: "Daily transaction limit exceeded",
  ACCOUNT_FROZEN: "Account is temporarily frozen",
  KYC_REQUIRED: "KYC verification required for this operation",

  // System
  INTERNAL_ERROR: "Internal server error occurred",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
  RATE_LIMIT_EXCEEDED: "Too many requests",
};
```

## Rate Limiting

### Rate Limit Headers

```javascript
// Response headers for rate limiting
{
  "X-RateLimit-Limit": "100",      // Requests per window
  "X-RateLimit-Remaining": "95",   // Remaining requests
  "X-RateLimit-Reset": "1641200400", // Reset time (Unix timestamp)
  "X-RateLimit-Window": "3600"     // Window size in seconds
}

// Rate limit exceeded response (429 Too Many Requests)
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "retryAfter": 30
  }
}
```

### Rate Limiting Rules

```javascript
const rateLimits = {
  // Per endpoint rate limits
  "/auth/login": { requests: 5, window: "15m" },
  "/auth/register": { requests: 3, window: "1h" },
  "/payments/send": { requests: 10, window: "1h" },
  "/transactions": { requests: 100, window: "1h" },

  // Global rate limits per user
  authenticated_user: { requests: 1000, window: "1h" },
  anonymous_user: { requests: 100, window: "1h" },
};
```

## API Versioning Strategy

### Version Management

```javascript
// URL-based versioning
const apiVersions = {
  'v1': {
    status: 'stable',
    deprecated: false,
    supportUntil: '2025-12-31'
  },
  'v2': {
    status: 'beta',
    deprecated: false,
    features: ['graphql', 'batch_operations', 'webhooks_v2']
  }
};

// Version negotiation headers
{
  "Accept": "application/vnd.afrapay.v1+json",
  "API-Version": "1.0"
}
```

## GraphQL API (Future V2)

### Schema Definition

```graphql
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  wallet: Wallet!
  transactions(first: Int, after: String): TransactionConnection!
}

type Wallet {
  id: ID!
  balances: [Balance!]!
  dailyLimits: [Limit!]!
  monthlyLimits: [Limit!]!
}

type Transaction {
  id: ID!
  amount: Float!
  currency: String!
  status: TransactionStatus!
  recipient: User!
  createdAt: DateTime!
  completedAt: DateTime
}

type Query {
  me: User!
  transaction(id: ID!): Transaction
  transactions(filter: TransactionFilter): TransactionConnection!
}

type Mutation {
  sendPayment(input: SendPaymentInput!): SendPaymentPayload!
  updateProfile(input: UpdateProfileInput!): UpdateProfilePayload!
}

type Subscription {
  transactionUpdates(userId: ID!): Transaction!
  walletUpdates(walletId: ID!): Wallet!
}
```

## API Documentation & Testing

### OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: AfraPay API
  description: Secure fintech payment API
  version: 1.0.0
  contact:
    name: AfraPay API Support
    email: api-support@afrapay.com
servers:
  - url: https://api.afrapay.com/v1
    description: Production server
  - url: https://api-staging.afrapay.com/v1
    description: Staging server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: "VALIDATION_ERROR"
            message:
              type: string
              example: "Invalid input data"
```

### API Testing Suite

```javascript
// Jest API test examples
describe("Payment API", () => {
  beforeEach(() => {
    // Setup test environment
    testDb.reset();
    mockServices.reset();
  });

  describe("POST /payments/send", () => {
    it("should create payment successfully", async () => {
      const response = await request(app)
        .post("/api/v1/payments/send")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          recipientId: "user_123",
          amount: 100.0,
          currency: "USD",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactionId).toBeDefined();
    });

    it("should reject payment with insufficient funds", async () => {
      // Set up user with low balance
      await testDb.setUserBalance("user_456", 50.0);

      const response = await request(app)
        .post("/api/v1/payments/send")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          recipientId: "user_123",
          amount: 100.0,
          currency: "USD",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INSUFFICIENT_FUNDS");
    });
  });
});
```

This comprehensive API structure provides a solid foundation for the AfraPay fintech application with proper authentication, validation, error handling, and documentation.
