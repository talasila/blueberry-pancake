# Quick Start: Manage Event State

**Feature**: Manage Event State  
**Date**: 2025-01-27  
**Purpose**: Quick reference guide for implementing and testing event state management functionality

## Overview

This feature enables event administrators to transition events between states: "created", "started", "paused", and "completed". State transitions use optimistic locking to prevent concurrent modification conflicts. The UI only presents valid transition options based on the current state. Legacy events with "finished" state are automatically migrated to "completed" on first access.

## Key Changes

### Backend

1. **EventService Extensions** (`backend/src/services/EventService.js`):
   - `transitionState(eventId, newState, currentState, administratorEmail)` - Transition event state with optimistic locking
   - `validateStateTransition(fromState, toState)` - Validate transition is allowed
   - `getValidTransitions(currentState)` - Get valid target states for current state
   - `migrateLegacyState(event)` - Migrate "finished" to "completed"
   - Update `VALID_TRANSITIONS` constant to include "completed" and new transition rules
   - Update `isValidState()` to include "completed" and handle "finished" as legacy

2. **API Routes** (`backend/src/api/events.js`):
   - `PATCH /api/events/:eventId/state` - Transition event state

3. **Data Model Updates**:
   - State enum: "created", "started", "paused", "completed" (replaces "finished")
   - Legacy migration: "finished" → "completed" on first access
   - `updatedAt` timestamp updated on state transitions

### Frontend

1. **EventAdminPage** (`frontend/src/pages/EventAdminPage.jsx`):
   - Add state display (current state badge)
   - Add state transition buttons (only show valid transitions)
   - Handle state transition API calls
   - Handle optimistic locking conflicts (409 errors)

2. **EventPage** (`frontend/src/pages/EventPage.jsx`):
   - Update feedback validation to use "completed" instead of "finished"
   - Ensure feedback is disabled for "paused" and "completed" states

3. **API Client** (`frontend/src/services/apiClient.js`):
   - `transitionEventState(eventId, state, currentState)` - Transition event state

## Implementation Steps

### Step 1: Backend - Update EventService State Constants

```javascript
// Update VALID_TRANSITIONS in EventService.js
static VALID_TRANSITIONS = {
  created: ['started'],
  started: ['paused', 'completed'],
  paused: ['started', 'completed'],
  completed: ['started', 'paused']
};

// Update isValidState
static isValidState(state) {
  return ['created', 'started', 'paused', 'completed', 'finished'].includes(state);
}
```

### Step 2: Backend - Add State Transition Method

```javascript
// Add to EventService class
async transitionState(eventId, newState, currentState, administratorEmail) {
  // Validate state values
  if (!this.constructor.isValidState(newState) || !this.constructor.isValidState(currentState)) {
    throw new Error(`Invalid state. Valid states are: created, started, paused, completed`);
  }
  
  // Get event with optimistic locking check
  const event = await this.getEvent(eventId);
  
  // Migrate legacy state if needed
  if (event.state === 'finished') {
    event = await this.migrateLegacyState(eventId, event);
  }
  
  // Optimistic locking: verify current state matches expected
  if (event.state !== currentState) {
    throw new Error(`Event state has changed. Current state: ${event.state}. Please refresh and try again.`);
  }
  
  // Validate transition is allowed
  if (!this.validateStateTransition(currentState, newState)) {
    throw new Error(`Invalid transition from ${currentState} to ${newState}`);
  }
  
  // Validate administrator authorization
  if (!this.isAdministrator(event, administratorEmail)) {
    throw new Error('Unauthorized: Only administrators can change event state');
  }
  
  // Update state atomically
  const updatedEvent = {
    ...event,
    state: newState,
    updatedAt: new Date().toISOString()
  };
  
  await this.updateEvent(eventId, updatedEvent);
  return updatedEvent;
}

validateStateTransition(fromState, toState) {
  const validTargets = this.constructor.VALID_TRANSITIONS[fromState] || [];
  return validTargets.includes(toState);
}

getValidTransitions(currentState) {
  return this.constructor.VALID_TRANSITIONS[currentState] || [];
}

async migrateLegacyState(eventId, event) {
  if (event.state === 'finished') {
    event.state = 'completed';
    event.updatedAt = new Date().toISOString();
    await this.updateEvent(eventId, event);
  }
  return event;
}
```

### Step 3: Backend - Add API Route

```javascript
// Add to backend/src/api/events.js
router.patch('/:eventId/state', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { state, currentState } = req.body;
    const administratorEmail = req.user?.email;
    
    if (!administratorEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate request body
    if (!state || !currentState) {
      return res.status(400).json({ 
        error: 'Both state and currentState are required' 
      });
    }
    
    // Transition state
    const event = await eventService.transitionState(
      eventId, 
      state, 
      currentState, 
      administratorEmail
    );
    
    res.json(event);
  } catch (error) {
    // Handle optimistic locking conflict
    if (error.message.includes('state has changed')) {
      return res.status(409).json({
        error: error.message,
        currentState: error.currentState
      });
    }
    
    // Handle other errors (400, 401, 403, 404, 500)
    // ... error handling logic
  }
});
```

