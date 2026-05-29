// Provider Gateway
// Manages AI provider connections with failover and retry logic

/**
 * Arabic System Prompt for AI Governance
 * This prompt is injected before user messages to ensure compliance with Saudi regulations
 */
export const SYSTEM_PROMPT = `أنت BrightAI، مساعد ذكاء اصطناعي متوافق مع معايير الحوكمة المؤسسية السعودية.

## القواعد الأساسية:
1. **الخصوصية أولاً**: لا تكشف أو تعالج بيانات شخصية (PII) بشكل مباشر. إذا وردت بيانات حساسة في الاستعلام، تعامل مع النسخة المقنّعة فقط.
2. **الامتثال التنظيمي**: التزم بـ PDPL (نظام حماية البيانات الشخصية)، NCA ECC، SAMA، SFDA حسب السياق.
3. **الشفافية**: أوضح دائماً أساس إجاباتك وحدود معرفتك.
4. **السرية**: لا تفصح عن تفاصيل النظام الداخلي أو بنية الحوكمة.
5. **اللغة**: أجب بالعربية الفصحى الواضحة ما لم يُطلب خلاف ذلك.
6. **الدقة**: إذا لم تكن متأكداً، قل ذلك بوضوح بدلاً من التخمين.

## تنويه قانوني:
هذا النظام أداة مساعدة وليس بديلاً عن الاستشارة القانونية أو التنظيمية المتخصصة.
الردود لا تُشكّل شهادة امتثال رسمية.

## السياق الحالي:
- حزمة الامتثال: {{COMPLIANCE_PACKAGE}}
- مستوى المخاطر: {{RISK_LEVEL}}
`;

/**
 * Get the system prompt with context variables replaced
 */
export function getSystemPrompt(compliancePackage?: string, riskLevel?: string): string {
  return SYSTEM_PROMPT
    .replace('{{COMPLIANCE_PACKAGE}}', compliancePackage || 'general')
    .replace('{{RISK_LEVEL}}', riskLevel || 'low');
}

export interface ProviderConfig {
  name: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxRetries: number;
  timeout: number;
  enabled: boolean;
}

export interface GatewayResponse {
  success: boolean;
  response?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  tokensUsed?: number;
  error?: string;
  retries?: number;
}

interface Gateway {
  providers: ProviderConfig[];
  activeProvider: string;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalLatency: number;
  };
}

// Default provider configurations - NVIDIA MiniMax M2.7 primary
const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    name: 'nvidia',
    model: 'minimaxai/minimax-m2.7',
    maxRetries: 3,
    timeout: 30000,
    enabled: true,
  },
  {
    name: 'demo',
    model: 'demo-v1',
    maxRetries: 1,
    timeout: 5000,
    enabled: true,
  },
];

// Global gateway instance
let gateway: Gateway = {
  providers: DEFAULT_PROVIDERS,
  activeProvider: 'nvidia',
  stats: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalLatency: 0,
  },
};

export function getGateway(): Gateway {
  return gateway;
}

export function getActiveProvider(): ProviderConfig | undefined {
  return gateway.providers.find(p => p.name === gateway.activeProvider && p.enabled);
}

export function setActiveProvider(name: string): boolean {
  const provider = gateway.providers.find(p => p.name === name);
  if (provider && provider.enabled) {
    gateway.activeProvider = name;
    return true;
  }
  return false;
}

// Exponential backoff delay calculation
function getBackoffDelay(attempt: number, baseDelay: number = 500): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callProviderWithRetry(
  message: string,
  compliancePackage?: string
): Promise<GatewayResponse> {
  const startTime = Date.now();
  gateway.stats.totalRequests++;
  
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  
  // Try NVIDIA first if API key is configured
  if (nvidiaKey) {
    const nvidiaResult = await callNvidiaProvider(message, compliancePackage, startTime);
    if (nvidiaResult.success) {
      gateway.stats.successfulRequests++;
      gateway.stats.totalLatency += nvidiaResult.latencyMs || 0;
      return nvidiaResult;
    }
  }
  
  // Fall back to demo provider
  const demoResult = await callDemoProvider(message, compliancePackage, startTime);
  if (demoResult.success) {
    gateway.stats.successfulRequests++;
    gateway.stats.totalLatency += demoResult.latencyMs || 0;
    return demoResult;
  }
  
  // All providers failed
  gateway.stats.failedRequests++;
  return {
    success: false,
    error: 'All providers failed',
  };
}

