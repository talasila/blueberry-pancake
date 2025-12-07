/**
 * Mobile-first responsive layout utilities
 * Provides helpers for responsive design
 */

/**
 * Check if viewport is mobile (width < 768px)
 * @returns {boolean} True if mobile viewport
 */
export function isMobile() {
  return window.innerWidth < 768;
}

/**
 * Check if viewport is tablet (768px <= width < 1024px)
 * @returns {boolean} True if tablet viewport
 */
export function isTablet() {
  const width = window.innerWidth;
  return width >= 768 && width < 1024;
}

/**
 * Check if viewport is desktop (width >= 1024px)
 * @returns {boolean} True if desktop viewport
 */
export function isDesktop() {
  return window.innerWidth >= 1024;
}

/**
 * Get current viewport breakpoint
 * @returns {string} 'mobile', 'tablet', or 'desktop'
 */
export function getBreakpoint() {
  if (isMobile()) return 'mobile';
  if (isTablet()) return 'tablet';
  return 'desktop';
}

// Note: React hooks would require React import
// This utility can be used with React.useState and React.useEffect in components
