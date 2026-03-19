import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BottomSheetPicker — reusable slide-up panel.
 * Extracted from the pattern used across ItemDetailsDrawer, WelcomeBottomSheet, etc.
 *
 * @param {object}      props
 * @param {boolean}     props.isOpen    - Controls visibility
 * @param {function}    props.onClose   - Close handler (backdrop tap)
 * @param {string}      [props.title]   - Header text
 * @param {React.ReactNode} props.children - Content rendered inside the sheet
 */
export default function BottomSheetPicker({ isOpen, onClose, title, children }) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    }
    setIsAnimating(false);
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={handleBackdropClick}
        aria-hidden="true"
        data-testid="bottom-sheet-backdrop"
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 max-h-[calc(100dvh-60px)]',
          'bg-background shadow-xl z-50 rounded-t-2xl',
          'transform transition-transform duration-300 ease-out',
          isAnimating ? 'translate-y-0' : 'translate-y-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        data-testid="bottom-sheet"
      >
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 pb-2 border-b flex-shrink-0">
              <h3 className="text-sm font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
