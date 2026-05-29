import { getAllRequests } from '@/lib/kernel-engine';
import { getProviderStats } from '@/lib/provider-gateway';

export async function GET() {
  try {
    const requests = getAllRequests();
    const providerStats = getProviderStats();

    const riskDistribution = calculateRiskDistribution(requests);
    const piiDetectionRate = calculatePiiRate(requests);
    
    const statusBreakdown = {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.approvalStatus === 'approved').length,
      executed: requests.filter(r => r.approvalStatus === 'executed_after_approval').length,
      completed: requests.filter(r => r.status === 'completed').length,
    };

    return Response.json({
      timestamp: new Date().toISOString(),
      requests: {
        total: requests.length,
        ...statusBreakdown,
      },
      provider: {
        totalRequests: providerStats.totalRequests,
        successfulRequests: providerStats.successfulRequests,
        failedRequests: providerStats.failedRequests,
        averageLatency: providerStats.averageLatency,
      },
      riskDistribution,
      piiDetectionRate,
    });
  } catch (error) {
    console.error('[v0] Stats API error:', error);
    return Response.json({ error: 'Failed to retrieve statistics' }, { status: 500 });
  }
}

function calculateRiskDistribution(requests: any[]) {
  const distribution: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const req of requests) {
    const level = req.riskAssessment?.level || 'low';
    if (level in distribution) {
      distribution[level]++;
    }
  }

  return distribution;
}

function calculatePiiRate(requests: any[]) {
  if (requests.length === 0) return 0;
  const withPii = requests.filter((r) => r.piiResult?.hasPII).length;
  return Math.round((withPii / requests.length) * 100);
}
