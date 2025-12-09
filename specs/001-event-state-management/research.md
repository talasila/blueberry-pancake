# Research: Manage Event State

**Feature**: Manage Event State  
**Date**: 2025-01-27  
**Purpose**: Research technical decisions for implementing event state management functionality

## 1. State Transition Implementation Pattern

### Decision: Use State Machine Pattern with Optimistic Locking

**Rationale**:
- State machine pattern provides clear, maintainable state transition rules
- Optimistic locking prevents lost updates from concurrent modifications
- File-based storage requires explicit concurrency control (no database-level locking)
- Matches existing codebase patterns (EventService for business logic, DataRepository for persistence)

**Implementation Pattern**:
```javascript
// State transition validation
const VALID_TRANSITIONS = {
  created: ['started'],
  started: ['paused', 'completed'],
  paused: ['started', 'completed'],
  completed: ['started', 'paused']
};

// Optimistic locking pattern
async transitionState(eventId, newState, expectedCurrentState) {
  // 1. Read current event state
  const event = await dataRepository.getEvent(eventId);
  
  // 2. Validate current state matches expected (optimistic lock check)
  if (event.state !== expectedCurrentState) {
    throw new Error('Event state has changed. Please refresh and try again.');
  }
  
  // 3. Validate transition is allowed
  if (!VALID_TRANSITIONS[expectedCurrentState]?.includes(newState)) {
    throw new Error(`Invalid transition from ${expectedCurrentState} to ${newState}`);
  }
  
  // 4. Update state atomically
  await dataRepository.updateEvent(eventId, {
    state: newState,
    updatedAt: new Date().toISOString()
  });
}
```

**Alternatives Considered**:
- **Pessimistic locking**: Would require file locking mechanism, adds complexity, not needed for low-concurrency use case
- **Event sourcing**: Overkill for simple state transitions, adds significant complexity
- **Database transactions**: Not applicable (file-based storage), would require migration

## 2. Legacy State Migration Strategy

### Decision: Auto-migrate "finished" to "completed" on First Access

**Rationale**:
- Seamless backward compatibility without manual intervention
- Lazy migration (only when event is accessed) minimizes upfront migration overhead
- Single migration point (getEvent method) ensures consistency
- No data loss or breaking changes for existing events

**Implementation Pattern**:
```javascript
async getEvent(eventId) {
  const event = await dataRepository.getEvent(eventId);
  
  // Migrate legacy "finished" state to "completed"
  if (event.state === 'finished') {
    event.state = 'completed';
    await dataRepository.updateEvent(eventId, {
      state: 'completed',
      updatedAt: new Date().toISOString()
    });
  }
  
  return event;
}
```

**Alternatives Considered**:
- **Batch migration script**: Requires manual execution, adds operational overhead
- **Support both states**: Adds complexity to state validation and UI logic
- **Reject legacy events**: Breaks existing events, poor user experience

## 3. UI-Level Transition Prevention

### Decision: Compute Valid Transitions on Frontend Based on Current State

**Rationale**:
- Prevents invalid transition attempts before API call (better UX)
- Reduces server load (fewer invalid requests)
- Matches spec requirement (FR-019)
- Simple implementation using existing state data

**Implementation Pattern**:
```javascript
// Frontend: Compute valid transitions
const getValidTransitions = (currentState) => {
  const transitions = {
    created: ['started'],
    started: ['paused', 'completed'],
    paused: ['started', 'completed'],
    completed: ['started', 'paused']
  };
  return transitions[currentState] || [];
};

// Only render buttons for valid transitions
const validTransitions = getValidTransitions(event.state);
```

**Alternatives Considered**:
- **Server-side only validation**: Allows invalid attempts, worse UX, more server load
- **Separate API endpoint for valid transitions**: Adds unnecessary API call, can be computed client-side
- **Disable buttons instead of hiding**: Less clear UX, shows unavailable options

## 4. Optimistic Locking Error Handling

### Decision: Return Clear Error Message with State Change Information

