import ProgressBar from './ProgressBar';
import RatingDistribution from './RatingDistribution';
import Sparkline from './Sparkline';

/**
 * UserRatingProgress Component
 * 
 * Combines three charts to visualize a user's rating progress:
 * 1. Progress bar showing percentage of items rated
 * 2. Rating distribution chart
 * 3. Sparkline showing all ratings in order
 * 
 * @param {object} props
 * @param {number} props.ratingProgression - Percentage of items rated (0-100)
 * @param {object} props.ratingDistribution - Object with rating values as keys and counts as values
 * @param {Array} props.ratings - Array of rating values in order (for sparkline)
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
      <ProgressBar percentage={ratingProgression || 0} />
      <RatingDistribution
        ratingDistribution={ratingDistribution}
        ratingConfiguration={ratingConfiguration}
        totalRatings={totalRatings}
      />
      <Sparkline
        ratings={ratings}
        ratingConfiguration={ratingConfiguration}
      />
    </div>
  );
}

export default UserRatingProgress;

