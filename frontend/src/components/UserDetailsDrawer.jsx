import { X, Bookmark } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ratingService } from '@/services/ratingService';
import { useEventContext } from '@/contexts/EventContext';
import apiClient from '@/services/apiClient';
import { loadBookmarksFromServer, getBookmarks } from '@/utils/bookmarkStorage';
import { calculateUserRatingProgress } from '@/utils/ratingProgress';
import { detectPersonality } from '@/utils/personalityDetection';
import { getPersonalityName } from '@/utils/personalityContent';
import { useItemTerminology } from '@/utils/itemTerminology';
import PersonalityCard from '@/components/PersonalityCard';
import ListCard from '@/components/ListCard';

/**
 * UserDetailsDrawer Component
 * Bottom drawer showing a user's rating timeline, distribution summary,
 * and sortable card list of individual ratings with notes.
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
  const { singularLower: itemSingular, pluralLower: itemPlural } = useItemTerminology(event);
  const [isAnimating, setIsAnimating] = useState(false);
  const hasBeenOpenedRef = useRef(false);
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [ratingConfiguration, setRatingConfiguration] = useState(ratingConfig);
  const [sortColumn, setSortColumn] = useState('time');
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

  const userRatingProgressData = useMemo(
    () => calculateUserRatingProgress(ratings, itemIds, ratingConfiguration?.maxRating || 4),
    [ratings, itemIds, ratingConfiguration]
  );

  // Personality detection (current user, wine events, active states only, when enabled)
  const isWineEvent = event?.typeOfItem === 'wine';
  const isActiveState = ['started', 'paused', 'completed'].includes(event?.state);
  const isPersonalityEnabled = ratingConfig?.personalityEnabled !== false;

  const personalityId = useMemo(() => {
    if (!isPersonalityEnabled || !isWineEvent || !isActiveState || !isCurrentUser || ratings.length === 0) return null;

    const sortedByTime = [...ratings].sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return at - bt;
    });

    const maxRating = ratingConfiguration?.maxRating || 4;
    const ratingValues = sortedByTime.map(r => parseInt(r.rating, 10)).filter(v => !isNaN(v));
    const distribution = {};
    for (let v = 1; v <= maxRating; v++) distribution[v] = 0;
    ratingValues.forEach(v => { distribution[v] = (distribution[v] || 0) + 1; });

    const avg = ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length;
    const notesWithContent = ratings.filter(r => r.note && r.note.trim());
    const timestamps = sortedByTime.map(r => r.timestamp).filter(Boolean);

    return detectPersonality({
      ratings: ratingValues,
      ratingDistribution: distribution,
      averageRating: avg,
      totalRatings: ratingValues.length,
      totalItems: itemIds.length,
      maxRating,
      noteCount: notesWithContent.length,
      noteLengths: notesWithContent.map(r => r.note.trim().length),
      earliestTimestamp: timestamps[0] || null,
      latestTimestamp: timestamps[timestamps.length - 1] || null,
    });
  }, [ratings, itemIds, ratingConfiguration, isWineEvent, isActiveState, isCurrentUser, isPersonalityEnabled]);

  // Shift detection via sessionStorage
  const previousPersonalityName = useMemo(() => {
    if (!personalityId || !eventId) return null;
    const key = `personality-${eventId}`;
    const stored = sessionStorage.getItem(key);
    sessionStorage.setItem(key, personalityId);
    if (stored && stored !== personalityId) {
      return getPersonalityName(stored);
    }
    return null;
  }, [personalityId, eventId]);

  // Template vars for quote interpolation
  const personalityTemplateVars = useMemo(() => {
    if (!personalityId || ratings.length === 0) return {};
    const ratingValues = ratings.map(r => parseInt(r.rating, 10)).filter(v => !isNaN(v));
    const avg = ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length;

    const distribution = {};
    ratingValues.forEach(v => { distribution[v] = (distribution[v] || 0) + 1; });
    const dominantValue = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0];

    const sortedByTime = [...ratings].sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return at - bt;
    });
    const timestamps = sortedByTime.map(r => r.timestamp).filter(Boolean);
    let minutes = '';
    if (timestamps.length >= 2) {
      const span = (new Date(timestamps[timestamps.length - 1]) - new Date(timestamps[0])) / 60000;
      minutes = Math.round(span).toString();
    }

    return {
      n: dominantValue || '',
      max: String(ratingConfiguration?.maxRating || 4),
      count: String(ratingValues.length),
      minutes,
      avg: avg.toFixed(1),
      preview: ratingValues.slice(0, 5).join(', '),
      item: itemSingular,
      items: itemPlural,
    };
  }, [personalityId, ratings, ratingConfiguration, itemSingular, itemPlural]);

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
        case 'time':
          aValue = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          bValue = b.timestamp ? new Date(b.timestamp).getTime() : 0;
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
          fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)]
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
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 rounded-t-lg" style={{ backgroundColor: 'var(--event-header-bg)' }}>
            <h2 id="user-details-title" className="text-base font-semibold">
              {title}
            </h2>
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
          <div className="flex-1 overflow-y-auto p-4">
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
                {/* Personality Card */}
                {personalityId && (
                  <PersonalityCard
                    personalityId={personalityId}
                    templateVars={personalityTemplateVars}
                    previousPersonality={previousPersonalityName}
                    ownerName="Your"
                    eventId={eventId}
                  />
                )}

                {/* Rating Visualizations */}
                {userRatingProgressData && (
                  <div className="space-y-5">
                    {/* Your Journey — chronological history bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Rating Timeline</span>
                        <span className="text-xs text-muted-foreground">
                          {userRatingProgressData.totalRatings} of {itemIds.length} rated
                        </span>
                      </div>
                      {userRatingProgressData.totalRatings > 0 ? (
                        <div
                          className="w-full h-5 bg-muted rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={userRatingProgressData.ratingProgression}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${userRatingProgressData.ratingProgression.toFixed(0)}% complete — ratings shown left to right in the order you rated them`}
                        >
                          <div
                            className="h-full flex"
                            style={{ width: `${userRatingProgressData.ratingProgression}%` }}
                          >
                            {userRatingProgressData.ratings.map((ratingValue, index) => {
                              const rc = ratingConfiguration?.ratings?.find(r => r.value === ratingValue);
                              const color = rc?.color || '#6B7280';
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
                      <p className="text-[10px] text-muted-foreground/70 mt-1">Each color is a rating, in the order {isCurrentUser ? 'you tasted them' : 'they were tasted'}</p>
                    </div>

                    {/* Rating Breakdown — stacked distribution bar + legend */}
                    <div>
                      <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Rating Breakdown</span>
                      {userRatingProgressData.totalRatings > 0 ? (
                        <>
                          <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                            {ratingConfiguration?.ratings
                              ?.slice()
                              .sort((a, b) => a.value - b.value)
                              .map((rc) => {
                                const count = sortedRatings.filter(
                                  r => parseInt(r.rating, 10) === rc.value
                                ).length;
                                if (count === 0) return null;
                                const pct = (count / userRatingProgressData.totalRatings) * 100;
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
                          {/* Legend */}
                          <div className="flex gap-2 mt-1.5">
                            {ratingConfiguration?.ratings
                              ?.slice()
                              .sort((a, b) => a.value - b.value)
                              .map((rc) => {
                                const count = sortedRatings.filter(
                                  r => parseInt(r.rating, 10) === rc.value
                                ).length;
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
                  </div>
                )}

                {/* Your Ratings list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{isCurrentUser ? 'Your' : `${displayName}'s`} Ratings</span>
                    {sortedRatings.length > 1 && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleSort('id')}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${sortColumn === 'id' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                        >
                          #{sortColumn === 'id' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSort('rating')}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${sortColumn === 'rating' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                        >
                          Rating{sortColumn === 'rating' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSort('time')}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${sortColumn === 'time' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                        >
                          Time{sortColumn === 'time' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                      </div>
                    )}
                  </div>
                  {sortedRatings.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No ratings yet — tap a number above to get started!
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {sortedRatings.map((rating, index) => {
                        const ratingValue = parseInt(rating.rating, 10);
                        const ratingColor = getRatingColor(ratingValue);
                        const hasNote = rating.note && rating.note.trim();
                        const isBookmarked = isCurrentUser && bookmarks.includes(rating.itemId);

                        return (
                          <ListCard
                            key={`${rating.itemId}-${rating.timestamp}-${index}`}
                            handle={rating.itemId}
                          >
                            <div className="flex items-center gap-2 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                {hasNote ? (
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{rating.note}</p>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{getRatingLabel(ratingValue)}</span>
                                )}
                              </div>
                              {isBookmarked && (
                                <Bookmark className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" aria-label="Bookmarked" />
                              )}
                              <div
                                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: ratingColor || 'var(--muted)' }}
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

export default UserDetailsDrawer;

