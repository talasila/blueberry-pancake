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
  const hasEvent = !!event;
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

  // Only mirror vars to document root when we have a real event from context.
  // When event is null (pre-auth entry pages), let the entry page's own
  // useEffect set root vars from the public-info fetch instead.
  useEffect(() => {
    if (!hasEvent) return;

    const root = document.documentElement;

    appliedVarsRef.current.forEach((key) => root.style.removeProperty(key));

    const keys = Object.keys(cssVars);
    keys.forEach((key) => root.style.setProperty(key, cssVars[key]));
    appliedVarsRef.current = keys;

    return () => {
      keys.forEach((key) => root.style.removeProperty(key));
      appliedVarsRef.current = [];
    };
  }, [cssVars, hasEvent]);

  // When event is null (pre-auth entry pages), render a plain wrapper without
  // theme vars so entry pages can control theming via their own inline styles
  // and root mirror. Otherwise the classic fallback vars here would override
  // the entry page's theme for ancestors like the Header.
  return (
    <div style={hasEvent ? cssVars : undefined} data-event-theme={hasEvent ? theme : undefined}>
      {children}
    </div>
  );
}
