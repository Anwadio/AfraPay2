# Analytics Dashboard — Full-Stack Implementation

## Overview

Replaced the hard-coded, demo-data Analytics page with a fully dynamic, real-time dashboard connected to the Appwrite database. All metrics are fetched live from the backend on every page load and when the user changes the time period.

---

## Files Changed / Created

### Backend

| File                                             | Status                                              |
| ------------------------------------------------ | --------------------------------------------------- |
| `backend/src/controllers/analyticsController.js` | **New**                                             |
| `backend/src/routes/v1/analytics.js`             | **New**                                             |
| `backend/src/routes/v1/index.js`                 | **Updated** — registered the new `/analytics` route |

### Frontend

| File                                | Status                             |
| ----------------------------------- | ---------------------------------- |
| `Website/src/hooks/useAnalytics.js` | **New**                            |
| `Website/src/services/api.js`       | **Updated** — added `analyticsAPI` |
| `Website/src/pages/Analytics.jsx`   | **Rewritten**                      |

---

## Backend

### `GET /api/v1/analytics/dashboard`

A single endpoint that returns everything the dashboard needs in one round-trip.

**Query parameters**

| Param      | Type                                                        | Default | Description                           |
| ---------- | ----------------------------------------------------------- | ------- | ------------------------------------- |
| `period`   | `day` \| `week` \| `month` \| `year`                        | `month` | Time window for period-scoped metrics |
| `currency` | `USD` \| `EUR` \| `GBP` \| `NGN` \| `GHS` \| `KES` \| `ZAR` | _(all)_ | Filter transactions by currency       |

**Response shape**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBalance": 8340.0,
      "incomingAmount": 4200.0,
      "outgoingAmount": 1860.0,
      "netSavings": 2340.0,
      "transactionCount": 47,
      "currency": "USD"
    },
    "monthlyTrend": {
      "labels": ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
      "income": [2800, 3100, 2600, 3800, 3500, 4200],
      "expenses": [1900, 2100, 1700, 2300, 2000, 1860]
    },
    "categories": [
      {
        "name": "Transfers",
        "amount": 620,
        "percentage": 33,
        "color": "#8b5cf6"
      }
    ],
    "categoryTotalSpent": 1860.0,
    "providerBreakdown": [
      {
        "provider": "M-Pesa",
        "count": 12,
        "volume": 1250.0,
        "percentage": 45,
        "color": "#10b981"
      },
      {
        "provider": "MTN MoMo",
        "count": 8,
        "volume": 830.0,
        "percentage": 30,
        "color": "#f59e0b"
      }
    ],
    "topTransactions": [
      {
        "id": "...",
        "type": "credit",
        "txType": "deposit",
        "amount": 3200,
        "currency": "USD",
        "description": "Salary",
        "date": "Mar 1",
        "provider": "Wallet"
      }
    ],
    "recentTransactions": ["..."],
    "meta": {
      "period": "month",
      "generatedAt": "2026-03-19T12:00:00.000Z"
    }
  }
}
```

### How the controller works

All Appwrite queries fan out in parallel using `Promise.all` to minimise wall-clock latency:

1. **`_calcSummary`** — computes period totals (income, outgoing, net savings, count) and an all-time running balance by paginating through every completed transaction.
2. **`_calcMonthlyTrend`** — fetches the entire 6-month window in one paginated query, then buckets by calendar month in memory — far cheaper than 6 individual queries.
3. **`_calcCategoryAndProviderBreakdown`** — one fetch, two aggregations: spending-by-category (Payments, Transfers, Withdrawals, Fees) and provider volume (M-Pesa, MTN MoMo, Wallet, Card, Bank Transfer). Raw `paymentMethod` strings are normalised via a lookup map that handles all naming variants (`mpesa`, `m-pesa`, `m_pesa`, etc.).
4. **`_calcTopTransactions`** — fetches all period transactions and sorts in-memory by amount (Appwrite does not support `ORDER BY amount` natively).
5. **`_calcRecentTransactions`** — latest 5 transactions using `Query.orderDesc("$createdAt")`.
6. **`_fetchAll`** — generic paginator that handles Appwrite's 100-document-per-request cap by looping until the last page.

### Security

- All queries include `Query.equal("userId", userId)` — no cross-user data leakage is possible.
- The endpoint requires a valid JWT (`authenticate` middleware).
- Rate limited to **30 requests per minute** per user IP.
- Query parameters are validated with `express-validator` before the controller runs.

---

## Frontend

### `useAnalytics(period)` hook

Located at `Website/src/hooks/useAnalytics.js`.

```js
const { data, loading, error, refetch } = useAnalytics(period);
```

- Calls `GET /api/v1/analytics/dashboard?period=<period>` on mount and when `period` changes.
- Uses a monotonic request counter (`requestIdRef`) to discard stale responses — avoids race conditions when the user rapidly switches periods.
- Returns `loading: true` while the request is in flight, and `error: string` on failure.

### `analyticsAPI` service

Added to `Website/src/services/api.js`:

```js
import { analyticsAPI } from "../services/api";

