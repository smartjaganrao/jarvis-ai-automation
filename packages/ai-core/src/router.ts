import { ProviderRegistry } from './registry';
import { GenerateTextParams, GenerateTextResult, StreamTextParams } from './types';
import { ModelRole, ModelRoutingConfig, ProviderId } from '@jarvis/shared';

export class AIModelRouter {
  private static instance: AIModelRouter;
  private routingConfig: ModelRoutingConfig = {
    primary: { provider: 'gemini', model: 'gemini-2.5-flash' },
    fast: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    vision: { provider: 'gemini', model: 'gemini-2.5-pro' },
    local: { provider: 'ollama', model: 'llama3.2' },
    fallback: { provider: 'openrouter', model: 'deepseek/deepseek-chat' }
  };

  private fallbackChain: ProviderId[] = ['gemini', 'groq', 'openrouter', 'ollama'];

  private constructor() {}

  public static getInstance(): AIModelRouter {
    if (!AIModelRouter.instance) {
      AIModelRouter.instance = new AIModelRouter();
    }
    return AIModelRouter.instance;
  }

  public setRoutingConfig(config: Partial<ModelRoutingConfig>): void {
    this.routingConfig = { ...this.routingConfig, ...config };
  }

  public getRoutingConfig(): ModelRoutingConfig {
    return { ...this.routingConfig };
  }

  public async generateTextForRole(
    role: ModelRole,
    params: GenerateTextParams
  ): Promise<GenerateTextResult> {
    const config = this.routingConfig[role];
    const registry = ProviderRegistry.getInstance();

    // Try target provider first
    const primaryProvider = registry.get(config.provider);
    if (primaryProvider) {
      try {
        return await primaryProvider.generateText({ ...params, model: config.model });
      } catch (err) {
        console.warn(`[AIModelRouter] Provider ${config.provider} failed for role ${role}:`, err);
      }
    }

    // Dynamic Fallback chain execution
    for (const providerId of this.fallbackChain) {
      if (providerId === config.provider) continue; // Already tried
      const fallbackProvider = registry.get(providerId);
      if (!fallbackProvider) continue;

      try {
        console.info(`[AIModelRouter] Retrying role ${role} using fallback provider: ${providerId}`);
        return await fallbackProvider.generateText(params);
      } catch (fallbackErr) {
        console.warn(`[AIModelRouter] Fallback provider ${providerId} also failed:`, fallbackErr);
      }
    }

    throw new Error(`[AIModelRouter] All AI providers failed for role '${role}'. Please verify API keys or local Ollama connection.`);
  }

  public async streamTextForRole(
    role: ModelRole,
    params: StreamTextParams,
    onChunk: (text: string) => void
  ): Promise<string> {
    const config = this.routingConfig[role];
    const registry = ProviderRegistry.getInstance();

    const primaryProvider = registry.get(config.provider);
    if (primaryProvider) {
      try {
        return await primaryProvider.streamText({ ...params, model: config.model }, onChunk);
      } catch (err) {
        console.warn(`[AIModelRouter] Streaming failed for ${config.provider}:`, err);
      }
    }

    // Fallback stream
    for (const providerId of this.fallbackChain) {
      if (providerId === config.provider) continue;
      const fallbackProvider = registry.get(providerId);
      if (!fallbackProvider) continue;

      try {
        return await fallbackProvider.streamText(params, onChunk);
      } catch (fallbackErr) {
        console.warn(`[AIModelRouter] Streaming fallback ${providerId} failed:`, fallbackErr);
      }
    }

    throw new Error(`[AIModelRouter] Streaming failed across all configured AI providers.`);
  }
}
