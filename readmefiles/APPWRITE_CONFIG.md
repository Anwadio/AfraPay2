# Appwrite Configuration for AfraPay Fintech Application

## Overview

This document provides comprehensive Appwrite configuration for AfraPay, including authentication, database collections, storage buckets, and security permissions designed specifically for fintech applications.

## Project Configuration

### Project Settings

```javascript
// Appwrite Project Configuration
const projectConfig = {
  projectId: "afrapay-prod",
  name: "AfraPay Production",
  description: "Secure fintech payment platform",
  region: "us-east-1", // Choose based on your primary user base

  // Security Settings
  security: {
    sessionLength: 900, // 15 minutes
    passwordHistory: 5,
    passwordMinLength: 8,
    passwordComplexity: true,
    maxSessions: 3,
    rateLimitEnabled: true,
  },

  // Compliance Settings
  compliance: {
    dataRetention: 2555, // 7 years in days (financial regulation)
    auditLogging: true,
    encryptionAtRest: true,
    gdprCompliant: true,
  },
};
```

## Authentication Configuration

### Auth Providers Setup

```javascript
// Authentication Providers
const authProviders = {
  // Email/Password (Primary)
  emailPassword: {
    enabled: true,
    settings: {
      emailVerification: true,
      passwordReset: true,
      sessionLength: 900, // 15 minutes
      maxFailedAttempts: 5,
      lockoutDuration: 1800, // 30 minutes
    },
  },

  // Phone Authentication
  phone: {
    enabled: true,
    settings: {
      provider: "twilio",
      templateId: "sms_otp_template",
      codeLength: 6,
      codeExpiry: 300, // 5 minutes
      maxAttempts: 3,
    },
  },

  // OAuth Providers (Disabled for security)
  oauth: {
    google: { enabled: false },
    facebook: { enabled: false },
    github: { enabled: false },
    apple: { enabled: false },
  },

  // Anonymous (Disabled for fintech)
  anonymous: {
    enabled: false,
  },
};
```

### Multi-Factor Authentication

```javascript
// MFA Configuration
const mfaConfig = {
  enabled: true,
  enforced: true, // Required for all users
  methods: {
    sms: {
      enabled: true,
      provider: "twilio",
      priority: 1,
    },
    email: {
      enabled: true,
      priority: 2,
    },
    totp: {
      enabled: false, // Future implementation
      priority: 3,
    },
  },

  // MFA Bypass Rules (None for fintech)
  bypassRules: [],

  // Challenge Settings
  challenge: {
    codeLength: 6,
    expiry: 300, // 5 minutes
    maxAttempts: 3,
    rateLimit: {
      requests: 3,
      duration: 900, // 15 minutes
    },
  },
};
```

## Database Collections

### 1. Users Collection

