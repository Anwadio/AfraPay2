# Authentication Flow Architecture

## Authentication Strategy Overview

AfraPay implements a multi-layered authentication system combining Appwrite's built-in auth services with custom security layers for fintech compliance.

## Primary Authentication Flow

### 1. User Registration Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │    API      │    │    KYC      │    │  Appwrite   │
│  (React)    │    │  Gateway    │    │  Service    │    │    Auth     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. Register Form │                  │                  │
       ├─────────────────►│                  │                  │
       │                  │ 2. Input Valid  │                  │
       │                  ├─────────────────►│                  │
       │                  │ 3. KYC Check    │                  │
       │                  │◄─────────────────┤                  │
       │                  │ 4. Create User  │                  │
       │                  ├──────────────────┼─────────────────►│
       │                  │                  │ 5. User Created │
       │                  │◄─────────────────┼─────────────────┤
       │                  │ 6. Send OTP     │                  │
       │                  ├─────────────────►│                  │
       │ 7. OTP Sent     │                  │                  │
       │◄─────────────────┤                  │                  │
```

**Registration Steps:**

1. User fills registration form (email, phone, password)
2. Client-side validation and password strength check
3. API receives registration request
4. Input sanitization and server-side validation
5. KYC Level 0 check (basic identity verification)
6. Appwrite user account creation
7. SMS/Email OTP generation and dispatch
8. User verification flow initiation
9. Temporary account status set to "pending verification"

### 2. Email/Phone Verification Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │    API      │    │  Appwrite   │
│  (React)    │    │  Gateway    │    │    Auth     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. Submit OTP   │                  │
       ├─────────────────►│                  │
       │                  │ 2. Verify OTP   │
       │                  ├─────────────────►│
       │                  │ 3. OTP Valid    │
       │                  │◄─────────────────┤
       │                  │ 4. Activate Acc │
       │                  ├─────────────────►│
       │ 5. Account Active│                  │
       │◄─────────────────┤                  │
```

### 3. Login Flow with MFA

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │    API      │    │  Appwrite   │
│  (React)    │    │  Gateway    │    │    Auth     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. Login Creds  │                  │
       ├─────────────────►│                  │
       │                  │ 2. Authenticate │
       │                  ├─────────────────►│
       │                  │ 3. User Valid   │
       │                  │◄─────────────────┤
       │                  │ 4. Send MFA     │
       │                  ├─────────────────►│
       │ 5. MFA Required │                  │
       │◄─────────────────┤                  │
       │ 6. Submit MFA   │                  │
       ├─────────────────►│                  │
       │                  │ 7. Verify MFA   │
       │                  ├─────────────────►│
       │                  │ 8. JWT Tokens   │
       │                  │◄─────────────────┤
       │ 9. Login Success │                  │
       │◄─────────────────┤                  │
```

## Token Management

### JWT Token Structure

```javascript
// Access Token (Short-lived: 15 minutes)
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "iss": "afrapay",
    "aud": "afrapay-client",
    "exp": 1609459200,
    "iat": 1609458300,
    "jti": "token_id",
    "scope": "user:read user:write payment:send",
    "kyc_level": "1",
    "mfa_verified": true,
    "session_id": "session_uuid"
  }
}

// Refresh Token (Long-lived: 7 days)
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "type": "refresh",
    "exp": 1610064000,
    "iat": 1609458300,
    "jti": "refresh_token_id"
  }
}
```

### Token Refresh Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │    API      │    │  Appwrite   │
│  (React)    │    │  Gateway    │    │    Auth     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. API Request  │                  │
       │   (Expired JWT) │                  │
       ├─────────────────►│                  │
       │                  │ 2. JWT Invalid  │
       │                  ├─────────────────►│
       │ 3. 401 Unauthor │                  │
       │◄─────────────────┤                  │
       │ 4. Refresh Req  │                  │
       ├─────────────────►│                  │
       │                  │ 5. Verify Refr  │
       │                  ├─────────────────►│
       │                  │ 6. New Tokens   │
       │                  │◄─────────────────┤
       │ 7. New JWT      │                  │
       │◄─────────────────┤                  │
       │ 8. Retry API    │                  │
       ├─────────────────►│                  │
```

## Session Management

### Session Security

```javascript
// Session Object Structure
{
  sessionId: "uuid",
  userId: "user_id",
  deviceInfo: {
    userAgent: "browser_info",
    ipAddress: "xxx.xxx.xxx.xxx",
    location: "city, country",
    deviceFingerprint: "hash"
  },
  createdAt: "timestamp",
  lastActivity: "timestamp",
  expiresAt: "timestamp",
  isActive: true,
  mfaVerified: true,
  permissions: ["read", "write", "pay"],
  riskScore: 0.2
}
```

