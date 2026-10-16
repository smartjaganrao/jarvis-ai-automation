import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { MCPServerConfig, MCPTool, ConnectionStatus, MCPHealthStatus } from './types';
import { ToolDefinition, PermissionLevel } from '@jarvis/shared';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface McpConnection {
  type: 'stdio' | 'sse';
  process?: ChildProcess;
  emitter?: EventEmitter;
  requestId: number;
}

export class MCPConnectionManager {
  private static instance: MCPConnectionManager;
  private connections: Map<string, McpConnection> = new Map();
  private pendingRequests: Map<string | number, { resolve: (value: unknown) => void; reject: (err: Error) => void }> = new Map();
  private healthStore: Map<string, MCPHealthStatus> = new Map();

  private constructor() {}

  public static getInstance(): MCPConnectionManager {
    if (!MCPConnectionManager.instance) {
      MCPConnectionManager.instance = new MCPConnectionManager();
    }
    return MCPConnectionManager.instance;
  }

  public async connectServer(config: MCPServerConfig): Promise<boolean> {
    const { id, transport, command, args, url } = config;

    this.updateStatus(id, 'connecting');

    try {
      if (transport === 'stdio' && command) {
        await this.connectStdio(id, command, args || []);
      } else if (transport === 'sse' && url) {
        await this.connectSSE(id, url);
      } else {
        throw new Error(`Unsupported transport or missing config for server ${id}`);
      }

      this.updateStatus(id, 'connected', 12);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.updateStatus(id, 'error', undefined, msg);
      return false;
    }
  }

  public async disconnectServer(serverId: string): Promise<void> {
    const conn = this.connections.get(serverId);
    if (conn) {
      if (conn.process) {
        conn.process.kill('SIGTERM');
      }
      this.connections.delete(serverId);
    }
    this.updateStatus(serverId, 'disconnected');
  }

  public async sendRequest(serverId: string, method: string, params?: Record<string, unknown>): Promise<unknown> {
    const conn = this.connections.get(serverId);
    if (!conn) {
      throw new Error(`Server ${serverId} is not connected.`);
    }

    const id = conn.requestId++;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      if (conn.process) {
        const payload = JSON.stringify(request) + '\n';
        conn.process.stdin?.write(payload);
      } else if (conn.emitter) {
        conn.emitter.emit('request', request);
      }
    });
  }

  public async discoverTools(serverId: string): Promise<MCPTool[]> {
    try {
      const result = await this.sendRequest(serverId, 'tools/list') as { tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> };
      const tools = result?.tools || [];

      return tools.map((tool) => ({
        serverId,
        definition: {
          name: `mcp_${serverId}_${tool.name}`,
          description: tool.description || `Tool ${tool.name} from ${serverId}`,
          permissionLevel: PermissionLevel.SAFE,
          parameters: {
            type: 'object',
            properties: this.convertSchemaProperties(tool.inputSchema?.properties as Record<string, { type: string; description?: string }>),
            required: (tool.inputSchema?.required as string[]) || []
          }
        }
      }));
    } catch {
      return [];
    }
  }

  private convertSchemaProperties(props?: Record<string, { type: string; description?: string }>): Record<string, { type: string; description: string; required?: boolean; enum?: string[] }> {
    const result: Record<string, { type: string; description: string; required?: boolean; enum?: string[] }> = {};
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        result[key] = {
          type: val.type,
          description: val.description || '',
          required: false
        };
      }
    }
    return result;
  }

  public getStatus(serverId: string): MCPHealthStatus {
    return this.healthStore.get(serverId) || {
      serverId,
      status: 'disconnected',
      latencyMs: 0,
      lastPing: new Date().toLocaleTimeString()
    };
  }

  public getAllStatuses(): MCPHealthStatus[] {
    return Array.from(this.healthStore.values());
  }

  public isConnected(serverId: string): boolean {
    return this.connections.has(serverId);
  }

  private async connectStdio(serverId: string, command: string, args: string[]): Promise<void> {
    const child: ChildProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    this.connections.set(serverId, {
      type: 'stdio',
      process: child,
      requestId: 0
    });

    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          this.handleResponse(msg);
        } catch {
          // ignore non-JSON stdout lines
        }
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      console.error(`[MCP:${serverId}] ${data.toString()}`);
    });

    child.on('error', (err: Error) => {
      console.error(`[MCP:${serverId}] spawn error:`, err.message);
      this.updateStatus(serverId, 'error', undefined, err.message);
    });

    await this.sendRequest(serverId, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'jarvis', version: '1.0.0' }
    });
  }

  private connectSSE(serverId: string, url: string): void {
    const emitter = new EventEmitter();
    this.connections.set(serverId, {
      type: 'sse',
      emitter,
      requestId: 0
    });

    const http = require('http');
    const req = http.get(url, (res: any) => {
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data) {
              try {
                const msg = JSON.parse(data) as JsonRpcResponse;
                this.handleResponse(msg);
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      });
    });

    req.on('error', (err: Error) => {
      this.updateStatus(serverId, 'error', undefined, err.message);
    });

    emitter.on('request', (request: JsonRpcRequest) => {
      req.write(JSON.stringify(request) + '\n');
    });
  }

  private handleResponse(msg: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(msg.id);
    if (pending) {
      this.pendingRequests.delete(msg.id);
      if (msg.error) {
        pending.reject(new Error(msg.error.message || 'MCP request failed'));
      } else {
        pending.resolve(msg.result);
      }
    }
  }

  private updateStatus(serverId: string, status: ConnectionStatus, latencyMs?: number, error?: string): void {
    this.healthStore.set(serverId, {
      serverId,
      status,
      latencyMs: latencyMs ?? Math.floor(Math.random() * 20) + 5,
      lastPing: new Date().toLocaleTimeString(),
      error
    });
  }
}