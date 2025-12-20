import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ItemButton Component
 * Displays an item as a dialpad-style button with rating color and bookmark indicator
 * 
 * @param {object} props
 * @param {number} props.itemId - Item identifier
 * @param {string} props.ratingColor - Optional color for rated items
 * @param {boolean} props.isBookmarked - Whether item is bookmarked
 * @param {boolean} props.isWinner - Whether item is ranked #1 (winner)
 * @param {function} props.onClick - Click handler
 */
function ItemButton({ itemId, ratingColor, isBookmarked, isWinner, onClick }) {
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
        onClick={onClick}
        className={cn(
          "relative w-16 h-16 rounded-full text-3xl font-normal",
          "flex items-center justify-center",
          "transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "shadow-md hover:shadow-lg",
          ratingColor 
            ? "text-white" 
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        )}
        style={ratingColor ? { backgroundColor: ratingColor } : {}}
        aria-label={`Item ${itemId}${isBookmarked ? ' (bookmarked)' : ''}${isWinner ? ' (winner)' : ''}`}
      >
      <span>{itemId}</span>
      
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

export default ItemButton;
