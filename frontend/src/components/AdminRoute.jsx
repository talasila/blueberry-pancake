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

    // Extract user email from JWT token
    const getUserEmail = () => {
      try {
        const token = apiClient.getJWTToken();
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            return payload.email?.toLowerCase() || null;
          }
        }
      } catch (error) {
        console.error('Error extracting user email from token:', error);
      }
      return null;
    };

    // Case-insensitive email comparison
    const userEmail = getUserEmail();
    const adminEmail = event.administrator?.toLowerCase();
    const isAdministrator = userEmail && adminEmail && userEmail === adminEmail;

    setIsAdmin(isAdministrator);
    setIsChecking(false);
  }, [event, eventLoading]);

  // Show loading state while checking
  if (isChecking || eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
