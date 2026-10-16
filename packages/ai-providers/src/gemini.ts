import { AIProvider, GenerateTextParams, GenerateTextResult, StreamTextParams, StructuredOutputParams, CostTracker } from '@jarvis/ai-core';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  public readonly isLocal = false;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  }

  public supportsVision(): boolean {
    return true;
  }

  public supportsTools(): boolean {
    return true;
  }

  public async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const model = params.model || 'gemini-2.5-flash';
    const lastUserMessage = params.messages.filter(m => m.role === 'user').pop()?.content || '';

    // If API key is missing or dummy, return structured mock/heuristic response for offline testing
    if (!this.apiKey || this.apiKey === 'DEMO_KEY') {
      const mockResult: GenerateTextResult = {
        text: `[JARVIS via Gemini (${model})]: Processed intent: "${lastUserMessage}". Core execution plan verified.`,
        usage: {
          promptTokens: Math.floor(lastUserMessage.length * 0.7) + 20,
          completionTokens: 35,
          totalTokens: Math.floor(lastUserMessage.length * 0.7) + 55
        },
        providerId: this.id,
        model
      };

      CostTracker.getInstance().recordRequest({
        isLocal: false,
        inputTokens: mockResult.usage.promptTokens,
        outputTokens: mockResult.usage.completionTokens,
        costPerMillionInputUSD: 0.075,
        costPerMillionOutputUSD: 0.30
      });

      return mockResult;
    }

    // Call official Gemini REST API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: params.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inputTok = data.usageMetadata?.promptTokenCount || 50;
    const outputTok = data.usageMetadata?.candidatesTokenCount || 30;

    CostTracker.getInstance().recordRequest({
      isLocal: false,
      inputTokens: inputTok,
      outputTokens: outputTok,
      costPerMillionInputUSD: 0.075,
      costPerMillionOutputUSD: 0.30
    });

    return {
      text: candidateText,
      usage: {
        promptTokens: inputTok,
        completionTokens: outputTok,
        totalTokens: inputTok + outputTok
      },
      providerId: this.id,
      model
    };
  }

  public async streamText(params: StreamTextParams, onChunk: (text: string) => void): Promise<string> {
    const res = await this.generateText(params);
    const words = res.text.split(' ');
    let full = '';
    for (const w of words) {
      const chunk = w + ' ';
      full += chunk;
      onChunk(chunk);
      await new Promise(r => setTimeout(r, 15));
    }
    return full;
  }

  public async generateStructuredOutput<T>(params: StructuredOutputParams<T>): Promise<T> {
    const res = await this.generateText({
      messages: [
        ...params.messages,
        { role: 'system', content: `Respond strictly with JSON matching schema: ${JSON.stringify(params.schema)}` }
      ],
      model: params.model
    });
    const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  }
}
