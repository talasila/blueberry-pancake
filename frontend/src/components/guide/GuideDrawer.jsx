import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, List, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/apiClient';
import { guideContent } from '@/data/guideContent';
import GuideRoleSelect from './GuideRoleSelect';
import GuideStepCard from './GuideStepCard';
import GuideProgress from './GuideProgress';
import GuideNavigation from './GuideNavigation';

/**
 * GuideDrawer — bottom sheet overlay for the hosting guide.
 * Manages role selection, step navigation, overview, and contextual CTAs.
 * Follows RatingDrawer.jsx animation pattern (isAnimating + 10ms delay).
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 */
export default function GuideDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const previousOverflowRef = useRef('');

  const steps = selectedRole ? guideContent[selectedRole] : [];
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  // Mount/unmount and animation lifecycle
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
    // Unmount after close animation finishes
    const unmountTimer = setTimeout(() => setIsMounted(false), 350);
    return () => clearTimeout(unmountTimer);
  }, [isOpen]);

  // Reset state when drawer closes
  const handleClose = useCallback(() => {
    setSelectedRole(null);
    setCurrentStep(0);
    setShowOverview(false);
    onClose();
  }, [onClose]);

  const handleSelectRole = useCallback((role) => {
    setSelectedRole(role);
    setCurrentStep(0);
    setShowOverview(false);
  }, []);

  const handleChangeRole = useCallback(() => {
    setSelectedRole(null);
    setCurrentStep(0);
    setShowOverview(false);
  }, []);

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

  const handleCTA = useCallback(() => {
    handleClose();
    if (selectedRole === 'host') {
      navigate(apiClient.isAuthenticated() ? '/create-event' : '/auth');
    }
  }, [selectedRole, navigate, handleClose]);

  // Keyboard navigation: Escape to close, ArrowLeft/Right for steps
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (!selectedRole || showOverview) return;
      if (e.key === 'ArrowRight' && currentStep < totalSteps - 1) handleNext();
      if (e.key === 'ArrowLeft' && currentStep > 0) handlePrev();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedRole, showOverview, currentStep, totalSteps, handleClose, handleNext, handlePrev]);

  if (!isMounted) return null;

  // ---------- Header title ----------
  let headerTitle = 'How to Host a Tasting';
  if (selectedRole === 'host') headerTitle = "Host's Guide";
  if (selectedRole === 'guest') headerTitle = "Guest's Guide";
  if (showOverview) headerTitle = 'All Steps';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-40
          transition-opacity duration-300 ease-in-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 w-full max-h-[85vh]
          bg-background shadow-xl z-50 rounded-t-lg
          transform transition-transform duration-300 ease-out
          ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'}
          ${!isOpen ? 'pointer-events-none' : ''}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Hosting guide"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 rounded-t-lg" style={{ backgroundColor: 'var(--event-header-bg)' }}>
            <div className="flex items-center gap-2">
              {selectedRole && !showOverview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleChangeRole}
                  aria-label="Change role"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
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
            </div>

            <div className="flex items-center gap-1">
              {selectedRole && !showOverview && (
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
            {/* Role selection */}
            {!selectedRole && <GuideRoleSelect onSelectRole={handleSelectRole} />}

            {/* Overview / table of contents */}
            {selectedRole && showOverview && (
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
            {selectedRole && !showOverview && (
              <>
                <GuideNavigation
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  onPrev={handlePrev}
                  onNext={handleNext}
                >
                  <GuideStepCard step={steps[currentStep]} />
                </GuideNavigation>

                {/* Progress */}
                <div className="px-4 pb-4">
                  <GuideProgress currentStep={currentStep} totalSteps={totalSteps} />
                </div>

                {/* Contextual CTA on last step */}
                {isLastStep && (
                  <div className="px-6 pb-6">
                    {selectedRole === 'host' && (
                      <Button className="w-full" onClick={handleCTA}>
                        {apiClient.isAuthenticated()
                          ? 'Create Your Event'
                          : 'Sign Up to Host'}
                      </Button>
                    )}
                    {selectedRole === 'guest' && (
                      <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
                        Ask your host for the event link or PIN to get started!
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
