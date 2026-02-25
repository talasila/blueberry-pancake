import { useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SWIPE_THRESHOLD = 50;

/**
 * Step navigation: Back / Next buttons with swipe gesture support.
 *
 * @param {object} props
 * @param {number} props.currentStep - Zero-based index
 * @param {number} props.totalSteps
 * @param {function} props.onPrev
 * @param {function} props.onNext
 * @param {React.ReactNode} props.children - Content area (step card) that receives swipe
 */
export default function GuideNavigation({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  children,
}) {
  const touchStartX = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current === null) return;
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;

      if (Math.abs(delta) >= SWIPE_THRESHOLD) {
        if (delta < 0 && currentStep < totalSteps - 1) onNext();
        if (delta > 0 && currentStep > 0) onPrev();
      }
    },
    [currentStep, totalSteps, onPrev, onNext],
  );

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="flex flex-col">
      {/* Swipeable content area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="touch-pan-y"
      >
        {children}
      </div>

      {/* Button row */}
      <div className="flex items-center justify-between px-4 pb-4 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Back"
          className={isFirst ? 'invisible' : ''}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {!isLast && (
          <Button
            variant="default"
            size="sm"
            onClick={onNext}
            aria-label="Next"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
