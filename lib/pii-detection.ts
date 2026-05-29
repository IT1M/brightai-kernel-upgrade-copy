// PII Detection Module
// Detects and masks personally identifiable information

export interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface PIIResult {
  hasPII: boolean;
  matches: PIIMatch[];
  types: string[];
  riskScore: number;
}

// PII patterns with Arabic and international support
const PII_PATTERNS: { type: string; pattern: RegExp; weight: number }[] = [
  // Saudi National ID (10 digits starting with 1 or 2)
  { type: 'saudi_id', pattern: /\b[12]\d{9}\b/g, weight: 10 },
  
  // Iqama / Resident ID (10 digits starting with 2)
  { type: 'iqama', pattern: /\b(?:اقامة|إقامة|iqama)[\s#:]*2\d{9}\b/gi, weight: 10 },
  
  // Saudi IBAN (SA followed by 22 characters)
  { type: 'saudi_iban', pattern: /\bSA\d{2}[A-Z0-9]{18}\b/gi, weight: 9 },
  
  // Saudi Phone Numbers
  { type: 'saudi_phone', pattern: /\b(?:\+966|00966|966|0)?5\d{8}\b/g, weight: 7 },
  
  // Email addresses
  { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, weight: 6 },
  
  // Credit Card Numbers (basic pattern)
  { type: 'credit_card', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, weight: 10 },
  
  // IP Addresses
  { type: 'ip_address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, weight: 4 },
  
  // Passport Numbers (various formats)
  { type: 'passport', pattern: /\b[A-Z]{1,2}\d{6,9}\b/g, weight: 8 },
  
  // Date of Birth patterns (various formats)
  { type: 'date_of_birth', pattern: /\b(?:تاريخ الميلاد|DOB|born|مواليد)[\s:]*\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi, weight: 5 },
  
  // Arabic Names with title (basic pattern)
  { type: 'arabic_name', pattern: /(?:السيد|السيدة|الأستاذ|الدكتور|المهندس)\s+[\u0600-\u06FF\s]{3,30}/g, weight: 5 },
  
  // Medical Record Numbers
  { type: 'medical_id', pattern: /\b(?:MRN|رقم الملف الطبي)[\s:]*\d{6,12}\b/gi, weight: 8 },
  
  // Vehicle Plate Numbers (Saudi format)
  { type: 'vehicle_plate', pattern: /\b[A-Z]{3}\s*\d{4}\b/g, weight: 4 },
  
  // VAT Number (15 digits starting with 3)
  { type: 'vat_number', pattern: /\b(?:الرقم الضريبي|VAT|ضريبة)[\s#:]*3\d{14}\b/gi, weight: 8 },
  
  // Tax ID patterns (general)
  { type: 'tax_id', pattern: /\b(?:TIN|Tax ID)[\s:]*\d{10,15}\b/gi, weight: 7 },
  
  // Commercial Registration (السجل التجاري - 10 digits)
  { type: 'commercial_registration', pattern: /\b(?:السجل التجاري|CR|سجل تجاري)[\s#:]*\d{10}\b/gi, weight: 8 },
  
  // Employee Number / ID
  { type: 'employee_id', pattern: /\b(?:رقم الموظف|Employee ID|EMP|موظف رقم)[\s#:]*[A-Z0-9]{4,12}\b/gi, weight: 6 },
  
  // Bank Account Numbers
  { type: 'bank_account', pattern: /\b(?:حساب|account)[\s#:]*\d{10,20}\b/gi, weight: 8 },
];

export function detectPii(text: string): PIIResult {
  const matches: PIIMatch[] = [];
  const types = new Set<string>();
  let totalWeight = 0;
  
  for (const { type, pattern, weight } of PII_PATTERNS) {
    // Reset pattern lastIndex
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: weight / 10,
      });
      types.add(type);
      totalWeight += weight;
    }
  }
  
  // Calculate risk score (0-100)
  const riskScore = Math.min(100, totalWeight * 5);
  
  return {
    hasPII: matches.length > 0,
    matches,
    types: Array.from(types),
    riskScore,
  };
}

export function maskPii(text: string, result?: PIIResult): string {
  const piiResult = result || detectPii(text);
  
  if (!piiResult.hasPII) return text;
  
  // Sort matches by start position (descending) to replace from end to start
  const sortedMatches = [...piiResult.matches].sort((a, b) => b.start - a.start);
  
  let maskedText = text;
  for (const match of sortedMatches) {
    const maskChar = '*';
    const visibleChars = Math.min(2, Math.floor(match.value.length / 4));
    const masked = match.value.substring(0, visibleChars) + 
                   maskChar.repeat(match.value.length - visibleChars * 2) +
                   match.value.substring(match.value.length - visibleChars);
    
    maskedText = maskedText.substring(0, match.start) + 
                 `[${match.type.toUpperCase()}: ${masked}]` +
                 maskedText.substring(match.end);
  }
  
  return maskedText;
}

export function getPiiSummary(result: PIIResult): string {
  if (!result.hasPII) return 'No PII detected';
  
  const typeLabels: Record<string, string> = {
    saudi_id: 'رقم الهوية السعودية',
    iqama: 'رقم الإقامة',
    saudi_iban: 'رقم الآيبان',
    saudi_phone: 'رقم الجوال',
    email: 'البريد الإلكتروني',
    credit_card: 'بطاقة ائتمان',
    ip_address: 'عنوان IP',
    passport: 'جواز السفر',
    date_of_birth: 'تاريخ الميلاد',
    arabic_name: 'اسم شخصي',
    medical_id: 'رقم الملف الطبي',
    vehicle_plate: 'لوحة المركبة',
    vat_number: 'الرقم الضريبي VAT',
    tax_id: 'الرقم الضريبي',
    commercial_registration: 'السجل التجاري',
    employee_id: 'رقم الموظف',
    bank_account: 'رقم الحساب البنكي',
  };
  
  const summary = result.types
    .map(type => typeLabels[type] || type)
    .join('، ');
  
  return `تم اكتشاف: ${summary}`;
}
