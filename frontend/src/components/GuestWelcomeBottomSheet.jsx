import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * GuestWelcomeBottomSheet — one-time post-login orientation overlay for guests.
 * Slides up after PIN verification to introduce item registration:
 * why it's useful, that it's optional, and how to get started.
 *
 * Reuses the animation pattern from WelcomeBottomSheet (admin counterpart).
 */
export default function GuestWelcomeBottomSheet({
  isOpen,
  onDismiss,
  onRegister,
  event,
  hasItems = false,
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const previousOverflowRef = useRef('');
  const { singular, singularLower, plural } = useItemTerminology(event);

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

  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ guestWelcomeSheet: true }, '');

    const handlePopState = (e) => {
      if (e.state?.guestWelcomeSheet === undefined) {
        onDismiss();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onDismiss]);

  if (!isMounted) return null;
  if (!event) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onDismiss}
        aria-hidden="true"
        data-testid="guest-welcome-backdrop"
      />

      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)] bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${
          isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'
        } ${!isOpen ? 'pointer-events-none' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Welcome to ${event.name}`}
        aria-hidden={!isOpen}
        data-testid="guest-welcome-bottom-sheet"
      >
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
          <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
            <h2 className="text-xl font-bold text-foreground">
              Welcome to {event.name}!
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Brought {/^[aeiou]/i.test(singularLower) ? 'an' : 'a'} {singularLower} to share?
              You can register it so the host can map it to a tasting number.
            </p>

            <div className="mt-5" data-testid="guest-welcome-why-register">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Why register?
              </p>
              <p className="text-sm text-muted-foreground">
                When results are announced, registered items are revealed with
                their name and who brought them — so everyone knows what they were tasting.
              </p>
            </div>

            <div className="mt-4" data-testid="guest-welcome-good-to-know">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Good to know
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>
                  Registration is{' '}
                  <span className="font-medium text-foreground">optional</span>{' '}
                  — you can rate without registering anything
                </li>
                <li>
                  You can register{' '}
                  <span className="font-medium text-foreground">
                    more than one
                  </span>{' '}
                  {singularLower}
                </li>
                <li>
                  If your group brought one {singularLower},{' '}
                  <span className="font-medium text-foreground">
                    only one person
                  </span>{' '}
                  needs to register it
                </li>
                <li>
                  You can register at{' '}
                  <span className="font-medium text-foreground">any time</span>{' '}
                  until the host pauses the event
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t px-5 py-4 flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={onRegister}
              data-testid="guest-welcome-register-btn"
            >
              {hasItems ? `View My ${plural}` : `Register My ${singular}`}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              onClick={onDismiss}
              data-testid="guest-welcome-skip-btn"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
