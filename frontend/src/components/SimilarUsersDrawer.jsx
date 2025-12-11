import { X, Star, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
 * @param {string} props.eventState - Current event state (created, started, paused, completed)
 */
function SimilarUsersDrawer({ 
  isOpen, 
  onClose, 
  eventId,
  eventState
}) {
  const { event } = useEventContext();
  const { singular } = useItemTerminology(event);
  const openStartTimeRef = useRef(null);
  const hasBeenOpenedRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
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

  // Fetch similar users when drawer opens
  useEffect(() => {
    if (isOpen && eventId) {
      fetchSimilarUsers();
    } else {
      // Reset state when drawer closes
      setSimilarUsers([]);
      setError(null);
      setSelectedUser(null);
    }
  }, [isOpen, eventId]);

  // Handle user selection - open details drawer
  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  // Close details drawer
  const handleCloseDetails = () => {
    setSelectedUser(null);
  };

  const fetchSimilarUsers = async () => {
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
  };


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

  // Check if ratings are aligned (same or very close)
  const areRatingsAligned = (userRating, similarUserRating) => {
    return Math.abs(userRating - similarUserRating) <= 1;
  };

  // Get alignment indicator
  const getAlignmentIndicator = (userRating, similarUserRating) => {
    const diff = Math.abs(userRating - similarUserRating);
    if (diff === 0) {
      return { icon: 'perfect', label: 'Perfect match', className: 'text-green-600' };
    } else if (diff === 1) {
      return { icon: 'close', label: 'Close match', className: 'text-blue-600' };
    } else {
      return { icon: 'different', label: 'Different', className: 'text-orange-600' };
    }
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
        <p className="mt-4 text-sm text-muted-foreground">Running compatibility scanner...</p>
        {/* Loading skeleton for better UX (T044) */}
        <div className="mt-6 w-full space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
        <p className="text-sm text-muted-foreground">
        People who like what you like! The colored bar shows how well your tastes match. <strong>Click to view details.</strong>
        </p>
        <div className="space-y-2">
          {similarUsers.map((user, index) => {
            const matchPercentage = user.similarityScore !== null ? user.similarityScore * 100 : 0;
            const getProgressColor = () => {
              if (matchPercentage >= 80) return 'from-green-500 to-emerald-400';
              if (matchPercentage >= 60) return 'from-blue-500 to-cyan-400';
              if (matchPercentage >= 40) return 'from-yellow-500 to-amber-400';
              return 'from-orange-500 to-red-400';
            };
            
            return (
              <button
                key={user.email || index}
                onClick={() => handleUserClick(user)}
                className="w-full flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:opacity-90 transition-all text-left relative overflow-hidden group"
              >
                {/* Progress bar background */}
                <div 
                  className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${getProgressColor()} transition-all duration-1000 ease-out opacity-20 group-hover:opacity-30`}
                  style={{ width: `${matchPercentage}%` }}
                />
                
                {/* Content overlay */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <span className="font-medium truncate flex-1 min-w-0">
                    {user.name || user.email}
                  </span>
                  {user.similarityScore !== null && (
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Sparkle icon for high matches */}
                      {user.similarityScore >= 0.8 && (
                        <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                      )}
                    </div>
                  )}
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
          fixed bottom-0 left-0 right-0 w-full max-h-[75vh]
          bg-background shadow-xl z-50 rounded-t-lg
          transform transition-transform duration-300 ease-out
          ${isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'}
          ${!isOpen ? 'pointer-events-none' : ''}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby="drawer-description"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full max-h-[75vh]">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
            <div>
              <h2 id="drawer-title" className="text-base font-semibold">
                Similar Tastes
              </h2>
              <p id="drawer-description" className="text-xs text-muted-foreground sr-only">
                Discover users with similar rating patterns and compare your ratings
              </p>
            </div>
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
          <div className="flex-1 overflow-y-auto p-6">
            {content}
          </div>
        </div>
      </div>

      {/* User Details Drawer */}
      {selectedUser && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ease-in-out opacity-100"
            onClick={handleCloseDetails}
            aria-hidden="true"
          />
          
          {/* Details Drawer */}
          <div
            className="fixed bottom-0 left-0 right-0 w-full max-h-[75vh] bg-background shadow-xl z-[60] rounded-t-lg transform transition-transform duration-300 ease-out translate-y-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-drawer-title"
          >
            <div className="flex flex-col h-full max-h-[75vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
                <div>
                  <h2 id="details-drawer-title" className="text-base font-semibold">
                    {selectedUser.name || selectedUser.email}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.commonItemsCount} common {selectedUser.commonItemsCount === 1 ? singular.toLowerCase() : `${singular.toLowerCase()}s`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCloseDetails}
                  aria-label="Close details drawer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedUser.commonItems && selectedUser.commonItems.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            ID
                          </th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                            You
                          </th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                            {(selectedUser.name || selectedUser.email).length > 10 
                              ? (selectedUser.name || selectedUser.email).substring(0, 10) + '...'
                              : (selectedUser.name || selectedUser.email)
                            }
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortItemsById(selectedUser.commonItems).map((item, itemIndex) => {
                          const userColor = getRatingColor(item.userRating);
                          const similarColor = getRatingColor(item.similarUserRating);
                          const alignment = getAlignmentIndicator(item.userRating, item.similarUserRating);
                          const isAligned = areRatingsAligned(item.userRating, item.similarUserRating);

                          return (
                            <tr 
                              key={itemIndex}
                              className={`
                                border-b transition-colors
                                ${isAligned ? 'bg-green-50 dark:bg-green-950/20' : ''}
                              `}
                            >
                              <td className="py-2 px-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{item.itemId}</span>
                                  {alignment.icon === 'perfect' && (
                                    <Star className={`h-3 w-3 fill-current ${alignment.className}`} title={alignment.label} />
                                  )}
                                  {alignment.icon === 'close' && (
                                    <span className={`text-xs ${alignment.className}`} title={alignment.label}>≈</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div
                                  className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 shadow-sm flex items-center justify-center mx-auto"
                                  style={userColor ? { backgroundColor: userColor } : { backgroundColor: '#gray-300' }}
                                  title={`Your rating: ${item.userRating}`}
                                >
                                  <span className="text-xs font-semibold text-white">{item.userRating}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div
                                  className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 shadow-sm flex items-center justify-center mx-auto"
                                  style={similarColor ? { backgroundColor: similarColor } : { backgroundColor: '#gray-300' }}
                                  title={`${selectedUser.name || selectedUser.email} rating: ${item.similarUserRating}`}
                                >
                                  <span className="text-xs font-semibold text-white">{item.similarUserRating}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                    {/* Legend for rating alignment icons */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-green-600" />
                        <span>Perfect match</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600">≈</span>
                        <span>Close match</span>
                      </div>
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
        </>
      )}
    </>
  );
}

export default SimilarUsersDrawer;
