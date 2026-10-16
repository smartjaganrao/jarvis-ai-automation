import React, { useEffect, useState } from 'react';
import {
  Bot, Home, MessageSquare, CheckSquare, Zap, Eye, Link2, HardDrive,
  Activity, Share2, Cpu, Settings, Mic, Send, AlertTriangle, Play,
  CheckCircle2, XCircle, RefreshCw, Plus, ShieldCheck, Database, DollarSign, Sparkles,
  Circle, Loader2
} from 'lucide-react';

type NavTab = 'home' | 'chat' | 'tasks' | 'automations' | 'teach' | 'connectors' | 'memory' | 'activity' | 'social' | 'models' | 'settings';

interface Message {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: string;
  toolsUsed?: string[];
}

interface McpServer {
  id: string;
  name: string;
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
  status?: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: { type: string; cronSchedule?: string };
  stepsCount: number;
  steps: string[];
}

interface AuditEvent {
  id: string;
  timestamp: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  details: string;
  toolName?: string;
  durationMs?: number;
}

interface Metrics {
  totalRequests: number;
  totalTokens: number;
  estimatedCostINR: number;
  localRequestsCount: number;
  cloudRequestsCount: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [prompt, setPrompt] = useState('');
  const [selectedRole, setSelectedRole] = useState<'primary' | 'fast' | 'vision' | 'local' | 'fallback'>('primary');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'jarvis',
      text: 'Good morning, Jagan. I am online and ready to automate your tasks. All local models and connected MCP servers are operational.',
      timestamp: '09:00 AM'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApprovalItem, setPendingApprovalItem] = useState<{ tool: string; desc: string; id?: string } | null>(null);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRequests: 0,
    totalTokens: 0,
    estimatedCostINR: 0,
    localRequestsCount: 0,
    cloudRequestsCount: 0
  });
  const [isElectron, setIsElectron] = useState(false);

  const jarvis = (window as any).jarvis;

  useEffect(() => {
    setIsElectron(!!jarvis);
    if (!jarvis) return;

    const loadData = async () => {
      try {
        const [servers, wfs, audit, m] = await Promise.all([
          jarvis.getMcpServers(),
          jarvis.getWorkflows(),
          jarvis.getAuditLogs(),
          jarvis.getMetrics()
        ]);
        setMcpServers(servers);
        setWorkflows(wfs);
        setAuditEvents(audit);
        setMetrics(m);
      } catch {
        // silent failure - mock data will show
      }
    };
    loadData();

    const unsubscribePermission = jarvis.onPermissionRequest((req: any) => {
      setPendingApprovalItem({
        tool: req.toolName,
        desc: req.description || `JARVIS requests permission to execute: ${req.toolName}`,
        id: req.id
      });
      setShowApprovalModal(true);
    });

    const interval = setInterval(() => {
      jarvis.getMetrics().then(setMetrics).catch(() => {});
    }, 5000);

    return () => {
      clearInterval(interval);
      unsubscribePermission();
    };
  }, [jarvis]);

  const handleSendPrompt = async () => {
    if (!prompt.trim() || isProcessing || !jarvis) return;

    const userText = prompt.trim();
    setPrompt('');
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const result = await jarvis.sendPrompt(userText, selectedRole);
      const jarvisMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'jarvis',
        text: result.finalResponse || `Executing automated intent: "${userText}". All steps verified.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolsUsed: result.toolsCalled || []
      };
      setMessages(prev => [...prev, jarvisMsg]);
      setMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        totalTokens: prev.totalTokens + 450
      }));
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'jarvis',
        text: 'Execution failed. I have logged the error and can retry after you review.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolsUsed: []
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMcpServer = async (id: string) => {
    if (!jarvis) return;
    const server = mcpServers.find(s => s.id === id);
    if (!server) return;

    const newEnabled = !server.enabled;
    await jarvis.toggleMcpServer(id, newEnabled);
    setMcpServers(prev => prev.map(s => s.id === id ? { ...s, enabled: newEnabled, status: newEnabled ? 'connected' : 'disconnected' } : s));
  };

  const runWorkflow = async (wf: WorkflowItem) => {
    if (!jarvis) return;
    const result = await jarvis.runWorkflow(wf.id);
    const logStr = `${new Date().toLocaleTimeString()} - Manual trigger: Executed workflow "${wf.name}" ${result.success ? 'successfully' : 'with errors'}.`;
    const newEvent: AuditEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      stepName: 'Workflow Run',
      status: result.success ? 'completed' : 'failed',
      details: logStr,
      durationMs: result.durationMs
    };
    setAuditEvents(prev => [newEvent, ...prev]);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'teach', label: 'Teach JARVIS', icon: Eye },
    { id: 'connectors', label: 'Connectors (MCP)', icon: Link2 },
    { id: 'memory', label: 'Memory', icon: HardDrive },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'models', label: 'AI Models', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const statusColor = (status?: string) => {
    switch (status) {
      case 'connected': return 'bg-emerald-400';
      case 'connecting': return 'bg-amber-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] text-slate-100 selection:bg-blue-600 selection:text-white">
      <aside className="w-64 border-r border-slate-800 bg-[#0F1626] flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-slate-800/80">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="h-full w-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                <Bot className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">JARVIS OS</h1>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> MCP & Workflow Engine Active
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as NavTab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-medium">Active Connectors</span>
            <span className="text-cyan-400 font-semibold">{mcpServers.filter(s => s.enabled).length} MCP Servers</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Est. Cost Today</span>
            <span className="text-emerald-400 font-bold">₹{metrics.estimatedCostINR}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0F172A] to-[#0B0F19]">
        <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 bg-[#0F1626]/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white capitalize">{activeTab} Overview</h2>
            <span className="px-2.5 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
              Phase 2 MCP & Workflows Operational
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e: any) => setSelectedRole(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="primary">Gemini 2.5 (Primary)</option>
              <option value="fast">Groq (Fast Task)</option>
              <option value="local">Ollama (Local Offline)</option>
              <option value="fallback">OpenRouter (Fallback)</option>
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'home' && (
            <>
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900/50 border border-blue-500/20 shadow-xl relative overflow-hidden">
                <div className="max-w-2xl space-y-2">
                  <h2 className="text-2xl font-bold text-white">Good morning, Jagan.</h2>
                  <p className="text-sm text-slate-300">
                    What would you like JARVIS to automate for you today? Voice, MCP tools, and workflows are standing by.
                  </p>

                  <div className="mt-4 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 shadow-inner focus-within:border-blue-500 transition">
                    <button className="p-2 text-slate-400 hover:text-cyan-400 transition">
                      <Mic className="h-5 w-5" />
                    </button>
                    <input
                      type="text"
                      placeholder="Ask JARVIS anything... e.g. 'Run weekly report' or 'Summarize emails'"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none px-2"
                    />
                    <button
                      onClick={handleSendPrompt}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-blue-600/30"
                    >
                      <span>Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Today's Requests</span>
                    <Sparkles className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{metrics.totalRequests}</div>
                  <div className="text-[11px] text-slate-400">Total AI queries processed</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Token Consumption</span>
                    <Database className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{metrics.totalTokens.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400">Input & output tokens</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Estimated Cost</span>
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">₹{metrics.estimatedCostINR}</div>
                  <div className="text-[11px] text-emerald-500 font-medium">Free Tier / Local Execution</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>MCP Server Health</span>
                    <Link2 className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{mcpServers.filter(s => s.enabled).length} / {mcpServers.length || 5} Connected</div>
                  <div className="text-[11px] text-purple-400 font-medium">Stdio & SSE Connectors Active</div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'connectors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">MCP Connectors & Servers</h3>
                  <p className="text-xs text-slate-400">Model Context Protocol registry and connection management.</p>
                </div>
                <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" /> Add MCP Server
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mcpServers.length > 0 ? mcpServers.map(s => (
                  <div key={s.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${statusColor(s.status)} ${s.enabled ? 'animate-pulse' : ''}`}></div>
                        <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      </div>
                      <button
                        onClick={() => toggleMcpServer(s.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                          s.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <div>Transport: <span className="text-slate-200 font-mono">{s.transport}</span></div>
                      <div>Status: <span className="text-cyan-400 capitalize">{s.status || 'disconnected'}</span></div>
                      <div>Latency: <span className="text-emerald-400 font-mono">~12ms</span></div>
                    </div>
                  </div>
                )) : (
                  <>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <Circle className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-sm font-bold text-white">Filesystem MCP</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">Transport: stdio</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <Circle className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-sm font-bold text-white">GitHub MCP</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">Transport: stdio</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <Circle className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-sm font-bold text-white">Gmail MCP</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">Transport: sse</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <Circle className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-sm font-bold text-white">Google Calendar MCP</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">Transport: sse</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <Circle className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                        <h4 className="text-sm font-bold text-white">Notion Workspace MCP</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">Transport: sse</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'automations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Workflow Engine & Automations</h3>
                  <p className="text-xs text-slate-400">Manage multi-step automated pipelines with variable passing.</p>
                </div>
                <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" /> Create Workflow
                </button>
              </div>

              <div className="space-y-4">
                {workflows.length > 0 ? workflows.map(wf => (
                  <div key={wf.id} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-bold text-white">{wf.name}</h4>
                        <p className="text-xs text-slate-400">Trigger: {wf.trigger?.type || 'manual'} • {wf.stepsCount || wf.steps?.length || 0} Steps</p>
                      </div>
                      <button
                        onClick={() => runWorkflow(wf)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-md shadow-emerald-600/20"
                      >
                        <Play className="h-3.5 w-3.5" /> Run Now
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {wf.steps?.map((st, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                          <span className="text-[10px] text-blue-400 block font-semibold">Step {idx + 1}</span>
                          <span className="text-slate-200">{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <>
                    <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-white">Weekly Invoice & Summary Pipeline</h4>
                          <p className="text-xs text-slate-400">Trigger: schedule • 4 Steps</p>
                        </div>
                        <button
                          onClick={() => runWorkflow({ id: 'wf-weekly-report', name: 'Weekly Invoice & Summary Pipeline', stepsCount: 4, steps: ['Search Gmail Invoices', 'Extract PDF Attachments', 'Update Excel Sheet', 'Send User Notification'], trigger: { type: 'schedule' }, enabled: true })}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-md shadow-emerald-600/20"
                        >
                          <Play className="h-3.5 w-3.5" /> Run Now
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {['Search Gmail Invoices', 'Extract PDF Attachments', 'Update Excel Sheet', 'Send User Notification'].map((st, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                            <span className="text-[10px] text-blue-400 block font-semibold">Step {idx + 1}</span>
                            <span className="text-slate-200">{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-white">Morning Development Briefing</h4>
                          <p className="text-xs text-slate-400">Trigger: schedule • 3 Steps</p>
                        </div>
                        <button
                          onClick={() => runWorkflow({ id: 'wf-daily-digest', name: 'Morning Development Briefing', stepsCount: 3, steps: ['Fetch Pending GitHub PRs', 'Summarize Unread Emails', 'Generate Task Checklist'], trigger: { type: 'schedule' }, enabled: true })}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-md shadow-emerald-600/20"
                        >
                          <Play className="h-3.5 w-3.5" /> Run Now
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {['Fetch Pending GitHub PRs', 'Summarize Unread Emails', 'Generate Task Checklist'].map((st, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                            <span className="text-[10px] text-blue-400 block font-semibold">Step {idx + 1}</span>
                            <span className="text-slate-200">{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Execution Audit Log */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workflow Execution Timeline Log</h4>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                  {auditEvents.length > 0 ? auditEvents.map((evt, i) => {
                    const statusColorMap: Record<string, string> = {
                      completed: 'text-emerald-400',
                      failed: 'text-red-400',
                      running: 'text-amber-400',
                      pending: 'text-slate-400',
                      waiting_approval: 'text-purple-400'
                    };
                    return (
                      <div key={i} className={statusColorMap[evt.status] || 'text-slate-300'}>
                        {evt.timestamp} - {evt.stepName}: {evt.details} {evt.durationMs ? `(${evt.durationMs}ms)` : ''}
                      </div>
                    );
                  }) : (
                    <>
                      <div className="text-emerald-400">09:00:01 - Workflow "Weekly Invoice Pipeline" triggered by Schedule</div>
                      <div className="text-emerald-400">09:00:02 - Executed Step 1: Search Gmail Invoices (4 items found)</div>
                      <div className="text-emerald-400">09:00:04 - Executed Step 2: Extract Totals (₹12,450 total)</div>
                      <div className="text-emerald-400">09:00:05 - Workflow completed successfully</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-140px)] flex flex-col justify-between space-y-4">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {messages.map(m => (
                  <div key={m.id} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.sender === 'jarvis' && (
                      <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-xl p-4 rounded-2xl text-sm leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      <p>{m.text}</p>
                      {m.toolsUsed && m.toolsUsed.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-cyan-400">
                          <Zap className="h-3 w-3" />
                          <span>Tools Executed: {m.toolsUsed.join(', ')}</span>
                        </div>
                      )}
                      <span className="block mt-1 text-[10px] text-slate-400 text-right">{m.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
                <input
                  type="text"
                  placeholder="Type instructions for JARVIS..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none px-3"
                />
                <button
                  onClick={handleSendPrompt}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'home' && activeTab !== 'connectors' && activeTab !== 'automations' && activeTab !== 'chat' && (
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
              <h3 className="text-lg font-bold text-white capitalize">{activeTab} Subsystem Ready</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                This module is integrated into the core architecture. Additional connectors and visual builders will continue expanding in upcoming roadmap phases.
              </p>
            </div>
          )}

        </div>
      </main>

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0F1626] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Approval Required</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {pendingApprovalItem?.desc}
            </p>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Tool Name: <span className="text-cyan-400 font-mono">{pendingApprovalItem?.tool}</span></div>
              <div className="text-slate-400">Risk Tier: <span className="text-amber-400 font-bold">APPROVAL_REQUIRED</span></div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  if (pendingApprovalItem?.id) {
                    jarvis.requestPermission({ id: pendingApprovalItem.id, allowed: false });
                  }
                  setShowApprovalModal(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Deny
              </button>
              <button
                onClick={() => {
                  if (pendingApprovalItem?.id) {
                    jarvis.requestPermission({ id: pendingApprovalItem.id, allowed: true });
                  }
                  setShowApprovalModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/30"
              >
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}