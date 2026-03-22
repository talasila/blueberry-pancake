# Implementation Plan: Email Privacy — Opaque User Identity for Guests

**Branch**: `041-email-privacy-opaque-id` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/041-email-privacy-opaque-id/spec.md`

## Summary

Introduce event-scoped opaque user identifiers to replace email in all non-admin API responses and frontend state. Guest PIN-authenticated session tokens contain only `userId` (no email). Admin OTP tokens retain email for cross-event operations. The existing `nanoid` library (already a dependency) generates short, unique identifiers at registration time. Email remains the internal DynamoDB key — no schema migration. Lazy backfill handles existing events transparently.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0 + React 19.2.1
**Primary Dependencies**: Express 5.2.1, Radix UI, Tailwind CSS 4.1.17, nanoid ^5.1.6 (already installed), jsonwebtoken
**Storage**: DynamoDB (single-table design, nested `users` map in event CONFIG item)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web application (server + SPA)
**Project Type**: Web service (backend API + frontend SPA)
**Performance Goals**: No regression — existing page load times and API response times must remain unchanged
**Constraints**: Lazy backfill must not add perceptible latency to requests for existing users
**Scale/Scope**: Events with up to ~100 users, ~30 items per event

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Changes follow existing patterns (mirror `noteSuggestionsEnabled` toggle approach). Clear separation: identity generation in service, sanitization in API layer, display in frontend. |
| II. DRY | PASS | Reuses existing `nanoid` (customAlphabet) pattern from EventService/ItemService. Email→userId mapping logic centralized in one utility. |
| III. Maintainability | PASS | No new architectural patterns. userId flows through existing prop/state chains. Old email-based code paths removed, not left as dead code. |
| IV. Testing Standards | PASS | Unit tests for userId generation, JWT changes, API response sanitization. E2E tests for guest privacy, admin email visibility, backward compatibility. |
| V. Security | PASS | This IS a security feature. Reduces PII exposure surface. Session tokens for guests no longer contain email. Admin email access restricted to admin-only endpoints. |
| VI. UX Consistency | PASS | No visible UX changes — users see names (already the case in most views). `userId` is never displayed. `trimEmail()` fallback removed; mandatory name ensures display identity. |
| VII. Performance | PASS | Lazy backfill adds one DynamoDB write per user (first access only). `?mine=true` reduces payload size for My Progress (fewer ratings transferred). No new queries added to hot paths. |

## Project Structure

### Documentation (this feature)

```text
specs/041-email-privacy-opaque-id/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── events.js           # MODIFY: verify-PIN response, userId in JWT
│   │   ├── auth.js             # MODIFY: OTP userId generation for admin events
│   │   ├── ratings.js          # MODIFY: ?mine=true, admin-gated email in CSV
│   │   ├── dashboard.js        # MODIFY: pass isAdmin to service
│   │   └── similarUsers.js     # MODIFY: return userId+name, not email
│   ├── middleware/
│   │   └── jwtAuth.js          # MODIFY: role-dependent JWT payload, backward compat
│   ├── services/
│   │   ├── EventMemberService.js  # MODIFY: generate userId on registration
│   │   ├── DashboardService.js    # MODIFY: return userId+name in summaries
│   │   ├── SimilarityService.js   # MODIFY: return userId instead of email
│   │   └── EventConfigService.js  # MODIFY: enforce mandatory name
│   └── utils/
│       └── userIdUtils.js      # NEW: userId generation utility (nanoid wrapper)
└── tests/
    └── unit/
        ├── userIdUtils.test.js       # NEW: userId generation tests
        ├── EventMemberService.test.js # MODIFY: test userId in registration
        └── DashboardService.test.js   # MODIFY: test userId in summaries

frontend/
├── src/
│   ├── services/
│   │   ├── apiClient.js        # MODIFY: store userId, getUserId()
│   │   └── ratingService.js    # MODIFY: parse userId, support ?mine=true
│   ├── pages/
│   │   ├── EventPage.jsx       # MODIFY: identify user by userId
│   │   └── DashboardPage.jsx   # MODIFY: pass userId to drawers
│   └── components/
│       ├── UserRatingsTable.jsx    # MODIFY: key by userId, display name
│       ├── UserDetailsDrawer.jsx   # MODIFY: accept userId, use ?mine=true
│       └── SimilarUsersDrawer.jsx  # MODIFY: use userId for keys, name for display
└── tests/
    ├── unit/
    │   └── UserRatingsTable.test.jsx  # MODIFY: test userId-based rendering
    └── e2e/
        └── specs/
            └── email-privacy.spec.js  # NEW: E2E tests for email sanitization
```

**Structure Decision**: Existing web application structure (backend/ + frontend/). One new utility file (`userIdUtils.js`). All other changes are modifications to existing files. No new directories needed.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
