/**
 * Governance Pipeline
 * 13-step processing pipeline with risk scoring and compliance matching
 */

const COMPLIANCE_RULES = [
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

function assessRisk(piiDetectionScore, requestComplexity, modelUncertainty) {
  const regulatoryRisk = piiDetectionScore * 0.6 + requestComplexity * 0.4;
  const dataExposureRisk = piiDetectionScore * 0.8 + modelUncertainty * 0.2;

  const score = Math.round(
    (piiDetectionScore * 0.35 +
      requestComplexity * 0.25 +
      modelUncertainty * 0.2 +
      regulatoryRisk * 0.1 +
      dataExposureRisk * 0.1) *
      100,
  );

  let riskLevel;
  if (score >= 85) riskLevel = 'critical';
  else if (score >= 70) riskLevel = 'high';
  else if (score >= 50) riskLevel = 'medium';
  else if (score >= 30) riskLevel = 'low';
  else riskLevel = 'minimal';

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

function getRequiredApprovals(riskAssessment) {
  const maxApprovals = Math.max(...riskAssessment.matchedRules.map((r) => r.requiredApprovals));
  return maxApprovals || 0;
}

function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return '#DC2626';
    case 'high':
      return '#EA580C';
    case 'medium':
      return '#F59E0B';
    case 'low':
      return '#84CC16';
    case 'minimal':
      return '#22C55E';
  }
}

function getRiskDescription(riskLevel) {
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

function createGovernanceRequest(userQuery, maskedQuery, originalQuery, piiMatches, riskAssessment) {
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

function shouldRequireApproval(riskAssessment) {
  return riskAssessment.matchedRules.length > 0;
}

// Export for use in browser
window.GovernancePipeline = {
  COMPLIANCE_RULES,
  assessRisk,
  getRequiredApprovals,
  getRiskColor,
  getRiskDescription,
  createGovernanceRequest,
  shouldRequireApproval,
};
