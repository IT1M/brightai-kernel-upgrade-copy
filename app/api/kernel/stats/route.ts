import { getStorage } from '@/lib/in-memory-storage';

export async function GET() {
  try {
    const storage = getStorage();
    const stats = storage.getStats();

    return Response.json({
      timestamp: Date.now(),
      statistics: stats,
      breakdown: {
        pending: storage.getRequestsByStatus('pending').length,
        approved: storage.getRequestsByStatus('approved').length,
        executed: storage.getRequestsByStatus('executed_after_approval').length,
        completed: storage.getRequestsByStatus('completed').length,
        rejected: storage.getRequestsByStatus('rejected').length,
      },
      riskDistribution: calculateRiskDistribution(storage.getAllRequests()),
      piiDetectionRate: calculatePiiRate(storage.getAllRequests()),
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
    minimal: 0,
  };

  for (const req of requests) {
    const level = req.riskAssessment?.riskLevel;
    if (level && level in distribution) {
      distribution[level]++;
    }
  }

  return distribution;
}

function calculatePiiRate(requests: any[]) {
  if (requests.length === 0) return 0;
  const withPii = requests.filter((r) => r.piiMatches && r.piiMatches.length > 0).length;
  return Math.round((withPii / requests.length) * 100);
}
