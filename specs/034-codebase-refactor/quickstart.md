# Quickstart: Codebase Refactoring & Simplification

**Branch**: `034-codebase-refactor` | **Date**: 2026-03-16

## Prerequisites

- Node.js >= 22.12.0
- Docker (for local DynamoDB)
- All dependencies installed: `npm run install:all`

## Development Setup

```bash
# Start local services
docker-compose up -d          # DynamoDB local
npm run dev                   # Frontend (3000) + Backend (3001)
```

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# E2E tests (requires dev servers running)
cd frontend && npm run test:e2e
```

## Phase Execution Order

**Phase gates are strict** — complete and verify each phase before starting the next.

### Phase 1 (P1): Quick Wins

Backend utility extractions + frontend wrapper removal. Run after each change:

```bash
cd backend && npm test        # Verify backend changes
cd frontend && npm test       # Verify frontend changes
cd frontend && npm run test:e2e  # Verify no regressions
```

### Phase 2 (P2): Medium Refactors

Delete dialog consolidation, route protection, Header refactor, error handling, RatingForm utilities. Requires manual UI verification for visual changes:

```bash
# After delete dialog consolidation — verify all 4 delete flows in UI
# After route protection — navigate to protected/admin/dashboard routes
# After Header refactor — verify menu items, theme toggle, dark mode
```

### Phase 3 (P3): Large Restructuring

ItemDetailsDrawer split + EventService split. High-risk changes requiring full test suite:

```bash
cd backend && npm test        # All backend tests
cd frontend && npm test       # All frontend tests
cd frontend && npm run test:e2e  # Full E2E suite
```

## Verification Checklist

After all phases complete:

```bash
# SC-002: No manual email normalization
grep -r "\.trim()\.toLowerCase()" backend/src/ --include="*.js" | grep -v node_modules | grep -v normalizeEmail

# SC-003: Cookie clearing in one location
grep -rn "clearCookie" backend/src/ --include="*.js"

# SC-008: Removed wrappers
ls frontend/src/hooks/useQuotes.js frontend/src/hooks/usePINVerification.js frontend/src/services/dashboardService.js 2>&1

# SC-009: Single event ID validation module
grep -rn "validateEventId\|isValidEventId" frontend/src/ --include="*.js" --include="*.jsx"

# SC-010: Consistent error handling
grep -rn "error.message.includes" backend/src/api/ --include="*.js"
```
