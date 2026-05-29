import { getAuditChain } from '@/lib/audit-chain';

export async function GET() {
  try {
    const auditChain = getAuditChain();

    const verification = auditChain.verifyChain();
    const entries = auditChain.getAllEntries();

    return Response.json({
      timestamp: Date.now(),
      chainStatus: verification.isValid ? 'VALID' : 'BROKEN',
      chainHash: auditChain.getChainHash(),
      verification,
      totalEntries: entries.length,
      entries: entries.map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        requestId: entry.requestId,
        hash: entry.hash.substring(0, 16) + '...',
        previousHash: entry.previousHash.substring(0, 16) + '...',
        verified: true,
      })),
      summary: auditChain.getSummary(),
    });
  } catch (error) {
    console.error('[v0] Chain API error:', error);
    return Response.json({ error: 'Failed to retrieve chain' }, { status: 500 });
  }
}
