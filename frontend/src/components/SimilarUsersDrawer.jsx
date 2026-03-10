import { X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getSimilarUsers } from '@/services/similarUsersService.js';
import { useItemTerminology } from '@/utils/itemTerminology';
import { useEventContext } from '@/contexts/EventContext';

/**
 * SimilarUsersDrawer Component
 * Slide-out drawer that displays similar users with rating comparisons
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether drawer is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.eventId - Event identifier
 */
function SimilarUsersDrawer({ 
  isOpen, 
  onClose, 
  eventId,
}) {
  const { event } = useEventContext();
  const { singular } = useItemTerminology(event);
  const hasBeenOpenedRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDetailsAnimating, setIsDetailsAnimating] = useState(false);
  const detailsUserRef = useRef(null);
  
  // Get rating configuration from event
  const ratingConfig = event?.ratingConfiguration || {};

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

  const fetchSimilarUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getSimilarUsers(eventId);
      setSimilarUsers(data.similarUsers || []);
    } catch (err) {
      console.error('Error fetching similar users:', err);
      setError(err.message || 'Failed to fetch similar users');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Fetch similar users when drawer opens
  useEffect(() => {
    if (isOpen && eventId) {
      fetchSimilarUsers();
    } else {
      setSimilarUsers([]);
      setError(null);
      setIsDetailsOpen(false);
      setIsDetailsAnimating(false);
    }
  }, [isOpen, eventId, fetchSimilarUsers]);

  // Handle user selection - open details drawer
  const handleUserClick = (user) => {
    detailsUserRef.current = user;
    setIsDetailsOpen(true);
    const timer = setTimeout(() => setIsDetailsAnimating(true), 10);
    return () => clearTimeout(timer);
  };

  // Close details drawer with exit animation
  const handleCloseDetails = useCallback((e) => {
    if (e) e.stopPropagation();
    setIsDetailsAnimating(false);
    setTimeout(() => setIsDetailsOpen(false), 300);
  }, []);

  // Sort items by ID in ascending order
  const sortItemsById = (items) => {
    return [...items].sort((a, b) => a.itemId - b.itemId);
  };

  // Get color for a rating value
  const getRatingColor = (ratingValue) => {
    if (!ratingConfig.ratings || !Array.isArray(ratingConfig.ratings)) {
      return null;
    }
    const ratingOption = ratingConfig.ratings.find(r => r.value === ratingValue);
    return ratingOption?.color || null;
  };

  // Don't render if drawer was never opened (optimization)
  if (!isOpen && !hasBeenOpenedRef.current) {
    return null;
  }

  // Determine content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="flex flex-col items-center justify-center py-8" role="status" aria-live="polite" aria-label="Loading similar users">
        <LoadingSpinner />
        <p className="mt-4 text-xs text-muted-foreground">Running compatibility scanner...</p>
        <div className="mt-6 w-full space-y-1.5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-stretch rounded-lg overflow-hidden bg-muted/40">
              <span className="w-8 flex-shrink-0 bg-muted-foreground/20" />
              <div className="flex-1 px-3 py-2.5 space-y-1.5">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-2.5 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <Message type="error">
        {error}
      </Message>
    );
  } else if (similarUsers.length === 0) {
    content = (
      <Message type="info">
        No similar users found. You may need to rate more items, or there may not be other users with similar preferences yet.
      </Message>
    );
  } else {
    content = (
      <div className="space-y-3">
        <span className="text-xs text-muted-foreground leading-snug block">Ranked by how closely their ratings match yours. Tap anyone to see a side-by-side comparison.</span>
        <div className="space-y-1.5">
          {similarUsers.map((user, index) => {
            const score = user.similarityScore ?? 0;
            const fillCount = score * 5;
            const commonItemsCount = user.commonItemsCount || (user.commonItems ? user.commonItems.length : 0);
            
            return (
              <button
                key={user.email || index}
                onClick={() => handleUserClick(user)}
                className="w-full flex items-stretch rounded-lg overflow-hidden bg-muted/40 text-left active:scale-[0.98] transition-all duration-150"
              >
                <span className="w-8 flex-shrink-0 flex items-center justify-center bg-muted-foreground/20 text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{user.name || user.email}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {commonItemsCount} common
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[0, 1, 2, 3, 4].map((i) => {
                      const remainder = fillCount - i;
                      const isFull = remainder >= 0.75;
                      const isHalf = !isFull && remainder >= 0.25;

                      return (
                        <div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full overflow-hidden border"
                          style={{
                            borderColor: 'var(--event-accent)',
                            backgroundColor: 'var(--event-surface)',
                          }}
                        >
                          {isFull && (
                            <div className="w-full h-full" style={{ backgroundColor: 'var(--event-accent)' }} />
                          )}
                          {isHalf && (
                            <div className="w-1/2 h-full" style={{ backgroundColor: 'var(--event-accent)' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
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
          fixed bottom-0 left-0 right-0 w-full max-h-[90vh]
          bg-background shadow-xl z-50 rounded-t-lg
          transform transition-transform duration-300 ease-out
          ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'}
          ${!isOpen ? 'pointer-events-none' : ''}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-hidden={!isOpen}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 rounded-t-lg" style={{ backgroundColor: 'var(--event-header-bg)' }}>
            <h2 id="drawer-title" className="text-base font-semibold">
              Similar Tastes
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Close similar users drawer"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose();
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {content}
          </div>

          {/* Dim overlay when details drawer is open */}
          <div
            className={`absolute inset-0 rounded-t-lg bg-black/20 transition-opacity duration-300 ${isDetailsAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={(e) => { e.stopPropagation(); handleCloseDetails(e); }}
          />
        </div>
      </div>

      {/* Details Drawer — always rendered, animated via CSS */}
      {isDetailsOpen && (
        <div
          className={`
            fixed bottom-0 left-0 right-0 w-full max-h-[90vh]
            bg-background shadow-xl z-[60] rounded-t-lg border-t
            transform transition-transform duration-300 ease-out
            ${isDetailsAnimating ? 'translate-y-0' : 'translate-y-full'}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-drawer-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 rounded-t-lg" style={{ backgroundColor: 'var(--event-header-bg)' }}>
              <h2 id="details-drawer-title" className="text-base font-semibold">
                {(detailsUserRef.current?.name || detailsUserRef.current?.email) ?? ''}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseDetails(e);
                }}
                aria-label="Close details drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {detailsUserRef.current?.commonItems && detailsUserRef.current.commonItems.length > 0 ? (
                <div className="space-y-5">
                  <p className="text-xs text-muted-foreground">
                    Each row is a {singular.toLowerCase()} you both rated. The big dot on the center line is your rating. The small dot is theirs — the further apart, the more you disagreed.
                  </p>
                  <div className="space-y-1.5">
                    {sortItemsById(detailsUserRef.current.commonItems).map((item, itemIndex) => {
                      const userColor = getRatingColor(item.userRating);
                      const similarColor = getRatingColor(item.similarUserRating);
                      const diff = item.similarUserRating - item.userRating;
                      const offsetPx = diff * 22;

                      return (
                        <div
                          key={itemIndex}
                          className="flex items-stretch rounded-lg overflow-hidden bg-muted/40"
                        >
                          <span className="w-8 flex-shrink-0 flex items-center justify-center bg-muted-foreground/20 text-xs font-bold text-muted-foreground">
                            {item.itemId}
                          </span>
                          <div className="flex-1 flex items-center justify-center py-2 relative">
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/15" />
                            <div
                              className="w-4 h-4 rounded-full z-10 flex items-center justify-center"
                              style={{ backgroundColor: userColor || 'var(--muted)' }}
                            >
                              {diff === 0 && (
                                <div
                                  className="w-2 h-2 rounded-full border border-white"
                                  style={{ backgroundColor: similarColor || 'var(--muted)' }}
                                />
                              )}
                            </div>
                            {diff !== 0 && (
                              <div
                                className="w-3 h-3 rounded-full absolute"
                                style={{
                                  backgroundColor: similarColor || 'var(--muted)',
                                  left: `calc(50% + ${offsetPx}px - 6px)`,
                                  opacity: 0.7,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Message type="info">
                  No common items found.
                </Message>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SimilarUsersDrawer;
