# opencode environment (as observed for the trivia-night build, Oct 10-14 2026)

Sources: `~/.config/opencode/` (config, plugins, agents, commands, skills, skills-repos, vendor), `~/.cache/opencode/npm/` (plugin packages), project `opencode.json`, and the skill/instruction notices that opencode itself recorded in the session database. Secret-bearing files (the opencode service/cli/ownership json files, auth store, shell secrets) were NOT read; config was printed through a redacting node script (apiKey value replaced). Caveat: `opencode.json` mtime is Oct 14 10:14 (after the build ended); `opencode.json.bak` (Oct 14 09:53) is identical after redaction, so the plugin/skills/provider lists below are believed unchanged, but `opencode.jsonc` was last touched Oct 10 01:27.

## 1. Harness and model

- Harness: opencode (the "v2" architecture: `session_v2` tables, Code Mode, `subagent` tool, `shell` tool, no `todowrite`). `@opencode-ai/plugin` 1.17.10 in the config package.json; plugins mention OpenCode 1.18.29+/2.0.4+.
- Provider `spark` (`@ai-sdk/openai-compatible`), baseURL `http://127.0.0.1:9100/v1` (a local OpenAI-compatible server in front of the DGX Spark; apiKey present, value redacted). Models declared: `gemma-4-26b-a4b` and `qwen3.8-27b`, each `limit.context: 262144`, `limit.output: 32768`.
- The whole trivia-night build used `spark/qwen3.8-27b`, variant `high` (a reasoning/thinking setting). Session S1 started on `gemma-4-26b-a4b` and was switched to qwen3.8-27b at 2026-10-09 23:36.
- Observed real context cap: the server rejected/truncated at **163,840 tokens** (log: `request (163860 tokens) exceeds the available context size (163840 tokens)`), not the 262,144 declared in config. All 15 `finish=length` events in the sessions occur at ~162.4k-163.8k prompt tokens.
- A second, older provider `ollama` ("Ollama (DGX)", localhost:11434, 17 models incl. qwen3-coder:30b, devstral-small-2, gemma4:26b/31b, qwen3.5:122b, qwen3.6:27b/35b) lives in `opencode.jsonc`; not used for this project.
- Agent for the main sessions: `build` (default). Subagents: `general` (built-in) and `cavecrew-reviewer` / `cavecrew-builder` (custom, from the caveman install).

## 2. Redacted config

### ~/.config/opencode/opencode.json

```json
{
  "plugins": [
    "superpowers@git+https://github.com/obra/superpowers.git",
    "@dietrichgebert/ponytail"
  ],
  "skills": [
    "~/.config/opencode/skills-repos/andrej-karpathy-skills/skills",
    "~/.config/opencode/skills-repos/posit-skills",
    "~/.config/opencode/skills-repos/anthropic-skills/skills",
    "~/.config/opencode/skills-repos/mattpocock-skills/skills/engineering",
    "~/.config/opencode/skills-repos/mattpocock-skills/skills/productivity",
    "~/.config/opencode/skills-repos/mattpocock-skills/skills/misc",
    "~/.config/opencode/skills-repos/agent-skills/skills"
  ],
  "provider": {
    "spark": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Spark",
      "options": {
        "apiKey": "[REDACTED]",
        "baseURL": "http://127.0.0.1:9100/v1"
      },
      "models": {
        "gemma-4-26b-a4b": {
          "name": "gemma-4-26b-a4b",
          "limit": {
            "context": 262144,
            "output": 32768
          }
        },
        "qwen3.8-27b": {
          "name": "qwen3.8-27b",
          "limit": {
            "context": 262144,
            "output": 32768
          }
        }
      }
    }
  }
}
```

Config oddities (facts, not judgments): (a) the key is `plugins` (the opencode v2 form per the superpowers INSTALL.md); (b) the `skills` list includes `skills-repos/agent-skills/skills`, but the directory on disk is `skills-repos/addy-agent-skills` -- so the addy (addyosmani/agent-skills) skills were **not** loaded (only a `test-driven-development` id appears, and that is the superpowers one); (c) no `permission`, `mcp`, `agent` or `model` keys in the global file.

