import { AIProvider, GenerateTextParams, GenerateTextResult, StreamTextParams, StructuredOutputParams, CostTracker } from '@jarvis/ai-core';

export class GroqProvider implements AIProvider {
  public readonly id = 'groq';
  public readonly name = 'Groq Cloud';
  public readonly isLocal = false;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
  }

  public supportsVision(): boolean {
    return false;
  }

  public supportsTools(): boolean {
    return true;
  }

  public async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const model = params.model || 'llama-3.3-70b-versatile';
    const lastUserMessage = params.messages.filter(m => m.role === 'user').pop()?.content || '';

    if (!this.apiKey || this.apiKey === 'DEMO_KEY') {
      const mockResult: GenerateTextResult = {
        text: `[JARVIS via Groq Fast Llama (${model})]: Handled ultra-fast task: "${lastUserMessage}".`,
        usage: { promptTokens: 25, completionTokens: 20, totalTokens: 45 },
        providerId: this.id,
        model
      };

      CostTracker.getInstance().recordRequest({
        isLocal: false,
        inputTokens: 25,
        outputTokens: 20,
        costPerMillionInputUSD: 0.05,
        costPerMillionOutputUSD: 0.08
      });

      return mockResult;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const inputTok = data.usage?.prompt_tokens || 20;
    const outputTok = data.usage?.completion_tokens || 20;

    CostTracker.getInstance().recordRequest({
      isLocal: false,
      inputTokens: inputTok,
      outputTokens: outputTok,
      costPerMillionInputUSD: 0.05,
      costPerMillionOutputUSD: 0.08
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
