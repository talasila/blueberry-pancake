import { Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import useEvent from '@/hooks/useEvent';

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
  const [isAdmin, setIsAdmin] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (eventLoading) {
      setIsChecking(true);
      return;
    }

    if (!event) {
      setIsAdmin(false);
      setIsChecking(false);
      return;
    }

    // Get user email from JWT token using apiClient utility
    const userEmail = apiClient.getUserEmail()?.toLowerCase();
    let isAdministrator = false;
    
    if (userEmail && event.administrators) {
      // Check if user email exists in administrators object (case-insensitive)
      const normalizedUserEmail = userEmail.toLowerCase();
      isAdministrator = Object.keys(event.administrators).some(
        adminEmail => adminEmail.toLowerCase() === normalizedUserEmail
      );
    } else if (userEmail && event.administrator) {
      // Fallback: support old administrator field for backward compatibility
      const adminEmail = event.administrator?.toLowerCase();
      isAdministrator = userEmail === adminEmail;
    }

    setIsAdmin(isAdministrator);
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

  // Redirect to event main page if not administrator
  if (!isAdmin) {
    return <Navigate to={`/event/${eventId}`} replace />;
  }

  // User is administrator, render protected content
  return children;
}

export default AdminRoute;
