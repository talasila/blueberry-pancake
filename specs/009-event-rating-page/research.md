# Research: Event Rating Page

**Feature**: 009-event-rating-page  
**Date**: 2025-01-27

## Research Questions

### 1. CSV Parsing and Writing with RFC 4180 Escaping in Node.js

**Question**: How to properly parse and write CSV files with RFC 4180 escaping (handling commas, quotes, newlines) in Node.js?

**Decision**: Use native Node.js string manipulation with RFC 4180 rules. No external library needed for basic CSV operations.

**Rationale**: 
- The project already uses native file operations (fs.promises)
- CSV format is simple (5 columns: email, timestamp, itemId, rating, note)
- RFC 4180 rules are straightforward to implement
- Avoids adding dependencies for simple CSV operations
- Existing codebase pattern favors minimal dependencies

**Implementation Approach**:
- For writing: Escape fields containing commas, quotes, or newlines by wrapping in double quotes and doubling internal quotes
- For reading: Parse line by line, handle quoted fields, unescape quotes
- Use regex or simple state machine for parsing

**Alternatives Considered**:
- `csv-parse`/`csv-stringify` libraries: Rejected - adds dependencies for simple use case
- `fast-csv`: Rejected - overkill for read/write operations
- Manual string manipulation: **Chosen** - simple, no dependencies, matches project philosophy

**References**:
- RFC 4180: https://www.rfc-editor.org/rfc/rfc4180
- Node.js fs.promises documentation

---

### 2. CSV Replace-on-Update Pattern

**Question**: How to replace a specific row in a CSV file when a user updates their rating?

**Decision**: Read entire CSV, parse into array of objects, find and replace matching row (email + itemId), write back entire file.

**Rationale**:
- CSV files are append-only by nature, not designed for in-place updates
- File sizes will be manageable (ratings per event, not millions of rows)
- Simpler than maintaining indexes or using database
- Atomic write operation ensures consistency
- Cache invalidation handles performance concerns

**Implementation Approach**:
1. Read CSV file (with cache check)
2. Parse into array of rating objects
3. Find existing rating by email + itemId
4. Replace or append new rating
5. Write entire CSV back (with cache invalidation)

**Alternatives Considered**:
- Append-only with latest-wins on read: Rejected - violates spec requirement to replace previous record
- Database migration: Rejected - out of scope, file-based storage is project requirement
- Separate update log file: Rejected - adds complexity, spec requires single CSV file

**Performance Considerations**:
- Cache reduces file reads
- Write operations are infrequent (only on rating submission)
- File size grows linearly with number of ratings (acceptable for event scope)

---

### 3. React Drawer/Modal Component Pattern

**Question**: What pattern should be used for the drawer component that opens when clicking item buttons?

**Decision**: Use a slide-out drawer component (from side or bottom) that can be dismissed by clicking outside or close button.

**Rationale**:
- Matches mobile-first design (iPhone dialpad reference suggests mobile UX)
- Drawer pattern is common in React applications
- Can reuse existing UI patterns from project
- Better UX than modal for quick interactions

**Implementation Approach**:
- Create `RatingDrawer` component with:
  - State-based content rendering (created/started/paused/completed)
  - Slide animation (CSS transitions)
  - Backdrop/overlay for dismissal
  - Close button
- Use React state to control open/closed
- Ensure only one drawer open at a time (close previous on new open)

**Alternatives Considered**:
- Modal dialog: Rejected - more intrusive, drawer feels more natural for item details
- Inline expansion: Rejected - would disrupt dialpad layout
- Separate page: Rejected - breaks flow, drawer maintains context

**References**:
- Existing project components (check for drawer/modal patterns)
- Radix UI (already in dependencies) - may have drawer component

---

### 4. Dialpad-Style Button Layout

**Question**: How to implement iPhone dialpad-style button layout for item numbers?

**Decision**: CSS Grid layout with circular/rounded buttons arranged in rows (typically 3 columns).

**Rationale**:
- CSS Grid provides clean, responsive layout
- Matches iPhone dialpad visual pattern (3x4 grid typically)
- Responsive design (adapts to screen size)
- Simple implementation with Tailwind CSS (already in project)

**Implementation Approach**:
- Use CSS Grid with `grid-cols-3` (or responsive: `grid-cols-2 sm:grid-cols-3`)
- Circular buttons with `rounded-full` or high border-radius
- Button styling: large touch targets, clear numbers, rating color background
- Bookmark indicator as small icon overlay in corner

