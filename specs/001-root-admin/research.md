# Research: Root Admin Dashboard

**Feature**: 001-root-admin  
**Date**: 2024-12-17

## Research Tasks Completed

### 1. Root User Identification

**Question**: How to identify root users from regular users?

**Decision**: Check authenticated user's email against `rootAdmins` config array.

**Rationale**: 
- Uses existing OTP authentication (no new auth flow)
- Config-based approach allows runtime changes (with hot-reload)
- Simple email comparison is performant
- Aligns with existing pattern of config-driven behavior

**Alternatives Considered**:
- Separate root login page → Rejected: Adds complexity, duplicates auth
- Role field in user data → Rejected: No persistent user store exists
- Environment variable → Rejected: Less flexible than config file

**Implementation**:
```javascript
// configLoader.js
getRootAdmins() {
  return this.get('rootAdmins') || [];
}

isRootAdmin(email) {
  return this.getRootAdmins().includes(email.toLowerCase());
}
```

---

### 2. Authorization Middleware Pattern

**Question**: How to protect `/system` routes?

**Decision**: Create `requireRoot.js` middleware that extends existing `requireAuth.js`.

**Rationale**:
- Follows existing middleware patterns (`requireAuth.js`, `requirePIN.js`)
- Separates concerns: auth (JWT valid) vs authorization (is root)
- Can be composed: `requireAuth, requireRoot` on routes

**Alternatives Considered**:
- Inline check in each route handler → Rejected: Violates DRY
- Modify requireAuth to accept role parameter → Rejected: Changes existing API

**Implementation**:
```javascript
// middleware/requireRoot.js
import configLoader from '../config/configLoader.js';

export function requireRoot(req, res, next) {
  // requireAuth must run first to populate req.user
  const userEmail = req.user?.email;
  
  if (!userEmail || !configLoader.isRootAdmin(userEmail)) {
    return res.status(403).json({ error: 'Root access required' });
  }
  
  next();
}
```

---

### 3. Event List Aggregation

**Question**: How to efficiently list all events with counts?

**Decision**: Extend `EventService` with `listAllEvents()` method that includes computed stats.

**Rationale**:
- Reuses existing `FileDataRepository.listEvents()` for event discovery
- Leverages cache for event configs (already loaded for active events)
- Computes participant/rating counts from cached ratings data

**Performance Considerations**:
- For 1000+ events: Paginate response (limit/offset)
- Cache stats computation for repeated requests
- Lazy-load ratings only when needed (details view)

**Implementation Approach**:
```javascript
// EventService additions
async listAllEventsForAdmin({ limit = 50, offset = 0, filters = {} }) {
  const allEventIds = await dataRepository.listEvents();
  
  // Apply filters
  let filtered = allEventIds;
  if (filters.state) { /* filter by state */ }
  if (filters.owner) { /* filter by owner */ }
  if (filters.name) { /* filter by name substring */ }
  
  // Paginate
  const paginated = filtered.slice(offset, offset + limit);
  
  // Fetch summaries with counts
  const summaries = await Promise.all(
    paginated.map(id => this.getEventSummaryForAdmin(id))
  );
  
  return {
    events: summaries,
    total: filtered.length,
    limit,
    offset
  };
}
```

---

### 4. Audit Logging Pattern

**Question**: How to log root admin actions?

**Decision**: Use existing `Logger.info()` with structured admin action data.

**Rationale**:
- Existing logging infrastructure supports structured data
- Logs are already written to files with rotation
- No need for separate audit database (per spec assumptions)

**Log Format**:
```javascript
loggerService.info('Admin action', {
  action: 'DELETE_EVENT',
  adminEmail: req.user.email,
  targetEventId: eventId,
  timestamp: new Date().toISOString(),
  metadata: { eventName, eventState }
});
```

---

### 5. Frontend Routing

**Question**: How to add protected `/system` route?

**Decision**: Add route in React Router with auth check, redirect unauthorized users.

**Rationale**:
- Follows existing routing patterns in the app
- Client-side redirect for UX (immediate feedback)
- Backend still enforces authorization (defense in depth)

**Implementation**:
```jsx
// App.jsx routes
<Route 
  path="/system" 
  element={
    <ProtectedRoute requireRoot>
      <SystemPage />
    </ProtectedRoute>
  } 
/>
```

---

### 6. Responsive Design Approach

**Question**: How to make admin dashboard work on all screen sizes?

**Decision**: Use existing Tailwind responsive utilities with mobile-first approach.

**Rationale**:
- Consistent with existing app styling
- Tailwind's responsive prefixes (sm:, md:, lg:) well-suited
- Drawer component adapts to full-screen on mobile

**Key Responsive Patterns**:
- Event list: Stack on mobile, table on desktop
- Drawer: Full-screen overlay on mobile, side panel on desktop
- Stats: Grid that reflows based on screen width
- Filters: Collapsible on mobile, always visible on desktop

---

## Dependencies Identified

| Dependency | Purpose | Status |
|------------|---------|--------|
| Existing JWT auth | User authentication | ✅ Available |
| Existing OTP flow | Root login | ✅ Available |
| ConfigLoader | Root email list | ✅ Needs method addition |
| EventService | Event data access | ✅ Needs method addition |
| Logger | Audit logging | ✅ Available |
| Radix UI Sheet | Drawer component | ✅ May need to add |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance with 1000+ events | Medium | High | Implement pagination, lazy loading |
| Config hot-reload timing | Low | Medium | Document restart requirement for root changes |
| Concurrent delete race | Low | Low | Return clear "not found" error |
