# JARVIS — Personal AI Automation OS Architecture

## 1. System Vision & Overview

JARVIS is a desktop-first, local-first, AI-provider agnostic, MCP-compatible personal AI automation operating system. Unlike traditional AI chatbots, JARVIS acts as an autonomous execution engine that translates user intents into verifiable, multi-step actions across web services, desktop applications, files, calendars, emails, and custom tools.

### Core Philosophy
```
User Intent  ──>  Plan & Route  ──>  Tool Selection  ──>  Permission Check  ──>  Execute  ──>  Verify  ──>  Report & Remember
```

---

## 2. High-Level Architecture

JARVIS is structured as a modular Monorepo with clear separation between the desktop app wrapper (Electron Main/Preload), frontend client (React + Vite), and modular npm packages.

```
                              ┌──────────────────────────────────────────────┐
                              │             React Desktop UI (Vite)          │
                              └──────────────────────┬───────────────────────┘
                                                     │ Electron IPC
                              ┌──────────────────────▼───────────────────────┐
                              │            Electron Main Process             │
                              └──────────────────────┬───────────────────────┘
                                                     │ Core Runtime
               ┌─────────────────────────────────────┼─────────────────────────────────────┐
               │                                     │                                     │
     ┌─────────▼──────────┐                ┌─────────▼──────────┐                ┌─────────▼──────────┐
     │    Agent Runtime   │                │     Tool Router    │                │  AI Model Router   │
     └─────────┬──────────┘                └─────────┬──────────┘                └─────────┬──────────┘
               │                                     │                                     │
    ┌──────────┴──────────┐                ┌─────────┴──────────┐                ┌─────────┴──────────┐
    │   Workflow Engine   │                │  Permission Manager│                │ Provider Registry  │
    └──────────┬──────────┘                └─────────┬──────────┘                └────────────────────┘
               │                                     │
    ┌──────────┴──────────┐                ┌─────────┴──────────┐
    │ Memory & SQLite DB  │                │ MCP Server Manager │
    └─────────────────────┘                └────────────────────┘
```

---

## 3. Package Architecture & Responsibilities

| Package Path | Purpose & Responsibilities |
| :--- | :--- |
| `apps/desktop` | Electron app shell, window management, system tray, IPC handlers, Vite React frontend. |
| `packages/ai-core` | AIProvider contract, AIModelRouter, ModelRegistry, Token/Cost Tracker. |
| `packages/ai-providers` | Adapters for Gemini, Ollama, Groq, OpenRouter, and future providers. |
| `packages/agent-runtime` | Core agent loop (Plan -> Select Tool -> Check Permission -> Execute -> Verify). |
| `packages/tools` | Tool Router, parameter validation, execution tracking, audit logging. |
| `packages/mcp` | MCP Client, Server Registry, Tool Discovery, and Dynamic Schema Parser. |
| `packages/permissions` | 3-tier permission manager (SAFE, APPROVAL_REQUIRED, HIGH_RISK) + user prompt dialogs. |
| `packages/workflow` | Workflow Definition Engine, Trigger Listeners, Execution History, Teach JARVIS Recorder. |
| `packages/browser` | Playwright Browser Automation Agent with DOM/Accessibility selector engine. |
| `packages/desktop-control` | Desktop UI Automation (AppleScript, native OS accessibility wrappers). |
| `packages/memory` | SQLite database (Drizzle ORM), Short/Long Term Memory, Context Summarization. |
| `packages/security` | Keytar/OS Credential Vault, Encrypted Secrets, Command Security Sanitizer. |
| `packages/voice` | Speech-to-Text (Whisper/Native), Text-to-Speech engine, Multilingual Voice VAD. |
| `packages/scheduler` | Cron & One-shot task scheduler for background execution. |
| `packages/notifications` | Proactive desktop notification manager with quiet hours and priority queue. |
| `packages/shared` | Shared TypeScript interfaces, IPC event constants, schemas. |

---

## 4. Key Design Principles

1. **Local-First & Offline Capable**: Operations and local AI models (Ollama) work without active cloud connections. SQLite stores state locally.
2. **Provider Agnostic**: Standardized `AIProvider` wrapper allowing seamless switching, auto-fallback, and multi-model execution.
3. **Strict Security & Verification**: No destructive action executes without permission. Actions are verified post-execution.
4. **Extensible via MCP**: Integrations (Gmail, GitHub, Notion, etc.) communicate via Model Context Protocol rather than tight coupling.
