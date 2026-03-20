# Cards Module — Full-Stack Implementation

## Overview

The Cards page was transformed from a static, hardcoded demo into a fully dynamic, production-ready system connected to the Appwrite database via the Node.js backend. All mock data has been removed. Card data is now fetched, created, updated, and deleted through authenticated REST API endpoints with tokenized storage.

---

## Files Created / Modified

### Backend

| File                                            | Status       | Description                                                                |
| ----------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| `backend/diagnostics/setup-cards-collection.js` | **Created**  | Idempotent script to create all Appwrite collection attributes and indexes |
| `backend/src/services/tokenizationService.js`   | **Created**  | AES-256-GCM card tokenization + HMAC-SHA256 fingerprinting                 |
| `backend/src/services/cardService.js`           | **Created**  | Business logic layer — all DB operations scoped to `userId`                |
| `backend/src/controllers/cardController.js`     | **Created**  | HTTP controller delegating to `cardService`                                |
| `backend/src/routes/v1/cards.js`                | **Created**  | Express router with auth, rate limiting, and validation                    |
| `backend/src/config/environment.js`             | **Modified** | Added `APPWRITE_USER_CARDS_COLLECTION_ID` to Joi schema and config object  |
| `backend/src/routes/v1/index.js`                | **Modified** | Registered `/api/v1/cards` route group                                     |

### Frontend

| File                              | Status       | Description                                                               |
| --------------------------------- | ------------ | ------------------------------------------------------------------------- |
| `Website/src/services/cardAPI.js` | **Created**  | Axios-based API service mirroring the backend routes                      |
| `Website/src/pages/Cards.jsx`     | **Modified** | Replaced all hardcoded data with live API calls; added real add-card form |

---

## Database Schema

**Collection:** `USER_CARDS_COLLECTION_ID`

| Attribute     | Type               | Notes                                                                                |
| ------------- | ------------------ | ------------------------------------------------------------------------------------ |
| `userId`      | string(36)         | Appwrite user ID — all queries scoped to this                                        |
| `cardLast4`   | string(4)          | Last 4 digits of PAN — only non-sensitive card data stored in plaintext              |
| `cardBrand`   | string(20)         | `visa`, `mastercard`, `amex`, `discover`, `other`                                    |
| `expiryMonth` | integer(1–12)      | Card expiry month                                                                    |
| `expiryYear`  | integer(2020–2060) | Card expiry year                                                                     |
| `token`       | string(512)        | AES-256-GCM encrypted token — format `base64(iv):base64(authTag):base64(ciphertext)` |
| `fingerprint` | string(64)         | HMAC-SHA256 of `userId + PAN` — used for deduplication                               |
| `provider`    | string(50)         | Default: `"internal"`                                                                |
| `label`       | string(100)        | Optional user-defined card name                                                      |
| `cardType`    | string(20)         | `virtual` or `physical`                                                              |
| `holderName`  | string(200)        | Cardholder full name                                                                 |
| `status`      | string(20)         | `active` or `frozen`                                                                 |
| `color`       | string(200)        | Tailwind gradient class for UI display                                               |
| `isDefault`   | boolean            | Whether this is the user's default card                                              |
| `createdAt`   | string(30)         | ISO-8601 timestamp                                                                   |
| `updatedAt`   | string(30)         | ISO-8601 timestamp                                                                   |

**Indexes:**

| Index                  | Type   | Fields                  | Purpose                             |
| ---------------------- | ------ | ----------------------- | ----------------------------------- |
| `idx_userId`           | key    | `userId`                | Fetch all cards for a user          |
| `idx_user_fingerprint` | unique | `userId`, `fingerprint` | Prevent duplicate card registration |
| `idx_user_default`     | key    | `userId`, `isDefault`   | Efficiently find the default card   |
| `idx_user_status`      | key    | `userId`, `status`      | Filter by active/frozen             |

---

## API Endpoints

Base path: `/api/v1/cards`

All endpoints require a valid `accessToken` httpOnly cookie (JWT authentication).

| Method   | Path           | Description                               | Rate Limit       |
| -------- | -------------- | ----------------------------------------- | ---------------- |
| `GET`    | `/`            | List all cards for the authenticated user | 120 req / 15 min |
| `POST`   | `/`            | Add a new card (tokenizes PAN + CVV)      | 5 req / 15 min   |
| `DELETE` | `/:id`         | Delete a card by ID                       | 30 req / 15 min  |
| `PATCH`  | `/:id/default` | Set a card as the default                 | 30 req / 15 min  |
| `PATCH`  | `/:id/status`  | Freeze or unfreeze a card                 | 30 req / 15 min  |
| `PATCH`  | `/:id`         | Update card label or colour               | 30 req / 15 min  |

