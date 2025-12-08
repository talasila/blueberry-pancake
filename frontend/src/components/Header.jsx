import { User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useEventContext } from '@/contexts/EventContext';

/**
 * Header Component
 * 
 * A reusable fixed header component that appears at the top of all pages.
 * Features:
 * - Fixed to the top of the viewport
 * - Full width with slightly shaded background
 * - Bottom border with drop shadow
 * - Logo on the left, event name (when in /event/* routes), sign in button on the right
 * 
 * @param {Function} onSignInClick - Callback function for sign in button click
 * @returns {JSX.Element} The header component
 */
function Header({ onSignInClick }) {
  const location = useLocation();
  const { event } = useEventContext();
  
  // Check if we're in an event route
  const isEventRoute = location.pathname.startsWith('/event/');
  const eventName = event?.name;

  const handleSignInClick = (e) => {
    e.preventDefault();
    if (onSignInClick) {
      onSignInClick(e);
    }
  };

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
          <button
            type="button"
            onClick={handleSignInClick}
            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0"
            aria-label="Sign in"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
