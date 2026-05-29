import { getStorage } from '@/lib/in-memory-storage';
import { getAuditChain } from '@/lib/audit-chain';

export async function GET() {
  try {
    const storage = getStorage();
    const auditChain = getAuditChain();

    const allRequests = storage.getAllRequests();
    const withPii = storage.getRequestsWithPii();

    return Response.json({
      timestamp: Date.now(),
      summary: {
        totalRequests: allRequests.length,
        withPii: withPii.length,
        piiDetectionRate: allRequests.length > 0 ? Math.round((withPii.length / allRequests.length) * 100) : 0,
      },
      evidence: allRequests.map((req) => ({
        id: req.id,
        timestamp: req.timestamp,
        hasPii: req.piiMatches.length > 0,
        piiCount: req.piiMatches.length,
        piiTypes: req.piiMatches.map((m: any) => m.type),
        riskLevel: req.riskAssessment.riskLevel,
        status: req.approvalStatus,
        approvals: req.approvals.length,
        chainHash: auditChain.getChainHash(),
      })),
      chainIntegrity: auditChain.verifyChain(),
    });
  } catch (error) {
    console.error('[v0] Evidence API error:', error);
    return Response.json({ error: 'Failed to retrieve evidence' }, { status: 500 });
  }
}
