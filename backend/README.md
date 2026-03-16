# AfraPay Backend - Setup Instructions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Redis server
- Appwrite instance (self-hosted or cloud)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. **Required Environment Variables:**
   ```env
   NODE_ENV=development
   APP_NAME=AfraPay
   APP_VERSION=1.0.0
   APP_HOST=localhost
   APP_PORT=5000
   
   # Database
   APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
   APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_API_KEY=your-api-key
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   # JWT
   JWT_SECRET=your-super-secure-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   
   # Encryption
   ENCRYPTION_KEY=your-32-character-encryption-key
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration management
│   │   └── environment.js
│   ├── database/         # Database connections
│   │   └── connection.js
│   ├── middleware/       # Express middleware
│   │   ├── auth/         # Authentication & authorization
│   │   ├── security/     # Security middleware (rate limiting, helmet)
│   │   ├── monitoring/   # Logging & error handling
│   │   ├── validation/   # Request validation
│   │   └── common/       # Common middleware (response handlers)
│   ├── routes/           # API routes
│   │   └── v1/           # API version 1
│   │       ├── auth.js   # Authentication routes
│   │       ├── users.js  # User management
│   │       ├── payments.js # Payment processing
│   │       ├── transactions.js # Transaction history
│   │       ├── admin.js  # Admin functions
│   │       ├── webhooks.js # Webhook handlers
│   │       └── profile.js # User profiles
│   ├── controllers/      # Business logic (to be implemented)
│   ├── services/         # Service layer (to be implemented)
│   ├── utils/           # Utility functions
│   │   └── logger.js    # Winston logging
│   └── server.js        # Main server file
├── docs/                # API documentation
│   └── swagger.json     # OpenAPI specification
├── package.json
└── README.md
```

## 🛠️ Features Implemented

### ✅ Core Infrastructure
- **Express.js server** with proper error handling and graceful shutdown
- **Environment configuration** with Joi validation
- **Database connections** (Appwrite + Redis) with health monitoring
- **Comprehensive logging** with Winston (file rotation, structured logs)
- **Security middleware** (Helmet, rate limiting, CORS)

### ✅ Authentication & Authorization
- **JWT-based authentication** with access/refresh tokens
- **Role-based authorization** (user, merchant, agent, admin, super_admin)
- **Permission-based access control**
- **Rate limiting** with different tiers (global, auth, payment, admin)

### ✅ API Routes Structure
- **Authentication routes** - Register, login, logout, 2FA, password reset
- **User management** - Profile, documents, verification, preferences
- **Payment processing** - Payments, transfers, withdrawals, recurring payments
- **Transaction handling** - History, analytics, disputes, exports
- **Admin functions** - User management, system settings, reports
- **Webhook handling** - Multiple payment providers (Stripe, Paystack, etc.)

### ✅ Middleware & Security
- **Request validation** with express-validator
- **Error handling** with custom error classes and proper HTTP responses
- **Request logging** with performance monitoring
- **Response standardization** with helper methods
- **Security headers** with Helmet.js
- **Rate limiting** with Redis backing

### ✅ Developer Experience
- **Swagger documentation** available at `/api-docs`
- **Health check endpoint** at `/health`
- **Structured logging** for debugging and monitoring
- **Environment-based configuration**
- **WebSocket support** for real-time features

## 🔧 Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run test       # Run tests (to be implemented)
npm run lint       # ESLint code checking
npm run security   # Security audit with npm audit
npm run db:migrate # Database migrations (to be implemented)
npm run db:seed    # Seed database (to be implemented)
```

## 📡 API Endpoints Overview

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh-token` - Refresh JWT token
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Password reset
- `GET /me` - Get current user profile

### Payments (`/api/v1/payments`)
- `POST /` - Create payment
- `GET /` - Get user payments
- `GET /:paymentId` - Get payment details
- `POST /wallet/transfer` - Transfer money
- `POST /wallet/withdraw` - Withdraw money
- `POST /wallet/deposit` - Deposit money
- `GET /methods` - Get payment methods
- `POST /methods` - Add payment method

### Transactions (`/api/v1/transactions`)
- `GET /` - Get transaction history
- `GET /:transactionId` - Get transaction details
- `GET /analytics/summary` - Transaction analytics
- `GET /export` - Export transactions
- `POST /:transactionId/dispute` - Create dispute

### Admin (`/api/v1/admin`)
- `GET /dashboard` - Admin dashboard
- `GET /users` - Manage users
- `GET /transactions` - View all transactions
- `GET /analytics` - System analytics
- `GET /reports/financial` - Financial reports

## 🚨 Next Steps (Controllers Implementation)

The routing structure is complete, but you'll need to implement the actual business logic in controllers:

1. **Create controller files** in `src/controllers/`:
   - `authController.js`
   - `userController.js`
   - `paymentController.js`
   - `transactionController.js`
   - `adminController.js`
   - `webhookController.js`
   - `profileController.js`

2. **Implement service layer** for business logic separation

3. **Add database models/schemas** for Appwrite collections

4. **Implement external payment integrations** (Stripe, Paystack, etc.)

5. **Add comprehensive testing** (unit, integration, E2E)

## 🔐 Security Features

- **JWT authentication** with secure token handling
- **Rate limiting** to prevent abuse
- **Request validation** to prevent malicious input
- **Security headers** with Helmet.js
- **CORS protection** with configurable origins
- **Audit logging** for security monitoring
- **Input sanitization** and validation

## 📊 Monitoring & Logging

- **Structured logging** with Winston
- **Request/response logging** with performance metrics
- **Error tracking** with stack traces
- **Security event logging**
- **Health check endpoints**
- **Database connection monitoring**

## 🌐 Production Considerations

- **Graceful shutdown** handling
- **Process management** with PM2 (recommended)
- **Environment-based configuration**
- **Database connection pooling**
- **Redis caching** for sessions and rate limiting
- **Comprehensive error handling**
- **Performance monitoring** ready

The backend is now ready for controller implementation and can be extended with additional features as needed. The architecture follows clean code principles and industry best practices for a production-ready fintech application.