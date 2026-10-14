# 1. Setup and method

## The question

Can a mid-size local model running on a desktop AI box carry a small but
real software project from a vague idea to something you would actually
use in front of friends? The test project: a single-device trivia-night
host app (Jeopardy-style board, two game modes, team scoring, a YAML
question bank, audio and image questions, a local-folder mode, GitHub
Pages deploy) for a game night on **Sunday, Nov 8 2026**.

The local model built it from **Oct 10 to Oct 14 2026**. Then Claude Code
(Claude Opus 5.5, with Sonnet 5.5 and Haiku 5.5 subagents) reviewed the
result and fixed what it found. This folder is the record of both halves,
written by Claude Opus 5.5 at the partner's request — including
Claude's own opinion of the local model's work.

## Hardware and model

| | |
|---|---|
| Machine | NVIDIA DGX Spark running the model; the harness ran on the partner's Mac and talked to it through an OpenAI-compatible endpoint on `localhost:9100` |
| Model | `qwen3.8-27b`, reasoning variant `high` |
| Context, configured | 262,144 tokens |
| Context, actually served | **163,840 tokens** — the server truncated at this limit, not the configured one (15 `finish=length` events at 162–164k) |
| Output speed | median **~19 tokens/s** in the build session (the partner's status bar showed 14.2 tok/s early on) |
| Input modality | **text only** — this mattered a lot (see the timeline, Oct 11 evening) |
| Cost | $0 marginal; ~22.3M fresh prompt tokens + 65.6M cached prompt tokens + 1.14M output tokens over the build |

## Harness: opencode

The model was driven through **opencode** (the v2 architecture: Code Mode,
a `subagent` tool, `shell`, `edit`, `read`). Project-level config
registered one MCP server: **Playwright MCP** (`npx @playwright/mcp`) for
browser checks. In practice the Playwright tools were only reachable
through Code Mode (`execute` → `tools.playwright.*`), which cost 38 soft
errors over the build (wrong `search()` signature, un-awaited promises,
`setTimeout` missing in the sandbox, a guessed tool name).

## Plugins, skills and always-on instructions

Installed in the opencode setup session the night before (Oct 9–10), at
the partner's request:

| What | Source | How it reaches the model |
|---|---|---|
| **superpowers** | obra/superpowers | plugin; registers 15 workflow skills and injects a bootstrap ("if a skill applies you MUST use it") every session |
| **ponytail** | DietrichGebert/ponytail | plugin; injects a "lazy senior dev" ruleset every turn (smallest complete change, no unrequested abstractions, end with what was skipped) |
| **caveman** | JuliusBrussee/caveman | global `~/.config/opencode/AGENTS.md` ruleset (terse replies) + `/caveman` command + `cavecrew-*` subagents; the plugin file itself never appears in the plugin-load log |
| graphify | Graphify-Labs/graphify | plugin; inert here (only acts when a graph exists) |
| i-have-adhd | ayghri/i-have-adhd | skill + command; not enabled |
| status-bar plugins | orca bridge, opencode-status-line, a custom `session-stats` footer | observability only |
| Skill repos | Karpathy guidelines, Matt Pocock skills, Anthropic skills, Posit skills, Addy Osmani agent-skills | listed as skill paths — **but the Addy path in the config points at `agent-skills/skills` while the clone is `addy-agent-skills/`, so those skills never loaded** |

Net effect: the model saw **118 skill ids** and called the skill tool
**9 times** in three days. Chapter 5 covers what actually changed its
behaviour.

## The partner's process rules (repo `AGENTS.md`)

The partner wrote the working protocol up front, explicitly sized for a
small model ("you are a smaller model with a smaller context window. so
for each step i want you to commit along the way"):

- Conventional Commits `type(scope): 🤖 description`, and a
  `Co-Authored-By` line naming the model that actually wrote the commit.
  Qwen's commits say `Qwen 3.8 27B <qwen-coder@alibabacloud.com>`; the
  Claude pass says `Claude Opus 5.5` / `Sonnet 5.5` / `Haiku 5.5`. That is
  what makes the per-model statistics in this folder possible.
- Commit after every plan step; the plan's checkboxes are the memory of
  record ("the working model is small and its context compacts mid-task").
- After every step, a **council** of review subagents: a backward pass
  (built vs plan) and a forward pass (downstream risk).
- UI steps verified in a real browser with Playwright.
- Later added: keep `README.md` and the in-app About screen in sync with
  behaviour.

## How this case study was produced

Claude Code ran, on Oct 14:

1. A four-seat review council over the finished Qwen build (backward pass
   vs plan, JavaScript bug hunt, question-bank fact-check with web search,
   event/TV-readiness), plus its own Chrome runs: the File System Access
   flow through a real `FileSystemDirectoryHandle` behind a stubbed
   picker, fresh 1280×720 and 1920×1080 screenshots, viewport-fit
   measurements.
2. Ten fix tasks (14–23 in the plan) executed with subagent-driven
   development: one implementer per task, then a backward and a forward
   reviewer, fix rounds until clean.
3. Read-only research for this write-up: every commit (`git log`), the
   plan's own history, the opencode session database (the partner's
   prompts, tool calls, errors, compactions — with credentials redacted),
   the opencode config (secrets redacted), and screenshots of the app at
   14 historical commits served from `git archive` exports.

Times are US Pacific (the machine's clock; commit timestamps are -0700).
