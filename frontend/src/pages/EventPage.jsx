import { useEventContext } from '@/contexts/EventContext';
import { usePIN } from '@/contexts/PINContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import apiClient from '@/services/apiClient';

/**
 * EventPage Component
 * 
 * Displays the main event page where users can view event details
 * and participate in rating items.
 * 
 * Features:
 * - Displays event data from context (provided by EventRouteWrapper)
 * - Polls for event state updates
 * - Shows loading state while fetching
 * - Handles error states (404, network errors)
 * - Displays event information (name, state, typeOfItem)
 * - Validates event state before allowing actions
 */
function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event: contextEvent, isAdmin } = useEventContext();
  const { pinVerified, sessionId } = usePIN();
  
  // Check authentication synchronously before any API calls
  const jwtToken = apiClient.getJWTToken();
  const pinSession = eventId ? apiClient.getPINSessionId(eventId) : null;
  const hasAuth = !!(jwtToken || pinSession || pinVerified);
  
  const [event, setEvent] = useState(contextEvent);
  const [isLoading, setIsLoading] = useState(!contextEvent);
  const [error, setError] = useState(null);
  const loadStartTimeRef = useRef(null);

  // Redirect to PIN entry if no authentication - must happen immediately
  // Use a ref to track if we've already checked to avoid multiple redirects
  const redirectCheckedRef = useRef(false);
  
  useEffect(() => {
    if (!eventId || redirectCheckedRef.current) return;
    
    const currentJwtToken = apiClient.getJWTToken();
    const currentPinSession = apiClient.getPINSessionId(eventId);
    
    // If no JWT token and no PIN session, redirect to PIN entry immediately
    if (!currentJwtToken && !currentPinSession && !pinVerified) {
      redirectCheckedRef.current = true;
      navigate(`/event/${eventId}/pin`, { replace: true });
      return;
    }
    
    redirectCheckedRef.current = true;
  }, [eventId, navigate, pinVerified]);

  // Only start polling if we have authentication - pass null to prevent fetching
  // Wait for redirect check to complete before starting polling
  const { event: polledEvent, refetch } = useEventPolling(
    hasAuth && redirectCheckedRef.current ? eventId : null
  );

  // Handle invalid PIN sessions - clear session and redirect if API returns 401
  useEffect(() => {
    if (error && error.includes('PIN verification') || error?.includes('401')) {
      // Clear invalid PIN session
      if (eventId) {
        localStorage.removeItem(`pin:session:${eventId}`);
        navigate(`/event/${eventId}/pin`, { replace: true });
      }
    }
  }, [error, eventId, navigate]);

  // Performance monitoring: track page load time
  useEffect(() => {
    if (!loadStartTimeRef.current) {
      loadStartTimeRef.current = performance.now();
    }
    
    if (event && !isLoading) {
      const loadTime = performance.now() - loadStartTimeRef.current;
      if (loadTime > 2000) {
        console.warn(`Event page load time: ${loadTime.toFixed(2)}ms (exceeds 2s target)`);
      } else {
        console.log(`Event page load time: ${loadTime.toFixed(2)}ms`);
      }
    }
  }, [event, isLoading]);

  // Update event when context or polling updates
  useEffect(() => {
    if (polledEvent) {
      setEvent(polledEvent);
      setIsLoading(false);
      setError(null);
    } else if (contextEvent) {
      setEvent(contextEvent);
      setIsLoading(false);
      setError(null);
    }
  }, [contextEvent, polledEvent]);

  // Validate event state before allowing actions (e.g., rating)
  const validateEventState = (action) => {
    if (!event) {
      return { valid: false, error: 'Event data not available' };
    }

    if (event.state === 'paused') {
      return { valid: false, error: 'Event is paused. Rating is not available.' };
    }

    if (event.state === 'finished') {
      return { valid: false, error: 'Event has finished. Rating is no longer available.' };
    }

    if (event.state === 'created') {
      // Event is in created state - rating might not be available yet
      // This is a placeholder for future rating functionality
      return { valid: true };
    }

    return { valid: true };
  };

  // Handle action attempts (placeholder for future rating functionality)
  const handleActionAttempt = async (action) => {
    // Refetch to ensure we have latest state
    await refetch();
    
    const validation = validateEventState(action);
    if (!validation.valid) {
      setError(validation.error);
      return false;
    }

    return true;
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-muted-foreground">Loading event...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !event) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">
              {error.includes('not found') || error.includes('Event not found')
                ? 'Event not found. Please check the event ID.'
                : 'Unable to load event. Please check your connection and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Event data loaded
  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">No event data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-md mx-auto w-full">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <p className="mt-1 capitalize">{event.typeOfItem}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="mt-1 capitalize">{event.state}</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  {error}
                </p>
              </div>
            )}

            {event.state === 'paused' && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  This event is currently paused. Rating is not available.
                </p>
              </div>
            )}

            {event.state === 'finished' && (
              <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This event has finished. Rating is no longer available.
                </p>
              </div>
            )}
          </div>

          {/* Placeholder for rating functionality - out of scope for this feature */}
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground text-center">
              Rating functionality will be implemented in a future feature.
            </p>
            {/* When rating is implemented, use handleActionAttempt to validate state */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventPage;
