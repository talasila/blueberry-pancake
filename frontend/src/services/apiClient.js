/**
 * API client service for backend communication
 * Handles JWT token management and XSRF token handling
 */

// In development, use Vite proxy (relative path)
// In production, use full URL or environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

class ApiClient {
  constructor() {
    this.jwtToken = null;
    this.csrfToken = null;
  }

  /**
   * Set JWT token
   * @param {string} token - JWT token
   */
  setJWTToken(token) {
    this.jwtToken = token;
    // Also store in localStorage for persistence
    if (token) {
      localStorage.setItem('jwtToken', token);
    } else {
      localStorage.removeItem('jwtToken');
    }
  }

  /**
   * Get JWT token
   * @returns {string|null} JWT token
   */
  getJWTToken() {
    // Try memory first, then localStorage
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
   * Clear JWT token
   */
  clearJWTToken() {
    this.jwtToken = null;
    localStorage.removeItem('jwtToken');
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
   * Make API request with error handling
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token if available (check both memory and localStorage)
    const token = this.getJWTToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add PIN session ID if available for event endpoints
    const eventId = this.getEventIdFromUrl(endpoint);
    if (eventId) {
      const pinSessionId = this.getPINSessionId(eventId);
      if (pinSessionId) {
        headers['X-PIN-Session-Id'] = pinSessionId;
      }
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
        credentials: 'include', // Include cookies for CSRF
      });

      // Handle 401 Unauthorized (token expired or invalid)
      if (response.status === 401) {
        this.clearJWTToken();
        
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
    const response = await this.request(`/events/${eventId}/state`, {
      method: 'PATCH',
      body: JSON.stringify({ state, currentState }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to transition state' }));
      const err = new Error(error.error || 'Failed to transition state');
      err.status = response.status;
      err.currentState = error.currentState;
      throw err;
    }
    
    return response.json();
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
    
    const response = await this.request(`/events/${eventId}/rating-configuration`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update rating configuration' }));
      const err = new Error(error.error || 'Failed to update rating configuration');
      err.status = response.status;
      err.currentUpdatedAt = error.currentUpdatedAt;
      throw err;
    }
    
    return response.json();
  }

  /**
   * Get bookmarks for the current user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address (required for PIN auth)
   * @returns {Promise<any>} Response data with bookmarks array
   */
  async getBookmarks(eventId, email = null) {
    const endpoint = `/events/${eventId}/bookmarks`;
    if (email) {
      // For PIN auth, include email in query string
      return this.get(`${endpoint}?email=${encodeURIComponent(email)}`);
    }
    return this.get(endpoint);
  }

  /**
   * Save bookmarks for the current user in an event
   * @param {string} eventId - Event identifier
   * @param {Array<number>} bookmarks - Array of bookmarked item IDs
   * @param {string} email - User email address (required for PIN auth)
   * @returns {Promise<any>} Response data with saved bookmarks
   */
  async saveBookmarks(eventId, bookmarks, email = null) {
    const endpoint = `/events/${eventId}/bookmarks`;
    const body = { bookmarks };
    if (email) {
      // For PIN auth, include email in body
      body.email = email;
    }
    return this.put(endpoint, body);
  }

  /**
   * Get user profile (name) for the current user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address (required for PIN auth)
   * @returns {Promise<any>} Response data with user profile
   */
  async getUserProfile(eventId, email = null) {
    const endpoint = `/events/${eventId}/profile`;
    if (email) {
      // For PIN auth, include email in query string
      return this.get(`${endpoint}?email=${encodeURIComponent(email)}`);
    }
    return this.get(endpoint);
  }

  /**
   * Update user profile (name) for the current user in an event
   * @param {string} eventId - Event identifier
   * @param {string} name - User name
   * @param {string} email - User email address (required for PIN auth)
   * @returns {Promise<any>} Response data with updated user profile
   */
  async updateUserProfile(eventId, name, email = null) {
    const endpoint = `/events/${eventId}/profile`;
    const body = { name };
    if (email) {
      // For PIN auth, include email in body
      body.email = email;
    }
    return this.put(endpoint, body);
  }
}

// Export singleton instance
export default new ApiClient();
