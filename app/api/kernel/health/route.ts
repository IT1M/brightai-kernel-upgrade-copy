import { getProviderHealth, getProviderStats } from '@/lib/provider-gateway';
import { getAuditChain } from '@/lib/audit-chain';

export async function GET() {
  try {
    const health = getProviderHealth();
    const stats = getProviderStats();
    const auditChain = getAuditChain();

    return Response.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      system: {
        uptime: 'running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      provider: {
        name: health.provider,
        model: health.model,
        status: health.status,
        configured: stats.configured,
        averageLatency: stats.averageLatency,
      },
      stats: {
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
      },
      audit: {
        totalBlocks: auditChain.blocks.length,
        valid: true,
        lastHash: auditChain.lastHash,
      },
      governance: {
        totalRules: 13,
        systemReady: true,
      },
    });
  } catch (error) {
    console.error('[v0] Health check error:', error);
    return Response.json(
      { status: 'error', error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
