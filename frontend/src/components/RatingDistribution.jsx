/**
 * RatingDistribution Component
 * 
 * Displays a horizontal bar chart showing the distribution of ratings for an item.
 * Each rating value is represented by a colored segment proportional to its count.
 * 
 * @param {object} ratingDistribution - Object with rating values as keys and counts as values (e.g., {1: 5, 2: 3, 3: 8, 4: 2})
 * @param {Array} ratingConfiguration - Array of rating config objects with value, label, and color
 * @param {number} totalRatings - Total number of ratings for this item
 */
function RatingDistribution({ ratingDistribution = {}, ratingConfiguration = [], totalRatings = 0 }) {
  if (!ratingDistribution || totalRatings === 0) {
    return (
      <div className="w-full h-3 bg-muted rounded-full">
        <div className="text-xs text-muted-foreground mt-1">No ratings</div>
      </div>
    );
  }

  // Get colors for each rating value from configuration
  const getColorForRating = (ratingValue) => {
    const config = ratingConfiguration.find(r => r.value === ratingValue);
    return config?.color || '#6B7280'; // Default gray if color not found
  };

  // Calculate percentages and create segments
  const segments = [];
  let currentPosition = 0;

  // Sort rating values to display in order (1, 2, 3, 4...)
  const sortedRatings = Object.keys(ratingDistribution)
    .map(Number)
    .sort((a, b) => a - b);

  sortedRatings.forEach((ratingValue) => {
    const count = ratingDistribution[ratingValue] || 0;
    if (count > 0) {
      const percentage = (count / totalRatings) * 100;
      const color = getColorForRating(ratingValue);
      
      segments.push({
        ratingValue,
        count,
        percentage,
        color,
        left: currentPosition,
        width: percentage
      });
      
      currentPosition += percentage;
    }
  });

  if (segments.length === 0) {
    return (
      <div className="w-full h-3 bg-muted rounded-full">
        <div className="text-xs text-muted-foreground mt-1">No ratings</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Distribution bar */}
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
        {segments.map((segment, index) => (
          <div
            key={segment.ratingValue}
            className="h-full transition-all"
            style={{
              width: `${segment.width}%`,
              backgroundColor: segment.color,
              minWidth: segment.width > 0 ? '2px' : '0'
            }}
            title={`Rating ${segment.ratingValue}: ${segment.count} ${segment.count === 1 ? 'rating' : 'ratings'} (${segment.percentage.toFixed(1)}%)`}
          />
        ))}
      </div>
    </div>
  );
}

export default RatingDistribution;
