import { useState, useEffect, useCallback, useRef } from 'react';

export function useTurnstile(siteKey) {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!siteKey) {
      setError('Turnstile site key not configured');
      setIsLoading(false);
      return;
    }
    if (!window.turnstile) {
      setError('Turnstile script not available');
      setIsLoading(false);
      return;
    }
    if (!containerRef.current) {
      setIsLoading(false);
      return;
    }
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (newToken) => {
        setToken(newToken);
        setIsLoading(false);
      },
      'error-callback': () => {
        setError('Turnstile challenge failed');
        setIsLoading(false);
      },
      'expired-callback': () => {
        setToken(null);
      },
      size: 'invisible'
    });
    widgetIdRef.current = widgetId;
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey]);

  const resetWidget = useCallback(() => {
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
      setToken(null);
      setIsLoading(true);
    }
  }, []);

  return { token, isLoading, error, resetWidget, containerRef };
}

export default useTurnstile;
