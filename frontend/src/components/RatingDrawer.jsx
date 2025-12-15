import { X, Bookmark, BookmarkCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Message from '@/components/Message';
import RatingForm from './RatingForm';
import { toggleBookmark, isBookmarked } from '@/utils/bookmarkStorage';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * RatingDrawer Component
 * Slide-out drawer that displays content based on event state
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether drawer is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.eventState - Current event state (created, started, paused, completed)
 * @param {number} props.itemId - Item identifier
 * @param {string} props.eventId - Event identifier
 * @param {object} props.existingRating - Existing rating for this item (if any)
 * @param {object} props.ratingConfig - Rating configuration (maxRating, ratings array)
 * @param {string} props.eventType - Type of event (e.g., "wine")
 * @param {boolean} props.noteSuggestionsEnabled - Whether note suggestions are enabled
 * @param {string} props.userEmail - User email address (optional, for server sync)
 */
function RatingDrawer({ 
  isOpen, 
  onClose, 
  eventState, 
  itemId, 
  eventId,
  existingRating,
  ratingConfig,
  eventType,
  noteSuggestionsEnabled,
  userEmail
}) {
  const { event } = useEventContext();
  const { singular } = useItemTerminology(event);
  const openStartTimeRef = useRef(null);
  const hasBeenOpenedRef = useRef(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Track if drawer has ever been opened (for animation)
  useEffect(() => {
    if (isOpen) {
      hasBeenOpenedRef.current = true;
      // Ensure drawer starts in closed position, then animate to open
      setIsAnimating(false);
      // Use setTimeout to ensure the closed state is rendered before transitioning
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Update bookmark state when itemId changes
  useEffect(() => {
    if (eventId && itemId) {
      setBookmarked(isBookmarked(eventId, itemId));
    }
  }, [eventId, itemId]);

  // Handle bookmark toggle
  const handleBookmarkToggle = async () => {
    if (eventId && itemId) {
      const newState = await toggleBookmark(eventId, itemId);
      setBookmarked(newState);
      // Trigger event to update bookmark indicator on EventPage
      window.dispatchEvent(new CustomEvent('bookmarkToggled', { 
        detail: { eventId, itemId, bookmarked: newState } 
      }));
    }
  };

  // Performance monitoring: track drawer open time (T080)
  useEffect(() => {
    if (isOpen && !openStartTimeRef.current) {
      openStartTimeRef.current = performance.now();
    } else if (!isOpen && openStartTimeRef.current) {
      const openTime = performance.now() - openStartTimeRef.current;
      if (openTime > 500) {
        console.warn(`Drawer open time: ${openTime.toFixed(2)}ms (exceeds 500ms target)`);
      } else {
        console.log(`Drawer open time: ${openTime.toFixed(2)}ms`);
      }
      openStartTimeRef.current = null;
    }
  }, [isOpen]);

  // Determine content based on event state
  let content;
  switch (eventState) {
    case 'created':
      content = (
        <Message type="info">
          This event has not started yet. Rating is not available.
        </Message>
      );
      break;
    
    case 'started':
      content = (
        <RatingForm
          itemId={itemId}
          eventId={eventId}
          existingRating={existingRating}
          ratingConfig={ratingConfig}
          onClose={onClose}
          eventType={eventType}
          noteSuggestionsEnabled={noteSuggestionsEnabled}
        />
      );
      break;
    
    case 'paused':
      content = (
        <Message type="warning">
          This event is currently paused. Rating is not available.
        </Message>
      );
      break;
    
    case 'completed':
      content = (
        <Message type="info">
          This feature is yet to be built.
        </Message>
      );
      break;
    
    default:
      content = (
        <Message type="info">
          Event state unknown. Rating is not available.
        </Message>
      );
  }

  // Don't render if drawer was never opened (optimization)
  if (!isOpen && !hasBeenOpenedRef.current) {
    return null;
  }

  return (
    <>
      {/* Backdrop with fade animation */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-40
          transition-opacity duration-300 ease-in-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer - slides up from bottom with animation */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 w-full max-h-[75vh]
          bg-background shadow-xl z-50 rounded-t-lg
          transform transition-transform duration-300 ease-out
          ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'}
          ${!isOpen ? 'pointer-events-none' : ''}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[75vh]">
          {/* Header with title, bookmark button, and close button */}
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
            <h2 id="drawer-title" className="text-base font-semibold">
              {singular} {itemId}
            </h2>
            <div className="flex items-center gap-2">
              {eventState === 'started' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleBookmarkToggle}
                  aria-label={bookmarked ? `Remove bookmark` : `Bookmark this ${singular.toLowerCase()}`}
                >
                  {bookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {content}
          </div>
        </div>
      </div>
    </>
  );
}

export default RatingDrawer;