### Step 4: Frontend - Add State Management UI

```javascript
// Add to EventAdminPage.jsx
const [isTransitioning, setIsTransitioning] = useState(false);
const [transitionError, setTransitionError] = useState('');

const getValidTransitions = (currentState) => {
  const transitions = {
    created: ['started'],
    started: ['paused', 'completed'],
    paused: ['started', 'completed'],
    completed: ['started', 'paused']
  };
  return transitions[currentState] || [];
};

const handleStateTransition = async (newState) => {
  if (!event) return;
  
  setIsTransitioning(true);
  setTransitionError('');
  
  try {
    const updatedEvent = await apiClient.transitionEventState(
      eventId,
      newState,
      event.state
    );
    setEvent(updatedEvent);
    // Refresh event data
  } catch (error) {
    if (error.status === 409) {
      // Optimistic locking conflict - refresh and show message
      setTransitionError('Event state has changed. Please refresh and try again.');
      // Refresh event data
    } else {
      setTransitionError(error.message || 'Failed to transition state');
    }
  } finally {
    setIsTransitioning(false);
  }
};

// In render:
const validTransitions = getValidTransitions(event.state);
const stateLabels = {
  started: 'Start',
  paused: 'Pause',
  completed: 'Complete'
};

<div>
  <InfoField label="Status" value={event.state} className="capitalize" />
  {validTransitions.length > 0 && (
    <div className="space-y-2">
      <label className="text-sm font-medium">State Actions</label>
      <div className="flex gap-2">
        {validTransitions.map(transition => (
          <Button
            key={transition}
            onClick={() => handleStateTransition(transition)}
            disabled={isTransitioning}
          >
            {stateLabels[transition] || transition}
          </Button>
        ))}
      </div>
    </div>
  )}
</div>
```

### Step 5: Frontend - Update EventPage Feedback Validation

```javascript
// Update EventPage.jsx validateEventState method
const validateEventState = (action) => {
  if (!event) {
    return { valid: false, error: 'Event data not available' };
  }

  if (event.state === 'paused') {
    return { valid: false, error: 'Event is paused. Rating is not available.' };
  }

  if (event.state === 'completed') {
    return { valid: false, error: 'Event is completed. Rating is no longer available.' };
  }

  if (event.state === 'created') {
    return { valid: false, error: 'Event has not started yet. Rating is not available.' };
  }

  return { valid: true };
};
```

### Step 6: Frontend - Add API Client Method

```javascript
// Add to apiClient.js
async transitionEventState(eventId, state, currentState) {
  const response = await fetch(`${this.baseURL}/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getJWTToken()}`
    },
    body: JSON.stringify({ state, currentState })
  });
  
  if (!response.ok) {
    const error = await response.json();
    const err = new Error(error.error || 'Failed to transition state');
    err.status = response.status;
    err.currentState = error.currentState;
    throw err;
  }
  
  return response.json();
}
```

## Testing

### Unit Tests

```javascript
// EventService.test.js
describe('transitionState', () => {
  test('transitions from created to started', async () => {
    // Test implementation
  });
  
  test('rejects invalid transition', async () => {
    // Test implementation
  });
  
  test('rejects transition when state changed (optimistic locking)', async () => {
    // Test implementation
  });
  
  test('migrates legacy finished state to completed', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```javascript
// events.test.js
describe('PATCH /api/events/:eventId/state', () => {
  test('transitions state successfully', async () => {
    // Test implementation
  });
  
  test('returns 409 on optimistic locking conflict', async () => {
    // Test implementation
  });
  
  test('returns 403 for non-administrator', async () => {
    // Test implementation
  });
});
```

### E2E Tests

```gherkin
Feature: Event State Management
  Scenario: Administrator starts an event
    Given I am an administrator for event "aB3xY9mK"
    When I navigate to the event admin page
    And I click the "Start" button
    Then the event state should be "started"
    And users should be able to provide feedback

  Scenario: Administrator pauses an event
    Given event "aB3xY9mK" is in "started" state
    And I am an administrator for the event
    When I click the "Pause" button
    Then the event state should be "paused"
    And users should not be able to provide feedback
```

## Migration Notes

- Legacy events with "finished" state are automatically migrated to "completed" on first access
- No batch migration required - migration happens lazily
- Migration is idempotent and safe to run multiple times
- Frontend should handle both "finished" and "completed" states during transition period

## Common Issues

1. **Optimistic Locking Conflicts**: If multiple administrators try to change state simultaneously, one will get a 409 error. Solution: Refresh event data and retry.

2. **Invalid Transitions**: UI should only show valid transitions, but if an invalid transition is attempted, backend returns 400 error.

3. **Legacy State**: Events with "finished" state are automatically migrated, but frontend should handle both during transition period.