```javascript
// users collection
const usersCollection = {
  collectionId: "users",
  name: "Users",
  enabled: true,
  documentSecurity: true,

  attributes: [
    {
      key: "userId",
      type: "string",
      size: 36,
      required: true,
      array: false,
      default: null,
    },
    {
      key: "email",
      type: "email",
      required: true,
      array: false,
    },
    {
      key: "phone",
      type: "string",
      size: 20,
      required: true,
      array: false,
    },
    {
      key: "firstName",
      type: "string",
      size: 50,
      required: true,
      array: false,
    },
    {
      key: "lastName",
      type: "string",
      size: 50,
      required: true,
      array: false,
    },
    {
      key: "dateOfBirth",
      type: "datetime",
      required: true,
      array: false,
    },
    {
      key: "country",
      type: "string",
      size: 3, // ISO country code
      required: true,
      array: false,
    },
    {
      key: "kycLevel",
      type: "integer",
      required: true,
      default: 0,
      array: false,
    },
    {
      key: "kycStatus",
      type: "enum",
      elements: ["pending", "under_review", "verified", "rejected", "expired"],
      required: true,
      default: "pending",
      array: false,
    },
    {
      key: "accountStatus",
      type: "enum",
      elements: ["active", "suspended", "closed", "frozen"],
      required: true,
      default: "active",
      array: false,
    },
    {
      key: "emailVerified",
      type: "boolean",
      required: true,
      default: false,
      array: false,
    },
    {
      key: "phoneVerified",
      type: "boolean",
      required: true,
      default: false,
      array: false,
    },
    {
      key: "mfaEnabled",
      type: "boolean",
      required: true,
      default: true,
      array: false,
    },
    {
      key: "preferredMfaMethod",
      type: "enum",
      elements: ["sms", "email", "totp"],
      required: true,
      default: "sms",
      array: false,
    },
    {
      key: "lastLoginAt",
      type: "datetime",
      required: false,
      array: false,
    },
    {
      key: "failedLoginAttempts",
      type: "integer",
      required: true,
      default: 0,
      array: false,
    },
    {
      key: "accountLockedUntil",
      type: "datetime",
      required: false,
      array: false,
    },
    {
      key: "preferences",
      type: "string",
      size: 2000, // JSON string
      required: false,
      array: false,
    },
    {
      key: "riskScore",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "tags",
      type: "string",
      size: 50,
      required: false,
      array: true, // For user categorization
    },
  ],

  indexes: [
    {
      key: "email_index",
      type: "key",
      attributes: ["email"],
      orders: ["ASC"],
    },
    {
      key: "phone_index",
      type: "key",
      attributes: ["phone"],
      orders: ["ASC"],
    },
    {
      key: "kyc_status_index",
      type: "key",
      attributes: ["kycStatus"],
      orders: ["ASC"],
    },
    {
      key: "account_status_index",
      type: "key",
      attributes: ["accountStatus"],
      orders: ["ASC"],
    },
    {
      key: "country_kyc_index",
      type: "key",
      attributes: ["country", "kycLevel"],
      orders: ["ASC", "ASC"],
    },
  ],
};
```

### 2. Wallets Collection

```javascript
// wallets collection
const walletsCollection = {
  collectionId: "wallets",
  name: "Wallets",
  enabled: true,
  documentSecurity: true,

  attributes: [
    {
      key: "walletId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "userId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "currency",
      type: "string",
      size: 3, // ISO currency code
      required: true,
      array: false,
    },
    {
      key: "balance",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "availableBalance",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "pendingBalance",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "frozenBalance",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "walletStatus",
      type: "enum",
      elements: ["active", "suspended", "closed"],
      required: true,
      default: "active",
      array: false,
    },
    {
      key: "dailyLimit",
      type: "float",
      required: true,
      default: 5000.0,
      array: false,
    },
    {
      key: "monthlyLimit",
      type: "float",
      required: true,
      default: 50000.0,
      array: false,
    },
    {
      key: "dailySpent",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "monthlySpent",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "lastTransactionAt",
      type: "datetime",
      required: false,
      array: false,
    },
  ],

  indexes: [
    {
      key: "user_id_index",
      type: "key",
      attributes: ["userId"],
      orders: ["ASC"],
    },
    {
      key: "user_currency_index",
      type: "key",
      attributes: ["userId", "currency"],
      orders: ["ASC", "ASC"],
    },
    {
      key: "wallet_status_index",
      type: "key",
      attributes: ["walletStatus"],
      orders: ["ASC"],
    },
  ],
};
```

### 3. Transactions Collection

