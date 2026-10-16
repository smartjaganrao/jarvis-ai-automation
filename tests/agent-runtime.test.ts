import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRuntime } from '../packages/agent-runtime/src';
import { ProviderRegistry } from '../packages/ai-core/src';
import { GeminiProvider, OllamaProvider } from '../packages/ai-providers/src';

describe('AgentRuntime Bounded Execution Loop', () => {
  beforeEach(() => {
    const registry = ProviderRegistry.getInstance();
    registry.register(new GeminiProvider());
    registry.register(new OllamaProvider());
  });

  it('should process user intent and trigger corresponding tools', async () => {
    const agent = AgentRuntime.getInstance();
    const result = await agent.run({
      userPrompt: 'Check my system specs and memory'
    });

    expect(result.success).toBe(true);
    expect(result.toolsCalled).toContain('get_system_info');
    expect(result.finalResponse).toBeDefined();
  });
});
