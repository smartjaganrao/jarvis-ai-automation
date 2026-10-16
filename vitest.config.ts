import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true
  },
  resolve: {
    alias: {
      '@jarvis/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@jarvis/ai-core': path.resolve(__dirname, 'packages/ai-core/src'),
      '@jarvis/ai-providers': path.resolve(__dirname, 'packages/ai-providers/src'),
      '@jarvis/memory': path.resolve(__dirname, 'packages/memory/src'),
      '@jarvis/permissions': path.resolve(__dirname, 'packages/permissions/src'),
      '@jarvis/mcp': path.resolve(__dirname, 'packages/mcp/src'),
      '@jarvis/tools': path.resolve(__dirname, 'packages/tools/src'),
      '@jarvis/agent-runtime': path.resolve(__dirname, 'packages/agent-runtime/src'),
      '@jarvis/workflow': path.resolve(__dirname, 'packages/workflow/src'),
      '@jarvis/scheduler': path.resolve(__dirname, 'packages/scheduler/src')
    }
  }
});
