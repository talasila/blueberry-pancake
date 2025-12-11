/**
 * Bookmark storage utility
 * Manages bookmarks with server-side persistence
 * Uses sessionStorage for local caching and syncs with server
 */
import apiClient from '@/services/apiClient';

/**
 * Get storage key for event bookmarks
 * @param {string} eventId - Event identifier
 * @returns {string} Storage key
 */
function getBookmarkKey(eventId) {
  return `bookmarks:${eventId}`;
}

/**
 * Get all bookmarks for an event from sessionStorage (local cache)
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
 * Load bookmarks from server for an event
 * @param {string} eventId - Event identifier
 * @param {string} userEmail - User email address (optional, for PIN auth)
 * @returns {Promise<Array<number>>} Array of bookmarked item IDs
 */
export async function loadBookmarksFromServer(eventId, userEmail = null) {
  if (!eventId) {
    return [];
  }

  try {
    const response = await apiClient.getBookmarks(eventId, userEmail);
    const bookmarks = response.bookmarks || [];
    
    // Cache in sessionStorage
    const key = getBookmarkKey(eventId);
    sessionStorage.setItem(key, JSON.stringify(bookmarks));
    
    return Array.isArray(bookmarks) ? bookmarks : [];
  } catch (error) {
    console.error('Error loading bookmarks from server:', error);
    // Return cached bookmarks if server fails
    return getBookmarks(eventId);
  }
}

/**
 * Add a bookmark for an item
 * @param {string} eventId - Event identifier
 * @param {number} itemId - Item identifier
 * @param {string} userEmail - User email address (optional, for server sync)
 * @returns {Promise<void>}
 */
export async function addBookmark(eventId, itemId, userEmail = null) {
  if (!eventId || !itemId) {
    return;
  }

  try {
    const bookmarks = getBookmarks(eventId);
    if (!bookmarks.includes(itemId)) {
      bookmarks.push(itemId);
      const key = getBookmarkKey(eventId);
      sessionStorage.setItem(key, JSON.stringify(bookmarks));
      
      // Sync with server
      if (userEmail) {
        try {
          await apiClient.saveBookmarks(eventId, bookmarks, userEmail);
        } catch (error) {
          console.error('Error syncing bookmark to server:', error);
          // Continue even if server sync fails
        }
      }
    }
  } catch (error) {
    console.error('Error adding bookmark:', error);
  }
}

/**
 * Remove a bookmark for an item
 * @param {string} eventId - Event identifier
 * @param {number} itemId - Item identifier
 * @param {string} userEmail - User email address (optional, for server sync)
 * @returns {Promise<void>}
 */
export async function removeBookmark(eventId, itemId, userEmail = null) {
  if (!eventId || !itemId) {
    return;
  }

  try {
    const bookmarks = getBookmarks(eventId).filter(id => id !== itemId);
    const key = getBookmarkKey(eventId);
    sessionStorage.setItem(key, JSON.stringify(bookmarks));
    
    // Sync with server
    if (userEmail) {
      try {
        await apiClient.saveBookmarks(eventId, bookmarks, userEmail);
      } catch (error) {
        console.error('Error syncing bookmark removal to server:', error);
        // Continue even if server sync fails
      }
    }
  } catch (error) {
    console.error('Error removing bookmark:', error);
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
 * @param {string} userEmail - User email address (optional, for server sync)
 * @returns {Promise<boolean>} New bookmark state (true if bookmarked, false if unbookmarked)
 */
export async function toggleBookmark(eventId, itemId, userEmail = null) {
  if (isBookmarked(eventId, itemId)) {
    await removeBookmark(eventId, itemId, userEmail);
    return false;
  } else {
    await addBookmark(eventId, itemId, userEmail);
    return true;
  }
}

/**
 * Clear all bookmarks from sessionStorage (local cache only)
 * Server-side bookmarks are preserved and will be loaded when user accesses event page
 * Used when user logs out or when a new user authenticates to clear local cache
 */
export function clearAllBookmarks() {
  try {
    const bookmarkKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('bookmarks:')) {
        bookmarkKeysToRemove.push(key);
      }
    }
    bookmarkKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing bookmarks from sessionStorage:', error);
  }
}
