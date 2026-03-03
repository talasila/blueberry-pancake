# Feature Specification: Start Event Guard-Rail (Bottle Count Mismatch)

**Feature Branch**: `022-start-event-guardrail`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: provide an info or warning message before an admin starts the event when the number of registered bottles is not equal to the number of bottles available for rating, with specific messaging for (1) fewer registered than slots and (2) more registered than slots.

## Clarifications

### Session 2026-03-01

- Q: When the admin initiates start and there's a mismatch, how should the message be presented (blocking confirmation vs inline)? → A: Inline message only — message appears near the Start control (e.g. banner or alert); Start remains clickable and starts the event in one click.
- Q: When should the inline mismatch message be shown (first start only vs also on restart)? → A: Both — show when starting from created and when restarting from completed (any transition to started).
- Q: When Bottles configuration or registered list fails to load, what should happen? → A: Allow start with fallback — show a short message (e.g. "Counts unavailable") and keep Start clickable so the admin can still start the event.
- Q: Where should the inline message appear when the admin opens the State section? → A: Inside the State drawer/section — message appears inside the State panel or drawer, above the Start button, when that section is open.
- Q: Should the two mismatch cases use different message severity (info vs warning)? → A: Use info when registered < slots (informational); use warning when registered > slots (action needed in Bottles configuration).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Info When Fewer Bottles Registered Than Rating Slots (Priority: P1)

When an admin is about to start an event and the number of registered bottles is **less than** the number of bottles available for rating, the system shows an **info** message inline inside the State drawer/section (e.g. banner or alert) above the Start button. The message informs the admin of the mismatch, states that the event can still be started, that bottles can be registered later, and that the advantage of registering bottles is that only registered bottles can be mapped to bottle IDs when the event is paused—which helps when results are announced. Start remains clickable; the admin can start the event in one click.

**Why this priority**: Reduces confusion and sets correct expectations; admins can start confidently and add bottles later.

**Independent Test**: Create an event with more rating slots than registered bottles (e.g. 20 slots, 3 registered). Open admin, go to the State section (created or completed). Inline message appears near Start describing the situation, that starting is allowed, that bottles can be registered later, and the benefit of mapping when paused. Same message applies when restarting from completed.

**Acceptance Scenarios**:

1. **Given** an event in created state with rating slots configured greater than registered bottle count, **When** the admin opens the State section (drawer/panel), **Then** an inline info message is visible inside that section above the Start button; **When** the admin clicks Start, **Then** the event starts in one click (no separate confirmation step).
2. **Given** that message is shown, **When** the admin reads it, **Then** it states that the number of registered bottles is less than the number available for rating.
3. **Given** that message, **Then** it states that the event can be started.
4. **Given** that message, **Then** it states that bottles can be registered later.
5. **Given** that message, **Then** it states that only registered bottles can be mapped to bottle IDs when the event is paused, and that this is helpful when results are announced.

---

### User Story 2 - Warning When More Bottles Registered Than Rating Slots (Priority: P1)

When an admin is about to start an event and the number of registered bottles is **greater than** the number of bottles available for rating, the system shows a **warning** message inline inside the State drawer/section (e.g. banner or alert) above the Start button. The message informs the admin of the mismatch and that they need to adjust the bottle count in the Bottles configuration section. Start remains clickable; the admin can start the event in one click.

**Why this priority**: Prevents starting with more registered bottles than slots, which would leave some bottles without a rating slot.

**Independent Test**: Create an event with fewer rating slots than registered bottles (e.g. 5 slots, 8 registered). Open admin, go to the State section (created or completed). Inline message appears near Start stating the situation and that the bottle count must be adjusted in the Bottles configuration section. Same applies when restarting from completed.

**Acceptance Scenarios**:

1. **Given** an event in created state with registered bottle count greater than rating slots configured, **When** the admin opens the State section, **Then** an inline warning message is visible inside that section above the Start button; **When** the admin clicks Start, **Then** the event starts in one click (no separate confirmation step).
2. **Given** that message is shown, **When** the admin reads it, **Then** it states that the number of registered bottles is more than the number available for rating.
3. **Given** that message, **Then** it instructs the admin to adjust the bottle count in the Bottles configuration section.

---

### Edge Cases

- What happens when registered count equals rating slots? (No mismatch message; admin can start without this guard-rail.)
- What happens when zero bottles are registered? (Treat as “fewer registered than slots” with the same messaging about starting and registering later.)
- What happens when Bottles configuration or registered list fails to load? The system shows the fallback message "Counts unavailable" and keeps Start clickable so the admin can still start the event.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Whenever the admin can transition the event to started (from created or from completed), the system MUST compare the number of registered bottles to the number of bottles available for rating (rating slots) and show the inline message when they differ.
- **FR-002**: When registered bottles &lt; rating slots, the system MUST show an **info** message (informational styling) that: (a) states the mismatch, (b) states the event can be started, (c) states bottles can be registered later, (d) states that only registered bottles can be mapped to bottle IDs when the event is paused and that this is helpful when results are announced.
- **FR-003**: When registered bottles &gt; rating slots, the system MUST show a **warning** message (warning styling, to signal action needed) that: (a) states the mismatch, (b) instructs the admin to adjust the bottle count in the Bottles configuration section.
- **FR-004**: When registered bottles equals rating slots, the system MAY show no mismatch message (or a neutral confirmation only).
- **FR-005**: The message MUST be shown inline inside the State drawer/section (e.g. banner or alert) above the Start button when that section is open; Start MUST remain clickable and the event MUST start in one click (no blocking confirmation step).
- **FR-006**: Messaging MUST refer to "Bottles configuration" (or equivalent) for the section where bottle count is adjusted.
- **FR-007**: When configuration or registered list fails to load, the system MUST show the fallback message "Counts unavailable" and MUST keep Start clickable so the admin can still start the event.

### Key Entities

- **Event**: Has configured rating slots (number of bottles available for rating) and a list of registered bottles.
- **Registered bottles**: Bottles that have been registered for the event; count may differ from rating slots.
- **Bottles configuration**: Section where the admin sets the number of bottles available for rating (rating slots).

## Assumptions

- "Bottles available for rating" is the same as the configured rating slot count (e.g. from Item/Bottles configuration).
- "Bottle count" in Bottles configuration is the same as the number of rating slots.
- The message is shown in the admin flow only (e.g. on the event admin page), for any transition to started (first start from created or restart from completed).
- Event types that use "items" instead of "bottles" will use equivalent terminology (e.g. "items" and "Items configuration").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins see a clear message before start whenever registered bottle count ≠ rating slots (100% of such cases in the start flow).
- **SC-002**: When registered &lt; slots, admins can complete start without changing configuration and understand they can register bottles later and the benefit of mapping when paused.
- **SC-003**: When registered &gt; slots, admins are directed to Bottles configuration to adjust count; confusion about "too many registered" is reduced (e.g. measurable via fewer support questions or task completion in testing).
- **SC-004**: Message is readable and actionable for a non-technical admin. Validated via quickstart manual run or acceptance review.
