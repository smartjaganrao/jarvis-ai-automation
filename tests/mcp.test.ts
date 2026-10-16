import { describe, it, expect } from 'vitest';
import { MCPServerRegistry, MCPToolRegistry, MCPHealthMonitor, MCPManager } from '../packages/mcp/src';

describe('Model Context Protocol (MCP) Subsystem', () => {
  it('should discover registered MCP servers', () => {
    const servers = MCPServerRegistry.getInstance().getAllServers();
    expect(servers.length).toBeGreaterThan(0);
    expect(servers.some(s => s.id === 'filesystem')).toBe(true);
    expect(servers.some(s => s.id === 'github')).toBe(true);
  });

  it('should discover MCP tool definitions', () => {
    const tools = MCPToolRegistry.getInstance().getAllTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some(t => t.definition.name === 'mcp_fs_read_file')).toBe(true);
  });

  it('should track MCP server connection health metrics', () => {
    const monitor = MCPHealthMonitor.getInstance();
    const health = monitor.getStatus('filesystem');
    expect(health.serverId).toBe('filesystem');
    expect(health.status).toBe('connected');
  });

  it('should execute MCP tool calls via MCPManager', async () => {
    const manager = MCPManager.getInstance();
    const result = await manager.executeMCPTool('mcp_fs_read_file', { path: '/tmp/test.txt' });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
  });
});
