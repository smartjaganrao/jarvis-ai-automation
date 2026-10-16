# JARVIS — Personal AI Automation Operating System 🤖⚡

> An extensible, local-first agentic operating system combining multi-model AI routing, Model Context Protocol (MCP), and local task scheduling.

---

## 🌟 Key Capabilities

- **🔀 Multi-Provider Intelligent AI Router:** Seamless routing across **Google Gemini, Groq, Ollama (Local), and OpenRouter** with automatic token cost and latency tracking.
- **🔌 Model Context Protocol (MCP) Integration:** Dynamic tool execution through standardized MCP connections (filesystem, APIs, shell tools).
- **🧠 Local Memory & Persistence:** Vector embeddings and relational state managed with **SQLite (`better-sqlite3`)** and **Drizzle ORM**.
- **🛡️ Granular Permission Matrix:** Interactive security and authorization layer preventing unauthorized file/network access.
- **⏱️ Automated Task Scheduler:** Cron and interval-based background workflow engine running continuous automations.

---

## 🏗️ Architecture Overview

The system is architected as an extensible monorepo:

```
jarvis-ai-automation/
├── apps/
│   └── desktop/          # Electron + React + Tailwind user cockpit
├── packages/
│   ├── ai-core/          # Router, Model Registry, and Cost Tracking
│   ├── ai-providers/     # Gemini, Groq, Ollama, OpenRouter drivers
│   ├── agent-runtime/    # Autonomous agent loop & reasoning steps
│   ├── mcp/              # Model Context Protocol manager and client
│   ├── memory/           # Drizzle ORM schemas & SQLite engine
│   ├── permissions/      # Access control & user approval system
│   ├── scheduler/        # Background cron & event scheduler
│   ├── tools/            # Builtin tool router & system bindings
│   └── workflow/         # Declarative DAG workflow execution engine
└── tests/                # Comprehensive Vitest test suites
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v20+)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/smartjaganrao/jarvis-ai-automation.git
cd "jarvis-ai-automation"

# Install all workspace dependencies
npm install

# Run the test suite
npm test
```

### Development Cockpit

```bash
# Start the desktop interface
npm run dev
```

---

## 🧪 Testing & Validation

The core packages are backed by automated tests:

```bash
npx vitest run
```

---

## 📄 License

MIT © [Jagan Rao](https://github.com/smartjaganrao)
