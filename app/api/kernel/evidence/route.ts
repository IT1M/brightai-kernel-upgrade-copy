import { getRequest, getAllRequests } from '@/lib/kernel-engine';
import { getAuditChain, getBlocksByAction, verifyChain } from '@/lib/audit-chain';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    
    const auditChain = getAuditChain();
    const verification = verifyChain();

    // If specific request ID is provided
    if (requestId) {
      const req = getRequest(requestId);
      if (!req) {
        return Response.json({ error: 'Request not found' }, { status: 404 });
      }

      const chainEntries = auditChain.blocks.filter(e => 
        e.data.requestId === requestId || e.id.includes(requestId)
      );

      return Response.json({
        timestamp: new Date().toISOString(),
        evidence: {
          requestId: req.id,
          createdAt: req.createdAt,
          completedAt: req.completedAt,
          status: req.approvalStatus,
          riskLevel: req.riskAssessment.level,
          riskScore: req.riskAssessment.score,
          compliancePackage: req.compliancePackage || 'general',
          hasPii: req.piiResult.hasPII,
          piiTypes: req.piiResult.types,
          matchedPolicies: req.riskAssessment.matchedRules?.map((r: any) => ({
            id: r.id,
            name: r.name,
          })) || [],
          provider: req.provider,
          model: req.model,
          latencyMs: req.latencyMs,
          auditTrail: chainEntries.map(e => ({
            timestamp: e.timestamp,
            action: e.action,
            index: e.index,
            hash: e.hash.substring(0, 16),
          })),
          chainHash: auditChain.lastHash,
          generatedAt: Date.now(),
        },
      });
    }

    // Return all completed requests as evidence list
    const allRequests = getAllRequests();
    const completedRequests = allRequests.filter(r => 
      r.status === 'completed' || r.approvalStatus === 'rejected'
    );

    return Response.json({
      timestamp: new Date().toISOString(),
      total: completedRequests.length,
      evidence: completedRequests.slice(0, 50).map(req => ({
        requestId: req.id,
        createdAt: req.createdAt,
        completedAt: req.completedAt,
        status: req.approvalStatus,
        riskLevel: req.riskAssessment.level,
        riskScore: req.riskAssessment.score,
        hasPii: req.piiResult.hasPII,
        piiCount: req.piiResult.types.length,
        policyCount: req.riskAssessment.matchedRules?.length || 0,
        provider: req.provider,
      })),
      chainStatus: verification.valid ? 'VALID' : 'BROKEN',
      chainHash: auditChain.lastHash,
    });
  } catch (error) {
    console.error('[v0] Evidence API error:', error);
    return Response.json({ error: 'Failed to retrieve evidence' }, { status: 500 });
  }
}
