import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import apiClient from '@/services/apiClient';
import { ratingService } from '@/services/ratingService';
import dashboardService from '@/services/dashboardService';
import { getBookmarks, loadBookmarksFromServer } from '@/utils/bookmarkStorage';
import ItemButton from '@/components/ItemButton';
import RatingDrawer from '@/components/RatingDrawer';
import SimilarUsersDrawer from '@/components/SimilarUsersDrawer';
import ItemDetailsDrawer from '@/components/ItemDetailsDrawer';
import UserDetailsDrawer from '@/components/UserDetailsDrawer';
import RatingErrorBoundary from '@/components/RatingErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Users, BarChart3 } from 'lucide-react';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * EventPage Component
 * 
 * Displays the main event page where users can view event details
 * and participate in rating items/bottles.
 * 
 * Features:
 * - Displays event data from context (provided by EventRouteWrapper)
 * - Polls for event state updates
 * - Shows loading state while fetching
 * - Handles error states (404, network errors)
 * - Displays event information (name, state, typeOfItem)
 * - Validates event state before allowing actions
 */
function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event: contextEvent, isAdmin } = useEventContext();
  const { pluralLower } = useItemTerminology(contextEvent);
  
  // Check authentication synchronously before any API calls
  const jwtToken = apiClient.getJWTToken();
  const hasAuth = !!jwtToken;
  
  const [event, setEvent] = useState(contextEvent);
  const [isLoading, setIsLoading] = useState(!contextEvent);
  const [error, setError] = useState(null);
  const [availableItemIds, setAvailableItemIds] = useState([]);
  const [openDrawerItemId, setOpenDrawerItemId] = useState(null);
  const [openItemDetailsItemId, setOpenItemDetailsItemId] = useState(null);
  const [isSimilarUsersDrawerOpen, setIsSimilarUsersDrawerOpen] = useState(false);
  const [isUserDetailsDrawerOpen, setIsUserDetailsDrawerOpen] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [ratingConfig, setRatingConfig] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const loadStartTimeRef = useRef(null);

  // Redirect to PIN entry if no authentication - must happen immediately
  // Use a ref to track if we've already checked to avoid multiple redirects
  const redirectCheckedRef = useRef(false);
  
  useEffect(() => {
    if (!eventId || redirectCheckedRef.current) return;
    
    const currentJwtToken = apiClient.getJWTToken();
    
    // If no JWT token, redirect to email entry immediately
    if (!currentJwtToken) {
      redirectCheckedRef.current = true;
      navigate(`/event/${eventId}/email`, { replace: true });
      return;
    }
    
    redirectCheckedRef.current = true;
  }, [eventId, navigate]);

  // Only start polling if we have authentication - pass null to prevent fetching
  // Wait for redirect check to complete before starting polling
  const { event: polledEvent, refetch } = useEventPolling(
    hasAuth && redirectCheckedRef.current ? eventId : null
  );

  // Handle invalid authentication - redirect if API returns 401
  useEffect(() => {
    if (error && error.includes('401')) {
      // Clear JWT token and redirect to email entry
      if (eventId) {
        apiClient.clearJWTToken();
        navigate(`/event/${eventId}/email`, { replace: true });
      }
    }
  }, [error, eventId, navigate]);

  // Performance monitoring: track page load time
  useEffect(() => {
    if (!loadStartTimeRef.current) {
      loadStartTimeRef.current = performance.now();
    }
    
    if (event && !isLoading) {
      const loadTime = performance.now() - loadStartTimeRef.current;
      if (loadTime > 2000) {
        console.warn(`Event page load time: ${loadTime.toFixed(2)}ms (exceeds 2s target)`);
      } else {
        console.log(`Event page load time: ${loadTime.toFixed(2)}ms`);
      }
    }
  }, [event, isLoading]);

  // Update event when context or polling updates
  useEffect(() => {
    if (polledEvent) {
      setEvent(polledEvent);
      setIsLoading(false);
      setError(null);
    } else if (contextEvent) {
      setEvent(contextEvent);
      setIsLoading(false);
      setError(null);
    }
  }, [contextEvent, polledEvent]);

  // Generate available item IDs based on itemConfiguration
  useEffect(() => {
    if (event) {
      const config = event.itemConfiguration || {
        numberOfItems: 20,
        excludedItemIds: []
      };
      
      // Generate all item IDs from 1 to numberOfItems
      const allIds = Array.from(
        { length: config.numberOfItems }, 
        (_, i) => i + 1
      );
      
      // Filter out excluded IDs
      const available = allIds.filter(
        id => !config.excludedItemIds.includes(id)
      );
      
      setAvailableItemIds(available);
    }
  }, [event]);

  // Get user email from JWT token
  useEffect(() => {
    const token = apiClient.getJWTToken();
    if (token) {
      try {
        // Decode JWT token to get email (simple base64 decode, no verification needed for reading)
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.email) {
          setUserEmail(payload.email);
          return;
        }
      } catch (err) {
        console.error('Error decoding JWT token:', err);
      }
    }

    setUserEmail(null);
  }, [eventId]);

  // Load rating configuration
  useEffect(() => {
    if (eventId && event) {
      apiClient.getRatingConfiguration(eventId)
        .then(config => {
          setRatingConfig(config);
        })
        .catch(err => {
          console.error('Error loading rating configuration:', err);
          // Use defaults if API fails
          setRatingConfig({
            maxRating: 4,
            ratings: [
              { value: 1, label: 'What is this crap?', color: '#FF3B30' },
              { value: 2, label: 'Meh...', color: '#FFCC00' },
              { value: 3, label: 'Not bad...', color: '#34C759' },
              { value: 4, label: 'Give me more...', color: '#28A745' }
            ]
          });
        });
    }
  }, [eventId, event]);

  // Load user's ratings (T082 - with loading state)
  const loadRatings = () => {
    if (eventId && hasAuth && redirectCheckedRef.current && userEmail) {
      setRatingsLoading(true);
      ratingService.getRatings(eventId)
        .then(allRatings => {
          // Filter to current user's ratings by email
          const userRatings = allRatings.filter(
            r => r.email && r.email.toLowerCase() === userEmail.toLowerCase()
          );
          setRatings(userRatings);
        })
        .catch(err => {
          console.error('Error loading ratings:', err);
          setRatings([]);
        })
        .finally(() => {
          setRatingsLoading(false);
        });
    }
  };

  useEffect(() => {
    loadRatings();
  }, [eventId, hasAuth, userEmail]);

  // Fetch dashboard data when event is completed to determine winners
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (event?.state === 'completed' && eventId) {
        try {
          const data = await dashboardService.getDashboardData(eventId);
          setDashboardData(data);
        } catch (err) {
          console.error('Error fetching dashboard data for winners:', err);
          // Don't show error, just log it - winner display is optional
        }
      } else {
        setDashboardData(null);
      }
    };

    fetchDashboardData();
  }, [event?.state, eventId]);

  // Calculate winner item IDs (ranked #1, including ties)
  const winnerItemIds = useMemo(() => {
    if (!dashboardData?.itemSummaries || dashboardData.itemSummaries.length === 0) {
      return new Set();
    }

    const itemSummaries = dashboardData.itemSummaries;
    
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

    // If no items have weighted averages, no winners
    if (sorted.length === 0 || sorted[0].weightedAverage === null) {
      return new Set();
    }

    // Get the highest weighted average
    const highestWeightedAvg = sorted[0].weightedAverage;
    
    // Find all items with the same highest weighted average (ties)
    const winners = sorted
      .filter(item => item.weightedAverage === highestWeightedAvg && item.itemId !== null && item.itemId !== undefined)
      .map(item => item.itemId);

    return new Set(winners);
  }, [dashboardData]);

  // Listen for rating submission events to refresh ratings
  useEffect(() => {
    const handleRatingSubmitted = (event) => {
      if (event.detail.eventId === eventId) {
        loadRatings();
      }
    };

    window.addEventListener('ratingSubmitted', handleRatingSubmitted);
    return () => {
      window.removeEventListener('ratingSubmitted', handleRatingSubmitted);
    };
  }, [eventId, hasAuth, userEmail]);

  // Listen for bookmark toggle events to refresh bookmarks
  useEffect(() => {
    const handleBookmarkToggled = async (event) => {
      if (event.detail.eventId === eventId && userEmail) {
        // Reload from server to ensure sync
        try {
          const bookmarkedItems = await loadBookmarksFromServer(eventId);
          setBookmarks(bookmarkedItems);
        } catch (error) {
          console.error('Error reloading bookmarks after toggle:', error);
          // Fallback to local cache
          const cachedBookmarks = getBookmarks(eventId);
          setBookmarks(cachedBookmarks);
        }
      } else if (event.detail.eventId === eventId) {
        // If no userEmail, just use local cache
        const bookmarkedItems = getBookmarks(eventId);
        setBookmarks(bookmarkedItems);
      }
    };

    window.addEventListener('bookmarkToggled', handleBookmarkToggled);
    return () => {
      window.removeEventListener('bookmarkToggled', handleBookmarkToggled);
    };
  }, [eventId, userEmail]);

  // Load bookmarks from server on mount
  useEffect(() => {
    if (eventId && userEmail) {
      loadBookmarksFromServer(eventId)
        .then(bookmarkedItems => {
          setBookmarks(bookmarkedItems);
        })
        .catch(error => {
          console.error('Error loading bookmarks:', error);
          // Fallback to local cache
          const cachedBookmarks = getBookmarks(eventId);
          setBookmarks(cachedBookmarks);
        });
    } else if (eventId) {
      // If no userEmail yet, use cached bookmarks
      const cachedBookmarks = getBookmarks(eventId);
      setBookmarks(cachedBookmarks);
    }
  }, [eventId, userEmail]);

  // Validate event state before allowing actions (e.g., rating)
  const validateEventState = (action) => {
    if (!event) {
      return { valid: false, error: 'Event data not available' };
    }

    if (event.state === 'paused' || event.state === 'finished') {
      return { valid: false, error: 'Event is paused. Rating is not available.' };
    }

    if (event.state === 'completed' || event.state === 'finished') {
      return { valid: false, error: 'Event is completed. Rating is no longer available.' };
    }

    if (event.state === 'created') {
      // Event is in created state - rating might not be available yet
      // This is a placeholder for future rating functionality
      return { valid: false, error: 'Event has not started yet. Rating is not available.' };
    }

    // Only "started" state allows feedback
    if (event.state === 'started') {
      return { valid: true };
    }

    return { valid: false, error: 'Event state does not allow rating.' };
  };

  // Handle item button click - open drawer
  const handleItemClick = (itemId) => {
    // Close similar users drawer if open
    if (isSimilarUsersDrawerOpen) {
      setIsSimilarUsersDrawerOpen(false);
    }
    
    // If event is completed, open item details drawer instead of rating drawer
    if (event?.state === 'completed') {
      if (openItemDetailsItemId && openItemDetailsItemId !== itemId) {
        setOpenItemDetailsItemId(null);
        setTimeout(() => setOpenItemDetailsItemId(itemId), 100);
      } else {
        setOpenItemDetailsItemId(itemId);
      }
      setOpenDrawerItemId(null); // Ensure rating drawer is closed
    } else {
      // For non-completed states, open rating drawer
      if (openDrawerItemId && openDrawerItemId !== itemId) {
        setOpenDrawerItemId(null);
        setTimeout(() => setOpenDrawerItemId(itemId), 100);
      } else {
        setOpenDrawerItemId(itemId);
      }
      setOpenItemDetailsItemId(null); // Ensure item details drawer is closed
    }
    setError(null); // Clear any previous errors
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setOpenDrawerItemId(null);
  };

  // Handle item details drawer close
  const handleItemDetailsDrawerClose = () => {
    setOpenItemDetailsItemId(null);
  };

  // Handle similar users drawer close
  const handleSimilarUsersDrawerClose = () => {
    setIsSimilarUsersDrawerOpen(false);
  };

  // Handle similar users button click
  const handleSimilarUsersClick = () => {
    // Close rating drawer if open
    if (openDrawerItemId) {
      setOpenDrawerItemId(null);
      // Small delay to allow close animation
      setTimeout(() => setIsSimilarUsersDrawerOpen(true), 100);
    } else {
      setIsSimilarUsersDrawerOpen(true);
    }
  };

  // Handle user details drawer close
  const handleUserDetailsDrawerClose = () => {
    setIsUserDetailsDrawerOpen(false);
  };

  // Handle my progress button click
  const handleMyProgressClick = () => {
    // Close other drawers if open
    if (openDrawerItemId) {
      setOpenDrawerItemId(null);
    }
    if (isSimilarUsersDrawerOpen) {
      setIsSimilarUsersDrawerOpen(false);
    }
    // Small delay to allow close animation
    setTimeout(() => setIsUserDetailsDrawerOpen(true), 100);
  };

  // Calculate user rating progress data
  const userRatingProgressData = useMemo(() => {
    if (!ratings || ratings.length === 0 || !availableItemIds.length) {
      return null;
    }

    const totalItems = availableItemIds.length;
    
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
    const maxRating = ratingConfig?.maxRating || 4;
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
  }, [ratings, availableItemIds, ratingConfig]);

  // Check if user has rated at least 3 items (for button visibility)
  const hasMinimumRatings = () => {
    if (!userEmail || !ratings.length) return false;
    const userRatings = ratings.filter(r => r.email.toLowerCase() === userEmail.toLowerCase());
    return userRatings.length >= 3;
  };

  // Get user's rating for a specific item
  const getUserRating = (itemId) => {
    if (!userEmail || !ratings.length) return null;
    // Filter ratings by user email
    return ratings.find(r => r.itemId === itemId && r.email.toLowerCase() === userEmail.toLowerCase()) || null;
  };

  // Get rating color for an item
  const getRatingColor = (itemId) => {
    const rating = getUserRating(itemId);
    if (!rating || !ratingConfig) return null;
    
    const ratingOption = ratingConfig.ratings.find(r => r.value === rating.rating);
    return ratingOption?.color || null;
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-muted-foreground">Loading event...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !event) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] px-4">
        <div className="max-w-md w-full">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">
              {error.includes('not found') || error.includes('Event not found')
                ? 'Event not found. Please check the event ID.'
                : 'Unable to load event. Please check your connection and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Event data loaded
  if (!event) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">No event data available</div>
      </div>
    );
  }

  return (
    <RatingErrorBoundary>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto w-full">
          {/* Loading state for ratings (T082) */}
          {ratingsLoading && (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          )}

          {/* Item buttons in dialpad layout */}
          {availableItemIds.length > 0 && (
            <div className="space-y-4">
              {event?.state === 'started' && (
                <p className="text-center text-sm text-muted-foreground">
                  Tap a number to rate
                </p>
              )}
              {event?.state === 'created' && (
                <p className="text-center text-sm text-muted-foreground">
                  Event has not started yet
                </p>
              )}
              {event?.state === 'paused' && (
                <p className="text-center text-sm text-muted-foreground">
                  Event is paused
                </p>
              )}
              {event?.state === 'completed' && (
                <p className="text-center text-sm text-muted-foreground">
                  Tap a number to view details
                </p>
              )}
              <div className="flex justify-center">
                <div className="grid grid-cols-3 gap-6 justify-items-center" style={{ width: 'fit-content' }}>
                  {availableItemIds.map(itemId => (
                    <ItemButton
                      key={itemId}
                      itemId={itemId}
                      ratingColor={getRatingColor(itemId)}
                      isBookmarked={bookmarks.includes(itemId)}
                      isWinner={event?.state === 'completed' && winnerItemIds.has(itemId)}
                      onClick={() => handleItemClick(itemId)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {availableItemIds.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No {pluralLower} available for this event.
            </div>
          )}

          {/* Similar Tastes and My Progress buttons - only visible when user has 3+ ratings */}
          {hasMinimumRatings() && (event?.state === 'started' || event?.state === 'paused' || event?.state === 'completed') && (
            <div className="flex justify-center gap-3 mt-8">
              <Button
                onClick={handleSimilarUsersClick}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Similar Tastes
              </Button>
              {userRatingProgressData && (
                <Button
                  onClick={handleMyProgressClick}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  My Progress
                </Button>
              )}
            </div>
          )}

          {/* My Progress button - visible when user has at least 1 rating but less than 3 */}
          {!hasMinimumRatings() && userRatingProgressData && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleMyProgressClick}
                variant="outline"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                My Progress
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Similar Users Drawer */}
      <SimilarUsersDrawer
        isOpen={isSimilarUsersDrawerOpen}
        onClose={handleSimilarUsersDrawerClose}
        eventId={eventId}
        eventState={event?.state}
      />

      {/* User Details Drawer */}
      <UserDetailsDrawer
        isOpen={isUserDetailsDrawerOpen}
        onClose={handleUserDetailsDrawerClose}
        eventId={eventId}
        userEmail={userEmail}
        ratingConfig={ratingConfig}
        availableItemIds={availableItemIds}
      />

      {/* Rating Drawer - only render when event is not completed */}
      {event?.state !== 'completed' && (
        <RatingDrawer
          isOpen={!!openDrawerItemId}
          onClose={handleDrawerClose}
          eventState={event?.state}
          itemId={openDrawerItemId || 0}
          eventId={eventId}
          existingRating={openDrawerItemId ? getUserRating(openDrawerItemId) : null}
          ratingConfig={ratingConfig}
          eventType={event?.typeOfItem}
          noteSuggestionsEnabled={ratingConfig?.noteSuggestionsEnabled}
          userEmail={userEmail}
        />
      )}

      {/* Item Details Drawer - only render when event is completed */}
      {event?.state === 'completed' && (
        <ItemDetailsDrawer
          isOpen={!!openItemDetailsItemId}
          onClose={handleItemDetailsDrawerClose}
          eventId={eventId}
          itemId={openItemDetailsItemId || 0}
          eventState={event?.state}
        />
      )}
    </RatingErrorBoundary>
  );
}

export default EventPage;
