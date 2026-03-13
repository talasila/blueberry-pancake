import { memo } from 'react';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * AssignmentButton — 60px circular button for the assignment grid.
 * Matches ItemButton's visual style but with assignment-specific states.
 *
 * @param {object}   props
 * @param {number}   props.itemId      - The number to display
 * @param {boolean}  props.isAssigned  - Whether this number has been assigned
 * @param {boolean}  [props.isDisabled=false] - Non-interactive (event not paused)
 * @param {boolean}  [props.isLoading=false]  - Show spinner while saving
 * @param {function} props.onClick     - Tap handler, called with (itemId)
 */
function AssignmentButton({ itemId, isAssigned, isDisabled = false, isLoading = false, onClick }) {
  const handleClick = () => {
    if (!isDisabled && !isLoading) {
      onClick(itemId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        'relative w-[60px] h-[60px] rounded-full text-[28px] font-normal leading-none',
        'flex items-center justify-center',
        'transition-all duration-200',
        !isDisabled && 'hover:scale-105 active:scale-95 cursor-pointer',
        'outline-2 outline-offset-2 outline-transparent focus:outline-[var(--event-accent)]',
        isAssigned
          ? 'bg-green-500 text-white'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        isDisabled && 'opacity-50 cursor-not-allowed',
      )}
      aria-label={`Number ${itemId}${isAssigned ? ' (assigned)' : ''}${isLoading ? ' (saving)' : ''}`}
      data-testid={`assignment-button-${itemId}`}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <span>{itemId}</span>
      )}
    </button>
  );
}

export default memo(AssignmentButton);
