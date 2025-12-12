import { X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

/**
 * SideDrawer Component
 * Slide-out drawer that slides in from the right side
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether drawer is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.title - Drawer title
 * @param {React.ReactNode} props.children - Drawer content
 * @param {string} props.width - Drawer width (default: 'w-full max-w-2xl')
 */
function SideDrawer({ 
  isOpen, 
  onClose, 
  title,
  children,
  width = 'w-full max-w-2xl'
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const hasBeenOpenedRef = useRef(false);

  // Track if drawer has ever been opened (for animation)
  useEffect(() => {
    if (isOpen) {
      hasBeenOpenedRef.current = true;
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Always render if drawer has been opened at least once (for proper cleanup)
  if (!isOpen && !hasBeenOpenedRef.current) {
    return null;
  }

  return (
    <>
      {/* Backdrop with fade animation */}
      {isOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-[99] transition-opacity duration-300 ease-in-out"
          onClick={onClose}
          aria-hidden="true"
          style={{ zIndex: 99 }}
        />
      )}
      
      {/* Drawer - slides in from right with animation */}
      {isOpen && (
        <div
          className={`
            fixed top-16 right-0 h-[calc(100vh-4rem)] ${width}
            bg-background shadow-xl z-[100]
            transform transition-transform duration-300 ease-out
            ${isAnimating ? 'translate-x-0' : 'translate-x-full'}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          style={{ zIndex: 100 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header with title and close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 bg-background">
              <h2 id="drawer-title" className="text-lg font-semibold flex-1">
                {title}
              </h2>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                aria-label="Close drawer"
                type="button"
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0 text-foreground"
                style={{ minWidth: '2rem', minHeight: '2rem' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SideDrawer;
