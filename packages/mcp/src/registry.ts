import { MCPServerConfig, MCPTool } from './types';
import { PermissionLevel } from '@jarvis/shared';

export class MCPServerRegistry {
  private static instance: MCPServerRegistry;
  private servers: Map<string, MCPServerConfig> = new Map();

  private constructor() {
    // Register default initial MCP connectors
    this.registerServer({
      id: 'filesystem',
      name: 'Filesystem MCP',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/jaganrao/Projects'],
      enabled: true
    });

    this.registerServer({
      id: 'github',
      name: 'GitHub MCP',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      enabled: true
    });

    this.registerServer({
      id: 'gmail',
      name: 'Gmail MCP',
      transport: 'sse',
      url: 'http://localhost:8080/mcp/gmail',
      enabled: true
    });
  }

  public static getInstance(): MCPServerRegistry {
    if (!MCPServerRegistry.instance) {
      MCPServerRegistry.instance = new MCPServerRegistry();
    }
    return MCPServerRegistry.instance;
  }

  public registerServer(config: MCPServerConfig): void {
    this.servers.set(config.id, config);
  }

  public getServer(id: string): MCPServerConfig | undefined {
    return this.servers.get(id);
  }

  public getAllServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  public toggleServer(id: string, enabled: boolean): void {
    const srv = this.servers.get(id);
    if (srv) {
      srv.enabled = enabled;
    }
  }
}

export class MCPToolRegistry {
  private static instance: MCPToolRegistry;
  private tools: Map<string, MCPTool> = new Map();

  private constructor() {
    // Populate default MCP tools discovered from initial connectors
    this.registerTool({
      serverId: 'filesystem',
      definition: {
        name: 'mcp_fs_read_file',
        description: 'Read file contents from local filesystem via Filesystem MCP Server',
        permissionLevel: PermissionLevel.SAFE,
        parameters: {
          type: 'object',
          properties: { path: { type: 'string', description: 'File path' } },
          required: ['path']
        }
      }
    });

    this.registerTool({
      serverId: 'github',
      definition: {
        name: 'mcp_github_create_pr',
        description: 'Create a Pull Request on GitHub repository via GitHub MCP Server',
        permissionLevel: PermissionLevel.APPROVAL_REQUIRED,
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'PR title' },
            head: { type: 'string', description: 'Head branch' }
          },
          required: ['repo', 'title', 'head']
        }
      }
    });

    this.registerTool({
      serverId: 'gmail',
      definition: {
        name: 'mcp_gmail_search_inbox',
        description: 'Search Gmail inbox for unread messages via Gmail MCP Server',
        permissionLevel: PermissionLevel.SAFE,
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Search term or filter' } }
        }
      }
    });
  }

  public static getInstance(): MCPToolRegistry {
    if (!MCPToolRegistry.instance) {
      MCPToolRegistry.instance = new MCPToolRegistry();
    }
    return MCPToolRegistry.instance;
  }

  public registerTool(tool: MCPTool): void {
    this.tools.set(tool.definition.name, tool);
  }

  public getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }
}
