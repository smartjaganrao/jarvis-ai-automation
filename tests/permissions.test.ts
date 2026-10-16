import { describe, it, expect } from 'vitest';
import { PermissionManager } from '../packages/permissions/src';
import { PermissionLevel } from '../packages/shared/src';

describe('Permission System (3-Tier Security)', () => {
  it('should automatically allow SAFE actions', async () => {
    const manager = PermissionManager.getInstance();
    const result = await manager.checkPermission({
      toolName: 'get_system_info',
      level: PermissionLevel.SAFE,
      description: 'Get platform info',
      arguments: {}
    });

    expect(result.allowed).toBe(true);
  });

  it('should invoke approval handler for APPROVAL_REQUIRED actions', async () => {
    const manager = PermissionManager.getInstance();
    let approvalPrompted = false;

    manager.setApprovalHandler(async (req) => {
      approvalPrompted = true;
      return true; // User clicked approve
    });

    const result = await manager.checkPermission({
      toolName: 'send_email_draft',
      level: PermissionLevel.APPROVAL_REQUIRED,
      description: 'Draft email to user',
      arguments: { to: 'arun@example.com' }
    });

    expect(approvalPrompted).toBe(true);
    expect(result.allowed).toBe(true);
  });
});
