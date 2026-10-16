import { describe, it, expect } from 'vitest';
import { ToolRouter } from '../packages/tools/src';

describe('ToolRouter Execution & Timeline Audit', () => {
  it('should discover built-in tools', () => {
    const router = ToolRouter.getInstance();
    const defs = router.getToolDefinitions();
    expect(defs.length).toBeGreaterThan(0);
    expect(defs.some(d => d.name === 'get_system_info')).toBe(true);
  });

  it('should execute tool and log timeline event', async () => {
    const router = ToolRouter.getInstance();
    const result = await router.executeTool('get_system_info', {});

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();

    const audit = router.getAuditTimeline();
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[audit.length - 1].toolName).toBe('get_system_info');
  });
});
