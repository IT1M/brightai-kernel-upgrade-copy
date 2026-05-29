/**
 * BrightAI Kernel - Compliance Packages
 * Defines compliance frameworks and their validation rules
 * 
 * DISCLAIMER: This tool provides automated compliance assessment based on current system settings.
 * The displayed results are NOT an official compliance certificate and do not replace
 * certified audits from licensed certification bodies.
 * For official compliance certification, please contact an accredited auditing firm.
 */

export interface ComplianceRequirement {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  weight: number;
  checkFunction?: string; // Function name to call for validation
}

export interface CompliancePackage {
  id: string;
  name: string;
  fullName: string;
  fullNameAr: string;
  region: string;
  color: string;
  requirements: ComplianceRequirement[];
  piiTypes: string[];
  riskThreshold: number;
  autoBlockTypes?: string[];
}

// PDPL - Saudi Personal Data Protection Law
export const PDPL_PACKAGE: CompliancePackage = {
  id: 'pdpl',
  name: 'PDPL',
  fullName: 'Personal Data Protection Law',
  fullNameAr: 'نظام حماية البيانات الشخصية',
  region: 'Saudi Arabia',
  color: '#10b981',
  riskThreshold: 40,
  requirements: [
    {
      id: 'consent',
      name: 'Data Processing Consent',
      nameAr: 'الموافقة على معالجة البيانات',
      description: 'Ensure explicit consent before processing personal data',
      weight: 25,
    },
    {
      id: 'access',
      name: 'Right to Access and Correction',
      nameAr: 'حق الوصول والتصحيح',
      description: 'Allow data subjects to access and correct their data',
      weight: 20,
    },
    {
      id: 'breach',
      name: 'Breach Notification',
      nameAr: 'الإخطار بالانتهاكات',
      description: 'Notify authorities and affected parties of data breaches',
      weight: 20,
    },
    {
      id: 'retention',
      name: 'Data Retention Policy',
      nameAr: 'سياسة الاحتفاظ بالبيانات',
      description: 'Define and enforce data retention periods',
      weight: 15,
    },
    {
      id: 'transfer',
      name: 'Cross-border Data Transfer',
      nameAr: 'نقل البيانات العابر للحدود',
      description: 'Ensure proper safeguards for international data transfers',
      weight: 20,
    },
  ],
  piiTypes: ['saudi_id', 'phone_sa', 'iqama', 'saudi_iban', 'saudi_vat', 'commercial_register', 'employee_id'],
  autoBlockTypes: ['saudi_id', 'iqama'],
};

// GDPR - General Data Protection Regulation
export const GDPR_PACKAGE: CompliancePackage = {
  id: 'gdpr',
  name: 'GDPR',
  fullName: 'General Data Protection Regulation',
  fullNameAr: 'اللائحة العامة لحماية البيانات',
  region: 'European Union',
  color: '#3b82f6',
  riskThreshold: 35,
  requirements: [
    {
      id: 'forget',
      name: 'Right to be Forgotten',
      nameAr: 'حق النسيان',
      description: 'Allow data subjects to request deletion of their data',
      weight: 20,
    },
    {
      id: 'portability',
      name: 'Data Portability',
      nameAr: 'نقل البيانات',
      description: 'Provide data in portable format upon request',
      weight: 20,
    },
    {
      id: 'documentation',
      name: 'Processing Documentation',
      nameAr: 'توثيق المعالجة',
      description: 'Maintain records of all data processing activities',
      weight: 25,
    },
    {
      id: 'dpo',
      name: 'Data Protection Officer',
      nameAr: 'مسؤول حماية البيانات',
      description: 'Appoint a DPO where required',
      weight: 15,
    },
    {
      id: 'impact',
      name: 'Impact Assessment',
      nameAr: 'تقييم الأثر',
      description: 'Conduct DPIAs for high-risk processing',
      weight: 20,
    },
  ],
  piiTypes: ['email', 'phone', 'name', 'ip_address', 'passport', 'credit_card'],
  autoBlockTypes: ['passport'],
};

// HIPAA - Health Insurance Portability and Accountability Act
export const HIPAA_PACKAGE: CompliancePackage = {
  id: 'hipaa',
  name: 'HIPAA',
  fullName: 'Health Insurance Portability and Accountability Act',
  fullNameAr: 'قانون حماية البيانات الصحية',
  region: 'United States',
  color: '#8b5cf6',
  riskThreshold: 30,
  requirements: [
    {
      id: 'encryption',
      name: 'PHI Encryption',
      nameAr: 'تشفير البيانات الصحية',
      description: 'Encrypt all Protected Health Information',
      weight: 30,
    },
    {
      id: 'access_logs',
      name: 'Access Logs',
      nameAr: 'سجلات الوصول',
      description: 'Maintain detailed logs of PHI access',
      weight: 25,
    },
    {
      id: 'baa',
      name: 'Business Associate Agreements',
      nameAr: 'اتفاقيات الشركاء',
      description: 'Execute BAAs with all business associates',
      weight: 25,
    },
    {
      id: 'training',
      name: 'Employee Training',
      nameAr: 'تدريب الموظفين',
      description: 'Regular HIPAA training for all staff',
      weight: 20,
    },
  ],
  piiTypes: ['medical_id', 'ssn', 'health_info', 'insurance_id'],
  autoBlockTypes: ['medical_id', 'health_info'],
};

