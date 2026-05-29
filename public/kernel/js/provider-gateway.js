/**
 * Provider Gateway
 * Manages LLM provider selection with exponential backoff and fallbacks
 */

const DEFAULT_PROVIDERS = [
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

class ProviderGateway {
  constructor(providers = DEFAULT_PROVIDERS) {
    this.providers = providers;
    this.providerStates = new Map();
    this.requestLog = [];

    for (const provider of providers) {
      this.providerStates.set(provider.name, { failures: 0, lastFailure: 0 });
    }
  }

  async callProvider(provider, query, context) {
    const startTime = Date.now();

    try {
      let response;
      let tokensUsed;

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
      throw new Error(`Provider ${provider.name} failed: ${error.message}`);
    }
  }

  async callNvidiaProvider(query, context) {
    await this.delay(1500);
    if (Math.random() > 0.9) {
      throw new Error('NVIDIA API temporarily unavailable');
    }
    return `[NVIDIA Response]\n\n${query} - processed and analyzed using MiniMax M2.7.\n\n${context}`;
  }

  async callGeminiProvider(query, context) {
    await this.delay(1200);
    if (Math.random() > 0.85) {
      throw new Error('Gemini API rate limited');
    }
    return `[Gemini Response]\n\n${query} - processed using Gemini Pro.\n\n${context}`;
  }

  async callDemoProvider(query, context) {
    await this.delay(100);
    return `[Demo Mode Response]\n\n${query}\n\nThis is a demonstration response from BrightAI's governance system. In production, this would be processed by NVIDIA MiniMax or Google Gemini.\n\nContext: ${context}`;
  }

  async callWithFallback(query, context) {
    const availableProviders = this.getAvailableProviders();

    for (const provider of availableProviders) {
      const retries = provider.maxRetries;
      let lastError = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const backoffDelay = this.calculateBackoffDelay(attempt, provider.maxRetries);
          if (attempt > 0) {
            await this.delay(backoffDelay);
          }

          const { response, tokensUsed, latencyMs } = await this.callProvider(provider, query, context);
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
          lastError = error;
          console.log(`[v0] Provider ${provider.name} attempt ${attempt + 1}/${retries + 1} failed: ${lastError.message}`);
        }
      }

      console.log(`[v0] Provider ${provider.name} exhausted retries, trying next provider`);
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  getAvailableProviders() {
    return this.providers.filter((provider) => {
      const state = this.providerStates.get(provider.name);
      if (!state) return false;

      const timeSinceLastFailure = Date.now() - state.lastFailure;
      const cooldownPeriod = Math.min(
        this.calculateBackoffDelay(state.failures, provider.maxRetries),
        30000,
      );

      return timeSinceLastFailure > cooldownPeriod;
    });
  }

  calculateBackoffDelay(attempt, maxRetries) {
    const baseDelay = 100;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    return Math.min(exponentialDelay, 30000);
  }

  recordSuccess(provider, latencyMs) {
    const state = this.providerStates.get(provider);
    if (state) {
      state.failures = 0;
      state.lastFailure = 0;
    }

    this.requestLog.push({
      provider,
      timestamp: Date.now(),
      success: true,
      latency: latencyMs,
    });
  }

  recordFailure(provider) {
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

  getConfidenceScore(provider) {
    const successRate = this.getProviderSuccessRate(provider);
    const priorityBoost = 1 - (this.providers.find((p) => p.name === provider)?.priority || 1) * 0.1;
    return Math.round(successRate * priorityBoost * 100) / 100;
  }

  getProviderSuccessRate(provider) {
    const recentLogs = this.requestLog.slice(-100);
    const providerLogs = recentLogs.filter((log) => log.provider === provider);

    if (providerLogs.length === 0) return 1.0;

    const successes = providerLogs.filter((log) => log.success).length;
    return successes / providerLogs.length;
  }

  getProviderStats() {
    const stats = {};

    for (const provider of this.providers) {
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

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset() {
    this.requestLog = [];
    for (const state of this.providerStates.values()) {
      state.failures = 0;
      state.lastFailure = 0;
    }
  }
}

let gatewayInstance = null;

function getGateway() {
  if (!gatewayInstance) {
    gatewayInstance = new ProviderGateway();
  }
  return gatewayInstance;
}

function resetGateway() {
  if (gatewayInstance) {
    gatewayInstance.reset();
  }
}

// Export for use in browser
window.ProviderGateway = { getGateway, resetGateway, ProviderGateway };
