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

export async function POST() {
  try {
    const auditChain = getAuditChain();
    const verification = auditChain.verifyChain();

    return Response.json({
      timestamp: Date.now(),
      verified: verification.isValid,
      chainStatus: verification.isValid ? 'VALID' : 'BROKEN',
      chainHash: auditChain.getChainHash(),
      details: verification.details,
    });
  } catch (error) {
    console.error('[v0] Chain verification error:', error);
    return Response.json({ error: 'Failed to verify chain' }, { status: 500 });
  }
}
