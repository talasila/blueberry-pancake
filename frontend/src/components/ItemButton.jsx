import { memo } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const BUTTON_SIZE = 60;
const RING_INSET = 4;
const STROKE_WIDTH = 2;
const RADIUS = (BUTTON_SIZE / 2) - RING_INSET;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * ItemButton Component
 * Displays an item as a dialpad-style button with rating color, bookmark indicator,
 * and optional participation ring showing how many users have rated this item.
 * 
 * @param {object} props
 * @param {number} props.itemId - Item identifier
 * @param {string} props.ratingColor - Optional color for rated items
 * @param {boolean} props.isBookmarked - Whether item is bookmarked
 * @param {boolean} props.isWinner - Whether item is ranked #1 (winner)
 * @param {function} props.onClick - Click handler
 * @param {number} [props.ratedCount] - Number of unique participants who rated this item
 * @param {number} [props.totalParticipants=0] - Total participants in the event
 * @param {boolean} [props.showRing=false] - Whether to render the participation ring
 */
function ItemButton({ itemId, ratingColor, isBookmarked, isWinner, onClick, ratedCount, totalParticipants = 0, showRing = false }) {
  const shouldRenderRing = showRing && totalParticipants > 0 && ratedCount !== undefined;
  const progress = shouldRenderRing ? Math.min(ratedCount / totalParticipants, 1) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const participationLabel = shouldRenderRing ? `, ${ratedCount} of ${totalParticipants} rated` : '';

  return (
    <div className="relative inline-block">
      {/* Glowing spinning circle for winner */}
      {isWinner && (
        <div className="absolute inset-0 -m-3 rounded-full overflow-hidden">
          <div className="absolute inset-0 rounded-full border-[3px] border-yellow-400/80 animate-spin overflow-hidden" style={{ animationDuration: '2s' }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/0 via-yellow-400/60 to-yellow-400/0 blur-md"></div>
          </div>
          <div className="absolute inset-0 rounded-full border-[3px] border-yellow-500/80 animate-spin overflow-hidden" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500/0 via-yellow-500/70 to-yellow-500/0 blur-md"></div>
          </div>
        </div>
      )}
      <button
        onClick={(e) => { e.currentTarget.focus(); onClick(itemId); }}
        className={cn(
          "relative w-[60px] h-[60px] rounded-full text-[28px] font-normal leading-none",
          "flex items-center justify-center",
          "transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "outline-2 outline-offset-2 outline-transparent focus:outline-[var(--event-accent)]",
          "shadow-none",
          ratingColor 
            ? "text-white" 
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        )}
        style={ratingColor ? { backgroundColor: ratingColor } : {}}
        aria-label={`Item ${itemId}${isBookmarked ? ' (bookmarked)' : ''}${isWinner ? ' (winner)' : ''}${participationLabel}`}
      >
      <span>{itemId}</span>

      {/* Participation ring — inside the button, inset 4px from edge */}
      {shouldRenderRing && (
        <svg
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          className="absolute inset-0 -rotate-90 pointer-events-none"
          aria-hidden="true"
          data-testid="participation-ring"
        >
          {/* Track — same color as button */}
          <circle
            cx={BUTTON_SIZE / 2}
            cy={BUTTON_SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            className={ratingColor ? undefined : "stroke-gray-100 dark:stroke-gray-800"}
            style={ratingColor ? { stroke: ratingColor } : undefined}
          />
          {/* Progress arc — lighter version of button color */}
          <circle
            cx={BUTTON_SIZE / 2}
            cy={BUTTON_SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={cn(
              "transition-[stroke-dashoffset] duration-[600ms] ease-out",
              ratingColor ? undefined : "stroke-gray-300 dark:stroke-gray-600"
            )}
            style={ratingColor ? { stroke: `color-mix(in srgb, ${ratingColor} 40%, white)` } : undefined}
          />
        </svg>
      )}

      {/* Bookmark indicator overlay */}
      {isBookmarked && (
        <div className="absolute top-0 left-0 bg-white/90 dark:bg-gray-900/90 rounded-full p-0.5 shadow-sm border border-gray-300 dark:border-gray-600">
          <Bookmark 
            className="h-3 w-3 fill-yellow-500 text-yellow-500" 
            aria-label="Bookmarked"
          />
        </div>
      )}

      </button>
    </div>
  );
}

export default memo(ItemButton);
