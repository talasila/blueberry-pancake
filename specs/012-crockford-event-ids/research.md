# Research: Crockford Base32 Event IDs

**Feature**: 012-crockford-event-ids | **Date**: 2026-02-24

## R1: Crockford Base32 Alphabet

**Decision**: Use the standard Crockford Base32 encoding alphabet: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`

**Rationale**: The Crockford Base32 encoding (https://www.crockford.com/base32.html) is purpose-built for human readability. It excludes four letters that are visually ambiguous:
- **I** — confused with `1` or `l`
- **L** — confused with `1` or `I`
- **O** — confused with `0`
- **U** — excluded to reduce accidental profanity in generated IDs

This leaves exactly 32 symbols (10 digits + 22 letters), enabling clean 5-bit-per-character encoding.

**Alternatives considered**:
- Base36 (0-9 + A-Z): Still includes O/I/L confusion. Rejected.
- z-base-32: Different character ordering, less widely recognized. Rejected.
- Custom alphabet: No standard to reference. Rejected.

## R2: ID Generation Approach

**Decision**: Replace the `customAlphabet` string in `nanoid` from the 62-character alphanumeric set to the 32-character Crockford set. Keep `nanoid` as the generator.

**Rationale**: `nanoid`'s `customAlphabet()` accepts any string of characters as the alphabet. Swapping from 62 to 32 characters is a one-line change. nanoid handles uniform distribution across any alphabet size automatically (it uses rejection sampling to avoid modulo bias).

**Alternatives considered**:
- Encoding a numeric counter in Crockford Base32: Adds statefulness and complexity. Rejected — random IDs are sufficient at this scale.
- Using a dedicated base32 library (e.g., `base32-encode`): Unnecessary — we don't need encode/decode, just random character selection. nanoid already does this.

## R3: ID Length and Entropy

**Decision**: Keep 8-character IDs.

**Rationale**: 8 characters × 5 bits/char = 40 bits of entropy = ~1.1 trillion possible IDs. At this pre-production scale, collision probability is negligible. The existing retry mechanism (3 attempts with DynamoDB existence check) provides additional safety. 8 characters is optimal for verbal sharing and manual entry.

**Alternatives considered**:
- 10 characters (50 bits): Exceeds current entropy but adds 2 characters to every shared ID. Rejected — overkill for current scale.
- 9 characters (45 bits): Marginal benefit over 8. Rejected.

## R4: Input Validation Strategy

**Decision**: Keep the input validation regex as `/^[A-Za-z0-9]{8}$/` (accept any 8 alphanumeric characters). Normalize to uppercase after validation. Do not reject excluded Crockford characters (I, L, O, U) at the validation layer.

**Rationale**: Per spec clarifications, excluded characters should not be rejected — they simply won't match any event since all generated IDs use only Crockford characters. This keeps validation simple and avoids confusing error messages about specific letter exclusions. The validation function returns the normalized (uppercased) event ID alongside the validity flag.

**Alternatives considered**:
- Strict Crockford validation regex `/^[0-9A-HJ-NP-TV-Za-hj-np-tv-z]{8}$/`: Rejects I/L/O/U input. Rejected — spec explicitly says input should not be rejected for these characters.
- Crockford decoding (I→1, O→0): Rejected — spec explicitly says no auto-correction.

## R5: URL Redirect for Canonical Uppercase

**Decision**: Implement a client-side redirect in the React app. When the event ID in the URL is not fully uppercase, replace the URL with its uppercase equivalent using React Router's `Navigate` component.

**Rationale**: The redirect is a frontend concern since React Router controls all `/event/:eventId` routing. A server-side redirect is unnecessary because the backend API already receives event IDs from the frontend (not directly from browser URL entry). The redirect ensures copy-pasted URLs are always in canonical uppercase form.

**Alternatives considered**:
- Server-side 302 redirect at API Gateway/Lambda level: Adds infrastructure complexity for a cosmetic URL concern. Rejected.
- No redirect, just case-insensitive lookup: Leaves inconsistent URLs in browser bars and shared links. Rejected per spec clarification.

## R6: DRY Consolidation of Validation Logic

**Decision**: Remove the duplicate `validateEventId` method from `EventService.js` and have all callers use the shared function from `validators.js`. Consolidate the ~8 inline regex occurrences in `ProfilePage.jsx` into calls to a shared frontend validation utility.

**Rationale**: Constitution Principle II (DRY) requires elimination of duplicated logic. The `EventService.validateEventId()` method is functionally identical to the shared `validateEventId()` in `validators.js`. ProfilePage.jsx repeats the same regex pattern 8 times where a single function call would suffice.

**Alternatives considered**:
- Leave duplicates and only change the alphabet: Violates constitution. Rejected.
- Share the same validation module between frontend and backend: Would require a monorepo shared package. Overkill for one regex. Rejected — each layer gets its own copy of the constant, but each layer has exactly one definition.