// Fetch full dashboard payload
const result = await analyticsAPI.getDashboard({
  period: "month",
  currency: "USD",
});
```

### Analytics page — what changed

| Area                         | Before                     | After                                                                                         |
| ---------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| Data source                  | Hard-coded demo constants  | Live Appwrite data via `useAnalytics` hook                                                    |
| Income vs Expenses bar chart | Static 6-month demo arrays | Live `monthlyTrend.income` / `monthlyTrend.expenses`                                          |
| Savings Trend line chart     | Computed from demo data    | Computed from live `monthlyTrend` data                                                        |
| Spending by Category         | Hard-coded 6 categories    | Live `categories` from DB, animated bars (Framer Motion)                                      |
| Provider Breakdown           | Not present                | New section: M-Pesa, MTN MoMo, Wallet, Card, Bank Transfer cards with icons, volume, count, % |
| Top Transactions             | Hard-coded 5 items         | Live top-5 by amount for selected period                                                      |
| Recent Activity              | Not present                | New section: latest 5 transactions with status badges                                         |
| Quick Insights               | Partial demo data          | Savings rate, avg monthly spend, and transaction count all live                               |
| Loading state                | Single spinner             | Per-section skeleton loaders                                                                  |
| Error state                  | None                       | Full-page error card with Retry button                                                        |
| Empty states                 | None                       | "No data" messages per section                                                                |
| Period selector              | Changes UI only            | Triggers a new backend fetch                                                                  |
| Refresh button               | Not working                | Calls `refetch()` with loading spinner                                                        |
| Export button                | Stub                       | Calls backend CSV export for selected period                                                  |

---

## Architecture Notes

```
Browser
  └── Analytics.jsx
        └── useAnalytics(period)
              └── analyticsAPI.getDashboard({ period })
                    └── GET /api/v1/analytics/dashboard
                          ├── authenticate (JWT)
                          ├── analyticsLimiter (30 req/min)
                          ├── analyticsQueryValidation
                          └── AnalyticsController.getDashboardAnalytics()
                                └── Promise.all([
                                      _calcSummary(),
                                      _calcMonthlyTrend(),
                                      _calcCategoryAndProviderBreakdown(),
                                      _calcTopTransactions(),
                                      _calcRecentTransactions()
                                    ])
                                      └── _fetchAll() ← paginated Appwrite queries
```

---

## Provider Colour Reference

| Provider      | Colour              |
| ------------- | ------------------- |
| M-Pesa        | `#10b981` (emerald) |
| MTN MoMo      | `#f59e0b` (amber)   |
| Wallet        | `#6366f1` (indigo)  |
| Card          | `#3b82f6` (blue)    |
| Bank Transfer | `#8b5cf6` (violet)  |
| Other         | `#64748b` (slate)   |
