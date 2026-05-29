// Audit Chain - Immutable audit trail with hash chain
// Provides tamper-evident logging for compliance

import { addAuditEntry, getStorage } from './in-memory-storage';

interface AuditBlock {
  id: string;
  index: number;
  timestamp: string;
  action: string;
  data: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

interface AuditChain {
  blocks: AuditBlock[];
  lastHash: string;
}

// Simple hash function for demo (in production, use crypto)
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateBlockHash(block: Omit<AuditBlock, 'hash'>): string {
  const data = JSON.stringify({
    index: block.index,
    timestamp: block.timestamp,
    action: block.action,
    data: block.data,
    previousHash: block.previousHash,
  });
  return simpleHash(data);
}

// Global audit chain instance
let auditChain: AuditChain = {
  blocks: [],
  lastHash: '00000000',
};

export function getAuditChain(): AuditChain {
  return auditChain;
}

export function addBlock(action: string, data: Record<string, unknown>): AuditBlock {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const block: Omit<AuditBlock, 'hash'> = {
    id,
    index: auditChain.blocks.length,
    timestamp,
    action,
    data,
    previousHash: auditChain.lastHash,
  };
  
  const hash = generateBlockHash(block);
  const completeBlock: AuditBlock = { ...block, hash };
  
  auditChain.blocks.push(completeBlock);
  auditChain.lastHash = hash;
  
  // Also add to in-memory storage for API access
  addAuditEntry({
    id,
    action,
    timestamp,
    details: data,
    hash,
  });
  
  return completeBlock;
}

export function verifyChain(): { valid: boolean; brokenAt?: number } {
  for (let i = 0; i < auditChain.blocks.length; i++) {
    const block = auditChain.blocks[i];
    
    // Verify hash
    const expectedHash = generateBlockHash({
      id: block.id,
      index: block.index,
      timestamp: block.timestamp,
      action: block.action,
      data: block.data,
      previousHash: block.previousHash,
    });
    
    if (block.hash !== expectedHash) {
      return { valid: false, brokenAt: i };
    }
    
    // Verify chain linkage
    if (i > 0 && block.previousHash !== auditChain.blocks[i - 1].hash) {
      return { valid: false, brokenAt: i };
    }
  }
  
  return { valid: true };
}

export function getRecentBlocks(limit: number = 50): AuditBlock[] {
  return auditChain.blocks.slice(-limit).reverse();
}

export function getBlocksByAction(action: string): AuditBlock[] {
  return auditChain.blocks.filter(b => b.action === action);
}

export function getBlockById(id: string): AuditBlock | undefined {
  return auditChain.blocks.find(b => b.id === id);
}

export function resetAuditChain(): void {
  auditChain = {
    blocks: [],
    lastHash: '00000000',
  };
}

// Log common actions
export function logChatRequest(requestId: string, message: string, piiDetected: boolean, riskLevel: string): AuditBlock {
  return addBlock('CHAT_REQUEST', {
    requestId,
    messageLength: message.length,
    piiDetected,
    riskLevel,
  });
}

export function logApprovalCreated(approvalId: string, riskLevel: string, piiTypes: string[]): AuditBlock {
  return addBlock('APPROVAL_CREATED', {
    approvalId,
    riskLevel,
    piiTypes,
  });
}

export function logApprovalDecision(approvalId: string, decision: 'approved' | 'rejected', reviewedBy?: string): AuditBlock {
  return addBlock('APPROVAL_DECISION', {
    approvalId,
    decision,
    reviewedBy: reviewedBy || 'system',
  });
}

export function logAIResponse(requestId: string, responseLength: number, model: string): AuditBlock {
  return addBlock('AI_RESPONSE', {
    requestId,
    responseLength,
    model,
  });
}

export function logSystemEvent(event: string, details: Record<string, unknown>): AuditBlock {
  return addBlock('SYSTEM_EVENT', {
    event,
    ...details,
  });
}
