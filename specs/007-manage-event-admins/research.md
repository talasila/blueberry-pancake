# Research: Manage Event Administrators

**Feature**: Manage Event Administrators  
**Date**: 2025-01-27  
**Purpose**: Research technical decisions for implementing administrator management functionality

## 1. Administrators Data Structure Migration

### Decision: Migrate from single `administrator` string field to `administrators` object with email keys

**Rationale**:
- Current structure: `"administrator": "user@example.com"` (single string)
- New structure: `"administrators": {"user@example.com": {"assignedAt": "ISO 8601", "owner": true}}`
- Object structure allows multiple administrators per event (FR-001)
- Email keys provide natural uniqueness and easy lookup
- Nested object stores metadata (assignedAt timestamp, owner flag) per administrator
- Migration required for existing events (dependency)

**Data Structure**:
```json
{
  "eventId": "aB3xY9mK",
  "name": "Summer Wine Tasting",
  "administrators": {
    "owner@example.com": {
      "assignedAt": "2025-01-27T10:30:00.000Z",
      "owner": true
    },
    "admin2@example.com": {
      "assignedAt": "2025-01-27T11:00:00.000Z",
      "owner": false
    }
  },
  "users": {
    "owner@example.com": {
      "registeredAt": "2025-01-27T10:30:00.000Z"
    },
    "admin2@example.com": {
      "registeredAt": "2025-01-27T11:00:00.000Z"
    }
  }
}
```

**Migration Strategy**:
- Read existing event files with `administrator` field
- Convert to `administrators` object: `{ [administrator]: { assignedAt: createdAt, owner: true } }`
- Remove old `administrator` field
- Migration can be done lazily (on first access) or proactively (batch migration)
- Backward compatibility: Support both structures during transition period

**Implementation Pattern**:
```javascript
// Migration helper in EventService
function migrateAdministratorField(event) {
  if (event.administrator && !event.administrators) {
    event.administrators = {
      [event.administrator.toLowerCase()]: {
        assignedAt: event.createdAt || new Date().toISOString(),
        owner: true
      }
    };
    delete event.administrator;
    return true; // Indicates migration occurred
  }
  return false; // No migration needed
}
```

**Alternatives Considered**:
- **Array of email strings**: Less flexible, no metadata storage, harder to check existence
- **Separate administrators table**: Overkill for file-based storage, adds complexity
- **Keep both fields**: Creates data inconsistency, violates DRY principle

## 2. Owner Protection Implementation

### Decision: Store owner flag in administrators object, enforce deletion protection in service layer

**Rationale**:
- Owner is the original administrator who created the event (FR-002, FR-020)
- Owner flag stored as boolean in administrators object: `"owner": true`
- Only one owner per event (the creator)
- Owner cannot be deleted by anyone, including themselves (FR-011)
- Protection enforced in EventService.deleteAdministrator method
- Clear error messages when owner deletion attempted

**Implementation Pattern**:
```javascript
async deleteAdministrator(eventId, emailToDelete, requesterEmail) {
  const event = await this.getEvent(eventId);
  
  // Check if requester is administrator
  if (!this.isAdministrator(event, requesterEmail)) {
    throw new Error('Unauthorized: Only administrators can delete administrators');
  }
  
  // Check if target is owner
  const targetAdmin = event.administrators[emailToDelete.toLowerCase()];
  if (targetAdmin?.owner === true) {
    throw new Error('Cannot delete owner: The original administrator cannot be removed');
  }
  
  // Check if this would leave no administrators
  const adminCount = Object.keys(event.administrators).length;
  if (adminCount <= 1) {
    throw new Error('Cannot delete last administrator: At least one administrator must remain');
  }
  
  // Delete administrator
  delete event.administrators[emailToDelete.toLowerCase()];
  
  // Remove from users section
  if (event.users && event.users[emailToDelete.toLowerCase()]) {
    delete event.users[emailToDelete.toLowerCase()];
  }
  
  await this.updateEvent(eventId, event);
}
```

**Alternatives Considered**:
- **Separate owner field**: Redundant, owner is just an administrator with special flag
- **Owner in separate structure**: Unnecessary complexity, administrators object is sufficient
- **Owner transfer**: Out of scope, owner designation is permanent (per spec)

## 3. Atomic Updates to Administrators and Users Sections

### Decision: Update both administrators object and users section in single transaction

**Rationale**:
- Administrators must be added to users section when created (FR-008)
- Administrators must be removed from users section when deleted (FR-012)
- Atomic updates prevent data inconsistency (FR-015)
- File-based storage: single file write is atomic at OS level
- Service layer ensures both updates happen together

**Implementation Pattern**:
```javascript
async addAdministrator(eventId, newAdminEmail, requesterEmail) {
  const event = await this.getEvent(eventId);
  
  // Validate requester is administrator
  if (!this.isAdministrator(event, requesterEmail)) {
    throw new Error('Unauthorized');
  }
  
  // Validate email format
  if (!this.isValidEmail(newAdminEmail)) {
    throw new Error('Invalid email address');
  }
  
  const normalizedEmail = newAdminEmail.toLowerCase();
  
  // Check for duplicates
  if (event.administrators[normalizedEmail]) {
    throw new Error('Administrator already exists');
  }
  
  // Atomic update: both administrators and users
  event.administrators[normalizedEmail] = {
    assignedAt: new Date().toISOString(),
    owner: false
  };
  
  // Add to users section if not already present
  if (!event.users) {
    event.users = {};
  }
  event.users[normalizedEmail] = {
    registeredAt: new Date().toISOString()
  };
  
  // Single atomic write
  await this.updateEvent(eventId, event);
  
  return event;
}
```

