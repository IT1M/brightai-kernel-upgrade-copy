import { getStorage } from '@/lib/in-memory-storage';
import { getAuditChain } from '@/lib/audit-chain';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    
    const storage = getStorage();
    const auditChain = getAuditChain();

    // If specific request ID is provided
    if (requestId) {
      const req = storage.getRequestById(requestId);
      if (!req) {
        return Response.json({ error: 'Request not found' }, { status: 404 });
      }

      const chainEntries = auditChain.getAllEntries()
        .filter(e => e.requestId === requestId);

      return Response.json({
        timestamp: Date.now(),
        evidence: {
          requestId: req.id,
          createdAt: req.timestamp,
          completedAt: req.completedAt,
          status: req.approvalStatus,
          riskLevel: req.riskAssessment.riskLevel,
          riskScore: req.riskAssessment.score,
          compliancePackage: (req as any).compliancePackage || 'general',
          hasPii: req.piiMatches.length > 0,
          piiTypes: req.piiMatches.map((m: any) => m.type),
          matchedPolicies: req.riskAssessment.matchedRules.map((r: any) => ({
            id: r.id,
            name: r.name,
            severity: r.severity,
          })),
          approvals: req.approvals,
          auditTrail: chainEntries.map(e => ({
            timestamp: e.timestamp,
            action: e.action,
            actor: e.actor,
            hash: e.hash,
          })),
          chainHash: auditChain.getChainHash(),
          generatedAt: Date.now(),
        },
      });
    }

    // Return all completed requests as evidence list
    const allRequests = storage.getAllRequests();
    const completedRequests = allRequests.filter(r => 
      r.approvalStatus === 'completed' || r.approvalStatus === 'rejected'
    );

    return Response.json({
      timestamp: Date.now(),
      total: completedRequests.length,
      evidence: completedRequests.slice(0, 50).map(req => ({
        requestId: req.id,
        createdAt: req.timestamp,
        completedAt: req.completedAt,
        status: req.approvalStatus,
        riskLevel: req.riskAssessment.riskLevel,
        riskScore: req.riskAssessment.score,
        hasPii: req.piiMatches.length > 0,
        piiCount: req.piiMatches.length,
        policyCount: req.riskAssessment.matchedRules.length,
      })),
      chainStatus: auditChain.verifyChain().isValid ? 'VALID' : 'BROKEN',
      chainHash: auditChain.getChainHash(),
    });
  } catch (error) {
    console.error('[v0] Evidence API error:', error);
    return Response.json({ error: 'Failed to retrieve evidence' }, { status: 500 });
  }
}