### Multi-Device Session Management

```
┌─────────────────────────────────────────────────────┐
│                Session Store                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Mobile    │  │   Desktop   │  │   Tablet    │ │
│  │   Session   │  │   Session   │  │   Session   │ │
│  │   Active    │  │   Active    │  │  Inactive   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                  ┌──────▼──────┐
                  │ Session     │
                  │ Validation  │
                  │ Service     │
                  └─────────────┘
```

## Multi-Factor Authentication (MFA)

### MFA Options Hierarchy

1. **Primary MFA**: SMS OTP
2. **Secondary MFA**: Email OTP
3. **Future**: TOTP apps, Hardware tokens

### MFA Challenge Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   MFA       │    │   SMS/Email │
│  (React)    │    │  Service    │    │   Service   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. Trigger MFA  │                  │
       ├─────────────────►│                  │
       │                  │ 2. Generate OTP │
       │                  ├─────────────────►│
       │                  │ 3. Send OTP     │
       │                  │◄─────────────────┤
       │ 4. OTP Sent     │                  │
       │◄─────────────────┤                  │
       │ 5. Submit OTP   │                  │
       ├─────────────────►│                  │
       │                  │ 6. Validate OTP │
       │                  │                  │
       │ 7. MFA Success  │                  │
       │◄─────────────────┤                  │
```

## Authorization & Permissions

### Role-Based Access Control (RBAC)

```javascript
// User Roles & Permissions
const roles = {
  USER: {
    permissions: [
      "profile:read",
      "profile:update",
      "wallet:view",
      "payment:send",
      "payment:receive",
      "transaction:view",
    ],
  },
  VERIFIED_USER: {
    inherits: "USER",
    permissions: ["payment:high_amount", "kyc:level2"],
  },
  ADMIN: {
    permissions: ["user:manage", "system:monitor", "reports:generate"],
  },
};
```

### Permission Check Middleware

```javascript
// Express Middleware Example
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await appwrite.users.get(decoded.sub);
      const permissions = user.labels.permissions || [];

      if (!permissions.includes(permission)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
};
```

## Security Considerations

### Password Security

- Minimum 8 characters with complexity requirements
- bcrypt hashing with salt rounds = 12
- Password history prevention (last 5 passwords)
- Account lockout after 5 failed attempts

### Token Security

- Tokens stored in httpOnly cookies (not localStorage)
- CSRF tokens for state-changing operations
- Token rotation on sensitive actions
- Automatic logout on suspicious activity

### Session Security

- Device fingerprinting for anomaly detection
- IP address change monitoring
- Concurrent session limits (max 3 devices)
- Automatic session cleanup

## Error Handling & Logging

### Authentication Errors

```javascript
const authErrors = {
  INVALID_CREDENTIALS: "AUTH001",
  ACCOUNT_LOCKED: "AUTH002",
  MFA_REQUIRED: "AUTH003",
  MFA_INVALID: "AUTH004",
  TOKEN_EXPIRED: "AUTH005",
  INSUFFICIENT_PERMISSIONS: "AUTH006",
};
```

### Security Audit Logging

```javascript
// Audit Log Structure
{
  eventId: "uuid",
  timestamp: "ISO_8601",
  userId: "user_id",
  eventType: "LOGIN_SUCCESS|LOGIN_FAILED|MFA_FAILED",
  ipAddress: "xxx.xxx.xxx.xxx",
  userAgent: "browser_info",
  sessionId: "session_id",
  riskScore: 0.1,
  metadata: {
    // Additional context
  }
}
```

## Rate Limiting & Abuse Prevention

### Rate Limiting Rules

```javascript
const rateLimits = {
  LOGIN_ATTEMPTS: { max: 5, window: "15m", blockDuration: "30m" },
  MFA_ATTEMPTS: { max: 3, window: "5m", blockDuration: "15m" },
  PASSWORD_RESET: { max: 3, window: "1h", blockDuration: "24h" },
  REGISTRATION: { max: 3, window: "1h", blockDuration: "24h" },
};
```

### Progressive Security Measures

1. **First violation**: Warning + CAPTCHA
2. **Second violation**: Temporary delay (30 seconds)
3. **Third violation**: Account temporary lock (15 minutes)
4. **Continued violations**: Extended lock + manual review
