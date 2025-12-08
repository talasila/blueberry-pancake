# Research: Event Feature

**Feature**: Event Feature  
**Date**: 2025-01-27  
**Purpose**: Document research and design decisions for event page access, admin access control, header updates, and state synchronization

## 1. React Router Route Protection with Nested Routes

### Decision: Use ProtectedRoute wrapper with route parameter extraction

**Rationale**:
- Existing ProtectedRoute component already handles authentication
- React Router 7.10.1 supports route parameters via `useParams()` hook
- Nested routes (`/event/:eventId` and `/event/:eventId/admin`) can share route parameter extraction
- Consistent with existing routing patterns in the application

**Implementation Pattern**:
```javascript
// App.jsx routing
<Route 
  path="/event/:eventId" 
  element={
    <ProtectedRoute>
      <EventPage />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/event/:eventId/admin" 
  element={
    <ProtectedRoute>
      <AdminRoute>
        <EventAdminPage />
      </AdminRoute>
    </ProtectedRoute>
  } 
/>

// EventPage.jsx
import { useParams } from 'react-router-dom';

function EventPage() {
  const { eventId } = useParams();
  // Use eventId to fetch event data
}
```

**Alternatives Considered**:
- **Separate route protection component**: More complex, existing ProtectedRoute sufficient
- **Route-level authentication check**: Less reusable, ProtectedRoute pattern already established

## 2. Administrator Access Control

### Decision: Case-insensitive email comparison with dedicated AdminRoute component

**Rationale**:
- Email addresses are case-insensitive per RFC 5321
- Prevents access issues when emails differ only by case
- Dedicated AdminRoute component provides clear separation of concerns
- Reusable pattern for future admin-only routes

**Implementation Pattern**:
```javascript
// AdminRoute.jsx
function AdminRoute({ children, eventId }) {
  const { user } = useAuth(); // Get authenticated user from context/token
  const { event } = useEvent(eventId);
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    if (user && event) {
      // Case-insensitive email comparison
      const userEmail = user.email?.toLowerCase();
      const adminEmail = event.administrator?.toLowerCase();
      setIsAdmin(userEmail === adminEmail);
    }
  }, [user, event]);

  if (isAdmin === null) {
    return <LoadingIndicator />;
  }

  if (!isAdmin) {
    return <Navigate to={`/event/${eventId}`} replace />;
  }

  return children;
}
```

**Email Comparison**:
- Convert both emails to lowercase before comparison
- Handle null/undefined cases gracefully
- Log access denials for security auditing

**Alternatives Considered**:
- **Case-sensitive comparison**: Violates email standards, causes access issues
- **Backend-only validation**: Less responsive UX, requires additional API calls

## 3. Header Event Name Display

### Decision: Route-based conditional rendering with useLocation hook

**Rationale**:
- Header component needs to detect when user is in `/event/*` routes
- React Router's `useLocation()` hook provides current route path
- Event name can be passed via context or fetched in Header component
- Trimming logic can use CSS text-overflow or JavaScript truncation

**Implementation Pattern**:
```javascript
// Header.jsx
import { useLocation } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';

function Header({ onSignInClick }) {
  const location = useLocation();
  const { eventName } = useEventContext();
  const isEventRoute = location.pathname.startsWith('/event/');

  return (
    <header>
      <div className="flex items-center">
        <Logo />
        {isEventRoute && eventName && (
          <span className="truncate max-w-[200px] ml-2">
            {eventName}
          </span>
        )}
        <SignInButton />
      </div>
    </header>
  );
}
```

**Event Name Trimming**:
- Use CSS `text-overflow: ellipsis` for automatic truncation
- Set `max-width` based on available header space
- Ensure minimum readable length (e.g., show at least 20 characters)

**Alternatives Considered**:
- **Prop drilling**: More verbose, context is cleaner for cross-component data
- **Separate header for event pages**: Duplicates code, violates DRY principle

## 4. Periodic Polling for Event State Updates

### Decision: Custom React hook with useEffect and setInterval

**Rationale**:
- Periodic polling balances freshness with server load
- Custom hook encapsulates polling logic for reusability
- useEffect cleanup prevents memory leaks
- Polling interval configurable (30-60 seconds per spec assumptions)

**Implementation Pattern**:
```javascript
// useEventPolling.js
function useEventPolling(eventId, intervalMs = 30000) {
  const [event, setEvent] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const data = await apiClient.getEvent(eventId);
      setEvent(data);
    } catch (error) {
      // Handle error, but don't stop polling
      console.error('Failed to fetch event:', error);
    }
  }, [eventId]);

  useEffect(() => {
    // Initial fetch
    fetchEvent();

    // Set up polling
    const pollInterval = setInterval(() => {
      fetchEvent();
    }, intervalMs);

    setIsPolling(true);

    // Cleanup on unmount or eventId change
    return () => {
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [eventId, intervalMs, fetchEvent]);

  return { event, isPolling, refetch: fetchEvent };
}
```

**Polling Considerations**:
- Pause polling when page is not visible (use Page Visibility API)
- Pause polling when component is unmounted
- Handle network errors gracefully (retry with exponential backoff)
- Polling interval: 30-60 seconds (configurable, start with 30 seconds)