```javascript
// transactions collection
const transactionsCollection = {
  collectionId: "transactions",
  name: "Transactions",
  enabled: true,
  documentSecurity: true,

  attributes: [
    {
      key: "transactionId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "type",
      type: "enum",
      elements: ["send", "receive", "deposit", "withdrawal", "fee", "refund"],
      required: true,
      array: false,
    },
    {
      key: "status",
      type: "enum",
      elements: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      required: true,
      default: "pending",
      array: false,
    },
    {
      key: "senderId",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "recipientId",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "senderWalletId",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "recipientWalletId",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "amount",
      type: "float",
      required: true,
      array: false,
    },
    {
      key: "currency",
      type: "string",
      size: 3,
      required: true,
      array: false,
    },
    {
      key: "fee",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "totalAmount",
      type: "float",
      required: true,
      array: false,
    },
    {
      key: "exchangeRate",
      type: "float",
      required: false,
      array: false,
    },
    {
      key: "description",
      type: "string",
      size: 500,
      required: false,
      array: false,
    },
    {
      key: "reference",
      type: "string",
      size: 100,
      required: false,
      array: false,
    },
    {
      key: "externalReference",
      type: "string",
      size: 100,
      required: false,
      array: false,
    },
    {
      key: "paymentMethod",
      type: "enum",
      elements: ["wallet", "bank_transfer", "mobile_money", "card"],
      required: false,
      array: false,
    },
    {
      key: "paymentProvider",
      type: "string",
      size: 50,
      required: false,
      array: false,
    },
    {
      key: "riskScore",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
    {
      key: "fraudFlags",
      type: "string",
      size: 50,
      required: false,
      array: true,
    },
    {
      key: "ipAddress",
      type: "ip",
      required: false,
      array: false,
    },
    {
      key: "deviceFingerprint",
      type: "string",
      size: 200,
      required: false,
      array: false,
    },
    {
      key: "location",
      type: "string",
      size: 100,
      required: false,
      array: false,
    },
    {
      key: "metadata",
      type: "string",
      size: 2000, // JSON string
      required: false,
      array: false,
    },
    {
      key: "completedAt",
      type: "datetime",
      required: false,
      array: false,
    },
    {
      key: "failureReason",
      type: "string",
      size: 500,
      required: false,
      array: false,
    },
  ],

  indexes: [
    {
      key: "sender_id_index",
      type: "key",
      attributes: ["senderId"],
      orders: ["ASC"],
    },
    {
      key: "recipient_id_index",
      type: "key",
      attributes: ["recipientId"],
      orders: ["ASC"],
    },
    {
      key: "status_created_index",
      type: "key",
      attributes: ["status", "$createdAt"],
      orders: ["ASC", "DESC"],
    },
    {
      key: "type_status_index",
      type: "key",
      attributes: ["type", "status"],
      orders: ["ASC", "ASC"],
    },
    {
      key: "amount_currency_index",
      type: "key",
      attributes: ["amount", "currency"],
      orders: ["DESC", "ASC"],
    },
    {
      key: "risk_score_index",
      type: "key",
      attributes: ["riskScore"],
      orders: ["DESC"],
    },
    {
      key: "reference_index",
      type: "key",
      attributes: ["reference"],
      orders: ["ASC"],
    },
  ],
};
```

### 4. KYC Documents Collection

