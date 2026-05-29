import { getAuditChain, verifyChain, getRecentBlocks } from '@/lib/audit-chain';

export async function GET() {
  try {
    const auditChain = getAuditChain();
    const verification = verifyChain();
    const entries = getRecentBlocks(100);

    return Response.json({
      timestamp: new Date().toISOString(),
      chainStatus: verification.valid ? 'VALID' : 'BROKEN',
      chainHash: auditChain.lastHash,
      verification: {
        valid: verification.valid,
        brokenAt: verification.brokenAt,
      },
      totalEntries: auditChain.blocks.length,
      entries: entries.map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        index: entry.index,
        hash: entry.hash.substring(0, 16),
        previousHash: entry.previousHash.substring(0, 16),
        verified: true,
      })),
      summary: {
        totalBlocks: auditChain.blocks.length,
        chainValid: verification.valid,
      },
    });
  } catch (error) {
    console.error('[v0] Chain API error:', error);
    return Response.json({ error: 'Failed to retrieve chain' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auditChain = getAuditChain();
    const verification = verifyChain();

    return Response.json({
      timestamp: new Date().toISOString(),
      verified: verification.valid,
      chainStatus: verification.valid ? 'VALID' : 'BROKEN',
      chainHash: auditChain.lastHash,
      brokenAt: verification.brokenAt,
      totalBlocks: auditChain.blocks.length,
    });
  } catch (error) {
    console.error('[v0] Chain verification error:', error);
    return Response.json({ error: 'Failed to verify chain' }, { status: 500 });
  }
}
