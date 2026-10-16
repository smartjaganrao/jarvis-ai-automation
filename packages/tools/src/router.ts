import { BUILTIN_TOOLS, ExecutableTool } from './builtin';
import { PermissionManager } from '@jarvis/permissions';
import { AuditTimelineEvent, ToolDefinition, ToolExecutionResult } from '@jarvis/shared';
import { MCPManager, MCPTool } from '@jarvis/mcp';

export class ToolRouter {
  private static instance: ToolRouter;
  private tools: Map<string, ExecutableTool> = new Map();
  private auditEvents: AuditTimelineEvent[] = [];

  private constructor() {
    for (const [name, tool] of Object.entries(BUILTIN_TOOLS)) {
      this.tools.set(name, tool);
    }
  }

  public static getInstance(): ToolRouter {
    if (!ToolRouter.instance) {
      ToolRouter.instance = new ToolRouter();
    }
    return ToolRouter.instance;
  }

  public registerTool(tool: ExecutableTool): void {
    this.tools.set(tool.definition.name, tool);
  }

  public getToolDefinitions(): ToolDefinition[] {
    const builtinDefs = Array.from(this.tools.values()).map(t => t.definition);
    const mcpTools = MCPManager.getInstance().getAvailableMCPTools().map((m: MCPTool) => m.definition);
    return [...builtinDefs, ...mcpTools];
  }

  public getAuditTimeline(): AuditTimelineEvent[] {
    return [...this.auditEvents];
  }

  public async executeTool(toolName: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
    const start = Date.now();

    // Check if tool is an MCP tool
    if (toolName.startsWith('mcp_')) {
      this.recordAudit(toolName, 'running', `Executing MCP tool with args: ${JSON.stringify(args)}`);
      const mcpResult = await MCPManager.getInstance().executeMCPTool(toolName, args);
      this.recordAudit(toolName, mcpResult.success ? 'completed' : 'failed', JSON.stringify(mcpResult.output || mcpResult.error), mcpResult.executionTimeMs);
      return mcpResult;
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      const errRes: ToolExecutionResult = {
        toolName,
        success: false,
        error: `Tool '${toolName}' not found in ToolRouter registry.`,
        executionTimeMs: Date.now() - start
      };
      this.recordAudit(toolName, 'failed', errRes.error || '');
      return errRes;
    }

    // 1. Permission Check
    const permManager = PermissionManager.getInstance();
    const permCheck = await permManager.checkPermission({
      toolName,
      level: tool.definition.permissionLevel,
      description: tool.definition.description,
      arguments: args
    });

    if (!permCheck.allowed) {
      const deniedRes: ToolExecutionResult = {
        toolName,
        success: false,
        error: permCheck.reason || `Execution denied by Permission Policy for tool '${toolName}'.`,
        executionTimeMs: Date.now() - start
      };
      this.recordAudit(toolName, 'failed', deniedRes.error || '');
      return deniedRes;
    }

    // 2. Execution
    this.recordAudit(toolName, 'running', `Executing tool with args: ${JSON.stringify(args)}`);

    try {
      const result = await tool.execute(args);
      this.recordAudit(toolName, result.success ? 'completed' : 'failed', `Output: ${JSON.stringify(result.output)}`, result.executionTimeMs);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const failRes: ToolExecutionResult = {
        toolName,
        success: false,
        error: `Execution error in tool '${toolName}': ${msg}`,
        executionTimeMs: Date.now() - start
      };
      this.recordAudit(toolName, 'failed', failRes.error || '');
      return failRes;
    }
  }

  private recordAudit(toolName: string, status: AuditTimelineEvent['status'], details: string, durationMs?: number): void {
    this.auditEvents.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      stepName: `Tool Execution: ${toolName}`,
      status,
      details,
      toolName,
      durationMs
    });
  }
}
