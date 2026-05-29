import { z } from 'zod';
import { createKernelRequest, processKernelRequest } from '@/lib/kernel-engine';
import { addBlock, getAuditChain } from '@/lib/audit-chain';
import { getProviderHealth } from '@/lib/provider-gateway';

// Zod schema for request validation
const chatRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(4000, 'Query exceeds maximum length'),
  context: z.string().max(2000).optional().default(''),
  compliancePackage: z.enum([
    'general',
    'PDPL',
    'NCA_ECC',
    'NCA_CCC',
    'SFDA',
    'healthcare',
    'procurement',
    'SAMA_Cybersecurity',
    'ISO_27001',
    'ISO_42001',
    'Vision_2030',
  ]).optional().default('general'),
});

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Get user info from headers
    const userId = request.headers.get('x-kernel-user-id') || 'anonymous';
    const userName = request.headers.get('x-kernel-user-name') || 'مستخدم';

    // Parse and validate request body
    const body = await request.json();
    const validationResult = chatRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return Response.json({
        error: 'خطأ في التحقق من البيانات',
        details: validationResult.error.errors,
        requestId,
      }, { status: 400 });
    }

    const { query, context, compliancePackage } = validationResult.data;

    // Create kernel request (handles PII detection, risk assessment, etc.)
    const kernelRequest = createKernelRequest(
      userId,
      userName,
      query,
      compliancePackage
    );

    // Log in audit chain
    addBlock('request_created', {
      requestId: kernelRequest.id,
      userId,
      userName,
      hasPii: kernelRequest.piiResult.hasPII,
      riskLevel: kernelRequest.riskAssessment.level,
      compliancePackage,
    });

    // Process the request
    const response = await processKernelRequest(kernelRequest);
    
    // Log completion or approval required
    if (response.status === 'pending_approval') {
      addBlock('approval_required', {
        requestId: kernelRequest.id,
        riskLevel: response.riskLevel,
        riskScore: response.riskScore,
      });
    } else if (response.status === 'completed') {
      addBlock('request_completed', {
        requestId: kernelRequest.id,
        provider: response.provider,
        model: response.model,
        latencyMs: response.latencyMs,
      });
    }

    // Get audit chain hash
    const auditChain = getAuditChain();
    const chainHash = auditChain.blocks.length > 0 
      ? auditChain.blocks[auditChain.blocks.length - 1].hash 
      : '00000000';

    return Response.json({
      ...response,
      requestId: kernelRequest.id,
      chainHash,
    });
  } catch (error) {
    console.error('[v0] Chat API error:', error);
    
    // Log error in audit chain
    try {
      addBlock('request_error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch (e) {
      // Ignore audit chain errors
    }

    return Response.json(
      { 
        error: 'حدث خطأ في معالجة الطلب',
        requestId,
        success: false,
      },
      { status: 500 },
    );
  }
}
