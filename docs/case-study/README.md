# Case study: a local model builds a trivia-night app, then Claude reviews it

**What happened:** Qwen 3.8 27B, running locally on an NVIDIA DGX Spark
and driven through opencode, built this repo's trivia-night host app from
an idea to a deployed site over Oct 10–14 2026 — 85 commits, every one
attributed to the model. Then Claude Code (Claude Opus 5.5, with Sonnet
5.5 and Haiku 5.5 subagents) reviewed the whole build, fixed what it found
in ten tasks plus a final review, and wrote this folder. The fixes merged
into `main` as [PR #1](https://github.com/chendaniely/trivia-night/pull/1)
on Oct 14 and are live on Pages.

**Why:** the partner is exploring whether local models on the Spark are
viable for real work, and wanted a frontier model's critical, honest
assessment — including where the plugins and skills he installed helped
or hurt. This folder is meant as raw material for a blog post.

![Qwen's final board vs after the Claude pass](assets/claude/1280-board.png)

## TL;DR

- **Qwen did the hard, boring part well.** It followed the partner's
  commit-per-step + review-council protocol for four days and 11 context
  compactions, wrote small sensible modules with tests, deployed to Pages,
  and reached a demoable MVP in under three hours of work.
- **It was not safe to run a live night on.** 7 of 29 trivia answers were
  wrong (4 invented outright, 2 introduced by its own fact-check); 13
  "verified" records described things the code didn't do; there was no
  saved game, an unguarded one-press reset, and a board that didn't fit
  the screen in any version it shipped. It also didn't know it was
  text-only, and lost ~3.5 hours to an image error loop.
- **The plugins mattered less than the partner's own `AGENTS.md`.** 118
  skills were visible; Qwen called the skill tool 9 times. The always-on
  texts (caveman, ponytail, superpowers' bootstrap) shaped its style; the
  repo protocol shaped its results.
- **Claude's verdict:** a viable *implementer* inside a tight harness; not
  a reliable reviewer of itself, a source of facts, or a designer of what
  the user didn't say. Use it as the hands, keep a stronger model as the
  eyes. (Chapter 6.)

## Chapters

| | |
|---|---|
| [1. Setup and method](01-setup-and-method.md) | Hardware, model, harness, plugins and skills, the partner's protocol, how this study was made |
| [2. How the build went](02-timeline.md) | Day by day, with the partner's own prompts, screenshots and a Gantt chart |
| [3. Claude's review of the Qwen build](03-qwen-review.md) | Scorecard, what it did well, what went wrong and why, code-level notes |
| [4. The Claude Code pass](04-claude-pass.md) | The council's findings, every fix and how it was verified, and Claude's own mistakes |
| [5. Did the plugins and skills help?](05-plugins-and-skills.md) | What loaded, what changed behaviour, good/bad, recommendations |
| [6. Is it viable? Claude's take](06-verdict.md) | Where Qwen 3.8 27B on a Spark works and where it doesn't; a hybrid workflow |
| [7. Gallery](07-gallery.md) | The app at 14 milestones, what Qwen "saw", before/after |
| [8. UX audit](08-ux-audit.md) | After the merge: 19 UX problems both passes missed, why, and a tracker for the fixes |
| [Appendix A — the partner's prompts](appendix-a-prompts.md) | Every prompt, in order |
| [Appendix B — numbers](appendix-b-numbers.md) | Commits, lines, tests, sessions, tokens |
| [research/](research/) | The raw research notes the chapters are built from |

## The numbers that frame it

| | Qwen 3.8 27B (opencode, DGX Spark) | Claude Code pass |
|---|---|---|
| Calendar time | Oct 10 22:56 → Oct 14 08:18 (~4 days, with sleep) | Oct 14 08:44 → 13:19 for fixes (+ review before, write-up after) |
| Commits | 85 | 42 for the fixes (Opus 17 · Sonnet 23 · Haiku 2), + this write-up |
| App code + tests + tools (excl. vendored js-yaml) | 1,698 lines written | +1,671 / −186 changed on top |
| Tests | 4 files, 70 assertions | 5 files, 214 assertions + a Chrome smoke test |
| Trivia answers wrong at the end | 7 of 29 | 0 of 29 (two independent checks) |
| Partner prompts | 75 (incl. opencode setup) | 3 (+ follow-ups to merge and to rotate the password) |
| Marginal cost | $0 (local) | paid frontier usage |

## Reading notes

- Times are US Pacific (the machine's clock).
- Qwen's commits carry `Co-Authored-By: Qwen 3.8 27B`; Claude's carry the
  specific Claude model that wrote them. That attribution is what makes
  the per-model numbers possible — the partner set it up on day one.
- Opinions in chapters 3 and 6 are Claude Opus 5.5's, as requested. Facts
  are linked to commits, plan records or measurements.
- Private material was left out: the pasted chat with the host, people's
  names beyond what the spec already had, and any credential (one appears
  in Qwen's session transcript; it was never copied here, and the partner
  has since rotated it).
