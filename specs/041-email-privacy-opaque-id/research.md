# Research: Email Privacy — Opaque User Identity for Guests

**Feature**: 041-email-privacy-opaque-id
**Date**: 2026-03-22

## Research Task 1: Opaque User ID Generation Strategy

### Decision
Use `nanoid` with `customAlphabet` to generate 10-character alphanumeric identifiers, prefixed with `u_` for clarity (total: 12 characters). Format: `u_aBcDeFgHiJ`.

### Rationale
- `nanoid` is already a project dependency (^5.1.6), used by EventService (8-char Crockford Base32 for event IDs) and ItemService (12-char alphanumeric for item IDs).
- 10 characters from a 62-character alphabet (a-z, A-Z, 0-9) gives 62^10 ≈ 8.4 × 10^17 possible values — collision probability is negligible for events with <100 users.
- The `u_` prefix makes userIds immediately identifiable in logs and debugging without being meaningful to end users.
- No collision detection needed — entropy is sufficient.

### Alternatives Considered
- **crypto.randomUUID()**: 36 characters is unnecessarily long for DynamoDB-friendly identifiers. Also not used anywhere else in the codebase.
- **SHA256 hash of email**: Reversible via rainbow tables. Deterministic hashing defeats the purpose of opacity if the salt leaks.
- **Sequential integers**: Too guessable, reveals registration order, not opaque.

---

## Research Task 2: JWT Token Structure Changes

### Decision
Role-dependent JWT payloads based on `authMethod`:

**Guest (PIN)**:
```json
{
  "userId": "u_aBcDeFgHiJ",
  "events": ["EVT123"],
  "authMethod": "pin"
}
```

**Admin (OTP)**:
```json
{
  "email": "admin@example.com",
  "events": ["EVT123", "EVT456"],
  "authMethod": "otp"
}
```

### Rationale
- Guest tokens never contain email — this is the core privacy guarantee.
- Admin tokens retain email for cross-event operations (`getEventsByAdministrator`, "My Events" page).
- The `authMethod` field already exists in tokens — it becomes the discriminator for which identity model to use.
- The middleware can check `req.user.userId` vs `req.user.email` to determine the identity type.

### Alternatives Considered
- **Include both email and userId in all tokens**: Defeats the privacy goal. If the JWT is somehow exposed (browser extension, proxy), email is leaked.
- **Remove email from admin tokens too**: Would break cross-event admin lookups which scan all events by administrator email. Refactoring this to use a global userId would require a new DynamoDB index — over-engineering for this feature.

---

## Research Task 3: Backward Compatibility with Old JWTs

### Decision
The JWT middleware detects old-format tokens by checking: if `authMethod === 'pin'` and `email` is present but `userId` is absent, treat as legacy token. Look up the user in the event's users map by email, lazy-generate `userId` if missing, and attach `userId` to `req.user`.

### Rationale
- Old tokens issued before this feature will have `{ email, events, authMethod: 'pin' }`.
- The middleware already decodes the JWT and attaches `req.user` — adding a lazy resolution step is minimal overhead.
- Each request for a legacy user requires one DynamoDB read (get event CONFIG) + one conditional write (add userId to users map). This is acceptable as a one-time cost per user.
- After backfill, subsequent requests use the new `userId` from the JWT (if token is refreshed) or continue with the legacy path (until token expires).

### Alternatives Considered
- **Force logout all existing users**: Disruptive and unnecessary.
- **Run a migration script**: Adds operational complexity for a problem that solves itself through lazy backfill.
- **Issue new tokens on every request**: Token churn. Only issue new tokens on explicit refresh.

---

## Research Task 4: Ratings Endpoint Split (`?mine=true`)

### Decision
Add a `mine` query parameter to `GET /api/events/:eventId/ratings`:
- `?mine=true`: Filter server-side to only the authenticated user's ratings. Response has no email or userId columns — data is implicitly "yours."
- No `mine` param (non-admin): Return all ratings with `userId` column instead of `email`.
- No `mine` param (admin): Return all ratings with `email` column (for export).

Admin detection uses `EventService.isAdministrator(event, email)` — requires resolving the user's email from the JWT (for admin tokens) or from the users map (for guest tokens with userId).

### Rationale
- The `?mine=true` parameter eliminates the need for the frontend to fetch all ratings and filter client-side by email — a direct privacy improvement and a slight performance win.
- Admin vs non-admin gating matches the existing pattern in the dashboard endpoint (lines 40-44 in dashboard.js).
- CSV format is preserved for backward compatibility with admin export workflows.

### Alternatives Considered
- **Separate endpoint (`/ratings/mine`)**: Adds a new route. The query parameter approach is simpler and keeps the REST resource structure clean.
- **Always return userId for everyone, let admin page fetch emails separately**: Adds complexity to the admin export workflow for no user benefit.

---

## Research Task 5: Frontend Session Management Changes

### Decision
The `apiClient.userSession` object changes from `{ email, exp, authMethod }` to `{ userId, name, exp, authMethod }` for guest sessions. A new `getUserId()` method replaces `getUserEmail()` for guest flows. `getUserEmail()` remains for admin flows.

The verify-PIN response changes from `{ user: { email, exp, authMethod } }` to `{ user: { userId, name, exp, authMethod } }`.

### Rationale
- The frontend currently stores `email` in localStorage via `userSession`. Replacing with `userId` and `name` means email never reaches localStorage.
- `getUserId()` is the new primary method for identifying the current user in guest flows (React keys, API params, drawer props).
- `getUserEmail()` is retained because admin flows (OTP auth) still use email.

### Alternatives Considered
- **Decode userId from JWT on the client**: The JWT is httpOnly and not accessible to JavaScript. The userId must come from the API response body.
- **Store both email and userId**: Storing email in localStorage defeats the privacy goal.
