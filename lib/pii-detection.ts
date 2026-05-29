/**
 * PII Detection Module
 * Detects 13+ personally identifiable information patterns
 * Supports Arabic and English content
 */

export interface PiiMatch {
  type: string;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  category: 'sensitive' | 'moderate' | 'low';
}

export interface PiiDetectionResult {
  hasPii: boolean;
  matches: PiiMatch[];
  maskedText: string;
  originalText: string;
  detectionScore: number;
}

const PII_PATTERNS = {
  // Saudi Arabia specific
  saudiNationalId: {
    pattern: /\b\d{10}\b/g,
    type: 'Saudi National ID',
    category: 'sensitive' as const,
    confidence: 0.95,
  },
  saudiVat: {
    pattern: /\b300\d{12}\b/g,
    type: 'Saudi VAT ID',
    category: 'sensitive' as const,
    confidence: 0.95,
  },
  saudiEmployeeId: {
    pattern: /(?:EMP|ID)[_-]?\d{6,8}/gi,
    type: 'Saudi Employee ID',
    category: 'sensitive' as const,
    confidence: 0.85,
  },

  // Arabic names (common patterns)
  arabicNames: {
    pattern: /(?:محمد|أحمد|علي|فاطمة|عائشة|سارة|خالد|سعود|نور|ليلى)(?:\s+(?:[أ-ي]+))*\b/g,
    type: 'Arabic Name',
    category: 'sensitive' as const,
    confidence: 0.75,
  },

  // Contact information
  emailAddress: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    type: 'Email Address',
    category: 'sensitive' as const,
    confidence: 0.98,
  },
  phoneNumber: {
    pattern: /(?:\+966|0)?(?:5[0-9]|9[0-9])[0-9]{7}\b/g,
    type: 'Phone Number',
    category: 'sensitive' as const,
    confidence: 0.9,
  },
  internationalPhone: {
    pattern: /\b(?:\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
    type: 'International Phone',
    category: 'moderate' as const,
    confidence: 0.7,
  },

  // Identification
  passport: {
    pattern: /\b(?:A|S|N)?\d{6,9}\b/g,
    type: 'Passport Number',
    category: 'sensitive' as const,
    confidence: 0.6,
  },
  socialSecurity: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    type: 'Social Security Number',
    category: 'sensitive' as const,
    confidence: 0.95,
  },

  // Financial
  creditCard: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
    type: 'Credit Card',
    category: 'sensitive' as const,
    confidence: 0.99,
  },
  bankAccount: {
    pattern: /\b(?:IBAN|Account|Acct)[:\s]+[A-Z0-9]{15,34}\b/gi,
    type: 'Bank Account',
    category: 'sensitive' as const,
    confidence: 0.85,
  },

  // Location & Organization
  ipAddress: {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    type: 'IP Address',
    category: 'moderate' as const,
    confidence: 0.95,
  },
  companyName: {
    pattern: /\b(?:شركة|Company|Corp|Inc|Ltd|LLC|GmbH)\s+[A-Za-zأ-ي\s&]+\b/gi,
    type: 'Company Name',
    category: 'moderate' as const,
    confidence: 0.7,
  },

  // Medical
  medicalRecord: {
    pattern: /(?:MR|Medical Record|رقم المريض)[\s:]+[A-Z0-9]{6,}/gi,
    type: 'Medical Record ID',
    category: 'sensitive' as const,
    confidence: 0.85,
  },
};

export function detectPii(text: string): PiiDetectionResult {
  const matches: PiiMatch[] = [];
  const detectionScores: number[] = [];

  for (const [key, config] of Object.entries(PII_PATTERNS)) {
    const piiMatches = Array.from(text.matchAll(config.pattern));
    for (const match of piiMatches) {
      matches.push({
        type: config.type,
        value: match[0],
        startIndex: match.index!,
        endIndex: match.index! + match[0].length,
        confidence: config.confidence,
        category: config.category,
      });
      detectionScores.push(config.confidence);
    }
  }

  // Sort by position and remove duplicates
  matches.sort((a, b) => a.startIndex - b.startIndex);
  const uniqueMatches = removeDuplicateMatches(matches);

  // Calculate overall detection score
  const detectionScore =
    uniqueMatches.length > 0
      ? uniqueMatches.reduce((sum, m) => sum + m.confidence, 0) /
        uniqueMatches.length
      : 0;

  // Create masked text
  let maskedText = text;
  for (const match of uniqueMatches.sort((a, b) => b.startIndex - a.startIndex)) {
    const maskLength = Math.max(3, Math.ceil(match.value.length / 2));
    const mask = '*'.repeat(maskLength);
    maskedText =
      maskedText.substring(0, match.startIndex) +
      mask +
      maskedText.substring(match.endIndex);
  }

  return {
    hasPii: uniqueMatches.length > 0,
    matches: uniqueMatches,
    maskedText,
    originalText: text,
    detectionScore,
  };
}

function removeDuplicateMatches(matches: PiiMatch[]): PiiMatch[] {
  const nonOverlapping: PiiMatch[] = [];

  for (const match of matches) {
    const isOverlapping = nonOverlapping.some(
      (existing) =>
        (match.startIndex >= existing.startIndex &&
          match.startIndex < existing.endIndex) ||
        (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex),
    );

    if (!isOverlapping) {
      nonOverlapping.push(match);
    } else {
      // Keep the match with higher confidence if overlapping
      const existingIndex = nonOverlapping.findIndex(
        (existing) =>
          (match.startIndex >= existing.startIndex &&
            match.startIndex < existing.endIndex) ||
          (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex),
      );
      if (existingIndex !== -1 && match.confidence > nonOverlapping[existingIndex].confidence) {
        nonOverlapping[existingIndex] = match;
      }
    }
  }

  return nonOverlapping;
}

export function maskPii(text: string): string {
  return detectPii(text).maskedText;
}

export function getPiiSummary(result: PiiDetectionResult): string {
  if (!result.hasPii) return 'No PII detected';

  const categories = new Map<string, number>();
  for (const match of result.matches) {
    categories.set(match.type, (categories.get(match.type) || 0) + 1);
  }

  const summary = Array.from(categories.entries())
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  return summary;
}
