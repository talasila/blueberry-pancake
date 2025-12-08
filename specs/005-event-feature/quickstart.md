# Quick Start: Event Feature

**Feature**: Event Feature  
**Date**: 2025-01-27  
**Purpose**: Quick reference for implementing event page access and administration

## Overview

This feature enables authenticated users to access event pages and administrators to access admin pages. Event names appear in the header, and administrators can navigate between main and admin pages. The system polls for event state updates to reflect administrator changes.

## Key Components

### Backend

1. **API Endpoint**: `GET /api/events/:eventId`
   - Location: `backend/src/api/events.js`
   - Method: Extend existing router with GET endpoint
   - Authentication: Use existing `requireAuth` middleware
   - Service: Use `EventService.getEvent(eventId)`

2. **EventService Extension**
   - Location: `backend/src/services/EventService.js`
   - Method: Add `getEvent(eventId)` method
   - Validation: Validate event ID format, check existence

### Frontend

1. **EventPage Component**
   - Location: `frontend/src/pages/EventPage.jsx`
   - Route: `/event/:eventId`
   - Protection: Wrapped in `ProtectedRoute`
   - Features: Display event, show loading state, handle errors

2. **EventAdminPage Component**
   - Location: `frontend/src/pages/EventAdminPage.jsx`
   - Route: `/event/:eventId/admin`
   - Protection: Wrapped in `ProtectedRoute` and `AdminRoute`
   - Features: Admin interface, navigation to main page

3. **AdminRoute Component**
   - Location: `frontend/src/components/AdminRoute.jsx`
   - Purpose: Protect admin routes, check administrator status
   - Logic: Case-insensitive email comparison

4. **useEvent Hook**
   - Location: `frontend/src/hooks/useEvent.js`
   - Purpose: Fetch event data, manage loading/error states
   - Features: Initial fetch, error handling

5. **useEventPolling Hook**
   - Location: `frontend/src/hooks/useEventPolling.js`
   - Purpose: Periodic polling for event state updates
   - Features: Configurable interval, cleanup on unmount

6. **Header Updates**
   - Location: `frontend/src/components/Header.jsx`
   - Changes: Display event name when in `/event/*` routes
   - Logic: Use `useLocation()` to detect route, fetch event name from context

## Implementation Steps

### Step 1: Backend API Endpoint

1. Extend `backend/src/api/events.js`:
   ```javascript
   router.get('/:eventId', requireAuth, async (req, res) => {
     try {
       const { eventId } = req.params;
       const event = await eventService.getEvent(eventId);
       res.json(event);
     } catch (error) {
       // Handle errors (404, 500, etc.)
     }
   });
   ```

2. Add `getEvent` method to `EventService`:
   ```javascript
   async getEvent(eventId) {
     // Validate event ID format
     // Retrieve from DataRepository
     // Return event data
   }
   ```

### Step 2: Frontend Hooks

1. Create `useEvent` hook:
   ```javascript
   function useEvent(eventId) {
     const [event, setEvent] = useState(null);
     const [isLoading, setIsLoading] = useState(true);
     const [error, setError] = useState(null);
     
     useEffect(() => {
       // Fetch event data
     }, [eventId]);
     
     return { event, isLoading, error };
   }
   ```

2. Create `useEventPolling` hook:
   ```javascript
   function useEventPolling(eventId, intervalMs = 30000) {
     // Implement polling logic
   }
   ```

### Step 3: Frontend Components

1. Create `EventPage` component:
   - Use `useParams()` to get `eventId`
   - Use `useEvent` hook to fetch data
   - Use `useEventPolling` for state updates
   - Display loading/error states
   - Show navigation to admin if user is admin

2. Create `EventAdminPage` component:
   - Similar to EventPage but for admin interface
   - Show navigation back to main page

3. Create `AdminRoute` component:
   - Check if user is administrator
   - Redirect to main page if not admin
   - Show loading while checking

### Step 4: Header Updates

1. Update `Header` component:
   - Use `useLocation()` to detect `/event/*` routes
   - Create/use EventContext to share event name
   - Display event name with truncation
   - Remove event name when leaving event routes

### Step 5: Routing

1. Update `App.jsx`:
   - Add routes for `/event/:eventId` and `/event/:eventId/admin`
   - Wrap in `ProtectedRoute`
   - Wrap admin route in `AdminRoute`

## Testing Checklist

### Backend Tests

- [ ] GET /api/events/:eventId returns event data for valid event
- [ ] GET /api/events/:eventId returns 404 for non-existent event
- [ ] GET /api/events/:eventId returns 401 without authentication
- [ ] EventService.getEvent validates event ID format
- [ ] EventService.getEvent handles file system errors

### Frontend Tests

- [ ] EventPage displays event data when loaded
- [ ] EventPage shows loading indicator while fetching
- [ ] EventPage shows error message for 404
- [ ] EventPage redirects to auth for 401
- [ ] AdminRoute allows access for administrators
- [ ] AdminRoute denies access for non-administrators
- [ ] Header displays event name in event routes
- [ ] Header removes event name outside event routes
- [ ] Navigation controls appear for administrators only
- [ ] Polling updates event state when changed

### E2E Tests

- [ ] User can navigate to event page
- [ ] User can navigate to admin page (as admin)
- [ ] Non-admin cannot access admin page
- [ ] Event name appears in header
- [ ] Navigation between main and admin pages works
- [ ] Polling detects state changes

## Common Patterns

### Case-Insensitive Email Comparison

```javascript
const isAdmin = userEmail.toLowerCase() === event.administrator.toLowerCase();
```

### Route Parameter Extraction

```javascript
import { useParams } from 'react-router-dom';
const { eventId } = useParams();
```

### Polling Setup

```javascript
useEffect(() => {
  const interval = setInterval(() => {
    fetchEvent();
  }, 30000);
  return () => clearInterval(interval);
}, [eventId]);
```

### Event Name Truncation

```javascript
<span className="truncate max-w-[200px]">
  {eventName}
</span>
```

## Dependencies

- React Router DOM 7.10.1 (routing)
- Express 5.2.1 (backend API)
- Existing authentication system (JWT tokens)
- Existing EventService and DataRepository
- Existing Header component

## Performance Considerations

- Event data is cached for performance
- Polling interval: 30-60 seconds (configurable)
- Page load target: <2 seconds
- Navigation target: <1 second

## Security Considerations

- All routes require authentication
- Admin routes require administrator verification
- Case-insensitive email comparison prevents access issues
- Event ID format validation prevents injection
- Error messages don't reveal system internals
