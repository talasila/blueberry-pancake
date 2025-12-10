/**
 * Bookmark storage utility
 * Manages bookmarks in browser sessionStorage (session-only, not persisted)
 */

/**
 * Get storage key for event bookmarks
 * @param {string} eventId - Event identifier
 * @returns {string} Storage key
 */
function getBookmarkKey(eventId) {
  return `bookmarks:${eventId}`;
}

/**
 * Get all bookmarks for an event
 * @param {string} eventId - Event identifier
 * @returns {Array<number>} Array of bookmarked item IDs
 */
export function getBookmarks(eventId) {
  if (!eventId) {
    return [];
  }

  try {
    const key = getBookmarkKey(eventId);
    const data = sessionStorage.getItem(key);
    if (!data) {
      return [];
    }

    const bookmarks = JSON.parse(data);
    return Array.isArray(bookmarks) ? bookmarks : [];
  } catch (error) {
    console.error('Error reading bookmarks from sessionStorage:', error);
    return [];
  }
}

/**
 * Add a bookmark for an item
 * @param {string} eventId - Event identifier
 * @param {number} itemId - Item identifier
 */
export function addBookmark(eventId, itemId) {
  if (!eventId || !itemId) {
    return;
  }

  try {
    const bookmarks = getBookmarks(eventId);
    if (!bookmarks.includes(itemId)) {
      bookmarks.push(itemId);
      const key = getBookmarkKey(eventId);
      sessionStorage.setItem(key, JSON.stringify(bookmarks));
    }
  } catch (error) {
    console.error('Error adding bookmark to sessionStorage:', error);
  }
}

/**
 * Remove a bookmark for an item
 * @param {string} eventId - Event identifier
 * @param {number} itemId - Item identifier
 */
export function removeBookmark(eventId, itemId) {
  if (!eventId || !itemId) {
    return;
  }

  try {
    const bookmarks = getBookmarks(eventId).filter(id => id !== itemId);
    const key = getBookmarkKey(eventId);
    sessionStorage.setItem(key, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Error removing bookmark from sessionStorage:', error);
  }
}

/**
 * Check if an item is bookmarked
 * @param {string} eventId - Event identifier
 * @param {number} itemId - Item identifier
 * @returns {boolean} True if item is bookmarked
 */
export function isBookmarked(eventId, itemId) {
  if (!eventId || !itemId) {
    return false;
  }

  const bookmarks = getBookmarks(eventId);
  return bookmarks.includes(itemId);
}

/**
 * Toggle bookmark state for an item
 * @param {string} eventId - Event identifier
 * @param {number} itemId - Item identifier
 * @returns {boolean} New bookmark state (true if bookmarked, false if unbookmarked)
 */
export function toggleBookmark(eventId, itemId) {
  if (isBookmarked(eventId, itemId)) {
    removeBookmark(eventId, itemId);
    return false;
  } else {
    addBookmark(eventId, itemId);
    return true;
  }
}
