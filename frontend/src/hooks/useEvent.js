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

    setIsLoading(true);
    setError(null);

    try {
      const eventData = await apiClient.getEvent(eventId);
      setEvent(eventData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load event');
      setEvent(null);
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
