/**
 * API Client Module
 * Provides unified, promise-based methods for communicating with the backend API.
 */

const API_BASE = '/api/items';
const AUTH_BASE = '/api/auth';

const API = {
  /**
   * Helper to retrieve JWT token
   */
  getToken() {
    return localStorage.getItem('campus_auth_token') || null;
  },

  /**
   * Helper to retrieve currently stored user
   */
  getStoredUser() {
    try {
      const user = localStorage.getItem('campus_auth_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Helper to construct auth headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // ----------------------------------------------------
  // Authentication Endpoints
  // ----------------------------------------------------

  /**
   * Sign In user
   */
  async login(username, password) {
    const response = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    // Save session
    localStorage.setItem('campus_auth_token', data.token);
    localStorage.setItem('campus_auth_user', JSON.stringify(data.user));
    return data;
  },

  /**
   * Register new user
   */
  async register(name, username, password) {
    const response = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password })
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.errors ? data.errors.join(', ') : (data.message || 'Registration failed');
      throw new Error(errorMsg);
    }
    // Save session
    localStorage.setItem('campus_auth_token', data.token);
    localStorage.setItem('campus_auth_user', JSON.stringify(data.user));
    return data;
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('campus_auth_token');
    localStorage.removeItem('campus_auth_user');
  },

  /**
   * Verify current session
   */
  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${AUTH_BASE}/me`, {
        headers: this.getHeaders()
      });
      if (!response.ok) {
        this.logout();
        return null;
      }
      const data = await response.json();
      return data.user;
    } catch {
      return null;
    }
  },

  // ----------------------------------------------------
  // Items CRUD Endpoints
  // ----------------------------------------------------

  /**
   * Fetch list of items with optional filters
   */
  async getItems(params = {}) {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.q && params.q.trim()) query.append('q', params.q.trim());

    const url = `${API_BASE}?${query.toString()}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch items');
    }
    return data;
  },

  /**
   * Fetch single item by ID
   */
  async getItemById(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: this.getHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch item details');
    }
    return data;
  },

  /**
   * Create a new item (Lost or Found) - Protected
   */
  async createItem(itemData) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(itemData)
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.errors ? data.errors.join(', ') : (data.message || 'Failed to create item');
      throw new Error(errorMsg);
    }
    return data;
  },

  /**
   * Update an existing item by ID - Protected
   */
  async updateItem(id, updateData) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updateData)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update item');
    }
    return data;
  },

  /**
   * Delete an item by ID - Protected
   */
  async deleteItem(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete item');
    }
    return data;
  },

  /**
   * Get dashboard statistics
   */
  async getStats() {
    const response = await fetch(`${API_BASE}/stats`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch statistics');
    }
    return data;
  }
};
