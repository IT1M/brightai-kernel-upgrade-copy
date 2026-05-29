/**
 * API Client Module
 * Handles communication with BrightAI backend
 */

class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL || window.location.origin;
    this.timeout = 30000;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[v0] API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Chat endpoints
  async chat(query, context = '') {
    return this.request('/api/chat', {
      method: 'POST',
      body: { query, context },
    });
  }

  // Health endpoints
  async health() {
    return this.request('/api/health');
  }

  // Statistics endpoints
  async getStats() {
    return this.request('/api/stats');
  }

  // Audit endpoints
  async getAudit() {
    return this.request('/api/audit');
  }

  // Approvals endpoints
  async getPendingApprovals() {
    return this.request('/api/approvals');
  }

  async approveRequest(requestId, approver) {
    return this.request('/api/approvals', {
      method: 'POST',
      body: {
        requestId,
        action: 'approve',
        approver,
      },
    });
  }

  async rejectRequest(requestId, approver, reason) {
    return this.request('/api/approvals', {
      method: 'POST',
      body: {
        requestId,
        action: 'reject',
        approver,
        reason,
      },
    });
  }

  // Evidence endpoints
  async getEvidence() {
    return this.request('/api/evidence');
  }

  // Chain endpoints
  async getChain() {
    return this.request('/api/chain');
  }
}

// Create global instance
window.apiClient = new APIClient();

console.log('[v0] API Client initialized');
