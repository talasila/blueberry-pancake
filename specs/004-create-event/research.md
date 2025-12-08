# Research: Create Event Functionality

**Feature**: Create Event Functionality  
**Date**: 2025-01-27  
**Purpose**: Research technical decisions for implementing event creation functionality

## 1. Event ID Generation with nanoid

### Decision: Use nanoid package for 8-character event ID generation

**Rationale**:
- nanoid is a battle-tested, secure, URL-safe unique ID generator
- Supports custom alphabet and length (8 characters as per spec)
- Collision probability is extremely low (1% chance after generating 2.7 billion IDs for 8-char)
- Faster than UUID and more compact than traditional random strings
- Already used in many production applications

**Implementation Pattern**:
```javascript
import { customAlphabet } from 'nanoid';

// Use alphanumeric alphabet (A-Z, a-z, 0-9) for 8-character IDs
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);
const eventId = nanoid();
```

**Collision Handling**:
- If duplicate ID detected during creation (unlikely but possible), regenerate new ID
- Check uniqueness via DataRepository before persisting
- Maximum 3 retry attempts to prevent infinite loops

**Alternatives Considered**:
- **UUID v4**: Too long (36 characters), not user-friendly for display
- **crypto.randomBytes**: Requires manual encoding, more code
- **Timestamp + random**: Not truly random, predictable patterns
- **Database auto-increment**: Requires database, not file-based compatible

## 2. Event Data Storage Structure

### Decision: Extend FileDataRepository with event-specific methods

**Rationale**:
- Existing DataRepository pattern provides abstraction layer
- FileDataRepository already handles file-based JSON storage
- Can migrate to database later without changing service layer
- Follows existing project patterns (DRY principle)

**Storage Structure**:
```json
{
  "eventId": "aB3xY9mK",
  "name": "Wine Tasting Event",
  "typeOfItem": "wine",
  "state": "created",
  "administrator": "user@example.com",
  "createdAt": "2025-01-27T10:30:00Z",
  "updatedAt": "2025-01-27T10:30:00Z"
}
```

**File Organization**:
- Store events in `data/events/{eventId}.json` format
- Use existing FileDataRepository methods: `readEventConfig`, `writeEventConfig`
- Extend repository if needed: `createEvent`, `getEvent`, `listEvents`

**Alternatives Considered**:
- **Single events.json file**: Slower for large scale, file locking issues
- **Database from start**: Overkill for current scale, adds complexity
- **In-memory only**: Data loss on restart, not persistent

## 3. Event Name Validation

### Decision: Enforce reasonable length limits and character validation

**Rationale**:
- Prevents abuse (extremely long names)
- Ensures UI consistency (names fit in displays)
- Protects against injection attacks (sanitize input)
- Provides clear user feedback

**Validation Rules**:
- Minimum length: 1 character (non-empty)
- Maximum length: 100 characters (reasonable for event names)
- Allowed characters: Alphanumeric, spaces, hyphens, underscores
- Trim leading/trailing whitespace
- Reject empty strings after trimming

**Implementation Pattern**:
```javascript
function validateEventName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Event name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Event name cannot be empty' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Event name must be 100 characters or less' };
  }
  
  // Allow alphanumeric, spaces, hyphens, underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return { valid: false, error: 'Event name contains invalid characters' };
  }
  
  return { valid: true, value: trimmed };
}
```

**Alternatives Considered**:
- **No length limit**: Risk of abuse, UI breaking
- **Very short limit (20 chars)**: Too restrictive for descriptive names
- **Unicode support**: Adds complexity, current scope doesn't require it

## 4. Success Popup Implementation

### Decision: Use modal/dialog component pattern for success popup

**Rationale**:
- Provides clear visual feedback for successful event creation
- Displays event ID prominently for user reference
- Non-blocking (can be dismissed)
- Follows existing UI patterns (shadcn components)

**Implementation Pattern**:
- Use React state to control popup visibility
- Display event ID in large, readable font
- Include "Close" or "Dismiss" button
- Optionally include "Copy Event ID" button for convenience
- Auto-dismiss after 5 seconds (optional, user preference)

