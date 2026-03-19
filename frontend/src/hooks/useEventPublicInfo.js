import { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';

/**
 * useEventPublicInfo Hook
 *
 * Fetches public event info (name, typeOfItem, theme, state) for display
 * on unauthenticated entry pages. Never throws — returns graceful defaults.
 *
 * @param {string} eventId - Event identifier
 * @returns {{ name: string|null, typeOfItem: string|null, theme: string|null, state: string|null, loading: boolean, error: boolean, notFound: boolean }}
 */
function useEventPublicInfo(eventId) {
  const [info, setInfo] = useState({
    name: null,
    typeOfItem: null,
    theme: null,
    state: null,
    loading: true,
    error: false,
    notFound: false,
  });

  useEffect(() => {
    if (!eventId) {
      setInfo(prev => ({ ...prev, loading: false, error: true }));
      return;
    }

    let cancelled = false;

    async function fetchInfo() {
      try {
        const { data, notFound } = await apiClient.getEventPublicInfo(eventId);

        if (cancelled) return;

        if (notFound) {
          setInfo({ name: null, typeOfItem: null, theme: null, state: null, loading: false, error: false, notFound: true });
        } else if (data) {
          setInfo({ name: data.name, typeOfItem: data.typeOfItem, theme: data.theme, state: data.state, loading: false, error: false, notFound: false });
        } else {
          // Network error or other failure — no data but not a 404
          setInfo({ name: null, typeOfItem: null, theme: null, state: null, loading: false, error: true, notFound: false });
        }
      } catch {
        if (!cancelled) {
          setInfo({ name: null, typeOfItem: null, theme: null, state: null, loading: false, error: true, notFound: false });
        }
      }
    }

    fetchInfo();

    return () => { cancelled = true; };
  }, [eventId]);

  return info;
}

export default useEventPublicInfo;
