import { useState, useEffect } from 'react';

/**
 * Hook that tracks the viewport height for mobile browsers
 * where browser chrome (address bar, toolbar) affects available height.
 * @returns {number} Current viewport height in pixels
 */
export function useViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    const timer = setTimeout(update, 100);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      clearTimeout(timer);
    };
  }, []);

  return viewportHeight;
}
