import { getAuditChain, verifyChain, getRecentBlocks } from '@/lib/audit-chain';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const auditChain = getAuditChain();
    const recentBlocks = getRecentBlocks(limit);
    const verification = verifyChain();

    return Response.json({
      timestamp: new Date().toISOString(),
      auditLog: recentBlocks.map(block => ({
        id: block.id,
        action: block.action,
        timestamp: block.timestamp,
        index: block.index,
        hash: block.hash.substring(0, 16),
        data: block.data,
      })),
      chainVerification: {
        valid: verification.valid,
        brokenAt: verification.brokenAt,
        totalBlocks: auditChain.blocks.length,
        lastHash: auditChain.lastHash,
      },
      summary: {
        totalBlocks: auditChain.blocks.length,
        actions: Array.from(new Set(auditChain.blocks.map(b => b.action))),
      },
    });
  } catch (error) {
    console.error('[v0] Audit API error:', error);
    return Response.json({ error: 'Failed to retrieve audit log' }, { status: 500 });
  }
}