### ~/.config/opencode/opencode.jsonc

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (DGX)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "Qwen3-Coder-Next:latest": {
          "name": "Qwen3 Coder Next"
        },
        "devstral-small-2:latest": {
          "name": "Devstral Small 2"
        },
        "gemma2:2b": {
          "name": "Gemma2 2B"
        },
        "gemma4:26b": {
          "name": "Gemma4 26B"
        },
        "gemma4:31b": {
          "name": "Gemma4 31B"
        },
        "gemma4:latest": {
          "name": "Gemma4"
        },
        "glm-4.7:cloud": {
          "name": "Glm 4 7 CLOUD"
        },
        "llama3.1:latest": {
          "name": "Llama3 1"
        },
        "llama3.2:1b": {
          "name": "Llama3 2 1B"
        },
        "llama3.2:latest": {
          "name": "Llama3 2"
        },
        "mistral:latest": {
          "name": "Mistral"
        },
        "qwen2.5:latest": {
          "name": "Qwen2 5"
        },
        "qwen3-coder:30b": {
          "name": "Qwen3 Coder 30B"
        },
        "qwen3.5:122b": {
          "name": "Qwen3 5 122B"
        },
        "qwen3.6:27b": {
          "name": "Qwen3 6 27B"
        },
        "qwen3.6:35b": {
          "name": "Qwen3 6 35B"
        },
        "qwen3:8b": {
          "name": "Qwen3 8B"
        }
      }
    }
  },
  "plugin": [
    "./plugins/caveman"
  ]
}
```

The jsonc is the older v1-style file (`plugin: ["./plugins/caveman"]`). The opencode log (Oct 13 21:48Z onward only) never shows `plugins/caveman` among "loading plugin" lines, so the caveman **plugin hooks** (chat.message parsing, per-turn system reinforcement) were most likely inactive; the caveman effect came through global AGENTS.md (always loaded), the `/caveman` command template, the caveman skills and the cavecrew subagents. (Cannot be proven for Oct 10-12: those log lines are rotated away.)

### Project: ~/git/hub/trivia-night/opencode.json

```json
{
  "mcp": {
    "servers": {
      "playwright": {
        "type": "local",
        "command": [
          "npx",
          "@playwright/mcp"
        ]
      }
    }
  }
}
```

Playwright MCP: `npx @playwright/mcp` (local). Log shows `mcp connected server=playwright` x28 and one `mcp transport error ... process exited with code 0` (Oct 14 07:29Z). In the sessions its tools were only reachable through Code Mode (`execute` -> `tools.playwright.browser_*`, discovered via `search({query})`). No other MCP servers were configured (no context7, no youtrack in opencode). The model installed the browser itself (`npx playwright install chromium`, Oct 10 22:56).

## 3. Global instructions: ~/.config/opencode/AGENTS.md (loaded as "Instructions" every session)

```
<!-- caveman-begin -->
Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Answer first: Answer, then reason, then next step.
- Kill ceremony: No greeting, hedging, pleasantries, recap, or closer.
- Short word: "fix" not "implement a solution for".
- Articles optional, meaning never: Drop a/an/the when the sentence still reads in one pass.
- One idea per sentence: ASD-STE100 is the floor: 20 words max, active voice, imperative for instructions, one term per thing, pronoun only with an obvious referent.
- Payload verbatim: Code blocks unchanged.
- Tool runs: bounded status: No text between routine calls.
- User's language: Compress the style, not the language.
- Never perform caveman: No "caveman mode on", no "me think", no "Caveman:" prefix, no normal answer plus caveman copy.

Switch: /caveman (default), /ultracave (fragments, each fact once), /megacave (Classical Chinese 文言文)
Stop: "stop caveman" or "normal mode"

Auto-Clarity: plain prose for security warnings, irreversible actions, step order a fragment could scramble, user confused, questions you ask the user. Resume after.

