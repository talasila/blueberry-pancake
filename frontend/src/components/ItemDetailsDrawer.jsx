import { X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import itemService from '@/services/itemService';
import { useItemTerminology } from '@/utils/itemTerminology';
import { useEventContext } from '@/contexts/EventContext';

/**
 * ItemDetailsDrawer Component
 * Slide-out drawer that displays item details (name, price, description, owner)
 * Only available when event is in "completed" state
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether drawer is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.eventId - Event identifier
 * @param {number} props.itemId - Assigned item ID (integer, 1 to numberOfItems)
 * @param {string} props.eventState - Current event state (created, started, paused, completed)
 */
function ItemDetailsDrawer({ 
  isOpen, 
  onClose, 
  eventId,
  itemId,
  eventState
}) {
  const { event } = useEventContext();
  const { singular } = useItemTerminology(event);
  const openStartTimeRef = useRef(null);
  const hasBeenOpenedRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track if drawer has ever been opened (for animation)
  useEffect(() => {
    if (isOpen) {
      hasBeenOpenedRef.current = true;
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

  // Fetch item details when drawer opens
  useEffect(() => {
    if (isOpen && eventId && itemId && eventState === 'completed') {
      fetchItemDetails();
    } else {
      // Reset state when drawer closes
      setItem(null);
      setError(null);
    }
  }, [isOpen, eventId, itemId, eventState]);

  const fetchItemDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const itemData = await itemService.getItemByItemId(eventId, itemId);
      setItem(itemData);
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError(err.message || 'Failed to load item details');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if event is not completed
  if (eventState !== 'completed') {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

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
        aria-labelledby="item-details-title"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[75vh]">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
            <h2 id="item-details-title" className="text-base font-semibold">
              {item && item.itemId ? `${singular} ${item.itemId} Details` : `${singular.charAt(0).toUpperCase() + singular.slice(1)} Details`}
            </h2>
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <Message type="error">{error}</Message>
            ) : item ? (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Name
                  </h3>
                  <p className="text-base">{item.name}</p>
                </div>

                {/* Price */}
                {item.price !== null && item.price !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Price
                    </h3>
                    <p className="text-base">
                      ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                    </p>
                  </div>
                )}

                {/* Description */}
                {item.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </h3>
                    <p className="text-base whitespace-pre-wrap">{item.description}</p>
                  </div>
                )}

                {/* Owner */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Brought by
                  </h3>
                  <p className="text-base">{item.ownerEmail}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export default ItemDetailsDrawer;
