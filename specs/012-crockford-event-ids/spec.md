# Feature Specification: Crockford Base32 Event IDs

**Feature Branch**: `012-crockford-event-ids`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "Simplify event IDs for human consumption. Change the allowable character set to the Crockford subset of characters."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Human-Readable Event IDs (Priority: P1)

An event organizer creates a new event and receives a short, easy-to-share event ID composed only of unambiguous characters. The ID uses the Crockford Base32 alphabet (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), which eliminates visually confusing characters (I, L, O, U). When the organizer shares this ID verbally or in print, participants can enter it without second-guessing whether a character is a zero or the letter O, a one or the letter I/L.

**Why this priority**: This is the core value of the feature — every newly generated event ID uses the simplified character set, directly improving shareability and reducing entry errors.

**Independent Test**: Can be fully tested by creating a new event and verifying the returned event ID contains only Crockford Base32 characters at the expected length.

**Acceptance Scenarios**:

1. **Given** a user creates a new event, **When** the system generates an event ID, **Then** the ID contains only characters from the set `0123456789ABCDEFGHJKMNPQRSTVWXYZ` and is the specified length.
2. **Given** a newly generated event ID, **When** displayed in the UI, share links, or URLs, **Then** the ID appears in uppercase Crockford Base32 format.
3. **Given** a user generates multiple event IDs, **When** comparing them for uniqueness, **Then** no collisions occur within the retry mechanism.

---

### User Story 2 - Case-Insensitive Event ID Entry (Priority: P1)

A participant receives an event ID verbally (e.g., "Join event A-B-3-R-T-9-K-W") or from a printed flyer. They type it into the join field on the landing page using any mix of uppercase or lowercase letters. The system normalizes their input and successfully navigates them to the correct event, regardless of case.

**Why this priority**: Crockford Base32 is inherently case-insensitive. Accepting lowercase input and normalizing to uppercase is essential for the human-friendly promise of this feature.

**Independent Test**: Can be tested by entering a known event ID in various case combinations (all lower, all upper, mixed) and verifying successful event lookup every time.

**Acceptance Scenarios**:

1. **Given** an event with ID `A3RKT9WP`, **When** a user enters `a3rkt9wp` in the join field, **Then** the system finds and displays the correct event.
2. **Given** an event with ID `A3RKT9WP`, **When** a user enters `a3Rkt9Wp` in the join field, **Then** the system redirects to the canonical uppercase URL and displays the correct event.
3. **Given** a user enters an event ID containing excluded letters (I, L, O, U), **When** submitting, **Then** the system passes the input through without correction; if no matching event is found, the standard "event not found" message is shown.

---

### User Story 3 - Validation Feedback on Event ID Entry (Priority: P2)

When a participant enters an event ID with invalid characters (e.g., special characters, wrong length), the system provides a clear, helpful error message guiding them to correct their input.

**Why this priority**: Good validation feedback reduces user frustration and support burden, but depends on the core ID generation and lookup working first.

**Independent Test**: Can be tested by entering various invalid inputs and verifying appropriate error messages appear.

**Acceptance Scenarios**:

1. **Given** a user enters an event ID with special characters (e.g., `A3R-T9!W`), **When** submitting, **Then** the system displays a clear error message.
2. **Given** a user enters an event ID that is too short or too long, **When** submitting, **Then** the system displays a message indicating the expected length.

---

### Edge Cases

- How does the system handle an event ID at the boundary of the retry/collision mechanism when the ID space is more constrained (32 vs 62 chars)? The existing retry mechanism handles this.
- What happens when event IDs are pasted with leading/trailing whitespace? The system should trim before validation.
- How are event IDs displayed in CSV exports? Uppercase, consistent with all other display contexts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate new event IDs using only the Crockford Base32 character set: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
- **FR-002**: System MUST accept event ID input in a case-insensitive manner, normalizing to uppercase before lookup.
- **FR-003**: System MUST validate event ID input and provide clear error messages for invalid formats.
- **FR-004**: System MUST display event IDs in uppercase in all user-facing contexts (URLs, share links, UI elements, CSV exports).
- **FR-005**: System MUST maintain the existing collision-detection and retry mechanism for ID generation.
- **FR-006**: System MUST generate new event IDs at 8 characters in length.
- **FR-007**: System MUST trim whitespace from event ID input before validation.
- **FR-008**: System MUST NOT apply automatic correction for confusable characters (I, L, O, U). If input does not match an event, the standard "event not found" response applies.
- **FR-009**: System MUST redirect event URLs containing non-uppercase event IDs to their uppercase canonical form (e.g., `/event/a3rkt9wp` redirects to `/event/A3RKT9WP`).

### Key Entities

- **Event ID**: A short, unique, 8-character identifier for an event. Composed exclusively of Crockford Base32 characters. Acts as the primary human-facing reference for sharing and accessing events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly generated event IDs contain only Crockford Base32 characters.
- **SC-002**: Users can successfully join events by entering IDs in any letter case (upper, lower, mixed) with a 100% success rate.
- **SC-003**: Event ID entry error rate (users failing to join due to mistyped IDs) decreases compared to the previous format.
- **SC-004**: Event IDs can be communicated verbally and transcribed correctly by participants on first attempt at a higher rate than the previous mixed-case format.

## Clarifications

### Session 2026-02-24

- Q: What happens to existing events with old-format IDs after this change? → A: No real events exist in production yet; migration is not applicable. Clean break carries no data risk.
- Q: Should the system redirect lowercase URLs to their uppercase canonical form? → A: Yes, redirect to uppercase URL (e.g., `/event/a3rkt9wp` → `/event/A3RKT9WP`).

## Assumptions

- The Crockford Base32 alphabet is the standard 32-character set: `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (excludes I, L, O, U).
- The existing DynamoDB storage and event lookup mechanism does not need structural changes — only the ID generation alphabet and validation logic change.
- Event IDs are the only identifiers affected; other system IDs (user IDs, session IDs, etc.) remain unchanged.
- Backward compatibility with old-format event IDs is not required. No real events exist in production, so this is a zero-risk clean break.
- No automatic correction of confusable characters (I→1, O→0, etc.) is needed.