Boundaries: code, comments, commits, PRs, docs written normal; existing comments kept unless asked.
Floor: code, commands, paths, numbers and error strings verbatim; never drop not/never/no/only.
<!-- caveman-end -->
```

This is the always-on "caveman" ruleset (JuliusBrussee/caveman, installed Oct 10 00:05 via its opencode installer). The repo AGENTS.md (commit protocol, council, README sync) was loaded as a second instruction source from Oct 10 22:40 and its later edits were pushed as diffs (system notices Oct 11 01:52, Oct 12 20:59 and 21:19).

## 4. Plugins (what each hooks)

| plugin | how loaded | what it does | evidence it was active |
|---|---|---|---|
| superpowers (obra/superpowers, git) | opencode.json `plugins` | Registers its 15 skills natively and injects the `using-superpowers` bootstrap wrapped in `<EXTREMELY_IMPORTANT>` plus an OpenCode tool-mapping table (subagent, shell, skill, patch...) into session context. Installed Oct 9 23:38. | Skills listed in system notice 23:39; log loads it every start; model reasoning cites it 63x |
| @dietrichgebert/ponytail 5.1.0 | opencode.json `plugins` | "Lazy senior dev" mode: `experimental.chat.system.transform` injects the ponytail ruleset every turn at level `full` (default; no `.ponytail-active` flag file present) -- smallest complete change, no unrequested abstractions, end reply with what was skipped / risk; registers `/ponytail*` commands and 6 skills (ponytail, -audit, -debt, -gain, -help, -review). Installed Oct 10 ~00:16. | Skills listed 00:18; reasoning cites "ponytail" 111x (e.g. "Judgment (ponytail): ... Cheap, prevents real data corruption"); replies end with "Skipped:/Unchecked:/Risk:" lines (15 of 124 long replies) |
| caveman plugin (`plugins/caveman/plugin.js`) | referenced only from opencode.jsonc `plugin` | Would: write a mode flag at session.created, parse `/caveman` and natural-language toggles in `chat.message`, and inject the caveman SKILL ruleset into the system prompt each turn (`experimental.chat.system.transform`). | NOT in log "loading plugin" list (Oct 13+). Behavioural caveman came from AGENTS.md + command template instead |
| graphify.js | bare file in plugins/ (auto-loaded) | `tool.execute.before` on shell: prepends an `echo` reminder to use `graphify query` ONLY when `graphify-out/graph.json` exists in the project. | Loaded every start; trivia-night has no graphify-out, so inert here |
| i-have-adhd.js | shim re-exporting `vendor/i-have-adhd/.opencode/plugins/i-have-adhd.mjs` | Registers the `i-have-adhd` skill + `/i-have-adhd` command; always-on injection only if a flag file `~/.config/opencode/.i-have-adhd-always` exists (absent). Skill has `disable-model-invocation: true`. | Skill id listed; no sign of use in the build |
| orca-opencode-status.js (+ orca-opencode-status-tui/) | auto-loaded | Bridges opencode events (message.part.updated, permission.asked, question.asked...) to the Orca app hook endpoint for pane status. Observability only. | Loaded every start |
| session-stats/tui.tsx | TUI plugin | Adds a footer segment: turn / idle / work clocks. Written by the model in session S1 for the partner during this period (not part of the build's agent behaviour). | -- |
| @rashidrazak/opencode-status-line, @dmmop/... | npm cache present; registered in the cli config (not read) | Status-bar plugins (context %, tok/s). | -- |

## 5. Custom agents (~/.config/opencode/agents/, `mode: subagent`, from the caveman install)

- `cavecrew-investigator`: Read-only code locator. Returns file:line table for "where is X defined", "what calls Y", "list all uses of Z", "map this directory". Output is caveman-compressed, one row per hit, to keep main-thread context small. Refuses to suggest fixes. Body: "Ultracave voice. Drop articles/filler..." (terse-output instruction).
- `cavecrew-builder`: Surgical 1-2 file edit. Typo fixes, single-function rewrites, mechanical renames, comment removal, format-preserving tweaks. Hard refuses 3+ file scope. Returns caveman diff receipt. Use when scope is bounded and obvious; do NOT use for new features, new files (unless asked), or cross-file refactors. Body: "Ultracave voice. Drop articles/filler..." (terse-output instruction).
- `cavecrew-reviewer`: Diff/branch/file reviewer. One line per finding, severity-tagged, no praise, no scope creep. Output format `path:line: <emoji> <severity>: <problem>. <fix>.` Use for "review this PR", "review my diff", "audit this file". Skips formatting nits unless they change meaning. Body: "Ultracave voice. Drop articles/filler..." (terse-output instruction).

In the build the model used `cavecrew-reviewer` (22 council sessions), `cavecrew-builder` (7) and built-in `general` (14); `cavecrew-investigator` was never used.

## 6. Custom commands (~/.config/opencode/commands/)

`/caveman`, `/ultracave`, `/megacave` (mode switches), `/caveman-commit`, `/caveman-review`, `/caveman-compress`, `/caveman-help`, `/caveman-stats`. Plus `/i-have-adhd` (vendor) and the `/ponytail*` commands (from the npm plugin). Only one command invocation by the partner is visible in the build: `/caveman` (Oct 10 19:41, the template text appears as the user message "Activate caveman mode: on ...").

## 7. Skills the model was shown

The model's system prompt carried **118 distinct skill ids** (from the `core/skill-guidance` notices: 15 superpowers at Oct 9 23:39; a full replacement list of 102 at 23:58; +7 caveman at Oct 10 00:11; +7 graphify/ponytail at 00:18; +2 find-skills/orchestration on Oct 13 17:25). Per-source counts of visible ids (first source wins): ~/.claude/skills: 26, posit-skills: 25, anthropic-skills: 19, superpowers (git plugin): 15, mattpocock-skills: 15, caveman family + graphify (~/.config/opencode/skills/): 8, ponytail (npm plugin): 6, not on disk under searched roots (likely opencode built-in): 2, i-have-adhd (vendor): 1, karpathy: 1.

Skills reach opencode by four routes: `skills` paths in opencode.json (karpathy, posit-skills root, anthropic-skills, three mattpocock sub-folders); plugin registration (superpowers, ponytail, i-have-adhd); installers writing straight into `~/.config/opencode/skills/` (caveman family, graphify); and **automatic discovery of the partner's Claude Code skill dirs `~/.claude/skills` and `~/.agents/skills`** (capture-conversation, plaud-*, ootd, email-digest, class-notes, etc. -- personal and irrelevant to this project, but present in the prompt). Duplicate ids list all sources.

Repos in `skills-repos/` (git clones, Oct 10): mattpocock-skills (github.com/mattpocock/skills), addy-agent-skills (github.com/addyosmani/agent-skills; NOT loaded, wrong path), andrej-karpathy-skills (multica-ai/andrej-karpathy-skills; 1 skill: karpathy-guidelines), posit-skills (posit-dev/skills), anthropic-skills (anthropics/skills). Other installs: superpowers (obra, npm-git cache), caveman (JuliusBrussee, installer), ponytail (DietrichGebert, npm), i-have-adhd (ayghri, `vendor/`), graphify (Graphify-Labs, `uv tool install graphifyy`).

| skill id | source | first shown | description (trimmed) |
|---|---|---|---|
| `brainstorming` | superpowers (git plugin) | 10-09 23:39 | You MUST use this before any creative work - creating features, building components, adding functionality, modifying behavior, or … |
| `diagnosing-superpowers` | superpowers (git plugin) | 10-09 23:39 | Use when a superpowers session went wrong and your human partner wants to know why — repeated work, ignored plans, stumbles, poor … |
| `dispatching-parallel-agents` | superpowers (git plugin) | 10-09 23:39 | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| `executing-plans` | superpowers (git plugin) | 10-09 23:39 | Use when executing an implementation plan in the current session as the implementer yourself — your human partner chose inline exe… |
| `finishing-a-development-branch` | superpowers (git plugin) | 10-09 23:39 | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work |
| `receiving-code-review` | superpowers (git plugin) | 10-09 23:39 | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically ques… |
| `requesting-code-review` | superpowers (git plugin) | 10-09 23:39 | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| `subagent-driven-development` | superpowers (git plugin) | 10-09 23:39 | Use when executing implementation plans with independent tasks in the current session |
| `systematic-debugging` | superpowers (git plugin) | 10-09 23:39 | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| `test-driven-development` | superpowers (git plugin) / addy-agent-skills (NOT referenced; config points at agent-skills/) | 10-09 23:39 | Use when implementing any feature or bugfix, before writing implementation code |
| `using-git-worktrees` | superpowers (git plugin) | 10-09 23:39 | Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an i… |
| `using-superpowers` | superpowers (git plugin) | 10-09 23:39 | Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response includ… |
| `verification-before-completion` | superpowers (git plugin) | 10-09 23:39 | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification com… |
| `writing-plans` | superpowers (git plugin) | 10-09 23:39 | Use when you have a spec or requirements for a multi-step task, before touching code |
| `writing-skills` | superpowers (git plugin) | 10-09 23:39 | Use when creating new skills, editing existing skills, or verifying skills work before deployment |
| `academy-guide` | anthropic-skills | 10-09 23:58 | Stop and check this skill before finishing any reply to a question about how to use Claude or a Claude product — it recommends mat… |
| `algorithmic-art` | anthropic-skills | 10-09 23:58 | Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request cre… |
| `alt-text` | posit-skills | 10-09 23:58 | Generate and improve accessible alt text for data visualizations and images in R packages and Quarto documents. Use when the user … |
| `brand-guidelines` | anthropic-skills | 10-09 23:58 | Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and… |
| `brand-yml` | posit-skills | 10-09 23:58 | Create and use brand.yml files for consistent branding across Shiny apps and Quarto documents. Covers: (1) Creating new _brand.yml… |
| `built-in-browser` | ~/.claude/skills | 10-09 23:58 | Read this skill before the first step that uses the built-in browser, the browser pane inside the Claude desktop app (also called … |
| `canvas-design` | anthropic-skills | 10-09 23:58 | Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to cr… |
| `capture-conversation` | ~/.claude/skills | 10-09 23:58 | Use when ingesting a conversation or voice capture into an Obsidian-style knowledge vault (Obsidian, VS Code Foam, or any markdown… |
| `capture-learning-moment` | ~/.claude/skills | 10-09 23:58 | Use when the user asks to capture, document or write up a learning moment (or teachable moment) from the current conversation for … |
| `catch-up` | ~/.claude/skills | 10-09 23:58 | Use only when Dan explicitly asks to catch up in the vault (for example "catch me up", or /catch-up). Never start it on your own i… |
| `chrome-browser` | ~/.claude/skills | 10-09 23:58 | Read this skill before the first step that uses Claude in Chrome, the browser extension whose tools are named mcp__claude-in-chrom… |
| `class-notes` | ~/.claude/skills | 10-09 23:58 | Use when Dan pastes a Plaud share link (web.plaud.ai/s/…) for a class session inside a course repository, or asks to add a lecture… |
| `claude-api` | anthropic-skills | 10-09 23:58 | Reference for the Claude API / Anthropic SDK — model ids, pricing, params, streaming, tool use, MCP, agents, caching, token counti… |
| `clothing-inventory` | ~/.claude/skills | 10-09 23:58 | Use when adding or updating an owned garment in the `inventory/items/` register of a markdown knowledge vault — cataloguing a shir… |
| `code-review` | mattpocock-skills | 10-09 23:58 | Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this r… |
| `codebase-design` | mattpocock-skills | 10-09 23:58 | Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening op… |
| `computer-use` | ~/.claude/skills | 10-09 23:58 | Read this skill before the first step of any request to do something in an app on the person's own computer (Notes, Finder, System… |
| `create-release-checklist` | posit-skills | 10-09 23:58 | Create a release checklist and GitHub issue for an R package. Use when the user asks to "create a release checklist" or "start a r… |
| `creating-ultra-crew-guides` | ~/.claude/skills | 10-09 23:58 | Use when crewing, pacing, or captaining for a runner in an ultramarathon (50K–200mi) and building a crew guide, aid-station plan, … |
| `critical-code-reviewer` | posit-skills | 10-09 23:58 | Rigorously review code or pull requests for correctness, security, accessibility, maintainability, tests, and edge cases. Use when… |
| `deep-research` | ~/.claude/skills | 10-09 23:58 | Use this skill when the user's prompt requires (1) researching a topic across multiple sources, comparing options or alternatives,… |
| `deploy-to-connect` | posit-skills | 10-09 23:58 | Deploy or publish Python and R content to a Posit Connect server using rsconnect-python or the R rsconnect package. Handles intera… |
| `describe-design` | posit-skills | 10-09 23:58 | Research a codebase and create architectural documentation describing how features or systems work. Use when the user asks to: (1)… |
| `diagnosing-bugs` | mattpocock-skills | 10-09 23:58 | Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something bro… |
| `discernment-nudge` | anthropic-skills | 10-09 23:58 | After you give a substantive answer or draft that the user may act on — advice or recommendations, drafted artifacts such as goals… |
| `doc-coauthoring` | anthropic-skills | 10-09 23:58 | Guide users through a structured workflow for co-authoring documentation. Use when user wants to write documentation, proposals, t… |
| `docs` | ~/.claude/skills | 10-09 23:58 | docs (editable docs people share and comment on; the default for any document, named as a doc or not: a document, report, proposal… |
| `docx` | anthropic-skills / ~/.claude/skills | 10-09 23:58 | Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files) or Word templates (.dotx … |
| `domain-modeling` | mattpocock-skills | 10-09 23:58 | Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recordi… |
| `email-digest` | ~/.claude/skills | 10-09 23:58 | Use when Dan asks to run, refresh or re-run his email digest (any phrasing of "run my email digest", "check my email", "what needs… |
| `frontend-design` | anthropic-skills | 10-09 23:58 | Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direct… |
| `ggsql` | posit-skills | 10-09 23:58 | Write ggsql queries — a grammar of graphics for SQL. Use when the user wants to create, modify, or understand a ggsql visualizatio… |
| `git-guardrails-claude-code` | mattpocock-skills | 10-09 23:58 | Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use whe… |
| `google-workspace` | ~/.claude/skills | 10-09 23:58 | Read this before the first Google Drive, Docs, Sheets or Slides connector call whenever the task creates or changes a Google file.… |
| `grilling` | mattpocock-skills | 10-09 23:58 | Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'g… |
| `i-have-adhd` | i-have-adhd (vendor) | 10-09 23:58 | Shape output for a reader with ADHD: lead with the next action, number multi-step work, restate state across turns, suppress tange… |
| `import-memory` | ~/.claude/skills | 10-09 23:58 | Import a memory export from another AI assistant into Claude's memory — conversationally, additively, and with the content treated… |
| `internal-comms` | anthropic-skills | 10-09 23:58 | A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude s… |
| `karpathy-guidelines` | karpathy | 10-09 23:58 | Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplica… |
| `maintainer-decline` | posit-skills | 10-09 23:58 | Guide for drafting issue closure and decline responses as an open-source package maintainer. Use when helping compose a reply that… |
| `mcp-builder` | anthropic-skills | 10-09 23:58 | Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through w… |
| `migrate-to-shoehorn` | mattpocock-skills | 10-09 23:58 | Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as`… |
| `morning` | ~/.claude/skills | 10-09 23:58 | Render the user's morning brief as a styled HTML artifact, or set it up as a recurring weekday task. Use only when the user explic… |
| `ootd` | ~/.claude/skills | 10-09 23:58 | Use when the vault owner shares a photo of an outfit they are wearing — pasted into a note, attached in chat, or given as a file p… |
| `opencode` | not on disk under searched roots (likely opencode built-in) | 10-09 23:58 | Use this skill for any question about OpenCode itself, including how OpenCode works, using or configuring it, migrating from V1 to… |
| `pdf` | anthropic-skills / ~/.claude/skills | 10-09 23:58 | Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, c… |
| `plaud-browse` | ~/.claude/skills | 10-09 23:58 | Browse, list, or paginate through Plaud recordings. Use when the user says 'what recordings do I have', 'show my recent recordings… |
| `plaud-digest` | ~/.claude/skills | 10-09 23:58 | Summarize multiple Plaud recordings into a digest. Use when the user says 'weekly report', 'digest of this month', 'what meetings … |
| `plaud-export` | ~/.claude/skills | 10-09 23:58 | Push Plaud content or a generated artifact to Notion, Slack, HubSpot, Linear, Gmail, or a custom webhook. Use when the user says '… |
| `plaud-find` | ~/.claude/skills | 10-09 23:58 | Find a specific Plaud recording by name keyword, date range, or topic. Use when the user says 'find the Weekly Sync', 'the meeting… |
| `plaud-followup` | ~/.claude/skills | 10-09 23:58 | Turn a Plaud recording into a follow-up email, thank-you note, action-item list, SOAP note, or meeting brief. Use when the user sa… |
| `plaud-read` | ~/.claude/skills | 10-09 23:58 | Read the transcript, AI summary, notes, or download audio for a specific Plaud recording. Use when the user says 'show the transcr… |
| `plaud-shared` | ~/.claude/skills | 10-09 23:58 | First read before any Plaud operation. Auth flow, error handling, output conventions, token refresh. Use when the user mentions Pl… |
| `pptx` | anthropic-skills / ~/.claude/skills | 10-09 23:58 | Use this skill any time a .pptx or .potx file is involved in any way — as input, output, or both. This includes: creating slide de… |
| `pr` | mattpocock-skills | 10-09 23:58 | Use when writing a PR body. |
| `pr-create` | posit-skills | 10-09 23:58 | Creates a pull request from current changes, monitors GitHub CI, and debugs any failures until CI passes. Activate when the user s… |
| `pr-threads-address` | posit-skills | 10-09 23:58 | Address PR review feedback by systematically working through every unresolved PR review thread on the current branch's PR - analyz… |
| `pr-threads-resolve` | posit-skills | 10-09 23:58 | Bulk resolve unresolved PR review threads on the current branch’s PR — typically after threads have been addressed manually or via… |
| `product-search` | ~/.claude/skills | 10-09 23:58 | Use when creating or updating a product-search, product-comparison, or buying-guide note in a markdown knowledge vault — any note … |
| `prototype` | mattpocock-skills | 10-09 23:58 | Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic fe… |
| `quarto-authoring` | posit-skills | 10-09 23:58 | Use when the user is explicitly working with Quarto, .qmd files, _quarto.yml, Quarto projects, or Quarto features such as callouts… |
| `r-cli` | posit-skills | 10-09 23:58 | Comprehensive R package for command-line interface styling, semantic messaging, and user communication. Use this skill when workin… |
| `r-cli-app` | posit-skills | 10-09 23:58 | Build command-line apps in R using the Rapp package. Use when creating a CLI tool in R, adding argument parsing to an R script, tu… |
| `r-cran-extrachecks` | posit-skills | 10-09 23:58 | Prepare R packages for CRAN submission by checking for common ad-hoc requirements not caught by devtools::check(). Use when: (1) P… |
| `r-cran-status` | posit-skills | 10-09 23:58 | Look up an R package's live status on cran.r-project.org - submission/review state (queue, human review, waiting, archived, past v… |
| `r-lifecycle` | posit-skills | 10-09 23:58 | Guidance for managing R package lifecycle according to tidyverse principles using the lifecycle package. Use when: (1) Setting up … |
| `r-mirai` | posit-skills | 10-09 23:58 | Help users write correct R code for async, parallel, and distributed computing using mirai. Use when users need to run R code asyn… |
| `r-package-development` | posit-skills | 10-09 23:58 | R package development with devtools, testthat, and roxygen2. Use when the user is working on an R package, running tests, writing … |
| `r-testthat` | posit-skills | 10-09 23:58 | Best practices for writing R package tests with testthat version 3+. Use this skill when writing or organizing tests for an R pack… |
| `r-tidyverse-style` | posit-skills | 10-09 23:58 | Use when the user asks to review or clean up R code for tidyverse style, standardize formatting or names, remove redundant comment… |
| `release-post` | posit-skills | 10-09 23:58 | Create professional package release blog posts following Tidyverse or Shiny blog conventions. Use when the user needs to: (1) Writ… |
| `report` | not on disk under searched roots (likely opencode built-in) | 10-09 23:58 | Use when the user wants to report an opencode issue or bug. Collect standard diagnostics, add user-specific reproduction context, … |
| `research` | mattpocock-skills | 10-09 23:58 | Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the us… |
| `review-testing` | posit-skills | 10-09 23:58 | Review test code for quality, design, and completeness after implementing a feature or fixing a bug. Use when the user asks to "re… |
| `scaffold-exercises` | mattpocock-skills | 10-09 23:58 | Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to … |
| `setup-pre-commit` | mattpocock-skills | 10-09 23:58 | Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to ad… |
| `shiny-bslib` | posit-skills | 10-09 23:58 | Build modern Shiny dashboards and applications using bslib (Bootstrap 5). Use when creating new Shiny apps, modernizing legacy app… |
| `shiny-bslib-theming` | posit-skills | 10-09 23:58 | Advanced theming for Shiny apps using bslib and Bootstrap 5. Use when customizing app appearance with bs_theme(), Bootswatch theme… |
| `skill-creator` | anthropic-skills / ~/.claude/skills | 10-09 23:58 | Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from s… |
| `slack-gif-creator` | anthropic-skills | 10-09 23:58 | Knowledge and utilities for creating animated GIFs optimized for Slack. Provides constraints, validation tools, and animation conc… |
| `tdd` | mattpocock-skills | 10-09 23:58 | Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants… |
| `theme-factory` | anthropic-skills | 10-09 23:58 | Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10… |
| `web-artifacts-builder` | anthropic-skills | 10-09 23:58 | Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tai… |
| `webapp-testing` | anthropic-skills | 10-09 23:58 | Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debug… |
| `wizard` | mattpocock-skills | 10-09 23:58 | Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, … |
| `writing-for-agents` | mattpocock-skills | 10-09 23:58 | Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md. |
| `xlsx` | anthropic-skills / ~/.claude/skills | 10-09 23:58 | Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read… |
| `cavecrew` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:11 | When to delegate to `cavecrew-investigator` (locate code), `cavecrew-builder` (1-2 file edit) or `cavecrew-reviewer` (diff review)… |
| `caveman` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:11 | Terse caveman voice: answer first, fluff gone, every technical fact kept. Use for /caveman, "caveman mode", "talk like caveman", "… |
| `caveman-commit` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:11 | Write a Conventional Commits message compressed to intent only. Use for "write a commit", "commit message", /commit or /caveman-co… |
| `caveman-compress` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:11 | Compress a memory file such as CLAUDE.md or a todo list into caveman format to save input tokens, keeping a readable backup. Trigg… |
| `caveman-help` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:11 | Quick-reference card for the three caveman skills and their commands. Trigger: /caveman-help or "caveman help".  |
| `caveman-review` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:11 | Compressed code review - one line per finding with location, problem and fix. Use for /caveman-review, "review this PR", or "revie… |
| `caveman-stats` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:11 | Show recorded output and cache-read token usage and mode attribution for the current Claude Code session, or locate the host's nat… |
| `graphify` | caveman family + graphify (~/.config/opencode/skills/) | 10-10 00:18 | Use for any question about a codebase, its architecture, file relationships, or project content — especially when graphify-out/ ex… |
| `ponytail` | ponytail (npm plugin) | 10-10 00:18 | Lazy senior dev mode: the smallest change that fully solves the task, and a reply a busy human understands in one read. Use on any… |
| `ponytail-audit` | ponytail (npm plugin) | 10-10 00:18 | Quality audit of a whole repo: bugs, security holes, what breaks under real load, risky code without tests, slow paths, and what t… |
| `ponytail-debt` | ponytail (npm plugin) | 10-10 00:18 | List every `shortcut:` comment (and older `ponytail:` ones) as a debt ledger. One-shot report, changes nothing. Use for "ponytail … |
| `ponytail-gain` | ponytail (npm plugin) | 10-10 00:18 | Show ponytail's measured savings (code, cost, speed) from the benchmark. One-shot display. Use for /ponytail-gain, "what does pony… |
| `ponytail-help` | ponytail (npm plugin) | 10-10 00:18 | Quick reference for ponytail levels, skills and commands. One-shot display. Use for /ponytail-help, "ponytail help", "how do I use… |
| `ponytail-review` | ponytail (npm plugin) | 10-10 00:18 | Quality review of a change: is the logic right, is it safe, does it hold under real load, is risky code tested, is it fast enough,… |
| `find-skills` | ~/.claude/skills / ~/.agents/skills | 10-13 17:25 | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skil… |
| `orchestration` | ~/.claude/skills / ~/.agents/skills | 10-13 17:25 | Coordinate supervised Orca workers: threaded messages, blocking ask/reply, task dispatch, worker_done/escalation waits, task DAGs,… |

