import { z } from 'zod';
import { detectPii, maskPii } from '@/lib/pii-detection';
import { assessRisk, createGovernanceRequest, shouldRequireApproval } from '@/lib/governance-pipeline';
import { getGateway } from '@/lib/provider-gateway';
import { getAuditChain } from '@/lib/audit-chain';
import { getStorage } from '@/lib/in-memory-storage';

// Zod schema for request validation
const chatRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(4000, 'Query exceeds maximum length'),
  context: z.string().max(2000).optional().default(''),
  compliancePackage: z.enum([
    'general',
    'PDPL',
    'NCA_ECC',
    'NCA_CCC',
    'SFDA',
    'healthcare',
    'procurement',
    'SAMA_Cybersecurity',
    'ISO_27001',
    'ISO_42001',
    'Vision_2030',
  ]).optional().default('general'),
});

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Get user info from headers
    const userId = request.headers.get('x-kernel-user-id') || 'anonymous';
    const userName = request.headers.get('x-kernel-user-name') || 'مستخدم';

    // Parse and validate request body
    const body = await request.json();
    const validationResult = chatRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return Response.json({
        error: 'Validation error',
        details: validationResult.error.errors,
        requestId,
      }, { status: 400 });
    }

    const { query, context, compliancePackage } = validationResult.data;

    // Step 1: Detect PII
    const piiResult = detectPii(query);
    const maskedQuery = piiResult.maskedText;

    // Step 2: Assess risk
    const riskAssessment = assessRisk(piiResult.detectionScore, 0.3, 0.2);

    // Step 3: Create governance request
    const govRequest = createGovernanceRequest(
      query,
      maskedQuery,
      query,
      piiResult.matches,
      riskAssessment
    );
    govRequest.id = requestId;
    (govRequest as any).userId = userId;
    (govRequest as any).userName = userName;
    (govRequest as any).compliancePackage = compliancePackage;

    // Step 4: Save request
    const storage = getStorage();
    storage.saveRequest(govRequest);

    // Step 5: Log in audit chain
    const auditChain = getAuditChain();
    auditChain.addEntry(
      'request_created',
      userId,
      govRequest.id,
      {
        hasPii: piiResult.hasPii,
        riskLevel: riskAssessment.riskLevel,
        matchedRules: riskAssessment.matchedRules.length,
        compliancePackage,
        userName,
      },
    );

    // Step 6: Determine if approval is needed
    const needsApproval = shouldRequireApproval(riskAssessment);

    if (needsApproval) {
      return Response.json({
        requestId: govRequest.id,
        status: 'pending_approval',
        message: 'تم وضع الطلب في قائمة الانتظار للمراجعة بسبب قواعد الحوكمة',
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.score,
        requiredApprovals: riskAssessment.matchedRules.reduce(
          (max, rule) => Math.max(max, rule.requiredApprovals),
          0,
        ),
        matchedRules: riskAssessment.matchedRules.map((r) => ({ id: r.id, name: r.name })),
        hasPii: piiResult.hasPii,
        piiMatches: piiResult.matches.map(m => ({
          type: m.type,
          masked: true,
        })),
        chainHash: auditChain.getChainHash(),
      });
    }

    // Step 7: Process immediately if no approval needed
    const gateway = getGateway();
    const providerResponse = await gateway.callWithFallback(maskedQuery, context);

    // Step 8: Post-response safety check
    const responseCheck = detectPii(providerResponse.response);
    const safeResponse = responseCheck.hasPii 
      ? responseCheck.maskedText 
      : providerResponse.response;

    // Update request
    govRequest.aiResponse = safeResponse;
    govRequest.approvalStatus = 'completed';
    govRequest.executedAt = Date.now();
    govRequest.completedAt = Date.now();
    storage.updateRequest(govRequest);

    // Log completion
    auditChain.addEntry(
      'request_completed',
      'system',
      govRequest.id,
      {
        provider: providerResponse.provider,
        model: providerResponse.model,
        responseLength: safeResponse.length,
        latencyMs: providerResponse.latencyMs,
        tokensUsed: providerResponse.tokensUsed,
      },
    );

    return Response.json({
      requestId: govRequest.id,
      status: 'completed',
      response: safeResponse,
      provider: providerResponse.provider,
      model: providerResponse.model,
      riskLevel: riskAssessment.riskLevel,
      riskScore: riskAssessment.score,
      hasPii: piiResult.hasPii,
      piiMatches: piiResult.matches.map(m => ({
        type: m.type,
        masked: true,
      })),
      tokensUsed: providerResponse.tokensUsed,
      latencyMs: providerResponse.latencyMs,
      chainHash: auditChain.getChainHash(),
      matchedPolicies: riskAssessment.matchedRules.map((r) => r.name),
    });
  } catch (error) {
    console.error('[v0] Chat API error:', error);
    
    // Log error in audit chain
    try {
      const auditChain = getAuditChain();
      auditChain.addEntry('request_error', 'system', requestId, {
        error: error instanceof Error ? error.message : String(error),
      });
    } catch (e) {
      // Ignore audit chain errors
    }

    return Response.json(
      { 
        error: 'حدث خطأ في معالجة الطلب',
        requestId,
      },
      { status: 500 },
    );
  }
}