```javascript
// kyc_documents collection
const kycDocumentsCollection = {
  collectionId: "kyc_documents",
  name: "KYC Documents",
  enabled: true,
  documentSecurity: true,

  attributes: [
    {
      key: "documentId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "userId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "documentType",
      type: "enum",
      elements: [
        "passport",
        "national_id",
        "driver_license",
        "proof_of_address",
        "bank_statement",
        "utility_bill",
      ],
      required: true,
      array: false,
    },
    {
      key: "documentNumber",
      type: "string",
      size: 100,
      required: false,
      array: false,
    },
    {
      key: "issuingCountry",
      type: "string",
      size: 3,
      required: false,
      array: false,
    },
    {
      key: "expiryDate",
      type: "datetime",
      required: false,
      array: false,
    },
    {
      key: "fileId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "fileName",
      type: "string",
      size: 255,
      required: true,
      array: false,
    },
    {
      key: "fileSize",
      type: "integer",
      required: true,
      array: false,
    },
    {
      key: "mimeType",
      type: "string",
      size: 100,
      required: true,
      array: false,
    },
    {
      key: "status",
      type: "enum",
      elements: ["uploaded", "under_review", "approved", "rejected", "expired"],
      required: true,
      default: "uploaded",
      array: false,
    },
    {
      key: "reviewedBy",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "reviewedAt",
      type: "datetime",
      required: false,
      array: false,
    },
    {
      key: "rejectionReason",
      type: "string",
      size: 500,
      required: false,
      array: false,
    },
    {
      key: "extractedData",
      type: "string",
      size: 2000, // JSON string from OCR
      required: false,
      array: false,
    },
    {
      key: "verificationScore",
      type: "float",
      required: false,
      array: false,
    },
  ],

  indexes: [
    {
      key: "user_id_index",
      type: "key",
      attributes: ["userId"],
      orders: ["ASC"],
    },
    {
      key: "user_type_index",
      type: "key",
      attributes: ["userId", "documentType"],
      orders: ["ASC", "ASC"],
    },
    {
      key: "status_index",
      type: "key",
      attributes: ["status"],
      orders: ["ASC"],
    },
    {
      key: "document_number_index",
      type: "key",
      attributes: ["documentNumber"],
      orders: ["ASC"],
    },
  ],
};
```

### 5. Audit Logs Collection

```javascript
// audit_logs collection
const auditLogsCollection = {
  collectionId: "audit_logs",
  name: "Audit Logs",
  enabled: true,
  documentSecurity: true,

  attributes: [
    {
      key: "logId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "userId",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "action",
      type: "enum",
      elements: [
        "login",
        "logout",
        "transaction_create",
        "transaction_update",
        "profile_update",
        "kyc_submit",
        "kyc_approve",
        "kyc_reject",
        "wallet_create",
        "wallet_suspend",
        "password_change",
        "mfa_enable",
        "mfa_disable",
      ],
      required: true,
      array: false,
    },
    {
      key: "resource",
      type: "string",
      size: 50,
      required: true,
      array: false,
    },
    {
      key: "resourceId",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "details",
      type: "string",
      size: 2000, // JSON string
      required: false,
      array: false,
    },
    {
      key: "ipAddress",
      type: "ip",
      required: false,
      array: false,
    },
    {
      key: "userAgent",
      type: "string",
      size: 500,
      required: false,
      array: false,
    },
    {
      key: "sessionId",
      type: "string",
      size: 36,
      required: false,
      array: false,
    },
    {
      key: "result",
      type: "enum",
      elements: ["success", "failure", "blocked"],
      required: true,
      array: false,
    },
    {
      key: "riskScore",
      type: "float",
      required: false,
      array: false,
    },
    {
      key: "location",
      type: "string",
      size: 100,
      required: false,
      array: false,
    },
  ],

  indexes: [
    {
      key: "user_id_index",
      type: "key",
      attributes: ["userId"],
      orders: ["ASC"],
    },
    {
      key: "action_created_index",
      type: "key",
      attributes: ["action", "$createdAt"],
      orders: ["ASC", "DESC"],
    },
    {
      key: "resource_id_index",
      type: "key",
      attributes: ["resourceId"],
      orders: ["ASC"],
    },
    {
      key: "ip_address_index",
      type: "key",
      attributes: ["ipAddress"],
      orders: ["ASC"],
    },
    {
      key: "risk_score_index",
      type: "key",
      attributes: ["riskScore"],
      orders: ["DESC"],
    },
  ],
};
```

### 6. Sessions Collection

