# Research: Event PIN Access

**Feature**: Event PIN Access  
**Date**: 2025-01-27  
**Purpose**: Research technical decisions for implementing PIN-based event access control

## 1. PIN Generation Approach

### Decision: Generate 6-digit random numeric PIN using crypto.randomInt

**Rationale**:
- 6-digit numeric PIN is user-friendly and matches spec requirement (FR-001, FR-009)
- crypto.randomInt provides cryptographically secure random number generation
- Simple implementation: generate random number between 100000 and 999999
- PINs are stored in event data (FileDataRepository), not separate storage
- PINs remain valid until regenerated (no expiration, per clarification)

**Implementation Pattern**:
```javascript
import crypto from 'crypto';

function generatePIN() {
  // Generate random 6-digit number (100000 to 999999)
  return crypto.randomInt(100000, 1000000).toString().padStart(6, '0');
}
```

**Alternatives Considered**:
- **nanoid**: Overkill for simple 6-digit numeric PIN, adds dependency
- **Math.random()**: Not cryptographically secure, should not be used for security-sensitive values
- **Pre-generated PIN pool**: Unnecessary complexity, random generation is sufficient

**PIN Uniqueness**:
- PINs are per-event, not globally unique
- Event ID provides uniqueness context
- Low collision probability (1 in 900,000 per event)
- If collision detected during regeneration, regenerate (edge case handling)

## 2. PIN Storage in Event Data

### Decision: Store PIN as field in event JSON data structure

**Rationale**:
- Event data already stored in FileDataRepository (data/events/{eventId}/config.json)
- PIN is part of event metadata, naturally belongs with event data
- Simple to read/write, no separate storage layer needed
- PIN regeneration updates event data file atomically
- Aligns with existing event data model patterns

**Data Model**:
```json
{
  "eventId": "A5ohYrHe",
  "name": "Wine Tasting Event",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "user@example.com",
  "pin": "123456",
  "pinGeneratedAt": "2025-01-27T10:00:00Z",
  "createdAt": "2025-01-27T10:00:00Z",
  "updatedAt": "2025-01-27T10:00:00Z"
}
```

