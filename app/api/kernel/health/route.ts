import { getGateway } from '@/lib/provider-gateway';
import { getStorage } from '@/lib/in-memory-storage';
import { getAuditChain } from '@/lib/audit-chain';

export async function GET() {
  try {
    const gateway = getGateway();
    const storage = getStorage();
    const auditChain = getAuditChain();

    const stats = storage.getStats();
    const providerStats = gateway.getProviderStats();
    const chainSummary = auditChain.getSummary();

    return Response.json({
      status: 'operational',
      timestamp: Date.now(),
      system: {
        uptime: 'running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      requests: stats,
      provider: {
        name: providerStats.currentProvider || 'demo',
        model: providerStats.model || 'Demo Mode',
        configured: providerStats.configured ?? false,
        latencyMs: providerStats.averageLatency || 0,
      },
      providers: providerStats,
      auditChain: chainSummary,
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
