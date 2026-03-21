import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CalendarDays, Wine, Timer, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventContext } from '@/contexts/EventContext';
import { eventGuideSteps, phases, getStepVisualState } from '@/data/eventGuideContent';
import GuideStepCard from './GuideStepCard';

const PHASE_ICONS = {
  'before-event': CalendarDays,
  'event-day-setup': Wine,
  'during-tasting': Timer,
  'the-reveal': PartyPopper,
};

/**
 * EventGuideDrawer — unified bottom-sheet overlay showing the full 11-step
 * blind tasting journey as a vertical timeline. Steps are grouped by phase
 * with visual section headers. Each step renders in done / now / ahead
 * visual state based on event lifecycle. Auto-scrolls to the first "now"
 * step on open.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 */
export default function EventGuideDrawer({ isOpen, onClose }) {
  const { event } = useEventContext();
  const eventState = event?.state;

  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});
  const previousOverflowRef = useRef('');
  const scrollContainerRef = useRef(null);
  const firstNowRef = useRef(null);

  // ── Mount / unmount animation (matches existing drawer pattern) ────
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

  // Restore body scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflowRef.current || '';
    };
  }, []);

  // ── Reset expand state + auto-scroll on each open ──────────────────
  useEffect(() => {
    if (!isOpen || !eventState) return;

    // Reset to defaults: now=expanded, done/ahead=collapsed
    const defaults = {};
    for (const step of eventGuideSteps) {
      const vs = getStepVisualState(eventState, step.position);
      defaults[step.id] = vs === 'now';
    }
    setExpandedSteps(defaults);

    // Auto-scroll to first "now" step after animation settles
    const scrollTimer = setTimeout(() => {
      if (firstNowRef.current) {
        firstNowRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 350);

    return () => clearTimeout(scrollTimer);
  }, [isOpen, eventState]);

  // ── Keyboard: Escape to close ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const toggleStep = useCallback((stepId) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  if (!isMounted) return null;

  // Track whether the first "now" ref has been assigned
  let firstNowAssigned = false;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
        aria-hidden="true"
        data-testid="event-guide-backdrop"
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)] bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'} ${!isOpen ? 'pointer-events-none' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Event guide"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 rounded-t-lg"
            style={{ backgroundColor: 'var(--event-header-bg)' }}
          >
            <h2 className="text-base font-semibold">Event Guide</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
              aria-label="Close guide"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable timeline */}
          <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
            <div className="py-3 px-3">
              {phases.map((phase) => {
                const PhaseIcon = PHASE_ICONS[phase.id];
                const phaseSteps = eventGuideSteps.filter(
                  (s) => s.position >= phase.stepRange[0] && s.position <= phase.stepRange[1],
                );

                return (
                  <div key={phase.id} className="mb-1">
                    {/* Phase section header */}
                    <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2 mb-2">
                      {PhaseIcon && (
                        <PhaseIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {phase.label}
                      </h3>
                    </div>

                    {/* Timeline steps */}
                    <div className="pl-2">
                      {phaseSteps.map((step, idx) => {
                        const vs = eventState
                          ? getStepVisualState(eventState, step.position)
                          : 'ahead';
                        const isLast = idx === phaseSteps.length - 1;

                        // Assign ref to first "now" step for auto-scroll
                        const isFirstNow = vs === 'now' && !firstNowAssigned;
                        if (isFirstNow) firstNowAssigned = true;

                        return (
                          <div
                            key={step.id}
                            ref={isFirstNow ? firstNowRef : undefined}
                          >
                            <GuideStepCard
                              step={step}
                              isExpanded={!!expandedSteps[step.id]}
                              onToggle={() => toggleStep(step.id)}
                              visualState={vs}
                              isLastInPhase={isLast}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
