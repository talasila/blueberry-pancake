import { User } from 'lucide-react';
import Logo from './Logo.jsx';

/**
 * Header Component
 * 
 * A reusable fixed header component that appears at the top of all pages.
 * Features:
 * - Fixed to the top of the viewport
 * - Full width with slightly shaded background
 * - Bottom border with drop shadow
 * - Logo on the left, sign in button on the right
 * 
 * @param {Function} onSignInClick - Callback function for sign in button click
 * @returns {JSX.Element} The header component
 */
function Header({ onSignInClick }) {
  const handleSignInClick = (e) => {
    e.preventDefault();
    if (onSignInClick) {
      onSignInClick(e);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-muted/30 border-b border-border shadow-md">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2">
        <div className="w-full max-w-md flex items-center justify-between">
          <Logo size={32} className="text-foreground" />
          <button
            type="button"
            onClick={handleSignInClick}
            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
