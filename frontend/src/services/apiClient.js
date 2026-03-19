/**
 * API client service for backend communication
 * Handles authentication via httpOnly cookies (secure) and XSRF token handling
 * 
 * Authentication is handled via httpOnly cookies set by the server.
 * User session info (email, expiration) is stored locally for UI purposes only.
 */

const SESSION_KEY = 'userSession';

// Use relative /api - Vite proxy (dev) or CloudFront (prod) routes to backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  constructor() {
    this.userSession = null;
    this.csrfToken = null;
    this._csrfFetchPromise = null;
    this._loadSession();
    this._initVisibilityListener();
  }

  _loadSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        this.userSession = JSON.parse(stored);
      }
      // Migrate legacy jwtToken to new format
      if (!this.userSession) {
        const legacyToken = localStorage.getItem('jwtToken');
        if (legacyToken) {
          const payload = this._decodeLegacyJWT(legacyToken);
          if (payload?.email) {
            this.setUserSession({ email: payload.email, exp: payload.exp });
          }
          localStorage.removeItem('jwtToken');
        }
      }
    } catch {
      this.userSession = null;
    }
  }

  _decodeLegacyJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * When the tab regains focus, silently refresh if the session has expired.
   * If refresh fails, dispatch session-expired so the UI can prompt re-auth.
   */
  _initVisibilityListener() {
    if (typeof document === 'undefined') return;

    this._onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      // Re-read localStorage — another tab or code path may have updated it
      this._loadSession();
      if (!this.userSession) return;

      // Capture before isAuthenticated() potentially clears the session
      const { authMethod = null, email = null } = this.userSession;

      if (this.isAuthenticated()) return; // token still valid

      const refreshed = await this.refreshToken();
      if (!refreshed && typeof window !== 'undefined') {
        this.setUserSession(null);
        window.dispatchEvent(new CustomEvent('session-expired', {
          detail: { authMethod, email },
        }));
      }
    };

    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  /**
   * Store user session info (from server response)
   * @param {{email: string, exp: number, authMethod?: string}} session
   */
  setUserSession(session) {
    if (session?.email) {
      this.userSession = { email: session.email, exp: session.exp, authMethod: session.authMethod || null };
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.userSession));
    } else {
      this.userSession = null;
      localStorage.removeItem(SESSION_KEY);
    }
  }

  /**
   * Clear session and call logout endpoint to clear httpOnly cookie
   */
  async clearJWTToken() {
    await this.clearAllAuthState();
  }

  /**
   * Clear all authentication state (session, PIN sessions, etc.)
   */
  async clearAllAuthState() {
    this.userSession = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('jwtToken');
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pin:session:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    if (!this.userSession?.email) return false;
    if (this.userSession.exp && this.userSession.exp * 1000 < Date.now()) {
      this.setUserSession(null);
      return false;
    }
    return true;
  }

  /**
   * Check if user has authenticated access to a specific event
   * PIN users have per-event sessions; OTP users have broader admin access.
   * @param {string} eventId - Event identifier
   * @returns {boolean}
   */
  hasEventAccess(eventId) {
    if (!this.isAuthenticated() || !eventId) return false;
    if (this.getPINSessionId(eventId)) return true;
    if (this.getAuthMethod() === 'otp') return true;
    return false;
  }

  /**
   * Get user email from session
   * @returns {string|null}
   */
  getUserEmail() {
    return this.userSession?.email || null;
  }

  /**
   * Get session expiration time
   * @returns {Date|null}
   */
  getTokenExpiration() {
    if (!this.userSession?.exp) return null;
    return new Date(this.userSession.exp * 1000);
  }

  /**
   * Fetch CSRF token from backend
   * @returns {Promise<string>} CSRF token
   */
  async fetchCSRFToken() {
    if (this._csrfFetchPromise) return this._csrfFetchPromise;

    this._csrfFetchPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/csrf-token`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }
        
        const data = await response.json();
        this.csrfToken = data.csrfToken;
        return this.csrfToken;
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
      } finally {
        this._csrfFetchPromise = null;
      }
    })();

    return this._csrfFetchPromise;
  }

  /**
   * Get PIN session ID for an event
   * @param {string} eventId - Event identifier
   * @returns {string|null} PIN session ID
   */
  getPINSessionId(eventId) {
    if (!eventId) return null;
    return localStorage.getItem(`pin:session:${eventId}`);
  }

  /**
   * Extract event ID from endpoint URL
   * @param {string} endpoint - API endpoint
   * @returns {string|null} Event ID if found
   */
  getEventIdFromUrl(endpoint) {
    // Match patterns like /events/:eventId or /events/:eventId/...
    const match = endpoint.match(/\/events\/([A-Za-z0-9]{8})(?:\/|$)/);
    return match ? match[1] : null;
  }

  /**
   * Attempt to refresh the JWT token using refresh token cookie
   * @returns {Promise<boolean>} True if refresh was successful
   */
  async refreshToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          this.setUserSession(data.user);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Make API request with error handling and automatic token refresh
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @param {boolean} isRetry - Whether this is a retry after token refresh
   * @returns {Promise<Response>} Fetch response
   */
  async request(endpoint, options = {}, isRetry = false) {
    const { expectedStatuses, ...fetchOptions } = options;
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(fetchOptions.method?.toUpperCase())) {
      if (!this.csrfToken) {
        await this.fetchCSRFToken();
      }
      if (this.csrfToken) {
        headers['X-CSRF-Token'] = this.csrfToken;
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });

      // Handle 403 Forbidden - Event access denied or CSRF issues
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Access forbidden';
        
        // Check if this is a CSRF token error and retry once
        if (!isRetry && errorMessage.toLowerCase().includes('csrf')) {
          this.csrfToken = null;
          await this.fetchCSRFToken();
          return this.request(endpoint, options, true);
        }
        
        // Check if this is a membership revocation (deleted guest)
        if (errorData.code === 'EVENT_MEMBERSHIP_REQUIRED') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('membership-revoked', {
              detail: { message: errorData.error },
            }));
          }
          return Promise.reject(new Error(errorData.error || 'Your access to this event has been removed'));
        }

        // Check if this is an event access denial
        if (errorData.code === 'EVENT_ACCESS_DENIED') {
          const deniedEventId = this.getEventIdFromUrl(endpoint);
          
          // Only clear the denied event's PIN session, not the entire auth state
          if (deniedEventId) {
            localStorage.removeItem(`pin:session:${deniedEventId}`);
          }
          
          // Redirect to email entry page for this event
          if (typeof window !== 'undefined' && deniedEventId) {
            window.location.href = `/event/${deniedEventId}/email`;
            return Promise.reject(new Error('Event access denied - redirecting'));
          }
        }
        
        // For other 403 errors, continue with normal error handling
        throw new Error(errorMessage);
      }

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && !isRetry) {
        const refreshed = await this.refreshToken();
        
        if (refreshed) {
          return this.request(endpoint, options, true);
        }
        
        // Refresh failed — notify UI so it can show a re-auth prompt
        const expiredAuthMethod = this.userSession?.authMethod || null;
        const expiredEmail = this.userSession?.email || null;
        const eventId = this.getEventIdFromUrl(endpoint);
        this.setUserSession(null);
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('session-expired', {
            detail: { authMethod: expiredAuthMethod, email: expiredEmail, eventId },
          }));
        }
      }

      // Return null for caller-declared expected statuses (e.g. 404 when item may not exist)
      if (!response.ok && expectedStatuses?.includes(response.status)) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unexpected error occurred. Please try again later.' }));
        const errorMessage = errorData.error || errorData.message || `An error occurred (${response.status}). Please try again.`;
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Provide more descriptive error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Failed to fetch: Cannot connect to backend server. Make sure the backend is running.');
      }
      
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async get(endpoint, options = {}) {
    const response = await this.request(endpoint, { ...options, method: 'GET' });
    if (response === null) return null;
    const jsonData = await response.json();
    return jsonData;
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async post(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
    const jsonData = await response.json();
    return jsonData;
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async put(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async delete(endpoint, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'DELETE',
    });
    return response.json();
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @param {object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async patch(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Request OTP code via email
   * @param {string} email - Email address
   * @returns {Promise<any>} Response data
   */
  async requestOTP(email, turnstileToken = null) {
    return this.post('/auth/otp/request', { email, turnstileToken });
  }

  /**
   * Verify OTP code and receive JWT token
   * @param {string} email - Email address
   * @param {string} otp - OTP code
   * @param {string} [name] - Optional display name to store
   * @param {string} [eventId] - Optional event ID to associate name with
   * @returns {Promise<any>} Response data with token
   */
  async verifyOTP(email, otp, name = undefined, eventId = undefined) {
    return this.post('/auth/otp/verify', { email, otp, ...(name && { name }), ...(eventId && { eventId }) });
  }

  /**
   * Create a new event
   * @param {object} eventData - Event data (name, typeOfItem)
   * @returns {Promise<any>} Created event data
   */
  async createEvent(eventData) {
    return this.post('/events', eventData);
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Event data
   */
  async getEvent(eventId) {
    return this.get(`/events/${eventId}`);
  }

  /**
   * Check if an email is an administrator for an event
   * @param {string} eventId - Event identifier
   * @param {string} email - Email address to check
   * @returns {Promise<{isAdmin: boolean}>} Response data with isAdmin flag
   */
  async checkEventAdmin(eventId, email, turnstileToken = null) {
    let url = `/events/${eventId}/check-admin?email=${encodeURIComponent(email)}`;
    if (turnstileToken) {
      url += `&turnstileToken=${encodeURIComponent(turnstileToken)}`;
    }
    return this.get(url);
  }

  /**
   * Update event name
   * @param {string} eventId - Event identifier
   * @param {string} name - New event name
   * @returns {Promise<any>} Updated event data
   */
  async updateEventName(eventId, name) {
    return this.patch(`/events/${eventId}`, { name });
  }

  /**
   * Verify PIN for an event
   * @param {string} eventId - Event identifier
   * @param {string} pin - 6-digit PIN
   * @param {string} email - User email address
   * @param {string} [name] - Optional display name to store
   * @returns {Promise<any>} Response data with sessionId
   */
  async verifyPIN(eventId, pin, email, name = undefined) {
    return this.post(`/events/${eventId}/verify-pin`, { pin, email, ...(name && { name }) });
  }

  /**
   * Regenerate PIN for an event (admin only)
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with new PIN
   */
  async regeneratePIN(eventId) {
    return this.post(`/events/${eventId}/regenerate-pin`, {});
  }

  /**
   * Get administrators list for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with administrators object
   */
  async getAdministrators(eventId) {
    return this.get(`/events/${eventId}/administrators`);
  }

  /**
   * Add administrator to an event
   * @param {string} eventId - Event identifier
   * @param {string} email - Email address of the new administrator
   * @returns {Promise<any>} Response data with updated administrators object
   */
  async addAdministrator(eventId, email) {
    return this.post(`/events/${eventId}/administrators`, { email });
  }

  /**
   * Delete administrator from an event
   * @param {string} eventId - Event identifier
   * @param {string} email - Email address of the administrator to delete
   * @returns {Promise<any>} Response data
   */
  async deleteAdministrator(eventId, email) {
    return this.delete(`/events/${eventId}/administrators/${encodeURIComponent(email)}`);
  }

  /**
   * Transition event state
   * @param {string} eventId - Event identifier
   * @param {string} state - Target state for transition
   * @param {string} currentState - Expected current state (for optimistic locking)
   * @returns {Promise<any>} Response data with updated event
   */
  async transitionEventState(eventId, state, currentState) {
    // Use patch() which handles error throwing via request()
    return this.patch(`/events/${eventId}/state`, { state, currentState });
  }

  /**
   * Get item configuration for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with item configuration (numberOfItems and excludedItemIds)
   */
  async getItemConfiguration(eventId) {
    return this.get(`/events/${eventId}/item-configuration`);
  }

  /**
   * Update item configuration for an event
   * @param {string} eventId - Event identifier
   * @param {object} config - Configuration object with numberOfItems and/or excludedItemIds
   * @returns {Promise<any>} Response data with updated item configuration
   */
  async updateItemConfiguration(eventId, config) {
    return this.patch(`/events/${eventId}/item-configuration`, config);
  }

  /**
   * Get rating configuration for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with rating configuration (maxRating and ratings array)
   */
  async getRatingConfiguration(eventId) {
    return this.get(`/events/${eventId}/rating-configuration`);
  }

  /**
   * Update rating configuration for an event
   * @param {string} eventId - Event identifier
   * @param {object} config - Configuration object with maxRating and/or ratings array
   * @param {string} expectedUpdatedAt - Expected updatedAt timestamp for optimistic locking (optional)
   * @returns {Promise<any>} Response data with updated rating configuration
   */
  async updateRatingConfiguration(eventId, config, expectedUpdatedAt) {
    const body = { ...config };
    if (expectedUpdatedAt) {
      body.expectedUpdatedAt = expectedUpdatedAt;
    }
    // Use patch() which handles error throwing via request()
    return this.patch(`/events/${eventId}/rating-configuration`, body);
  }

  /**
   * Update event theme preset
   * @param {string} eventId - Event identifier
   * @param {string} theme - Theme preset identifier
   * @returns {Promise<any>} Updated event data
   */
  async updateTheme(eventId, theme) {
    return this.patch(`/events/${eventId}/theme`, { theme });
  }

  /**
   * Get bookmarks for the current user in an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with bookmarks array
   */
  async getBookmarks(eventId) {
    return this.get(`/events/${eventId}/bookmarks`);
  }

  /**
   * Save bookmarks for the current user in an event
   * @param {string} eventId - Event identifier
   * @param {Array<number>} bookmarks - Array of bookmarked item IDs
   * @returns {Promise<any>} Response data with saved bookmarks
   */
  async saveBookmarks(eventId, bookmarks) {
    return this.put(`/events/${eventId}/bookmarks`, { bookmarks });
  }

  /**
   * Get user profile (name) for the current user in an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with user profile
   */
  async getUserProfile(eventId) {
    return this.get(`/events/${eventId}/profile`);
  }

  /**
   * Update user profile (name) for the current user in an event
   * @param {string} eventId - Event identifier
   * @param {string} name - User name
   * @returns {Promise<any>} Response data with updated user profile
   */
  async updateUserProfile(eventId, name) {
    return this.put(`/events/${eventId}/profile`, { name });
  }

  /**
   * Delete an event and all its data
   * Only the event owner can delete the event
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with success message
   */
  async deleteEvent(eventId) {
    return this.delete(`/events/${eventId}`);
  }

  /**
   * Delete all ratings and bookmarks for an event
   * Only event administrators can delete ratings and bookmarks
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with success message
   */
  async deleteAllRatings(eventId) {
    return this.delete(`/events/${eventId}/ratings`);
  }

  /**
   * Delete all users (excluding administrators) and all their associated data
   * Only event administrators can delete users
   * @param {string} eventId - Event identifier
   * @returns {Promise<any>} Response data with success message and counts
   */
  async deleteAllUsers(eventId) {
    return this.delete(`/events/${eventId}/users`);
  }

  /**
   * Get all events where the authenticated user is an administrator
   * @returns {Promise<{events: Array}>} Response data with events array
   */
  async getMyEvents() {
    return this.get('/events/mine');
  }

  /**
   * Get authentication method from session
   * @returns {string|null} 'otp' or 'pin', or null if not present
   */
  getAuthMethod() {
    return this.userSession?.authMethod || null;
  }

  /**
   * Delete a single user and all their associated data
   * Only event administrators can delete users
   * Prevents deletion of owner or last administrator
   * @param {string} eventId - Event identifier
   * @param {string} email - Email of the user to delete
   * @returns {Promise<any>} Response data with success message and counts
   */
  async deleteUser(eventId, email) {
    return this.delete(`/events/${eventId}/users/${encodeURIComponent(email)}`);
  }
}

// Export singleton instance
export default new ApiClient();
