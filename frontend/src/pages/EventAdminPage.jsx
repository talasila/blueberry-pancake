import { useParams, useNavigate } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * EventAdminPage Component
 * 
 * Displays the admin page for event administration.
 * Only accessible to event administrators.
 * 
 * Features:
 * - Displays event data
 * - Shows loading state while fetching
 * - Handles error states
 * - Placeholder for admin functionality
 */
function EventAdminPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event: contextEvent } = useEventContext();
  const { event: polledEvent } = useEventPolling(eventId);
  const [event, setEvent] = useState(contextEvent);
  const [isLoading, setIsLoading] = useState(!contextEvent);
  const loadStartTimeRef = useRef(null);

  // Performance monitoring: track page load time
  useEffect(() => {
    if (!loadStartTimeRef.current) {
      loadStartTimeRef.current = performance.now();
    }
    
    if (event && !isLoading) {
      const loadTime = performance.now() - loadStartTimeRef.current;
      if (loadTime > 2000) {
        console.warn(`Admin page load time: ${loadTime.toFixed(2)}ms (exceeds 2s target)`);
      } else {
        console.log(`Admin page load time: ${loadTime.toFixed(2)}ms`);
      }
    }
  }, [event, isLoading]);

  // Update event when context or polling updates
  useEffect(() => {
    if (polledEvent) {
      setEvent(polledEvent);
      setIsLoading(false);
    } else if (contextEvent) {
      setEvent(contextEvent);
      setIsLoading(false);
    }
  }, [contextEvent, polledEvent]);

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

  // Event data loaded
  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">
              Event not found. Please check the event ID.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-md mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Event Administration</h1>
            <p className="text-muted-foreground mt-2">
              {event.name} ({event.eventId})
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Event ID</label>
              <p className="mt-1 font-mono text-sm">{event.eventId}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="mt-1">{event.name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <p className="mt-1 capitalize">{event.typeOfItem}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="mt-1 capitalize">{event.state}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Administrator</label>
              <p className="mt-1">{event.administrator}</p>
            </div>
          </div>

          {/* Placeholder for admin functionality - out of scope for this feature */}
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground text-center">
              Admin functionality (event state management, participant management, etc.) will be implemented in future features.
            </p>
          </div>

          {/* Navigation back to event main page */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate(`/event/${eventId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Back to event page"
              type="button"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventAdminPage;
