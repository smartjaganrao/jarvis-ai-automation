import { MCPServerRegistry, MCPToolRegistry } from './registry';
import { MCPConnectionManager } from './connection';
import { PermissionManager } from '@jarvis/permissions';
import { ToolExecutionResult, MCPTool } from '@jarvis/shared';

export class MCPManager {
  private static instance: MCPManager;
  private discoveredTools: Map<string, MCPTool[]> = new Map();

  private constructor() {}

  public static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  public getAvailableMCPTools(): MCPTool[] {
    return MCPToolRegistry.getInstance().getAllTools();
  }

  public async connectServer(serverId: string): Promise<boolean> {
    const registry = MCPServerRegistry.getInstance();
    const server = registry.getServer(serverId);
    if (!server) return false;

    const connected = await MCPConnectionManager.getInstance().connectServer(server);
    if (connected) {
      const tools = await MCPConnectionManager.getInstance().discoverTools(serverId);
      this.discoveredTools.set(serverId, tools);
      const toolRegistry = MCPToolRegistry.getInstance();
      for (const tool of tools) {
        toolRegistry.registerTool(tool);
      }
    }
    return connected;
  }

  public async disconnectServer(serverId: string): Promise<void> {
    await MCPConnectionManager.getInstance().disconnectServer(serverId);
    this.discoveredTools.delete(serverId);
  }

  public async executeMCPTool(toolName: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
    const start = Date.now();
    const tool = MCPToolRegistry.getInstance().getTool(toolName);

    if (!tool) {
      return {
        toolName,
        success: false,
        error: `MCP Tool '${toolName}' is not registered.`,
        executionTimeMs: Date.now() - start
      };
    }

    const server = MCPServerRegistry.getInstance().getServer(tool.serverId);
    if (!server || !server.enabled) {
      return {
        toolName,
        success: false,
        error: `Parent MCP Server '${tool.serverId}' is disabled or disconnected.`,
        executionTimeMs: Date.now() - start
      };
    }

    const connManager = MCPConnectionManager.getInstance();
    if (!connManager.isConnected(tool.serverId)) {
      const connected = await this.connectServer(tool.serverId);
      if (!connected) {
        return {
          toolName,
          success: false,
          error: `MCP Server '${tool.serverId}' is not connected.`,
          executionTimeMs: Date.now() - start
        };
      }
    }

    const permCheck = await PermissionManager.getInstance().checkPermission({
      toolName,
      level: tool.definition.permissionLevel,
      description: tool.definition.description,
      arguments: args
    });

    if (!permCheck.allowed) {
      return {
        toolName,
        success: false,
        error: permCheck.reason || `Execution rejected by permission policy.`,
        executionTimeMs: Date.now() - start
      };
    }

    try {
      const result = await connManager.sendRequest(tool.serverId, 'tools/call', {
        name: toolName.replace(`mcp_${tool.serverId}_`, ''),
        arguments: args
      });

      return {
        toolName,
        success: true,
        output: result,
        executionTimeMs: Date.now() - start
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        toolName,
        success: false,
        error: `MCP execution error: ${msg}`,
        executionTimeMs: Date.now() - start
      };
    }
  }

  public async initializeAllServers(): Promise<void> {
    const registry = MCPServerRegistry.getInstance();
    for (const server of registry.getAllServers()) {
      if (server.enabled) {
        await this.connectServer(server.id);
      }
    }
  }
}