# Data Model: Fix OTP Request Loop and Turnstile Race Condition

**Branch**: `046-fix-otp-turnstile-race` | **Date**: 2026-03-27

## Summary

No data model changes required. This is a frontend-only behavior fix. All backend entities (OTP records, rate limit counters, refresh tokens, user sessions) remain unchanged.

## Component State Model

The only "data" affected is the React component state within `EventOTPEntryPage`. No persistent storage or backend schema changes are involved.

### New Refs (non-rendered state)

| Ref | Type | Purpose |
|-----|------|---------|
| `hasAutoRequested` | `boolean` (init: `false`) | Guards the auto-send effect to fire exactly once per mount |
| `turnstileTokenRef` | `string \| null` (init: `null`) | Always-current Turnstile token for manual resend reads without triggering re-renders |

### Existing State (unchanged)

| State | Type | Purpose |
|-------|------|---------|
| `email` | `string` | Admin email from sessionStorage |
| `name` | `string` | Admin display name from sessionStorage |
| `otp` | `string` | User-entered 6-digit code |
| `loading` | `boolean` | OTP verify in progress |
| `requestingOTP` | `boolean` | OTP request in progress |
| `error` | `string` | Error message displayed inline |
| `success` | `string` | Success message displayed inline |
| `otpRequested` | `boolean` | Whether at least one OTP has been sent (shows resend button) |