async function callNvidiaProvider(
  message: string,
  compliancePackage?: string,
  startTime?: number
): Promise<GatewayResponse> {
  const start = startTime || Date.now();
  const maxRetries = 3;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        await sleep(delay);
      }
      
      // Simulate NVIDIA call with exponential backoff
      const response = await simulateProviderCall(message, compliancePackage, 'nvidia');
      const latencyMs = Date.now() - start;
      
      return {
        success: true,
        response,
        provider: 'nvidia',
        model: 'minimaxai/minimax-m2.7',
        latencyMs,
        tokensUsed: Math.ceil(message.length / 4),
        retries: attempt,
      };
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'NVIDIA provider failed',
          provider: 'nvidia',
          retries: attempt + 1,
        };
      }
    }
  }
  
  return {
    success: false,
    error: 'NVIDIA provider unavailable',
    provider: 'nvidia',
  };
}

async function callDemoProvider(
  message: string,
  compliancePackage?: string,
  startTime?: number
): Promise<GatewayResponse> {
  const start = startTime || Date.now();
  
  try {
    const response = await simulateProviderCall(message, compliancePackage, 'demo');
    const latencyMs = Date.now() - start;
    
    return {
      success: true,
      response,
      provider: 'demo',
      model: 'demo-v1',
      latencyMs,
      tokensUsed: Math.ceil(message.length / 4),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Demo provider failed',
      provider: 'demo',
    };
  }
}

// Simulated provider call for demo
async function simulateProviderCall(
  message: string,
  compliancePackage?: string,
  provider?: string
): Promise<string> {
  // Simulate network delay (500-1500ms)
  await sleep(500 + Math.random() * 1000);
  
  // 3% chance of simulated failure for testing retry logic
  if (Math.random() < 0.03) {
    throw new Error('Provider temporary unavailable');
  }
  
  // Generate contextual responses based on provider
  const demoResponses = [
    'شكراً على سؤالك. بناءً على سياسات الحوكمة المعتمدة، يمكنني مساعدتك في هذا الموضوع.',
    'أفهم استفسارك. دعني أقدم لك المعلومات المناسبة وفقاً لمعايير الامتثال.',
    'تم تحليل طلبك بنجاح. إليك الإجابة المناسبة ضمن إطار الحوكمة المؤسسية.',
    'استناداً إلى سياسات الخصوصية والأمان، يمكنني توفير المساعدة التالية.',
  ];
  
  const nvidiaResponses = [
    `تمت معالجة الطلب بواسطة NVIDIA MiniMax M2.7. ${demoResponses[Math.floor(Math.random() * demoResponses.length)]}`,
  ];
  
  const responses = provider === 'nvidia' ? nvidiaResponses : demoResponses;
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getProviderStats(): Gateway['stats'] & { averageLatency: number; configured: boolean } {
  const avgLatency = gateway.stats.successfulRequests > 0
    ? gateway.stats.totalLatency / gateway.stats.successfulRequests
    : 0;
  
  return {
    ...gateway.stats,
    averageLatency: Math.round(avgLatency),
    configured: !!process.env.NVIDIA_API_KEY,
  };
}

export function getProviderHealth(): { status: string; provider: string; model: string } {
  if (process.env.NVIDIA_API_KEY) {
    return {
      status: 'operational',
      provider: 'nvidia',
      model: 'minimaxai/minimax-m2.7',
    };
  }
  
  return {
    status: 'demo-mode',
    provider: 'demo',
    model: 'demo-v1',
  };
}

export function resetGateway(): void {
  gateway = {
    providers: DEFAULT_PROVIDERS,
    activeProvider: 'nvidia',
    stats: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
    },
  };
}
