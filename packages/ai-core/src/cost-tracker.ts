import { AIUsageMetrics } from '@jarvis/shared';

export class CostTracker {
  private static instance: CostTracker;
  private metrics: AIUsageMetrics = {
    totalRequests: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostINR: 0,
    localRequestsCount: 0,
    cloudRequestsCount: 0
  };

  private constructor() {}

  public static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  public recordRequest(params: {
    isLocal: boolean;
    inputTokens: number;
    outputTokens: number;
    costPerMillionInputUSD?: number;
    costPerMillionOutputUSD?: number;
  }): void {
    this.metrics.totalRequests += 1;
    if (params.isLocal) {
      this.metrics.localRequestsCount += 1;
    } else {
      this.metrics.cloudRequestsCount += 1;
    }

    const totalTok = params.inputTokens + params.outputTokens;
    this.metrics.inputTokens += params.inputTokens;
    this.metrics.outputTokens += params.outputTokens;
    this.metrics.totalTokens += totalTok;

    if (!params.isLocal && (params.costPerMillionInputUSD || params.costPerMillionOutputUSD)) {
      const inputCostUSD = (params.inputTokens / 1_000_000) * (params.costPerMillionInputUSD || 0);
      const outputCostUSD = (params.outputTokens / 1_000_000) * (params.costPerMillionOutputUSD || 0);
      const totalUSD = inputCostUSD + outputCostUSD;
      // Convert to INR approx ₹87 / $1
      const totalINR = totalUSD * 87;
      this.metrics.estimatedCostINR += Number(totalINR.toFixed(4));
    }
  }

  public getMetrics(): AIUsageMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostINR: 0,
      localRequestsCount: 0,
      cloudRequestsCount: 0
    };
  }
}
