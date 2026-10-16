# Model Context Protocol (MCP) Architecture

## 1. Overview

JARVIS implements Anthropic's Model Context Protocol (MCP) to dynamically connect to external services, local applications, databases, and APIs without tight coupling inside the core codebase.

---

## 2. MCP Subsystem Components

```
                   ┌─────────────────────────────────────────┐
                   │               MCP Manager               │
                   └────────────────────┬────────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
  ┌──────────▼──────────┐    ┌──────────▼──────────┐    ┌──────────▼──────────┐
  │ MCP Server Registry │    │   MCP Tool Registry │    │MCP Connection Mgr   │
  └──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                             ┌──────────▼──────────┐
                             │ MCP Health Monitor  │
                             └─────────────────────┘
```

1. **MCP Manager**: Top-level coordinator for client connections, lifecycle events, and server status.
2. **MCP Server Registry**: Discovers, configations, and starts stdio / SSE transport connections to local and remote MCP servers.
3. **MCP Tool Registry**: Aggregates available tools from all connected MCP servers into JSON Schemas digestible by the Tool Router & AI Models.
4. **MCP Connection Manager**: Manages connection pooling, pinging, reconnects with backoff, and server health.
5. **MCP Permission Manager**: Intercepts tool calls originating from MCP servers and evaluates required user permission levels.

---

## 3. Supported MCP Connectors

- **Filesystem**: Safe local workspace read/write and file discovery.
- **Git & GitHub**: Repository status, commit, push, PR review, issue management.
- **Gmail & Google Calendar**: Reading emails, drafting replies, fetching calendar events, creating reminders.
- **Google Drive & Notion**: Document retrieval, note creation, file syncing.
- **Slack, Telegram, Discord**: Messaging triggers and posting responses.
- **Custom REST & Stdio MCP Servers**: User-defined custom command or URL integrations.
