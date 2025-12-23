import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Calendar, Users, Star, Package, Search, X } from 'lucide-react';
import systemApi from '@/services/systemApi.js';

/**
 * State badge colors
 */
const STATE_COLORS = {
  created: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  started: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Debounce hook for search input
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * EventList Component
 * 
 * Displays a paginated list of all events for root administrators.
 * Includes search control.
 */
export default function EventList({ onEventSelect }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  });
  
  // Search state
  const [searchText, setSearchText] = useState('');
  
  // Debounce search input
  const debouncedSearch = useDebounce(searchText, 300);

  // Build filters object
  const filters = {
    ...(debouncedSearch && { name: debouncedSearch })
  };

  // Fetch events when filters or pagination changes
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await systemApi.listEvents({
          limit: pagination.limit,
          offset: pagination.offset,
          ...filters
        });
        
        setEvents(result.events || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0
        }));
      } catch (err) {
        setError(err.message || 'Failed to load events');
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [debouncedSearch, pagination.offset, pagination.limit]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  // Refresh events (for retry after error)
  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await systemApi.listEvents({
        limit: pagination.limit,
        offset: pagination.offset,
        ...filters
      });
      setEvents(result.events || []);
      setPagination(prev => ({
        ...prev,
        total: result.total || 0
      }));
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, pagination.offset, filters]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Search control
  const SearchControl = () => (
    <div className="mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search events..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
        {searchText && (
          <button
            onClick={() => setSearchText('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  // Empty state
  if (!isLoading && events.length === 0) {
    return (
      <>
        <SearchControl />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {searchText 
                ? 'No events match your search' 
                : 'No events found'}
            </p>
            {searchText && (
              <button
                onClick={clearSearch}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search control */}
      <SearchControl />
      
      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
            <button 
              onClick={refreshEvents}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {/* Event list */}
      {!isLoading && !error && events.length > 0 && (
        <div className="space-y-3">
          {events.map(event => (
            <Card 
              key={event.eventId}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                "border-l-4",
                event.state === 'started' && "border-l-green-500",
                event.state === 'paused' && "border-l-yellow-500",
                event.state === 'completed' && "border-l-gray-500",
                event.state === 'created' && "border-l-blue-500"
              )}
              onClick={() => onEventSelect?.(event)}
              data-testid="event-row"
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Left side: Name and owner */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{event.name}</h3>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", STATE_COLORS[event.state])}
                      >
                        {event.state}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {event.ownerEmail}
                    </p>
                  </div>
                  
                  {/* Right side: Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1" title="Items">
                      <Package className="h-4 w-4" />
                      <span>{event.itemCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Participants">
                      <Users className="h-4 w-4" />
                      <span>{event.participantCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Ratings">
                      <Star className="h-4 w-4" />
                      <span>{event.ratingCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Created">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.offset + 1} - {Math.min(pagination.offset + events.length, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={pagination.offset === 0}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
