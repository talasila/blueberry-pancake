import { X, Medal } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProgressBar from '@/components/ProgressBar';
import ListCard from '@/components/ListCard';
import { useItemTerminology } from '@/utils/itemTerminology';
import { useEventContext } from '@/contexts/EventContext';
import {
  calculateRatingDistribution,
  calculateWeightedAverages,
  calculateItemRank,
  calculateRatingProgression,
  findUserRating,
} from '@/utils/itemCalculations';
import { useColumnSort } from '@/hooks/useColumnSort';
import { useItemDetailsData } from '@/hooks/useItemDetailsData';

/** Slide-out drawer showing item details, ratings and ranking. */
function ItemDetailsDrawer({ isOpen, onClose, eventId, itemId, eventState, isAdmin = false }) {
  const { event } = useEventContext();
  const { singular, singularLower } = useItemTerminology(event);
  const hasBeenOpenedRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const {
    item, isLoading, error, ratings, allRatings,
    isLoadingRatings, userEmail, cachedDashboardData,
  } = useItemDetailsData({ isOpen, eventId, itemId, eventState, isAdmin });

  // Track if drawer has ever been opened (for animation)
  useEffect(() => {
    if (isOpen) {
      hasBeenOpenedRef.current = true;
      setIsAnimating(false);
      const timer = setTimeout(() => { setIsAnimating(true); }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  const ratingDistribution = useMemo(() => (ratings.length && itemId ? calculateRatingDistribution(ratings) : {}), [ratings, itemId]);
  const totalRatings = ratings.length;
  const ratingConfiguration = event?.ratingConfiguration?.ratings || [];
  const { averageRating, globalAverage, weightedAverage, totalUsers } = useMemo(() => calculateWeightedAverages(ratings, allRatings), [ratings, allRatings]);
  const userRating = useMemo(() => findUserRating(ratings, userEmail), [ratings, userEmail]);
  const ratingProgression = useMemo(() => calculateRatingProgression(ratings, totalUsers), [ratings, totalUsers]);
  const itemRank = useMemo(() => calculateItemRank(itemId, cachedDashboardData), [cachedDashboardData, itemId]);
  const { sortColumn: ratingSortColumn, sortDirection: ratingSortDirection, handleSort: handleRatingSort, sortItems } = useColumnSort('rating', 'desc');

  const sortedItemRatings = useMemo(() => {
    if (!ratings.length) return [];

    const enriched = ratings.map(rating => {
      const userData = event?.users?.[rating.email];
      const name = userData?.name || 'Guest';
      return { ...rating, userName: name };
    });

    return sortItems(enriched, {
      name: (a, b) => {
        const aVal = (a.userName || '').toLowerCase();
        const bVal = (b.userName || '').toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      },
      rating: (a, b) => {
        const aVal = a.rating ?? 0;
        const bVal = b.rating ?? 0;
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      },
    });
  }, [ratings, event, ratingSortColumn, ratingSortDirection]);

  if (eventState !== 'completed' && !isAdmin) return null;

  const rankBadgeClass = {
    1: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 border-yellow-600 shadow-sm dark:from-yellow-500 dark:to-yellow-600 dark:text-yellow-50 dark:border-yellow-700 hover:from-yellow-400 hover:to-yellow-500 hover:text-yellow-950 dark:hover:from-yellow-500 dark:hover:to-yellow-600 dark:hover:text-yellow-50',
    2: 'bg-slate-300 text-slate-800 border-slate-400 dark:bg-slate-500 dark:text-slate-50 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500',
    3: 'bg-amber-700 text-amber-50 border-amber-800 dark:bg-amber-800 dark:text-amber-50 dark:border-amber-900 hover:bg-amber-700 dark:hover:bg-amber-800',
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300" onClick={onClose} aria-hidden="true" />
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)] bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'} ${!isOpen ? 'pointer-events-none' : ''}`}
        role="dialog" aria-modal="true" aria-labelledby="item-details-title" aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 rounded-t-lg" style={{ backgroundColor: 'var(--event-header-bg)' }}>
            <div className="flex items-center gap-2">
              <h2 id="item-details-title" className="text-base font-semibold">
                {item ? `${singular} ${item.itemId} Details` : `${singular} ${itemId} Details`}
              </h2>
              {itemRank !== null && itemRank <= 3 && (
                <Badge variant="default" className={`text-[10px] px-1.5 py-0 font-semibold whitespace-nowrap flex-shrink-0 flex items-center gap-0.5 ${rankBadgeClass[itemRank]}`}>
                  {itemRank === 1 && <Medal className="h-2.5 w-2.5" />}
                  #{itemRank}
                </Badge>
              )}
            </div>
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
            ) : (
              <div className="space-y-6">
                {/* Bottle Details */}
                {item ? (
                  <section
                    className="rounded-lg border-l-4 px-4 py-3 space-y-2"
                    style={{
                      borderLeftColor: 'var(--event-accent)',
                      backgroundColor: 'color-mix(in oklch, var(--event-accent) 8%, var(--background))',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold break-words leading-snug">{item.name}</span>
                      {item.price !== null && item.price !== undefined && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                          ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {event?.users && event.users[item.ownerEmail]?.name
                        ? `${event.users[item.ownerEmail].name} · ${item.ownerEmail}`
                        : item.ownerEmail}
                    </span>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground/70 whitespace-pre-wrap border-t border-muted-foreground/10 pt-2 mt-1 leading-relaxed">{item.description}</p>
                    )}
                  </section>
                ) : (
                  <div className="space-y-1">
                    <span className="text-xs font-medium">No {singularLower} registered or assigned</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Registration or assignment has not been done for this {singularLower} ID yet. A guest first registers their {singularLower} from the event page, then an admin assigns it to this ID. Until that mapping is done, details won't appear here.
                    </p>
                  </div>
                )}

                {/* Ratings Distribution */}
                <div>
                  <span className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Ratings Distribution
                  </span>
                  {isLoadingRatings ? (
                    <div className="flex justify-center py-2">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Average, Weighted Average, and User's Rating - all on one line */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {averageRating !== null && (
                          <div>
                            <span className="font-medium">Avg: </span>
                            <span>{averageRating.toFixed(2)}</span>
                          </div>
                        )}
                        {weightedAverage !== null && (
                          <div>
                            <span className="font-medium">Wt. Avg: </span>
                            <span>{weightedAverage.toFixed(2)}</span>
                          </div>
                        )}
                        {userRating && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">Your rating:</span>
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                              style={{ backgroundColor: ratingConfiguration.find(r => r.value === userRating.rating)?.color || '#6B7280' }}
                            >
                              {userRating.rating}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {totalUsers > 0 && (
                        <ProgressBar percentage={ratingProgression} />
                      )}

                      {totalRatings > 0 ? (
                        <>
                          <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                            {ratingConfiguration
                              .slice()
                              .sort((a, b) => a.value - b.value)
                              .map((rc) => {
                                const count = ratingDistribution[rc.value] || 0;
                                if (count === 0) return null;
                                const pct = (count / totalRatings) * 100;
                                return (
                                  <div
                                    key={rc.value}
                                    className="h-full transition-all duration-300"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: rc.color,
                                      minWidth: '3px'
                                    }}
                                  />
                                );
                              })}
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            {ratingConfiguration
                              .slice()
                              .sort((a, b) => a.value - b.value)
                              .map((rc) => {
                                const count = ratingDistribution[rc.value] || 0;
                                return (
                                  <span key={rc.value} className="flex items-center gap-1">
                                    <span
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                      style={{ backgroundColor: rc.color, opacity: count > 0 ? 1 : 0.35 }}
                                    >
                                      {rc.value}
                                    </span>
                                    <span className={`text-xs tabular-nums ${count > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                                      {count}
                                    </span>
                                  </span>
                                );
                              })}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-2">No ratings yet</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Individual Ratings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Ratings</span>
                    {sortedItemRatings.length > 1 && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleRatingSort('name')}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${ratingSortColumn === 'name' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                        >
                          Name{ratingSortColumn === 'name' ? (ratingSortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRatingSort('rating')}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${ratingSortColumn === 'rating' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                        >
                          Rating{ratingSortColumn === 'rating' ? (ratingSortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                      </div>
                    )}
                  </div>
                  {sortedItemRatings.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No ratings yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sortedItemRatings.map((rating, index) => {
                        const ratingValue = parseInt(rating.rating, 10);
                        const ratingColor = ratingConfiguration.find(r => r.value === ratingValue)?.color || '#6B7280';
                        const hasNote = rating.note && rating.note.trim();
                        const isCurrentUser = userEmail && rating.email?.trim().toLowerCase() === userEmail?.trim().toLowerCase();

                        return (
                          <ListCard
                            key={`${rating.email}-${rating.timestamp}-${index}`}
                          >
                            <div className="flex items-center gap-2 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium">
                                  {rating.userName}
                                  {isCurrentUser && <span className="text-muted-foreground ml-1">(You)</span>}
                                </span>
                                {hasNote && (
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5">{rating.note}</p>
                                )}
                              </div>
                              <div
                                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: ratingColor }}
                              >
                                {ratingValue}
                              </div>
                            </div>
                          </ListCard>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ItemDetailsDrawer;
