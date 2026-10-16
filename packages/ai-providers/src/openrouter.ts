import { AIProvider, GenerateTextParams, GenerateTextResult, StreamTextParams, StructuredOutputParams, CostTracker } from '@jarvis/ai-core';

export class OpenRouterProvider implements AIProvider {
  public readonly id = 'openrouter';
  public readonly name = 'OpenRouter Unified API';
  public readonly isLocal = false;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
  }

  public supportsVision(): boolean {
    return true;
  }

  public supportsTools(): boolean {
    return true;
  }

  public async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const model = params.model || 'deepseek/deepseek-chat';
    const lastUserMessage = params.messages.filter(m => m.role === 'user').pop()?.content || '';

    if (!this.apiKey || this.apiKey === 'DEMO_KEY') {
      const mockResult: GenerateTextResult = {
        text: `[JARVIS via OpenRouter (${model})]: Fallback output for query: "${lastUserMessage}".`,
        usage: { promptTokens: 30, completionTokens: 25, totalTokens: 55 },
        providerId: this.id,
        model
      };

      CostTracker.getInstance().recordRequest({
        isLocal: false,
        inputTokens: 30,
        outputTokens: 25,
        costPerMillionInputUSD: 0.14,
        costPerMillionOutputUSD: 0.28
      });

      return mockResult;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: params.messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const inputTok = data.usage?.prompt_tokens || 30;
    const outputTok = data.usage?.completion_tokens || 20;

    CostTracker.getInstance().recordRequest({
      isLocal: false,
      inputTokens: inputTok,
      outputTokens: outputTok,
      costPerMillionInputUSD: 0.14,
      costPerMillionOutputUSD: 0.28
    });

    return {
      text: content,
      usage: { promptTokens: inputTok, completionTokens: outputTok, totalTokens: inputTok + outputTok },
      providerId: this.id,
      model
    };
  }

  public async streamText(params: StreamTextParams, onChunk: (text: string) => void): Promise<string> {
    const res = await this.generateText(params);
    onChunk(res.text);
    return res.text;
  }

  public async generateStructuredOutput<T>(params: StructuredOutputParams<T>): Promise<T> {
    const res = await this.generateText(params);
    return JSON.parse(res.text) as T;
  }
}
