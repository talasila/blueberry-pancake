# Quickstart: Crockford Base32 Event IDs

**Feature**: 012-crockford-event-ids | **Date**: 2026-02-24

## Prerequisites

- Node.js >= 22.12.0 (see `.nvmrc`)
- Docker (for local DynamoDB)
- Dependencies installed (`npm install` in both `backend/` and `frontend/`)

## Local Development Setup

```bash
# Start local DynamoDB
docker-compose up -d

# Start backend (from repo root)
cd backend && npm run dev

# Start frontend (separate terminal, from repo root)
cd frontend && npm run dev
```

## Verifying the Changes

### 1. Create an Event

Create a new event via the UI or API. The returned event ID should:
- Be exactly 8 characters
- Contain only characters from `0123456789ABCDEFGHJKMNPQRSTVWXYZ`
- Be entirely uppercase
- NOT contain I, L, O, or U

### 2. Test Case-Insensitive Entry

Navigate to the landing page and enter the event ID in lowercase. The system should:
- Redirect to the uppercase URL (e.g., `/event/a3rkt9wp` → `/event/A3RKT9WP`)
- Display the correct event

### 3. Test Excluded Characters

Enter an event ID containing I, L, O, or U (e.g., `IOLU1234`). The system should:
- Accept the input without error
- Show "event not found" (since no event has those characters)

## Running Tests

```bash
# Backend unit + integration tests
cd backend && npm test

# Frontend E2E tests
cd frontend && npx playwright test

# Run specific test files related to this feature
cd backend && npx vitest run tests/unit/EventService.test.js
cd frontend && npx playwright test tests/e2e/specs/create-event.spec.js
```

## Key Constants

The Crockford Base32 alphabet used for generation:

```
0123456789ABCDEFGHJKMNPQRSTVWXYZ
```

Excluded characters: `I`, `L`, `O`, `U`
