import { getStorage } from '@/lib/in-memory-storage';
import { getAuditChain } from '@/lib/audit-chain';

export async function GET() {
  try {
    const storage = getStorage();
    const auditChain = getAuditChain();

    const auditLog = storage.getAuditLog(200);
    const chainVerification = auditChain.verifyChain();

    return Response.json({
      timestamp: Date.now(),
      auditLog,
      chainVerification: {
        isValid: chainVerification.isValid,
        details: chainVerification.details,
        currentChainHash: auditChain.getChainHash(),
      },
      summary: auditChain.getSummary(),
    });
  } catch (error) {
    console.error('[v0] Audit API error:', error);
    return Response.json({ error: 'Failed to retrieve audit log' }, { status: 500 });
  }
}
