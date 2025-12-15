import { Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import useEvent from '@/hooks/useEvent';

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

    // Get user email from JWT token using apiClient utility
    const userEmail = apiClient.getUserEmail()?.toLowerCase();
    let isAdmin = false;
    
    if (userEmail && event.administrators) {
      // Check if user email exists in administrators object (case-insensitive)
      const normalizedUserEmail = userEmail.toLowerCase();
      isAdmin = Object.keys(event.administrators).some(
        adminEmail => adminEmail.toLowerCase() === normalizedUserEmail
      );
    } else if (userEmail && event.administrator) {
      // Fallback: support old administrator field for backward compatibility
      const adminEmail = event.administrator?.toLowerCase();
      isAdmin = userEmail === adminEmail;
    }

    // Access control: Admin OR event completed
    const accessGranted = isAdmin || event.state === 'completed';
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
