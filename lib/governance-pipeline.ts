/**
 * Governance Pipeline
 * 13-step processing pipeline with risk scoring and compliance matching
 */

export type ApprovalStatus = 'pending' | 'approved' | 'executed_after_approval' | 'completed' | 'rejected';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  riskThreshold: number;
  requiredApprovals: number;
  category: 'data_protection' | 'ai_governance' | 'saudi_regulations' | 'corporate_policy';
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  score: number; // 0-100
  factors: {
    piiDetectionScore: number;
    requestComplexity: number;
    modelUncertainty: number;
    regulatoryRisk: number;
    dataExposureRisk: number;
  };
  matchedRules: ComplianceRule[];
}

export interface GovernanceRequest {
  id: string;
  timestamp: number;
  userQuery: string;
  maskedQuery: string;
  originalQuery: string;
  piiMatches: any[];
  step: number; // 1-13
  riskAssessment: RiskAssessment;
  approvalStatus: ApprovalStatus;
  approvals: Array<{ timestamp: number; approver: string }>;
  aiResponse?: string;
  executedAt?: number;
  completedAt?: number;
}

// 13 Compliance Rules
export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'rule_001',
    name: 'PII Protection',
    description: 'Requests containing PII must be masked and flagged',
    riskThreshold: 0.7,
    requiredApprovals: 1,
    category: 'data_protection',
  },
  {
    id: 'rule_002',
    name: 'High-Risk Query Detection',
    description: 'Queries flagged as high-risk require additional review',
    riskThreshold: 0.6,
    requiredApprovals: 2,
    category: 'ai_governance',
  },
  {
    id: 'rule_003',
    name: 'Saudi Data Residency',
    description: 'Sensitive data must be processed within Saudi Arabia',
    riskThreshold: 0.8,
    requiredApprovals: 1,
    category: 'saudi_regulations',
  },
  {
    id: 'rule_004',
    name: 'AI Model Transparency',
    description: 'Model selection and reasoning must be logged',
    riskThreshold: 0.5,
    requiredApprovals: 0,
    category: 'ai_governance',
  },
  {
    id: 'rule_005',
    name: 'Audit Trail Integrity',
    description: 'All requests must be logged with immutable audit trail',
    riskThreshold: 0.3,
    requiredApprovals: 0,
    category: 'data_protection',
  },
  {
    id: 'rule_006',
    name: 'Financial Data Protection',
    description: 'Financial information requires enhanced protection',
    riskThreshold: 0.85,
    requiredApprovals: 2,
    category: 'saudi_regulations',
  },
  {
    id: 'rule_007',
    name: 'Medical Data Confidentiality',
    description: 'Medical records require specialized handling',
    riskThreshold: 0.9,
    requiredApprovals: 3,
    category: 'data_protection',
  },
  {
    id: 'rule_008',
    name: 'Government Entity Request',
    description: 'Requests involving government entities need verification',
    riskThreshold: 0.65,
    requiredApprovals: 1,
    category: 'saudi_regulations',
  },
  {
    id: 'rule_009',
    name: 'Bias Detection in AI',
    description: 'AI responses must be checked for cultural/gender bias',
    riskThreshold: 0.55,
    requiredApprovals: 0,
    category: 'ai_governance',
  },
  {
    id: 'rule_010',
    name: 'Model Output Verification',
    description: 'Critical responses require verification before delivery',
    riskThreshold: 0.7,
    requiredApprovals: 1,
    category: 'ai_governance',
  },
  {
    id: 'rule_011',
    name: 'Cross-Border Data Restrictions',
    description: 'Data cannot be transmitted outside approved jurisdictions',
    riskThreshold: 0.8,
    requiredApprovals: 2,
    category: 'saudi_regulations',
  },
  {
    id: 'rule_012',
    name: 'Real-Time Monitoring',
    description: 'System must monitor for unusual access patterns',
    riskThreshold: 0.4,
    requiredApprovals: 0,
    category: 'corporate_policy',
  },
  {
    id: 'rule_013',
    name: 'Stakeholder Notification',
    description: 'High-risk requests trigger stakeholder notifications',
    riskThreshold: 0.75,
    requiredApprovals: 1,
    category: 'corporate_policy',
  },
];

export function assessRisk(
  piiDetectionScore: number,
  requestComplexity: number,
  modelUncertainty: number,
): RiskAssessment {
  // Determine regulatory and data exposure risk based on inputs
  const regulatoryRisk = piiDetectionScore * 0.6 + requestComplexity * 0.4;
  const dataExposureRisk = piiDetectionScore * 0.8 + modelUncertainty * 0.2;

  // Calculate overall risk score
  const score = Math.round(
    (piiDetectionScore * 0.35 + requestComplexity * 0.25 + modelUncertainty * 0.2 + regulatoryRisk * 0.1 + dataExposureRisk * 0.1) *
      100,
  );

  // Determine risk level
  let riskLevel: RiskLevel;
  if (score >= 85) riskLevel = 'critical';
  else if (score >= 70) riskLevel = 'high';
  else if (score >= 50) riskLevel = 'medium';
  else if (score >= 30) riskLevel = 'low';
  else riskLevel = 'minimal';

  // Match applicable compliance rules
  const matchedRules = COMPLIANCE_RULES.filter((rule) => score >= rule.riskThreshold * 100);

  return {
    riskLevel,
    score,
    factors: {
      piiDetectionScore: Math.round(piiDetectionScore * 100),
      requestComplexity: Math.round(requestComplexity * 100),
      modelUncertainty: Math.round(modelUncertainty * 100),
      regulatoryRisk: Math.round(regulatoryRisk * 100),
      dataExposureRisk: Math.round(dataExposureRisk * 100),
    },
    matchedRules,
  };
}

export function getRequiredApprovals(riskAssessment: RiskAssessment): number {
  const maxApprovals = Math.max(...riskAssessment.matchedRules.map((r) => r.requiredApprovals));
  return maxApprovals;
}

export function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'critical':
      return '#DC2626'; // Red
    case 'high':
      return '#EA580C'; // Orange
    case 'medium':
      return '#F59E0B'; // Amber
    case 'low':
      return '#84CC16'; // Lime
    case 'minimal':
      return '#22C55E'; // Green
  }
}

export function getRiskDescription(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'critical':
      return 'Critical Risk - Requires immediate review and multiple approvals';
    case 'high':
      return 'High Risk - Requires enhanced governance and verification';
    case 'medium':
      return 'Medium Risk - Standard compliance review needed';
    case 'low':
      return 'Low Risk - Minimal governance requirements';
    case 'minimal':
      return 'Minimal Risk - Standard processing allowed';
  }
}

export function createGovernanceRequest(
  userQuery: string,
  maskedQuery: string,
  originalQuery: string,
  piiMatches: any[],
  riskAssessment: RiskAssessment,
): GovernanceRequest {
  return {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    userQuery,
    maskedQuery,
    originalQuery,
    piiMatches,
    step: 1,
    riskAssessment,
    approvalStatus: 'pending',
    approvals: [],
  };
}

export function shouldRequireApproval(riskAssessment: RiskAssessment): boolean {
  return riskAssessment.matchedRules.length > 0;
}
