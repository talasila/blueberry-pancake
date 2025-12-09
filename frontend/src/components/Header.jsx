import { User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import Logo from './Logo.jsx';
import { useEventContext } from '@/contexts/EventContext';
import apiClient from '@/services/apiClient';

/**
 * Header Component
 * 
 * A reusable fixed header component that appears at the top of all pages.
 * Features:
 * - Fixed to the top of the viewport
 * - Full width with slightly shaded background
 * - Bottom border with drop shadow
 * - Logo on the left, event name (when in /event/* routes), profile link on the right (when authenticated)
 * 
 * @returns {JSX.Element} The header component
 */
function Header() {
  const location = useLocation();
  const { event, eventId } = useEventContext();
  const [authState, setAuthState] = useState(false);
  
  // Check if we're in an event route
  const isEventRoute = location.pathname.startsWith('/event/');
  const isLandingPage = location.pathname === '/';
  const eventName = event?.name;

  // Extract eventId from pathname if not available from context
  const pathEventId = useMemo(() => {
    if (eventId) return eventId;
    const match = location.pathname.match(/^\/event\/([A-Za-z0-9]{8})/);
    return match ? match[1] : null;
  }, [location.pathname, eventId]);

  // Check authentication state and update when location or eventId changes
  useEffect(() => {
    const checkAuth = () => {
      // Check for JWT token (admin or OTP-authenticated user)
      const jwtToken = apiClient.getJWTToken();
      if (jwtToken) {
        setAuthState(true);
        return;
      }
      
      // Check for PIN session if on an event route
      if (isEventRoute && pathEventId) {
        const pinSession = apiClient.getPINSessionId(pathEventId);
        setAuthState(!!pinSession);
        return;
      }
      
      setAuthState(false);
    };

    checkAuth();
    
    // Also check on storage events (when localStorage changes)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [location.pathname, isEventRoute, pathEventId]);

  // Determine profile link path
  const profilePath = useMemo(() => {
    if (isEventRoute && pathEventId) {
      return `/event/${pathEventId}/profile`;
    }
    // For non-event routes, use a general profile path
    // This could be expanded later for global user profiles
    return '/profile';
  }, [isEventRoute, pathEventId]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] bg-background border-b border-border shadow-md" style={{ width: '100vw', marginRight: 'calc(100% - 100vw)' }}>
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2">
        <div className="w-full max-w-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Logo size={32} className="text-foreground flex-shrink-0" />
            {isEventRoute && eventName && (
              <span className="text-sm font-medium truncate max-w-[200px]">
                {eventName}
              </span>
            )}
          </div>
          {/* Show profile link only if authenticated and not on landing page */}
          {authState && !isLandingPage && (
            <Link
              to={profilePath}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0"
              aria-label="View profile"
            >
              <User className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
