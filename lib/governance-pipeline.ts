// Governance Pipeline
// Risk assessment and approval workflow management

import { PIIResult } from './pii-detection';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  factors: string[];
  requiresApproval: boolean;
  autoApprove: boolean;
}

export interface GovernanceRequest {
  id: string;
  originalMessage: string;
  maskedMessage: string;
  piiResult: PIIResult;
  riskAssessment: RiskAssessment;
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// Risk level thresholds
const RISK_THRESHOLDS = {
  low: 20,
  medium: 40,
  high: 70,
  critical: 85,
};

// High-risk PII types that require approval
const HIGH_RISK_PII_TYPES = [
  'saudi_id',
  'credit_card',
  'saudi_iban',
  'bank_account',
  'medical_id',
  'passport',
];

// Keywords that increase risk score
const RISK_KEYWORDS = [
  { pattern: /(?:كلمة السر|password|كلمة المرور)/gi, weight: 15 },
  { pattern: /(?:سري|confidential|secret)/gi, weight: 10 },
  { pattern: /(?:تحويل|transfer|نقل أموال)/gi, weight: 12 },
  { pattern: /(?:حذف|delete|إزالة)/gi, weight: 8 },
  { pattern: /(?:admin|مدير|root)/gi, weight: 10 },
  { pattern: /(?:API|key|مفتاح)/gi, weight: 8 },
];

export function assessRisk(message: string, piiResult: PIIResult): RiskAssessment {
  const factors: string[] = [];
  let score = piiResult.riskScore;
  
  // Check for high-risk PII types
  const hasHighRiskPII = piiResult.types.some(type => HIGH_RISK_PII_TYPES.includes(type));
  if (hasHighRiskPII) {
    score += 25;
    factors.push('High-risk PII detected');
  }
  
  // Check for multiple PII types
  if (piiResult.types.length > 2) {
    score += 15;
    factors.push('Multiple PII types');
  }
  
  // Check for risk keywords
  for (const { pattern, weight } of RISK_KEYWORDS) {
    if (pattern.test(message)) {
      score += weight;
      factors.push(`Risk keyword detected`);
    }
  }
  
  // Check message length (longer messages = more risk of data exposure)
  if (message.length > 500) {
    score += 5;
    factors.push('Long message');
  }
  
  // Determine risk level
  let level: RiskLevel;
  if (score >= RISK_THRESHOLDS.critical) {
    level = 'critical';
  } else if (score >= RISK_THRESHOLDS.high) {
    level = 'high';
  } else if (score >= RISK_THRESHOLDS.medium) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  // Determine if approval is required
  const requiresApproval = level === 'high' || level === 'critical' || hasHighRiskPII;
  const autoApprove = level === 'low' && !piiResult.hasPII;
  
  return {
    level,
    score: Math.min(100, score),
    factors,
    requiresApproval,
    autoApprove,
  };
}

export function shouldRequireApproval(riskAssessment: RiskAssessment): boolean {
  return riskAssessment.requiresApproval && !riskAssessment.autoApprove;
}

export function createGovernanceRequest(
  originalMessage: string,
  maskedMessage: string,
  piiResult: PIIResult,
  riskAssessment: RiskAssessment
): GovernanceRequest {
  const id = `gov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id,
    originalMessage,
    maskedMessage,
    piiResult,
    riskAssessment,
    status: riskAssessment.autoApprove ? 'auto-approved' : 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'عالي',
    critical: 'حرج',
  };
  return labels[level];
}

export function getRiskLevelColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return colors[level];
}