```javascript
// sessions collection
const sessionsCollection = {
  collectionId: "sessions",
  name: "User Sessions",
  enabled: true,
  documentSecurity: true,

  attributes: [
    {
      key: "sessionId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "userId",
      type: "string",
      size: 36,
      required: true,
      array: false,
    },
    {
      key: "deviceInfo",
      type: "string",
      size: 1000, // JSON string
      required: true,
      array: false,
    },
    {
      key: "ipAddress",
      type: "ip",
      required: true,
      array: false,
    },
    {
      key: "location",
      type: "string",
      size: 100,
      required: false,
      array: false,
    },
    {
      key: "isActive",
      type: "boolean",
      required: true,
      default: true,
      array: false,
    },
    {
      key: "lastActivity",
      type: "datetime",
      required: true,
      array: false,
    },
    {
      key: "expiresAt",
      type: "datetime",
      required: true,
      array: false,
    },
    {
      key: "mfaVerified",
      type: "boolean",
      required: true,
      default: false,
      array: false,
    },
    {
      key: "riskScore",
      type: "float",
      required: true,
      default: 0.0,
      array: false,
    },
  ],

  indexes: [
    {
      key: "user_id_index",
      type: "key",
      attributes: ["userId"],
      orders: ["ASC"],
    },
    {
      key: "session_active_index",
      type: "key",
      attributes: ["isActive", "expiresAt"],
      orders: ["DESC", "ASC"],
    },
    {
      key: "ip_address_index",
      type: "key",
      attributes: ["ipAddress"],
      orders: ["ASC"],
    },
  ],
};
```

## Storage Configuration

### Storage Buckets

```javascript
// Storage Buckets Configuration
const storageBuckets = [
  {
    bucketId: "kyc-documents",
    name: "KYC Documents",
    permissions: [], // Set via permission system
    fileSecurity: true,
    enabled: true,
    maximumFileSize: 10485760, // 10MB
    allowedFileExtensions: ["pdf", "jpg", "jpeg", "png"],
    compression: "gzip",
    encryption: true,
    antivirus: true,
  },
  {
    bucketId: "profile-images",
    name: "Profile Images",
    permissions: [],
    fileSecurity: true,
    enabled: true,
    maximumFileSize: 2097152, // 2MB
    allowedFileExtensions: ["jpg", "jpeg", "png"],
    compression: "gzip",
    encryption: true,
    antivirus: true,
  },
  {
    bucketId: "transaction-receipts",
    name: "Transaction Receipts",
    permissions: [],
    fileSecurity: true,
    enabled: true,
    maximumFileSize: 5242880, // 5MB
    allowedFileExtensions: ["pdf", "jpg", "jpeg", "png"],
    compression: "gzip",
    encryption: true,
    antivirus: true,
  },
];
```

## Roles and Permissions

### User Roles Definition

```javascript
// Roles Configuration
const roles = [
  {
    roleId: "user",
    name: "Regular User",
    description: "Standard user with basic transaction capabilities",
  },
  {
    roleId: "verified-user",
    name: "Verified User",
    description: "KYC verified user with enhanced capabilities",
  },
  {
    roleId: "premium-user",
    name: "Premium User",
    description: "Premium user with higher limits and features",
  },
  {
    roleId: "support-agent",
    name: "Support Agent",
    description: "Customer support representative",
  },
  {
    roleId: "compliance-officer",
    name: "Compliance Officer",
    description: "Compliance and risk management officer",
  },
  {
    roleId: "admin",
    name: "Administrator",
    description: "System administrator with full access",
  },
  {
    roleId: "super-admin",
    name: "Super Administrator",
    description: "Super administrator with unrestricted access",
  },
];
```

### Collection Permissions

