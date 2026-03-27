# Implementation Plan: Fix OTP Request Loop and Turnstile Race Condition

**Branch**: `046-fix-otp-turnstile-race` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/046-fix-otp-turnstile-race/spec.md`

## Summary

The OTP verification page (`EventOTPEntryPage`) has a React useEffect dependency bug that causes: (1) an OTP request to fire before the Turnstile token is available, producing an immediate error; (2) a cascading loop where each Turnstile token change re-triggers the OTP request, burning through the 3-per-15-minute rate limit within seconds. The fix separates the auto-request-on-mount logic from the manual resend logic, gates the auto-request on Turnstile readiness, and uses a ref to prevent re-triggering.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0
**Primary Dependencies**: React 19.2.1, React Router 7.10.1, Radix UI, Tailwind CSS 4.1.17
**Storage**: N/A (no backend or data changes)
**Testing**: Vitest 3.2.1 + @testing-library/react 16.3.0 + jsdom 27.2.0
**Target Platform**: Web (mobile browsers — primary failure scenario is mobile Safari/Chrome resuming from sleep)
**Project Type**: Web application (frontend-only fix)
**Performance Goals**: N/A (correctness fix, not performance)
**Constraints**: Single file change (`EventOTPEntryPage.jsx`) + new test file; no backend changes
**Scale/Scope**: 1 page component, 1 new test file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Fix eliminates a correctness bug; the refactored code will have clearer separation of concerns (auto-send vs. manual resend) |
| II. DRY | PASS | The fix consolidates the OTP send into a single shared helper called from two distinct paths (auto + manual), avoiding duplication |
| III. Maintainability | PASS | Replacing a useCallback-in-useEffect-deps anti-pattern with a ref-based approach is more maintainable and easier to reason about |
| IV. Testing Standards | PASS | A new dedicated test file will be created for EventOTPEntryPage (currently untested) covering all acceptance scenarios |
| V. Security | PASS | Fix preserves all existing security mechanisms (Turnstile, rate limiting, CSRF). No security surfaces changed |
| VI. UX Consistency | PASS | Loading and error states follow existing app patterns (same Card/Button/Input components, same inline error styling) |
| VII. Performance | PASS | Eliminates unnecessary duplicate OTP requests, reducing both frontend and backend load |

No violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/046-fix-otp-turnstile-race/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal — no unknowns)
├── data-model.md        # Phase 1 output (N/A — no data changes)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── pages/
│       └── EventOTPEntryPage.jsx    # PRIMARY: Refactor OTP request lifecycle
└── tests/
    └── unit/
        └── EventOTPEntryPage.test.jsx  # NEW: Unit tests for OTP page
```

**Structure Decision**: This is a single-file bug fix in the existing frontend page component. No new directories, no backend changes. One new test file follows the established `frontend/tests/unit/<PageName>.test.jsx` convention.

## Design

### Root Cause

The `requestOTP` callback depends on `turnstileToken` via `useCallback` deps, and is itself a dependency of the auto-send `useEffect`. This creates a chain reaction:

```
turnstileToken changes → requestOTP identity changes → useEffect re-fires → OTP request sent
```

Combined with `resetWidget()` being called on every completion (resetting the token to null, then Turnstile re-solves producing a new token), this creates an infinite loop that sends OTP requests until rate-limited.

### Fix Strategy

**Principle**: Decouple the auto-send effect from Turnstile token identity changes.

1. **Use a ref for the Turnstile token** (`turnstileTokenRef`) that is always up-to-date but does not trigger re-renders or effect re-runs when it changes.

2. **Gate the auto-send effect** on two conditions:
   - `email` is available in sessionStorage (already present)
   - `turnstileToken` is truthy (new gate — prevents null-token requests)

3. **Use a `hasAutoRequested` ref** to ensure the auto-send fires exactly once per mount. Once set to `true`, subsequent token changes are ignored by the effect.

4. **Separate auto-send from manual resend**:
   - Auto-send: reads token from ref, does NOT call `resetWidget()` on completion
   - Manual resend: reads current token state, DOES call `resetWidget()` after completion

5. **Disable resend button** while Turnstile token is null/loading.

6. **Show Turnstile error state** (FR-008): If `useTurnstile` reports an error (all retries exhausted), display "Verification check failed. Please reload the page and try again." instead of the loading state.

### Component State Changes

**Current state variables** (unchanged):
- `email`, `name`, `otp`, `loading`, `requestingOTP`, `error`, `success`, `otpRequested`

**New refs**:
- `hasAutoRequested` (useRef, boolean) — tracks whether the auto-send has already fired this mount
- `turnstileTokenRef` (useRef, string|null) — always-current Turnstile token without triggering re-renders

**Modified hooks**:
- `useTurnstile` — destructure `isLoading` and `error` in addition to existing `token`, `resetWidget`, `containerRef`

### Effect & Handler Redesign

**Auto-send effect** (replaces current useEffect at lines 84-96):
```
Dependencies: [eventId, navigate, turnstileToken]
Guard: if hasAutoRequested.current → return (skip)
Guard: if no email in sessionStorage → redirect to /email (existing)
Guard: if !turnstileToken → return (wait for Turnstile)
Action: set hasAutoRequested.current = true, then send OTP (no resetWidget)
```

Note: `turnstileToken` IS in the deps so the effect re-runs when the token arrives, but the `hasAutoRequested` ref ensures it only sends once.

**Manual resend handler** (replaces current `requestOTP` for button click):
```
Guard: if !turnstileTokenRef.current → return
Action: send OTP using turnstileTokenRef.current, then call resetWidget()
```

**Shared OTP send helper** (extracted function):
```
async sendOTPRequest(emailToUse, token) → calls apiClient.requestOTP
Sets requestingOTP, error, success, otpRequested state
Does NOT call resetWidget (caller decides)
```

### UI State Matrix

| Turnstile State | hasAutoRequested | What User Sees |
|----------------|-----------------|----------------|
| Loading (token null, no error) | false | "Sending verification code..." spinner, no error |
| Error (all retries failed) | false | "Verification check failed. Please reload the page and try again." |
| Ready (token available) | false → true | Brief spinner, then auto-send fires, then success message |
| Ready | true | Success message + OTP input + Resend button enabled |
| Token expired/null after send | true | Success message persists, Resend button disabled until token refreshes |

### Resend Button State

| Condition | Button State |
|-----------|-------------|
| `requestingOTP === true` | Disabled, shows "Sending..." |
| `loading === true` (OTP verify in progress) | Disabled |
| `turnstileToken` is null/falsy | Disabled |
| Otherwise | Enabled |

## Complexity Tracking

No constitution violations. Table not needed.
