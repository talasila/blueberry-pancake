import { Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import useEvent from '@/hooks/useEvent';
import { isUserAdmin } from '@/utils/adminCheck';

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
  const [hasAccess, setHasAccess] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (eventLoading) {
      setIsChecking(true);
      return;
    }

    if (!event) {
      setHasAccess(false);
      setIsChecking(false);
      return;
    }

    const userEmail = apiClient.getUserEmail();
    const accessGranted = isUserAdmin(userEmail, event) || event.state === 'completed';
    setHasAccess(accessGranted);
    setIsChecking(false);
  }, [event, eventLoading]);

  // Show loading state while checking
  if (isChecking || eventLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-muted-foreground">Checking permissions...</div>
        </div>
      </div>
    );
  }

  // Redirect to event main page if access denied
  if (!hasAccess) {
    return <Navigate to={`/event/${eventId}`} replace />;
  }

  // User has access, render protected content
  return children;
}

export default DashboardRoute;