```javascript
// Users Collection Permissions
const usersPermissions = [
  // User can read their own profile
  {
    role: "user",
    permission: "read",
    target: "users",
    condition: "user($id) == document.userId",
  },
  // User can update their own profile (limited fields)
  {
    role: "user",
    permission: "update",
    target: "users",
    condition: "user($id) == document.userId",
  },
  // Verified users have same permissions as regular users
  {
    role: "verified-user",
    permission: "read",
    target: "users",
    condition: "user($id) == document.userId",
  },
  {
    role: "verified-user",
    permission: "update",
    target: "users",
    condition: "user($id) == document.userId",
  },
  // Support can read user profiles
  {
    role: "support-agent",
    permission: "read",
    target: "users",
  },
  // Compliance can read and update user profiles
  {
    role: "compliance-officer",
    permission: "read",
    target: "users",
  },
  {
    role: "compliance-officer",
    permission: "update",
    target: "users",
  },
  // Admin has full access
  {
    role: "admin",
    permission: "create",
    target: "users",
  },
  {
    role: "admin",
    permission: "read",
    target: "users",
  },
  {
    role: "admin",
    permission: "update",
    target: "users",
  },
  {
    role: "admin",
    permission: "delete",
    target: "users",
  },
];

// Wallets Collection Permissions
const walletsPermissions = [
  // User can read their own wallets
  {
    role: "user",
    permission: "read",
    target: "wallets",
    condition: "user($id) == document.userId",
  },
  // Verified users can read their own wallets
  {
    role: "verified-user",
    permission: "read",
    target: "wallets",
    condition: "user($id) == document.userId",
  },
  // Support can read wallets for support purposes
  {
    role: "support-agent",
    permission: "read",
    target: "wallets",
  },
  // Compliance can read and update wallets
  {
    role: "compliance-officer",
    permission: "read",
    target: "wallets",
  },
  {
    role: "compliance-officer",
    permission: "update",
    target: "wallets",
  },
  // Admin has full access
  {
    role: "admin",
    permission: "create",
    target: "wallets",
  },
  {
    role: "admin",
    permission: "read",
    target: "wallets",
  },
  {
    role: "admin",
    permission: "update",
    target: "wallets",
  },
  {
    role: "admin",
    permission: "delete",
    target: "wallets",
  },
];

// Transactions Collection Permissions
const transactionsPermissions = [
  // User can read their own transactions
  {
    role: "user",
    permission: "read",
    target: "transactions",
    condition:
      "user($id) == document.senderId || user($id) == document.recipientId",
  },
  // User can create transactions (send money)
  {
    role: "user",
    permission: "create",
    target: "transactions",
    condition: "user($id) == request.senderId",
  },
  // Verified users have enhanced transaction capabilities
  {
    role: "verified-user",
    permission: "read",
    target: "transactions",
    condition:
      "user($id) == document.senderId || user($id) == document.recipientId",
  },
  {
    role: "verified-user",
    permission: "create",
    target: "transactions",
    condition: "user($id) == request.senderId",
  },
  // Support can read transactions
  {
    role: "support-agent",
    permission: "read",
    target: "transactions",
  },
  // Compliance can read and update transactions
  {
    role: "compliance-officer",
    permission: "read",
    target: "transactions",
  },
  {
    role: "compliance-officer",
    permission: "update",
    target: "transactions",
  },
  // Admin has full access
  {
    role: "admin",
    permission: "create",
    target: "transactions",
  },
  {
    role: "admin",
    permission: "read",
    target: "transactions",
  },
  {
    role: "admin",
    permission: "update",
    target: "transactions",
  },
  {
    role: "admin",
    permission: "delete",
    target: "transactions",
  },
];

// KYC Documents Collection Permissions
const kycDocumentsPermissions = [
  // User can create and read their own KYC documents
  {
    role: "user",
    permission: "create",
    target: "kyc_documents",
    condition: "user($id) == request.userId",
  },
  {
    role: "user",
    permission: "read",
    target: "kyc_documents",
    condition: "user($id) == document.userId",
  },
  // Verified users have same permissions
  {
    role: "verified-user",
    permission: "create",
    target: "kyc_documents",
    condition: "user($id) == request.userId",
  },
  {
    role: "verified-user",
    permission: "read",
    target: "kyc_documents",
    condition: "user($id) == document.userId",
  },
  // Support can read KYC documents
  {
    role: "support-agent",
    permission: "read",
    target: "kyc_documents",
  },
  // Compliance can read and update KYC documents
  {
    role: "compliance-officer",
    permission: "read",
    target: "kyc_documents",
  },
  {
    role: "compliance-officer",
    permission: "update",
    target: "kyc_documents",
  },
  // Admin has full access
  {
    role: "admin",
    permission: "create",
    target: "kyc_documents",
  },
  {
    role: "admin",
    permission: "read",
    target: "kyc_documents",
  },
  {
    role: "admin",
    permission: "update",
    target: "kyc_documents",
  },
  {
    role: "admin",
    permission: "delete",
    target: "kyc_documents",
  },
];

// Audit Logs Permissions (Read-only for most roles)
const auditLogsPermissions = [
  // Support can read audit logs
  {
    role: "support-agent",
    permission: "read",
    target: "audit_logs",
  },
  // Compliance can read audit logs
  {
    role: "compliance-officer",
    permission: "read",
    target: "audit_logs",
  },
  // Admin can read audit logs
  {
    role: "admin",
    permission: "read",
    target: "audit_logs",
  },
  // Only system can create audit logs
  {
    role: "any",
    permission: "create",
    target: "audit_logs",
    condition: 'user($id) == "system"',
  },
];

// Sessions Permissions
const sessionsPermissions = [
  // User can read their own sessions
  {
    role: "user",
    permission: "read",
    target: "sessions",
    condition: "user($id) == document.userId",
  },
  // User can update their own sessions (logout)
  {
    role: "user",
    permission: "update",
    target: "sessions",
    condition: "user($id) == document.userId",
  },
  // Support can read sessions
  {
    role: "support-agent",
    permission: "read",
    target: "sessions",
  },
  // Compliance can read and update sessions
  {
    role: "compliance-officer",
    permission: "read",
    target: "sessions",
  },
  {
    role: "compliance-officer",
    permission: "update",
    target: "sessions",
  },
  // Admin has full access
  {
    role: "admin",
    permission: "create",
    target: "sessions",
  },
  {
    role: "admin",
    permission: "read",
    target: "sessions",
  },
  {
    role: "admin",
    permission: "update",
    target: "sessions",
  },
  {
    role: "admin",
    permission: "delete",
    target: "sessions",
  },
];
```