**Alternatives Considered**:
- Flexbox: Rejected - Grid provides better control for dialpad pattern
- Fixed positioning: Rejected - not responsive
- Third-party component library: Rejected - simple enough with Tailwind

**References**:
- Tailwind CSS Grid documentation
- iPhone dialpad design patterns

---

### 5. Cache Invalidation Strategy for File-Based Data

**Question**: How to implement cache invalidation that triggers on event state change, rating submission, and periodic refresh?

**Decision**: Use existing CacheService with explicit invalidation calls and a periodic refresh mechanism.

**Rationale**:
- Project already has CacheService (node-cache)
- Explicit invalidation on state change and rating submission ensures immediate consistency
- Periodic refresh (30 seconds) handles external changes (other users' ratings)
- Simple to implement with existing infrastructure

**Implementation Approach**:
1. On event state change: Invalidate ratings cache for that event
2. On rating submission: Invalidate cache after write
3. Periodic refresh: SetInterval to check and refresh cache every 30 seconds
4. Use cache keys: `ratings:{eventId}` pattern

**Alternatives Considered**:
- File modification time checking: Rejected - adds complexity, periodic refresh is simpler
- Event-driven cache invalidation: Rejected - no event system in place, explicit calls are clearer
- No periodic refresh: Rejected - violates spec requirement for handling stale cache

**References**:
- Existing CacheService implementation
- node-cache documentation

---

### 6. Session Storage for Bookmarks

**Question**: How to implement session-only bookmark storage in the browser?

**Decision**: Use browser `sessionStorage` API (or `localStorage` with session-scoped keys).

**Rationale**:
- Native browser API, no dependencies
- Automatically cleared when session ends (tab close)
- Simple key-value storage matches bookmark needs
- Already available in all modern browsers

**Implementation Approach**:
- Store bookmarks as JSON object: `{ [eventId]: Set<itemId> }`
- Key pattern: `bookmarks:{eventId}`
- Read/write on bookmark/unbookmark actions
- Clear on session end (automatic with sessionStorage)

**Alternatives Considered**:
- Server-side storage: Rejected - spec requires session-only, not persisted
- IndexedDB: Rejected - overkill for simple bookmark list
- Cookies: Rejected - sent with every request, unnecessary overhead

**References**:
- MDN sessionStorage documentation
- Browser storage APIs

---

## Technology Decisions Summary

| Decision | Technology | Rationale |
|----------|-----------|-----------|
| CSV Operations | Native Node.js (fs.promises + string manipulation) | Simple, no dependencies, matches project pattern |
| CSV Replace Pattern | Read-parse-replace-write | Simple, atomic, acceptable performance with caching |
| Drawer Component | React component with CSS transitions | Native implementation, matches mobile UX pattern |
| Button Layout | CSS Grid + Tailwind | Responsive, matches dialpad design, uses existing stack |
| Cache Invalidation | CacheService + explicit calls + setInterval | Uses existing infrastructure, meets spec requirements |
| Bookmark Storage | Browser sessionStorage | Native API, session-only, no dependencies |

## Dependencies Analysis

**No new dependencies required**:
- CSV operations: Native Node.js
- Caching: Existing node-cache
- UI components: Existing React + Tailwind
- Storage: Native browser APIs

This aligns with project philosophy of minimal dependencies and reusing existing infrastructure.

## Performance Considerations

1. **CSV File Size**: With caching and reasonable event sizes, file reads are infrequent
2. **Cache Hit Rate**: Target 70% reduction in file reads (SC-006) achievable with 30-second refresh
3. **Concurrent Writes**: File writes are serialized by Node.js, last-write-wins strategy handles conflicts
4. **UI Responsiveness**: Drawer animations and button interactions should be smooth (<500ms target)

## Security Considerations

1. **CSV Injection**: Proper RFC 4180 escaping prevents injection attacks
2. **Input Validation**: Rating values, note length, email format all validated
3. **Authentication**: Rating submission requires authenticated user (existing auth system)
4. **File Path Security**: Event ID validation prevents directory traversal

## Next Steps

Proceed to Phase 1: Design & Contracts
- Define data model for ratings
- Create API contracts (OpenAPI)
- Design component structure
- Create quickstart guide
