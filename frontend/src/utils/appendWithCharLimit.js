/**
 * Append new text to existing text, respecting a character limit.
 *
 * - If existingText is empty, returns newText truncated to maxLength.
 * - Joins with a single space separator.
 * - If the combined result exceeds maxLength, truncates intelligently at a
 *   word boundary (falling back to hard truncation when no word boundary is found).
 *
 * @param {string} existingText - Current text
 * @param {string} newText - Text to append
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} The resulting string within the character limit
 */
export function appendWithCharLimit(existingText, newText, maxLength) {
  // Normalise inputs
  const existing = (existingText ?? '').trimEnd();
  const addition = (newText ?? '');

  if (!addition) return existing;

  // If existing is empty, just return newText truncated to limit
  if (!existing) {
    if (addition.length <= maxLength) return addition;
    return truncateAtWordBoundary(addition, maxLength);
  }

  const combined = `${existing} ${addition}`;

  if (combined.length <= maxLength) return combined;

  // Need to truncate — figure out how much of the addition we can keep
  // existing + ' ' already takes (existing.length + 1) chars
  const availableSpace = maxLength - existing.length - 1;

  if (availableSpace <= 0) {
    // No room for any addition, return existing as-is
    return existing;
  }

  const partialAddition = truncateAtWordBoundary(addition, availableSpace);
  return `${existing} ${partialAddition}`;
}

/**
 * Truncate text at a word boundary within maxLength.
 * Falls back to hard truncation if no word boundary is found.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateAtWordBoundary(text, maxLength) {
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);

  // If the cut lands on a word boundary (next char is space or we're at end), keep it
  if (maxLength >= text.length || text[maxLength] === ' ') {
    return truncated;
  }

  // Otherwise look for the last space within the allowed length
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace);
  }

  // No word boundary found — hard truncate
  return truncated;
}
