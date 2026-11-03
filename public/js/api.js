/**
 * API Client Module
 * Provides unified, promise-based methods for communicating with the backend API.
 */

const API_BASE = '/api/items';

const API = {
  /**
   * Fetch list of items with optional filters
   * @param {Object} params - { type, category, status, q }
   */
  async getItems(params = {}) {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.q && params.q.trim()) query.append('q', params.q.trim());

    const url = `${API_BASE}?${query.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch items');
    }
    return data;
  },

  /**
   * Fetch single item by ID
   * @param {string} id
   */
  async getItemById(id) {
    const response = await fetch(`${API_BASE}/${id}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch item details');
    }
    return data;
  },

  /**
   * Create a new item (Lost or Found)
   * @param {Object} itemData
   */
  async createItem(itemData) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
   * Update an existing item by ID
   * @param {string} id
   * @param {Object} updateData
   */
  async updateItem(id, updateData) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update item');
    }
    return data;
  },

  /**
   * Delete an item by ID
   * @param {string} id
   */
  async deleteItem(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
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
