/**
 * API client service for backend communication
 * Handles JWT token management via httpOnly cookies (secure) and XSRF token handling
 * 
 * Security Note: JWT tokens are now stored in httpOnly cookies set by the server.
 * This protects against XSS attacks as JavaScript cannot access httpOnly cookies.
 * The localStorage fallback is maintained for backward compatibility during migration.
 */

// In development, use Vite proxy (relative path)
// In production, use full URL or environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

class ApiClient {
  constructor() {
    // In-memory token cache for backward compatibility
    // The primary token storage is now httpOnly cookies (set by server)
    this.jwtToken = null;
    this.csrfToken = null;
  }

  /**
   * Set JWT token (for backward compatibility)
   * Note: Primary JWT storage is now via httpOnly cookies set by the server
   * @param {string} token - JWT token
   */
  setJWTToken(token) {
    this.jwtToken = token;
    // Store in localStorage as fallback during migration
    // This will be removed in a future version once httpOnly cookie auth is fully adopted
    if (token) {
      localStorage.setItem('jwtToken', token);
    } else {
      localStorage.removeItem('jwtToken');
    }
  }

  /**
   * Get JWT token (for decoding/checking expiration only)
   * Note: The actual authentication is handled via httpOnly cookies sent with requests
   * @returns {string|null} JWT token
   */
  getJWTToken() {
    // Try memory first, then localStorage (fallback)
    if (this.jwtToken) {
      return this.jwtToken;
    }
    const stored = localStorage.getItem('jwtToken');
    if (stored) {
      this.jwtToken = stored;
      return stored;
    }
    return null;
  }

  /**
   * Clear JWT token and call logout endpoint to clear httpOnly cookie
   */
  async clearJWTToken() {
    this.jwtToken = null;
    localStorage.removeItem('jwtToken');
    
    // Call logout endpoint to clear httpOnly cookie on server
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      // Ignore logout errors - user is logging out anyway
      console.warn('Logout request failed:', error);
    }
  }

  /**
   * Check if user is currently authenticated (has valid JWT token)
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    const token = this.getJWTToken();
    if (!token) return false;
    
    // Check if token is expired
    const payload = this.decodeJWTPayload(token);
    if (!payload) return false;
    
    // Check expiration (exp is in seconds)
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      this.clearJWTToken();
      return false;
    }
    
    return true;
  }

  /**
   * Decode JWT token payload without verification
   * Note: This only decodes, does not verify signature
   * @param {string} token - JWT token (optional, uses stored token if not provided)
   * @returns {object|null} Decoded payload or null if invalid
   */
  decodeJWTPayload(token = null) {
    const jwtToken = token || this.getJWTToken();
    if (!jwtToken) return null;
    
    try {
      const parts = jwtToken.split('.');
      if (parts.length !== 3) return null;
      
      // Decode base64url payload (middle part)
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to decode JWT payload:', error);
      return null;
    }
  }

  /**
   * Get user email from JWT token
   * @returns {string|null} User email or null if not authenticated
   */
  getUserEmail() {
    const payload = this.decodeJWTPayload();
    return payload?.email || null;
  }

  /**
   * Get token expiration time
   * @returns {Date|null} Expiration date or null if not available
   */
  getTokenExpiration() {
    const payload = this.decodeJWTPayload();
    if (!payload?.exp) return null;
    return new Date(payload.exp * 1000);
  }

  /**
   * Fetch CSRF token from backend
   * @returns {Promise<string>} CSRF token
   */
  async fetchCSRFToken() {
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
    }
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
        credentials: 'include', // Include cookies for refresh token
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update in-memory token for backward compatibility
        if (data.token) {
          this.jwtToken = data.token;
          localStorage.setItem('jwtToken', data.token);
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
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token if available (check both memory and localStorage)
    // Note: Primary authentication is via httpOnly cookies, this is for backward compatibility
    const token = this.getJWTToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
      if (!this.csrfToken) {
        await this.fetchCSRFToken();
      }
      if (this.csrfToken) {
        headers['X-CSRF-Token'] = this.csrfToken;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for httpOnly JWT and CSRF
      });

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && !isRetry) {
        // Try to refresh the token
        const refreshed = await this.refreshToken();
        
        if (refreshed) {
          // Retry the original request
          return this.request(endpoint, options, true);
        }
        
        // Refresh failed - clear tokens and handle redirect
        this.jwtToken = null;
        localStorage.removeItem('jwtToken');
        
        // Don't redirect for event pages - they can use PIN authentication
        // Only redirect to landing page for other protected endpoints
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isOnEventPage = currentPath.startsWith('/event/');
          
          // Never redirect if we're on an event page (which can use PIN authentication)
          // Only redirect to landing page for other protected endpoints
          if (!isOnEventPage) {
            window.location.href = '/';
          }
          // If on event page, let the component handle the redirect to PIN entry
        }
      }

      // Handle errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unexpected error occurred. Please try again later.' }));
        // Extract user-friendly error message
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
  async requestOTP(email) {
    return this.post('/auth/otp/request', { email });
  }

  /**
   * Verify OTP code and receive JWT token
   * @param {string} email - Email address
   * @param {string} otp - OTP code
   * @returns {Promise<any>} Response data with token
   */
  async verifyOTP(email, otp) {
    return this.post('/auth/otp/verify', { email, otp });
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
  async checkEventAdmin(eventId, email) {
    return this.get(`/events/${eventId}/check-admin?email=${encodeURIComponent(email)}`);
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
   * @returns {Promise<any>} Response data with sessionId
   */
  async verifyPIN(eventId, pin, email) {
    return this.post(`/events/${eventId}/verify-pin`, { pin, email });
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
