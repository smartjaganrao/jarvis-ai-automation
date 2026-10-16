# JARVIS Automation & Workflow Engine Architecture

## 1. Vision & Core Pipeline

The Workflow Engine is the execution engine of JARVIS. It converts user intents into deterministic or AI-guided workflows with complete audit history and automatic failure recovery.

---

## 2. Component Pipeline

```
  ┌───────────────┐
  │   Triggers    │ (Manual / Schedule / File Change / Email / GitHub Event)
  └───────┬───────┘
          │
  ┌───────▼───────┐
  │  Workflow     │
  │  Definition   │ (JSON / YAML workflow specification with inputs & parameters)
  └───────┬───────┘
          │
  ┌───────▼───────┐
  │  Workflow     │
  │  Executor     │ (Step runner with variable passing & error handling)
  └───────┬───────┘
          │
  ┌───────▼───────┐
  │ Execution     │
  │ Verification  │ (Ensures step output satisfies preconditions/postconditions)
  └───────┬───────┘
          │
  ┌───────▼───────┐
  │ Audit Timeline│ (Per-step status, logs, timing, and recovery state)
  └───────────────┘
```

---

## 3. "Teach JARVIS" Observer & Workflow Recorder

JARVIS allows users to perform manual actions and save them as reusable workflows:

1. **User Activation**: User clicks "Teach JARVIS" or says "JARVIS, remember this workflow".
2. **Action Recorder**: Monitors permitted browser steps (Playwright DOM events) and desktop API commands.
3. **Variable Identification**: Parameterizes hardcoded values (e.g. replacing specific dates/names with `$input_date` or `$recipient`).
4. **Workflow Generation**: Saves recorded sequence as a structured `WorkflowDefinition` stored in SQLite.
5. **Execution**: Workflow can subsequently be triggered on schedule or via voice ("JARVIS, run my weekly report").

---

## 4. Playwright Browser & Desktop Automation Abstraction

- **Browser Automation**: Playwright instance operating in headful or headless mode, utilizing DOM accessibility selectors and semantic fallback before visual clicking.
- **Desktop Automation**: Platform-agnostic `DesktopAutomation` interface implemented via macOS AppleScript/Accessibility APIs and native shell tools.
