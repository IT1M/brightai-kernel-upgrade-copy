import { getPendingApprovals, getRequest, updateRequestStatus, processKernelRequest } from '@/lib/kernel-engine';
import { addBlock } from '@/lib/audit-chain';

export async function GET() {
  try {
    const pending = getPendingApprovals();

    return Response.json({
      timestamp: new Date().toISOString(),
      pending: pending.map((req) => ({
        id: req.id,
        query: req.originalQuery.substring(0, 200),
        riskLevel: req.riskAssessment.level,
        riskScore: req.riskAssessment.score,
        requiredApprovals: req.riskAssessment.matchedRules?.reduce(
          (max: number, rule: any) => Math.max(max, rule.requiredApprovals || 1),
          1,
        ) || 1,
        createdAt: req.createdAt,
        matchedRules: req.riskAssessment.matchedRules?.map((r: any) => ({ id: r.id, name: r.name })) || [],
        piiMatches: req.piiResult.matches.map(m => ({ type: m.type, masked: true })) || [],
        user: {
          id: req.userId,
          name: req.userName,
        },
      })),
      summary: {
        totalPending: pending.length,
        criticalCount: pending.filter((r) => r.riskAssessment.level === 'critical').length,
        highCount: pending.filter((r) => r.riskAssessment.level === 'high').length,
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

    const kernelRequest = getRequest(requestId);
    if (!kernelRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    let response = null;

    if (action === 'approve') {
      // Mark as approved
      updateRequestStatus(requestId, 'approved', {
        approvalStatus: 'approved',
      });

      addBlock('approval_granted', {
        requestId,
        approver,
      });

      // Execute the AI call with the masked query
      const updatedRequest = getRequest(requestId);
      if (updatedRequest) {
        response = await processKernelRequest(updatedRequest, true);
        
        addBlock('request_executed_after_approval', {
          requestId,
          approver,
          provider: response.provider,
          latencyMs: response.latencyMs,
        });
      }
    } else if (action === 'reject') {
      updateRequestStatus(requestId, 'pending', {
        approvalStatus: 'rejected',
        completedAt: Date.now(),
      });

      addBlock('approval_rejected', {
        requestId,
        approver,
        reason: reason || 'Rejected by approver',
      });

      response = {
        success: true,
        requestId,
        status: 'rejected',
        message: 'The request was rejected.',
      };
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('[v0] Approval action error:', error);
    return Response.json(
      { error: 'Failed to process approval', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
