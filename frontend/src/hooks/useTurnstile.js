import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_RETRIES = 2;

export function useTurnstile(siteKey) {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const retryCountRef = useRef(0);

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
        retryCountRef.current = 0;
        setToken(newToken);
        setError(null);
        setIsLoading(false);
      },
      'error-callback': () => {
        if (retryCountRef.current < MAX_RETRIES && window.turnstile && widgetIdRef.current) {
          retryCountRef.current += 1;
          setTimeout(() => {
            if (window.turnstile && widgetIdRef.current) {
              window.turnstile.reset(widgetIdRef.current);
            }
          }, 1500);
          return;
        }
        setError('Turnstile challenge failed');
        setIsLoading(false);
      },
      'expired-callback': () => {
        setToken(null);
        setIsLoading(true);
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
      size: 'compact',
      appearance: 'interaction-only'
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
      retryCountRef.current = 0;
      window.turnstile.reset(widgetIdRef.current);
      setToken(null);
      setError(null);
      setIsLoading(true);
    }
  }, []);

  return { token, isLoading, error, resetWidget, containerRef };
}

export default useTurnstile;
