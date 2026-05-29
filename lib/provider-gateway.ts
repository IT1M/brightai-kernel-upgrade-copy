/**
 * Provider Gateway
 * Manages LLM provider selection with exponential backoff and fallbacks
 */

export type ProviderName = 'nvidia_minimax' | 'google_gemini' | 'demo_mode';

export interface ProviderConfig {
  name: ProviderName;
  model: string;
  priority: number;
  apiKeyRequired: boolean;
  maxRetries: number;
  timeoutMs: number;
  costPer1kTokens: number;
}

export interface ProviderResponse {
  provider: ProviderName;
  model: string;
  response: string;
  tokensUsed: number;
  latencyMs: number;
  costEstimate: number;
  confidence: number;
}

export interface ProviderGatewayConfig {
  providers: ProviderConfig[];
  requestTimeout: number;
  exponentialBackoffMultiplier: number;
  maxBackoffMs: number;
}

// Provider configurations
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    name: 'nvidia_minimax',
    model: 'NVIDIA MiniMax M2.7',
    priority: 1,
    apiKeyRequired: true,
    maxRetries: 3,
    timeoutMs: 30000,
    costPer1kTokens: 0.002,
  },
  {
    name: 'google_gemini',
    model: 'Google Gemini Pro',
    priority: 2,
    apiKeyRequired: true,
    maxRetries: 3,
    timeoutMs: 30000,
    costPer1kTokens: 0.0005,
  },
  {
    name: 'demo_mode',
    model: 'Demo Mode (Simulated)',
    priority: 3,
    apiKeyRequired: false,
    maxRetries: 0,
    timeoutMs: 2000,
    costPer1kTokens: 0,
  },
];

export const DEFAULT_GATEWAY_CONFIG: ProviderGatewayConfig = {
  providers: DEFAULT_PROVIDERS,
  requestTimeout: 45000,
  exponentialBackoffMultiplier: 2,
  maxBackoffMs: 30000,
};

class ProviderGateway {
  private config: ProviderGatewayConfig;
  private providerStates: Map<ProviderName, { failures: number; lastFailure: number }> = new Map();
  private requestLog: Array<{
    provider: ProviderName;
    timestamp: number;
    success: boolean;
    latency: number;
  }> = [];

  constructor(config: ProviderGatewayConfig = DEFAULT_GATEWAY_CONFIG) {
    this.config = config;
    for (const provider of config.providers) {
      this.providerStates.set(provider.name, { failures: 0, lastFailure: 0 });
    }
  }