// PCI DSS - Payment Card Industry Data Security Standard
export const PCI_DSS_PACKAGE: CompliancePackage = {
  id: 'pci',
  name: 'PCI DSS',
  fullName: 'Payment Card Industry Data Security Standard',
  fullNameAr: 'معيار أمان بيانات البطاقات',
  region: 'Global',
  color: '#f97316',
  riskThreshold: 25,
  requirements: [
    {
      id: 'card_protection',
      name: 'Card Data Protection',
      nameAr: 'حماية بيانات البطاقات',
      description: 'Protect stored cardholder data',
      weight: 35,
    },
    {
      id: 'transit_encryption',
      name: 'Encryption in Transit',
      nameAr: 'التشفير أثناء النقل',
      description: 'Encrypt card data during transmission',
      weight: 25,
    },
    {
      id: 'pen_test',
      name: 'Penetration Testing',
      nameAr: 'اختبارات الاختراق',
      description: 'Regular penetration testing',
      weight: 20,
    },
    {
      id: 'monitoring',
      name: 'Continuous Monitoring',
      nameAr: 'المراقبة المستمرة',
      description: 'Monitor all access to network resources',
      weight: 20,
    },
  ],
  piiTypes: ['credit_card', 'cvv', 'bank_account', 'saudi_iban'],
  autoBlockTypes: ['credit_card', 'cvv'],
};

// ISO 27001 - Information Security Management
export const ISO27001_PACKAGE: CompliancePackage = {
  id: 'iso27001',
  name: 'ISO 27001',
  fullName: 'ISO/IEC 27001 Information Security',
  fullNameAr: 'ISO 27001 أمن المعلومات',
  region: 'Global',
  color: '#6b7280',
  riskThreshold: 45,
  requirements: [
    {
      id: 'policy',
      name: 'Information Security Policy',
      nameAr: 'سياسة أمن المعلومات',
      description: 'Establish and maintain security policies',
      weight: 25,
    },
    {
      id: 'risk_mgmt',
      name: 'Risk Management',
      nameAr: 'إدارة المخاطر',
      description: 'Identify and manage information security risks',
      weight: 25,
    },
    {
      id: 'internal_audit',
      name: 'Internal Audit',
      nameAr: 'التدقيق الداخلي',
      description: 'Regular internal security audits',
      weight: 25,
    },
    {
      id: 'incident',
      name: 'Incident Management',
      nameAr: 'إدارة الحوادث',
      description: 'Establish incident response procedures',
      weight: 25,
    },
  ],
  piiTypes: ['api_key', 'password', 'secret', 'private_key'],
  autoBlockTypes: ['api_key', 'password'],
};

// All compliance packages
export const COMPLIANCE_PACKAGES: Record<string, CompliancePackage> = {
  pdpl: PDPL_PACKAGE,
  gdpr: GDPR_PACKAGE,
  hipaa: HIPAA_PACKAGE,
  pci: PCI_DSS_PACKAGE,
  iso27001: ISO27001_PACKAGE,
  general: {
    id: 'general',
    name: 'General',
    fullName: 'General Compliance',
    fullNameAr: 'الامتثال العام',
    region: 'Global',
    color: '#00D4FF',
    riskThreshold: 50,
    requirements: [],
    piiTypes: ['email', 'phone', 'name', 'credit_card', 'saudi_id'],
    autoBlockTypes: [],
  },
};

/**
 * Get compliance package by ID
 */
export function getCompliancePackage(packageId: string): CompliancePackage {
  return COMPLIANCE_PACKAGES[packageId.toLowerCase()] || COMPLIANCE_PACKAGES.general;
}

/**
 * Get all compliance packages
 */
export function getAllCompliancePackages(): CompliancePackage[] {
  return Object.values(COMPLIANCE_PACKAGES);
}

/**
 * Check if a PII type should be auto-blocked for a package
 */
export function shouldAutoBlock(packageId: string, piiType: string): boolean {
  const pkg = getCompliancePackage(packageId);
  return pkg.autoBlockTypes?.includes(piiType) || false;
}

/**
 * Get risk threshold for a compliance package
 */
export function getRiskThreshold(packageId: string): number {
  const pkg = getCompliancePackage(packageId);
  return pkg.riskThreshold;
}

/**
 * Calculate compliance score based on system state
 * This is a simplified calculation - in production, this would check actual system metrics
 */
export function calculateComplianceScore(
  packageId: string,
  systemMetrics: Record<string, number>
): { score: number; status: 'compliant' | 'partial' | 'non-compliant'; details: Record<string, number> } {
  const pkg = getCompliancePackage(packageId);
  
  if (pkg.requirements.length === 0) {
    return { score: 100, status: 'compliant', details: {} };
  }

  let totalScore = 0;
  let totalWeight = 0;
  const details: Record<string, number> = {};

  for (const req of pkg.requirements) {
    const reqScore = systemMetrics[req.id] ?? 80; // Default to 80% if not provided
    details[req.id] = reqScore;
    totalScore += reqScore * req.weight;
    totalWeight += req.weight;
  }

  const score = Math.round(totalScore / totalWeight);
  const status = score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant';

  return { score, status, details };
}

/**
 * Get compliance disclaimer text
 */
export function getComplianceDisclaimer(language: 'ar' | 'en' = 'ar'): string {
  if (language === 'ar') {
    return `تنويه مهم: هذه الأداة توفر تقييماً آلياً لمستوى الامتثال بناءً على الإعدادات الحالية للنظام. ` +
      `النتائج المعروضة ليست شهادة امتثال رسمية ولا تحل محل التدقيق المعتمد من جهات الاعتماد المرخصة. ` +
      `للحصول على شهادة امتثال رسمية، يرجى التواصل مع جهة تدقيق معتمدة.`;
  }

  return `Important Notice: This tool provides automated compliance assessment based on current system settings. ` +
    `The displayed results are NOT an official compliance certificate and do not replace ` +
    `certified audits from licensed certification bodies. ` +
    `For official compliance certification, please contact an accredited auditing firm.`;
}