**Alternatives Considered**:
- **WebSockets/SSE**: More complex infrastructure, out of scope per spec
- **Manual refresh only**: Poor UX, users miss state changes
- **On-action-only checks**: Insufficient, users may not perform actions frequently

## 5. State Validation on User Actions

### Decision: Validate event state before allowing actions, with optimistic UI updates

**Rationale**:
- Prevents users from performing actions on invalid states (e.g., rating when paused)
- Provides immediate feedback if state has changed
- Optimistic UI updates improve perceived performance
- Validation happens both client-side (for UX) and server-side (for security)

**Implementation Pattern**:
```javascript
// EventPage.jsx
function EventPage() {
  const { eventId } = useParams();
  const { event, refetch } = useEventPolling(eventId);

  const handleRateItem = async (itemId, rating) => {
    // Validate state before action
    if (event.state === 'paused' || event.state === 'finished') {
      // Show error message
      showError(`Event is ${event.state}. Rating is not available.`);
      // Refetch to ensure we have latest state
      await refetch();
      return;
    }

    try {
      // Perform rating action
      await apiClient.rateItem(eventId, itemId, rating);
      // Optimistic UI update
      updateLocalRating(itemId, rating);
    } catch (error) {
      // Handle error, refetch event state
      await refetch();
      showError('Failed to submit rating. Please try again.');
    }
  };

  return (
    <div>
      {event.state === 'paused' && (
        <Alert>This event is currently paused.</Alert>
      )}
      {/* Rating UI */}
    </div>
  );
}
```

**Validation Flow**:
1. Check current event state before action
2. If invalid state, show error and refetch event data
3. If valid state, proceed with action
4. On action completion or error, refetch to ensure state is current

**Alternatives Considered**:
- **Server-only validation**: Poor UX, users see errors after attempting action
- **No validation**: Allows invalid actions, creates data inconsistency

## 6. Navigation Controls Between Main and Admin Pages

### Decision: Conditional rendering based on administrator status

**Rationale**:
- Simple button/link navigation using React Router's `Link` or `useNavigate`
- Conditional rendering based on `isAdmin` state from AdminRoute/useEvent hook
- Consistent with existing navigation patterns

**Implementation Pattern**:
```javascript
// EventPage.jsx
function EventPage() {
  const { eventId } = useParams();
  const { event, isAdmin } = useEvent(eventId);
  const navigate = useNavigate();

  return (
    <div>
      {/* Main event content */}
      {isAdmin && (
        <Button onClick={() => navigate(`/event/${eventId}/admin`)}>
          Admin
        </Button>
      )}
    </div>
  );
}

// EventAdminPage.jsx
function EventAdminPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      {/* Admin content */}
      <Button onClick={() => navigate(`/event/${eventId}`)}>
        Back to Event
      </Button>
    </div>
  );
}
```

**Alternatives Considered**:
- **Separate navigation component**: Unnecessary complexity for simple navigation
- **Breadcrumb navigation**: Overkill for two-page navigation

## 7. Error Handling for Event Access

### Decision: Consistent error messages with appropriate HTTP status codes

**Rationale**:
- Clear error messages improve user experience
- Appropriate HTTP status codes (404 for not found, 403 for forbidden, 401 for unauthorized)
- Error boundaries for React component errors
- Graceful degradation when event data unavailable

**Error Scenarios**:
- **Event not found (404)**: "Event not found. Please check the event ID."
- **Unauthorized access (401)**: Redirect to authentication page (handled by ProtectedRoute)
- **Forbidden access (403)**: "You don't have permission to access this page." (for admin routes)
- **Network error**: "Unable to load event. Please check your connection and try again."
- **Server error (500)**: "Server error. Please try again later."

**Implementation Pattern**:
```javascript
// EventPage.jsx
function EventPage() {
  const { eventId } = useParams();
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await apiClient.getEvent(eventId);
        setEvent(data);
        setError(null);
      } catch (err) {
        if (err.status === 404) {
          setError('Event not found. Please check the event ID.');
        } else if (err.status === 401) {
          // Handled by ProtectedRoute
        } else {
          setError('Unable to load event. Please try again.');
        }
      }
    };

    fetchEvent();
  }, [eventId]);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!event) {
    return <LoadingIndicator />;
  }

  return <EventContent event={event} />;
}
```

**Alternatives Considered**:
- **Generic error messages**: Less helpful, doesn't guide user to resolution
- **Technical error details**: Reveals system internals, security concern

## 8. Loading States

### Decision: Skeleton screens or spinner with clear loading indicators

**Rationale**:
- Provides clear feedback during data fetching
- Skeleton screens improve perceived performance
- Consistent with existing loading patterns in the application

**Implementation Pattern**:
```javascript
// EventPage.jsx
function EventPage() {
  const { event, isLoading } = useEvent(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading event...</span>
      </div>
    );
  }

  return <EventContent event={event} />;
}
```

**Alternatives Considered**:
- **Blank state**: Feels broken, poor UX
- **No loading indicator**: Users don't know if page is loading or broken
