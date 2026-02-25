/**
 * Progress indicator for guide steps — "Step N of M" text plus dot row.
 *
 * @param {object} props
 * @param {number} props.currentStep - Zero-based index
 * @param {number} props.totalSteps
 */
export default function GuideProgress({ currentStep, totalSteps }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {currentStep + 1} of {totalSteps}
      </span>
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={totalSteps}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep
                ? 'w-4 bg-primary'
                : 'w-1.5 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
