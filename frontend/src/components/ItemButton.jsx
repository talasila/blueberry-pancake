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
 * @param {function} props.onClick - Click handler
 */
function ItemButton({ itemId, ratingColor, isBookmarked, onClick }) {
  return (
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
      aria-label={`Item ${itemId}${isBookmarked ? ' (bookmarked)' : ''}`}
    >
      <span>{itemId}</span>
      
      {/* Bookmark indicator overlay */}
      {isBookmarked && (
        <div className="absolute top-0 left-0 bg-white/90 dark:bg-gray-900/90 rounded-full p-0.5 shadow-sm border border-gray-300 dark:border-gray-600">
          <Bookmark 
            className="h-4 w-4 fill-yellow-500 text-yellow-500" 
            aria-label="Bookmarked"
          />
        </div>
      )}
    </button>
  );
}

export default ItemButton;
