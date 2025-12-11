import { X, Medal } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import RatingDistribution from '@/components/RatingDistribution';
import itemService from '@/services/itemService';
import { ratingService } from '@/services/ratingService';
import dashboardService from '@/services/dashboardService';
import { useItemTerminology } from '@/utils/itemTerminology';
import { useEventContext } from '@/contexts/EventContext';
import apiClient from '@/services/apiClient';
import { usePIN } from '@/contexts/PINContext';
import { calculateWeightedAverage } from '@/utils/bayesianAverage';

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
  const { pinVerified } = usePIN();
  const openStartTimeRef = useRef(null);
  const hasBeenOpenedRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [cachedDashboardData, setCachedDashboardData] = useState(null);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

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

  // Get user email on mount and when drawer opens
  useEffect(() => {
    if (isOpen && eventId) {
      // Try to get email from JWT token
      const jwtToken = apiClient.getJWTToken();
      let email = null;
      
      if (jwtToken) {
        try {
          const parts = jwtToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            email = payload.email || null;
          }
        } catch (error) {
          console.error('Error extracting email from token:', error);
        }
      }
      
      // If no email from JWT, try PIN session
      if (!email && eventId) {
        const pinEmail = sessionStorage.getItem(`event:${eventId}:email`);
        if (pinEmail) {
          email = pinEmail;
        }
      }
      
      setUserEmail(email);
    }
  }, [isOpen, eventId]);

  // Fetch dashboard data for ranking (cached per session)
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!eventId || !isOpen || cachedDashboardData) return; // Already cached or drawer closed

      setIsLoadingRanking(true);
      try {
        const data = await dashboardService.getDashboardData(eventId);
        setCachedDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data for ranking:', err);
        // Don't show error, just log it - ranking is optional
      } finally {
        setIsLoadingRanking(false);
      }
    };

    if (isOpen && eventId && eventState === 'completed') {
      fetchDashboardData();
    }
  }, [isOpen, eventId, eventState, cachedDashboardData]);

  // Fetch item details and ratings when drawer opens
  useEffect(() => {
    if (isOpen && eventId && itemId && eventState === 'completed') {
      fetchItemDetails();
      fetchRatings();
    } else {
      // Reset state when drawer closes (but keep cached dashboard data)
      setItem(null);
      setError(null);
      setRatings([]);
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
      // If item not found, don't set error - we'll still show the drawer with available info
      if (err.message && err.message.includes('not found')) {
        setItem(null); // Explicitly set to null to indicate no item registered
      } else {
        setError(err.message || 'Failed to load item details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [allRatings, setAllRatings] = useState([]);

  const fetchRatings = async () => {
    if (!eventId || !itemId) return;

    setIsLoadingRatings(true);
    try {
      const allRatingsData = await ratingService.getRatings(eventId);
      setAllRatings(allRatingsData);
      // Filter ratings for this specific item
      const itemRatings = allRatingsData.filter(r => r.itemId === itemId);
      setRatings(itemRatings);
    } catch (err) {
      console.error('Error fetching ratings:', err);
      // Don't show error for ratings, just log it
      setRatings([]);
      setAllRatings([]);
    } finally {
      setIsLoadingRatings(false);
    }
  };

  // Calculate rating distribution for this item
  const ratingDistribution = useMemo(() => {
    if (!ratings.length || !itemId) return {};

    const distribution = {};
    ratings.forEach(rating => {
      const value = rating.rating;
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return distribution;
  }, [ratings, itemId]);

  const totalRatings = ratings.length;
  const ratingConfiguration = event?.ratingConfiguration?.ratings || [];

  // Calculate average rating for this item
  const averageRating = useMemo(() => {
    if (!ratings.length) return null;
    const sum = ratings.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 0), 0);
    const avg = sum / ratings.length;
    return isNaN(avg) ? null : parseFloat(avg.toFixed(2));
  }, [ratings]);

  // Calculate global average and weighted average
  const { globalAverage, weightedAverage, totalUsers } = useMemo(() => {
    // Calculate global average from all ratings
    let globalAvg = null;
    if (allRatings.length > 0) {
      const sum = allRatings.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 0), 0);
      globalAvg = sum / allRatings.length;
      globalAvg = isNaN(globalAvg) ? null : parseFloat(globalAvg.toFixed(2));
    }

    // Count total unique users
    const uniqueUsers = new Set();
    allRatings.forEach(r => {
      if (r.email) {
        uniqueUsers.add(r.email.toLowerCase().trim());
      }
    });
    const totalUsersCount = uniqueUsers.size;

    // Calculate weighted average using Bayesian formula
    let weightedAvg = null;
    if (globalAvg !== null && totalUsersCount > 0 && ratings.length > 0) {
      const sumOfRatings = ratings.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 0), 0);
      const numberOfRaters = ratings.length;
      weightedAvg = calculateWeightedAverage(globalAvg, totalUsersCount, numberOfRaters, sumOfRatings);
      weightedAvg = weightedAvg !== null ? parseFloat(weightedAvg.toFixed(2)) : null;
    }

    return {
      globalAverage: globalAvg,
      weightedAverage: weightedAvg,
      totalUsers: totalUsersCount
    };
  }, [allRatings, ratings]);

  // Get current user's rating for this item
  const userRating = useMemo(() => {
    if (!userEmail || !ratings.length) return null;
    const normalizedUserEmail = userEmail.toLowerCase().trim();
    return ratings.find(r => r.email?.toLowerCase().trim() === normalizedUserEmail) || null;
  }, [ratings, userEmail]);

  // Calculate item ranking based on weighted average
  const itemRank = useMemo(() => {
    if (!cachedDashboardData?.itemSummaries || !itemId) return null;

    const itemSummaries = cachedDashboardData.itemSummaries;
    
    // Sort by weightedAverage descending (nulls go to end)
    const sorted = [...itemSummaries].sort((a, b) => {
      const aVal = a.weightedAverage ?? -1;
      const bVal = b.weightedAverage ?? -1;
      
      // Handle nulls (put at end)
      if (aVal === -1 && bVal === -1) return 0;
      if (aVal === -1) return 1;
      if (bVal === -1) return -1;
      
      // Sort descending
      return bVal - aVal;
    });

    // Find position of current item
    const rank = sorted.findIndex(item => item.itemId === itemId);
    
    // If item not found or has no weighted average, return null
    if (rank === -1 || sorted[rank]?.weightedAverage === null) {
      return null;
    }

    return rank + 1; // 1-based ranking
  }, [cachedDashboardData, itemId]);

  // Get all comments (ratings with notes) sorted with user's comment first
  const comments = useMemo(() => {
    if (!ratings.length) return [];
    
    const commentsWithData = ratings
      .filter(r => r.note && r.note.trim())
      .map(rating => {
        const userData = event?.users?.[rating.email];
        return {
          ...rating,
          userName: userData?.name || null
        };
      });

    // Sort: user's comment first, then others by timestamp (newest first)
    const normalizedUserEmail = userEmail?.toLowerCase().trim();
    return commentsWithData.sort((a, b) => {
      const aIsUser = a.email?.toLowerCase().trim() === normalizedUserEmail;
      const bIsUser = b.email?.toLowerCase().trim() === normalizedUserEmail;
      
      if (aIsUser && !bIsUser) return -1;
      if (!aIsUser && bIsUser) return 1;
      
      // Both same type, sort by timestamp (newest first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [ratings, event, userEmail]);

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
              {item ? `${singular} ${item.itemId} Details` : `${singular} ${itemId} Details`}
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
            ) : (
              <div className="space-y-4">
                {/* Bottle Details Container */}
                <div className="p-3 border rounded-md bg-muted/30">
                  <div className="space-y-3">
                    {/* Header with ranking badge */}
                    <div className="flex items-start justify-between gap-3">
                      {item ? (
                        <>
                          {/* Name with price - name prominent, price de-emphasized */}
                          <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                            <p className="text-lg font-semibold break-words">{item.name}</p>
                            {item.price !== null && item.price !== undefined && (
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                (${typeof item.price === 'number' ? item.price.toFixed(2) : item.price})
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">No item registered for this ID</p>
                        </div>
                      )}
                      {itemRank !== null && (
                        <Badge 
                          variant="default" 
                          className={`text-sm font-semibold whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                            itemRank === 1
                              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 border-yellow-600 shadow-md dark:from-yellow-500 dark:to-yellow-600 dark:text-yellow-50 dark:border-yellow-700 hover:from-yellow-400 hover:to-yellow-500 hover:text-yellow-950 hover:border-yellow-600 dark:hover:from-yellow-500 dark:hover:to-yellow-600 dark:hover:text-yellow-50 dark:hover:border-yellow-700'
                              : itemRank === 2
                              ? 'bg-slate-300 text-slate-800 border-slate-400 dark:bg-slate-500 dark:text-slate-50 dark:border-slate-600 hover:bg-slate-300 hover:text-slate-800 hover:border-slate-400 dark:hover:bg-slate-500 dark:hover:text-slate-50 dark:hover:border-slate-600'
                              : itemRank === 3
                              ? 'bg-amber-700 text-amber-50 border-amber-800 dark:bg-amber-800 dark:text-amber-50 dark:border-amber-900 hover:bg-amber-700 hover:text-amber-50 hover:border-amber-800 dark:hover:bg-amber-800 dark:hover:text-amber-50 dark:hover:border-amber-900'
                              : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {itemRank === 1 && <Medal className="h-3 w-3" />}
                          Ranked #{itemRank}
                        </Badge>
                      )}
                    </div>

                    {/* Owner - show name if available, otherwise email (only if item exists) */}
                    {item && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {event?.users && event.users[item.ownerEmail]?.name
                            ? `${event.users[item.ownerEmail].name} (${item.ownerEmail})`
                            : item.ownerEmail}
                        </span>
                      </div>
                    )}

                    {/* Description - if available (only if item exists) */}
                    {item?.description && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ratings Distribution */}
                <div className="pt-3">
                  <div className="text-sm font-bold text-muted-foreground mb-2">
                    Ratings Distribution
                  </div>
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

                      {/* Enhanced distribution with inline counts */}
                      {totalRatings > 0 ? (
                        <div className="w-full">
                          <div className="w-full h-5 bg-muted rounded-full overflow-hidden flex relative">
                            {ratingConfiguration
                              .sort((a, b) => a.value - b.value)
                              .map((rating) => {
                                const count = ratingDistribution[rating.value] || 0;
                                const percentage = count > 0 ? (count / totalRatings) * 100 : 0;
                                
                                if (count === 0) return null;
                                
                                return (
                                  <div
                                    key={rating.value}
                                    className="h-full relative group"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: rating.color,
                                      minWidth: percentage > 0 ? '2px' : '0'
                                    }}
                                    title={`Rating ${rating.value}: ${count} ${count === 1 ? 'rating' : 'ratings'} (${percentage.toFixed(1)}%)`}
                                  >
                                    {/* Show count on larger segments */}
                                    {percentage >= 8 && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                          {count}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                          {/* Compact count summary below bar */}
                          <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                            <span>Total: {totalRatings}</span>
                            <div className="flex gap-2">
                              {ratingConfiguration
                                .sort((a, b) => a.value - b.value)
                                .filter(rating => (ratingDistribution[rating.value] || 0) > 0)
                                .map(rating => {
                                  const count = ratingDistribution[rating.value] || 0;
                                  return (
                                    <span key={rating.value}>
                                      <span
                                        className="inline-block w-1.5 h-1.5 rounded-full mr-0.5"
                                        style={{ backgroundColor: rating.color }}
                                      />
                                      {count}
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-5 bg-muted rounded-full">
                          <div className="text-xs text-muted-foreground mt-1 text-center">No ratings</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                {comments.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-sm font-bold text-muted-foreground mb-2">
                      Comments
                    </div>
                    <div className="space-y-3">
                      {comments.map((comment, index) => {
                        const isCurrentUser = userEmail && comment.email?.toLowerCase().trim() === userEmail.toLowerCase().trim();
                        const ratingColor = ratingConfiguration.find(r => r.value === comment.rating)?.color || '#6B7280';
                        
                        return (
                          <div
                            key={`${comment.email}-${comment.timestamp}`}
                            className={`${isCurrentUser ? 'bg-muted/30' : ''}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                                style={{ backgroundColor: ratingColor }}
                              >
                                {comment.rating}
                              </div>
                              <span className="text-xs font-medium">
                                {comment.userName || comment.email}
                                {isCurrentUser && <span className="text-muted-foreground ml-1">(You)</span>}
                              </span>
                            </div>
                            <p className="text-xs text-foreground whitespace-pre-wrap ml-7">
                              {comment.note}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ItemDetailsDrawer;
