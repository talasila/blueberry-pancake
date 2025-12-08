import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '@/services/apiClient';

/**
 * useEventPolling Hook
 * 
 * Periodically polls for event updates to detect state changes made by administrators.
 * 
 * Features:
 * - Configurable polling interval (default 30 seconds)
 * - Automatic cleanup on unmount
 * - Pauses polling when page is not visible (Page Visibility API)
 * - Handles errors gracefully with retry logic
 * 
 * @param {string} eventId - Event identifier
 * @param {number} intervalMs - Polling interval in milliseconds (default: 30000)
 * @returns {{event: object|null, isPolling: boolean, refetch: function}}
 */
function useEventPolling(eventId, intervalMs = 30000) {
  const [event, setEvent] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      return;
    }

    try {
      const eventData = await apiClient.getEvent(eventId);
      setEvent(eventData);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      // Handle errors gracefully - don't stop polling on single error
      console.error('Failed to fetch event during polling:', error);
      
      // Exponential backoff for retries
      retryCountRef.current += 1;
      if (retryCountRef.current <= maxRetries) {
        const backoffDelay = Math.min(intervalMs * Math.pow(2, retryCountRef.current - 1), 300000); // Max 5 minutes
        setTimeout(() => {
          if (intervalRef.current) {
            fetchEvent();
          }
        }, backoffDelay);
      }
    }
  }, [eventId, intervalMs]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    // Initial fetch
    fetchEvent();

    // Set up polling
    const startPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        fetchEvent();
      }, intervalMs);
      
      setIsPolling(true);
    };

    // Handle page visibility - pause polling when page is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - pause polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsPolling(false);
        }
      } else {
        // Page is visible - resume polling
        fetchEvent(); // Fetch immediately when page becomes visible
        startPolling();
      }
    };

    // Start polling
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount or eventId change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setIsPolling(false);
    };
  }, [eventId, intervalMs, fetchEvent]);

  return {
    event,
    isPolling,
    refetch: fetchEvent
  };
}

export default useEventPolling;
