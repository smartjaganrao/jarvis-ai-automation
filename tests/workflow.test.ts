import { describe, it, expect } from 'vitest';
import { WorkflowEngine } from '../packages/workflow/src';
import { TaskScheduler } from '../packages/scheduler/src';

describe('Workflow Engine & Background Task Scheduler', () => {
  it('should list registered workflows', () => {
    const engine = WorkflowEngine.getInstance();
    const wfs = engine.getAllWorkflows();
    expect(wfs.length).toBeGreaterThan(0);
    expect(wfs[0].id).toBe('wf-weekly-report');
  });

  it('should execute multi-step workflow with variable substitution', async () => {
    const engine = WorkflowEngine.getInstance();
    const result = await engine.runWorkflow('wf-weekly-report');

    expect(result.success).toBe(true);
    expect(result.stepsCompleted).toBe(2);
    expect(result.outputs).toBeDefined();

    const history = engine.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  it('should trigger workflow execution via TaskScheduler', async () => {
    const scheduler = TaskScheduler.getInstance();
    const tasks = scheduler.getTasks();
    expect(tasks.length).toBeGreaterThan(0);

    await scheduler.triggerScheduledTask('task-weekly-report');
    const history = WorkflowEngine.getInstance().getHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
  });
});
