// Provider Gateway
// Manages AI provider connections with failover and retry logic

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
  latency?: number;
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

// Default provider configurations
const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    name: 'openai',
    model: 'gpt-4o-mini',
    maxRetries: 3,
    timeout: 30000,
    enabled: true,
  },
  {
    name: 'anthropic',
    model: 'claude-3-haiku-20240307',
    maxRetries: 3,
    timeout: 30000,
    enabled: true,
  },
];

// Global gateway instance
let gateway: Gateway = {
  providers: DEFAULT_PROVIDERS,
  activeProvider: 'openai',
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
function getBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendToProvider(
  message: string,
  systemPrompt?: string
): Promise<GatewayResponse> {
  const startTime = Date.now();
  gateway.stats.totalRequests++;
  
  const provider = getActiveProvider();
  if (!provider) {
    gateway.stats.failedRequests++;
    return {
      success: false,
      error: 'No active provider available',
    };
  }
  
  let lastError: string = '';
  let retries = 0;
  
  for (let attempt = 0; attempt <= provider.maxRetries; attempt++) {
    try {
      // In a real implementation, this would call the actual AI provider
      // For demo purposes, we'll simulate a response
      
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        await sleep(delay);
      }
      
      // Simulate API call with potential failures
      const simulatedResponse = await simulateProviderCall(message, systemPrompt, provider);
      
      const latency = Date.now() - startTime;
      gateway.stats.successfulRequests++;
      gateway.stats.totalLatency += latency;
      
      return {
        success: true,
        response: simulatedResponse,
        provider: provider.name,
        model: provider.model,
        latency,
        retries: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      retries = attempt + 1;
      
      // If this is not the last attempt, continue to retry
      if (attempt < provider.maxRetries) {
        continue;
      }
    }
  }
  
  // All retries exhausted
  gateway.stats.failedRequests++;
  
  return {
    success: false,
    error: lastError,
    provider: provider.name,
    retries,
  };
}

// Simulated provider call for demo
async function simulateProviderCall(
  message: string,
  systemPrompt?: string,
  provider?: ProviderConfig
): Promise<string> {
  // Simulate network delay
  await sleep(500 + Math.random() * 500);
  
  // 5% chance of simulated failure for testing retry logic
  if (Math.random() < 0.05) {
    throw new Error('Simulated provider error');
  }
  
  // Generate a contextual response based on the message
  const responses = [
    'شكراً على سؤالك. بناءً على سياسات الحوكمة المعتمدة، يمكنني مساعدتك في هذا الموضوع.',
    'أفهم استفسارك. دعني أقدم لك المعلومات المناسبة وفقاً لمعايير الامتثال.',
    'تم تحليل طلبك بنجاح. إليك الإجابة المناسبة ضمن إطار الحوكمة المؤسسية.',
    'استناداً إلى سياسات الخصوصية والأمان، يمكنني توفير المساعدة التالية.',
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getProviderStats(): Gateway['stats'] & { averageLatency: number } {
  const avgLatency = gateway.stats.successfulRequests > 0
    ? gateway.stats.totalLatency / gateway.stats.successfulRequests
    : 0;
  
  return {
    ...gateway.stats,
    averageLatency: Math.round(avgLatency),
  };
}

export function resetGateway(): void {
  gateway = {
    providers: DEFAULT_PROVIDERS,
    activeProvider: 'openai',
    stats: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
    },
  };
}
