import { useState, useEffect, useCallback } from 'react';
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

  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      setError('Event ID is required');
      setIsLoading(false);
      return;
    }

    if (!apiClient.isAuthenticated()) {
      setIsLoading(false);
      setEvent(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const eventData = await apiClient.getEvent(eventId);
      setEvent(eventData);
      setError(null);
    } catch (err) {
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
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  return {
    event,
    isLoading,
    error,
    refetch: fetchEvent
  };
}

export default useEvent;
