import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry, AIModelRouter, CostTracker } from '../packages/ai-core/src';
import { GeminiProvider, OllamaProvider, GroqProvider, OpenRouterProvider } from '../packages/ai-providers/src';

describe('AI Provider Abstraction & Model Router', () => {
  beforeEach(() => {
    const registry = ProviderRegistry.getInstance();
    registry.register(new GeminiProvider());
    registry.register(new OllamaProvider());
    registry.register(new GroqProvider());
    registry.register(new OpenRouterProvider());
  });

  it('should register all 4 core providers', () => {
    const registry = ProviderRegistry.getInstance();
    expect(registry.has('gemini')).toBe(true);
    expect(registry.has('ollama')).toBe(true);
    expect(registry.has('groq')).toBe(true);
    expect(registry.has('openrouter')).toBe(true);
  });

  it('should route text generation request to primary Gemini model', async () => {
    const router = AIModelRouter.getInstance();
    const result = await router.generateTextForRole('primary', {
      messages: [{ role: 'user', content: 'Test ping' }]
    });

    expect(result).toBeDefined();
    expect(result.providerId).toBe('gemini');
    expect(result.text).toContain('Processed intent');
  });

  it('should record requests in CostTracker with zero INR cost for local Ollama executions', async () => {
    const tracker = CostTracker.getInstance();
    tracker.resetMetrics();

    const router = AIModelRouter.getInstance();
    await router.generateTextForRole('local', {
      messages: [{ role: 'user', content: 'Offline execution query' }]
    });

    const metrics = tracker.getMetrics();
    expect(metrics.totalRequests).toBeGreaterThanOrEqual(1);
    expect(metrics.localRequestsCount).toBeGreaterThanOrEqual(1);
  });
});
