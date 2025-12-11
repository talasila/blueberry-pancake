/**
 * ProgressBar Component
 * 
 * Visual-only progress bar (no text labels) showing percentage completion.
 * Uses percentage value for width calculation.
 * Includes aria-label for accessibility.
 * 
 * @param {number} percentage - Percentage value (0-100)
 */
function ProgressBar({ percentage }) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage || 0));

  return (
    <div
      className="w-full h-1 bg-muted rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clampedPercentage.toFixed(0)}% complete`}
    >
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${clampedPercentage}%` }}
      />
    </div>
  );
}

export default ProgressBar;
