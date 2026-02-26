# Quickstart: Admin Event List Enhancements

**Branch**: `018-admin-event-list` | **Date**: 2026-02-26

## Files to Modify

| # | File | Change Summary |
| - | ---- | -------------- |
| 1 | `backend/src/services/SystemService.js` | Add `pin` to `getEventSummary()` and `getEventDetailsForAdmin()` return objects; add `search` OR-filter to `listAllEventsForAdmin()` |
| 2 | `backend/src/api/system.js` | Parse `search` query param, pass to service |
| 3 | `frontend/src/services/systemApi.js` | Add `search` param to `listEvents()` |
| 4 | `frontend/src/components/system/EventList.jsx` | Default limit 25, remove pagination, send `search` param, show event ID + PIN on cards, show info labels |
| 5 | `frontend/src/components/system/EventDrawer.jsx` | Add PIN detail row |
| 6 | `frontend/tests/e2e/specs/system.spec.js` | Update and add E2E tests for new behavior |

## Implementation Order

### Step 1: Backend — Add PIN to responses

In `SystemService.js`:
- `getEventSummary()`: add `pin: config.pin || null` to the returned object
- `getEventDetailsForAdmin()`: add `pin: config.pin || null` to the returned object

### Step 2: Backend — Add search OR-filter

In `SystemService.js` `listAllEventsForAdmin()`:
- Add `search` parameter to the method signature
- When `search` is provided (after trim), apply OR filter: match `eventId`, `name`, or `ownerEmail` against the search string (case-insensitive substring)
- When `search` is present, ignore separate `name` and `owner` filters
- Default limit stays server-side enforced at max 100

In `system.js` route:
- Extract `search` from `req.query`
- Pass it to the service call

### Step 3: Frontend — API client

In `systemApi.js`:
- Add `search` parameter to `listEvents()`
- When `search` is set, add it to the query string

### Step 4: Frontend — Event cards (EventList.jsx)

- Change default limit from 50 to 25
- Remove Previous/Next pagination controls
- Build filter: when debounced search is non-empty, send `{ search, limit: 100 }` instead of `{ name, limit: 25 }`
- Add "Showing 25 most recent events" label when not searching and total > 25
- Add "Showing first 100 of N results" label when searching and total > 100
- Add event ID and PIN to each card's layout (below owner email or in stats row)
- Show "No PIN" for events with null pin

### Step 5: Frontend — Event drawer (EventDrawer.jsx)

- Add a `DetailRow` for PIN (using `Hash` or `Key` icon) in the details section
- Display `pin` value or "No PIN" for null

### Step 6: E2E tests

- Update existing name-search test: change expected query param from `name=` to `search=`
- Add test: search by event ID
- Add test: search by owner email
- Add test: event card shows event ID and PIN
- Add test: drawer shows PIN
- Add test: default view label "Showing 25 most recent events"

## Verification

```bash
# Run backend locally
cd backend && npm run dev

# Run frontend locally
cd frontend && npm run dev

# Run E2E tests
cd frontend && npx playwright test tests/e2e/specs/system.spec.js
```

Manual verification checklist:
1. Navigate to `/system` — see 25 event cards with info label
2. Each card shows event ID and PIN (or "No PIN")
3. Click a card — drawer shows PIN
4. Type an event name — results from full database appear
5. Type an event ID — matching event appears
6. Type an owner email — matching events appear
7. Clear search — default 25 view restores
