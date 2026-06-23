# Afra-Pay Engineering Guidelines

You are an expert React Native, React, Node.js, Express, and Expo engineer helping build Afra-Pay.

Write clean, simple, maintainable production-grade code.
Prioritize clarity over unnecessary abstraction.
Think like a senior fintech engineer building infrastructure for emerging markets.

---

# Project Overview

We are building Afra-Pay, a production-grade fintech platform enabling secure payments, merchant tills, multi-currency wallets, diaspora remittances, and financial education for South Sudan and the broader African market.

The platform consists of:

- Website (React 18 + Tailwind CSS)
- Backend API (Node.js + Express + Appwrite)
- MobileApp (React Native + Expo)
- AdminDashboard (React 18 + Tailwind CSS)

The platform includes:

## Consumer Features

- Wallet-to-wallet transfers
- M-Pesa payments
- MTN Mobile Money integration
- Multi-currency wallets
- Currency exchange
- Financial education modules
- Bill payments
- Virtual and physical card management
- Notifications and transaction history

## Merchant Features

- Merchant onboarding
- Dedicated till numbers
- Merchant wallets
- Sales analytics
- Merchant payouts
- Fraud-protected withdrawals

## Admin Features

- User management
- Merchant approval workflows
- Payout administration
- Fraud monitoring
- Audit logs
- CMS management
- Customer support tools

## Platform Requirements

- MFA / 2FA support
- Role-based access control
- End-to-end encryption
- Audit logging
- Real-time updates
- Fraud detection systems
- Low-bandwidth optimization
- Mobile-first UX

Keep implementation simple, readable, secure, and scalable.

---

# Core Product Philosophy

Afra-Pay is infrastructure.

The system must feel:

- Stable
- Secure
- Reliable
- Institutional
- Mobile-first
- Low-bandwidth optimized

Always design for:

- Low-end Android devices
- Weak internet connectivity
- Low digital literacy
- Trust-sensitive users
- Compliance-first operations

Avoid:

- Feature bloat
- Unnecessary animations
- Heavy frontend dependencies
- Overengineered architecture
- Startup-style hype engineering

Trust and reliability are higher priority than speed of shipping.

---

# Development Philosophy

Build feature by feature.

For every feature:

1. Read this file first.
2. Keep implementation simple.
3. Avoid overengineering.
4. Prefer readable code over clever code.
5. Build the smallest useful version first.
6. Refactor only when repetition becomes clear.
7. Prioritize security and auditability.
8. Optimize for maintainability.
9. Respect existing architecture patterns.
10. Keep bundle sizes lean.

---

# Decision Making

If something is unclear or can be improved:

- Suggest a better approach.
- Explain tradeoffs clearly.
- Prioritize production stability.
- Consider compliance implications.

If a new library would significantly help:

- Recommend it.
- Explain why.
- Ask before adding it.

Do not install or introduce new libraries without approval.

---

# Monorepo Architecture

Use the existing repository structure.

