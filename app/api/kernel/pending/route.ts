import { getPendingApprovals } from '@/lib/kernel-engine';

/**
 * GET /api/kernel/pending
 * Returns count of pending approvals for nav badge pulse
 */
export async function GET() {
  try {
    const pending = getPendingApprovals();
    
    return Response.json({
      count: pending.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Pending count error:', error);
    return Response.json({ count: 0, error: 'Failed to get pending count' }, { status: 500 });
  }
}
