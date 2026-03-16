import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import apiClient from '@/services/apiClient';
import useEvent from '@/hooks/useEvent';
import { isUserAdmin } from '@/utils/adminCheck';
import RouteGuard from './RouteGuard';

/**
 * AdminRoute Component
 *
 * Protects routes that require event administrator access.
 * - Checks if user is the event administrator
 * - Uses case-insensitive email comparison
 * - Redirects to event main page if not administrator
 * - Shows loading state while checking
 */
function AdminRoute({ children }) {
  const { eventId } = useParams();
  const { event, isLoading: eventLoading } = useEvent();

  const checkPermission = useCallback(() => {
    if (eventLoading) {
      // Return a promise that never resolves while still loading
      // RouteGuard will re-run when eventLoading changes
      return new Promise(() => {});
    }

    if (!event) {
      return { allowed: false, redirectTo: `/event/${eventId}` };
    }

    const userEmail = apiClient.getUserEmail();
    const allowed = isUserAdmin(userEmail, event);
    return { allowed, redirectTo: `/event/${eventId}` };
  }, [event, eventLoading, eventId]);

  // While event is loading, show the spinner directly
  // (RouteGuard would also show it, but we want to ensure the loading state
  // is shown even before checkPermission can resolve)
  if (eventLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-muted-foreground">Checking permissions...</div>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard
      checkPermission={checkPermission}
      redirectTo={`/event/${eventId}`}
      loadingText="Checking permissions..."
      showSpinner
    >
      {children}
    </RouteGuard>
  );
}

export default AdminRoute;