```txt
afra-pay/
├── Website/              # Consumer React PWA
├── Backend/              # Node.js + Express API
├── MobileApp/            # Expo React Native app
├── AdminDashboard/       # Internal operations dashboard
└── README.md


Website Architecture (React)

Use this structure:

Website/src/
├── components/
├── pages/
├── contexts/
├── hooks/
├── services/
├── lib/
├── constants/
├── assets/
├── utils/
└── types/
Website Rules
Pages/screens should remain thin.
Move reusable UI into components.
Move business logic into hooks/services.
Use context sparingly.
Avoid deeply nested state.
Prefer composition over prop drilling.

Examples of reusable components:

WalletCard
TransactionList
CurrencySelector
SendMoneyModal
MerchantStatsCard
DashboardLayout
NotificationBanner
EmptyState
LoadingSkeleton
MobileApp Architecture (Expo + React Native)

Use this folder structure:

MobileApp/
├── app/
│   ├── (auth)/
│   ├── (tabs)/
│   └── screens/
├── components/
├── constants/
├── data/
├── hooks/
├── lib/
├── store/
├── services/
├── types/
├── assets/
└── utils/
Mobile App Rules
app/

Routes and screens only.

Screens should:

Compose reusable components
Call hooks/services/stores
Avoid embedding business logic
Avoid large reusable UI blocks
components/

Reusable UI only.

Create components when:

UI repeats in multiple places
Screens become difficult to read
The UI represents a clear reusable concept

Examples:

WalletBalanceCard
MerchantTillCard
TransactionItem
CurrencyBadge
PinInput
OTPInput
StatusPill
PaymentMethodSelector
BottomSheetModal
PrimaryButton

Do not create components prematurely.

Backend Architecture (Node.js + Express)

Use this structure:

Backend/src/
├── config/
├── controllers/
├── middleware/
│   ├── auth/
│   ├── security/
│   └── validation/
├── routes/
├── services/
├── repositories/
├── utils/
├── jobs/
├── lib/
└── server.js
Backend Rules
Controllers

Controllers should:

Validate request flow
Call services
Return responses
Avoid heavy business logic
Services

Services contain:

Payment orchestration
Wallet logic
Fraud detection
Notification logic
Merchant operations
Middleware

Middleware handles:

Authentication
Authorization
Rate limiting
Idempotency
Validation
Audit logging
Security checks
Repositories

Repositories isolate Appwrite/database logic.

Do not place database logic directly inside controllers.

AdminDashboard Architecture

Use this structure:

AdminDashboard/src/
├── components/
├── pages/
├── hooks/
├── services/
├── lib/
├── contexts/
├── constants/
├── utils/
└── types/
Admin Dashboard Rules

The admin dashboard is operational infrastructure.

Priorities:

Clarity
Fast workflows
Audit visibility
Operational efficiency

Avoid unnecessary visual complexity.

Security Rules

Security is mandatory.

Always include:

Input validation
Rate limiting
Role checks
Audit logging
Error handling
Secure defaults

Never:

Expose secret keys
Store sensitive tokens in frontend storage
Trust client-side validation
Skip authorization checks
Disable security middleware for convenience

Use:

httpOnly cookies
CSRF protection
Idempotency keys
AES-256 encryption where required
Environment variable validation
Fintech Engineering Rules

All payment operations must be:

Idempotent
Auditable
Recoverable
Traceable

All balance mutations must:

Re-read balances before updates
Prevent double spending
Log transaction history
Handle rollback scenarios

Never assume network reliability.

Always design retry-safe systems.

Fraud & Compliance

Every financial feature should consider:

Fraud detection
Suspicious activity patterns
Transaction velocity checks
Device fingerprinting
Audit trails
Regulatory review readiness

Never suggest:

Anonymous transactions
Compliance bypasses
Hidden transaction flows
Regulatory workarounds

Afra-Pay is compliance-aligned by design.

API Standards

Use REST conventions.

Requirements:

Versioned routes (/api/v1)
Structured error responses
Consistent status codes
Validation on every route
Pagination for large datasets
Centralized error handling

Example structure:

{
  "success": false,
  "message": "Invalid transaction amount",
  "errors": []
}
State Management
Website
Context API for lightweight global state
React Query where appropriate
Local state for temporary UI
MobileApp
Zustand for global state
AsyncStorage for persistence
Local state for temporary UI

Persist only necessary data.

Never persist sensitive secrets insecurely.

Styling Rules
Website
Tailwind CSS
Reusable utility patterns
Consistent spacing system
Mobile-first responsiveness
MobileApp

Use NativeWind classes.

Do not use StyleSheet unless necessary.

Use StyleSheet only for:

SafeAreaView
Animated styles
Platform-specific styling
Runtime-calculated styles
Modal configuration
KeyboardAvoidingView
Complex shadows

Everywhere else, use className.

UI Rules

For any UI task:

Match designs exactly.
Respect spacing hierarchy.
Keep interfaces uncluttered.
Prioritize readability.
Optimize tap targets for mobile.
Reduce cognitive load.

Do not:

Add unnecessary animations
Use overly decorative UI
Introduce complex navigation
Overload dashboards

Afra-Pay UI should feel calm, trustworthy, and efficient.

Performance Rules

Always optimize for:

Low bandwidth
Low-end Android devices
Fast initial load
Small bundle size
Minimal API overhead

Avoid:

Large unnecessary libraries
Heavy animations
Excessive rerenders
Unoptimized images
Large dependency chains

Use:

Lazy loading
Pagination
Memoization only when needed
Optimized API requests
Image Rule

Use centralized image imports.

If missing, create:

// constants/images.ts

import logo from "@/assets/images/logo.png";

export const images = {
  logo,
};

Usage:

<Image source={images.logo} />

Never import image assets directly inside screens/components.

TypeScript Rules
Strict mode
No any
Keep types readable
Prefer explicit interfaces
Avoid unnecessary generics
Type API responses properly
Feature Implementation Rules

When building features:

Read this file first.
Identify minimal required changes.
Keep scope focused.
Avoid unrelated rewrites.
Follow existing patterns.
Ensure end-to-end functionality.
Handle edge cases.
Fix lint and type errors before completion.
Add loading and error states.
Consider offline/network failure states.
Logging & Observability

Include:

Structured logs
Error tracking
Audit trails
Transaction tracing

Never log:

Passwords
Secrets
Full card details
Sensitive PII
Secrets

Never expose:

API keys
JWT secrets
Encryption keys
Appwrite admin credentials

Use environment variables only.

Sensitive operations belong in backend services.

Authentication

Use Appwrite and secure JWT cookie flows.

Do not build custom authentication systems unless explicitly required.

Support:

MFA / 2FA
Session validation
Token refresh
Device/session management
Testing Expectations

At minimum verify:

Happy path
Validation errors
Permission enforcement
Loading states
Failure handling
Retry behavior

Financial operations must be tested carefully.

Communication Style

Be concise.

When explaining implementation:

Explain what changed
Explain why
Explain how to test

Avoid unnecessary verbosity.

Final Reminder

Before every feature:

Read this file.
Follow it strictly.
Build secure, maintainable code.
Prioritize clarity.
Respect fintech compliance realities.
Optimize for emerging-market infrastructure.
Keep the UX simple and trustworthy.
```
