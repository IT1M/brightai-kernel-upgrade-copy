import { detectPii, maskPii } from '@/lib/pii-detection';
import { assessRisk, createGovernanceRequest, shouldRequireApproval } from '@/lib/governance-pipeline';
import { getGateway } from '@/lib/provider-gateway';
import { getAuditChain } from '@/lib/audit-chain';
import { getStorage } from '@/lib/in-memory-storage';

export async function POST(request: Request) {
  try {
    const { query, context = '' } = await request.json();

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Step 1: Detect PII
    const piiResult = detectPii(query);
    const maskedQuery = piiResult.maskedText;

    // Step 2: Assess risk
    const riskAssessment = assessRisk(piiResult.detectionScore, 0.3, 0.2);

    // Step 3: Create governance request
    const govRequest = createGovernanceRequest(query, maskedQuery, query, piiResult.matches, riskAssessment);

    // Step 4: Save request
    const storage = getStorage();
    storage.saveRequest(govRequest);

    // Step 5: Log in audit chain
    const auditChain = getAuditChain();
    auditChain.addEntry(
      'request_created',
      'system',
      govRequest.id,
      {
        hasPii: piiResult.hasPii,
        riskLevel: riskAssessment.riskLevel,
        matchedRules: riskAssessment.matchedRules.length,
      },
    );

    // Step 6: Determine if approval is needed
    const needsApproval = shouldRequireApproval(riskAssessment);

    if (needsApproval) {
      return Response.json({
        requestId: govRequest.id,
        status: 'pending_approval',
        message: 'Request flagged for review due to governance rules',
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.score,
        requiredApprovals: riskAssessment.matchedRules.reduce(
          (max, rule) => Math.max(max, rule.requiredApprovals),
          0,
        ),
        matchedRules: riskAssessment.matchedRules.map((r) => ({ id: r.id, name: r.name })),
        hasPii: piiResult.hasPii,
        piiMatches: piiResult.matches.length,
      });
    }

    // Step 7: Process immediately if no approval needed
    const gateway = getGateway();
    const providerResponse = await gateway.callWithFallback(maskedQuery, context);

    govRequest.aiResponse = providerResponse.response;
    govRequest.approvalStatus = 'completed';
    govRequest.executedAt = Date.now();
    govRequest.completedAt = Date.now();
    storage.updateRequest(govRequest);

    auditChain.addEntry(
      'request_completed',
      'system',
      govRequest.id,
      {
        provider: providerResponse.provider,
        responseLength: providerResponse.response.length,
      },
    );

    return Response.json({
      requestId: govRequest.id,
      status: 'completed',
      response: providerResponse.response,
      provider: providerResponse.model,
      riskLevel: riskAssessment.riskLevel,
      hasPii: piiResult.hasPii,
      tokensUsed: providerResponse.tokensUsed,
      latencyMs: providerResponse.latencyMs,
    });
  } catch (error) {
    console.error('[v0] Chat API error:', error);
    return Response.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