**Alternatives Considered**:
- **Separate updates**: Risk of partial failure, violates atomicity requirement
- **Two-phase commit**: Overkill for file-based storage, single write is sufficient
- **Event sourcing**: Unnecessary complexity for current requirements

## 4. Email Case Sensitivity Handling

### Decision: Normalize emails to lowercase for storage and comparison

**Rationale**:
- Email addresses are case-insensitive per RFC 5321
- Normalize to lowercase for consistent storage and lookup
- Prevents duplicate administrators with different case (FR-007)
- Simplifies comparison logic
- Matches existing patterns in codebase

**Implementation Pattern**:
```javascript
// Normalize email for storage
const normalizedEmail = email.toLowerCase().trim();

// Store with normalized key
event.administrators[normalizedEmail] = { ... };

// Lookup with normalized key
const admin = event.administrators[normalizedEmail.toLowerCase()];
```

**Alternatives Considered**:
- **Case-sensitive storage**: Violates email standards, creates duplicate issues
- **Case-preserving with case-insensitive comparison**: More complex, no benefit
- **Mixed case storage**: Inconsistent, harder to manage

## 5. Administrators Management UI Component

### Decision: Reuse Card component pattern from PIN Management

**Rationale**:
- PIN Management card already exists in EventAdminPage
- Consistent UI pattern (Card, CardHeader, CardTitle, CardDescription, CardContent)
- Follows existing shadcn UI component patterns
- Mobile-first responsive design already established
- Clear separation of concerns (separate card for administrators)

**Implementation Pattern**:
```jsx
// EventAdminPage.jsx
<Card>
  <CardHeader>
    <CardTitle>Administrators Management</CardTitle>
    <CardDescription>
      Manage administrators for this event. The owner cannot be removed.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Administrators list */}
    <div>
      {Object.entries(administrators).map(([email, data]) => (
        <div key={email}>
          {email} {data.owner && <Badge>Owner</Badge>}
          {!data.owner && (
            <Button onClick={() => handleDelete(email)}>Delete</Button>
          )}
        </div>
      ))}
    </div>
    
    {/* Add administrator form */}
    <div>
      <Input
        type="email"
        placeholder="Enter email address"
        value={newAdminEmail}
        onChange={(e) => setNewAdminEmail(e.target.value)}
      />
      <Button onClick={handleAdd}>Add Administrator</Button>
    </div>
  </CardContent>
</Card>
```

**Alternatives Considered**:
- **Separate page**: Unnecessary navigation, card is more accessible
- **Modal dialog**: Less discoverable, card is always visible
- **Inline form**: Less organized, card provides better structure

## 6. API Endpoint Design

### Decision: RESTful endpoints following existing patterns

**Rationale**:
- Follow existing API patterns (events.js routes)
- RESTful design: POST for add, DELETE for delete, GET for list
- Consistent with existing event endpoints
- Clear separation: `/api/events/:eventId/administrators`
- Authentication required (JWT middleware)

**Endpoint Structure**:
```javascript
// GET /api/events/:eventId/administrators
// Returns list of administrators

// POST /api/events/:eventId/administrators
// Body: { email: "admin@example.com" }
// Adds new administrator

// DELETE /api/events/:eventId/administrators/:email
// Deletes administrator (except owner)
```

**Implementation Pattern**:
```javascript
// backend/src/api/events.js
router.get('/:eventId/administrators', requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const administrators = await eventService.getAdministrators(eventId);
  res.json(administrators);
});

router.post('/:eventId/administrators', requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const { email } = req.body;
  const requesterEmail = req.user.email;
  
  const event = await eventService.addAdministrator(eventId, email, requesterEmail);
  res.json({ administrators: event.administrators });
});

router.delete('/:eventId/administrators/:email', requireAuth, async (req, res) => {
  const { eventId, email } = req.params;
  const requesterEmail = req.user.email;
  
  await eventService.deleteAdministrator(eventId, email, requesterEmail);
  res.json({ success: true });
});
```

**Alternatives Considered**:
- **GraphQL**: Overkill, REST is sufficient and matches existing patterns
- **Single endpoint with action parameter**: Less RESTful, harder to understand
- **Nested resource structure**: More complex routing, current structure is clearer

## 7. Event Creation Integration

### Decision: Update event creation to use administrators object from start

**Rationale**:
- New events should use new structure immediately (no migration needed)
- EventService.createEvent already assigns initial administrator
- Update to store in administrators object with owner flag
- Ensures consistency: all new events use new structure
- Existing events migrated on access or via batch script

**Implementation Pattern**:
```javascript
// EventService.createEvent
async createEvent(name, typeOfItem, administratorEmail) {
  // ... validation ...
  
  const event = {
    eventId: this.generateEventId(),
    name: validatedName,
    typeOfItem: validatedType,
    state: 'created',
    administrators: {
      [administratorEmail.toLowerCase()]: {
        assignedAt: new Date().toISOString(),
        owner: true
      }
    },
    users: {
      [administratorEmail.toLowerCase()]: {
        registeredAt: new Date().toISOString()
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await dataRepository.createEvent(event);
  return event;
}
```

**Alternatives Considered**:
- **Create with old structure, migrate later**: Creates inconsistency, more complex
- **Separate creation logic**: Unnecessary duplication, single path is cleaner

## Summary

All technical decisions align with existing patterns and infrastructure:
- Administrators structure: Object with email keys, metadata (assignedAt, owner)
- Migration: Lazy or batch migration from single field to object structure
- Owner protection: Boolean flag in administrators object, enforced in service layer
- Atomic updates: Single file write ensures consistency
- Email normalization: Lowercase for storage and comparison
- UI pattern: Card component matching PIN Management pattern
- API design: RESTful endpoints following existing patterns
- Event creation: Use new structure from start

No external dependencies needed beyond existing stack. All decisions follow DRY principles and reuse existing infrastructure.
