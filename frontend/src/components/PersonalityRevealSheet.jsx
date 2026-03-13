import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PersonalityRevealSheet — one-time celebratory bottom sheet that announces
 * the user has earned a tasting personality. Appears after the rating drawer
 * closes once the user crosses the minimum rating threshold. Tapping "Reveal"
 * dismisses the sheet and opens the My Progress drawer.
 *
 * Follows the GuestWelcomeBottomSheet animation pattern.
 */
export default function PersonalityRevealSheet({ isOpen, onDismiss, onReveal }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const previousOverflowRef = useRef('');

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

    window.history.pushState({ personalityReveal: true }, '');

    const handlePopState = (e) => {
      if (e.state?.personalityReveal === undefined) {
        onDismiss();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onDismiss]);

  if (!isMounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onDismiss}
        aria-hidden="true"
        data-testid="personality-reveal-backdrop"
      />

      <div
        className={`fixed bottom-0 left-0 right-0 w-full bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${
          isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'
        } ${!isOpen ? 'pointer-events-none' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tasting personality earned"
        aria-hidden={!isOpen}
        data-testid="personality-reveal-sheet"
      >
        <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: 'color-mix(in oklch, var(--event-accent) 12%, var(--background))' }}
          >
            <Sparkles className="h-8 w-8" style={{ color: 'var(--event-accent)' }} />
          </div>

          <h2 className="text-lg font-semibold">Your tasting personality is ready</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            You&rsquo;ve tasted enough to have a type.
          </p>

          <Button
            className="w-full mt-6"
            onClick={onReveal}
            data-testid="personality-reveal-btn"
          >
            Reveal My Personality
          </Button>

          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-2 mt-1"
            onClick={onDismiss}
            data-testid="personality-reveal-dismiss-btn"
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}
