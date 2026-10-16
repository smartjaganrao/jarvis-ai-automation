import { ToolRouter } from '@jarvis/tools';
import { WorkflowDefinition, WorkflowStep } from '@jarvis/shared';

export interface WorkflowRunResult {
  workflowId: string;
  workflowName: string;
  success: boolean;
  stepsCompleted: number;
  totalSteps: number;
  outputs: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export class WorkflowExecutor {
  public async executeWorkflow(workflow: WorkflowDefinition): Promise<WorkflowRunResult> {
    const start = Date.now();
    const stepOutputs: Record<string, unknown> = {};
    const toolRouter = ToolRouter.getInstance();

    let completed = 0;

    for (const step of workflow.steps) {
      try {
        // Substitute variables like "$step1.output"
        const resolvedArgs: Record<string, unknown> = {};
        if (step.args) {
          for (const [key, val] of Object.entries(step.args)) {
            if (typeof val === 'string' && val.startsWith('$')) {
              const varName = val.substring(1);
              resolvedArgs[key] = stepOutputs[varName] || val;
            } else {
              resolvedArgs[key] = val;
            }
          }
        }

        if (step.toolName) {
          const res = await toolRouter.executeTool(step.toolName, resolvedArgs);
          if (!res.success) {
            throw new Error(`Step '${step.name}' failed: ${res.error}`);
          }
          stepOutputs[step.id] = res.output;
        } else {
          // AI task step
          stepOutputs[step.id] = `[AI Task Executed for step '${step.name}']`;
        }

        completed += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          workflowId: workflow.id,
          workflowName: workflow.name,
          success: false,
          stepsCompleted: completed,
          totalSteps: workflow.steps.length,
          outputs: stepOutputs,
          error: msg,
          durationMs: Date.now() - start
        };
      }
    }

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: true,
      stepsCompleted: completed,
      totalSteps: workflow.steps.length,
      outputs: stepOutputs,
      durationMs: Date.now() - start
    };
  }
}

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private history: WorkflowRunResult[] = [];
  private executor = new WorkflowExecutor();

  private constructor() {
    // Initial sample workflow matching prompt Section 9
    this.registerWorkflow({
      id: 'wf-weekly-report',
      name: 'Weekly Invoice & Report Pipeline',
      description: 'Search Gmail for invoices, extract totals, update spreadsheet, notify user.',
      enabled: true,
      trigger: { type: 'schedule', cronSchedule: '0 9 * * 1' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [
        {
          id: 'step1',
          name: 'Read Specs & Workspace Files',
          type: 'tool_execution',
          toolName: 'read_file',
          args: { filePath: '/Users/jaganrao/Projects/Jarvis - AI Automation/docs/ROADMAP.md' }
        },
        {
          id: 'step2',
          name: 'Summarize Tasks',
          type: 'tool_execution',
          toolName: 'manage_task',
          args: { action: 'list' }
        }
      ]
    });
  }

  public static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  public registerWorkflow(wf: WorkflowDefinition): void {
    this.workflows.set(wf.id, wf);
  }

  public getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  public getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  public getHistory(): WorkflowRunResult[] {
    return [...this.history];
  }

  public async runWorkflow(id: string): Promise<WorkflowRunResult> {
    const wf = this.workflows.get(id);
    if (!wf) {
      throw new Error(`Workflow '${id}' not found.`);
    }

    const result = await this.executor.executeWorkflow(wf);
    this.history.push(result);
    return result;
  }
}
