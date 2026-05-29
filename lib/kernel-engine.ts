// BrightAI Kernel Engine
// Core security, governance and AI orchestration for Saudi enterprise

import { detectPii, maskPii, PIIResult } from './pii-detection';
import { assessRisk, shouldRequireApproval, RiskAssessment } from './governance-pipeline';
import { callProviderWithRetry } from './provider-gateway';
import { addBlock, getAuditChain } from './audit-chain';

export interface KernelRequest {
  id: string;
  userId: string;
  userName: string;
  originalQuery: string;
  maskedQuery: string;
  piiResult: PIIResult;
  riskAssessment: RiskAssessment;
  compliancePackage: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'completed';
  createdAt: number;
  approvalStatus?: 'pending_approval' | 'approved' | 'rejected' | 'executed_after_approval' | 'completed' | 'expired' | 'escalated';
  aiResponse?: string;
  executedAt?: number;
  completedAt?: number;
  provider?: string;
  model?: string;
  latencyMs?: number;
  tokensUsed?: number;
  chainHash?: string;
  matchedPolicies?: string[];
}

export interface KernelResponse {
  success: boolean;
  requestId: string;
  status: string;
  message?: string;
  response?: string;
  riskLevel?: string;
  riskScore?: number;
  hasPii?: boolean;
  piiMatches?: Array<{ type: string; masked: boolean }>;
  provider?: string;
  model?: string;
  latencyMs?: number;
  tokensUsed?: number;
  chainHash?: string;
  matchedPolicies?: string[];
  error?: string;
}

// In-memory storage for demo (marked for production database migration)
// TODO: Replace with real database (Neon PostgreSQL recommended)
const requests = new Map<string, KernelRequest>();

export function createKernelRequest(
  userId: string,
  userName: string,
  query: string,
  compliancePackage: string
): KernelRequest {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const piiResult = detectPii(query);
  const maskedQuery = maskPii(query, piiResult);
  const riskAssessment = assessRisk(query, piiResult, compliancePackage);
  
  // Check if request should be auto-blocked based on compliance package
  const isBlocked = riskAssessment.autoBlocked === true;
  
  const request: KernelRequest = {
    id: requestId,
    userId,
    userName,
    originalQuery: query,
    maskedQuery,
    piiResult,
    riskAssessment,
    compliancePackage,
    status: isBlocked ? 'pending' : 'pending',
    approvalStatus: isBlocked ? 'pending_approval' : (shouldRequireApproval(riskAssessment) ? 'pending_approval' : 'approved'),
    createdAt: Date.now(),
    matchedPolicies: riskAssessment.factors,
  };
  
  requests.set(requestId, request);
  return request;
}

export function getRequest(requestId: string): KernelRequest | undefined {
  return requests.get(requestId);
}

export function updateRequestStatus(
  requestId: string,
  status: KernelRequest['status'],
  data?: Partial<KernelRequest>
): KernelRequest | undefined {
  const request = requests.get(requestId);
  if (!request) return undefined;
  
  const updated = { ...request, status, ...data, completedAt: Date.now() };
  requests.set(requestId, updated);
  return updated;
}

export async function processKernelRequest(
  request: KernelRequest,
  skipApproval = false
): Promise<KernelResponse> {
  try {
    // If approval is required and not skipped
    if (!skipApproval && request.approvalStatus === 'pending_approval') {
      return {
        success: true,
        requestId: request.id,
        status: 'pending_approval',
        message: 'تم وضع الطلب في قائمة الانتظار للمراجعة بسبب قواعد الحوكمة',
        riskLevel: request.riskAssessment.level,
        riskScore: request.riskAssessment.score,
        hasPii: request.piiResult.hasPII,
        piiMatches: request.piiResult.matches.map(m => ({ type: m.type, masked: true })),
        matchedPolicies: request.riskAssessment.factors,
      };
    }

    // Execute AI call with masked query
    request.approvalStatus = 'executed_after_approval';
    const providerResponse = await callProviderWithRetry(
      request.maskedQuery,
      request.compliancePackage
    );

    if (!providerResponse.success) {
      return {
        success: false,
        requestId: request.id,
        status: 'error',
        error: 'فشل الاتصال بمزود الخدمة',
      };
    }

    // Post-response safety check
    const responseCheck = detectPii(providerResponse.response || '');
    const safeResponse = responseCheck.hasPII
      ? maskPii(providerResponse.response || '', responseCheck)
      : providerResponse.response || '';

    // Update request
    request.aiResponse = safeResponse;
    request.status = 'completed';
    request.approvalStatus = 'completed';
    request.executedAt = Date.now();
    request.completedAt = Date.now();
    request.provider = providerResponse.provider;
    request.model = providerResponse.model;
    request.latencyMs = providerResponse.latencyMs;
    request.tokensUsed = providerResponse.tokensUsed;
    request.matchedPolicies = request.riskAssessment.factors;

    requests.set(request.id, request);

    // Log to audit
    addBlock('request_completed', {
      requestId: request.id,
      provider: providerResponse.provider,
      model: providerResponse.model,
      latencyMs: providerResponse.latencyMs,
    });

    return {
      success: true,
      requestId: request.id,
      status: 'completed',
      response: safeResponse,
      riskLevel: request.riskAssessment.level,
      riskScore: request.riskAssessment.score,
      hasPii: request.piiResult.hasPII,
      piiMatches: request.piiResult.matches.map(m => ({ type: m.type, masked: true })),
      provider: providerResponse.provider,
      model: providerResponse.model,
      latencyMs: providerResponse.latencyMs,
      tokensUsed: providerResponse.tokensUsed,
      matchedPolicies: request.riskAssessment.factors,
    };
  } catch (error) {
    addBlock('request_error', {
      requestId: request.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      requestId: request.id,
      status: 'error',
      error: 'حدث خطأ في معالجة الطلب',
    };
  }
}

export function getAllRequests(): KernelRequest[] {
  return Array.from(requests.values());
}

export function getRequestsByStatus(status: KernelRequest['status']): KernelRequest[] {
  return Array.from(requests.values()).filter(r => r.status === status);
}

export function getPendingApprovals(): KernelRequest[] {
  return Array.from(requests.values()).filter(
    r => r.approvalStatus === 'pending_approval'
  );
}
