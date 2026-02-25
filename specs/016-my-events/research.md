# Research: My Events Page

**Feature**: 016-my-events | **Date**: 2026-02-25

## R1: OTP vs PIN Authentication Distinction in JWT

**Decision**: Add an `authMethod` field to the JWT token payload (`'otp'` for administrator authentication, `'pin'` for participant authentication).

**Rationale**: The current JWT payload contains only `email` and `events` — there is no field distinguishing how the user authenticated. FR-002 requires the header menu item to be visible only for OTP-authenticated administrators. Adding an explicit `authMethod` field to the token is the cleanest solution: it's reliable across page refreshes, tab closures, and device switches (unlike localStorage/sessionStorage), and it makes the distinction explicit rather than inferring it from `events` array size (which is unreliable — an OTP admin with one event looks identical to a PIN participant).

**Alternatives considered**:
- *Store auth method in localStorage*: Fragile — cleared on browser data wipe, not available across tabs opened before the storage event fires. Rejected.
- *Infer from `events` array size*: Unreliable — an OTP-auth admin with exactly one event is indistinguishable from a PIN-auth participant. Rejected.
- *Separate cookie for auth method*: Overcomplicated — JWT already carries user context; adding a separate cookie creates sync issues. Rejected.

**Impact**: 4 call sites in backend (`auth.js` OTP verify, `auth.js` token refresh, `events.js` PIN verify, `events.js` PIN fallback token), 1 change to `generateToken` in `jwtAuth.js`, 1 change to `addEventToToken` to preserve the field.

## R2: Event Summaries Endpoint Design

**Decision**: Add `GET /api/events/mine` as a new route in `events.js` that returns event summary objects (not just IDs).

**Rationale**: The existing `getEventsByAdministrator(email)` returns only event IDs. The frontend needs event name, state, and creation date for each event. Rather than making N+1 API calls from the frontend, the backend should return complete summaries in a single response. A new `getEventSummariesByAdministrator(email)` method in `EventService` will reuse the existing admin-checking logic but return event summary objects instead of just IDs.

**Alternatives considered**:
- *Frontend fetches IDs then calls getEvent for each*: N+1 API calls, poor performance, unnecessary network traffic. Rejected.
- *Reuse existing `getEventsByAdministrator` and add a separate bulk-get endpoint*: Overengineered for this use case — a single purpose-built endpoint is simpler. Rejected.
- *GraphQL query*: Project uses REST exclusively; introducing GraphQL for one endpoint violates KISS. Rejected.

**Response shape**: Array of event summary objects sorted by `createdAt` descending. Each object contains: `eventId`, `name`, `state`, `createdAt`.

## R3: Landing Page Card Placement

**Decision**: Add "My Events" as the third card on the landing page, positioned after "Create an event" (bottom of the three cards).

**Rationale**: The primary user flow is join → create → recover. "Join" is the most common action (participants outnumber administrators), "Create" is the second (new administrators), and "My Events" is third (returning administrators recovering access). Placing it last maintains the existing visual hierarchy and doesn't disrupt the primary flows.

**Alternatives considered**:
- *Between "Join" and "Create"*: Disrupts the existing flow; "My Events" is less frequent than creating. Rejected.
- *Before "Join"*: Even more disruptive; participants are the majority user type. Rejected.

## R4: Header Menu Item Placement

**Decision**: Place "My Events" as the first item in the header dropdown menu, before "Back to Event" / "Profile".

**Rationale**: "My Events" is a top-level navigation action (leaving the current event context entirely), so it should be prominent. Placing it first makes it easy to find. The existing menu order becomes: My Events → Back to Event → Profile → Dashboard → Settings → Logout.

**Alternatives considered**:
- *After "Profile"*: Less discoverable; buried among event-specific items. Rejected.
- *Before "Logout"*: Confusing position — logout is always last by convention. Rejected.
