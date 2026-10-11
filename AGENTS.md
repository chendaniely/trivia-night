# Agent protocol — trivia-night

Process rules for any agent working in this repo. Project facts live in the
design doc, not here.

- Design: `docs/superpowers/specs/2026-10-10-trivia-night-design.md`
- Plan: `docs/superpowers/plans/` — checkboxes are the progress record

Why this protocol: the working model is small and its context compacts
mid-task. Commits + plan checkboxes are the memory of record.

## Commit protocol — every step

- Conventional Commits: https://www.conventionalcommits.org/en/v1.0.0/
  — write type and scope: `type(scope): description`.
- AI-generated commits start the description with 🤖:
  `feat(board): 🤖 add board screen`
- Detect the model you are running as from your session context and add a
  Co-Authored-By line. Example for qwen3.8-27b:
  `Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>`
- Commit after every plan step, including the plan-file checkbox update.
- Resumption rule: after a compaction, `git log` + the plan must tell you
  exactly where you left off. Write commit messages to that standard.

## Council review — after each step, before the next

Dispatch a council of review subagents, two passes:

1. Backward pass: compare what was built against the plan. Mismatch →
   modify the plan so code and plan agree.
2. Forward pass: check the current implementation for downstream risk in
   later plan steps. Catch drift early.

UI steps additionally verify in a real browser with Playwright before the
step counts as done:

- CLI: https://playwright.dev/docs/getting-started-cli
- MCP: https://playwright.dev/docs/getting-started-mcp
