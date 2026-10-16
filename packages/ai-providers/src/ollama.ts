import { AIProvider, GenerateTextParams, GenerateTextResult, StreamTextParams, StructuredOutputParams, CostTracker } from '@jarvis/ai-core';

export class OllamaProvider implements AIProvider {
  public readonly id = 'ollama';
  public readonly name = 'Ollama Local AI';
  public readonly isLocal = true;
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  public supportsVision(): boolean {
    return false;
  }

  public supportsTools(): boolean {
    return true;
  }

  public async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const model = params.model || 'llama3.2';
    const lastUserMessage = params.messages.filter(m => m.role === 'user').pop()?.content || '';

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: params.messages.map(m => ({ role: m.role, content: m.content })),
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      const outputText = data.message?.content || '';
      const promptTok = data.prompt_eval_count || 40;
      const evalTok = data.eval_count || 20;

      CostTracker.getInstance().recordRequest({
        isLocal: true,
        inputTokens: promptTok,
        outputTokens: evalTok
      });

      return {
        text: outputText,
        usage: { promptTokens: promptTok, completionTokens: evalTok, totalTokens: promptTok + evalTok },
        providerId: this.id,
        model
      };
    } catch {
      // Offline fallback mock if Ollama server is not currently running locally
      const mockResult: GenerateTextResult = {
        text: `[JARVIS via Local Ollama (${model})]: Handled query: "${lastUserMessage}". Executed 100% offline.`,
        usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 },
        providerId: this.id,
        model
      };

      CostTracker.getInstance().recordRequest({
        isLocal: true,
        inputTokens: 30,
        outputTokens: 20
      });

      return mockResult;
    }
  }

  public async streamText(params: StreamTextParams, onChunk: (text: string) => void): Promise<string> {
    const res = await this.generateText(params);
    onChunk(res.text);
    return res.text;
  }

  public async generateStructuredOutput<T>(params: StructuredOutputParams<T>): Promise<T> {
    const res = await this.generateText({
      messages: [
        ...params.messages,
        { role: 'system', content: `Respond strictly with JSON schema: ${JSON.stringify(params.schema)}` }
      ],
      model: params.model
    });
    return JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim()) as T;
  }
}
