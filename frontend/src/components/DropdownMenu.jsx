import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * DropdownMenu Component
 * Simple dropdown menu for mobile-friendly header menu
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether menu is open
 * @param {function} props.onClose - Close handler
 * @param {React.ReactNode} props.trigger - Trigger element (button/icon)
 * @param {React.ReactNode} props.children - Menu items
 * @param {string} props.align - Alignment: 'left' | 'right' | 'center' (default: 'right')
 */
function DropdownMenu({ isOpen, onClose, trigger, children, align = 'right' }) {
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    // Add event listener after a short delay to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <div ref={triggerRef}>
        {trigger}
      </div>

      {/* Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Menu Content */}
          <div
            ref={menuRef}
            className={`
              absolute top-full mt-2 z-50
              min-w-[200px] bg-background border border-border rounded-md shadow-lg
              py-1
              ${alignClasses[align]}
            `}
            role="menu"
            aria-orientation="vertical"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * DropdownMenuItem Component
 * Individual menu item
 * 
 * @param {object} props
 * @param {function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Item content
 * @param {React.ReactNode} props.icon - Optional icon
 * @param {boolean} props.disabled - Whether item is disabled
 */
export function DropdownMenuItem({ onClick, children, icon, disabled = false }) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-sm
        hover:bg-accent hover:text-accent-foreground
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        min-h-[44px] touch-manipulation
        text-left
      `}
      role="menuitem"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  );
}

export default DropdownMenu;
