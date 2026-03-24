# Blueberry Pancake — System Documentation

> **Generated:** 2026-03-23 | **Read-only investigation** — no code changes made

A full-stack blind tasting event management application. Administrators create events, guests join via PIN, rate items blindly, and view results on a dashboard.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [API Endpoints](#5-api-endpoints)
6. [Database Schema](#6-database-schema)
7. [Security Mechanisms](#7-security-mechanisms)
8. [Caching Strategies](#8-caching-strategies)
9. [Build & Deployment](#9-build--deployment)
10. [Testing](#10-testing)

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend framework** | React | 19.2.1 |
| **Build tool** | Vite | 6.0.5 |
| **Styling** | Tailwind CSS | 4.1.17 |
| **UI primitives** | Radix UI | Various |
| **Icons** | Lucide React | 0.556.0 |
| **Routing** | React Router | 7.10.1 |
| **Backend framework** | Express | 5.2.1 |
| **Runtime** | Node.js | ≥ 22.12.0 |
| **Database** | DynamoDB (single-table) | AWS SDK v3 |
| **Auth** | JWT (HS256) + Refresh Tokens | jsonwebtoken 9.0.3 |
| **Bot protection** | Cloudflare Turnstile | — |
| **Email** | Resend | 6.5.2 |
| **Security headers** | Helmet | 8.1.0 |
| **ID generation** | Nanoid | 5.1.6 |
| **Unit testing** | Vitest | 1.6.1 |
| **E2E testing** | Playwright | 1.57.0 |
| **Infrastructure** | AWS SAM (Lambda, API Gateway, S3, CloudFront) | — |
| **Local DB** | DynamoDB Local (Docker) | — |

---

## 2. Project Structure

```
blueberry-pancake/
├── backend/
│   └── src/
│       ├── server.js              # Node.js entry point
│       ├── app.js                 # Express app + middleware stack
│       ├── lambda.js              # AWS Lambda handler
│       ├── api/                   # Route modules (10 files)
│       ├── services/              # Business logic (15 services)
│       ├── data/                  # DynamoDBRepository (single-table)
│       ├── middleware/            # Auth, CSRF, logging, etc. (7 files)
│       ├── config/                # Config loader + validator
│       ├── logging/               # Logger
│       └── utils/                 # Validators, helpers (9 files)
├── frontend/
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Router + layout
│       ├── pages/                 # 12 page components
│       ├── components/            # 59 components + 13 Radix UI wrappers
│       │   ├── ui/                # Radix UI wrappers (.tsx)
│       │   ├── guide/             # Hosting/admin guide components
│       │   └── system/            # System admin components
│       ├── contexts/              # EventContext, PINContext
│       ├── hooks/                 # 8 custom hooks
│       ├── services/              # API client + domain services (6 files)
│       ├── utils/                 # Helpers, validators (24 files)
│       ├── data/                  # Guide content, quotes
│       └── lib/                   # cn() utility
├── config/                        # Environment configs (default, dev, prod)
├── scripts/                       # Dev/build/deploy scripts
├── specs/                         # Feature specifications
├── template.yaml                  # SAM backend template
├── template-frontend.yaml         # CloudFormation frontend template
├── docker-compose.yml             # DynamoDB Local
└── package.json                   # Monorepo root (workspaces)
```

**Lines of code:** ~26,000+ (frontend ~13,000 / backend ~13,000)

---

## 3. Frontend Architecture

### 3.1 Client-Side Routes

| Route | Component | Auth | Purpose |
|-------|-----------|------|---------|
| `/` | `LandingPage` | None | Join/create entry point |
| `/auth` | `AuthPage` | None | Email + OTP verification |
| `/create-event` | `CreateEventPage` | ProtectedRoute | Event creation form |
| `/my-events` | `MyEventsPage` | ProtectedRoute | User's event list |
| `/system` | `SystemPage` | ProtectedRoute | Root admin dashboard |
| `/event/:eventId/email` | `EmailEntryPage` | None | Guest name/email entry |
| `/event/:eventId/pin` | `PINEntryPage` | None | PIN verification |
| `/event/:eventId/otp` | `EventOTPEntryPage` | None | Admin OTP entry |
| `/event/:eventId` | `EventPage` | Session | Main event page (ratings, items) |
| `/event/:eventId/admin` | `EventAdminPage` | AdminRoute | Event admin dashboard |
| `/event/:eventId/admin/items/assign` | `ItemAssignmentPage` | AdminRoute | Item assignment |
| `/event/:eventId/dashboard` | `DashboardPage` | DashboardRoute | Results dashboard |

### 3.2 Route Guards

- **ProtectedRoute** — Requires valid JWT; redirects to `/auth`
- **AdminRoute** — Requires OTP-authenticated event administrator
- **DashboardRoute** — Admins: always; Guests: only when event state = `completed`
- **RouteGuard** — Reusable wrapper showing loading spinner during permission checks

### 3.3 Context Providers

**EventContext** (`contexts/EventContext.jsx`)
```
{ event, eventId, isAdmin, refetch }
```
Provides event data and admin status. Includes polling via `useEventPolling` (30s interval, pauses when tab hidden).

**PINContext** (`contexts/PINContext.jsx`)
```
{ pinVerified, sessionId, setPinVerified, clearPINSession }
```
Session stored in localStorage as `pin:session:{eventId}`.

**Client-Side localStorage Keys:**

| Key | Purpose | Written | Read | Cleared |
|-----|---------|---------|------|---------|
| `userSession` | JWT token for API client | On login/refresh | apiClient on every request | On logout |
| `pin:session:{eventId}` | PIN session ID | On PIN verification | PINContext | On logout |
| `pin:email:{eventId}` | Guest's email per event for session recovery | During PIN verification | SessionExpiredDialog (when session email is null) | On logout |

### 3.4 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useEvent()` | Fetch event data with loading/error states |
| `useEventPolling()` | Poll event updates every 30s with backoff |
| `useEventPublicInfo()` | Fetch public event info (no auth) |
| `useItemDetailsData()` | Fetch item details |
| `useTurnstile()` | Cloudflare Turnstile widget integration |
| `useViewportHeight()` | Dynamic mobile viewport height |
| `useDarkMode()` | Dark mode toggle |
| `useColumnSort()` | Sortable table column state |

### 3.5 Component Inventory

**Pages (12):** LandingPage, AuthPage, CreateEventPage, MyEventsPage, EventPage, EventAdminPage, DashboardPage, ItemAssignmentPage, EmailEntryPage, PINEntryPage, EventOTPEntryPage, SystemPage

**Radix UI Wrappers (13):** Accordion, AlertDialog, Badge, Button, Card, Input, Label, Progress, Sonner (toasts), Switch, Tabs, Toggle, ToggleGroup

**Core Components (40+):** Header, RatingForm, RatingDrawer, ItemForm, ItemButton, ItemDetailsDrawer, UserDetailsDrawer, PersonalityCard, PersonalityRevealSheet, MyBottlesSheet, SimilarUsersDrawer, ExportCard, StatisticsCard, Sparkline, InviteQRCard, EventProgressStepper, ThemePicker, DestructiveActionDialog, SessionExpiredDialog, MembershipRevokedDialog, GuestWelcomeBottomSheet, AssignmentView, DropdownMenu, SideDrawer, BottomSheetPicker, LoadingSpinner, and more.

**Guide Components (6):** GuideDrawer, EventGuideDrawer, GuideRoleSelect, GuideStepCard, GuideProgress, GuideNavigation

### 3.6 API Client

`services/apiClient.js` — Singleton HTTP client:
- JWT stored in localStorage as `userSession`
- CSRF token auto-fetched for state-changing requests
- Session visibility listener (refetches on tab focus)
- Dispatches `session-expired` and `membership-revoked` custom events

### 3.7 Theme System

10 theme presets: classic (default), cellar, terracotta, golden, olive, garden, ocean, midnight, lavender, rose. CSS variables injected via `EventThemeProvider`. Dark mode via `next-themes`.

---

## 4. Backend Architecture

### 4.1 Middleware Stack (in order)

1. **Helmet** — Security headers (CSP, HSTS, X-Frame-Options)
2. **CORS** — Credentials enabled, specific origin in production
3. **Cookie Parser** — Parse incoming cookies
4. **Express JSON/URL** — Request body parsing
5. **Logger** — Request logging
6. **XSRF Protection** — CSRF token validation on state-changing requests
7. **API Router** — Route dispatch
8. **Error Handler** — Global error catch

### 4.2 Service Layer (15 services)

| Service | Responsibility |
|---------|---------------|
| `EventService` | Event CRUD, state transitions |
| `EventConfigService` | Rating/item configuration |
| `EventMemberService` | User registration, userId backfill |
| `EventAdminService` | Administrator management |
| `ItemService` | Item CRUD, assignment |
| `RatingService` | Rating submission/retrieval |
| `DashboardService` | Aggregated statistics + cache |
| `OTPService` | OTP generation, verification, timing-safe comparison |
| `PINService` | PIN generation, verification, session management |
| `PersonalityService` | Wine personality detection |
| `SimilarityService` | User similarity computation |
| `EmailService` | Email sending via Resend |
| `TurnstileService` | Cloudflare bot verification |
| `RateLimitService` | Sliding window rate limiting |
| `SuspensionService` | User suspension management |
| `SystemService` | System admin operations |

### 4.3 Error Handling

Global error handler in `middleware/errorHandler.js`. Utility functions:
- `badRequestError(res, message, code?)` → 400
- `unauthorizedError(res, message, code?)` → 401
- `forbiddenError(res, message, code?)` → 403
- `notFoundError(res, message, code?)` → 404
- `rateLimitError(res, message, code?)` → 429
- `handleApiError()` → Centralized error dispatch
- `formatRateLimitResponse(res, result, message, code?)` → 429 with `retryAfter`

All auth/authz error helpers accept an optional `code` parameter. When provided, the response includes a machine-readable `code` field: `{ error: "message", code: "ERROR_CODE" }`. When omitted, the response is the original `{ error: "message" }` shape (backward compatible).

**Error Code Taxonomy:**

| Category | Codes | Used For |
|----------|-------|----------|
| Credential errors | `INVALID_PIN`, `INVALID_OTP`, `OTP_EXPIRED`, `INVALID_EMAIL`, `INVALID_DISPLAY_NAME`, `SUSPENDED`, `ADMIN_MUST_USE_OTP` | Login attempt failures — frontend shows inline error, NOT session expiry dialog |
| Session errors | `TOKEN_EXPIRED`, `TOKEN_INVALID`, `AUTHENTICATION_REQUIRED`, `EVENT_ACCESS_DENIED` | Expired/invalid sessions — frontend triggers session-expired dialog |
| Membership errors | `EVENT_MEMBERSHIP_REQUIRED` | User not registered for event |
| Authorization errors | `ADMIN_REQUIRED`, `OWNER_REQUIRED`, `ROOT_ACCESS_REQUIRED` | Insufficient permissions |
| Rate-limit errors | `RATE_LIMITED` | Too many requests |

The frontend `apiClient.js` uses the `code` field to distinguish credential errors (skip session-expired dispatch) from session errors (trigger session-expired). URL-based safety net also skips session-expired for `/verify-pin`, `/otp/verify`, `/otp/request` endpoints.

---

## 5. API Endpoints

### 5.1 Public Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check + DynamoDB status |
| GET | `/api/csrf-token` | CSRF token (sets httpOnly cookie) |
| POST | `/api/auth/otp/request` | Request OTP (email + Turnstile) |
| POST | `/api/auth/otp/verify` | Verify OTP → JWT + refresh token |
| GET | `/api/events/:eventId/public-info` | Public event info (name, type, theme, state) |
| GET | `/api/events/:eventId/check-admin` | Check if email is admin (rate-limited) |
| POST | `/api/events/:eventId/verify-pin` | PIN verification → JWT + refresh token |
| GET | `/api/events/:eventId/rating-configuration` | Rating config (maxRating, labels, colors) |
| GET | `/api/quotes/:ratingLevel` | Quote suggestions for ratings |

### 5.2 Authenticated Endpoints (JWT required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/logout` | Invalidate tokens, clear cookies |
| POST | `/api/auth/refresh` | Rotate JWT + refresh token |
| POST | `/api/events` | Create new event |
| GET | `/api/events/mine` | List user's administered events |
| GET | `/api/events/:eventId` | Full event details |
| PATCH | `/api/events/:eventId` | Update event name |
| DELETE | `/api/events/:eventId` | Delete event (owner only) |
| PATCH | `/api/events/:eventId/state` | Transition event state (optimistic lock) |
| PATCH | `/api/events/:eventId/theme` | Update event theme |
| GET | `/api/events/:eventId/bookmarks` | Get user bookmarks |
| PUT | `/api/events/:eventId/bookmarks` | Save user bookmarks |
| GET | `/api/events/:eventId/profile` | Get user display name |
| PUT | `/api/events/:eventId/profile` | Update user display name |

### 5.3 Event Member Endpoints (JWT + event membership)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/events/:eventId/ratings` | Submit rating |
| GET | `/api/events/:eventId/ratings` | Get ratings (CSV; admins see emails, guests see opaqueIds) |
| GET | `/api/events/:eventId/ratings/:itemId` | Get user's rating for item |
| DELETE | `/api/events/:eventId/ratings/:itemId` | Delete user's rating |
| POST | `/api/events/:eventId/items` | Register item |
| GET | `/api/events/:eventId/items` | List items (admins: all; guests: own) |
| PATCH | `/api/events/:eventId/items/:itemId` | Update item (owner only) |
| DELETE | `/api/events/:eventId/items/:itemId` | Delete item (owner only) |
| GET | `/api/events/:eventId/dashboard` | Dashboard stats (admins: always; guests: completed only) |
| GET | `/api/events/:eventId/similar-users` | Find similar raters (≥3 ratings required) |

### 5.4 Admin-Only Endpoints (JWT + event admin)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/events/:eventId/administrators` | List administrators |
| POST | `/api/events/:eventId/administrators` | Add administrator (owner only) |
| DELETE | `/api/events/:eventId/administrators/:email` | Remove administrator |
| POST | `/api/events/:eventId/regenerate-pin` | Regenerate event PIN |
| GET | `/api/events/:eventId/item-configuration` | Get item config |
| PATCH | `/api/events/:eventId/item-configuration` | Update item config |
| PATCH | `/api/events/:eventId/rating-configuration` | Update rating config |
| PATCH | `/api/events/:eventId/items/:itemId/assign-item-id` | Assign blind item ID |
| GET | `/api/events/:eventId/items/by-item-id/:itemId` | Lookup item by blind ID |
| DELETE | `/api/events/:eventId/ratings` | Delete all event ratings |
| DELETE | `/api/events/:eventId/users/:email` | Remove specific user |
| DELETE | `/api/events/:eventId/users` | Remove all non-admin users |

### 5.5 Root Admin Endpoints (JWT + root admin email)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/system/events` | List all events (paginated, filterable) |
| GET | `/api/system/events/:eventId` | Full event details |
| DELETE | `/api/system/events/:eventId` | Delete any event |
| GET | `/api/system/stats` | System-wide statistics |

### 5.6 Test-Only Endpoints (non-production)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/test/events` | Create test event |
| DELETE | `/api/test/events/:eventId` | Delete test event |
| DELETE | `/api/test/events` | Delete all test events |
| POST | `/api/test/events/:eventId/add-admin` | Add admin + get JWT |
| POST | `/api/test/clear-cache` | Clear rate limit cache |
| POST | `/api/test/root-token` | Generate root admin JWT |

### 5.7 Event State Machine

```
created → started → paused → completed
                  ↘ completed
           paused → started
        completed → started
        completed → paused
```

State transitions use optimistic locking (`expectedState` parameter). Returns 409 on conflict.

---

## 6. Database Schema

### 6.1 Table Definition

| Property | Value |
|----------|-------|
| **Table name** | `blueberry-pancake-{environment}` |
| **Billing** | Pay-per-request (on-demand) |
| **Primary key** | `PK` (String) + `SK` (String) |
| **GSI1** | `GSI1PK` (String) + `GSI1SK` (String), ALL projection |
| **TTL attribute** | `TTL` |
| **PITR** | Enabled |

### 6.2 Entity Types (Single-Table Design)

| Entity | PK | SK | GSI1PK | GSI1SK | TTL |
|--------|----|----|--------|--------|-----|
| **Event Config** | `EVENT#{eventId}` | `CONFIG` | `EVENTS` | `{createdAt}` | — |
| **Rating** | `EVENT#{eventId}` | `RATING#{email}#{itemId}` | — | — | — |
| **Bookmark** | `EVENT#{eventId}` | `BOOKMARK#{email}` | — | — | — |
| **Dashboard Cache** | `EVENT#{eventId}` | `DASHBOARD` | — | — | 30s |
| **OTP** | `OTP#{email}` | `OTP` | — | — | 600s |
| **Rate Limit** | `RATELIMIT#{id}#{action}` | `RATELIMIT` | — | — | 900s |
| **Suspension** | `SUSPENSION#{email}` | `SUSPENSION` | — | — | configurable |
| **Failed Attempts** | `FAILED#{email}` | `FAILED` | — | — | 900s |
| **PIN Session** | `PINSESSION#{sessionId}` | `PINSESSION` | `EVENT#{eventId}` | `PINSESSION#{sessionId}` | 14400s |
| **Similar Users Cache** | `SIMILAR#{eventId}` | `SIMILAR#{email}` | — | — | 30s |
| **Refresh Token** | `REFRESH#{tokenHash}` | `REFRESH` | — | — | 7d |

**Refresh Token Record Shape:**

```javascript
{
  PK: "REFRESH#{tokenHash}",
  SK: "REFRESH",
  tokenHash: string,
  email: string,
  createdAt: ISO8601,
  TTL: number,
  // Optional fields (added for PIN session recovery):
  authMethod: "otp" | "pin",   // Defaults to "otp" for legacy records without this field
  userId: "u_xxxxxxxxxx",      // Opaque ID — present only for PIN users
  events: ["ABC12345"]         // Event IDs the user has access to
}
```

Legacy refresh token records (created before PIN session recovery) lack `authMethod`, `userId`, and `events` fields and are treated as OTP.

### 6.3 Event Config Shape

```javascript
{
  PK: "EVENT#{eventId}",
  SK: "CONFIG",
  eventId: string,            // 8-char alphanumeric (uppercase)
  name: string,               // Event display name
  typeOfItem: "wine",         // Item type
  theme: string,              // classic|cellar|terracotta|golden|olive|garden|ocean|midnight|lavender|rose
  state: string,              // created|started|paused|completed
  pin: string,                // 6-digit PIN
  pinGeneratedAt: ISO8601,
  createdAt: ISO8601,
  updatedAt: ISO8601,

  users: {                    // Registered participants
    "{email}": {
      registeredAt: ISO8601,
      userId: "u_xxxxxxxxxx", // Opaque ID (u_ + 10 alphanumeric)
      name: string            // Display name
    }
  },

  administrators: {           // Event admins
    "{email}": {
      assignedAt: ISO8601,
      owner: boolean
    }
  },

  ratingConfiguration: {
    maxRating: 2-4,
    ratings: [{ value, label, color }],
    noteSuggestionsEnabled: boolean,
    personalityEnabled: boolean
  },

  itemConfiguration: {
    numberOfItems: 1-100,
    excludedItemIds: number[]
  },

  items: [{ itemId, name, description, producer, vintage, ... }]
}
```

### 6.4 Rating Shape

```javascript
{
  PK: "EVENT#{eventId}",
  SK: "RATING#{email}#{itemId}",
  email: string,
  eventId: string,
  itemId: number,
  rating: number,           // 1 to maxRating
  note: string | null,      // Max 500 chars
  timestamp: ISO8601
}
```

### 6.5 Access Patterns

| Pattern | Key Strategy |
|---------|-------------|
| Get event config | PK=`EVENT#{id}`, SK=`CONFIG` |
| List all events | GSI1: GSI1PK=`EVENTS` |
| Get all event ratings | PK=`EVENT#{id}`, SK begins_with `RATING#` |
| Get user's ratings | PK=`EVENT#{id}`, SK begins_with `RATING#{email}#` |
| Get user bookmarks | PK=`EVENT#{id}`, SK=`BOOKMARK#{email}` |
| Get PIN sessions for event | GSI1: GSI1PK=`EVENT#{id}`, SK begins_with `PINSESSION#` |
| Get similar users | PK=`SIMILAR#{id}`, SK begins_with `SIMILAR#` |

### 6.6 Concurrency Control

- **Event state transitions** — Conditional expressions with `expectedState` (optimistic locking)
- **User registration** — `if_not_exists()` prevents race conditions
- **Admin addition** — `attribute_not_exists()` prevents duplicates
- **Rate limit counters** — Atomic `ADD` with `if_not_exists()` fallback

### 6.7 Batch Operations

- **BatchWrite** — 25 items/batch, 3 retries with exponential backoff
- **Paginated Query** — Auto-follows `LastEvaluatedKey` for complete result sets

---

## 7. Security Mechanisms

### 7.1 Authentication

**Two authentication methods:**

| Method | For | Identity in JWT | Cookie |
|--------|-----|-----------------|--------|
| **OTP** (email) | Administrators | `email` (plain email address) | `jwt_token` + `refresh_token` |
| **PIN** (event) | Guests | `userId` (opaque, no email) | `jwt_token` + `refresh_token` |

**JWT Token Structure:**

OTP token (administrators):
```json
{
  "email": "admin@example.com",
  "events": ["ABC12345", "XYZ67890"],
  "authMethod": "otp",
  "iat": 1711152000,
  "exp": 1711238400
}
```

PIN token (guests):
```json
{
  "userId": "u_aBcDeFgHiJ",
  "events": ["ABC12345"],
  "authMethod": "pin",
  "iat": 1711152000,
  "exp": 1711238400
}
```

Key differences:
- **OTP tokens** carry `email` — used directly for DB key construction and admin authorization checks
- **PIN tokens** carry `userId` (opaque) — email is never exposed to the guest; server resolves `userId` → `email` via `event.users` map when needed for DB operations (see section 7.6)
- **`events` array** — list of event IDs the user has access to; updated on event creation and token refresh
- **`authMethod`** — distinguishes admin vs guest flows; PIN users are blocked from admin-only operations

**Token configuration:**
- Algorithm: HS256
- Expiration: 24h (configurable via `JWT_EXPIRATION`)
- Signing secret: `JWT_SECRET` env var (must be non-default in production)

**Refresh tokens:**
- 64-byte cryptographically random hex string
- Stored in DynamoDB hashed with SHA256 (never stored in plaintext)
- TTL: 7 days (configurable via `REFRESH_TOKEN_EXPIRATION`)
- Rotated on each refresh (old token invalidated, new one issued)
- Record includes `authMethod`, `userId`, and `events` for PIN session recovery (see section 6.2)

**Session recovery (silent token refresh):**
- Both OTP and PIN users support silent token refresh via the `/api/auth/refresh` endpoint
- The refresh endpoint reads `authMethod` from the stored refresh token record and branches to generate the correct JWT type (OTP token with `email` vs PIN token with `userId`)
- PIN guests previously could not refresh; they now can because refresh token records carry the necessary `userId` and `events` fields
- `isAuthenticated()` is a pure read operation with no side effects — it checks token validity without triggering refresh or navigation
- Session cleanup is coordinated through a single function (`clearExpiredSession()`) to avoid scattered cleanup logic across the codebase

**OTP:** 6-digit, crypto-random, 10-min TTL, timing-safe comparison
**PIN:** 6-digit, crypto-random, stored in event config

### 7.2 Authorization

| Guard | Middleware | Returns |
|-------|-----------|---------|
| Authenticated user | `requireAuth` | 401 / 403 |
| Event member | `requireEventMembership` | 403 |
| Root admin | `requireRoot` | 403 |
| Admin check | In-handler `isUserAdmin()` | 403 |

Admins **must** use OTP auth — PIN auth explicitly blocked for admin operations.

### 7.3 CSRF Protection

- CSRF secret stored in httpOnly cookie (`csrfSecret`)
- Token validated via `X-CSRF-Token` header on POST/PUT/PATCH/DELETE
- Exempt routes: `/api/auth/*`, `/api/events/:eventId/verify-pin`, `/api/test/*`
- Bearer token requests bypass CSRF (token-based auth is self-authenticating)
- Production requires `CSRF_SECRET` env var

### 7.4 Rate Limiting

| Scope | Production Limit | Window |
|-------|-----------------|--------|
| Global OTP requests | 100/min | 60s |
| Global check-admin | 60/min | 60s |
| Per-email OTP | 3 requests | 15 min |
| Per-IP OTP | 5 requests | 15 min |
| Per-event PIN | 5 attempts | 15 min |
| Failed OTP → suspension | 5 failures | 5 min ban |

All limits stored in DynamoDB with TTL-based expiration. Sliding window implementation.

### 7.5 Bot Protection

Cloudflare Turnstile on:
- OTP request endpoint
- Check-admin endpoint

Circuit breaker: Blocks after 5 consecutive Turnstile verification failures. Fails open in development.

### 7.6 Email Privacy (Opaque User IDs)

- Guests receive opaque `userId` (`u_` + 10 alphanumeric chars) — no email in JWT or API responses
- Admin API responses include emails (for audit)
- Non-admin ratings export replaces email with userId
- Similar users endpoint: emails redacted, userId + display name only
- Display name mandatory for guest registration
- Lazy userId backfill for pre-existing users

**Identity resolution flow:** DynamoDB keys remain email-based (e.g. `RATING#{email}#{itemId}`). The userId is a privacy layer above the database, not a storage key. The translation works in both directions:

- **Inbound (PIN user → DB write):** PIN JWT contains only `userId`, no email (see section 7.1). The `requireEventMembership` middleware resolves `userId` to `email` by scanning the `event.users` map via `resolveEmailFromUserId()` → resolved email is set on `req.user.resolvedEmail` → all downstream service/DB operations use that email for key construction. OTP JWTs already contain `email`, so no resolution is needed for admins.
- **Outbound (DB read → API response):** Ratings and user data come back from DynamoDB keyed by email → for non-admin responses, `email` is stripped and replaced with the corresponding `userId` via `buildUserIdMap()` before returning to the client

### 7.7 Security Headers (Helmet)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self';
  font-src 'self' https://fonts.gstatic.com;
  frame-src https://challenges.cloudflare.com;
  object-src 'none';
  frame-ancestors 'none';

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

### 7.8 Cookie Configuration

| Cookie | httpOnly | Secure | SameSite | MaxAge | Path |
|--------|----------|--------|----------|--------|------|
| `jwt_token` | Yes | Yes (prod) | strict (dev) / none (prod) | 24h | `/` |
| `refresh_token` | Yes | Yes (prod) | strict (dev) / none (prod) | 7d | `/api/auth` |
| `csrfSecret` | Yes | Yes (prod) | strict (dev) / none (prod) | — | `/` |

### 7.9 Input Validation

| Field | Pattern | Notes |
|-------|---------|-------|
| Email | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | Normalized to lowercase |
| Event ID | `/^[A-Z0-9]{8}$/` | Auto-uppercased |
| Item ID | `/^[A-Za-z0-9]{12}$/` | Nanoid format |
| PIN | `/^\d{6}$/` | Exactly 6 digits |
| OTP | `/^\d{6}$/` | Exactly 6 digits |
| Display name | Non-empty, max 100 chars | Trimmed |
| Rating note | Max 500 chars | Optional |
| Event name | Max 100 chars | — |

---

## 8. Caching Strategies

### 8.1 CDN Caching (CloudFront)

| Resource | Cache Control | TTL |
|----------|--------------|-----|
| Static assets (JS, CSS, fonts, images) | `public, max-age=31536000, immutable` | 1 year |
| HTML and JSON | `public, max-age=60` | 1 minute |
| API requests (`/api/*`) | No cache | — |

CloudFront invalidation (`/*`) triggered on every deployment.

### 8.2 Application-Level Caching

| Cache | Storage | TTL | Invalidation |
|-------|---------|-----|-------------|
| Dashboard stats | DynamoDB | 30s | On state change |
| Similar users | DynamoDB | 30s | Batch delete on demand |
| Quotes | In-memory Map | Permanent | Static content, never expires |
| Config | In-memory | 1h | Flush interval: 60s, max 1000 entries |

### 8.3 TTL-Based Expiration (DynamoDB)

| Entity | TTL |
|--------|-----|
| OTP codes | 10 minutes |
| Rate limit counters | 15 minutes |
| Failed attempt counters | 15 minutes |
| PIN sessions | 4 hours |
| Suspensions | Configurable (default 24h) |
| Refresh tokens | 7 days |
| Dashboard cache | 30 seconds |
| Similar users cache | 30 seconds |

---

## 9. Build & Deployment

### 9.1 Local Development

```bash
npm run dev              # Start backend + frontend concurrently
npm run dev:backend      # Backend only (Docker + DynamoDB Local + watch)
npm run dev:frontend     # Frontend only (Vite dev server, port 3000)
```

- Backend: Express on port 3001
- Frontend: Vite on port 3000, proxies `/api` → `localhost:3001`
- DynamoDB Local: Docker on port 8000 (admin UI on 8001)

### 9.2 Frontend Build (Vite)

- Code splitting: `react-vendor` (React, ReactDOM, React Router) and `ui-vendor` (Radix UI)
- Chunk size warning: 500 KB
- Path alias: `@` → `./src`
- Output: `frontend/dist/`

### 9.3 Backend Deployment (AWS SAM)

- Runtime: `nodejs22.x`
- Memory: 256 MB
- Timeout: 30 seconds
- Services: Lambda + API Gateway (HTTP API) + DynamoDB

### 9.4 Frontend Deployment (CloudFormation)

- S3 bucket (private, OAC)
- CloudFront distribution (HTTP/2, PriceClass_100)
- SPA fallback: 403/404 → `/index.html`
- Optional custom domain support

### 9.5 CI/CD (GitHub Actions)

**Trigger:** Push to `main` or PR to `main`

1. **Test job** — Install deps, start DynamoDB Local, run backend + frontend tests, build frontend
2. **Deploy backend** — SAM build + deploy (OIDC credentials)
3. **Deploy frontend** — Build, sync to S3 (two-tier cache), invalidate CloudFront

### 9.6 Environment Configuration

| Variable | Description |
|----------|------------|
| `JWT_SECRET` | JWT signing secret (required non-default in prod) |
| `CSRF_SECRET` | CSRF secret (required in prod) |
| `RESEND_API_KEY` | Email service API key |
| `ROOT_ADMIN_EMAILS` | Comma-separated root admin emails |
| `FRONTEND_URL` | CORS origin (required in prod) |
| `DYNAMODB_TABLE` | Table name |
| `DYNAMODB_ENDPOINT` | Local DynamoDB URL (dev only) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |

---

## 10. Testing

### 10.1 Test Summary

| Category | Files | Framework |
|----------|-------|-----------|
| Frontend unit tests | 51 | Vitest + Testing Library |
| Frontend E2E tests | 34 | Playwright |
| Frontend smoke tests | 1 | Playwright |
| Backend unit tests | 21 | Vitest |
| Backend integration tests | 4 | Vitest + Supertest |
| **Total** | **111** | — |

### 10.2 Commands

```bash
npm run test:backend     # Backend unit tests (watch mode)
npm run test:frontend    # Frontend unit tests (watch mode)
npm run test:e2e         # E2E tests (Playwright, 4 workers)
npm test && npm run lint # Full validation
```

### 10.3 E2E Configuration

- Device profile: iPhone 12 (mobile-first)
- Workers: 4 (parallel)
- Timeout: 60s per test
- Retries: 2 in CI, 0 locally
- Artifacts: Screenshots on failure, traces on first retry, video on failure

### 10.4 Test Coverage Areas

**Frontend:** Component rendering, route guards, hooks, form validation, event polling, API client session handling, theme presets, personality detection, utility functions

**Backend:** All 15 services, JWT middleware, event membership enforcement, API error handling, rate limiting, Turnstile protection, similarity algorithms, Bayesian averages

**E2E:** Full event lifecycle, authentication flows (OTP + PIN), admin management, guest registration, rating flow, item assignment, data export, dashboard, concurrency, theme presets, personality features, session expiry, membership enforcement

**Integration:** Core API endpoints, authentication flows, CSRF protection, rate limiting, event membership authorization