### POST `/` Request Body

```json
{
  "cardNumber": "4111111111111111",
  "holderName": "Anthony Wai",
  "expiryMonth": 12,
  "expiryYear": 2028,
  "cvv": "123",
  "label": "Primary Card",
  "cardType": "virtual",
  "color": "from-blue-600 via-blue-500 to-teal-500"
}
```

> Raw PAN and CVV are **never persisted**. The tokenisation service runs synchronously and only the encrypted token + HMAC fingerprint are written to the database.

### GET `/` Response Shape

```json
{
  "cards": [
    {
      "id": "...",
      "cardLast4": "1111",
      "cardBrand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2028,
      "label": "Primary Card",
      "cardType": "virtual",
      "holderName": "Anthony Wai",
      "status": "active",
      "isDefault": true,
      "provider": "internal",
      "color": "from-blue-600 via-blue-500 to-teal-500",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

> `token` and `fingerprint` are stripped from all API responses.

---

## Security Design

### Tokenization (`tokenizationService.js`)

- **Luhn check** — rejects structurally invalid PANs before any processing
- **CVV format validation** — 3–4 digits, never stored
- **Expiry validation** — rejects already-expired cards
- **AES-256-GCM encryption** — uses `ENCRYPTION_KEY` (32-byte env variable); IV is randomly generated per token; authentication tag is stored alongside ciphertext to detect tampering
- **HMAC-SHA256 fingerprint** — keyed on `TOKEN_HMAC_KEY || ENCRYPTION_KEY`, input is `userId + PAN`. Used for deduplication via a unique database index — the same card cannot be added twice per user

### Access Control

- Every service method receives `userId` as its first argument and enforces document ownership before any read/write
- `DELETE` and `PATCH` operations verify the card belongs to the requesting user before proceeding (`AuthorizationError` thrown otherwise)

### Rate Limiting

- Card addition is capped at **5 requests per 15 minutes** to prevent card enumeration attacks
- All other write operations capped at **30 requests per 15 minutes**

### Business Rules

- Maximum **10 cards per user** (enforced in `cardService.addCard`)
- First card added is automatically set as default
- Deleting the default card automatically promotes the next available card
- Frozen cards cannot be set as default

---

## Frontend Changes (`Cards.jsx`)

### Removed

- `DEMO_CARDS` static array
- `useCurrency` / `formatCurrencyAmount` (balance was fake — not a real field)
- Synchronous `toggleFreeze` and `deleteCard` handlers

### Added

- `useEffect` on mount → `cardAPI.getCards()` → maps API shape to UI shape via `mapApiCard()`
- Loading spinner state while fetching
- Error state with retry button
- Optimistic UI updates for freeze/delete/set-default with automatic rollback on API error
- Real add-card form with:
  - Card number input (auto-formats as `XXXX XXXX XXXX XXXX`)
  - Cardholder name
  - Expiry month/year selectors
  - CVV password input
  - Optional label
  - Card type toggle (virtual / physical)
  - Colour picker (6 Tailwind gradient presets)
  - Inline error display from API responses
- Default card indicator (★ star icon on card face)
- "Set as default" action button per card

### Stats Row

| Before                     | After                  |
| -------------------------- | ---------------------- |
| Total Cards                | Total Cards            |
| Active                     | Active                 |
| Frozen                     | Frozen                 |
| Total Balance _(fake sum)_ | Virtual _(real count)_ |

---

## Environment Variables

Add the following to `backend/.env`:

```env
APPWRITE_USER_CARDS_COLLECTION_ID=<your_appwrite_collection_id>
```

The existing `ENCRYPTION_KEY` (32-byte) is reused for tokenization. Optionally add a separate key:

```env
TOKEN_HMAC_KEY=<64-char-hex-string>
```

If `TOKEN_HMAC_KEY` is not set, `ENCRYPTION_KEY` is used as the HMAC key.

---

## One-Time Setup

After adding the environment variable, run the collection setup script from the `backend/` directory:

```bash
node diagnostics/setup-cards-collection.js
```

This script is **idempotent** — safe to run multiple times. It creates all required Appwrite attributes and indexes, skipping any that already exist.

---

## Frontend API Service (`cardAPI.js`)

```js
import { cardAPI } from "../services/cardAPI";

// Fetch all cards
const { cards } = await cardAPI.getCards();

// Add a card
const { card } = await cardAPI.addCard({ cardNumber, holderName, ... });

// Delete
await cardAPI.deleteCard(id);

// Set default
await cardAPI.setDefaultCard(id);

// Freeze / unfreeze
await cardAPI.updateCardStatus(id, "frozen" | "active");

// Update label / colour
await cardAPI.updateCard(id, { label, color });
```
