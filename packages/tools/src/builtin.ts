import { PermissionLevel, ToolDefinition, ToolExecutionResult } from '@jarvis/shared';

export interface ExecutableTool {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<ToolExecutionResult>;
}

export const BUILTIN_TOOLS: Record<string, ExecutableTool> = {
  get_system_info: {
    definition: {
      name: 'get_system_info',
      description: 'Get local operating system details, memory status, and runtime environment.',
      permissionLevel: PermissionLevel.SAFE,
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    execute: async () => {
      const start = Date.now();
      return {
        toolName: 'get_system_info',
        success: true,
        output: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptimeSeconds: process.uptime(),
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        executionTimeMs: Date.now() - start
      };
    }
  },

  manage_task: {
    definition: {
      name: 'manage_task',
      description: 'Create or summarize personal pending tasks and reminders.',
      permissionLevel: PermissionLevel.SAFE,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'Action to take: add, list, or complete', enum: ['add', 'list', 'complete'] },
          title: { type: 'string', description: 'Title of the task' }
        },
        required: ['action']
      }
    },
    execute: async (args) => {
      const start = Date.now();
      const action = String(args.action || 'list');
      const title = String(args.title || 'Sample task');

      return {
        toolName: 'manage_task',
        success: true,
        output: {
          action,
          title,
          status: 'success',
          message: action === 'add' ? `Task "${title}" created successfully.` : 'Active tasks: 4 pending, 1 completed.'
        },
        executionTimeMs: Date.now() - start
      };
    }
  },

  read_file: {
    definition: {
      name: 'read_file',
      description: 'Read content from a specified workspace file.',
      permissionLevel: PermissionLevel.SAFE,
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Absolute or relative path of file to read' }
        },
        required: ['filePath']
      }
    },
    execute: async (args) => {
      const start = Date.now();
      const filePath = String(args.filePath || '');
      return {
        toolName: 'read_file',
        success: true,
        output: {
          filePath,
          content: `[File Content from ${filePath}]: JARVIS OS configuration loaded.`
        },
        executionTimeMs: Date.now() - start
      };
    }
  },

  send_email_draft: {
    definition: {
      name: 'send_email_draft',
      description: 'Draft and queue an email message for approval.',
      permissionLevel: PermissionLevel.APPROVAL_REQUIRED,
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body text' }
        },
        required: ['to', 'subject', 'body']
      }
    },
    execute: async (args) => {
      const start = Date.now();
      return {
        toolName: 'send_email_draft',
        success: true,
        output: {
          to: args.to,
          subject: args.subject,
          status: 'drafted_and_queued',
          message: `Email draft to ${args.to} ready for final sending.`
        },
        executionTimeMs: Date.now() - start
      };
    }
  }
};
