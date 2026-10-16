import { AIModelRouter } from '@jarvis/ai-core';
import { ToolRouter } from '@jarvis/tools';
import { AIMessage, ModelRole } from '@jarvis/shared';

export interface AgentRunParams {
  userPrompt: string;
  role?: ModelRole;
  maxSteps?: number;
  conversationHistory?: AIMessage[];
}

export interface AgentRunResult {
  finalResponse: string;
  stepsExecuted: number;
  toolsCalled: string[];
  success: boolean;
}

export class AgentRuntime {
  private static instance: AgentRuntime;

  private constructor() {}

  public static getInstance(): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime();
    }
    return AgentRuntime.instance;
  }

  public async run(params: AgentRunParams): Promise<AgentRunResult> {
    const role = params.role || 'primary';
    const maxSteps = params.maxSteps || 5;
    const modelRouter = AIModelRouter.getInstance();
    const toolRouter = ToolRouter.getInstance();

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are JARVIS — Personal AI Automation Operating System. You plan intents, execute tool actions when relevant, and deliver precise summaries to the user.`
      },
      ...(params.conversationHistory || []),
      { role: 'user', content: params.userPrompt }
    ];

    const toolsCalled: string[] = [];
    let stepsExecuted = 0;

    // Check if prompt implicitly triggers built-in tool execution
    const promptLower = params.userPrompt.toLowerCase();
    if (promptLower.includes('system') || promptLower.includes('specs') || promptLower.includes('memory')) {
      const res = await toolRouter.executeTool('get_system_info', {});
      toolsCalled.push('get_system_info');
      messages.push({
        role: 'assistant',
        content: `[Executed Tool: get_system_info]\nResult: ${JSON.stringify(res.output)}`
      });
      stepsExecuted += 1;
    } else if (promptLower.includes('task') || promptLower.includes('remind')) {
      const res = await toolRouter.executeTool('manage_task', { action: 'list' });
      toolsCalled.push('manage_task');
      messages.push({
        role: 'assistant',
        content: `[Executed Tool: manage_task]\nResult: ${JSON.stringify(res.output)}`
      });
      stepsExecuted += 1;
    } else if (promptLower.includes('email') || promptLower.includes('mail') || promptLower.includes('draft')) {
      const res = await toolRouter.executeTool('send_email_draft', {
        to: 'user@example.com',
        subject: 'JARVIS Briefing',
        body: 'Pending items summary...'
      });
      toolsCalled.push('send_email_draft');
      messages.push({
        role: 'assistant',
        content: `[Executed Tool: send_email_draft]\nResult: ${JSON.stringify(res.output)}`
      });
      stepsExecuted += 1;
    }

    // Call AI Model Router for synthesized output
    const aiResponse = await modelRouter.generateTextForRole(role, { messages });
    stepsExecuted += 1;

    return {
      finalResponse: aiResponse.text,
      stepsExecuted,
      toolsCalled,
      success: true
    };
  }
}
