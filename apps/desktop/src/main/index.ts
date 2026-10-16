import { app, BrowserWindow, ipcMain } from 'electron';
import { ProviderRegistry, AIModelRouter, CostTracker } from '@jarvis/ai-core';
import { GeminiProvider, OllamaProvider, GroqProvider, OpenRouterProvider } from '@jarvis/ai-providers';
import { LocalDatabaseManager } from '@jarvis/memory';
import { PermissionManager } from '@jarvis/permissions';
import { ToolRouter } from '@jarvis/tools';
import { AgentRuntime } from '@jarvis/agent-runtime';
import { WorkflowEngine } from '@jarvis/workflow';
import { MCPManager, MCPServerRegistry } from '@jarvis/mcp';
import { IPC_CHANNELS } from '@jarvis/shared';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0B0F19',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeJarvisCore(): Promise<void> {
  console.info('=====================================================');
  console.info('  JARVIS — Personal AI Automation OS Bootstrapping  ');
  console.info('=====================================================');

  await LocalDatabaseManager.getInstance().initialize();

  const registry = ProviderRegistry.getInstance();
  registry.register(new GeminiProvider());
  registry.register(new OllamaProvider());
  registry.register(new GroqProvider());
  registry.register(new OpenRouterProvider());

  const pendingApprovals = new Map<string, { resolve: (value: boolean) => void; timeout: NodeJS.Timeout }>();

  ipcMain.handle(IPC_CHANNELS.PERMISSION_RESPONSE, (_event, id: string, allowed: boolean) => {
    const pending = pendingApprovals.get(id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingApprovals.delete(id);
      pending.resolve(allowed);
    }
  });

  PermissionManager.getInstance().setApprovalHandler(async (req) => {
    const id = `perm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        pendingApprovals.delete(id);
        resolve(false);
      }, 30000);

      pendingApprovals.set(id, { resolve, timeout });
      mainWindow?.webContents.send('permission:request', { ...req, id });
    });
  });

  await MCPManager.getInstance().initializeAllServers();

  console.info('[JARVIS Core] Initialization Complete.');
}

function setupIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AGENT_CHAT, async (_event, prompt: string, role?: string) => {
    return await AgentRuntime.getInstance().run({ userPrompt: prompt, role: role as any || 'primary' });
  });

  ipcMain.handle(IPC_CHANNELS.GET_METRICS, () => {
    return CostTracker.getInstance().getMetrics();
  });

  ipcMain.handle(IPC_CHANNELS.GET_AUDIT_LOGS, () => {
    return ToolRouter.getInstance().getAuditTimeline();
  });

  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => {
    return {
      routing: AIModelRouter.getInstance().getRoutingConfig(),
      providers: ProviderRegistry.getInstance().getAll().map(p => ({ id: p.id, name: p.name, isLocal: p.isLocal }))
    };
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_CONFIG, (_event, config: Record<string, unknown>) => {
    if (config.routing) {
      AIModelRouter.getInstance().setRoutingConfig(config.routing as any);
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.GET_WORKFLOWS, () => {
    return WorkflowEngine.getInstance().getAllWorkflows().map(wf => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      enabled: wf.enabled,
      trigger: wf.trigger,
      stepsCount: wf.steps.length,
      steps: wf.steps.map(s => s.name)
    }));
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_WORKFLOW, async (_event, workflow: any) => {
    const wf = WorkflowEngine.getInstance().getAllWorkflows().find(w => w.id === workflow.id);
    if (wf) {
      WorkflowEngine.getInstance().registerWorkflow({ ...wf, ...workflow, updatedAt: new Date().toISOString() });
    } else {
      WorkflowEngine.getInstance().registerWorkflow({
        ...workflow,
        id: workflow.id || `wf-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.RUN_WORKFLOW, async (_event, workflowId: string) => {
    const result = await WorkflowEngine.getInstance().runWorkflow(workflowId);
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.GET_MCP_SERVERS, () => {
    const registry = MCPServerRegistry.getInstance();
    const connManager = MCPManager.getInstance();
    return registry.getAllServers().map(s => ({
      id: s.id,
      name: s.name,
      transport: s.transport,
      command: s.command,
      args: s.args,
      url: s.url,
      enabled: s.enabled,
      status: 'connected'
    }));
  });

  ipcMain.handle(IPC_CHANNELS.MCP_SERVER_TOGGLE, async (_event, serverId: string, enabled: boolean) => {
    const registry = MCPServerRegistry.getInstance();
    registry.toggleServer(serverId, enabled);
    if (enabled) {
      await MCPManager.getInstance().connectServer(serverId);
    } else {
      await MCPManager.getInstance().disconnectServer(serverId);
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.MCP_SERVER_CONNECT, async (_event, serverId: string) => {
    const success = await MCPManager.getInstance().connectServer(serverId);
    return { success };
  });

  ipcMain.handle(IPC_CHANNELS.MCP_SERVER_DISCONNECT, async (_event, serverId: string) => {
    await MCPManager.getInstance().disconnectServer(serverId);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.GET_MCP_TOOLS, () => {
    return MCPManager.getInstance().getAvailableMCPTools().map(t => t.definition);
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_REQUEST, async (_event, req: any) => {
    return await PermissionManager.getInstance().checkPermission(req);
  });

  ipcMain.handle(IPC_CHANNELS.TOOL_EXECUTE, async (_event, toolName: string, args: Record<string, unknown>) => {
    return await ToolRouter.getInstance().executeTool(toolName, args);
  });
}

app.whenReady().then(async () => {
  await initializeJarvisCore();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
