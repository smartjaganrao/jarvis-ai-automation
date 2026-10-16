# JARVIS AI Provider Architecture & Model Router

## 1. Vision

JARVIS maintains complete AI provider independence. It leverages local models (Ollama) and cost-effective/free tier cloud models (Gemini, Groq) to maximize performance while minimizing operational costs to ₹0 where possible.

---

## 2. Core AIProvider Interface

Every AI model provider implements a standard unified contract:

```typescript
export interface AIProvider {
  id: string;
  name: string;
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
  streamText(params: StreamTextParams): Promise<AsyncIterable<string>>;
  generateStructuredOutput<T>(params: StructuredOutputParams<T>): Promise<T>;
  generateEmbeddings(params: EmbeddingParams): Promise<number[][]>;
  supportsVision(): boolean;
  supportsTools(): boolean;
}
```

---

## 3. Supported Providers

1. **Google Gemini**: Default cloud model (`gemini-2.5-flash`, `gemini-2.5-pro`). High context window, structured JSON support, free tier quota.
2. **Groq**: Ultra-fast inference engine (`llama-3.3-70b-versatile`, `mixtral-8x7b`). Ideal for quick routing & fast tasks.
3. **Ollama**: Local AI runner (`llama3.2`, `qwen2.5`, `mistral`). Works offline and ensures zero external data leak for sensitive local tasks.
4. **OpenRouter**: Unified API aggregator for fallback access to DeepSeek, Claude 3.5 Sonnet, GPT-4o, Cerebras, etc.

---

## 4. AI Model Router & Fallback Chain

`AIModelRouter` evaluates task requirements (fast, vision, local, complex reasoning) and dispatches requests through a configurable fallback hierarchy:

```
                          ┌───────────────────────────┐
                          │   Incoming Agent Task    │
                          └─────────────┬─────────────┘
                                        │
                      ┌─────────────────▼─────────────────┐
                      │    Is Task Local/Privacy-First?   │
                      └────────┬─────────────────┬────────┘
                           YES │                 │ NO
                               ▼                 ▼
                        ┌─────────────┐   ┌─────────────┐
                        │   Ollama    │   │  Gemini 2.5 │
                        └──────┬──────┘   └──────┬──────┘
                               │ Error           │ Rate-limited / Fail
                               ▼                 ▼
                        ┌─────────────┐   ┌─────────────┐
                        │    Groq     │   │ OpenRouter  │
                        └──────┬──────┘   └──────┬──────┘
                               │                 │
                               └────────┬────────┘
                                        ▼
                                 ┌──────────────┐
                                 │ Local Ollama │
                                 └──────────────┘
```

---

## 5. Cost Optimization Engine

`CostTracker` records every model request, token consumption (input + output), estimated cost in local currency/USD, provider response latency, and rate-limit headers.

* **Simple Task / Formatting** -> Ollama or Groq Fast Model
* **Normal Agent Reasoning** -> Gemini 2.5 Flash
* **Vision / Document Analysis** -> Gemini 2.5 Pro Vision / Claude 3.5 Sonnet via OpenRouter
* **Local Offline Execution** -> Ollama (100% Zero Cost)
