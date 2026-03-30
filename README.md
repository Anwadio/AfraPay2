# AfraPay

> A production-grade fintech platform enabling secure payments, merchant tills, multi-currency wallets, and financial education — built for South Sudan and the broader African market.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [API Overview](#api-overview)
8. [Role-Based Access](#role-based-access)
9. [Security](#security)
10. [Future Roadmap](#future-roadmap)

---

## Overview

AfraPay is a full-stack financial platform consisting of three applications:

| Application        | Stack                                 | Purpose                                                      |
| ------------------ | ------------------------------------- | ------------------------------------------------------------ |
| **Website**        | React 18, Tailwind CSS, Framer Motion | Consumer-facing PWA: wallets, payments, education            |
| **Backend**        | Node.js, Express, Appwrite            | REST API, business logic, fraud detection                    |
| **AdminDashboard** | React 18, Tailwind CSS, React Query   | Internal operations: merchant management, analytics, payouts |

---

## Features

### Consumer App

- **Send Money** — M-Pesa, MTN Mobile Money, and wallet-to-wallet transfers
- **Multi-Currency Wallets** — USD, EUR, KES, SSP, NGN, GHS, ZAR with live FX rates
- **Virtual/Physical Cards** — Card issuance, freeze/unfreeze, spend controls
- **Financial Education** — Curated courses, quizzes, progress tracking
- **Bill Payments** — Utility and service bill payments
- **Currency Exchange** — Real-time rates, instant conversion

### Merchant System

- **Merchant Onboarding** — Self-service registration with admin review workflow
- **Dedicated Till Numbers** — Unique payment IDs per merchant
- **Merchant Wallet** — Isolated fund management separate from personal wallet
- **Sales Analytics** — Revenue, transaction volume, success rate tracking
- **Payout System** — Withdrawal to M-Pesa, MTN Mobile Money, or bank account with fraud controls

### Admin Dashboard

- **User Management** — Account status, KYC level, session management
- **Merchant Management** — Application review, approve/reject, till provisioning
- **Transaction Monitoring** — Full transaction log with filters and export
- **Payout Administration** — List, process, and fail merchant payouts
- **Fraud Detection** — Risk flag review and management
- **Live Chat** — Real-time customer support sessions
- **Audit Logs** — Tamper-evident action history
- **Notifications** — Role-targeted push notifications
- **Blog / Careers** — CMS for public content

### Platform

- **Multi-Factor Authentication** — TOTP-based MFA / 2FA
- **Real-Time Updates** — WebSocket-based notifications
- **Fraud Detection** — Velocity checks, device fingerprinting, anomaly scoring
- **End-to-End Encryption** — AES-256 for sensitive data at rest

---

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     Website         │    │      Backend         │    │   AdminDashboard    │
│  (React 18 PWA)     │◄──►│  (Node.js/Express)   │◄──►│     (React 18)      │
│  Port 3000          │    │  Port 5000           │    │  Port 3001          │
└─────────────────────┘    └──────────┬──────────┘    └─────────────────────┘
                                      │
                           ┌──────────▼──────────┐
                           │     Appwrite         │
                           │  (Database / Auth /  │
                           │   Storage / Relay)   │
                           └─────────────────────┘
```

**Key Design Decisions:**

- **Cookie-based Auth** — httpOnly JWT cookies prevent XSS token theft; silent refresh via `/auth/refresh-token`
- **Idempotent Payments** — All payment/payout mutations require a client-generated `Idempotency-Key` header
- **Optimistic Concurrency** — Wallet debit operations re-read balance before decrement to prevent double-spend
- **Role-Based UI** — Frontend conditionally renders merchant features based on `user.role` and merchant application status
- **Fire-and-forget Audit** — All admin actions are asynchronously logged to the audit collection without blocking the response

---

## Project Structure

```
afra-pay2/
├── backend/                    # Node.js REST API
│   ├── src/
│   │   ├── config/             # Environment validation (Joi)
│   │   ├── controllers/        # HTTP request handlers
│   │   │   ├── adminController.js
│   │   │   ├── merchantController.js
│   │   │   ├── payoutController.js
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth/           # authenticate, authorize
│   │   │   ├── security/       # rateLimiter, idempotency
│   │   │   └── validation/     # express-validator
│   │   ├── routes/v1/          # Express routers
│   │   │   ├── admin.js        # /api/v1/admin/*
│   │   │   ├── merchants.js    # /api/v1/merchants/*
│   │   │   ├── payouts.js      # merchant payout endpoints
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── payoutService.js    # Payout orchestration
│   │   │   ├── walletService.js    # Wallet debit/credit
│   │   │   ├── merchantService.js
│   │   │   ├── fraudService.js
│   │   │   ├── auditService.js
│   │   │   └── notificationService.js
│   │   └── server.js
│   ├── diagnostics/            # One-off DB setup scripts
│   └── ecosystem.config.js     # PM2 configuration
│
├── Website/                    # Consumer React PWA
│   ├── src/
│   │   ├── App.jsx             # Router, providers, lazy routes
│   │   ├── contexts/
│   │   │   ├── AuthContext.js      # User auth state
│   │   │   ├── CurrencyContext.jsx # Active display currency
│   │   │   └── MerchantContext.jsx # Merchant profile & status
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Main user dashboard
│   │   │   ├── MerchantDashboard.jsx # Role-based merchant hub
│   │   │   ├── Landing.jsx         # Public homepage
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── layout/         # DashboardLayout, Sidebar, Header
│   │   │   ├── fintech/        # WalletCard, TransactionList, SendMoneyModal
│   │   │   └── ui/             # Button, Card, Badge, PremiumUI
│   │   └── services/
│   │       └── api.js          # Axios instance + all API exports
│
├── AdminDashboard/             # Internal operations React app
│   └── src/
│       ├── pages/
│       │   ├── MerchantsPage.jsx   # Merchant management + payout admin
│       │   └── ...
│       └── services/
│           └── adminAPI.js         # Admin API client
│
├── MobileApp/                  # Expo React Native app (in development)
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- An [Appwrite](https://appwrite.io) project (v1.4+) with collections configured

### 1. Clone & Install

```bash
git clone https://github.com/your-org/afra-pay.git
cd afra-pay

# Install backend dependencies
cd backend && npm install

# Install website dependencies
cd ../Website && npm install

# Install admin dashboard dependencies
cd ../AdminDashboard && npm install
```

### 2. Configure Environment

Copy the example env files and fill in your values (see [Environment Variables](#environment-variables)):

```bash
cp backend/.env.example backend/.env
cp Website/.env.example Website/.env
cp AdminDashboard/.env.example AdminDashboard/.env
```

### 3. Run Appwrite Setup Scripts

After creating your Appwrite project, run the diagnostic scripts to create collections:

```bash
cd backend
node diagnostics/setup-admin-user.js
node diagnostics/setup-transactions-collection.js
node diagnostics/setup-cards-collection.js
# ... additional setup scripts as needed
```

### 4. Start Development Servers

```bash
# Option A: all at once (from root)
.\start-dev.ps1

# Option B: individually
# Backend
cd backend && npm run dev

# Website
cd Website && npm start

# Admin Dashboard
cd AdminDashboard && npm start
```

| Service            | URL                            |
| ------------------ | ------------------------------ |
| Website            | http://localhost:3000          |
| Admin Dashboard    | http://localhost:3001          |
| Backend API        | http://localhost:5000/api/v1   |
| API Docs (Swagger) | http://localhost:5000/api/docs |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# App
NODE_ENV=development
PORT=5000

# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<your_project_id>
APPWRITE_API_KEY=<your_api_key>
APPWRITE_DATABASE_ID=<your_database_id>

# Collection IDs
APPWRITE_USER_COLLECTION_ID=
APPWRITE_TRANSACTIONS_COLLECTION_ID=
APPWRITE_MERCHANTS_COLLECTION_ID=
APPWRITE_MERCHANT_WALLETS_COLLECTION_ID=
APPWRITE_PAYOUTS_COLLECTION_ID=          # Required for payout system
APPWRITE_NOTIFICATIONS_COLLECTION_ID=
APPWRITE_AUDIT_LOGS_COLLECTION=
APPWRITE_FRAUD_FLAGS_COLLECTION_ID=

# Auth
JWT_SECRET=<32+ character secret>
JWT_REFRESH_SECRET=<32+ character secret>
ENCRYPTION_KEY=<exactly 32 characters>
COOKIE_SECRET=<32+ character secret>

# Payment Gateways
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MTN_MOMO_SUBSCRIPTION_KEY=
MTN_MOMO_API_USER_ID=
MTN_MOMO_API_KEY=

# Email
RESEND_API_KEY=
FROM_EMAIL=noreply@afrapay.com

# Security
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Website (`Website/.env`)

```env
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
```

### Admin Dashboard (`AdminDashboard/.env`)

```env
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
```

---

## API Overview

All endpoints are prefixed with `/api/v1`.  
Authentication uses httpOnly cookies (set on login, sent automatically with `withCredentials: true`).

### Authentication

| Method | Endpoint              | Description             |
| ------ | --------------------- | ----------------------- |
| `POST` | `/auth/register`      | Register new user       |
| `POST` | `/auth/login`         | Login (returns cookies) |
| `POST` | `/auth/logout`        | Logout (clears cookies) |
| `GET`  | `/auth/me`            | Get current user        |
| `POST` | `/auth/refresh-token` | Silent token refresh    |
| `POST` | `/auth/enable-2fa`    | Setup TOTP 2FA          |

### Payments

| Method | Endpoint                    | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| `POST` | `/payments/send`            | Send money (M-Pesa / MTN / Wallet) |
| `GET`  | `/payments/send/:id/status` | Poll async payment status          |
| `GET`  | `/payments/wallet/balance`  | Get multi-currency balances        |
| `GET`  | `/payments/exchange-rates`  | Live FX rates                      |

### Merchants

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| `POST` | `/merchants/register`       | Submit merchant application              |
| `GET`  | `/merchants/me`             | Get own merchant profile                 |
| `GET`  | `/merchants/analytics`      | Merchant sales analytics (approved only) |
| `GET`  | `/merchants/wallet-balance` | Merchant wallet balance                  |
| `POST` | `/merchants/payout`         | Request payout (M-Pesa / MTN / bank)     |
| `GET`  | `/merchants/payouts`        | Payout history                           |
| `GET`  | `/merchants/payouts/:id`    | Single payout detail                     |

### Admin

| Method  | Endpoint                       | Description                  |
| ------- | ------------------------------ | ---------------------------- |
| `GET`   | `/admin/merchants`             | List all merchants           |
| `PATCH` | `/admin/merchants/:id/approve` | Approve merchant             |
| `PATCH` | `/admin/merchants/:id/reject`  | Reject merchant              |
| `GET`   | `/admin/payouts`               | List all payouts             |
| `PATCH` | `/admin/payouts/:id/process`   | Manually process payout      |
| `PATCH` | `/admin/payouts/:id/fail`      | Fail payout + restore wallet |
| `GET`   | `/admin/audit-logs`            | Audit log viewer             |
| `GET`   | `/admin/fraud-flags`           | Fraud flag management        |

---

## Role-Based Access

AfraPay has three user roles that determine routing and feature visibility:

| Role       | Dashboard      | Merchant Features                   | Admin Panel       |
| ---------- | -------------- | ----------------------------------- | ----------------- |
| `user`     | ✅ Full access | "Become a Merchant" CTA             | ❌                |
| `merchant` | ✅ Full access | ✅ Till, wallet, analytics, payouts | ❌                |
| `admin`    | ✅ Full access | Visible if applicable               | ✅ AdminDashboard |

### Merchant Application States

```
not applied  ──► pending  ──► approved  ──► (active)
                   │
                   └──► rejected  ──► (can contact support)
```

| Status   | User Sees                                                 |
| -------- | --------------------------------------------------------- |
| None     | Application form + feature benefits                       |
| Pending  | Progress tracker + "Check Status"                         |
| Approved | Full merchant dashboard: till, wallet, analytics, payouts |
| Rejected | Rejection reason + link to support                        |

---

## Security

| Control                    | Implementation                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------ |
| **Authentication**         | httpOnly JWT cookies — never exposed to JavaScript                                   |
| **Token Refresh**          | Silent `/auth/refresh-token` — refresh token in httpOnly cookie                      |
| **CSRF Protection**        | Per-request CSRF tokens validated on state-mutating operations                       |
| **Rate Limiting**          | Per-IP + per-email limits on login (5 req/15 min); payment limiter on payment routes |
| **Idempotency**            | UUID v4 `Idempotency-Key` header required for all payment/payout mutations           |
| **Input Validation**       | `express-validator` on all API routes; DOMPurify on frontend inputs                  |
| **Encryption**             | AES-256 for PII fields at rest                                                       |
| **Fraud Detection**        | Velocity checks, rapid withdrawal detection, suspicious destination patterns         |
| **Audit Logging**          | All admin and merchant actions logged with actor, IP, and user-agent                 |
| **Optimistic Concurrency** | Wallet balance re-read before every debit to prevent double-spend                    |
| **Device Fingerprinting**  | Browser fingerprints tracked for anomaly detection                                   |
| **MFA / TOTP**             | Optional TOTP-based second factor for all accounts                                   |

> **OWASP Compliance:** The platform addresses injection (parameterised queries, input sanitisation), broken access control (role checks on every protected route), cryptographic failures (httpOnly cookies, AES encryption), security misconfiguration (Joi-validated environment, strict CORS), and insecure design (idempotency, concurrency controls).

---

## Future Roadmap

### Short-term

- [ ] Real M-Pesa / MTN SDK integration (replace simulated dispatch in `payoutService.js`)
- [ ] Appwrite Realtime subscriptions for live notification and balance updates
- [ ] Merchant payout history page in consumer app (`/merchant/payouts`)
- [ ] Mobile App (Expo) — feature parity with Website

### Medium-term

- [ ] KYC document upload and verification pipeline
- [ ] Bank account linking and direct debit support
- [ ] Invoice generation for merchants
- [ ] Multi-staff merchant accounts with role assignments
- [ ] Scheduled / recurring payouts

### Long-term

- [ ] Expansion to additional African countries (Kenya, Uganda, Ethiopia)
- [ ] BNPL (Buy Now Pay Later) module
- [ ] Embedded finance API for third-party merchants
- [ ] ISO 27001 certification

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org)
4. Open a pull request against `main`

---

## License

MIT © 2026 AfraPay. All rights reserved.

---

_Built with ❤️ for South Sudan and Africa._
