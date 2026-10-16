/**
 * JARVIS Shared Types & Constants
 */

// 1. Permissions
export enum PermissionLevel {
  SAFE = 'SAFE',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  HIGH_RISK = 'HIGH_RISK'
}

export interface PermissionCheckRequest {
  toolName: string;
  level: PermissionLevel;
  description: string;
  arguments: Record<string, unknown>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  userApproved?: boolean;
  reason?: string;
}

// 2. AI Model & Provider Types
export type ModelRole = 'primary' | 'fast' | 'vision' | 'local' | 'fallback';

export type ProviderId = 'gemini' | 'ollama' | 'groq' | 'openrouter' | 'custom';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
}

export interface ModelRoutingConfig {
  primary: { provider: ProviderId; model: string };
  fast: { provider: ProviderId; model: string };
  vision: { provider: ProviderId; model: string };
  local: { provider: ProviderId; model: string };
  fallback: { provider: ProviderId; model: string };
}

export interface AIUsageMetrics {
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostINR: number;
  localRequestsCount: number;
  cloudRequestsCount: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface MCPTool {
  serverId: string;
  definition: ToolDefinition;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  output?: unknown;
  error?: string;
  executionTimeMs: number;
}

// 3. Workflow Engine Types
export type TriggerType = 'manual' | 'schedule' | 'startup' | 'file_changed' | 'email_received' | 'github_event';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'ai_task' | 'tool_execution' | 'browser_action' | 'notification' | 'script';
  toolName?: string;
  args?: Record<string, unknown>;
  prompt?: string;
  dependsOnStepId?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    cronSchedule?: string;
    filePath?: string;
  };
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditTimelineEvent {
  id: string;
  timestamp: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  details: string;
  toolName?: string;
  durationMs?: number;
}

// 4. Electron IPC Channel Constants
export const IPC_CHANNELS = {
  AGENT_CHAT: 'agent:chat',
  AGENT_STREAM: 'agent:stream',
  TOOL_EXECUTE: 'tool:execute',
  PERMISSION_RESPONSE: 'permission:response',
  PERMISSION_REQUEST: 'permission:request',
  GET_METRICS: 'metrics:get',
  GET_CONFIG: 'config:get',
  UPDATE_CONFIG: 'config:update',
  GET_WORKFLOWS: 'workflows:get',
  SAVE_WORKFLOW: 'workflows:save',
  RUN_WORKFLOW: 'workflows:run',
  GET_AUDIT_LOGS: 'audit:get',
  GET_MCP_SERVERS: 'mcp:servers:get',
  MCP_SERVER_TOGGLE: 'mcp:server:toggle',
  MCP_SERVER_CONNECT: 'mcp:server:connect',
  MCP_SERVER_DISCONNECT: 'mcp:server:disconnect',
  GET_MCP_TOOLS: 'mcp:tools:get'
} as const;
