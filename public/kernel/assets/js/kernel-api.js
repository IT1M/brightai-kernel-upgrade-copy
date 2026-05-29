/**
 * BrightAI Kernel - API Client
 * Handles all communication with the backend API
 */

(function (global) {
  'use strict';

  class KernelAPI {
    constructor() {
      this.baseURL = '/api/kernel';
      this.timeout = 30000;
      this.retryAttempts = 3;
      this.retryDelays = [500, 1000, 2000]; // Exponential backoff
    }

    /**
     * Make an API request with retry logic
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async request(endpoint, options = {}) {
      const url = `${this.baseURL}${endpoint}`;
      const method = options.method || 'GET';
      
      const headers = {
        'Content-Type': 'application/json',
        'x-kernel-user-id': KernelUtils?.getUserId() || 'anonymous',
        'x-kernel-user-name': KernelUtils?.getUserName() || 'مستخدم',
        ...(options.headers || {}),
      };

      let lastError;
      
      for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
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
            const errorData = await response.json().catch(() => ({}));
            throw new APIError(
              errorData.error || `HTTP ${response.status}`,
              response.status,
              errorData
            );
          }

          return await response.json();
        } catch (error) {
          lastError = error;
          
          // Don't retry on client errors (4xx)
          if (error instanceof APIError && error.status >= 400 && error.status < 500) {
            throw error;
          }

          // Wait before retrying (exponential backoff)
          if (attempt < this.retryAttempts - 1) {
            await this.sleep(this.retryDelays[attempt]);
          }
        }
      }

      throw lastError;
    }

    /**
     * Sleep for a duration
     * @param {number} ms - Milliseconds
     * @returns {Promise<void>}
     */
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Health & Status Endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check system health
     * @returns {Promise<Object>} Health status
     */
    async health() {
      return this.request('/health');
    }

    /**
     * Get provider status
     * @returns {Promise<Object>} Provider info
     */
    async getProviderStatus() {
      try {
        const health = await this.health();
        return {
          status: health.status,
          provider: health.provider?.name || 'demo',
          model: health.provider?.model || 'Demo Mode',
          configured: health.provider?.configured || false,
        };
      } catch (error) {
        return {
          status: 'error',
          provider: 'demo',
          model: 'Demo Mode',
          configured: false,
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Chat Endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send a chat message
     * @param {string} query - User query
     * @param {string} context - Optional context
     * @param {string} compliancePackage - Compliance package
     * @returns {Promise<Object>} Chat response
     */
    async chat(query, context = '', compliancePackage = 'general') {
      return this.request('/chat', {
        method: 'POST',
        body: {
          query,
          context,
          compliancePackage,
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Statistics Endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get system statistics
     * @returns {Promise<Object>} Statistics data
     */
    async getStats() {
      return this.request('/stats');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Audit Endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get audit log entries
     * @param {Object} params - Filter parameters
     * @returns {Promise<Object>} Audit entries
     */
    async getAuditLog(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return this.request(`/audit${queryString ? '?' + queryString : ''}`);
    }

    /**
     * Get audit chain status
     * @returns {Promise<Object>} Chain verification data
     */
    async getChain() {
      return this.request('/chain');
    }

    /**
     * Verify chain integrity
     * @returns {Promise<Object>} Verification result
     */
    async verifyChain() {
      return this.request('/chain/verify', { method: 'POST' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Approvals Endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get pending approvals
     * @returns {Promise<Object>} Pending approvals list
     */
    async getPendingApprovals() {
      return this.request('/approvals');
    }

    /**
     * Get pending count only
     * @returns {Promise<number>} Pending count
     */
    async getPendingCount() {
      try {
        const data = await this.getPendingApprovals();
        return data.summary?.totalPending || 0;
      } catch (error) {
        return 0;
      }
    }

    /**
     * Approve a request
     * @param {string} requestId - Request ID
     * @param {string} approver - Approver name
     * @returns {Promise<Object>} Approval result
     */
    async approveRequest(requestId, approver) {
      return this.request('/approvals', {
        method: 'POST',
        body: {
          requestId,
          action: 'approve',
          approver,
        },
      });
    }

    /**
     * Reject a request
     * @param {string} requestId - Request ID
     * @param {string} approver - Approver name
     * @param {string} reason - Rejection reason
     * @returns {Promise<Object>} Rejection result
     */
    async rejectRequest(requestId, approver, reason = '') {
      return this.request('/approvals', {
        method: 'POST',
        body: {
          requestId,
          action: 'reject',
          approver,
          reason,
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Evidence Endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get evidence records
     * @param {Object} params - Filter parameters
     * @returns {Promise<Object>} Evidence records
     */
    async getEvidence(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return this.request(`/evidence${queryString ? '?' + queryString : ''}`);
    }

    /**
     * Get single evidence record
     * @param {string} requestId - Request ID
     * @returns {Promise<Object>} Evidence record
     */
    async getEvidenceById(requestId) {
      return this.request(`/evidence/${requestId}`);
    }

    /**
     * Export evidence as JSON
     * @param {string} requestId - Request ID
     * @returns {Promise<Object>} Evidence data
     */
    async exportEvidence(requestId) {
      return this.request(`/evidence/${requestId}/export`);
    }
  }

  /**
   * Custom API Error class
   */
  class APIError extends Error {
    constructor(message, status, data = {}) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.data = data;
    }
  }

  // Create global instance
  const kernelAPI = new KernelAPI();

  // Export to global scope
  global.KernelAPI = KernelAPI;
  global.kernelAPI = kernelAPI;
  global.APIError = APIError;

})(typeof window !== 'undefined' ? window : this);
