/**
 * In-Memory Storage Module
 * Stores governance requests, approvals, and system state
 * Note: For production, replace with a database (Neon, Supabase, etc.)
 */

import { GovernanceRequest, ApprovalStatus } from './governance-pipeline';

export interface StorageStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  averageRiskScore: number;
}

export class InMemoryStorage {
  private requests: Map<string, GovernanceRequest> = new Map();
  private requestsByStatus: Map<ApprovalStatus, Set<string>> = new Map();
  private userApprovals: Map<string, string[]> = new Map(); // user -> [request_ids]

  constructor() {
    // Initialize status maps
    const statuses: ApprovalStatus[] = ['pending', 'approved', 'executed_after_approval', 'completed', 'rejected'];
    for (const status of statuses) {
      this.requestsByStatus.set(status, new Set());
    }
  }

  saveRequest(request: GovernanceRequest): void {
    this.requests.set(request.id, request);
    const currentStatus = this.requestsByStatus.get(request.approvalStatus);
    if (currentStatus) {
      currentStatus.add(request.id);
    }
  }

  getRequest(requestId: string): GovernanceRequest | undefined {
    return this.requests.get(requestId);
  }

  updateRequest(request: GovernanceRequest): void {
    const existing = this.requests.get(request.id);
    if (existing) {
      // Remove from old status
      const oldStatus = this.requestsByStatus.get(existing.approvalStatus);
      if (oldStatus) {
        oldStatus.delete(request.id);
      }

      // Add to new status
      const newStatus = this.requestsByStatus.get(request.approvalStatus);
      if (newStatus) {
        newStatus.add(request.id);
      }
    }

    this.requests.set(request.id, request);
  }

  getRequestsByStatus(status: ApprovalStatus): GovernanceRequest[] {
    const ids = this.requestsByStatus.get(status) || new Set();
    return Array.from(ids)
      .map((id) => this.requests.get(id))
      .filter((req): req is GovernanceRequest => req !== undefined);
  }

  getAllRequests(): GovernanceRequest[] {
    return Array.from(this.requests.values());
  }

  getRequestsByUser(userId: string): GovernanceRequest[] {
    const requestIds = this.userApprovals.get(userId) || [];
    return requestIds
      .map((id) => this.requests.get(id))
      .filter((req): req is GovernanceRequest => req !== undefined);
  }

  recordApproval(requestId: string, userId: string, approverName: string): GovernanceRequest | undefined {
    const request = this.requests.get(requestId);
    if (!request) return undefined;

    request.approvals.push({
      timestamp: Date.now(),
      approver: approverName,
    });

    // Track user approvals
    if (!this.userApprovals.has(userId)) {
      this.userApprovals.set(userId, []);
    }
    const userRequests = this.userApprovals.get(userId);
    if (userRequests && !userRequests.includes(requestId)) {
      userRequests.push(requestId);
    }

    // Update status if we have enough approvals
    const requiredApprovals = request.riskAssessment.matchedRules.reduce(
      (max, rule) => Math.max(max, rule.requiredApprovals),
      0,
    );

    if (request.approvals.length >= requiredApprovals && requiredApprovals > 0) {
      request.approvalStatus = 'approved';
    }

    this.updateRequest(request);
    return request;
  }

  rejectRequest(requestId: string, reason: string): GovernanceRequest | undefined {
    const request = this.requests.get(requestId);
    if (!request) return undefined;

    request.approvalStatus = 'rejected';
    request.completedAt = Date.now();
    this.updateRequest(request);
    return request;
  }

  executeRequest(requestId: string, response: string): GovernanceRequest | undefined {
    const request = this.requests.get(requestId);
    if (!request) return undefined;

    request.aiResponse = response;
    request.approvalStatus = 'executed_after_approval';
    request.executedAt = Date.now();
    this.updateRequest(request);
    return request;
  }

  completeRequest(requestId: string): GovernanceRequest | undefined {
    const request = this.requests.get(requestId);
    if (!request) return undefined;

    request.approvalStatus = 'completed';
    request.completedAt = Date.now();
    this.updateRequest(request);
    return request;
  }

  getStats(): StorageStats {
    const all = Array.from(this.requests.values());

    const riskScores = all.map((r) => r.riskAssessment.score);
    const avgRiskScore = riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;

    return {
      totalRequests: all.length,
      pendingRequests: this.requestsByStatus.get('pending')?.size || 0,
      approvedRequests: this.requestsByStatus.get('approved')?.size || 0,
      completedRequests: this.requestsByStatus.get('completed')?.size || 0,
      rejectedRequests: this.requestsByStatus.get('rejected')?.size || 0,
      averageRiskScore: Math.round(avgRiskScore * 100) / 100,
    };
  }

  exportAsJson(): string {
    return JSON.stringify(
      {
        exportTime: Date.now(),
        stats: this.getStats(),
        requests: Array.from(this.requests.values()),
      },
      null,
      2,
    );
  }

  importFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      this.requests.clear();
      for (const status of this.requestsByStatus.values()) {
        status.clear();
      }

      for (const request of data.requests) {
        this.saveRequest(request);
      }
      return true;
    } catch (error) {
      console.error('[v0] Failed to import storage:', error);
      return false;
    }
  }

  clear(): void {
    this.requests.clear();
    for (const status of this.requestsByStatus.values()) {
      status.clear();
    }
    this.userApprovals.clear();
  }

  // Advanced filtering
  getRequestsWithPii(): GovernanceRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.piiMatches.length > 0);
  }

  getHighRiskRequests(): GovernanceRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.riskAssessment.riskLevel === 'high' || r.riskAssessment.riskLevel === 'critical');
  }

  getRequestsAwaitingApproval(): GovernanceRequest[] {
    return this.getRequestsByStatus('pending').filter(
      (r) => r.riskAssessment.matchedRules.length > 0 && r.approvals.length < r.riskAssessment.matchedRules.reduce(
        (max, rule) => Math.max(max, rule.requiredApprovals),
        0,
      )
    );
  }

  getAuditLog(limit: number = 100): Array<{
    timestamp: number;
    action: string;
    requestId: string;
    details: string;
  }> {
    const logs: Array<{
      timestamp: number;
      action: string;
      requestId: string;
      details: string;
    }> = [];

    for (const request of Array.from(this.requests.values()).reverse()) {
      logs.push({
        timestamp: request.timestamp,
        action: 'request_created',
        requestId: request.id,
        details: `Query: "${request.userQuery.substring(0, 100)}..."`,
      });

      for (const approval of request.approvals) {
        logs.push({
          timestamp: approval.timestamp,
          action: 'request_approved',
          requestId: request.id,
          details: `Approved by ${approval.approver}`,
        });
      }

      if (request.executedAt) {
        logs.push({
          timestamp: request.executedAt,
          action: 'request_executed',
          requestId: request.id,
          details: `Response length: ${request.aiResponse?.length || 0} chars`,
        });
      }

      if (request.completedAt) {
        logs.push({
          timestamp: request.completedAt,
          action: 'request_completed',
          requestId: request.id,
          details: `Status: ${request.approvalStatus}`,
        });
      }

      if (logs.length >= limit) break;
    }

    return logs.slice(0, limit);
  }
}

// Singleton instance
let storageInstance: InMemoryStorage | null = null;

export function getStorage(): InMemoryStorage {
  if (!storageInstance) {
    storageInstance = new InMemoryStorage();
  }
  return storageInstance;
}

export function resetStorage(): void {
  if (storageInstance) {
    storageInstance.clear();
  }
  storageInstance = null;
}
