# Feature Specification: Enforce User Membership on Backend Write Operations

**Feature Branch**: `024-enforce-membership-writes`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: Bug report from manual testing of Guest Management feature (023) — deleted guests can continue performing write actions using their existing browser session because the backend does not verify continued event membership before processing mutations.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deleted Guest Cannot Register New Items (Priority: P1)

An event administrator deletes a guest from their event via the Guests drawer or Danger Zone. The deleted guest, still having an active browser session with a valid token, attempts to register a new bottle. The system rejects the request and no item is created, preventing orphaned data.

**Why this priority**: This is the most critical data integrity gap. Orphaned items appear in admin views (Export Data CSVs, Items drawer) without a corresponding user entry, creating confusion and polluting event data.

**Independent Test**: Can be fully tested by deleting a guest and then attempting a POST to the items endpoint with that guest's credentials. Delivers immediate protection against the most common orphaned-data scenario.

**Acceptance Scenarios**:

1. **Given** a guest has been deleted from an event, **When** the deleted guest attempts to register a new item, **Then** the backend returns a 403 error with a descriptive message and no item is created.
2. **Given** a guest is currently active and not deleted, **When** they register a new item, **Then** the item is created successfully (no regression).

---

### User Story 2 - Deleted Guest Cannot Submit Ratings (Priority: P1)

A deleted guest attempts to submit a new rating from their still-active browser session. The system rejects the request, preventing orphaned rating records with email addresses that no longer match any event member.

**Why this priority**: Orphaned ratings corrupt the scoring data for the event and can skew results displayed to all participants.

**Independent Test**: Can be fully tested by deleting a guest and then attempting a POST to the ratings endpoint with that guest's credentials. Delivers protection against rating data corruption.

**Acceptance Scenarios**:

1. **Given** a guest has been deleted from an event, **When** the deleted guest attempts to submit a rating, **Then** the backend returns a 403 error with a descriptive message and no rating is saved.
2. **Given** a guest is currently active and not deleted, **When** they submit a rating, **Then** the rating is saved successfully (no regression).

---

### User Story 3 - Deleted Guest Cannot Modify or Delete Items (Priority: P2)

A deleted guest attempts to delete or update an item from their active session. The system rejects the request. Since the guest's items were already cleaned up during the deletion process, this prevents confusing error states and ensures the deletion workflow is watertight.

**Why this priority**: Lower risk than creating new orphaned records (Story 1 & 2) since items are already cleaned up during user deletion, but still necessary for complete enforcement.

**Independent Test**: Can be fully tested by deleting a guest and then attempting DELETE or PATCH requests against the items endpoint. Confirms that the membership gate covers all write operations, not just creation.

**Acceptance Scenarios**:

1. **Given** a guest has been deleted from an event, **When** the deleted guest attempts to delete an item, **Then** the backend returns a 403 error.
2. **Given** a guest has been deleted from an event, **When** the deleted guest attempts to update an item, **Then** the backend returns a 403 error.

---

### User Story 4 - Deleted Guest Cannot Delete Ratings (Priority: P2)

A deleted guest attempts to delete a rating from their active session. The system rejects the request, maintaining consistency with the other write-operation guards.

**Why this priority**: Completes the enforcement across all write endpoints. Ratings are already cleaned up during deletion, so the risk is lower, but the guard is needed for consistency.

**Independent Test**: Can be fully tested by deleting a guest and then attempting a DELETE request against the ratings endpoint.

**Acceptance Scenarios**:

1. **Given** a guest has been deleted from an event, **When** the deleted guest attempts to delete a rating, **Then** the backend returns a 403 error.

---

### User Story 5 - Frontend Handles Membership Rejection Gracefully (Priority: P2)

When a deleted guest's action is rejected by the backend, the frontend displays a blocking modal explaining that their access to the event has been removed (e.g., "Your access to this event has been removed"). Upon dismissing the modal, the user is logged out of the application entirely.

**Why this priority**: Important for user experience but secondary to the core security fix. Without this, deleted users would see confusing technical errors instead of a meaningful explanation. Logging out ensures no further stale-session interactions occur.

**Independent Test**: Can be tested by triggering a 403 membership error in the browser and verifying the modal appears, displays a clear message, and that dismissing it logs the user out.

**Acceptance Scenarios**:

1. **Given** a deleted guest receives a 403 response with the membership error code from the backend, **When** the frontend identifies the error code, **Then** a blocking modal is displayed with a clear message (e.g., "Your access to this event has been removed").
2. **Given** the blocking modal is displayed, **When** the user dismisses the modal, **Then** the user is logged out and redirected to the logged-out landing state.
3. **Given** the blocking modal is displayed, **When** the user has not yet dismissed it, **Then** no other UI interactions are possible behind the modal (blocking behavior).

---

### User Story 6 - Administrator Access Is Unaffected (Priority: P1)

An event administrator performs any of the above actions (register items, submit ratings, delete items, etc.). The membership enforcement does not interfere with administrator operations, since administrators operate via the event's administrator list, not the guest/user list.

**Why this priority**: Critical to avoid breaking existing administrator functionality. A regression here would lock administrators out of their own events.

**Independent Test**: Can be tested by having an administrator (who may or may not also be in the users list) perform all write operations and confirming they succeed.

**Acceptance Scenarios**:

