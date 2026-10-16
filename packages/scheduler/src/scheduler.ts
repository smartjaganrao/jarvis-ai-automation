import { WorkflowEngine } from '@jarvis/workflow';

export interface ScheduledTask {
  id: string;
  name: string;
  workflowId: string;
  cronPattern?: string;
  intervalMs?: number;
  nextRun?: string;
  enabled: boolean;
}

export class TaskScheduler {
  private static instance: TaskScheduler;
  private tasks: Map<string, ScheduledTask> = new Map();

  private constructor() {
    this.scheduleTask({
      id: 'task-weekly-report',
      name: 'Weekly Invoice Scanner & Summary',
      workflowId: 'wf-weekly-report',
      cronPattern: '0 9 * * 1',
      nextRun: new Date(Date.now() + 86400000).toISOString(),
      enabled: true
    });
  }

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  public scheduleTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
  }

  public getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  public async triggerScheduledTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || !task.enabled) return;

    await WorkflowEngine.getInstance().runWorkflow(task.workflowId);
  }
}
