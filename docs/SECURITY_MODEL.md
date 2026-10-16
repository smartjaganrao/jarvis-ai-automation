# JARVIS Security Model & Permission System

## 1. Security Philosophy

JARVIS operates under the principle of **Least Privilege**, **Explicit Consent**, and **Zero Unverifiable Executions**. AI models produce intent; security policies enforce allowed boundaries.

---

## 2. Three-Tier Permission Classification

| Permission Level | Actions Included | User Approval Behavior |
| :--- | :--- | :--- |
| **SAFE** | Read local files, search, read calendar, view GitHub issues, analyze documents, format text. | **Auto-Allowed** (silent execution & logging). |
| **APPROVAL REQUIRED** | Send emails, publish social posts, write/modify local files, create GitHub PRs, modify calendar entries, upload files. | **Requires User Confirmation** via UI Dialog. |
| **HIGH RISK** | Financial transactions, delete files, account credential changes, password modifications, raw terminal system commands (`rm -rf`, `sudo`). | **Always Require Explicit Re-Authentication / Modal Approval**. |

---

## 3. Secret Vault & Key Storage

- API Keys (Gemini, Groq, OpenRouter, GitHub OAuth tokens) are stored in the **OS Credential Manager** (`keytar` / native OS keychains).
- Credentials are NEVER injected into AI system prompts unless explicitly required for authenticated request headers.
- Logs and telemetry scrub sensitive tokens, passwords, and authorization headers prior to writing to SQLite or visual timelines.

---

## 4. Command Security Inspector

Before executing any shell/desktop command, the `CommandSecuritySanitizer` runs regex and semantic checks against dangerous operations:
- Prevents recursive directory deletions (`rm -rf /`)
- Prevents root privilege elevation (`sudo`, `su`)
- Blocks access to system core folders (`/System`, `/boot`, `/etc/shadow`)
