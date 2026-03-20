import { useEventContext } from '@/contexts/EventContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import apiClient from '@/services/apiClient';
import { ratingService } from '@/services/ratingService';
import { getBookmarks, loadBookmarksFromServer } from '@/utils/bookmarkStorage';
import ItemButton from '@/components/ItemButton';
import RatingDrawer from '@/components/RatingDrawer';
import SimilarUsersDrawer from '@/components/SimilarUsersDrawer';
import ItemDetailsDrawer from '@/components/ItemDetailsDrawer';
import UserDetailsDrawer from '@/components/UserDetailsDrawer';
import RatingErrorBoundary from '@/components/RatingErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useItemTerminology } from '@/utils/itemTerminology';
import { calculateUserRatingProgress } from '@/utils/ratingProgress';
import { deriveItemRaterCounts } from '@/utils/participationCounts';
import { getMinimumThreshold } from '@/utils/personalityDetection';
import GuestWelcomeBottomSheet from '@/components/GuestWelcomeBottomSheet';
import PersonalityRevealSheet from '@/components/PersonalityRevealSheet';
import MyProgressButton from '@/components/MyProgressButton';
import itemService from '@/services/itemService';

/**
 * EventPage Component
 * 
 * Displays the main event page where users can view event details
 * and participate in rating items/bottles.
 * 
 * Features:
 * - Displays event data from context (provided by EventContextProviderForRoute, which handles polling)
 * - Shows loading state while fetching
 * - Handles error states (404, network errors)
 * - Displays event information (name, state, typeOfItem)
 * - Validates event state before allowing actions
 */
