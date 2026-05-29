import { getStorage } from '@/lib/in-memory-storage';
import { getAuditChain } from '@/lib/audit-chain';

export async function GET() {
  try {
    const storage = getStorage();

    const awaitingApproval = storage.getRequestsAwaitingApproval();

    return Response.json({
      timestamp: Date.now(),
      pending: awaitingApproval.map((req) => ({
        id: req.id,
        query: req.userQuery.substring(0, 200),
        riskLevel: req.riskAssessment.riskLevel,
        riskScore: req.riskAssessment.score,
        approvalCount: req.approvals.length,
        requiredApprovals: req.riskAssessment.matchedRules.reduce(
          (max: number, rule: any) => Math.max(max, rule.requiredApprovals),
          0,
        ),
        createdAt: req.timestamp,
        matchedRules: req.riskAssessment.matchedRules.map((r: any) => ({ id: r.id, name: r.name })),
        piiMatches: req.piiMatches || [],
      })),
      summary: {
        totalPending: awaitingApproval.length,
        criticalCount: awaitingApproval.filter((r) => r.riskAssessment.riskLevel === 'critical').length,
        highCount: awaitingApproval.filter((r) => r.riskAssessment.riskLevel === 'high').length,
      },
    });
  } catch (error) {
    console.error('[v0] Approvals API error:', error);
    return Response.json({ error: 'Failed to retrieve approvals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { requestId, action, approver, reason } = await request.json();

    if (!requestId || !action || !approver) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const storage = getStorage();
    const auditChain = getAuditChain();

    let updatedRequest;
    let executionResult = null;

    if (action === 'approve') {
      updatedRequest = storage.recordApproval(requestId, 'approver_id', approver);
      auditChain.addEntry('request_approved', approver, requestId, { action });
      
      // Check if all required approvals are met and execute
      if (updatedRequest && updatedRequest.approvalStatus === 'approved') {
        // TODO: Execute the AI call after approval
        // This would call the provider with the masked query
        auditChain.addEntry('request_executed_after_approval', 'system', requestId, {
          approver,
          approvalCount: updatedRequest.approvals.length,
        });
      }
    } else if (action === 'reject') {
      updatedRequest = storage.rejectRequest(requestId, reason || 'Rejected by approver');
      auditChain.addEntry('request_rejected', approver, requestId, { action, reason });
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({
      success: true,
      requestId,
      status: updatedRequest?.approvalStatus,
      approvalCount: updatedRequest?.approvals.length || 0,
      executionResult,
    });
  } catch (error) {
    console.error('[v0] Approval action error:', error);
    return Response.json(
      { error: 'Failed to process approval', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
