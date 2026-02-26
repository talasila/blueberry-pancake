import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Calendar, Users, Star, Package, Search, X, Hash, KeyRound } from 'lucide-react';
import systemApi from '@/services/systemApi.js';
import { STATE_COLORS } from './constants.js';

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
    limit: 25,
    offset: 0
  });
  
  // Search state
  const [searchText, setSearchText] = useState('');
  
  // Debounce search input
  const debouncedSearch = useDebounce(searchText, 300);

  const isSearching = debouncedSearch.trim().length >= 3;

  // Build filters: use unified search param when searching, which queries all events in DB
  const filters = isSearching
    ? { search: debouncedSearch, limit: 100 }
    : {};

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

  const searchControl = (
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
        {searchControl}
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
      {searchControl}
      
      {/* Info labels */}
      {!isLoading && isSearching && pagination.total > 100 && (
        <p className="text-sm text-muted-foreground">
          Showing first 100 of {pagination.total} results
        </p>
      )}
      {!isLoading && !isSearching && pagination.total > 25 && (
        <p className="text-sm text-muted-foreground">
          Showing 25 most recent events
        </p>
      )}
      
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
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" title="Event ID">
                        <Hash className="h-3 w-3" />
                        {event.eventId}
                      </span>
                      <span className="flex items-center gap-1" title="PIN">
                        <KeyRound className="h-3 w-3" />
                        {event.pin || 'No PIN'}
                      </span>
                    </div>
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

    </div>
  );
}
