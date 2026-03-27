# Research: Fix OTP Request Loop and Turnstile Race Condition

**Branch**: `046-fix-otp-turnstile-race` | **Date**: 2026-03-27

## Summary

No significant unknowns required research. The root cause was identified through direct code analysis, and the fix uses standard React patterns already established in the codebase.

## Decisions

### 1. Ref-based token access vs. removing token from effect deps

- **Decision**: Use a `turnstileTokenRef` to hold the current token value, while keeping `turnstileToken` in the auto-send effect's dependency array gated by a `hasAutoRequested` ref.
- **Rationale**: The effect needs to re-run when the token first becomes available (null → value) so it can fire the auto-send. But after the first send, subsequent token changes must be ignored. A `hasAutoRequested` ref provides this "fire once" semantic cleanly. The `turnstileTokenRef` is used by the manual resend handler to read the latest token without creating callback identity changes.
- **Alternatives considered**:
  - Removing `turnstileToken` from effect deps entirely and using only a ref: Would require a separate mechanism (interval/poll) to detect when the token first becomes available. More complex, less idiomatic React.
  - Using a state flag `autoRequestSent` instead of a ref: Would cause an unnecessary re-render when set. A ref is sufficient since this value doesn't affect rendering.

### 2. Separate handlers vs. flag parameter

- **Decision**: Create a shared `sendOTPRequest` helper and two distinct call paths (auto-send effect and manual resend handler) rather than a single `requestOTP` function with an `isManual` flag.
- **Rationale**: The auto-send and manual resend have different post-completion behavior (no resetWidget vs. resetWidget). Separating them makes each path's behavior explicit and testable. A flag parameter would obscure the behavioral difference.
- **Alternatives considered**:
  - Single `requestOTP(email, { resetAfter: boolean })` — workable but hides the distinct lifecycle intentions behind a parameter.

### 3. Turnstile error handling approach

- **Decision**: Leverage the existing `error` state from `useTurnstile` hook (set when all retries exhaust) to show the failure message. No timeout-based fallback.
- **Rationale**: The `useTurnstile` hook already has a retry mechanism (MAX_RETRIES = 2) and sets an error state when all retries fail. The OTP page should react to this existing error state rather than implementing its own timeout. This keeps the Turnstile lifecycle management in one place.
- **Alternatives considered**:
  - Adding a 15-second timeout on the OTP page that shows an error if no token arrives: Would duplicate the retry/timeout logic already in useTurnstile and could race with it.
