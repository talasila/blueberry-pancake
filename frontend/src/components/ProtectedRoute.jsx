import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';

/**
 * ProtectedRoute Component
 * 
 * Protects routes that require authentication.
 * - Checks for JWT token in localStorage
 * - Redirects to landing page if not authenticated
 * - Stores intended destination for post-auth redirect
 */
function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    setIsAuthenticated(apiClient.isAuthenticated());
  }, []);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  // Store current location for post-auth redirect
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // User is authenticated, render protected content
  return children;
}

export default ProtectedRoute;