**Rationale**:
- Provides actionable feedback to administrators
- Indicates what happened (state changed) and what to do (refresh and retry)
- Maintains data integrity while providing good UX
- Matches existing error handling patterns in codebase

**Implementation Pattern**:
```javascript
// Backend error response
if (event.state !== expectedCurrentState) {
  return res.status(409).json({
    error: 'Event state has changed. Please refresh the page and try again.',
    currentState: event.state
  });
}
```

**Alternatives Considered**:
- **Silent failure**: Poor UX, administrators don't know why action failed
- **Auto-retry**: Complex logic, may not resolve underlying conflict
- **Queue transitions**: Overkill for low-concurrency use case, adds significant complexity

## 5. State Validation and Error Handling

### Decision: Validate State Before All Operations, Log Invalid States

**Rationale**:
- Prevents data corruption from invalid states
- Logging helps identify data issues for investigation
- Early validation catches problems before they propagate
- Matches spec requirement (FR-020)

**Implementation Pattern**:
```javascript
const VALID_STATES = ['created', 'started', 'paused', 'completed'];

function validateState(state) {
  if (!VALID_STATES.includes(state)) {
    loggerService.error(`Invalid event state detected: ${state}`);
    throw new Error(`Invalid event state: ${state}. Please contact support.`);
  }
}
```

**Alternatives Considered**:
- **Auto-correct invalid states**: Risky, may lose intended state
- **Silent validation**: Hides data issues, makes debugging difficult
- **Reject without logging**: Loses diagnostic information

## 6. Frontend State Display and Feedback Control

### Decision: Use State to Control Feedback UI Directly

**Rationale**:
- Simple, direct mapping from state to UI behavior
- Matches spec requirements (FR-013, FR-014, FR-015)
- Consistent with existing EventPage validation patterns
- Clear separation of concerns (state controls behavior)

**Implementation Pattern**:
```javascript
// EventPage: Control feedback based on state
const canProvideFeedback = event.state === 'started';

if (!canProvideFeedback) {
  const message = event.state === 'paused' 
    ? 'Event is paused. Rating is not available.'
    : 'Event is completed. Rating is no longer available.';
  // Show message, disable feedback UI
}
```

**Alternatives Considered**:
- **Separate flag for feedback enabled**: Adds redundancy, state already indicates capability
- **Server-side only validation**: Requires API call for every feedback attempt, less efficient
- **Complex permission system**: Overkill for simple state-based control

## 7. API Endpoint Design

### Decision: Use PATCH /api/events/:eventId/state with State in Request Body

**Rationale**:
- RESTful design (PATCH for partial updates)
- Clear, semantic endpoint
- Matches existing API patterns in codebase
- Allows future extension (e.g., transition metadata)

**Implementation Pattern**:
```javascript
// PATCH /api/events/:eventId/state
router.patch('/:eventId/state', requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const { state } = req.body;
  const administratorEmail = req.user?.email;
  
  // Validate administrator
  // Transition state with optimistic locking
  // Return updated event
});
```

**Alternatives Considered**:
- **POST /api/events/:eventId/start|pause|complete**: Multiple endpoints, more code duplication
- **PUT /api/events/:eventId**: Less semantic, doesn't clearly indicate state change
- **GraphQL mutation**: Overkill for simple state transition, adds complexity

## 8. Testing Strategy for Optimistic Locking

### Decision: Test Concurrent Modification Scenarios with Mocked Timing

**Rationale**:
- Verifies optimistic locking behavior without complex test infrastructure
- Tests the critical concurrency protection mechanism
- Matches existing test patterns in codebase
- Provides confidence in concurrent operation handling

**Implementation Pattern**:
```javascript
// Test: Concurrent state transitions
test('rejects transition when state changes concurrently', async () => {
  // Setup: Create event in "started" state
  // Simulate: First transition reads state, second transition changes state before first writes
  // Assert: First transition fails with optimistic locking error
});
```

**Alternatives Considered**:
- **Real concurrent requests**: Complex to set up, flaky tests, not necessary for validation
- **Skip concurrency tests**: Leaves critical behavior untested
- **Integration tests only**: Misses unit-level validation of locking logic
