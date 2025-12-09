# Quick Start: Manage Event Administrators

**Feature**: Manage Event Administrators  
**Date**: 2025-01-27  
**Purpose**: Quick reference guide for implementing and testing administrator management functionality

## Overview

This feature enables event administrators to manage multiple administrators for their events. The original event creator is marked as the "owner" and cannot be deleted. Administrators can add new administrators (one at a time) and delete other administrators (except the owner).

## Key Changes

### Backend

1. **EventService Extensions** (`backend/src/services/EventService.js`):
   - `addAdministrator(eventId, email, requesterEmail)` - Add new administrator
   - `deleteAdministrator(eventId, email, requesterEmail)` - Delete administrator
   - `getAdministrators(eventId)` - Get administrators list
   - `migrateAdministratorField(event)` - Migrate old structure to new
   - `isAdministrator(event, email)` - Check if user is administrator
   - `isOwner(event, email)` - Check if user is owner

2. **API Routes** (`backend/src/api/events.js`):
   - `GET /api/events/:eventId/administrators` - Get administrators list
   - `POST /api/events/:eventId/administrators` - Add administrator
   - `DELETE /api/events/:eventId/administrators/:email` - Delete administrator

3. **Data Model Migration**:
   - Convert `administrator` (string) → `administrators` (object)
   - Structure: `{"email@example.com": {"assignedAt": "ISO 8601", "owner": true}}`

### Frontend

1. **EventAdminPage** (`frontend/src/pages/EventAdminPage.jsx`):
   - Add "Administrators Management" card component
   - Display administrators list with owner designation
   - Add administrator form (email input + submit button)
   - Delete administrator buttons (disabled for owner)

2. **API Client** (`frontend/src/services/apiClient.js`):
   - `getAdministrators(eventId)` - Fetch administrators list
   - `addAdministrator(eventId, email)` - Add administrator
   - `deleteAdministrator(eventId, email)` - Delete administrator

## Implementation Steps

### Step 1: Backend - Update EventService

```javascript
// Add to EventService class
async addAdministrator(eventId, newAdminEmail, requesterEmail) {
  const event = await this.getEvent(eventId);
  
  // Migrate if needed
  this.migrateAdministratorField(event);
  
  // Validate requester is administrator
  if (!this.isAdministrator(event, requesterEmail)) {
    throw new Error('Unauthorized: Only administrators can add administrators');
  }
  
  // Validate and normalize email
  const normalizedEmail = newAdminEmail.toLowerCase().trim();
  if (!this.isValidEmail(normalizedEmail)) {
    throw new Error('Invalid email address');
  }
  
  // Check for duplicates
  if (event.administrators[normalizedEmail]) {
    throw new Error('Administrator already exists');
  }
  
  // Add to administrators and users
  event.administrators[normalizedEmail] = {
    assignedAt: new Date().toISOString(),
    owner: false
  };
  
  if (!event.users) event.users = {};
  event.users[normalizedEmail] = {
    registeredAt: new Date().toISOString()
  };
  
  await this.updateEvent(eventId, event);
  return event;
}
```

### Step 2: Backend - Add API Routes

```javascript
// Add to backend/src/api/events.js
router.get('/:eventId/administrators', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const administrators = await eventService.getAdministrators(eventId);
    res.json({ administrators });
  } catch (error) {
    // Error handling
  }
});

router.post('/:eventId/administrators', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email } = req.body;
    const requesterEmail = req.user.email;
    
    const event = await eventService.addAdministrator(eventId, email, requesterEmail);
    res.json({ administrators: event.administrators });
  } catch (error) {
    // Error handling
  }
});

router.delete('/:eventId/administrators/:email', requireAuth, async (req, res) => {
  try {
    const { eventId, email } = req.params;
    const requesterEmail = req.user.email;
    
    await eventService.deleteAdministrator(eventId, email, requesterEmail);
    res.json({ success: true });
  } catch (error) {
    // Error handling
  }
});
```

### Step 3: Frontend - Add Administrators Card

```jsx
// Add to EventAdminPage.jsx
<Card>
  <CardHeader>
    <CardTitle>Administrators Management</CardTitle>
    <CardDescription>
      Manage administrators for this event. The owner cannot be removed.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Administrators list */}
    <div className="space-y-2">
      {Object.entries(administrators).map(([email, data]) => (
        <div key={email} className="flex items-center justify-between">
          <div>
            <span>{email}</span>
            {data.owner && <Badge>Owner</Badge>}
            <span className="text-sm text-muted-foreground">
              Added {new Date(data.assignedAt).toLocaleDateString()}
            </span>
          </div>
          {!data.owner && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(email)}
            >
              Delete
            </Button>
          )}
        </div>
      ))}
    </div>
    
    {/* Add administrator form */}
    <div className="space-y-2">
      <Input
        type="email"
        placeholder="Enter email address"
        value={newAdminEmail}
        onChange={(e) => setNewAdminEmail(e.target.value)}
      />
      <Button onClick={handleAdd} disabled={!newAdminEmail}>
        Add Administrator
      </Button>
    </div>
  </CardContent>
</Card>
```

## Testing

### Unit Tests

```javascript
// backend/tests/unit/EventService.test.js
describe('EventService - Administrator Management', () => {
  test('addAdministrator adds new administrator', async () => {
    // Test implementation
  });
  
  test('deleteAdministrator removes administrator', async () => {
    // Test implementation
  });
  
  test('deleteAdministrator prevents owner deletion', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```javascript
// backend/tests/integration/events.test.js
describe('POST /api/events/:eventId/administrators', () => {
  test('adds administrator successfully', async () => {
    // Test implementation
  });
  
  test('returns 400 for duplicate administrator', async () => {
    // Test implementation
  });
});
```

### E2E Tests

```gherkin
# frontend/tests/e2e/administrators.feature
Feature: Manage Event Administrators
  Scenario: Add new administrator
    Given I am logged in as an event administrator
    When I navigate to the event admin page
    And I enter "admin2@example.com" in the email field
    And I click "Add Administrator"
    Then I should see "admin2@example.com" in the administrators list
    And "admin2@example.com" should be in the users section
```

## Migration

### Lazy Migration (On Access)

```javascript
// In EventService.getEvent()
migrateAdministratorField(event) {
  if (event.administrator && !event.administrators) {
    event.administrators = {
      [event.administrator.toLowerCase()]: {
        assignedAt: event.createdAt || new Date().toISOString(),
        owner: true
      }
    };
    delete event.administrator;
    // Save migrated event
    this.updateEvent(event.eventId, event);
  }
}
```

### Batch Migration Script

```javascript
// scripts/migrate-administrators.js
async function migrateAllEvents() {
  const events = await dataRepository.listEvents();
  for (const event of events) {
    if (event.administrator && !event.administrators) {
      // Migrate event
      await eventService.migrateAdministratorField(event);
    }
  }
}
```

## Common Issues

### Issue: "Administrator already exists" when adding
**Solution**: Check email normalization - ensure both stored and input emails are lowercase.

### Issue: Owner deletion allowed
**Solution**: Verify `isOwner()` check is performed before deletion in `deleteAdministrator()`.

### Issue: Users section not updated
**Solution**: Ensure atomic update includes both `administrators` and `users` sections in single write.

## Next Steps

1. Implement backend EventService methods
2. Add API routes
3. Update frontend EventAdminPage
4. Add API client methods
5. Write tests (unit, integration, E2E)
6. Run migration for existing events
7. Test with multiple administrators
8. Verify owner protection
