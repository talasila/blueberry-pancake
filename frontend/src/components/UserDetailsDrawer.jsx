import { X, ArrowUpDown, ArrowUp, ArrowDown, Bookmark } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ratingService } from '@/services/ratingService';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';
import apiClient from '@/services/apiClient';
import { loadBookmarksFromServer, getBookmarks } from '@/utils/bookmarkStorage';

/**
 * UserDetailsDrawer Component
 * Slide-out drawer that displays user rating details including:
 * - Rating progress visualizations (progress bar, rated items circles, sparkline)
 * - List of all ratings with comments/notes
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Whether drawer is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.eventId - Event identifier
 * @param {string} props.userEmail - User email to display details for (if null, uses current user)
 * @param {object} props.ratingConfig - Rating configuration object
 * @param {Array<number>} props.availableItemIds - Array of available item IDs for calculating progress
 */
function UserDetailsDrawer({ 
  isOpen, 
  onClose, 
  eventId,
  userEmail: providedUserEmail = null,
  ratingConfig = null,
  availableItemIds = []
}) {
  const { event } = useEventContext();
  const { singular, pluralLower } = useItemTerminology(event);
  const [isAnimating, setIsAnimating] = useState(false);
  const hasBeenOpenedRef = useRef(false);
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [ratingConfiguration, setRatingConfiguration] = useState(ratingConfig);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [bookmarks, setBookmarks] = useState([]);

  // Get current user email from JWT token using apiClient utility
  useEffect(() => {
    const email = apiClient.getUserEmail();
    setCurrentUserEmail(email);
  }, []);

  // Use provided userEmail or fall back to current user
  const userEmail = providedUserEmail || currentUserEmail;
  const isCurrentUser = !providedUserEmail || (currentUserEmail && currentUserEmail.toLowerCase() === providedUserEmail.toLowerCase());

  // Load rating configuration if not provided
  useEffect(() => {
    if (eventId && event && !ratingConfiguration) {
      apiClient.getRatingConfiguration(eventId)
        .then(config => {
          setRatingConfiguration(config);
        })
        .catch(err => {
          console.error('Error loading rating configuration:', err);
          // Don't set fallback defaults - backend should always provide rating configuration
        });
    } else if (ratingConfig) {
      setRatingConfiguration(ratingConfig);
    }
  }, [eventId, event, ratingConfig]);

  // Get available item IDs from event if not provided
  const itemIds = useMemo(() => {
    if (availableItemIds.length > 0) {
      return availableItemIds;
    }
    if (event?.items && Array.isArray(event.items)) {
      return event.items.map(item => parseInt(item.itemId || item, 10)).filter(id => !isNaN(id));
    }
    return [];
  }, [availableItemIds, event]);

  // Track if drawer has ever been opened (for animation)
  useEffect(() => {
    if (isOpen) {
      hasBeenOpenedRef.current = true;
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Load user ratings when drawer opens
  useEffect(() => {
    if (isOpen && eventId && userEmail) {
      loadUserRatings();
    } else {
      // Reset state when drawer closes
      setRatings([]);
      setError(null);
    }
  }, [isOpen, eventId, userEmail]);

  // Load bookmarks when drawer opens (only for current user)
  useEffect(() => {
    if (isOpen && eventId && isCurrentUser) {
      loadBookmarks();
    } else {
      setBookmarks([]);
    }
  }, [isOpen, eventId, isCurrentUser]);

  // Listen for bookmark toggle events to refresh bookmarks
  useEffect(() => {
    if (!isOpen || !isCurrentUser) return;

    const handleBookmarkToggle = async () => {
      try {
        const bookmarkedItems = await loadBookmarksFromServer(eventId);
        setBookmarks(bookmarkedItems);
      } catch (error) {
        console.error('Error reloading bookmarks after toggle:', error);
        const cachedBookmarks = getBookmarks(eventId);
        setBookmarks(cachedBookmarks);
      }
    };

    window.addEventListener('bookmarkToggled', handleBookmarkToggle);
    return () => {
      window.removeEventListener('bookmarkToggled', handleBookmarkToggle);
    };
  }, [isOpen, eventId, isCurrentUser]);

  const loadBookmarks = async () => {
    if (!eventId || !isCurrentUser) return;
    
    try {
      const bookmarkedItems = await loadBookmarksFromServer(eventId);
      setBookmarks(bookmarkedItems);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      const cachedBookmarks = getBookmarks(eventId);
      setBookmarks(cachedBookmarks);
    }
  };

  const loadUserRatings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allRatings = await ratingService.getRatings(eventId);
      // Filter to specified user's ratings by email
      const userRatings = allRatings.filter(
        r => r.email && r.email.toLowerCase() === userEmail.toLowerCase()
      );
      setRatings(userRatings);
    } catch (err) {
      console.error('Error loading user ratings:', err);
      setError(err.message || 'Failed to load user ratings');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate user rating progress data
  const userRatingProgressData = useMemo(() => {
    if (!ratings || ratings.length === 0 || !itemIds.length) {
      return null;
    }

    const totalItems = itemIds.length;
    
    // Count unique items rated
    const uniqueItemsRated = new Set();
    ratings.forEach(rating => {
      const itemId = parseInt(rating.itemId, 10);
      if (!isNaN(itemId)) {
        uniqueItemsRated.add(itemId);
      }
    });
    const numberOfItemsRated = uniqueItemsRated.size;

    // Calculate rating progression (percentage of items rated)
    const ratingProgression = totalItems > 0 
      ? (numberOfItemsRated / totalItems) * 100 
      : 0;

    // Calculate rating distribution
    const ratingDistribution = {};
    const maxRating = ratingConfiguration?.maxRating || 4;
    for (let ratingValue = 1; ratingValue <= maxRating; ratingValue++) {
      ratingDistribution[ratingValue] = ratings.filter(
        r => parseInt(r.rating, 10) === ratingValue
      ).length;
    }

    // Get all ratings in order (sorted by timestamp, oldest to newest for sparkline)
    const sortedRatings = [...ratings]
      .sort((a, b) => {
        // Sort by timestamp (oldest to newest)
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (isNaN(aTime)) return 1;
        if (isNaN(bTime)) return -1;
        return aTime - bTime; // Ascending order (oldest first)
      })
      .map(rating => {
        const ratingValue = parseInt(rating.rating, 10);
        return isNaN(ratingValue) ? null : ratingValue;
      })
      .filter(rating => rating !== null);

    return {
      ratingProgression: parseFloat(ratingProgression.toFixed(2)),
      ratingDistribution,
      ratings: sortedRatings,
      totalRatings: ratings.length
    };
  }, [ratings, itemIds, ratingConfiguration]);

  // Get user display name
  const getUserDisplayName = () => {
    if (!userEmail) return 'User';
    const userData = event?.users?.[userEmail];
    if (userData?.name) return userData.name;
    // Derive from email by dropping @domain
    const parts = userEmail.split('@');
    return parts[0] || userEmail;
  };

  // Get rating color for a rating value
  const getRatingColor = (ratingValue) => {
    if (!ratingConfiguration?.ratings) return null;
    const ratingOption = ratingConfiguration.ratings.find(r => r.value === ratingValue);
    return ratingOption?.color || null;
  };

  // Get rating label for a rating value
  const getRatingLabel = (ratingValue) => {
    if (!ratingConfiguration?.ratings) return `${ratingValue}`;
    const ratingOption = ratingConfiguration.ratings.find(r => r.value === ratingValue);
    return ratingOption?.label || `${ratingValue}`;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (err) {
      return timestamp;
    }
  };

  // Handle column header click for sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Sort ratings based on selected column and direction
  const sortedRatings = useMemo(() => {
    return [...ratings].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case 'id':
          aValue = parseInt(a.itemId, 10);
          bValue = parseInt(b.itemId, 10);
          break;
        case 'rating':
          aValue = parseInt(a.rating, 10);
          bValue = parseInt(b.rating, 10);
          break;
        default:
          return 0;
      }

      // Handle NaN values (sort to end)
      if (isNaN(aValue)) return 1;
      if (isNaN(bValue)) return -1;

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ratings, sortColumn, sortDirection]);

  // Always render if drawer has been opened at least once (for proper cleanup)
  if (!isOpen && !hasBeenOpenedRef.current) {
    return null;
  }

  const displayName = getUserDisplayName();
  const title = isCurrentUser ? 'My Progress' : `${displayName}'s Progress`;

  return (
    <>
      {/* Backdrop */}
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
        aria-labelledby="user-details-title"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[75vh]">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
            <div>
              <h2 id="user-details-title" className="text-base font-semibold">
                {title}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Close user details drawer"
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
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadUserRatings}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Rating Progress Visualizations */}
                {userRatingProgressData && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Rating Progress</h3>
                    <div className="space-y-4">
                      {/* Combined Progress and History Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-medium">
                            {userRatingProgressData.ratingProgression.toFixed(1)}%
                          </span>
                        </div>
                        {userRatingProgressData.totalRatings > 0 ? (
                          <div
                            className="w-full h-5 bg-muted rounded-full overflow-hidden relative"
                            role="progressbar"
                            aria-valuenow={userRatingProgressData.ratingProgression}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${userRatingProgressData.ratingProgression.toFixed(0)}% complete`}
                          >
                            {/* Container for the filled portion (progress width) */}
                            <div
                              className="h-full flex"
                              style={{ width: `${userRatingProgressData.ratingProgression}%` }}
                            >
                              {/* Chronological history segments within the filled portion */}
                              {userRatingProgressData.ratings.map((ratingValue, index) => {
                                const ratingConfig = ratingConfiguration?.ratings?.find(r => r.value === ratingValue);
                                const color = ratingConfig?.color || '#6B7280';
                                const segmentWidth = 100 / userRatingProgressData.ratings.length;
                                
                                return (
                                  <div
                                    key={index}
                                    className="h-full transition-all"
                                    style={{
                                      width: `${segmentWidth}%`,
                                      backgroundColor: color,
                                      minWidth: '2px'
                                    }}
                                    title={`Rating ${ratingValue}${ratingConfig?.label ? `: ${ratingConfig.label}` : ''}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="w-full h-5 bg-muted rounded-full"
                            role="progressbar"
                            aria-valuenow={0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="0% complete"
                          />
                        )}
                      </div>

                      {/* Rated Items - grouped by rating in horizontal rows */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Distribution</span>
                          <span className="text-xs text-muted-foreground">Total: {userRatingProgressData.totalRatings}</span>
                        </div>
                        {userRatingProgressData.totalRatings > 0 ? (
                          <div className="space-y-1">
                            {ratingConfiguration?.ratings
                              ?.sort((a, b) => a.value - b.value) // Sort ascending (lowest rating first)
                              .map((ratingConfig) => {
                                // Filter ratings for this rating value
                                const itemsWithThisRating = sortedRatings.filter(
                                  rating => parseInt(rating.rating, 10) === ratingConfig.value
                                );
                                
                                // Skip if no items with this rating
                                if (itemsWithThisRating.length === 0) return null;
                                
                                return (
                                  <div key={ratingConfig.value} className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-4 text-right">{itemsWithThisRating.length}</span>
                                    <div className="flex gap-0.5">
                                      {itemsWithThisRating.map((rating, index) => (
                                        <div
                                          key={`${rating.itemId}-${index}`}
                                          className="w-2 h-2 rounded-full shadow-sm cursor-help"
                                          style={{ backgroundColor: ratingConfig.color }}
                                          title={`${singular} ${rating.itemId}: ${ratingConfig.label || ratingConfig.value}${rating.note ? '\n' + rating.note : ''}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center py-2">No ratings</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* All Ratings Table */}
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    All Ratings ({sortedRatings.length})
                  </h3>
                  {sortedRatings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No ratings yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b">
                            <th
                              className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50"
                              onClick={() => handleSort('id')}
                            >
                              <div className="flex items-center">
                                ID
                                {renderSortIcon('id')}
                              </div>
                            </th>
                            <th
                              className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50"
                              onClick={() => handleSort('rating')}
                            >
                              <div className="flex items-center">
                                Rating & Comment
                                {renderSortIcon('rating')}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRatings.map((rating, index) => {
                            const ratingValue = parseInt(rating.rating, 10);
                            const ratingColor = getRatingColor(ratingValue);
                            const hasNote = rating.note && rating.note.trim();

                            return (
                              <tr
                                key={`${rating.itemId}-${rating.timestamp}-${index}`}
                                className="border-b"
                              >
                                <td className="p-2 align-top">
                                  <div className="flex items-start gap-2">
                                    <span className="font-medium">
                                      {rating.itemId}
                                    </span>
                                    {isCurrentUser && bookmarks.includes(rating.itemId) && (
                                      <Bookmark 
                                        className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" 
                                        aria-label="Bookmarked"
                                      />
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="flex items-start gap-3">
                                    {ratingColor ? (
                                      <div
                                        className="inline-flex items-center justify-center rounded-full text-xs font-medium flex-shrink-0"
                                        style={{
                                          backgroundColor: ratingColor,
                                          color: '#ffffff',
                                          width: '24px',
                                          height: '24px'
                                        }}
                                      >
                                        {ratingValue}
                                      </div>
                                    ) : (
                                      <div
                                        className="inline-flex items-center justify-center rounded-full text-xs font-medium bg-muted text-muted-foreground flex-shrink-0"
                                        style={{
                                          width: '24px',
                                          height: '24px'
                                        }}
                                      >
                                        {ratingValue}
                                      </div>
                                    )}
                                    {hasNote ? (
                                      <p className="text-sm text-foreground whitespace-pre-wrap flex-1">
                                        {rating.note}
                                      </p>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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

export default UserDetailsDrawer;

