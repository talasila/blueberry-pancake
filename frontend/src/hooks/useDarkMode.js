import { useState, useEffect, useCallback } from 'react';

/**
 * useDarkMode Hook
 *
 * Watches for dark mode class changes on document.documentElement using MutationObserver.
 * Returns current dark mode state and a toggle function.
 *
 * @returns {{ isDark: boolean, toggleDark: function }}
 */
function useDarkMode() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

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

  const toggleDark = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }, []);

  return { isDark, toggleDark };
}

export default useDarkMode;