function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { event: contextEvent, isAdmin, refetch } = useEventContext();
  const { singular, pluralLower } = useItemTerminology(contextEvent);
  
  const hasAuth = apiClient.hasEventAccess(eventId);

  const [showGuestWelcome, setShowGuestWelcome] = useState(false);
  const hasCheckedGuestWelcomeRef = useRef(false);
  const [userItemCount, setUserItemCount] = useState(0);
  
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
  const [itemRaterCounts, setItemRaterCounts] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [showPersonalityReveal, setShowPersonalityReveal] = useState(false);
  const [pendingRevealCheck, setPendingRevealCheck] = useState(false);
  const hadPersonalityBeforeDrawerRef = useRef(false);
  const ratingConfigFetchedRef = useRef(null);

  // Redirect to PIN entry if no authentication - must happen immediately
  // Use a ref to track if we've already checked to avoid multiple redirects
  const redirectCheckedForEventRef = useRef(null);
  
  useEffect(() => {
    if (!eventId) return;
    if (redirectCheckedForEventRef.current === eventId) return;
    
    if (!apiClient.hasEventAccess(eventId)) {
      redirectCheckedForEventRef.current = eventId;
      navigate(`/event/${eventId}/email`, { replace: true });
      return;
    }
    
    redirectCheckedForEventRef.current = eventId;
  }, [eventId, navigate]);

  // Fetch latest event data on mount so in-app navigation always shows fresh state
  useEffect(() => {
    if (hasAuth) {
      refetch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Update event when context updates (context is already being polled by EventContextProviderForRoute)
  useEffect(() => {
    if (contextEvent) {
      setEvent(contextEvent);
      setIsLoading(false);
      setError(null);
      if (contextEvent.state === 'started') loadRatings();
    }
  }, [contextEvent]);

  // Show guest welcome bottom sheet once event data is available (deferred from mount)
  useEffect(() => {
    if (hasCheckedGuestWelcomeRef.current) return;
    if (!contextEvent) return;
    hasCheckedGuestWelcomeRef.current = true;

    if (isAdmin) return;
    if (!location.state?.guestJustLoggedIn) return;

    const eventState = contextEvent.state;
    if (eventState === 'created' || eventState === 'started') {
      setShowGuestWelcome(true);
    }
  }, [contextEvent, isAdmin, location.state]);

  // Fetch user item count for contextual CTA on the guest welcome sheet
  useEffect(() => {
    if (!eventId || isAdmin) return;
    const state = contextEvent?.state;
    if (state !== 'created' && state !== 'started') return;
    let cancelled = false;
    itemService.getItems(eventId, true)
      .then((items) => { if (!cancelled) setUserItemCount((items || []).length); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId, isAdmin, contextEvent?.state]);

  // Generate available item IDs based on itemConfiguration
  useEffect(() => {
    if (event?.itemConfiguration) {
      // Backend guarantees itemConfiguration at event creation - no frontend fallbacks needed
      const config = event.itemConfiguration;
      
      // Generate all item IDs from 1 to numberOfItems
      const allIds = Array.from(
        { length: config.numberOfItems }, 
        (_, i) => i + 1
      );
      
      // Filter out excluded IDs
      const available = allIds.filter(
        id => !(config.excludedItemIds || []).includes(id)
      );
      
      setAvailableItemIds(available);
    }
  }, [event]);

  // Get user email from JWT token using apiClient utility
  useEffect(() => {
    const email = apiClient.getUserEmail();
    setUserEmail(email);
  }, [eventId]);

  // Load rating configuration - optimized to avoid refetching on every event update
  useEffect(() => {
    if (!eventId) {
      ratingConfigFetchedRef.current = null;
      return;
    }

    // Reset ref when eventId changes
    if (ratingConfigFetchedRef.current !== null && ratingConfigFetchedRef.current !== eventId) {
      ratingConfigFetchedRef.current = null;
    }

    // Use ratingConfiguration from the event object if available
    // Backend stores defaults at event creation, no frontend fallbacks needed
    if (event?.ratingConfiguration) {
      setRatingConfig(event.ratingConfiguration);
      ratingConfigFetchedRef.current = eventId;
      return;
    }

    // Only fetch from API if we haven't fetched for this eventId yet
    if (ratingConfigFetchedRef.current === eventId) {
      return; // Already fetched for this eventId
    }

    // Fetch from API as fallback
    apiClient.getRatingConfiguration(eventId)
      .then(config => {
        setRatingConfig(config);
        ratingConfigFetchedRef.current = eventId;
      })
      .catch(err => {
        console.error('Error loading rating configuration:', err);
        // Don't set fallback defaults - let the error surface
        // Backend should always provide rating configuration
        ratingConfigFetchedRef.current = eventId;
      });
  }, [eventId, event]);

  // Handle browser back/forward navigation (popstate) — always close all drawers
  useEffect(() => {
    const handlePopState = () => {
      setOpenDrawerItemId(null);
      setOpenItemDetailsItemId(null);
      setIsSimilarUsersDrawerOpen(false);
      setIsUserDetailsDrawerOpen(false);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const ratingsLoadedOnceRef = useRef(false);

  // Load user's ratings (T082 - with loading state)
  const loadRatings = () => {
    if (eventId && hasAuth && redirectCheckedForEventRef.current === eventId && userEmail) {
      const isInitialLoad = !ratingsLoadedOnceRef.current;
      if (isInitialLoad) setRatingsLoading(true);

      ratingService.getRatings(eventId)
        .then(allRatings => {
          ratingsLoadedOnceRef.current = true;
          setItemRaterCounts(prev => {
            const next = deriveItemRaterCounts(allRatings);
            const keys = Object.keys(next);
            if (keys.length === Object.keys(prev).length && keys.every(k => prev[k] === next[k])) return prev;
            return next;
          });
          const userRatings = allRatings.filter(
            r => r.email && r.email.toLowerCase() === userEmail.toLowerCase()
          );
          setRatings(prev => {
            if (prev.length === userRatings.length && prev.every((r, i) => r.itemId === userRatings[i].itemId && r.rating === userRatings[i].rating)) return prev;
            return userRatings;
          });
        })
        .catch(err => {
          console.error('Error loading ratings:', err);
          setRatings([]);
        })
        .finally(() => {
          if (isInitialLoad) setRatingsLoading(false);
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
          const data = await apiClient.get(`/events/${eventId}/dashboard`);
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
    const handleRatingSubmitted = (customEvent) => {
      if (customEvent.detail.eventId === eventId) {
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
    const handleBookmarkToggled = async (customEvent) => {
      if (customEvent.detail.eventId === eventId && userEmail) {
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
      } else if (customEvent.detail.eventId === eventId) {
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

  // Push a new history entry when opening a drawer from scratch,
  // or replace the current entry when switching between drawers.
  const setDrawerHistory = (state) => {
    const method = history.state?.drawer ? 'replaceState' : 'pushState';
    history[method](state, '', window.location.pathname);
  };

  // Handle item button click - open drawer
  const handleItemClick = useCallback((itemId) => {
    if (isSimilarUsersDrawerOpen) {
      setIsSimilarUsersDrawerOpen(false);
    }

    if (event?.state !== 'completed' && event?.typeOfItem === 'wine' && availableItemIds.length > 0) {
      const threshold = getMinimumThreshold(availableItemIds.length);
      hadPersonalityBeforeDrawerRef.current = ratings.length >= threshold;
    }

    if (event?.state === 'completed') {
      if (openItemDetailsItemId && openItemDetailsItemId !== itemId) {
        setOpenItemDetailsItemId(null);
        setTimeout(() => {
          setOpenItemDetailsItemId(itemId);
          setDrawerHistory({ drawer: 'item', itemId });
        }, 100);
      } else {
        setOpenItemDetailsItemId(itemId);
        setDrawerHistory({ drawer: 'item', itemId });
      }
      setOpenDrawerItemId(null);
    } else {
      if (openDrawerItemId && openDrawerItemId !== itemId) {
        setOpenDrawerItemId(null);
        setTimeout(() => {
          setOpenDrawerItemId(itemId);
          setDrawerHistory({ drawer: 'rating', itemId });
        }, 100);
      } else {
        setOpenDrawerItemId(itemId);
        setDrawerHistory({ drawer: 'rating', itemId });
      }
      setOpenItemDetailsItemId(null);
    }
    setError(null);
  }, [event?.state, event?.typeOfItem, isSimilarUsersDrawerOpen, openItemDetailsItemId, openDrawerItemId, availableItemIds, ratings]);

  const handleDrawerClose = () => {
    if (history.state?.drawer) {
      history.back();
    } else {
      setOpenDrawerItemId(null);
    }
    setPendingRevealCheck(true);
  };

  // Handle item details drawer close
  const handleItemDetailsDrawerClose = () => {
    // Check if current history state has a drawer
    if (history.state?.drawer) {
      history.back();
    } else {
      setOpenItemDetailsItemId(null);
    }
  };

  // Handle similar users drawer close
  const handleSimilarUsersDrawerClose = () => {
    // Check if current history state has a drawer
    if (history.state?.drawer) {
      history.back();
    } else {
      setIsSimilarUsersDrawerOpen(false);
    }
  };

  // Handle similar users button click
  const handleSimilarUsersClick = () => {
    if (openDrawerItemId) {
      setOpenDrawerItemId(null);
      setTimeout(() => {
        setIsSimilarUsersDrawerOpen(true);
        setDrawerHistory({ drawer: 'similar' });
      }, 100);
    } else {
      setIsSimilarUsersDrawerOpen(true);
      setDrawerHistory({ drawer: 'similar' });
    }
  };

  // Handle user details drawer close
  const handleUserDetailsDrawerClose = () => {
    // Check if current history state has a drawer
    if (history.state?.drawer) {
      history.back();
    } else {
      setIsUserDetailsDrawerOpen(false);
    }
  };

  // Handle my progress button click
  const handleMyProgressClick = () => {
    if (openDrawerItemId) {
      setOpenDrawerItemId(null);
    }
    if (isSimilarUsersDrawerOpen) {
      setIsSimilarUsersDrawerOpen(false);
    }
    handleMyProgressClickOriginal();
    setTimeout(() => {
      setIsUserDetailsDrawerOpen(true);
      setDrawerHistory({ drawer: 'user', userEmail });
    }, 100);
  };

  const handleGuestWelcomeDismiss = () => {
    setShowGuestWelcome(false);
    window.history.replaceState({}, document.title);
  };

  const handleGuestWelcomeRegister = () => {
    setShowGuestWelcome(false);
    window.history.replaceState({}, document.title);
    window.dispatchEvent(new CustomEvent('openMyBottles'));
  };

  const userRatingProgressData = useMemo(
    () => calculateUserRatingProgress(ratings, availableItemIds, ratingConfig?.maxRating || 4),
    [ratings, availableItemIds, ratingConfig]
  );

  // Personality dot badge logic
  const showPersonalityBadge = useMemo(() => {
    if (event?.typeOfItem !== 'wine') return false;
    if (!['started', 'paused', 'completed'].includes(event?.state)) return false;
    if (availableItemIds.length === 0 || ratings.length === 0) return false;
    const threshold = getMinimumThreshold(availableItemIds.length);
    if (ratings.length < threshold) return false;
    const badgeKey = `personality-badge-${eventId}`;
    return !sessionStorage.getItem(badgeKey);
  }, [event?.typeOfItem, event?.state, availableItemIds, ratings, eventId]);

  // Clear badge when My Progress drawer opens
  const handleMyProgressClickOriginal = useCallback(() => {
    if (eventId) {
      sessionStorage.setItem(`personality-badge-${eventId}`, 'shown');
    }
  }, [eventId]);

  // Trigger personality reveal sheet once user crosses the personality threshold
  useEffect(() => {
    if (!pendingRevealCheck) return;
    if (openDrawerItemId !== null) return;

    if (hadPersonalityBeforeDrawerRef.current) {
      setPendingRevealCheck(false);
      return;
    }

    if (event?.typeOfItem !== 'wine' || !['started', 'paused'].includes(event?.state)) {
      setPendingRevealCheck(false);
      return;
    }

    if (availableItemIds.length === 0) {
      setPendingRevealCheck(false);
      return;
    }

    const threshold = getMinimumThreshold(availableItemIds.length);
    if (ratings.length < threshold) return;

    setPendingRevealCheck(false);

    const revealKey = `personality-reveal-${eventId}`;
    if (localStorage.getItem(revealKey)) return;

    localStorage.setItem(revealKey, 'shown');
    setTimeout(() => setShowPersonalityReveal(true), 500);
  }, [pendingRevealCheck, ratings, openDrawerItemId, event?.typeOfItem, event?.state, availableItemIds, eventId]);

  useEffect(() => {
    if (!pendingRevealCheck) return;
    const timer = setTimeout(() => setPendingRevealCheck(false), 10_000);
    return () => clearTimeout(timer);
  }, [pendingRevealCheck]);

  const handlePersonalityRevealDismiss = () => {
    setShowPersonalityReveal(false);
  };

  const handlePersonalityReveal = () => {
    setShowPersonalityReveal(false);
    if (eventId) {
      sessionStorage.setItem(`personality-badge-${eventId}`, 'shown');
    }
    setTimeout(() => {
      setIsUserDetailsDrawerOpen(true);
      setDrawerHistory({ drawer: 'user', userEmail });
    }, 400);
  };

  const hasMinimumRatings = () => {
    return ratings.length >= 3;
  };

  // Get user's rating for a specific item
  const getUserRating = (itemId) => {
    if (!ratings.length) return null;
    return ratings.find(r => r.itemId === itemId) || null;
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
                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground">
                    Event has not started yet
                  </p>
                  {!isAdmin && (
                    <div className="text-center" data-testid="guest-inline-registration-prompt">
                      <p className="text-sm text-muted-foreground">
                        Brought a {singular.toLowerCase()} to share?
                      </p>
                      <Button
                        variant="link"
                        className="text-sm px-0"
                        onClick={() => window.dispatchEvent(new CustomEvent('openMyBottles'))}
                        data-testid="guest-inline-register-btn"
                      >
                        Register My {singular}
                      </Button>
                    </div>
                  )}
                </div>
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
                      onClick={handleItemClick}
                      ratedCount={itemRaterCounts[itemId] || 0}
                      totalParticipants={event?.users ? Object.keys(event.users).length : 0}
                      showRing={event?.state === 'started'}
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
                <MyProgressButton
                  onClick={handleMyProgressClick}
                  ratingProgression={userRatingProgressData.ratingProgression}
                  totalRatings={userRatingProgressData.totalRatings}
                  showPersonalityBadge={showPersonalityBadge}
                />
              )}
            </div>
          )}

          {/* My Progress button - visible when user has at least 1 rating but less than 3 */}
          {!hasMinimumRatings() && userRatingProgressData && (
            <div className="flex justify-center mt-8">
              <MyProgressButton
                onClick={handleMyProgressClick}
                ratingProgression={userRatingProgressData.ratingProgression}
                totalRatings={userRatingProgressData.totalRatings}
                showPersonalityBadge={showPersonalityBadge}
              />
            </div>
          )}
        </div>
      </div>

      {/* Similar Users Drawer */}
      <SimilarUsersDrawer
        isOpen={isSimilarUsersDrawerOpen}
        onClose={handleSimilarUsersDrawerClose}
        eventId={eventId}
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
          ratedCount={event?.state === 'started' && openDrawerItemId ? (itemRaterCounts[openDrawerItemId] || 0) : undefined}
          totalParticipants={event?.state === 'started' && event?.users ? Object.keys(event.users).length : undefined}
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

      {/* Guest Welcome Bottom Sheet - one-time post-login nudge */}
      {!isAdmin && (
        <GuestWelcomeBottomSheet
          isOpen={showGuestWelcome}
          onDismiss={handleGuestWelcomeDismiss}
          onRegister={handleGuestWelcomeRegister}
          event={event}
          hasItems={userItemCount > 0}
        />
      )}

      <PersonalityRevealSheet
        isOpen={showPersonalityReveal}
        onDismiss={handlePersonalityRevealDismiss}
        onReveal={handlePersonalityReveal}
      />
    </RatingErrorBoundary>
  );
}

export default EventPage;