### Storage Permissions

```javascript
// Storage Bucket Permissions
const storagePermissions = {
  "kyc-documents": [
    // User can create and read their own KYC documents
    {
      role: "user",
      permission: "create",
      condition: "user($id) == file.userId",
    },
    {
      role: "user",
      permission: "read",
      condition: "user($id) == file.userId",
    },
    // Compliance can read all KYC documents
    {
      role: "compliance-officer",
      permission: "read",
    },
    // Admin has full access
    {
      role: "admin",
      permission: "create",
    },
    {
      role: "admin",
      permission: "read",
    },
    {
      role: "admin",
      permission: "update",
    },
    {
      role: "admin",
      permission: "delete",
    },
  ],

  "profile-images": [
    // User can manage their own profile images
    {
      role: "user",
      permission: "create",
      condition: "user($id) == file.userId",
    },
    {
      role: "user",
      permission: "read",
      condition: "user($id) == file.userId",
    },
    {
      role: "user",
      permission: "update",
      condition: "user($id) == file.userId",
    },
    {
      role: "user",
      permission: "delete",
      condition: "user($id) == file.userId",
    },
    // Admin has full access
    {
      role: "admin",
      permission: "create",
    },
    {
      role: "admin",
      permission: "read",
    },
    {
      role: "admin",
      permission: "update",
    },
    {
      role: "admin",
      permission: "delete",
    },
  ],

  "transaction-receipts": [
    // User can read their own transaction receipts
    {
      role: "user",
      permission: "read",
      condition: "user($id) == file.userId",
    },
    // Support can read transaction receipts
    {
      role: "support-agent",
      permission: "read",
    },
    // Compliance can read transaction receipts
    {
      role: "compliance-officer",
      permission: "read",
    },
    // Admin has full access
    {
      role: "admin",
      permission: "create",
    },
    {
      role: "admin",
      permission: "read",
    },
    {
      role: "admin",
      permission: "update",
    },
    {
      role: "admin",
      permission: "delete",
    },
  ],
};
```

