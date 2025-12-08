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
    // Check if token exists and is valid
    const token = apiClient.getJWTToken();
    
    if (token) {
      // Token exists - verify it's not expired by checking if it's a valid JWT format
      // Full validation happens on backend, but we can check basic format here
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          // Basic JWT format check - decode payload to check expiration
          const payload = JSON.parse(atob(parts[1]));
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < now) {
            // Token expired
            apiClient.clearJWTToken();
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
            apiClient.setJWTToken(token); // Ensure it's set in apiClient
          }
        } else {
          // Invalid token format
          apiClient.clearJWTToken();
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Invalid token
        apiClient.clearJWTToken();
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  // Store current location for post-auth redirect
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // User is authenticated, render protected content
  return children;
}

export default ProtectedRoute;
