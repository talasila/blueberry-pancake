# Data Model: Fix Stale Session Recovery for PIN Guests

**Feature**: 043-fix-pin-session-recovery | **Date**: 2026-03-24

## Entity Changes

### 1. Refresh Token Record (DynamoDB — modified)

**Current schema:**
```
PK: REFRESH#{tokenHash}
SK: REFRESH
email: string (normalized)
createdAt: string (ISO8601)
expiresAt: number (milliseconds)
TTL: number (seconds since epoch)
```

**New schema (additions in bold):**
```
PK: REFRESH#{tokenHash}
SK: REFRESH
email: string (normalized)
authMethod: string ("otp" | "pin")          ← NEW
userId: string | null                        ← NEW (opaque ID for PIN users, null for OTP)
events: string[] | null                      ← NEW (event IDs at token creation time)
createdAt: string (ISO8601)
expiresAt: number (milliseconds)
TTL: number (seconds since epoch)
```

**Backward compatibility**: Records without `authMethod` are treated as `authMethod: 'otp'` (legacy default). Records without `userId` or `events` degrade gracefully — the refresh endpoint falls back to the existing OTP behavior (query admin events by email).

**Validation rules**:
- `authMethod` must be `"otp"` or `"pin"` if present
- `userId` must be a non-empty string starting with `u_` if `authMethod` is `"pin"`
- `events` must be an array of 8-character alphanumeric event IDs if present
- No uniqueness constraint on `userId` or `events` across refresh records (a user may have multiple valid tokens during rotation)

---

### 2. Client-Side Storage Keys (localStorage — new)

**New key:**
```
pin:email:{eventId} → string (guest's email address)
```

**Lifecycle**:
- **Written**: During PIN verification in `PINEntryPage.jsx` and `SessionExpiredDialog.jsx` (after successful verify-pin)
- **Read**: By `SessionExpiredDialog.jsx` when the session-expired event's email is null
- **Cleared**: During explicit logout (`clearAllAuthState()`)
- **Survives**: Session token expiry, session clearing, tab close/reopen

**Existing keys (unchanged)**:
```
userSession → JSON { userId?, email?, exp, authMethod }   (session token metadata)
pin:session:{eventId} → string (PIN session ID)            (per-event PIN session)
```

---

### 3. Session-Expired Event Detail (CustomEvent — modified)

**Current detail:**
```javascript
{ authMethod: string | null, email: string | null, eventId: string | null }
```

**New detail (no structural change, but values are now reliable):**
```javascript
{ authMethod: string | null, email: string | null, eventId: string | null }
```

The fix ensures `authMethod` and `email` are captured from a session snapshot *before* clearing, rather than read from a potentially-already-cleared session object. No schema change, but the contract now guarantees non-null values for authenticated sessions.

---

## State Transitions

### Session Token Lifecycle

```
[Valid]  ──(24h expiry)──▶  [Expired]
                               │
                    ┌──────────┴──────────┐
                    ▼                      ▼
          [Silent Refresh]        [Prompted Re-Auth]
          (refresh token          (refresh token
           still valid)            also expired)
                    │                      │
                    ▼                      ▼
               [Valid]                [Valid]
          (new JWT + rotated     (new JWT + new
           refresh token)         refresh token)
```

### Refresh Token Lifecycle

```
[Active]  ──(7d expiry)──▶  [Expired]  ──(DynamoDB TTL)──▶  [Deleted]
    │
    ├──(silent refresh)──▶  [Invalidated] + [New Active]
    │
    └──(PIN re-auth)──▶  [Invalidated] + [New Active]
```

---

## Function Signature Changes

### Backend

**`generateRefreshToken(email)` → `generateRefreshToken(email, metadata)`**
```
metadata: { authMethod: string, userId?: string, events?: string[] }
```

**`validateRefreshToken(refreshToken)` return value:**
```
Current:  { valid: boolean, email?: string, error?: string }
New:      { valid: boolean, email?: string, authMethod?: string, userId?: string, events?: string[], error?: string }
```

**`storeRefreshToken(tokenHash, email, expiresAt)` → `storeRefreshToken(tokenHash, email, expiresAt, metadata)`**
```
metadata: { authMethod: string, userId?: string, events?: string[] }
```

### Frontend

**`isAuthenticated()` — signature unchanged, behavior changed:**
```
Before: Returns boolean, clears session as side effect when expired
After:  Returns boolean only, no side effects
```

**`clearExpiredSession()` — new method:**
```
Returns: { authMethod, email, userId, name } | null
Side effect: Clears session from memory and localStorage if expired
```
