import { X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getSimilarUsers } from '@/services/similarUsersService.js';
import { useItemTerminology } from '@/utils/itemTerminology';
import { useEventContext } from '@/contexts/EventContext';
import { getPersonalityName } from '@/utils/personalityContent';
import ListCard from '@/components/ListCard';

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

  // Get descriptive tier label for a similarity score (0-1)
  const getSimilarityLabel = (score) => {
    if (score >= 0.9) return 'Taste Twin';
    if (score >= 0.75) return 'Very Similar';
    if (score >= 0.6) return 'Similar';
    return 'Some Overlap';
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
            <ListCard key={i} handle={<span className="invisible">0</span>}>
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-2.5 bg-muted rounded w-1/4" />
              </div>
            </ListCard>
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
            const percentage = Math.round(score * 100);
            const tierLabel = getSimilarityLabel(score);
            const commonItemsCount = user.commonItemsCount || (user.commonItems ? user.commonItems.length : 0);

            return (
              <ListCard
                key={user.email || index}
                as="button"
                handle={index + 1}
                onClick={() => handleUserClick(user)}
                className="w-full text-left active:scale-[0.98] transition-all duration-150"
              >
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block leading-tight">{user.name || user.email}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {user.personality ? `${getPersonalityName(user.personality)} · ` : ''}{commonItemsCount} common
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--event-accent)' }}>{percentage}%</span>
                      <div className="flex items-center gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => {
                          const remainder = fillCount - i;
                          const isFull = remainder >= 0.75;
                          const isHalf = !isFull && remainder >= 0.25;

                          return (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full overflow-hidden border"
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
                    <span className="text-[10px] text-muted-foreground leading-tight">{tierLabel}</span>
                  </div>
                </div>
              </ListCard>
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
          fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)]
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
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
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
            fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)]
            bg-background shadow-xl z-[60] rounded-t-lg border-t
            transform transition-transform duration-300 ease-out
            ${isDetailsAnimating ? 'translate-y-0' : 'translate-y-full'}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-drawer-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
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
                    Each row is a {singular.toLowerCase()} you both rated. The large dot is yours, the small dot is {detailsUserRef.current.name || detailsUserRef.current.email}&rsquo;s. A bullseye means you agreed. The longer and redder the line between dots, the more you disagreed.
                  </p>
                  {/* Scale legend — mirrors ListCard layout: w-8 handle + px-4 inner padding */}
                  {ratingConfig.ratings && ratingConfig.ratings.length > 0 && (
                    <div className="flex">
                      <div className="w-8 flex-shrink-0" />
                      <div className="flex-1 flex items-center justify-between px-4">
                        {ratingConfig.ratings.map((r) => (
                          <div key={r.value} className="flex flex-col items-center gap-1" style={{ width: `${100 / (ratingConfig.maxRating || ratingConfig.ratings.length)}%` }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                            <span className="text-[9px] text-muted-foreground leading-tight">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {sortItemsById(detailsUserRef.current.commonItems).map((item, itemIndex) => {
                      const userColor = getRatingColor(item.userRating);
                      const similarColor = getRatingColor(item.similarUserRating);
                      const isMatch = item.userRating === item.similarUserRating;
                      const maxRating = ratingConfig.maxRating || ratingConfig.ratings?.length || 4;
                      const diff = Math.abs(item.userRating - item.similarUserRating);

                      // Bridge color: green (close) → yellow (mid) → red (far)
                      const bridgeColor = diff <= 1 ? '#34C759' : diff >= maxRating - 1 ? '#FF3B30' : '#FFCC00';

                      // Column center positions as percentages
                      const minVal = Math.min(item.userRating, item.similarUserRating);
                      const maxVal = Math.max(item.userRating, item.similarUserRating);
                      const colWidth = 100 / maxRating;
                      const bridgeLeft = ((minVal - 1) + 0.5) * colWidth;
                      const bridgeRight = ((maxVal - 1) + 0.5) * colWidth;

                      return (
                        <ListCard
                          key={itemIndex}
                          handle={item.itemId}
                        >
                          <div className="py-2 px-4">
                            <div className="relative flex items-center justify-between">
                              {/* Bridge line connecting the two ratings */}
                              {!isMatch && (
                                <div
                                  className="absolute h-1 rounded-full top-1/2 -translate-y-1/2"
                                  style={{
                                    left: `${bridgeLeft}%`,
                                    width: `${bridgeRight - bridgeLeft}%`,
                                    backgroundColor: bridgeColor,
                                    opacity: 0.3,
                                  }}
                                />
                              )}
                              {/* Scale positions with dots */}
                              {ratingConfig.ratings?.map((r) => {
                                const isUserRating = r.value === item.userRating;
                                const isSimilarRating = r.value === item.similarUserRating;

                                return (
                                  <div key={r.value} className="flex items-center justify-center z-10" style={{ width: `${colWidth}%` }}>
                                    {isUserRating && isSimilarRating ? (
                                      /* Bullseye: perfect match */
                                      <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: userColor || 'var(--muted)' }}
                                      >
                                        <div
                                          className="w-2.5 h-2.5 rounded-full border border-white/80"
                                          style={{ backgroundColor: similarColor || 'var(--muted)' }}
                                        />
                                      </div>
                                    ) : isUserRating ? (
                                      /* Current user's rating: large dot */
                                      <div
                                        className="w-5 h-5 rounded-full"
                                        style={{ backgroundColor: userColor || 'var(--muted)' }}
                                      />
                                    ) : isSimilarRating ? (
                                      /* Similar user's rating: small dot */
                                      <div
                                        className="w-3 h-3 rounded-full opacity-70"
                                        style={{ backgroundColor: similarColor || 'var(--muted)' }}
                                      />
                                    ) : (
                                      /* Empty position: faint placeholder */
                                      <div className="w-2 h-2 rounded-full bg-muted-foreground/10" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </ListCard>
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
