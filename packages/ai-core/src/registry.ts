import { AIProvider } from './types';
import { ProviderId } from '@jarvis/shared';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, AIProvider> = new Map();

  private constructor() {}

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  public has(id: string): boolean {
    return this.providers.has(id);
  }
}

export class ModelRegistry {
  private static instance: ModelRegistry;
  private modelMap: Map<ProviderId, string[]> = new Map([
    ['gemini', ['gemini-2.5-flash', 'gemini-2.5-pro']],
    ['ollama', ['llama3.2', 'qwen2.5', 'mistral']],
    ['groq', ['llama-3.3-70b-versatile', 'mixtral-8x7b']],
    ['openrouter', ['deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o']],
    ['custom', ['custom-model']]
  ]);

  private constructor() {}

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  public getModelsForProvider(providerId: ProviderId): string[] {
    return this.modelMap.get(providerId) || [];
  }

  public registerModels(providerId: ProviderId, models: string[]): void {
    this.modelMap.set(providerId, models);
  }
}
