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
        // Redirect to landing page to trigger re-authentication
        if (typeof window !== 'undefined') {
          window.location.href = '/';
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
}

// Export singleton instance
export default new ApiClient();