**UI Components**:
- Reuse existing shadcn Card component for popup container
- Use Button component for dismiss action
- Ensure mobile-responsive design

**Alternatives Considered**:
- **Toast notification**: Less prominent, might be missed
- **Redirect to event page**: Out of scope (event viewing not implemented)
- **Inline success message**: Less prominent, doesn't match spec requirement

## 5. Event State Management (Lifecycle)

### Decision: Store state as string enum in event data

**Rationale**:
- Simple, clear state representation
- Easy to validate and transition
- No complex state machine library needed for current scope
- State transitions defined in spec (created → started/paused, started ↔ paused, any → finished)

**State Values**:
- `"created"`: Initial state when event is first created
- `"started"`: Event is active
- `"paused"`: Event is temporarily inactive
- `"finished"`: Event is completed (terminal state)

**State Transition Logic** (for future implementation):
```javascript
const VALID_TRANSITIONS = {
  created: ['started', 'paused', 'finished'],
  started: ['paused', 'finished'],
  paused: ['started', 'finished'],
  finished: [] // Terminal state, no transitions allowed
};

function canTransition(currentState, newState) {
  return VALID_TRANSITIONS[currentState]?.includes(newState) ?? false;
}
```

**Note**: State transition UI is out of scope for this feature. Only initial "created" state is set during event creation.

**Alternatives Considered**:
- **State machine library (XState)**: Overkill for simple 4-state model
- **Numeric state codes**: Less readable, harder to debug
- **Separate state table**: Unnecessary complexity for current needs

## 6. Administrator Assignment

### Decision: Store administrator email from JWT token payload

**Rationale**:
- JWT token already contains user email (from OTP auth feature)
- No additional user lookup required
- Simple, direct assignment
- Aligns with existing authentication patterns

**Implementation Pattern**:
```javascript
// Extract email from JWT token (already in middleware)
const userEmail = req.user.email; // From jwtAuth middleware

// Assign as administrator during event creation
const event = {
  eventId: generateEventId(),
  name: validatedName,
  typeOfItem: 'wine',
  state: 'created',
  administrator: userEmail,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

**Alternatives Considered**:
- **User ID instead of email**: Requires user management system (out of scope)
- **Separate administrator table**: Unnecessary complexity for single admin per event
- **Role-based system**: Overkill for current single-admin requirement

## 7. Form Validation and Error Handling

### Decision: Client-side validation with server-side verification

**Rationale**:
- Immediate user feedback (better UX)
- Reduces unnecessary API calls
- Server-side validation ensures security and data integrity
- Consistent with existing form patterns

**Validation Flow**:
1. Client-side: Validate on blur and submit (immediate feedback)
2. Server-side: Re-validate all inputs (security)
3. Return clear error messages for each validation failure
4. Display errors inline near form fields

**Error Messages**:
- Event name required: "Event name is required"
- Event name too long: "Event name must be 100 characters or less"
- Event name invalid characters: "Event name can only contain letters, numbers, spaces, hyphens, and underscores"
- Type of item not selected: "Please select a type of item"

**Alternatives Considered**:
- **Server-side only**: Slower feedback, worse UX
- **Client-side only**: Security risk, can be bypassed
- **Complex validation library**: Overkill for simple form (2 fields)

## 8. Duplicate Request Prevention

### Decision: Disable submit button and show loading state during creation

**Rationale**:
- Prevents accidental duplicate submissions
- Provides clear visual feedback (loading state)
- Simple, effective solution
- No complex debouncing needed for current scope

**Implementation Pattern**:
```javascript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (isSubmitting) return; // Prevent duplicate submissions
  
  setIsSubmitting(true);
  try {
    const event = await createEvent(formData);
    // Show success popup
  } catch (error) {
    // Show error message
  } finally {
    setIsSubmitting(false);
  }
};
```

**Server-side Protection**:
- Idempotency not required for current scope (duplicate events allowed if intentional)
- Rate limiting handled by existing OTP auth system
- Simple request validation sufficient

**Alternatives Considered**:
- **Request debouncing**: Unnecessary complexity for form submission
- **Idempotency keys**: Overkill for current needs
- **Optimistic UI updates**: Adds complexity, not needed for current scope
