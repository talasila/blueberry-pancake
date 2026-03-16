import { Menu, BottleWine, Package, BarChart3, Settings, LogOut, ArrowLeft, HelpCircle, BookOpen, List, Sun, Moon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import Logo from './Logo.jsx';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';
import apiClient from '@/services/apiClient';
import DropdownMenu, { DropdownMenuItem } from './DropdownMenu';
import { clearAllBookmarks } from '@/utils/bookmarkStorage';
import { StateDot } from '@/utils/eventState.jsx';
import { getPreset } from '@/utils/themePresets';
import useDarkMode from '@/hooks/useDarkMode';

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
function Header({ onToggleGuide, guideVariant, isGuideOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { event, eventId, isAdmin } = useEventContext();
  const { plural } = useItemTerminology(event);
  const [authState, setAuthState] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDark, toggleDark } = useDarkMode();

  const isEventRoute = location.pathname.startsWith('/event/');
  const isSystemRoute = location.pathname.startsWith('/system');
  const isStandalonePage = ['/my-events', '/create-event'].includes(location.pathname);
  const isLandingPage = location.pathname === '/';
  const showHamburgerMenu = authState && !isLandingPage && !isSystemRoute && !isStandalonePage;
  const eventName = event?.name;

  const { logoFill, logoTextFill } = useMemo(() => {
    if (!isEventRoute || !event?.theme || event.theme === 'classic') {
      return isDark
        ? { logoFill: 'white', logoTextFill: 'black' }
        : { logoFill: 'black', logoTextFill: 'white' };
    }
    const preset = getPreset(event.theme);
    return {
      logoFill: isDark ? preset.light.accent : preset.dark.accent,
      logoTextFill: 'white',
    };
  }, [isEventRoute, event?.theme, isDark]);

  // Extract eventId from pathname if not available from context
  const pathEventId = useMemo(() => {
    if (eventId) return eventId;
    const match = location.pathname.match(/^\/event\/([A-Za-z0-9]{8})/);
    return match ? match[1] : null;
  }, [location.pathname, eventId]); // eventId is needed to return it when available

  // Check authentication state and update when location or eventId changes
  useEffect(() => {
    const checkAuth = () => {
      setAuthState(apiClient.isAuthenticated());
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

  const handleMyBottlesClick = () => {
    setIsMenuOpen(false);
    window.dispatchEvent(new CustomEvent('openMyBottles'));
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

  const handleMyEventsClick = () => {
    setIsMenuOpen(false);
    navigate('/my-events');
  };

  const handleGuideClick = () => {
    setIsMenuOpen(false);
    onToggleGuide();
  };

  const handleToggleDarkMode = () => {
    setIsMenuOpen(false);
    toggleDark();
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

  // Menu items defined as a data array for cleaner rendering
  // Each item has a visibility function that receives a context object
  const menuItems = [
    {
      key: 'my-events',
      label: 'My Events',
      icon: <List className="h-4 w-4" />,
      onClick: handleMyEventsClick,
      visible: () => apiClient.getAuthMethod() === 'otp',
    },
    {
      key: 'back-to-event',
      label: 'Back to Event',
      icon: <ArrowLeft className="h-4 w-4" />,
      onClick: handleBackToEventClick,
      visible: (ctx) => !ctx.isMainEventPage && !!ctx.pathEventId,
    },
    {
      key: 'my-bottles',
      label: `My ${plural}`,
      icon: event?.typeOfItem === 'wine' ? <BottleWine className="h-4 w-4" /> : <Package className="h-4 w-4" />,
      onClick: handleMyBottlesClick,
      visible: () => true,
      'data-testid': 'menu-my-bottles',
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: handleDashboardClick,
      visible: (ctx) => ctx.isDashboardAvailable && !!ctx.pathEventId,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      onClick: handleAdminClick,
      visible: (ctx) => ctx.isAdmin && !!ctx.pathEventId,
    },
    {
      key: 'guide',
      label: guideVariant === 'admin' ? 'Admin Guide' : 'Help',
      icon: guideVariant === 'admin' ? <BookOpen className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />,
      onClick: handleGuideClick,
      visible: (ctx) => !!ctx.guideVariant,
    },
    {
      key: 'dark-mode',
      label: isDark ? 'Light Mode' : 'Dark Mode',
      icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onClick: handleToggleDarkMode,
      visible: () => true,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogOut className="h-4 w-4" />,
      onClick: handleLogout,
      visible: () => true,
    },
  ];

  // Context object passed to visibility checks
  const menuCtx = { isMainEventPage, pathEventId, isDashboardAvailable, isAdmin, guideVariant };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[9999] border-b border-border shadow-md${!isEventRoute ? ' bg-background' : ''}`}
      style={{
        width: '100vw',
        marginRight: 'calc(100% - 100vw)',
        backgroundColor: isEventRoute ? 'var(--event-header-bg)' : undefined,
      }}
    >
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
              <Logo size={32} className="text-foreground" circleFill={logoFill} textFill={logoTextFill} />
            </div>
            {isEventRoute && eventName && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {eventName}
                </span>
                {isAdmin && event?.state && (
                  <StateDot state={event.state} />
                )}
              </div>
            )}
          </div>
          {/* Guide icon — shown in header only when hamburger menu is not available */}
          {guideVariant && !showHamburgerMenu && (
            <button
              data-testid="guide-icon"
              onClick={onToggleGuide}
              aria-label={
                isGuideOpen
                  ? guideVariant === 'admin' ? 'Close admin guide' : 'Close hosting guide'
                  : guideVariant === 'admin' ? 'Open admin guide' : 'Open hosting guide'
              }
              className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent transition-colors touch-manipulation"
            >
              {guideVariant === 'admin'
                ? <BookOpen className="h-5 w-5" aria-hidden="true" />
                : <HelpCircle className="h-5 w-5" aria-hidden="true" />
              }
            </button>
          )}
          {/* For system routes and standalone pages: show logout icon only (no menu) */}
          {authState && (isSystemRoute || isStandalonePage) && (
            <div
              onClick={isSystemRoute ? handleRootLogout : handleLogout}
              className="cursor-pointer focus:outline-none flex-shrink-0 flex items-center justify-center touch-manipulation hover:text-primary transition-colors"
              aria-label="Logout"
              title="Logout"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  (isSystemRoute ? handleRootLogout : handleLogout)();
                }
              }}
            >
              <LogOut className="h-5 w-5" />
            </div>
          )}
          {showHamburgerMenu && (
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
              {menuItems
                .filter((item) => item.visible(menuCtx))
                .map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={item.onClick}
                    icon={item.icon}
                    data-testid={item['data-testid']}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
