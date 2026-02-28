import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

/**
 * WelcomeBottomSheet — read-only post-creation orientation overlay.
 * Slides up from the bottom to introduce new users to their event setup:
 * what's already configured, how to share with guests, where to customize,
 * and how to start. All actions happen on the admin page itself.
 *
 * Reuses the animation pattern from AdminGuideDrawer.
 */
export default function WelcomeBottomSheet({
  isOpen,
  onDismiss,
  onOpenAdminGuide,
  event,
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const previousOverflowRef = useRef('');
  const hasEventData = event?.pin && event?.ratingConfiguration && event?.itemConfiguration;

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      setIsAnimating(false);
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    }

    setIsAnimating(false);
    document.body.style.overflow = previousOverflowRef.current;
    const unmountTimer = setTimeout(() => setIsMounted(false), 350);
    return () => clearTimeout(unmountTimer);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflowRef.current || '';
    };
  }, []);

  // Browser back button dismissal: push a history entry when open,
  // listen for popstate to dismiss without navigating away.
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ welcomeSheet: true }, '');

    const handlePopState = (e) => {
      if (e.state?.welcomeSheet === undefined) {
        onDismiss();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onDismiss]);

  if (!isMounted) return null;
  if (!hasEventData) return null;

  const activeItemCount =
    event.itemConfiguration.numberOfItems -
    (event.itemConfiguration.excludedItemIds?.length ?? 0);
  const maxRating = event.ratingConfiguration.maxRating;
  const noteHintsEnabled = event.ratingConfiguration.noteSuggestionsEnabled;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onDismiss}
        aria-hidden="true"
        data-testid="welcome-backdrop"
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-h-[85vh] bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${
          isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'
        } ${!isOpen ? 'pointer-events-none' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to your event"
        aria-hidden={!isOpen}
        data-testid="welcome-bottom-sheet"
      >
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Content — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
            <h2 className="text-xl font-bold text-foreground">Your event is ready!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sensible defaults are already in place — here's a quick overview.
            </p>

            {/* What's already set up */}
            <div className="mt-5" data-testid="welcome-defaults">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                What's already set up
              </p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{activeItemCount} wines</span> ready
                  to taste
                </p>
                <p>
                  Rating scale{' '}
                  <span className="font-medium text-foreground">1–{maxRating}</span> with labels
                </p>
                <p>
                  Tasting note hints{' '}
                  <span className="font-medium text-foreground">
                    {noteHintsEnabled ? 'enabled' : 'disabled'}
                  </span>
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                You can adjust wines, ratings, and co-hosts from the <span className="font-medium">Items</span>,{' '}
                <span className="font-medium">Ratings</span>, and{' '}
                <span className="font-medium">Administrators</span> sections on this page.
              </p>
            </div>

            {/* Starting the event */}
            <div className="mt-4" data-testid="welcome-start-info">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                When you're ready
              </p>
              <p className="text-sm text-muted-foreground">
                Head to the <span className="font-medium text-foreground">State</span> section on this page to start your event.
              </p>
            </div>

            {/* Invite guests */}
            <div className="mt-4" data-testid="welcome-sharing">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Invite guests
              </p>
              <p className="text-sm text-muted-foreground">
                Share the event link and PIN{' '}
                <span className="font-mono font-bold text-foreground" data-testid="welcome-pin">{event.pin}</span>{' '}
                with your guests.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-4 flex flex-col gap-2">
            <Button className="w-full" onClick={onDismiss} data-testid="welcome-got-it">
              Got it
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              onClick={onOpenAdminGuide}
              data-testid="welcome-open-guide"
            >
              Show me the setup guide
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