**Alternatives Considered**:
- **Separate PIN storage**: Unnecessary complexity, adds data consistency concerns
- **Database table**: Overkill for file-based storage, would require migration
- **Encrypted PIN storage**: PINs are not sensitive secrets (they're shared), plain storage is acceptable

**PIN Security**:
- PINs stored in plain text (they're meant to be shared)
- PIN validation happens server-side (FR-009)
- Rate limiting prevents brute force (FR-017)
- PIN regeneration invalidates old PINs immediately (FR-008)

## 3. PIN Verification Session Management

### Decision: Store PIN verification state in CacheService (node-cache) with event-scoped keys

**Rationale**:
- CacheService already exists and provides TTL support
- PIN sessions valid until PIN regeneration or event completion (no time expiration per clarification)
- Use event-scoped cache keys: `pin:verified:{eventId}:{sessionId}`
- Session ID can be generated client-side (UUID) or use IP+User-Agent hash
- Simple to check and invalidate when PIN is regenerated

**Implementation Pattern**:
```javascript
// Store PIN verification
const sessionId = generateSessionId(); // UUID or hash
cacheService.set(`pin:verified:${eventId}:${sessionId}`, {
  eventId,
  verifiedAt: Date.now()
}, 0); // No expiration (0 = never expires)

// Check PIN verification
const verified = cacheService.get(`pin:verified:${eventId}:${sessionId}`);

// Invalidate on PIN regeneration
cacheService.keys().forEach(key => {
  if (key.startsWith(`pin:verified:${eventId}:`)) {
    cacheService.del(key);
  }
});
```

**Alternatives Considered**:
- **JWT tokens for PIN sessions**: Overkill, adds complexity, PIN access doesn't need JWT
- **Database storage**: Unnecessary for session data, cache is sufficient
- **Client-side only (localStorage)**: Not secure, can be manipulated, server must validate
- **Cookie-based sessions**: More complex, requires session middleware, cache is simpler

**Session Invalidation**:
- When PIN is regenerated: invalidate all sessions for that event (FR-008)
- When event state becomes "finished": invalidate sessions (per clarification)
- Client-side session ID stored in localStorage or sessionStorage
- Server validates session on each event page access

## 4. Rate Limiting Integration

### Decision: Reuse existing RateLimitService with event-scoped and IP-scoped keys

**Rationale**:
- RateLimitService already exists (from OTP auth feature)
- Supports per-identifier rate limiting (email/IP pattern)
- Apply limits independently: `pin:attempts:ip:{ip}` and `pin:attempts:event:{eventId}`
- Limits: 5 attempts per 15 minutes per IP AND per event (per clarification)
- Temporary lockout when limits exceeded

**Implementation Pattern**:
```javascript
// Check rate limit before PIN validation
const ipLimit = rateLimitService.checkLimit(`pin:attempts:ip:${ip}`, 5, 15 * 60 * 1000);
const eventLimit = rateLimitService.checkLimit(`pin:attempts:event:${eventId}`, 5, 15 * 60 * 1000);

if (!ipLimit.allowed || !eventLimit.allowed) {
  return { error: 'Rate limit exceeded. Please try again later.' };
}

// Record attempt (success or failure)
rateLimitService.recordAttempt(`pin:attempts:ip:${ip}`);
rateLimitService.recordAttempt(`pin:attempts:event:${eventId}`);
```

**Alternatives Considered**:
- **Custom rate limiting**: Unnecessary, reuse existing service (DRY principle)
- **Per-user rate limiting**: PIN access doesn't require user identification
- **Stricter limits**: 5 attempts per 15 minutes is reasonable, matches OTP pattern

**Rate Limit Behavior**:
- Independent limits: both IP and event limits must pass
- Lockout period: 15 minutes (same as time window)
- Clear error messages: "Too many attempts. Please try again in X minutes."
- Rate limit reset: automatic after time window expires

## 5. PIN Entry UI Pattern

### Decision: Reuse AuthPage UI pattern for PIN entry (full-page with card component)

**Rationale**:
- AuthPage already implements full-page OTP entry UI pattern
- PIN entry replaces OTP for regular users (per clarification)
- Consistent UX: same visual pattern, different input (PIN vs OTP)
- Reuse shadcn UI components (Card, Input, Button, InputOTP)
- Mobile-first responsive design already established

**Implementation Pattern**:
```jsx
// PINEntryPage.jsx - Similar structure to AuthPage.jsx
<Card>
  <CardHeader>
    <CardTitle>Enter Event PIN</CardTitle>
    <CardDescription>Enter the 6-digit PIN to access this event</CardDescription>
  </CardHeader>
  <CardContent>
    <InputOTP maxLength={6} value={pin} onChange={setPin} />
    {/* Error/Success messages */}
    <Button onClick={handleVerifyPIN}>Verify PIN</Button>
  </CardContent>
</Card>
```

**Alternatives Considered**:
- **Modal overlay**: Less consistent with OTP entry pattern, breaks user flow
- **Inline form**: Doesn't match OTP entry UX, less clear separation
- **Separate route**: More complex routing, full-page is simpler

**UI Consistency**:
- Same card layout as AuthPage
- Same input component (InputOTP) for 6-digit entry
- Same error/success message patterns
- Same loading states and button styles
- Mobile-first responsive design

## 6. PIN Verification Middleware

### Decision: Create requirePIN middleware that checks PIN verification session

**Rationale**:
- Separate from requireAuth (OTP authentication)
- Checks PIN verification session from cache
- Allows event page access without OTP
- Can be combined with requireAuth for admin pages
- Clear separation of concerns

**Implementation Pattern**:
```javascript
// requirePIN.js middleware
function requirePIN(req, res, next) {
  const { eventId } = req.params;
  const sessionId = req.headers['x-pin-session-id'] || req.cookies.pinSessionId;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'PIN verification required' });
  }
  
  const verified = cacheService.get(`pin:verified:${eventId}:${sessionId}`);
  if (!verified) {
    return res.status(401).json({ error: 'PIN verification expired or invalid' });
  }
  
  req.pinVerified = true;
  req.eventId = eventId;
  next();
}

// Usage in routes
router.get('/events/:eventId', requirePIN, getEvent);
router.get('/events/:eventId/admin', requireAuth, requirePIN, getAdminPage);
```

**Alternatives Considered**:
- **Extend requireAuth**: Mixes concerns, PIN and OTP are different access methods
- **Route-level checks**: Less reusable, middleware is cleaner
- **Service-level checks**: Too low-level, middleware provides better abstraction

## 7. Admin Page OTP Requirement

### Decision: Enforce OTP authentication for admin pages regardless of PIN access

**Rationale**:
- Admin pages require higher security (FR-005)
- OTP authentication already implemented (feature 003-otp-auth)
- PIN access doesn't grant admin privileges (FR-013)
- Redirect to OTP auth flow if accessed via PIN (FR-006)
- Test OTP "123456" works in dev/test (per clarification)

**Implementation Pattern**:
```javascript
// EventAdminPage.jsx
useEffect(() => {
  const jwtToken = localStorage.getItem('jwtToken');
  if (!jwtToken) {
    // Redirect to OTP auth, preserving intended destination
    navigate('/auth', { state: { from: { pathname: `/event/${eventId}/admin` } } });
  }
}, [eventId, navigate]);

// Backend route
router.get('/events/:eventId/admin', requireAuth, getAdminPage);
// requireAuth checks JWT token (OTP authentication)
```

**Alternatives Considered**:
- **PIN-based admin access**: Violates security requirement (FR-005)
- **Separate admin PIN**: Unnecessary complexity, OTP is sufficient
- **Admin PIN + OTP**: Overkill, OTP alone provides adequate security

## 8. PIN Regeneration Flow

### Decision: Regenerate PIN atomically, invalidate all existing sessions immediately

**Rationale**:
- PIN regeneration updates event data file (FR-008)
- Invalidate all PIN verification sessions for that event
- Display new PIN to administrator for sharing (FR-016)
- Old PIN immediately rejected (FR-008)
- Atomic operation prevents race conditions

**Implementation Pattern**:
```javascript
async function regeneratePIN(eventId, administratorEmail) {
  // Verify administrator
  const event = await eventService.getEvent(eventId);
  if (event.administrator.toLowerCase() !== administratorEmail.toLowerCase()) {
    throw new Error('Unauthorized');
  }
  
  // Generate new PIN
  const newPIN = generatePIN();
  
  // Update event data atomically
  await eventService.updateEvent(eventId, {
    pin: newPIN,
    pinGeneratedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  // Invalidate all PIN sessions for this event
  const keys = cacheService.keys();
  keys.forEach(key => {
    if (key.startsWith(`pin:verified:${eventId}:`)) {
      cacheService.del(key);
    }
  });
  
  return newPIN;
}
```

**Alternatives Considered**:
- **Allow current sessions to continue**: Violates security, old PIN should be invalid
- **Gradual invalidation**: Unnecessary complexity, immediate invalidation is clearer
- **PIN history**: Out of scope, only current PIN matters

## Summary

All technical decisions align with existing patterns and infrastructure:
- PIN generation: crypto.randomInt (secure, simple)
- PIN storage: Event data file (natural fit, no new storage)
- Session management: CacheService (reuse existing, no expiration)
- Rate limiting: RateLimitService (reuse existing, per IP and per event)
- UI pattern: AuthPage pattern (consistent UX, reuse components)
- Middleware: requirePIN (clear separation, reusable)
- Admin access: OTP required (security requirement)
- PIN regeneration: Atomic update + session invalidation (secure, clear)

No external dependencies needed beyond existing stack. All decisions follow DRY principles and reuse existing infrastructure.
