import { PermissionLevel, PermissionCheckRequest, PermissionCheckResult } from '@jarvis/shared';

export type ApprovalHandler = (req: PermissionCheckRequest) => Promise<boolean>;

export class PermissionManager {
  private static instance: PermissionManager;
  private approvalHandler?: ApprovalHandler;
  private autoApprovedTools: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  public setApprovalHandler(handler: ApprovalHandler): void {
    this.approvalHandler = handler;
  }

  public addAutoApprovedTool(toolName: string): void {
    this.autoApprovedTools.add(toolName);
  }

  public async checkPermission(req: PermissionCheckRequest): Promise<PermissionCheckResult> {
    // 1. SAFE Actions are always automatically allowed
    if (req.level === PermissionLevel.SAFE || this.autoApprovedTools.has(req.toolName)) {
      return { allowed: true };
    }

    // 2. APPROVAL REQUIRED & HIGH RISK require user confirmation
    if (!this.approvalHandler) {
      // Default fallback if no handler attached: block HIGH_RISK, allow auto-approval simulation in test environments
      if (req.level === PermissionLevel.HIGH_RISK) {
        return { allowed: false, reason: 'HIGH_RISK action rejected: No approval handler configured.' };
      }
      return { allowed: true, userApproved: true };
    }

    const approved = await this.approvalHandler(req);
    return {
      allowed: approved,
      userApproved: approved,
      reason: approved ? 'Approved by user' : 'User declined permission request'
    };
  }
}