## Security Functions

### Custom Functions for Enhanced Security

```javascript
// Function: Risk Assessment
const riskAssessmentFunction = {
  functionId: "risk-assessment",
  name: "Transaction Risk Assessment",
  runtime: "node-18.0",
  execute: ["src/functions/riskAssessment.js"],
  events: ["databases.*.collections.transactions.documents.*.create"],
  schedule: "",
  timeout: 30,
  enabled: true,
  logging: true,
  entrypoint: "src/functions/riskAssessment.js",
};

// Function: Fraud Detection
const fraudDetectionFunction = {
  functionId: "fraud-detection",
  name: "Real-time Fraud Detection",
  runtime: "node-18.0",
  execute: ["src/functions/fraudDetection.js"],
  events: ["databases.*.collections.transactions.documents.*.create"],
  schedule: "",
  timeout: 30,
  enabled: true,
  logging: true,
  entrypoint: "src/functions/fraudDetection.js",
};

// Function: Compliance Monitoring
const complianceMonitoringFunction = {
  functionId: "compliance-monitoring",
  name: "AML/KYC Compliance Monitoring",
  runtime: "node-18.0",
  execute: ["src/functions/complianceMonitoring.js"],
  events: [
    "databases.*.collections.transactions.documents.*.create",
    "databases.*.collections.users.documents.*.update",
  ],
  schedule: "0 */6 * * *", // Run every 6 hours
  timeout: 300,
  enabled: true,
  logging: true,
  entrypoint: "src/functions/complianceMonitoring.js",
};

// Function: Audit Logger
const auditLoggerFunction = {
  functionId: "audit-logger",
  name: "Centralized Audit Logging",
  runtime: "node-18.0",
  execute: ["src/functions/auditLogger.js"],
  events: [
    "users.*.sessions.*.create",
    "users.*.sessions.*.delete",
    "databases.*.collections.*.documents.*.create",
    "databases.*.collections.*.documents.*.update",
    "databases.*.collections.*.documents.*.delete",
  ],
  schedule: "",
  timeout: 30,
  enabled: true,
  logging: true,
  entrypoint: "src/functions/auditLogger.js",
};
```

## Environment-Specific Configurations

### Production Environment

```javascript
const productionConfig = {
  // Enhanced Security Settings
  security: {
    sessionLength: 900, // 15 minutes
    maxSessions: 3,
    passwordMinLength: 12,
    passwordComplexity: true,
    mfaEnforced: true,
    loginAttempts: 3,
    lockoutDuration: 3600, // 1 hour
  },

  // Strict Rate Limits
  rateLimits: {
    login: { requests: 3, duration: 900 },
    registration: { requests: 3, duration: 3600 },
    transaction: { requests: 10, duration: 600 },
    kyc: { requests: 5, duration: 3600 },
  },

  // Compliance Settings
  compliance: {
    dataRetention: 2555, // 7 years
    auditLogging: true,
    encryptionAtRest: true,
    backupFrequency: "hourly",
    complianceReporting: true,
  },
};
```

### Staging Environment

```javascript
const stagingConfig = {
  // Relaxed Security for Testing
  security: {
    sessionLength: 3600, // 1 hour
    maxSessions: 5,
    passwordMinLength: 8,
    passwordComplexity: true,
    mfaEnforced: false, // Optional for testing
    loginAttempts: 5,
    lockoutDuration: 1800, // 30 minutes
  },

  // Moderate Rate Limits
  rateLimits: {
    login: { requests: 10, duration: 900 },
    registration: { requests: 10, duration: 3600 },
    transaction: { requests: 50, duration: 600 },
    kyc: { requests: 10, duration: 3600 },
  },
};
```

This comprehensive Appwrite configuration provides enterprise-grade security, compliance, and scalability for the AfraPay fintech application while maintaining the flexibility needed for different user roles and use cases.
