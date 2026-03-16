import { useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import apiClient from '@/services/apiClient';
import RouteGuard from './RouteGuard';

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

  const checkPermission = useCallback(() => {
    const authenticated = apiClient.isAuthenticated();
    return { allowed: authenticated, redirectTo: '/auth' };
  }, []);

  return (
    <RouteGuard
      checkPermission={checkPermission}
      redirectTo="/auth"
      loadingText="Loading..."
      navigateState={{ from: location }}
    >
      {children}
    </RouteGuard>
  );
}

export default ProtectedRoute;
