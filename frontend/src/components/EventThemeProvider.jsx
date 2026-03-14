import { useState, useEffect, useRef, useMemo } from 'react';
import { useEventContext } from '@/contexts/EventContext';
import { getThemeVars } from '@/utils/themePresets';

/**
 * Wraps event route content and injects scoped CSS custom properties
 * based on the event's theme preset. Vars are always set (even for
 * "classic") so that components can consume them without fallbacks.
 *
 * Also mirrors the vars onto document.documentElement so that
 * portal-rendered elements (sonner toasts, etc.) inherit the theme.
 */
export default function EventThemeProvider({ children }) {
  const { event } = useEventContext();
  const theme = event?.theme || 'classic';
  const appliedVarsRef = useRef([]);

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

  const cssVars = useMemo(() => getThemeVars(theme, isDark), [theme, isDark]);

  useEffect(() => {
    const root = document.documentElement;

    appliedVarsRef.current.forEach((key) => root.style.removeProperty(key));

    const keys = Object.keys(cssVars);
    keys.forEach((key) => root.style.setProperty(key, cssVars[key]));
    appliedVarsRef.current = keys;

    return () => {
      keys.forEach((key) => root.style.removeProperty(key));
      appliedVarsRef.current = [];
    };
  }, [cssVars]);

  return (
    <div style={cssVars} data-event-theme={theme}>
      {children}
    </div>
  );
}
