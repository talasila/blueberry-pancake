# Implementation Plan: Collect Guest Name at Event Entry

**Branch**: `035-guest-name-entry` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/035-guest-name-entry/spec.md`

## Summary

Add a mandatory name field to the EmailEntryPage so that every guest and admin has a display name on record from the moment they enter an event. The name is passed through the PIN/OTP verification flows to the server and stored in `event.users[email].name`. Browser localStorage provides cross-session pre-fill for returning users on the same device.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0
**Primary Dependencies**: React 19.2.1, Express 5.2.1, Radix UI, Tailwind CSS 4.1.17
**Storage**: DynamoDB (via DynamoDBRepository) — user records in `event.users` map
**Testing**: Vitest + @testing-library/react (frontend), Vitest (backend)
**Target Platform**: Web (browser + Node.js server)
**Project Type**: Web application (React SPA + Express API)
**Performance Goals**: No new performance-sensitive paths — adds one text field and passes one extra string through existing flows
**Constraints**: No new dependencies; localStorage graceful degradation in private browsing
**Scale/Scope**: 3 frontend pages modified, 2 backend endpoints modified, 2 backend services modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Small, focused changes to existing well-structured code |
| II. DRY | PASS | Reuses existing `updateUserName` in EventConfigService; no duplication |
| III. Maintainability | PASS | Follows existing patterns (sessionStorage handoff, api client methods) |
| IV. Testing Standards | PASS | Unit tests for all modified components; existing test patterns followed |
| V. Security | PASS | No new public endpoints; FR-011 prevents user enumeration; existing Turnstile/rate-limiting preserved |
| VI. UX Consistency | PASS | Name field uses existing Input/Label components from Radix UI; matches current form styling |
| VII. Performance | PASS | No measurable performance impact — one additional form field and one extra string in API payloads |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/035-guest-name-entry/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── events.js           # MODIFY: verify-pin accepts name param
│   │   └── auth.js             # MODIFY: verify-otp accepts name, saves to event.users
│   ├── services/
│   │   ├── EventMemberService.js   # MODIFY: registerUser accepts optional name
│   │   └── EventConfigService.js   # REUSE: existing updateUserName method
│   └── data/
│       ├── DataRepository.js       # MODIFY: registerUserAtomic signature (add name)
│       └── DynamoDBRepository.js   # MODIFY: registerUserAtomic stores name
└── tests/
    └── integration/
        ├── api.test.js             # UPDATE: verify-pin tests with name
        └── auth.test.js            # UPDATE: verify-otp tests with name

frontend/
├── src/
│   ├── pages/
│   │   ├── EmailEntryPage.jsx      # MODIFY: add name field, localStorage pre-fill
│   │   ├── PINEntryPage.jsx        # MODIFY: read name from sessionStorage, pass to API
│   │   └── EventOTPEntryPage.jsx   # MODIFY: read name from sessionStorage, pass to API
│   └── services/
│       └── apiClient.js            # MODIFY: verifyPIN and verifyOTP accept name param
└── tests/
    └── unit/
        ├── EmailEntryPage.test.jsx     # ADD: new test file for name field behavior
        └── PINEntryPage.test.jsx       # UPDATE: verify name passed to API
```

**Structure Decision**: Existing web application structure (frontend + backend). No new files needed except one test file (EmailEntryPage.test.jsx). All changes are modifications to existing files.