  async callProvider(
    provider: ProviderConfig,
    query: string,
    context: string,
  ): Promise<{ response: string; tokensUsed: number; latencyMs: number }> {
    const startTime = Date.now();

    try {
      let response: string;
      let tokensUsed: number;

      if (provider.name === 'nvidia_minimax') {
        response = await this.callNvidiaProvider(query, context);
        tokensUsed = Math.ceil((query.length + response.length) / 4);
      } else if (provider.name === 'google_gemini') {
        response = await this.callGeminiProvider(query, context);
        tokensUsed = Math.ceil((query.length + response.length) / 4);
      } else {
        response = await this.callDemoProvider(query, context);
        tokensUsed = Math.ceil((query.length + response.length) / 4);
      }

      const latencyMs = Date.now() - startTime;
      this.recordSuccess(provider.name, latencyMs);

      return { response, tokensUsed, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.recordFailure(provider.name);
      throw new Error(
        `Provider ${provider.name} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async callNvidiaProvider(query: string, context: string): Promise<string> {
    // Placeholder: In production, this would call actual NVIDIA MiniMax API
    // For now, simulate a call
    await this.delay(1500);

    if (Math.random() > 0.9) {
      throw new Error('NVIDIA API temporarily unavailable');
    }

    return `[NVIDIA Response]\n\n${query} - processed and analyzed using MiniMax M2.7.\n\n${context}`;
  }

  private async callGeminiProvider(query: string, context: string): Promise<string> {
    // Placeholder: In production, this would call actual Google Gemini API
    await this.delay(1200);

    if (Math.random() > 0.85) {
      throw new Error('Gemini API rate limited');
    }

    return `[Gemini Response]\n\n${query} - processed using Gemini Pro.\n\n${context}`;
  }

  private async callDemoProvider(query: string, context: string): Promise<string> {
    // Demo mode: instant response
    await this.delay(100);

    return `[Demo Mode Response]\n\n${query}\n\nThis is a demonstration response from BrightAI's governance system. In production, this would be processed by NVIDIA MiniMax or Google Gemini.\n\nContext: ${context}`;
  }

  async callWithFallback(query: string, context: string): Promise<ProviderResponse> {
    const availableProviders = this.getAvailableProviders();

    for (const provider of availableProviders) {
      const retries = provider.maxRetries;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const backoffDelay = this.calculateBackoffDelay(attempt, provider.maxRetries);
          if (attempt > 0) {
            await this.delay(backoffDelay);
          }

          const { response, tokensUsed, latencyMs } = await this.callProvider(
            provider,
            query,
            context,
          );

          const costEstimate = (tokensUsed / 1000) * provider.costPer1kTokens;

          return {
            provider: provider.name,
            model: provider.model,
            response,
            tokensUsed,
            latencyMs,
            costEstimate,
            confidence: this.getConfidenceScore(provider.name),
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.log(
            `[v0] Provider ${provider.name} attempt ${attempt + 1}/${retries + 1} failed: ${lastError.message}`,
          );
        }
      }

      console.log(`[v0] Provider ${provider.name} exhausted retries, trying next provider`);
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  private getAvailableProviders(): ProviderConfig[] {
    return this.config.providers.filter((provider) => {
      const state = this.providerStates.get(provider.name);
      if (!state) return false;

      // Check if provider is in cooldown due to repeated failures
      const timeSinceLastFailure = Date.now() - state.lastFailure;
      const cooldownPeriod = Math.min(
        this.calculateBackoffDelay(state.failures, provider.maxRetries),
        this.config.maxBackoffMs,
      );

      return timeSinceLastFailure > cooldownPeriod;
    });
  }

  private calculateBackoffDelay(attempt: number, maxRetries: number): number {
    const baseDelay = 100;
    const exponentialDelay = baseDelay * Math.pow(this.config.exponentialBackoffMultiplier, attempt);
    return Math.min(exponentialDelay, this.config.maxBackoffMs);
  }

  private recordSuccess(provider: ProviderName, latencyMs: number): void {
    const state = this.providerStates.get(provider);
    if (state) {
      state.failures = 0; // Reset failure count on success
      state.lastFailure = 0;
    }

    this.requestLog.push({
      provider,
      timestamp: Date.now(),
      success: true,
      latency: latencyMs,
    });
  }

  private recordFailure(provider: ProviderName): void {
    const state = this.providerStates.get(provider);
    if (state) {
      state.failures++;
      state.lastFailure = Date.now();
    }

    this.requestLog.push({
      provider,
      timestamp: Date.now(),
      success: false,
      latency: 0,
    });
  }

  private getConfidenceScore(provider: ProviderName): number {
    const successRate = this.getProviderSuccessRate(provider);
    const priorityBoost = 1 - (this.config.providers.find((p) => p.name === provider)?.priority || 1) * 0.1;

    return Math.round(successRate * priorityBoost * 100) / 100;
  }

  private getProviderSuccessRate(provider: ProviderName): number {
    const recentLogs = this.requestLog.slice(-100);
    const providerLogs = recentLogs.filter((log) => log.provider === provider);

    if (providerLogs.length === 0) return 1.0;

    const successes = providerLogs.filter((log) => log.success).length;
    return successes / providerLogs.length;
  }

  getProviderStats(): Record<ProviderName, { successRate: number; avgLatency: number; totalRequests: number }> {
    const stats: Record<string, any> = {};

    for (const provider of this.config.providers) {
      const logs = this.requestLog.filter((log) => log.provider === provider.name);
      const successCount = logs.filter((log) => log.success).length;
      const avgLatency = logs.length > 0 ? logs.reduce((sum, log) => sum + log.latency, 0) / logs.length : 0;

      stats[provider.name] = {
        successRate: logs.length > 0 ? successCount / logs.length : 0,
        avgLatency: Math.round(avgLatency),
        totalRequests: logs.length,
      };
    }

    return stats;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset(): void {
    this.requestLog = [];
    for (const state of this.providerStates.values()) {
      state.failures = 0;
      state.lastFailure = 0;
    }
  }
}

// Singleton instance
let gatewayInstance: ProviderGateway | null = null;

export function getGateway(config?: ProviderGatewayConfig): ProviderGateway {
  if (!gatewayInstance) {
    gatewayInstance = new ProviderGateway(config || DEFAULT_GATEWAY_CONFIG);
  }
  return gatewayInstance;
}

export function resetGateway(): void {
  if (gatewayInstance) {
    gatewayInstance.reset();
  }
}
