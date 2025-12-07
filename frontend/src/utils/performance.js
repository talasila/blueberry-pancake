/**
 * Payload size measurement and validation utilities
 * Helps monitor and optimize mobile network performance
 */

/**
 * Measure payload size
 * @param {any} data - Data to measure
 * @returns {number} Size in bytes
 */
export function measurePayloadSize(data) {
  if (typeof data === 'string') {
    return new Blob([data]).size;
  }
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted string (e.g., "1.5 KB")
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate payload size against limits
 * @param {any} data - Data to validate
 * @param {number} maxSizeKB - Maximum size in KB
 * @returns {object} Validation result
 */
export function validatePayloadSize(data, maxSizeKB = 100) {
  const sizeBytes = measurePayloadSize(data);
  const sizeKB = sizeBytes / 1024;
  const isValid = sizeKB <= maxSizeKB;

  return {
    isValid,
    sizeBytes,
    sizeKB: Math.round(sizeKB * 100) / 100,
    maxSizeKB,
    formatted: formatBytes(sizeBytes),
    warning: !isValid ? `Payload exceeds ${maxSizeKB}KB limit` : null,
  };
}

/**
 * Measure page load performance
 * @returns {object} Performance metrics
 */
export function measurePageLoad() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0];
  if (!navigation) {
    return null;
  }

  return {
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    totalTime: navigation.loadEventEnd - navigation.fetchStart,
    firstByte: navigation.responseStart - navigation.requestStart,
    domInteractive: navigation.domInteractive - navigation.fetchStart,
  };
}
