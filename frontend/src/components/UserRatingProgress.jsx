import RatingDistribution from './RatingDistribution';

/**
 * UserRatingProgress Component
 * 
 * Combines two charts to visualize a user's rating progress:
 * 1. Combined progress and history bar - shows progress percentage with chronological rating history in the filled portion
 * 2. Rating distribution chart
 * 
 * IMPORTANT: The ratings array must be sorted chronologically by timestamp (oldest to newest)
 * before being passed to this component. The component does not perform sorting.
 * 
 * @param {object} props
 * @param {number} props.ratingProgression - Percentage of items rated (0-100)
 * @param {object} props.ratingDistribution - Object with rating values as keys and counts as values
 * @param {Array<number>} props.ratings - Array of rating values sorted chronologically (oldest to newest) for history visualization
 * @param {Array} props.ratingConfiguration - Array of rating config objects with value, label, and color
 * @param {number} props.totalRatings - Total number of ratings
 */
function UserRatingProgress({
  ratingProgression = 0,
  ratingDistribution = {},
  ratings = [],
  ratingConfiguration = [],
  totalRatings = 0
}) {
  return (
    <div className="w-full space-y-2">
      {/* Combined Progress and History Bar */}
      {totalRatings > 0 ? (
        <div
          className="w-full h-2 bg-muted rounded-full overflow-hidden relative"
          role="progressbar"
          aria-valuenow={ratingProgression}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${ratingProgression.toFixed(0)}% complete`}
        >
          {/* Container for the filled portion (progress width) */}
          <div
            className="h-full flex"
            style={{ width: `${ratingProgression}%` }}
          >
            {/* Chronological history segments within the filled portion */}
            {ratings.map((ratingValue, index) => {
              const ratingConfig = ratingConfiguration?.find(r => r.value === ratingValue);
              const color = ratingConfig?.color || '#6B7280';
              const segmentWidth = 100 / ratings.length;
              
              return (
                <div
                  key={index}
                  className="h-full transition-all"
                  style={{
                    width: `${segmentWidth}%`,
                    backgroundColor: color,
                    minWidth: '2px'
                  }}
                  title={`Rating ${ratingValue}${ratingConfig?.label ? `: ${ratingConfig.label}` : ''}`}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="w-full h-2 bg-muted rounded-full"
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="0% complete"
        />
      )}
      <RatingDistribution
        ratingDistribution={ratingDistribution}
        ratingConfiguration={ratingConfiguration}
        totalRatings={totalRatings}
      />
    </div>
  );
}

export default UserRatingProgress;

