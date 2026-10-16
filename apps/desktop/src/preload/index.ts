import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@jarvis/shared';

export interface JarvisBridge {
  sendPrompt: (prompt: string, role?: string) => Promise<any>;
  getMetrics: () => Promise<any>;
  getAuditLogs: () => Promise<any>;
  getConfig: () => Promise<any>;
  updateConfig: (config: Record<string, unknown>) => Promise<any>;
  getWorkflows: () => Promise<any>;
  saveWorkflow: (workflow: Record<string, unknown>) => Promise<any>;
  runWorkflow: (workflowId: string) => Promise<any>;
  getMcpServers: () => Promise<any>;
  toggleMcpServer: (serverId: string, enabled: boolean) => Promise<any>;
  connectMcpServer: (serverId: string) => Promise<any>;
  disconnectMcpServer: (serverId: string) => Promise<any>;
  getMcpTools: () => Promise<any>;
  requestPermission: (req: Record<string, unknown>) => Promise<any>;
  executeTool: (toolName: string, args: Record<string, unknown>) => Promise<any>;
  onPermissionRequest: (callback: (req: any) => void) => () => void;
}

let permissionCallback: ((req: any) => void) | null = null;

ipcRenderer.on('permission:request', (_event, req: any) => {
  if (permissionCallback) {
    permissionCallback(req);
  }
});

const bridge: JarvisBridge = {
  sendPrompt: (prompt: string, role?: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CHAT, prompt, role),
  getMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.GET_METRICS),
  getAuditLogs: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUDIT_LOGS),
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  updateConfig: (config: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONFIG, config),
  getWorkflows: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WORKFLOWS),
  saveWorkflow: (workflow: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WORKFLOW, workflow),
  runWorkflow: (workflowId: string) => ipcRenderer.invoke(IPC_CHANNELS.RUN_WORKFLOW, workflowId),
  getMcpServers: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MCP_SERVERS),
  toggleMcpServer: (serverId: string, enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.MCP_SERVER_TOGGLE, serverId, enabled),
  connectMcpServer: (serverId: string) => ipcRenderer.invoke(IPC_CHANNELS.MCP_SERVER_CONNECT, serverId),
  disconnectMcpServer: (serverId: string) => ipcRenderer.invoke(IPC_CHANNELS.MCP_SERVER_DISCONNECT, serverId),
  getMcpTools: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MCP_TOOLS),
  requestPermission: (req: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_REQUEST, req),
  executeTool: (toolName: string, args: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.TOOL_EXECUTE, toolName, args),
  onPermissionRequest: (callback: (req: any) => void) => {
    permissionCallback = callback;
    return () => { permissionCallback = null; };
  }
};

contextBridge.exposeInMainWorld('jarvis', bridge);

export type ElectronWindow = typeof window & {
  jarvis: JarvisBridge;
};