import { PermissionLevel, ToolDefinition } from '@jarvis/shared';

export type TransportType = 'stdio' | 'sse';

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
}

export interface MCPTool {
  serverId: string;
  definition: ToolDefinition;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface MCPHealthStatus {
  serverId: string;
  status: ConnectionStatus;
  latencyMs?: number;
  lastPing?: string;
  error?: string;
}
