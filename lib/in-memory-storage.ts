// In-memory storage for development/demo purposes
// In production, replace with a proper database

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    piiDetected?: boolean;
    riskLevel?: string;
    approvalRequired?: boolean;
    approvalId?: string;
    masked?: boolean;
  };
}

interface Approval {
  id: string;
  requestId: string;
  status: 'pending' | 'approved' | 'rejected';
  originalMessage: string;
  maskedMessage: string;
  riskLevel: string;
  piiTypes: string[];
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  aiResponse?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
  hash?: string;
}

interface Storage {
  messages: Message[];
  approvals: Approval[];
  audit: AuditEntry[];
  stats: {
    totalRequests: number;
    piiDetected: number;
    approvalsPending: number;
    approvalsApproved: number;
    approvalsRejected: number;
    riskLevels: { low: number; medium: number; high: number; critical: number };
  };
}

// Global storage instance
let storage: Storage = {
  messages: [],
  approvals: [],
  audit: [],
  stats: {
    totalRequests: 0,
    piiDetected: 0,
    approvalsPending: 0,
    approvalsApproved: 0,
    approvalsRejected: 0,
    riskLevels: { low: 0, medium: 0, high: 0, critical: 0 },
  },
};

export function getStorage(): Storage {
  return storage;
}

export function addMessage(message: Message): void {
  storage.messages.push(message);
  storage.stats.totalRequests++;
  if (message.metadata?.piiDetected) {
    storage.stats.piiDetected++;
  }
  if (message.metadata?.riskLevel) {
    const level = message.metadata.riskLevel as keyof typeof storage.stats.riskLevels;
    if (level in storage.stats.riskLevels) {
      storage.stats.riskLevels[level]++;
    }
  }
}

export function addApproval(approval: Approval): void {
  storage.approvals.push(approval);
  storage.stats.approvalsPending++;
}

export function updateApproval(id: string, updates: Partial<Approval>): Approval | null {
  const index = storage.approvals.findIndex(a => a.id === id);
  if (index === -1) return null;
  
  const approval = storage.approvals[index];
  const wasApproved = updates.status === 'approved' && approval.status === 'pending';
  const wasRejected = updates.status === 'rejected' && approval.status === 'pending';
  
  storage.approvals[index] = { ...approval, ...updates };
  
  if (wasApproved) {
    storage.stats.approvalsPending--;
    storage.stats.approvalsApproved++;
  } else if (wasRejected) {
    storage.stats.approvalsPending--;
    storage.stats.approvalsRejected++;
  }
  
  return storage.approvals[index];
}

export function getApprovalById(id: string): Approval | undefined {
  return storage.approvals.find(a => a.id === id);
}

export function getPendingApprovals(): Approval[] {
  return storage.approvals.filter(a => a.status === 'pending');
}

export function addAuditEntry(entry: AuditEntry): void {
  storage.audit.push(entry);
}

export function resetStorage(): void {
  storage = {
    messages: [],
    approvals: [],
    audit: [],
    stats: {
      totalRequests: 0,
      piiDetected: 0,
      approvalsPending: 0,
      approvalsApproved: 0,
      approvalsRejected: 0,
      riskLevels: { low: 0, medium: 0, high: 0, critical: 0 },
    },
  };
}
