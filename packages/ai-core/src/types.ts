import { AIMessage, ToolDefinition, ToolCall } from '@jarvis/shared';

export interface GenerateTextParams {
  messages: AIMessage[];
  model?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  providerId: string;
  model: string;
}

export interface StreamTextParams {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StructuredOutputParams<T> {
  messages: AIMessage[];
  schema: Record<string, unknown>;
  model?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  isLocal: boolean;
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
  streamText(params: StreamTextParams, onChunk: (text: string) => void): Promise<string>;
  generateStructuredOutput<T>(params: StructuredOutputParams<T>): Promise<T>;
  supportsVision(): boolean;
  supportsTools(): boolean;
}
