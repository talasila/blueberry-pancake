import { useState, useEffect, useRef, useCallback } from 'react';
import { X, List, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventContext } from '@/contexts/EventContext';
import { adminGuideContent } from '@/data/adminGuideContent';
import { getStateConfig } from '@/utils/eventState.jsx';
import GuideStepCard from './GuideStepCard';
import GuideProgress from './GuideProgress';
import GuideNavigation from './GuideNavigation';
import WalkthroughDrawer from './WalkthroughDrawer';

const STATE_LABELS = {
  created: 'Setup Guide',
  started: 'Tasting Guide',
  paused: 'Reveal Guide',
  completed: 'Results Guide',
};

const CTA_MESSAGES = {
  created:
    'Use the "Start Tasting" button on the progress stepper above to kick things off.',
  started:
    'Use "Pause for Reveal" or "Complete Event" on the progress stepper above when everyone is done.',
  paused:
    'Use "Resume Tasting" or "Announce Results" on the progress stepper above when you\'re ready.',
  completed:
    'You can reopen via the progress stepper, or export your data from the admin page.',
};

/**
 * AdminGuideDrawer — state-aware bottom sheet overlay for the admin guide.
 * Reads event.state from EventContext and displays appropriate step content.
 * Reuses GuideStepCard, GuideProgress, and GuideNavigation from the hosting guide.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 */
export default function AdminGuideDrawer({ isOpen, onClose }) {
  const { event } = useEventContext();
  const eventState = event?.state;
  const steps = adminGuideContent[eventState] || [];
  const totalSteps = steps.length;

  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const previousOverflowRef = useRef('');

  const isLastStep = currentStep === totalSteps - 1;

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

  // Restore body scroll on unmount (e.g., navigating away while guide is open)
  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflowRef.current || '';
    };
  }, []);

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    setShowOverview(false);
    onClose();
  }, [onClose]);

  const handlePrev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((s) => Math.min(totalSteps - 1, s + 1));
  }, [totalSteps]);

  const handleOverviewJump = useCallback((index) => {
    setCurrentStep(index);
    setShowOverview(false);
  }, []);

  // Reset step when state changes (e.g., another admin transitions the event)
  useEffect(() => {
    setCurrentStep(0);
    setShowOverview(false);
  }, [eventState]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (showOverview) return;
      if (e.key === 'ArrowRight' && currentStep < totalSteps - 1) handleNext();
      if (e.key === 'ArrowLeft' && currentStep > 0) handlePrev();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showOverview, currentStep, totalSteps, handleClose, handleNext, handlePrev]);

  if (!isMounted) return null;

  const stateConfig = eventState ? getStateConfig(eventState) : null;
  const headerTitle = showOverview
    ? 'All Steps'
    : STATE_LABELS[eventState] || 'Admin Guide';

  if (!eventState || steps.length === 0) {
    return (
      <>
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={handleClose}
          aria-hidden="true"
        />
        <div
          className={`fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)] bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'} ${!isOpen ? 'pointer-events-none' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Admin guide"
          aria-hidden={!isOpen}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b rounded-t-lg" style={{ backgroundColor: 'var(--event-header-bg)' }}>
            <h2 className="text-base font-semibold">Admin Guide</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose} aria-label="Close guide">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Loading event data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
        aria-hidden="true"
        data-testid="admin-guide-backdrop"
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)] bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'} ${!isOpen ? 'pointer-events-none' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Admin guide"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 rounded-t-lg" style={{ backgroundColor: 'var(--event-header-bg)' }}>
            <div className="flex items-center gap-2">
              {showOverview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowOverview(false)}
                  aria-label="Back to step"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-base font-semibold">{headerTitle}</h2>
              {stateConfig && !showOverview && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stateConfig.className}`}>
                  {stateConfig.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!showOverview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowOverview(true)}
                  aria-label="Show overview"
                >
                  <List className="h-4 w-4" />
                </Button>
              )}
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
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Overview / table of contents */}
            {showOverview && (
              <nav aria-label="Guide steps overview" className="flex flex-col gap-1 p-4">
                {steps.map((step, i) => (
                  <button
                    key={step.id}
                    onClick={() => handleOverviewJump(i)}
                    aria-current={i === currentStep ? 'step' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors hover:bg-accent ${
                      i === currentStep
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-foreground'
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    {step.heading}
                  </button>
                ))}
              </nav>
            )}

            {/* Step card view */}
            {!showOverview && (
              <>
                <GuideNavigation
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  onPrev={handlePrev}
                  onNext={handleNext}
                >
                  <GuideStepCard step={steps[currentStep]} />
                </GuideNavigation>

                <div className="px-4 pb-4">
                  <GuideProgress currentStep={currentStep} totalSteps={totalSteps} />
                </div>

                {/* Full walkthrough link on the overview step */}
                {currentStep === 0 && eventState === 'created' && (
                  <div className="px-6 pb-4 text-center">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline font-medium"
                      onClick={() => setWalkthroughOpen(true)}
                    >
                      See the full walkthrough
                    </button>
                  </div>
                )}

                {/* Informational CTA on last step */}
                {isLastStep && CTA_MESSAGES[eventState] && (
                  <div className="px-6 pb-6">
                    <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
                      {CTA_MESSAGES[eventState]}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <WalkthroughDrawer
        isOpen={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
      />
    </>
  );
}
