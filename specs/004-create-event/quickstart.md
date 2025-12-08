# Quickstart: Create Event Functionality

**Feature**: Create Event Functionality (004-create-event)  
**Date**: 2025-01-27

## Overview

This guide provides a quick reference for implementing the create event functionality. It covers the essential steps, key components, and integration points.

## Prerequisites

- OTP authentication system (feature 003-otp-auth) must be implemented
- Landing page with "Create" button (feature 002-landing-page) must exist
- DataRepository infrastructure must be available
- JWT authentication middleware must be functional

## Implementation Checklist

### Backend

- [ ] Install nanoid package: `npm install nanoid`
- [ ] Create `EventService.js` in `backend/src/services/`
- [ ] Create `events.js` API route in `backend/src/api/`
- [ ] Extend `FileDataRepository` with event methods (if needed)
- [ ] Register events route in `backend/src/api/index.js` with `requireAuth` middleware
- [ ] Add unit tests for `EventService`
- [ ] Add integration tests for `/api/events` endpoint

### Frontend

- [ ] Create `CreateEventPage.jsx` in `frontend/src/pages/`
- [ ] Add route for `/create-event` in `frontend/src/App.jsx` (protected route)
- [ ] Update landing page "Create" button to navigate to `/create-event`
- [ ] Implement form with name and typeOfItem fields
- [ ] Add form validation (client-side)
- [ ] Implement success popup component
- [ ] Add API client method for event creation
- [ ] Add unit tests for `CreateEventPage`
- [ ] Add E2E tests for create event flow

## Key Components

### Backend: EventService

```javascript
// backend/src/services/EventService.js
import { customAlphabet } from 'nanoid';
import dataRepository from '../data/FileDataRepository.js';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

class EventService {
  async createEvent(name, typeOfItem, administratorEmail) {
    // 1. Validate inputs
    // 2. Generate event ID (with collision handling)
    // 3. Create event object
    // 4. Persist via DataRepository
    // 5. Return event
  }
  
  validateEventName(name) {
    // Validation logic
  }
  
  generateEventId() {
    // Generate with collision handling (max 3 retries)
  }
}

export default new EventService();
```

### Backend: Events API Route

```javascript
// backend/src/api/events.js
import { Router } from 'express';
import eventService from '../services/EventService.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, typeOfItem } = req.body;
    const administratorEmail = req.user.email; // From JWT token
    
    const event = await eventService.createEvent(name, typeOfItem, administratorEmail);
    res.status(201).json(event);
  } catch (error) {
    // Error handling
  }
});

export default router;
```

### Frontend: CreateEventPage

```javascript
// frontend/src/pages/CreateEventPage.jsx
import { useState } from 'react';
import { createEvent } from '../services/apiClient.js';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';

function CreateEventPage() {
  const [name, setName] = useState('');
  const [typeOfItem, setTypeOfItem] = useState('wine');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successEvent, setSuccessEvent] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const event = await createEvent({ name, typeOfItem });
      setSuccessEvent(event);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render form and success popup
}
```

### Frontend: API Client Method

```javascript
// frontend/src/services/apiClient.js (add this method)
export async function createEvent(eventData) {
  const response = await apiClient.post('/events', eventData);
  return response.data;
}
```

## Integration Points

### 1. Landing Page → Create Event Flow

**Location**: `frontend/src/pages/LandingPage.jsx`

```javascript
// Update Create button handler
const handleCreateClick = () => {
  // If authenticated, navigate to /create-event
  // If not authenticated, navigate to /auth (OTP flow)
  // OTP auth will redirect back to /create-event after authentication
};
```

### 2. Protected Route Configuration

**Location**: `frontend/src/App.jsx`

```javascript
<Route 
  path="/create-event" 
  element={
    <ProtectedRoute>
      <CreateEventPage />
    </ProtectedRoute>
  } 
/>
```

### 3. API Route Registration

**Location**: `backend/src/api/index.js`

```javascript
import eventsRouter from './events.js';

// Protected routes
router.use('/events', requireAuth, eventsRouter);
```

## Data Flow

1. **User clicks "Create" button** → Landing page
2. **Check authentication** → If not authenticated, redirect to OTP auth
3. **OTP authentication** → User authenticates, receives JWT token
4. **Redirect to create event page** → After successful auth
5. **User fills form** → Name and type of item
6. **Form submission** → Client-side validation
7. **API request** → POST /api/events with JWT token
8. **Server validation** → EventService validates inputs
9. **Event creation** → Generate ID, create event object, persist
10. **Response** → Return event with event ID
11. **Success popup** → Display event ID to user

## Testing Strategy

### Unit Tests

- **EventService**: Event creation logic, validation, ID generation
- **CreateEventPage**: Form validation, submission handling, error display

### Integration Tests

- **POST /api/events**: Successful creation, validation errors, authentication errors
- **Event persistence**: Verify event saved correctly

### E2E Tests

- **Complete flow**: Landing page → Auth → Create event → Success popup
- **Error scenarios**: Invalid input, network failures, authentication expiration

## Common Issues

### Event ID Collision

**Issue**: Duplicate event ID generated (extremely rare)

**Solution**: Implement retry logic (max 3 attempts) in `generateEventId()`

### Authentication Expiration

**Issue**: JWT token expires during form filling

**Solution**: Handle 401 response, redirect to auth, preserve intended destination

### Form Validation

**Issue**: Client and server validation mismatch

**Solution**: Share validation logic or ensure both use same rules

## Next Steps

After implementing this feature:

1. Test complete flow end-to-end
2. Verify event persistence
3. Test error scenarios
4. Add E2E tests
5. Update documentation

## References

- [Specification](./spec.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/README.md)
- [Research](./research.md)
