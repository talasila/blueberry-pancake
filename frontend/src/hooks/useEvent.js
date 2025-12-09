import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '@/services/apiClient';

/**
 * useEvent Hook
 * 
 * Fetches event data for a given event ID from route parameters.
 * Manages loading and error states.
 * 
 * @returns {{event: object|null, isLoading: boolean, error: string|null, refetch: function}}
 */
function useEvent() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvent = async () => {
    if (!eventId) {
      setError('Event ID is required');
      setIsLoading(false);
      return;
    }

    // Check authentication before attempting to fetch - CRITICAL: must check every time
    // Must have a valid (non-empty) token or session
    const jwtToken = apiClient.getJWTToken();
    const pinSession = apiClient.getPINSessionId(eventId);
    const hasAuth = !!(jwtToken && jwtToken.trim()) || !!(pinSession && pinSession.trim());
    
    if (!hasAuth) {
      // Don't fetch if no authentication - let the page component handle redirect
      setIsLoading(false);
      setEvent(null);
      setError(null); // Don't set error, just silently skip
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const eventData = await apiClient.getEvent(eventId);
      setEvent(eventData);
      setError(null);
    } catch (err) {
      // If we get a 401, don't set error - just silently fail and let redirect handle it
      if (err.message && err.message.includes('authentication required')) {
        setEvent(null);
        setError(null);
      } else {
        setError(err.message || 'Failed to load event');
        setEvent(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  return {
    event,
    isLoading,
    error,
    refetch: fetchEvent
  };
}

export default useEvent;
