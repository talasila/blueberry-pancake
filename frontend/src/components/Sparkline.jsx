/**
 * Sparkline Component
 * 
 * Displays a horizontal bar chart (sparkline) showing all ratings for a user.
 * Each rating is represented by a colored bar segment.
 * 
 * @param {Array} ratings - Array of rating values (numbers from 1 to maxRating)
 * @param {Array} ratingConfiguration - Array of rating config objects with value, label, and color
 * @param {number} maxRating - Maximum rating value (default: 4)
 */
function Sparkline({ ratings = [], ratingConfiguration = [], maxRating = 4 }) {
  if (!ratings || ratings.length === 0) {
    return (
      <div className="w-full h-2 bg-muted rounded-full">
        <div className="text-xs text-muted-foreground mt-1">No ratings</div>
      </div>
    );
  }

  // Get colors for each rating value from configuration
  const getColorForRating = (ratingValue) => {
    const config = ratingConfiguration.find(r => r.value === ratingValue);
    return config?.color || '#6B7280'; // Default gray if color not found
  };

  // Calculate bar width (each rating gets equal width)
  const barWidth = 100 / ratings.length;

  return (
    <div className="w-full">
      {/* Sparkline bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
        {ratings.map((ratingValue, index) => {
          const color = getColorForRating(ratingValue);
          return (
            <div
              key={index}
              className="h-full transition-all"
              style={{
                width: `${barWidth}%`,
                backgroundColor: color,
                minWidth: '2px'
              }}
              title={`Rating ${ratingValue}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Sparkline;

