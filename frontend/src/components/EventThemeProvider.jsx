import { useState, useEffect } from 'react';
import { useEventContext } from '@/contexts/EventContext';
import { getThemeVars } from '@/utils/themePresets';

/**
 * Wraps event route content and injects scoped CSS custom properties
 * based on the event's theme preset. Vars are always set (even for
 * "classic") so that components can consume them without fallbacks.
 */
export default function EventThemeProvider({ children }) {
  const { event } = useEventContext();
  const theme = event?.theme || 'classic';

  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const cssVars = getThemeVars(theme, isDark);

  return (
    <div style={cssVars} data-event-theme={theme}>
      {children}
    </div>
  );
}
