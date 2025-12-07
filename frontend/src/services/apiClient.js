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
    // Store in httpOnly cookie would be better, but for now use memory
    // In production, consider httpOnly cookies
  }

  /**
   * Get JWT token
   * @returns {string|null} JWT token
   */
  getJWTToken() {
    return this.jwtToken;
  }

  /**
   * Clear JWT token
   */
  clearJWTToken() {
    this.jwtToken = null;
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

    // Add JWT token if available
    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
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

      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        this.clearJWTToken();
        // Could trigger re-authentication flow here
      }

      // Handle errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
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
    return response.json();
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
    return response.json();
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
}

// Export singleton instance
export default new ApiClient();