Skills actually loaded by the model during the project (9 `skill` calls): brainstorming x3 (Oct 9 23:39 in S1; Oct 10 10:51 and Oct 11 10:16 in S2), opencode x3 (the opencode guide skill), writing-for-agents x1 (mattpocock), writing-plans x1, frontend-design x1 (Oct 11 20:15, after the partner asked "do i have any skills installed to help you"). Nothing else.

## 8. File structure of ~/.config/opencode (depth 2, node_modules omitted)

```
AGENTS.md  opencode.json  opencode.jsonc (+ .bak copies)  package.json  (plus three json files not read: cli, service, caveman ownership)
agents/        cavecrew-{builder,investigator,reviewer}.md
commands/      caveman*.md, megacave.md, ultracave.md  (8)
plugins/       caveman/{plugin.js,caveman-config.cjs,caveman-parse.cjs,package.json}  graphify.js  i-have-adhd.js  orca-opencode-status.js  orca-opencode-status-tui/  session-stats/tui.tsx
skills/        caveman, caveman-{commit,compress,help,review,stats}, cavecrew, megacave, ultracave, graphify
skills-repos/  addy-agent-skills  andrej-karpathy-skills  anthropic-skills  mattpocock-skills  posit-skills
vendor/        i-have-adhd/
```