1. **Given** a user is an event administrator (listed in the event's administrator roster), **When** they perform any write operation on the event, **Then** the operation succeeds regardless of their presence in the event's user/guest list.
2. **Given** an administrator who is also listed as a guest is removed from the guest list, **When** they perform write operations, **Then** the operations still succeed because they remain an administrator.

---

### Edge Cases

- **Administrator also in users list gets deleted from users**: The membership check verifies either the user/guest list OR the administrator list. An admin removed from the guest list retains access through their admin role.
- **JWT expires naturally**: Existing token-expiration handling covers this case. No changes needed.
- **Multiple browser tabs open**: All tabs share the same token cookie, so all tabs begin failing simultaneously once the membership check rejects the token's associated email. This is expected and correct behavior.
- **Request in flight during deletion**: A write request sent moments before or during the deletion may succeed or fail depending on timing. This is acceptable eventual consistency and does not require special handling.
- **Read-only endpoints**: Gating GET requests is out of scope. A deleted user seeing stale data is significantly less harmful than creating orphaned write data.
- **Deleted user rated many items**: When a prolific rater is deleted, cached aggregate stats for all items they rated must be invalidated within the deletion request. Remaining participants see freshly computed results on their next access after the admin confirms deletion.

## Clarifications

### Session 2026-03-03

- Q: What should the frontend do after displaying the membership rejection error? → A: Display a blocking modal explaining access has been removed; upon dismissal, log the user out entirely.
- Q: Should this feature include cleanup of pre-existing orphaned data from before the fix? → A: No — out of scope; address separately if needed.
- Q: How should the frontend distinguish a membership-revoked 403 from other 403 errors? → A: Backend includes a machine-readable error code in the response body (e.g., "EVENT_MEMBERSHIP_REQUIRED") so the frontend can reliably trigger the modal+logout flow.
- Q: When a user is deleted, should their existing ratings be preserved (anonymized) or fully removed? → A: Fully removed (current behavior). Scores for affected items will change accordingly.
- Q: Should recalculation of pre-computed stats after rating removal be in scope for this feature? → A: Yes — in scope. Add a requirement that aggregate stats are recalculated when ratings are removed during user deletion.
- Q: Should stat recalculation happen synchronously (within the deletion request) or asynchronously? → A: Synchronously — cached stats are invalidated within the deletion request so stale results are never served. Fresh stats are recomputed on next access.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST verify that the requesting user is a current member of the event (present in the event's user/guest list OR administrator list) before processing any write operation on event items or ratings.
- **FR-002**: System MUST return a 403 Forbidden response containing both a machine-readable error code (e.g., "EVENT_MEMBERSHIP_REQUIRED") and a descriptive human-readable message (e.g., "User is not registered for this event") when a non-member attempts a write operation.
- **FR-003**: System MUST enforce the membership check on all item write endpoints: create, update, and delete.
- **FR-004**: System MUST enforce the membership check on all rating write endpoints: create and delete.
- **FR-005**: System MUST allow administrators (users in the event's administrator list) to bypass the membership check, regardless of their presence in the event's user/guest list.
- **FR-006**: System MUST NOT create any orphaned data (items or ratings with owner identifiers that don't match any current event member) as a result of post-deletion actions.
- **FR-007**: The frontend MUST display a blocking modal with a clear, user-friendly message when a write operation is rejected due to membership enforcement. Upon dismissal of the modal, the user MUST be logged out of the application.
- **FR-008**: The membership check MUST NOT introduce additional data retrieval when the event data is already loaded as part of the existing request flow.
- **FR-009**: When a user is deleted and their ratings are removed, the system MUST invalidate any cached aggregate statistics (e.g., average scores, rankings) for all items affected by the removed ratings within the same deletion request, so that stale results are never served after the admin receives a success confirmation. Statistics are recomputed on the next access.

### Key Entities

- **Event**: The parent entity containing a list of registered users/guests and a list of administrators. Membership in either list grants different levels of access.
- **User/Guest**: A participant registered for an event. Identified by email. Removal from the event's user list should immediately revoke write access.
- **Item**: A bottle/item registered by a user for an event. Linked to the owner by email.
- **Rating**: A score submitted by a user for an item in an event. Linked to the submitter by email. When the submitter is deleted, their ratings are fully removed — aggregate scores for affected items change accordingly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a guest is deleted, 100% of subsequent write requests from that guest are rejected — zero orphaned items or ratings can be created.
- **SC-002**: Active (non-deleted) guests experience zero change in behavior — all existing write operations continue to succeed without added latency.
- **SC-003**: Administrator write operations succeed 100% of the time regardless of their presence in the guest list — no admin functionality is broken.
- **SC-004**: When a deleted guest's action is rejected, the user sees a clear error message within the normal response time — no confusing or technical error is displayed.
- **SC-005**: After a user is deleted, cached aggregate statistics (scores, rankings) are invalidated — no stale scores are ever served to any participant.

## Scope

### In Scope

- Backend membership validation on all write endpoints for items and ratings.
- Appropriate HTTP error response (403) with a machine-readable error code and descriptive message body.
- Frontend handling of the membership error code: blocking modal with explanation, followed by logout on dismissal.
- Recalculation of aggregate statistics (scores, rankings) for items affected by rating removal during user deletion.

### Out of Scope

- Proactive session invalidation (e.g., revoking tokens, pushing logout via WebSocket) — would require token blocklisting infrastructure that does not currently exist.
- Frontend-initiated session checks (polling to verify membership) — unnecessary if the backend rejects requests server-side.
- Gating read-only endpoints (GET requests) — lower risk and can be addressed separately.
- Cleanup of pre-existing orphaned items or ratings created before this fix is deployed — requires a separate audit and remediation effort.

## Assumptions

- The event object (including user and administrator lists) is already loaded during the existing request flow for write endpoints, so the membership check introduces no additional data retrieval cost.
- Administrators are identified via the event's administrator list, which is separate from the user/guest list.
- The existing JWT authentication and token-expiration handling remain unchanged.
- The 403 status code is the appropriate HTTP response for membership-denied scenarios (the user is authenticated but not authorized for this event).
- "Eventual consistency" for in-flight requests during deletion is acceptable — no distributed locking or queue-draining is required.
