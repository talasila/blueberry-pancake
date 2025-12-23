import { Menu, User, BarChart3, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import Logo from './Logo.jsx';
import { useEventContext } from '@/contexts/EventContext';
import apiClient from '@/services/apiClient';
import DropdownMenu, { DropdownMenuItem } from './DropdownMenu';
import { clearAllBookmarks } from '@/utils/bookmarkStorage';
import { StateIcon } from '@/utils/eventState.jsx';

/**
 * Header Component
 * 
 * A reusable fixed header component that appears at the top of all pages.
 * Features:
 * - Fixed to the top of the viewport
 * - Full width with slightly shaded background
 * - Bottom border with drop shadow
 * - Logo on the left, event name (when in /event/* routes), profile link on the right (when authenticated)
 * - For /system/* routes: shows logout icon instead of menu (root users)
 * 
 * @returns {JSX.Element} The header component
 */
function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { event, eventId, isAdmin } = useEventContext();
  const [authState, setAuthState] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Check if we're in an event route or system route
  const isEventRoute = location.pathname.startsWith('/event/');
  const isSystemRoute = location.pathname.startsWith('/system');
  const isLandingPage = location.pathname === '/';
  const eventName = event?.name;

  // Extract eventId from pathname if not available from context
  const pathEventId = useMemo(() => {
    if (eventId) return eventId;
    const match = location.pathname.match(/^\/event\/([A-Za-z0-9]{8})/);
    return match ? match[1] : null;
  }, [location.pathname, eventId]); // eventId is needed to return it when available

  // Check authentication state and update when location or eventId changes
  useEffect(() => {
    const checkAuth = () => {
      // Check for JWT token
      const jwtToken = apiClient.getJWTToken();
      setAuthState(!!jwtToken);
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
  }, [location.pathname]); // isEventRoute and pathEventId are derived from location.pathname

  // Determine profile link path
  const profilePath = useMemo(() => {
    if (isEventRoute && pathEventId) {
      return `/event/${pathEventId}/profile`;
    }
    // For non-event routes, use a general profile path
    // This could be expanded later for global user profiles
    return '/profile';
  }, [isEventRoute, pathEventId]);

  // Check if dashboard is available
  const isDashboardAvailable = useMemo(() => {
    if (!isEventRoute || !event) return false;
    return isAdmin || event.state === 'completed';
  }, [isEventRoute, event, isAdmin]);

  // Check if we're on the main event page (not on profile, dashboard, or admin)
  const isMainEventPage = useMemo(() => {
    if (!isEventRoute || !pathEventId) return false;
    // Main event page is exactly /event/:eventId (no additional path segments)
    const pathMatch = location.pathname.match(/^\/event\/([A-Za-z0-9]{8})$/);
    return !!pathMatch && pathMatch[1] === pathEventId;
  }, [location.pathname, isEventRoute, pathEventId]);

  // Handle menu item clicks
  const handleBackToEventClick = () => {
    if (pathEventId) {
      setIsMenuOpen(false);
      navigate(`/event/${pathEventId}`);
    }
  };

  const handleProfileClick = () => {
    setIsMenuOpen(false);
    navigate(profilePath);
  };

  const handleDashboardClick = () => {
    if (pathEventId && isDashboardAvailable) {
      setIsMenuOpen(false);
      navigate(`/event/${pathEventId}/dashboard`);
    }
  };

  const handleAdminClick = () => {
    if (pathEventId && isAdmin) {
      setIsMenuOpen(false);
      navigate(`/event/${pathEventId}/admin`);
    }
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    
    // Clear JWT token (also calls logout endpoint to clear httpOnly cookie)
    await apiClient.clearJWTToken();
    
    // Clear email from sessionStorage for current event if it exists
    if (pathEventId) {
      sessionStorage.removeItem(`event:${pathEventId}:email`);
    }
    
    // Clear all bookmarks from sessionStorage
    clearAllBookmarks();
    
    // Navigate to landing page
    navigate('/', { replace: true });
  };

  // Handle root admin logout - redirects to /system/login for re-login
  const handleRootLogout = async () => {
    // Clear JWT token (also calls logout endpoint to clear httpOnly cookie)
    await apiClient.clearJWTToken();
    
    // Clear all bookmarks from sessionStorage
    clearAllBookmarks();
    
    // Navigate to system login page
    navigate('/system/login', { replace: true });
  };

  // Handle logo click - navigate to main event page if logged in, else landing page
  const handleLogoClick = () => {
    if (authState) {
      // If logged in and we have an eventId, navigate to main event page
      const currentEventId = eventId || pathEventId;
      if (currentEventId) {
        navigate(`/event/${currentEventId}`);
      } else {
        // If logged in but no eventId, go to landing page
        navigate('/');
      }
    } else {
      // If not logged in, go to landing page
      navigate('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] bg-background border-b border-border shadow-md" style={{ width: '100vw', marginRight: 'calc(100% - 100vw)' }}>
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2">
        <div className="w-full max-w-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              onClick={handleLogoClick}
              className="flex-shrink-0 cursor-pointer focus:outline-none touch-manipulation"
              aria-label="Go to main event page"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLogoClick();
                }
              }}
            >
              <Logo size={32} className="text-foreground" />
            </div>
            {isEventRoute && eventName && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {eventName}
                </span>
                {isAdmin && event?.state && (
                  <StateIcon state={event.state} className="flex-shrink-0" />
                )}
              </div>
            )}
          </div>
          {/* For system routes: show logout icon only (no menu) */}
          {authState && isSystemRoute && (
            <div
              onClick={handleRootLogout}
              className="cursor-pointer focus:outline-none flex-shrink-0 flex items-center justify-center touch-manipulation hover:text-primary transition-colors"
              aria-label="Logout"
              title="Logout"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRootLogout();
                }
              }}
            >
              <LogOut className="h-5 w-5" />
            </div>
          )}
          {/* Show menu only if authenticated, not on landing page, and not on system route */}
          {authState && !isLandingPage && !isSystemRoute && (
            <DropdownMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              align="right"
              trigger={
                <div
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="cursor-pointer focus:outline-none flex-shrink-0 flex items-center justify-center touch-manipulation"
                  aria-label="Open menu"
                  aria-expanded={isMenuOpen}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsMenuOpen(!isMenuOpen);
                    }
                  }}
                >
                  <Menu className="h-5 w-5" />
                </div>
              }
            >
              {/* Back to Event - show only if not on main event page */}
              {!isMainEventPage && pathEventId && (
                <DropdownMenuItem
                  onClick={handleBackToEventClick}
                  icon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back to Event
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem
                onClick={handleProfileClick}
                icon={<User className="h-4 w-4" />}
              >
                Profile
              </DropdownMenuItem>
              
              {isDashboardAvailable && pathEventId && (
                <DropdownMenuItem
                  onClick={handleDashboardClick}
                  icon={<BarChart3 className="h-4 w-4" />}
                >
                  Dashboard
                </DropdownMenuItem>
              )}
              
              {isAdmin && pathEventId && (
                <DropdownMenuItem
                  onClick={handleAdminClick}
                  icon={<Settings className="h-4 w-4" />}
                >
                  Settings
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem
                onClick={handleLogout}
                icon={<LogOut className="h-4 w-4" />}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
