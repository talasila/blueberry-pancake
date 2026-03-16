import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import apiClient from '@/services/apiClient';
import useEvent from '@/hooks/useEvent';
import { isUserAdmin } from '@/utils/adminCheck';
import RouteGuard from './RouteGuard';

/**
 * DashboardRoute Component
 *
 * Protects dashboard route based on user role and event state.
 * - Administrators can access at any time, regardless of event state
 * - Regular users can only access when event is in "completed" state
 * - Redirects to event main page if access denied
 * - Shows loading state while checking
 */
function DashboardRoute({ children }) {
  const { eventId } = useParams();
  const { event, isLoading: eventLoading } = useEvent();

  const checkPermission = useCallback(() => {
    if (eventLoading) {
      return new Promise(() => {});
    }

    if (!event) {
      return { allowed: false, redirectTo: `/event/${eventId}` };
    }

    const userEmail = apiClient.getUserEmail();
    const allowed = isUserAdmin(userEmail, event) || event.state === 'completed';
    return { allowed, redirectTo: `/event/${eventId}` };
  }, [event, eventLoading, eventId]);

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

export default DashboardRoute;
