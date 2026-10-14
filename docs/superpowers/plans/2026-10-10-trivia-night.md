# Trivia Night App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Single-device web app that hosts a Jeopardy-style trivia night: category × difficulty board, Jeopardy + Trivia modes, team scoring, YAML question bank, GitHub Pages deploy.

**Architecture:** Static vanilla-JS app, no build step. Pure logic modules (`scoring.js`, `validate.js`) are DOM-free and tested with `node:assert`. Screen modules render into `index.html`. One board per data source: the shipped `questions.yaml` or a folder the host picks on their machine. A GitHub Actions workflow deploys the static folder to Pages.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), vendored js-yaml, node:assert self-checks, Playwright (MCP tools + CLI) for UI verification, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-10-trivia-night-design.md`

## Global Constraints

- No build step, no runtime npm dependencies. Every JS dependency vendored under `js/`. No CDN.
- Deploys to GitHub Pages as plain static files. All asset paths relative, so they survive the `/<repo>/` subpath.
- Audio: real clips never committed (copyright). Demo clips generated into `audio/demo/` are committed. A missing clip shows a "no clip" note; the question stays playable.
- One board per data source. Loading a new file/folder starts fresh state. No multi-board state machine.
- Points: default 100/200/300/400/500 by question position; per-question `points:` overrides.
- Teams: 2–4, named on the setup screen.
- YAML questions must support block scalars (`>`, `|`).
- UI: dark, high-contrast, legible from ~10 ft on a TV.
- AGENTS.md protocol: commit after every task (Conventional Commits, 🤖 prefix, Co-Authored-By line), backward + forward council review after every task, Playwright verification for every UI task.
- Text-only working model (qwen3.8 27b; partner note 2026-10-12): UI verification = a11y snapshot + `getComputedStyle`/`document.fonts` assertions + console check. Screenshots may be saved but NOT read — all visual screenshot review is deferred to the final Claude Code pass (section at end of file).

## Review Focus

1. Malformed YAML (typo) → `parseBank` returns errors with line numbers; the app shows the error and never half-renders a board. (Task 2)
2. Long questions written as block scalars → render as clean paragraphs, no indentation or line-break artifacts. (Task 4)
3. Missing audio file → "no clip" note, no crash, question flow continues. (Task 7)
4. Question count ≠ 5 tiers (e.g. 3 or 7) → grid rows adapt to the longest round. (Task 4)
5. Invalid taps (tapping a team after reveal, double-awarding) → state machine ignores them; scores never double-count. (Tasks 5, 6)

## File structure

```
index.html               app shell: one <main>, screen containers, loads js/app.js
styles.css               dark TV-readable theme
js/yaml.js               vendored js-yaml (ESM), with refresh note in header
js/scoring.js            pure: team scores, give/reset/roundTotal
js/validate.js           pure: parseBank(text) -> { ok, bank | errors }
js/board.js              board grid rendering + scoreboard + reset
js/question.js           question flow for both modes (claim, reveal, award, pass)
js/folder.js             local folder mode: FSA pick, webkitdirectory fallback, create-new
js/app.js                entry: state, screen switching, data loading, setup screen
questions.yaml           shipped question bank (stub in Task 3, full in Task 8)
audio/demo/              generated demo clips (Task 7)
tools/make-demo-audio.mjs  dependency-free Node script that writes the demo WAVs
test/scoring.test.mjs    node:assert self-checks
test/validate.test.mjs   node:assert self-checks
.github/workflows/deploy-gh-pages.yml
```

Already in the repo (pre-plan, Tasks 1–9 must not re-create these): `.gitignore` (gitignores `audio/` except `audio/demo/`, node_modules, .venv, .playwright-mcp), `package.json` + lock (playwright devDeps, `"type": "module"`), `opencode.json` (Playwright MCP registration).

**Shared interfaces** (exact; every task uses these names):

```js
// js/scoring.js
createScoring(teamNames: string[]) -> Scoring
Scoring.teams: { name: string, points: number }[]
Scoring.give(teamIdx: number, points: number, roundName: string)
Scoring.reset()
Scoring.roundTotal(roundName: string) -> number
Scoring.roundTeamTotal(roundName: string, teamIdx: number) -> number

// js/validate.js
parseBank(text: string) -> { ok: true, bank: Bank } | { ok: false, errors: BankError[] }
BankError = { line?: number, where: string, message: string }
Bank = { title: string, rounds: Round[] }
Round = { name: string, questions: Question[] }
Question = { q: string, a: string, audio?: string, points?: number }

// js/board.js
renderBoard() -> void  (renders into #screen-board)
setCellClick(fn: (roundIdx, qIdx) => void)
setColumnClick(fn: (roundIdx) => void)

// js/app.js (module-level, consumed by board.js / question.js / folder.js)
state = { mode: "jeopardy" | "trivia", teamNames: string[], bank: Bank,
          used: Map /* "roundIdx:qIdx" -> true */, scoring: Scoring }
showScreen(id: "setup" | "board" | "question" | "tally" | "error")
```

---

### Task 1: Scoring engine (pure)

**Files:**
- Create: `js/scoring.js`
- Test: `test/scoring.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `createScoring`, `Scoring` (shape above)

- [x] **Step 1: Write the failing test**

`test/scoring.test.mjs`, using `node:assert/strict`:

```js
import { createScoring } from "../js/scoring.js";
// - give(0, 300, "Movies") then teams[0].points === 300
// - give(1, -200, "Movies") then teams[1].points === -200  (Jeopardy wrong answer)
// - roundTotal("Movies") === 100 after give(0,300,"Movies"); give(1,-200,"Movies")
// - roundTeamTotal("Movies", 0) === 300 / ("Movies", 1) === -200 (per-team slice; Task 6 tally)
// - reset() zeroes every team and roundTotal returns 0
```

- [x] **Step 2: Run test to verify it fails**

Run: `node test/scoring.test.mjs`
Expected: FAIL — `Cannot find module '../js/scoring.js'`

- [x] **Step 3: Implement `js/scoring.js`**

Plain object + closures. `give` records `{teamIdx, points}` into a per-round log so `roundTotal` can recompute. `reset` zeroes points and clears the log.

- [x] **Step 4: Run test to verify it passes**

Run: `node test/scoring.test.mjs`
Expected: PASS (prints `scoring: all assertions passed`, exit 0)

- [x] **Step 5: Commit**

```bash
git add js/scoring.js test/scoring.test.mjs
git commit -m "feat(scoring): 🤖 add scoring engine with per-round tallies

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 2: Vendored YAML + validation (pure)

**Files:**
- Create: `js/yaml.js` (vendored), `js/validate.js`
- Test: `test/validate.test.mjs`

**Interfaces:**
- Consumes: `js/yaml.js` (js-yaml `parse`)
- Produces: `parseBank` (shape above)

- [x] **Step 1: Vendor js-yaml** (js-yaml 5.4.3)

Run: `npm i -D js-yaml` then copy `node_modules/js-yaml/dist/js-yaml.mjs` to `js/yaml.js`, prepending a one-line header: `// Vendored js-yaml — refresh: npm i -D js-yaml && cp node_modules/js-yaml/dist/js-yaml.mjs js/yaml.js`
Note: js-yaml exports `load` (verified v4 and v5) — there is no `parse` export. `validate.js` imports `{ load }`.

- [x] **Step 2: Write the failing test**

`test/validate.test.mjs`, using `node:assert/strict`:

```js
import { parseBank } from "../js/validate.js";
// - valid bank (title + 2 rounds, one question using a `>` block scalar) -> ok, bank.rounds[0].questions[0].q is the folded text
// - question missing `a` -> ok:false, errors[0].where === 'rounds[0].questions[1]', message names the missing field
// - mid-file YAML error: line 6 is `        a: bad: line` (unquoted value containing a colon)
//   -> ok:false, errors[0].line === 6 (js-yaml marks are 0-based; store mark.line+1)
//   NOTE (verified): EOF-truncated errors (e.g. unclosed quote) mark EOF, not the
//   offending line — keep the fixture mid-file so the reported line is the real one.
// - `points` must be a positive integer when present
```

- [x] **Step 3: Run test to verify it fails**

Run: `node test/validate.test.mjs`
Expected: FAIL — module not found

- [x] **Step 4: Implement `js/validate.js`**

`load` in try/catch: on syntax error return `errors: [{ line: err.mark.line + 1, where: "yaml", message: err.reason }]` (mark is 0-based; for mid-file errors that is the offending line). On success, walk the structure; collect every schema error with `where` like `rounds[1].questions[2]`. Also reject: empty rounds list, zero-question rounds, duplicate round names (Task 6 tallies key by name). Return `{ ok: errors.length === 0, ... }`.

- [x] **Step 5: Run test to verify it passes**

Run: `node test/validate.test.mjs`
Expected: PASS (prints `validate: all assertions passed`, exit 0)

- [x] **Step 6: Commit**

```bash
git add js/yaml.js js/validate.js test/validate.test.mjs package.json package-lock.json
git commit -m "feat(yaml): 🤖 add yaml validation with line-numbered errors

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 3: App shell + setup screen

**Files:**
- Create: `index.html`, `styles.css`, `js/app.js`, `questions.yaml`
- Test: Playwright (MCP tools)

**Interfaces:**
- Consumes: `parseBank` (Task 2)
- Produces: `state`, `showScreen` (shapes above); setup screen with 4 team inputs, 2 mode radios, Start button

- [x] **Step 1: Write `index.html` + `styles.css` + `js/app.js` skeleton**

`index.html`: one `<main id="root">` with four screen containers (`#screen-setup`, `#screen-board`, `#screen-question`, `#screen-tally`) plus `#screen-error` (error panel, part of the showScreen interface), loads `js/app.js` as a module. `styles.css`: dark background, light text, large type (min 28 px body), high contrast. `js/app.js`: `state` object, `showScreen(id)` toggles `.hidden`, and on load `fetch("questions.yaml")` → `parseBank` → on failure show an error panel — `line N: message` when `line` is present, else `where: message` — and stop; on success render setup.

Setup screen: title, 4 team-name inputs (placeholders Team 1–4; first two required, 2–4 accepted), mode radios labeled **Jeopardy** and **Trivia**, Start button (disabled until ≥ 2 names). Start sets `state`, `createScoring`, `showScreen("board")`.

`questions.yaml` stub — 2 rounds:

```yaml
title: "Trivia Night"
rounds:
  - name: "Demo"
    questions:
      - q: "Starter question"
        a: "Answer"
      - q: >
          A longer question written with a block
          scalar to check rendering.
        a: "Answer two"
      - q: "Third question"
        a: "Answer three"
  - name: "Demo 2"
    questions:
      - q: "Q1"
        a: "A1"
      - q: "Q2"
        a: "A2"
      - q: "Q3"
        a: "A3"
      - q: "Q4"
        a: "A4"
      - q: "Q5"
        a: "A5"
```

- [x] **Step 2: Verify with Playwright**

Start a static server in the background: `python3 -m http.server 8080 --bind 127.0.0.1` (from repo root).
MCP: `browser_navigate` → `http://127.0.0.1:8080`, then `browser_snapshot`.
Expected: setup screen visible; Start disabled; type two team names → Start enabled; click Start → board screen visible (empty grid fine — Task 4 fills it). (Superseded on fresh load by Task 7.10 step 4: rows are pre-filled with random names and Start is enabled immediately.)

- [x] **Step 3: Verify the malformed-YAML path**

MCP: use `browser_navigate` to a temporary copy is NOT needed — instead temporarily append a bad line to `questions.yaml`, reload via `browser_navigate`, expect the error panel with a line number and no board. Restore the file when done and confirm clean with `git diff --exit-code questions.yaml` before committing — a broken bank must not flow into Tasks 4–7.

- [x] **Step 4: Commit**

```bash
git add index.html styles.css js/app.js questions.yaml
git commit -m "feat(app): 🤖 add app shell and setup screen

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 4: Board screen + scoreboard + reset

**Files:**
- Create: `js/board.js`
- Modify: `js/app.js` (wire `renderBoard` into the board screen), `styles.css` (board styles)

**Interfaces:**
- Consumes: `state` (Task 3), `Scoring` (Task 1)
- Produces: `renderBoard()` (renders into `#screen-board`) — grid + scoreboard + reset; `setCellClick(fn)` / `setColumnClick(fn)` hooks Tasks 5–6 wire (board.js module-level no-ops until then)

- [x] **Step 1: Implement `js/board.js`**

Grid: columns = rounds (header = round name; in Trivia mode the header is the click target for the whole column), rows = max question count across rounds (Review Focus 4). Rounds with fewer questions simply have fewer cells — no placeholder cells (spec: the board only shows cells that have content). Cell text = points (position default 100×n, or `q.points`). Used cells (key `roundIdx:qIdx` in `state.used`) render dimmed with no click. Scoreboard strip: team names + live points. Reset button → `state.scoring.reset()`, clear `state.used`, re-render. Clicks route through app.js callbacks `onCellClick(roundIdx, qIdx)` / `onColumnClick(roundIdx)`; until Tasks 5–6 land those callbacks are no-ops, so the board is fully navigable-looking but inert.

- [x] **Step 2: Verify with Playwright**

MCP: reload, setup with two teams, Start. `browser_snapshot`: board shows 2 columns, row counts 5 and 3 (adapted, Review Focus 4), cell values 100–500, scoreboard shows both teams at 0. Click Reset → still 0.

- [x] **Step 3: Commit**

```bash
git add js/board.js js/app.js
git commit -m "feat(board): 🤖 add board grid, scoreboard, and reset

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 5: Question flow — Jeopardy mode

> Superseded by Task 7.5 (2026-10-11): single-claim + Correct/Wrong
> replaced by multi-win toggles (green/red/clear) with Reveal + Done.

**Files:**
- Create: `js/question.js`
- Modify: `js/app.js` (cell click routing, back-to-board)

**Interfaces:**
- Consumes: `state`, `Scoring`, `renderBoard`
- Produces: `startQuestion(roundIdx, qIdx)` (Jeopardy mode)

- [x] **Step 1: Implement the Jeopardy flow in `js/question.js`**

Phases: `claim` (question text + tappable team buttons; tapping a team claims and locks it) → `reveal` (answer shown; Correct / Wrong buttons) → back to board. Team buttons render as `<button>` (not `<input type=button>`) so they pick up the accent button style and disabled dimming. Question text renders as a clean paragraph — block-scalar content (already folded by the YAML parser) shows without indentation or line-break artifacts (Review Focus 2). `Correct`: `scoring.give(claimIdx, +points, round.name)`, mark used. `Wrong`: `scoring.give(claimIdx, -points, round.name)`, mark used. Taps on team buttons after `reveal` are ignored (Review Focus 5).

- [x] **Step 2: Verify with Playwright**

MCP: setup (teams "A", "B"), Jeopardy mode, Start. Click Demo 300 → question visible, no answer; tap "B" → answer reveals, team buttons disabled. Wrong → B = -300, back on board, cell inert. Click Demo 200 (block scalar) → renders as one clean paragraph (Review Focus 2); tap "A" → reveal → Correct → A = +200.

- [x] **Step 3: Commit**

```bash
git add js/question.js js/app.js
git commit -m "feat(question): 🤖 add jeopardy question flow with claim and reveal

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 6: Question flow — Trivia mode + column tally

> Superseded by Task 7.5 (2026-10-11): single-tap auto-advance replaced
> by green-toggle marks + Next.

**Files:**
- Modify: `js/question.js` (column mode + tally screen), `js/app.js` (setColumnClick), `js/board.js` (completed-column headers inert), `styles.css`

**Interfaces:**
- Consumes: `state`, `Scoring`, `renderBoard`
- Produces: `startColumn(roundIdx)`, tally screen renderer

- [x] **Step 1: Implement the Trivia flow**

Round header click → first question of the column. In Trivia mode cells are NOT individual click targets — board.js attaches no `.clickable`/listener to them; the header is the target. The column flow is a separate path from Jeopardy's `resolve()` (one tap awards, then next question or tally — never back to board mid-column); capture `round.name` before clearing the flow's current question. Per question: team buttons (tap = that team got it, `give(+points)`) plus a **Pass** button (`give` nothing, 0 points). Next → following question; used cells update as the column progresses. After the last question: tally screen — per-team points earned in this column via `scoring.roundTeamTotal(round.name, teamIdx)` for each team — then back to board. Invalid taps after a question is awarded are ignored (Review Focus 5).

- [x] **Step 2: Verify with Playwright**

MCP: setup (teams "A", "B"), Trivia mode, Start. Click "Demo 2" header (the 5-question stub round) → Q1. Tap "A" (+100) → Q2. Pass (0) → Q3. Tap "B" (+300) → Q4. Tap "B" (+400) → Q5. Tap "A" (+500) → tally screen shows A = 600, B = 700. Back to board → Demo 2 column fully dimmed, its header inert (completed columns are not re-clickable).

- [x] **Step 3: Commit**

```bash
git add js/question.js js/app.js
git commit -m "feat(trivia): 🤖 add trivia column flow with pass and tally

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 7: Audio (demo clips + playback + missing-clip fallback)

**Files:**
- Create: `tools/make-demo-audio.mjs`
- Modify: `js/question.js` (play control), `questions.yaml` (one music question)

**Interfaces:**
- Consumes: `state`
- Produces: play control on the question screen; `audio/demo/*.wav`

- [x] **Step 1: Write `tools/make-demo-audio.mjs`**

Dependency-free Node: writes three 16-bit PCM WAV files (44.1 kHz, ~1.5 s each) into `audio/demo/`: `note-440.wav` (A4), `note-523.wav` (C5), `arpeggio.wav` (440→523→659). Pure math + DataView, no npm packages.
Recorded deviation: the spec prefers m4a/mp3 for REAL clips (TV-browser support); demo clips are WAV — universally decodable and trivial to generate dependency-free. The app is extension-agnostic (`<audio src>` handles the format); the m4a/mp3 advice stands for clips the host adds.

- [x] **Step 2: Generate and check the clips**

Run: `node tools/make-demo-audio.mjs` then `ls -la audio/demo/`
Expected: three files, each ~130 KB, RIFF header (`xxd -l 4` shows `RIFF`).

- [x] **Step 3: Wire playback into the question screen**

If `q.audio` present: render an `<audio controls preload="auto" src={q.audio}>` (relative path) above the question text. On `error` event (missing file): hide the player, show a "no clip — play it from any device" note, continue the flow (Review Focus 3). `renderPhase` re-runs on claim→reveal, so the audio element must be rendered in EVERY phase branch and the error handler re-attached per render (or the clip vanishes from the reveal screen). The column flow's `renderColumnPhase` is a SEPARATE renderer — audio must land there too (spec: the question screen is shared by both modes).

- [x] **Step 4: Add audio questions to the stub bank**

Add to `questions.yaml` under a new round "Music": one question referencing `audio/demo/arpeggio.wav`, one referencing `audio/demo/missing.wav` (does not exist — exercises the fallback).

- [x] **Step 5: Verify with Playwright**

MCP: Jeopardy mode, open the arpeggio question → audio element present; `play()` via evaluate → waits to `currentTime` 1.5 (full clip), no error. Open the missing-clip question → "no clip" note renders, claim buttons work. Trivia mode: Music column header → Q1 shows the player (renderColumnPhase coverage).

- [x] **Step 6: Commit**

```bash
git add tools/make-demo-audio.mjs audio/demo js/question.js styles.css questions.yaml
git commit -m "feat(audio): 🤖 add audio playback with generated demo clips

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

- [x] **Step: MILESTONE — MVP demo (no commit)**

Start the server (`python3 -m http.server 8080 --bind 127.0.0.1` from repo root, background), hand the user `http://127.0.0.1:8080`, and **stop: wait for the user's demo feedback before Task 8**.

---

### Task 7.5: MVP feedback — multi-win, back to setup, NYC palette

Partner feedback after the MVP demo (2026-10-11): (1) multiple teams can
win one question in BOTH modes — Jeopardy team buttons cycle green
(+points) → red (−points) → clear on click, with a manual "Reveal answer"
button (the host doesn't know all the answers) and "Done" to apply marks;
Trivia team buttons toggle green (+points) / clear, with "Next" (no taps =
pass). (2) A "Setup" button on the board returns to the setup screen with
names and mode prefilled; same team count keeps scores + played cells
(rename in place, mode changeable), different count = fresh game.
(3) Palette: NYC flag orange #F26522 + blue #236192 on a dark blue-black
theme. Spec updated 2026-10-11 (Goals + Decided sections).

**Files:**
- Modify: `styles.css` (palette), `js/question.js` (toggles, Reveal/Done, Next), `js/board.js` (Setup button + actions row), `js/app.js` (setup prefill, keep/fresh on Start)
- Add: `tools/local-server.py` (no-store dev server — see execution note)

- [x] **Step 1: NYC palette in `styles.css`**

Dark blue-black theme: bg #0a1620, panel #13242f; orange #F26522 as
primary action / score accent (Start, Done/Next, score points, cell hover,
answer text); blue #236192 as surfaces / secondary buttons (header hover,
unmarked team buttons, Reset/Setup/Reveal); green/red reserved for team
marks. Radio controls get `accent-color: orange`.
Verify: Playwright computed styles — body background rgb(10,22,32), Start
button background rgb(242,101,34).

- [x] **Step 2: Multi-win toggles in `js/question.js`**

Jeopardy question screen: team buttons cycle green → red → clear;
"Reveal answer" shows the answer (marks may be set before or after
reveal); "Done" applies all marks (each green +pts, each red −pts), marks
the cell used, back to board; zero marks + Done = nobody got it.
Trivia column screen: team buttons toggle green / clear; "Next" applies
greens (each +pts) and advances; no taps = pass; last question → tally.
Verify with Playwright (sequences below).

- [x] **Step 3: Back to setup (`js/board.js`, `js/app.js`)**

Board actions row: "Setup" + "Reset scores" (secondary/blue). Setup
button → setup screen with team names + current mode prefilled. Start:
same team count as the running game → rename in place, keep scores + used
cells, mode may change; different count → fresh scoring + fresh board.
Verify with Playwright (sequences below).

- [x] **Step 4: Verify with Playwright (full sequences)**

1. Jeopardy: open Demo 300 → tap A (green "A ✓"), tap B (green), tap A
   again (red "A ✕"), tap A again (clear) → "Reveal answer" → answer
   shown → "Done" → board: A 0, B +300, cell used.
2. Trivia: Demo 2 column — Q1: A✓ then B✓ then A cleared (B +100); Q2:
   B✓ (+200); Q3: Next with no taps (pass); Q4: A✓ (+400); Q5: Next
   (pass) → tally A 400, B 300 → back to board: column used, scores kept.
3. Setup: from that board click "Setup" → names A/B + Trivia mode
   prefilled → rename A to "Alpha" → Start → board shows "Alpha 400",
   "B 300", Demo 2 still used. Add a third team → Start → fresh game:
   all scores 0, board fresh.

- [x] **Step 5: Commit**

One commit per implementation step (`feat(theme)`, `feat(question)`,
`feat(board)`), then this plan update.

> 2026-10-11 execution note: verified on `tools/local-server.py` (sends
> `Cache-Control: no-store`) using a FRESH port per code change (8081 for
> steps 1-2, 8082 for step 3). Plain `http.server` + a persistent Chrome
> profile held stale JS well past Last-Modified revalidation, and CDP cache
> controls (setCacheDisabled, clearBrowserCache) had no effect — a port the
> browser already loaded can keep serving old bytes. Rule: verify on a port
> that has never been loaded in the browser profile. Setup verification
> also covered the same-count mode-change case (state kept, trivia headers
> activate).
>
> Council notes (2026-10-11, after implementation): backward pass clean
> (palette values exact, v1 dead code gone, commits conform). Forward pass
> found 2 majors, both fixed before Task 8: (1) `loadBank` kept the old
> game's scoring/used across bank reloads → now resets both (fix: app);
> (2) the column flow re-awarded used cells after a supported mid-game
> mode switch → `startColumn`/`nextQuestion` advance over the first
> unused question (fix: question, Playwright-verified: column resumes at
> "question 2 of 3", no double award). Plus: `pointsFor` de-duplicated
> (board.js exports, question.js imports). Skipped: an early-exit "Board"
> button on the trivia column (not requested — a mis-tapped header forces
> the host through the remaining questions; revisit if it bothers at the
> event).

---

### Task 7.6: Question media — images in the YAML

Partner request (2026-10-11): a question must be able to carry text,
audio, AND images, all specified in `questions.yaml`. Text (q/a) and audio
already work; add images:

- Schema: optional `images:` — list of relative paths (same convention as
  `audio:`). Validated like audio: not a list, empty list, or a
  non-empty-string item missing → schema error with the question's
  `where`.
- Renderer: `imageBlock` in BOTH renderers (Jeopardy + trivia column),
  between audio and question text; TV-sized (max 640×480, contain); a
  missing image swaps for a "no image — show it from any device" note
  (same graceful-degrade pattern as audio; question stays playable).
- Demo: `tools/make-demo-images.mjs` generates 2 self-generated PNGs into
  committed `images/demo/` (no deps: hand-built PNG + node:zlib); the stub
  bank references one demo image per renderer (Jeopardy + trivia column)
  and one MISSING image as the fallback probe (mirrors the missing.wav probe; neither survives the Task 8 bank
  replace — the shipped bank carries no media refs, the host supplies
  content in folder mode).
- Scope call: text/audio/images only; video or other media types can reuse
  the same list-of-paths + renderer pattern later (not built now).

**Files:**
- Modify: `js/validate.js`, `test/validate.test.mjs`, `js/question.js`, `styles.css`, `questions.yaml` (stub)
- Add: `tools/make-demo-images.mjs`, `images/demo/*.png`

- [x] **Step 1: Schema + tests** — images validation in `parseBank` + 3
  test cases (list ok / not a list / bad item). `node --test` green.
  (367dd70)

- [x] **Step 2: Renderer** — `imageBlock` in both renderers + CSS
  (`.images-block`, TV-sized img, no-image note). (22e00ee)

- [x] **Step 3: Demo images + stub refs** — generator, 2 PNGs in
  `images/demo/`, stub question refs (demo image + missing probe).

- [x] **Step 4: Verify (Playwright)** — Jeopardy question shows the demo
  image (`naturalWidth > 0`); missing-image question shows the note;
  trivia column renderer shows the image too. (port 8083; 640x480 loaded
  in both renderers, missing.png swapped for the note)

- [x] **Step 5: Commit** — one commit per step + this plan update.

---

### Task 7.7: UI polish pass (visual only — UX locked)

Partner request (2026-10-11): the UX does what they want; now make it
prettier. Interaction and flow unchanged — visuals only. Designed with the
frontend-design skill; subject = a trivia night on a living-room TV
(game-show set, not a SaaS app). Palette partner-pinned (NYC orange/blue) —
refine roles, do not recolor.

**Design:**
- Type: the partner's personal face (2026-10-12), self-hosted as woff2
  under `fonts/` (the no-CDN constraint above + flaky home Wi-Fi):
  **Atkinson Hyperlegible Next** (Google Fonts — designed for maximum
  legibility, which IS the TV requirement), the latin variable file
  (wght 200–800; verified via fontTools `fvar`); `font-display: swap`;
  system-ui fallback. Weight contrast is the typographic device: 400
  body, 700 headers, 800 tabular numerals + scores.
- Base scale 28 → 30px; h1 56 → 72px/800.
- Board (the hero): 1px `--edge` borders on headers/cells (depth via edges,
  no shadow card kit); cells min-height 88px with 40px/800 tabular
  numerals; category headers 32px/700; a subtle 5-step background ramp
  easy → hard (tier classes on cells) that encodes difficulty; hover =
  orange fill.
- Scoreboard: plaque style — name 28px, points 40px/800 orange
  tabular-nums, 1px border, radius 14.
- Question screen: h2 eyebrow 32px/700 muted; question 52px/400; answer
  48px/800 orange, slide-in reveal; setup title gets a short orange
  rule; team buttons keep the ✓/✕ suffix, dark text on green/red fills.
- Motion (responds to action, ≤240ms): screen fade/slide-in, answer reveal
  slide, button hover lift + press sink; `prefers-reduced-motion` kills it.

**Files:**
- Add: `fonts/atkinson-hyperlegible-next.woff2` (variable font), `@font-face` in `styles.css`
- Modify: `styles.css`, `js/board.js` (one line: tier classes on cells)

- [x] **Step 1: Type + tokens** — Atkinson Hyperlegible Next variable
  woff2 (latin, wght 200–800) into `fonts/`, `@font-face` + base scale +
  button/input restyle. (1630f28)
- [x] **Step 2: Board + scoreboard** — borders, cell presence, difficulty
  ramp (tier classes in board.js), score plaques. (51c468a)
- [x] **Step 3: Setup + question + tally + motion** — title rule, question
  scale, reveal + screen-in animations, press states, reduced-motion.
  (fb7d3c4)
- [x] **Step 4: Verify (Playwright, TEXT-ONLY)** — port 8086;
  `document.fonts.status` loaded + `fonts.check` true at wght 400 AND 800
  (variable axis resolves); computed checks: body 30px Atkinson, h1
  72px/800, cell 40px/800 min-height 88px border 1px #24405a, tier ramp
  #111f2a→#1f3b4e, header 32px/700, points 40px/800 #f26522, question
  52px/400, answer 48px/800 + `reveal-in 0.24s`, marked-green #3fb950,
  trivia img 640px loaded, tally row 14px/1px. Console: only the
  expected favicon 404 + the 3 intentional missing.png probe 404s.
  After-screenshots saved to `.playwright-mcp/ui-after-*.png` (NOT read —
  text-only model).
- [x] **Step 5: Council + commit** — backward + forward pass (text-based:
  subagents read code/diffs, not screenshots), apply findings, check boxes.
  Council 2026-10-12: backward — code h1 was 68px vs plan 72px (code
  aligned); stale "serif" wording fixed. Forward — `font-display: swap`
  flagged as a metrics-reflow risk (TV + public deploy); KEPT swap (text
  visible immediately beats a one-time reflow; `block` risks up to 3s of
  blank TV on flaky Wi-Fi), mitigated with `<link rel="preload"
  as="font">` in index.html. Real-TV reflow re-checked in the Claude
  pass (deferred section).

---

### Task 7.8: Back button + trivia click affordance

Partner request (2026-10-12): (a) every question screen needs a Back button
— an accidental cell tap must be recoverable without losing state; (b) in
trivia mode it must be obvious that the dollar amounts are NOT the click
target — the category headers are.

**Design:**
- Back to board: quiet-style button (`.btn-quiet`: panel bg, 1px edge
  border, muted text) FIRST in the controls row of BOTH question screens.
  Jeopardy: discards marks, does NOT consume the cell, scores unchanged,
  back to board. Trivia: leaves the column, no cell consumed; the host can
  re-enter from the header. Same stale-tap guards as `done()`/`nextQuestion()`.
- Trivia affordance: trivia-mode cells render at opacity 0.45 (visually
  inert); centered hint line under the scoreboard — "Trivia: click a
  category name to start that round — the amounts are not clickable."; a
  fully-used column's header dims too (round-over feedback).

**Files:**
- Modify: `js/question.js`, `js/board.js`, `styles.css`

- [x] **Step 1: Back button** — both flows + `.btn-quiet` style. (5a78202)
- [x] **Step 2: Trivia affordance** — dim cells, hint line, dim finished
  headers. (38bcbf4)
- [x] **Step 3: Verify (Playwright, text-only)** — port 8088: Jeopardy
  back after a green mark → scores 0, 0 used cells, cell still
  clickable; trivia board → hint text verbatim, cells opacity 0.45 and
  not clickable, header clickable; column back → 0 consumed; round-over
  dim → 1/3 headers dim at 0.45, not clickable. Console: only the
  favicon 404 + intentional missing.png probes. After-shots in
  `.playwright-mcp/ui-after-backbtn.png`, `ui-after-trivia-hint.png`
  (NOT read — text-only model).
- [x] **Step 4: Council + commit.** Council 2026-10-12: backward — clean
  (record-keeping only). Forward — 🔴 `.team-btns button` (0,1,1)
  outranked `.btn-quiet` (0,1,0): Back rendered blue; 🟠 same pre-existing
  root cause (since 7.5) had Done/Next blue, breaking orange = primary.
  Fixed (controls row → own `.controls` class, layout only), verified on
  8089: Back panel/muted, Reveal blue, Done orange, mark buttons 34px
  blue.

---

### Task 7.9: Dynamic team count (add/remove, min 2, no cap)

Partner request (2026-10-12): team count must not be fixed at 4 — add and
remove teams at setup.

**Design:**
- Setup renders team ROWS (input + Remove button), min 2, NO cap —
  partner also wants the option of more than 4 (2026-10-12); team
  buttons and scoreboard plaques wrap (flex-wrap). Fresh load starts at
  2 rows; back-to-setup keeps the current game's rows (values persist in
  the DOM — the Setup button only shows the screen). "Add team" appends
  a row; Remove disabled at 2 rows; Add always enabled.
- Start requires every row to have a name (Start disabled otherwise) —
  replaces the old "empty box = no team" filtering; the row count IS the
  team count.
- Same-game rule unchanged: same count = rename in place (scores + used
  cells kept); different count = fresh game.
- No change to scoring/board/question renderers: they already build from
  `scoring.teams`.

**Files:**
- Modify: `js/app.js`, `styles.css` (index.html needs no change — inputs
  are already JS-rendered into `#team-inputs`)

- [x] **Step 1: Dynamic team rows** — renderSetup rows + Add/Remove +
  all-named start rule. (add404e)
- [x] **Step 2: Verify (Playwright, text-only)** — port 8090: fresh load
  2 rows (Remove×2 disabled, Add on, Start off — true at the time, rows
  were then empty; Task 7.10 step 4 pre-fills names so Start is on);
  names → Start on;
  Add 3rd empty → Start off, values kept; 3-team game scores 100;
  back-to-setup keeps 3 rows + values; 5-team start → 5 plaques all 0
  (count change = fresh game) + 5 question-screen team buttons; removes
  step 5→4→3→2 one row per click, Remove disabled at 2; console only
  the favicon 404 + intentional missing.png probes. After-shot in
  `.playwright-mcp/ui-after-5teams.png` (NOT read — text-only model).
- [x] **Step 3: Council + commit.** Council 2026-10-12: backward — clean
  (plan heading "2–4" corrected to no-cap). Forward — 🟠 loadBank did not
  reset state.teamNames (stale names for Task 9) → one-line fix applied;
  🟡 draft-carry across bank loads deferred (Task 9 owns that UX); 🟡
  5+ rows scroll at 720p accepted (setup is a pre-game screen, TVs are
  1080p).

---

### Task 7.10: Random team names on Add (adj + noun, no word reuse)

Partner request (2026-10-12): "Add team" auto-fills the new row with a
fun two-word name (adjective + noun) from a built-in dictionary; no word
is reused across the teams currently in setup.

**Design:**
- Pure `js/teams.js`: `TEAM_ADJ` + `TEAM_NOUN` (~30 each, short
  TV-legible words) + `randomTeamName(existingNames)` — picks an unused
  adjective + unused noun (case-insensitive word match against every
  current name, typed or generated); falls back to "Team N" if a list is
  exhausted (15+ teams). Node-tested: word membership, no word reused
  across 20 generations, no clash with existing names, fallback.
- `js/app.js`: "Add team" passes the generated name into the new row
  (host can still edit it). The initial 2 rows are PRE-FILLED on app
  start (partner 2026-10-12: minimize start time — host can hit Start
  immediately; the 2nd name avoids the 1st's words). Removed or edited
  names free their words automatically — generation always checks the
  live row values, no bookkeeping.

**Files:**
- Add: `js/teams.js`, `test/teams.test.mjs`
- Modify: `js/app.js`

- [x] **Step 1: teams.js + wire Add + node test.** (cafc27d)
- [x] **Step 2: Verify (Playwright, text-only)** — port 8091: 5 adds →
  5 two-word names (Vivid Badgers, Plucky Falcons, Golden Tofu, Breezy
  Beavers, Gilded Sausages) with 14/14 words distinct across typed +
  generated; typing "Cosmic Pickles" then Add → "Nifty Pigeons"
  (avoids both typed words, no clash); console only the favicon 404.
- [x] **Step 3: Council + commit.** Council 2026-10-12: forward — no
  downstream risk (nothing keyed by name; fallback dupes display-only;
  test fallback assertion self-referential on the exported lists).
  Backward — 🟠 typed-clash test assertion was vacuous (full-name
  string compared to a single word, could never fail) → rewritten as
  word-to-word set check, re-verified green.
- [x] **Step 4: Pre-fill initial rows on app start** (partner
  2026-10-12: minimize start time) — renderSetup() with no args
  generates two non-clashing names. (f1c3319) Verified port 8092:
  fresh load "Hazy Bagpipes" + "Misty Goblins" (0 duplicate words,
  Start enabled immediately); Add → "Feral Walruses" (no clash with
  the existing 4 words); console only the favicon 404. Council:
  backward clean; forward — no downstream risk, 2 🟡 annotations on
  stale "Start disabled" verify records in Tasks 4/7.9 (applied).

---

### Task 8: Full starter question bank

**Files:**
- Modify: `questions.yaml` (replace stub)

**Interfaces:**
- Consumes: `parseBank` rules (Task 2)

- [x] **Step 1: Write the bank**

Six rounds, deliberately hard (spec): Movies: Oscar (5), Movies: Cult Classics (5), Movies: Childhoods (5), Music (4 — placeholder questions, NO `audio:` references: spec ships music as placeholders until real clips are dropped into `audio/`; the generated demo clips stay in `audio/demo/` for folder-mode use), Nerd Culture (5 — e.g. "name the game by its fishing minigame"), Words (5 — e.g. "cartoon character by their nose"). Easy → hard within each round. Long questions use `>` block scalars.
The stub's `missing.wav` fallback-test question does NOT survive this replace — the shipped bank has no broken references; the missing-clip path stays verified by Task 7's record. Same for Task 7.6: the shipped bank carries no `audio:`/`images:` refs at all (host content, copyright); the media renderers stay verified by the stub/demo record.

- [x] **Step 2: Verify** (box missed at the time; the run is
  recorded below and was re-confirmed 2026-10-13: one-liner →
  `6 rounds, 29 questions`)

Run: `node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parseBank } from './js/validate.js'; const r = parseBank(readFileSync('questions.yaml','utf8')); if (!r.ok) { console.error(r.errors); process.exit(1); } console.log(r.bank.rounds.length + ' rounds,', r.bank.rounds.reduce((n, x) => n + x.questions.length, 0) + ' questions');"`
Expected: `6 rounds, 29 questions`
MCP: reload against the running no-store server (`tools/local-server.py`, port 8080), Start → board shows 6 columns. If the browser profile already loaded files that changed since its last visit, verify on a fresh port (see Task 7.5 execution note). (Port 8093: one-liner → `6 rounds, 29 questions`; zero audio/images refs; Start with pre-filled names → board shows all 6 round headers, 30 cells = 29 questions + 1 Music gap; opened a cell → real question text rendered; console only favicon 404s.)

- [x] **Step 3: Commit.** Council 2026-10-12 (backward vs spec: clean after
  fix; forward fact-check caught 5): Hepburn's record is FOUR wins (not
  three); Truffaut never won Best Director — replaced with his only
  Oscar, Day for Night (Best Foreign Language Film); Old Town Road's
  #1-weeks record churns — replaced with stable Thriller fact; "to
  main" is not a verb — replaced with the real state-verb (Rhode
  Island); Wings is not a lost film — rephrased as "only silent film
  to win Best Picture"; Minecraft string comes from spiders/witches,
  not creepers.

```bash
git add questions.yaml
git commit -m "feat(bank): 🤖 add starter question bank across six categories

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 9: Local folder mode + create-new

**Files:**
- Create: `js/folder.js`
- Modify: `js/app.js` (setup screen buttons)

**Interfaces:**
- Consumes: `parseBank`, `state`
- Produces: `loadFolder(dirHandleOrFiles) -> parseBank result` (audio AND images as object URLs — council 2026-10-11: folder-bank `images:` paths must resolve against the folder, not the site URL, or every folder image 404s into the "no image" note; a malformed `questions.yaml` in the folder surfaces the same line-numbered error panel), `createNew(parentHandle, name) -> dirHandle`, both with graceful fallbacks

- [x] **Step 1: Implement `js/folder.js`** (done 2026-10-13, commit
  `35e2b32` — amended from `900becc` to add the 🤖 prefix per AGENTS.md
  + council fixes)

Setup screen gains two buttons: **Load folder** and **Create new** —
PLACED in `#screen-setup` OUTSIDE `#team-inputs` (council Task 11,
2026-10-12: `renderSetup` replaceChildren-wipes `#team-inputs` on every
add/remove/folder load, so the buttons would vanish mid-use; e.g.
beside/below `#about-btn`). Primary: File System Access API (`window.showDirectoryPicker`); read `questions.yaml` via `File.text()`, audio and image files via `URL.createObjectURL` (FSA: walk the directory handle per referenced path; webkitdirectory fallback: match on `webkitRelativePath`). Fallback when the API is absent: hidden `<input type="file" webkitdirectory>` covering the same load path. **Create new**: `showDirectoryPicker()` first (user picks the parent, e.g. Documents), then `parent.getDirectoryHandle(name, { create: true })` writes a template `questions.yaml` (schema from Task 3 stub; the optional `audio:` and `images:` keys appear as COMMENTED example lines — an empty `images:` or `images: []` fails validation, so the template must parse on first load), an `audio/` dir, an `images/` dir, and a README explaining the layout and the `>` block-scalar convention. FSA absent → inline message with instructions, no crash. Loading any source resets `state` to a fresh board (one board per data source). Audio and image files from the folder become object URLs — `URL.revokeObjectURL` all of them on every load/reset (no leaks across sources). A folder bank referencing audio or an image that is NOT in the folder keeps the path as-is: 404 → the existing "no clip"/"no image" note (graceful, no crash).
app.js hooks for this task: `renderError(errors)` (exported — folder loads route to the same error panel) and `setLoader(fn)` (exported — "Try again" reloads the active source, not always the shipped file). `renderSetup`'s input listener is one-time wired at app.js init — do not re-add it per load. `loadBank` calls question.js `resetFlow()` on every successful bank load AND resets `state.scoring`/`state.used` to a fresh game (council fix 2026-10-11 — a mid-game source swap must not carry old-bank scores or old-index used cells into the new bank) — folder loads go through the same path; don't bypass it.

- [x] **Step 2: Verify with Playwright** (done 2026-10-13, ports 8096/8097)

Environment fact, CORRECTED 2026-10-13: this headless Chromium DOES
expose FSA (`showDirectoryPicker` is a function) — the original note was
wrong. But the directory picker is not scriptable via this MCP
(`browser_file_upload` never sees its modal state; the picker's promise
aborts), so the webkitdirectory fallback is still the browser-verified
path; FSA load + create-new writes stay a manual handoff (user's real
Chrome/Edge). Also learned: a `display:none` file input never opens the
chooser on a programmatic `.click()` — `#folder-input` is
visually-hidden (1px, opacity 0) + `tabindex="-1"` instead.
1. Fixtures under `.playwright-mcp/tv-test/` (gitignored; MCP file
   access is restricted to the workspace): `good/` (questions.yaml +
   `audio/clip.wav` + `images/here.png`, referencing a missing
   `images/missing.png` too) and `bad/` (malformed yaml, no `a:`).
2. `browser_file_upload` with the DIRECTORY path (required for
   webkitdirectory inputs; Playwright walks it and sets proper
   `webkitRelativePath`s) → board renders from the folder's bank
   ("Folder Round", 2 cells), setup pre-filled with fresh auto-names,
   Start immediately enabled.
3. Media: audio `src` = `blob:…` (works), found image = `blob:…`,
   missing image = "no image" note; malformed folder → line-numbered
   error panel ("question.a must be a non-empty string"); console clean
   (favicon + the intentional missing.png 404s only).
4. Create-new: prompt() fires + is handleable via MCP; the directory
   picker + `createWritable` writes are not scriptable → manual handoff.
   Template parseability + webkit path matching covered by
   `test/folder.test.mjs` (node 4/4).

- [x] **Step 3: Commit + council** (commit `35e2b32`, pushed)

Council 2026-10-13: backward — clean (every spec bullet re-verified;
single reset funnel `startNewBank` confirmed for shipped + both folder
paths). Forward — 🟠 setup screen measured 871px tall at 1280x720 with
Load folder/Create new ~15px visible and About fully off-screen →
compacted (secondary buttons on one row, tighter rhythm): setup 680px,
about 692px, both fit one TV screen; 🟡 `#folder-input` was an
invisible tab stop → `tabindex="-1"`; 🟡 unguarded FSA media reads
(denied permission = silent stall) → `fileUrl()` helper, NotFoundError
vs other errors distinguished in the panel; 🟠 original commit lacked
the 🤖 prefix → amended + force-with-lease.

---

### Task 10: GitHub Actions → gh-pages deploy

**Files:**
- Create: `.github/workflows/deploy-gh-pages.yml`

**Interfaces:**
- Consumes: the static repo layout (no build)
- Precondition: `gh-pages` branch exists on the remote (seeded empty on 2026-10-10, repopulated by the first real deploy).

- [x] **Step 1: Write the workflow** (done 2026-10-10; inputs fixed after council review)

On push to `main` + `workflow_dispatch`: `actions/checkout@v4`, then `peaceiris/actions-gh-pages@v3` with `github_token: ${{ secrets.GITHUB_TOKEN }}`, `publish_branch: gh-pages`, `publish_dir: .`. No build step — the repo root is the site.
Council fix 2026-10-11: the first deploy used `destination_branch`/`force_sync`, which the `@v3` tag's resolved SHA silently ignores (its inputs are `publish_branch`/`publish_dir`); the branch ended up with only `.nojekyll`. Fixed, redeployed, verified live.

- [x] **Step 2: Verify the workflow parses**

Run: `npx -y js-yaml .github/workflows/deploy-gh-pages.yml > /dev/null && echo "workflow yaml ok"`
Expected: `workflow yaml ok`
(js-yaml is not vendored yet — Task 2 vendors it; npx is the pre-vendor substitute.)

- [x] **Step 3: Verify the live deploy**

Run: `git fetch origin gh-pages && git ls-tree --name-only origin/gh-pages | head`
Expected: repo files (AGENTS.md, docs/, …) — not just `.nojekyll`.
Run: `curl -s -o /dev/null -w '%{http_code}\n' https://chendaniely.github.io/trivia-night/AGENTS.md`
Expected: `200`. (Site root 404s until Task 3 adds `index.html` — expected.)

- [x] **Step 4: Commit + push** (per AGENTS.md, type(scope) format)

- [x] **Step: Handoff for the user (not agent work)** (done —
  evidence: `https://chendaniely.github.io/trivia-night/` has served
  the full app on every deploy since; Pages source is clearly the
  `gh-pages` branch)

Remote already configured. Pushing `main` triggers the deploy. Set the repo's Pages source to the `gh-pages` branch (Settings → Pages → Branch: gh-pages). Site: `https://chendaniely.github.io/trivia-night/`. Until Task 3 lands, the site root has no `index.html`.

---

### Task 11: About page (in-app) — partner request 2026-10-12

**Design:**
- New `#screen-about` section in index.html — STATIC content, no JS
  rendering: what the app is (single-device host app — the TV shows the
  board, the host runs everything from one screen), how to use it
  (setup: teams + mode; Jeopardy: cell → mark teams green/red →
  Reveal/Done; Trivia: the category header is the click target,
  green/deselect; "Back to board" is the mis-tap escape; Setup
  mid-game: same count = resume, different count = fresh game), one
  line that the board is `questions.yaml`, and a link to
  https://github.com/chendaniely/trivia-night.
- "About" = `.btn-quiet` button under Start on the setup screen;
  "Back to setup" on the about screen. "about" joins the SCREENS array.
  No state change — showScreen only.

**Files:**
- Modify: `index.html`, `js/app.js`, `styles.css`

- [x] **Step 1: About screen + wiring + minimal CSS.**
- [x] **Step 2: Verify (Playwright, text-only)** — port 8094: About
  visible with all five how-to items (Setup, Jeopardy, Trivia,
  Mistapped?, Mid-game); link href
  https://github.com/chendaniely/trivia-night; questions.yaml line
  present; Back to setup returns with typed team value intact;
  console only the favicon 404.
- [x] **Step 3: Council + commit.** Council 2026-10-12: backward —
  clean (how-to text re-verified against question.js/board.js/app.js
  behavior). Forward — 🟠 GitHub link was same-tab (a TV-remote tap
  would navigate away and wipe the in-memory game) → target="_blank"
  rel="noopener"; 🟡 link had no focus-visible rule → added; 🟠 Task 9
  Load-folder/Create-new buttons must live outside #team-inputs
  (placement pinned in Task 9 step text).

---

### Task 12: README (human-facing) + AGENTS sync rule — partner request 2026-10-12

**Design:**
- New `README.md` — simple, for HUMAN use: what it is (one paragraph),
  using it at the event (a few lines + pointer to the in-app About
  page), running it locally (`make`, `make serve [PORT]`, `make test`,
  the validation one-liner), customizing (`questions.yaml` schema in a
  handful of lines), where it lives (live URL, auto-deployed on push).
  NO agent-process information — that stays in AGENTS.md.
- `AGENTS.md`: add the sync rule — whenever app behavior changes (new
  screen, command, file, or flow), update README.md in the same change;
  README stays simple and human-facing; agent context lives in
  AGENTS.md only.

**Files:**
- Create: `README.md`
- Modify: `AGENTS.md`

- [x] **Step 1: README + AGENTS rule.**
- [x] **Step 2: Verify** — `make test` 3/3 pass; the README one-liner
  → `6 rounds, 29 questions`; `make serve PORT=8095` → 200; live URL
  already verified serving on the last deploy. README checked for
  agent-jargon: none (no commit/council/plan language).
- [x] **Step 3: Council + commit.** Council 2026-10-12: backward —
  clean (every command + behavioral claim re-verified against the
  repo; schema example parses). Forward — 🟠 "The whole board lives in
  one file" would go false after Task 9 → "The shipped board…"; 🟠 the
  sync rule covered only README.md while the About screen carries the
  same falsifiable line → rule now names both targets and pins "same
  commit (at latest, the task's final commit)".

---

### Task 13: Reveal answer in trivia mode — partner request 2026-10-13

**Design:** Port the existing Jeopardy reveal pattern into the column
flow: `colRevealed` flag (reset per question — startColumn, next
advance, back-to-board, resetFlow), "Reveal answer" `.btn-secondary`
between Back and Next, `.answer-text` paragraph appended when revealed,
button hidden once revealed (one-way, same as Jeopardy). No scoring
change — Reveal only shows the answer on screen. Sync rule: README
trivia bullet + About "Trivia:" item mention Reveal.

**Files:**
- Modify: `js/question.js`, `README.md`, `index.html` (About item),
  `styles.css` (council fit fix)

- [x] **Step 1: Implement + docs.** (commit `aa5f30d`)
- [x] **Step 2: Verify (Playwright, text-only)** — port 8098: trivia
  mode controls = [Back to board, Reveal answer, Next]; Reveal shows
  `.answer-text` ("Argo") and the button disappears; green mark
  survives reveal; Next resets reveal for question 2 of 5 (Reveal
  button back, no answer text); console clean (favicon only).
- [x] **Step 3: Council + commit.** Council 2026-10-13: backward — NO
  MISMATCHES (flag reset at all four colMarks sites, answer paragraph
  at the same DOM position as Jeopardy, no leak paths, docs match).
  Forward — 🟠 worst case (longest shipped q + revealed answer + 3 long
  team names wrapping to 2 rows) put controls 70px below the 720 fold
  (measured 790px, pre-existing pattern in the jeopardy renderer too)
  → fit fix commit (padding 40→24, wrap gap 30→20, answer 48→42px,
  team buttons 34/18→30/14): measured worst case now 700px.

---

## Claude Code council pass (2026-10-14)

Partner request 2026-10-14: a full council review of the qwen build plus
the deferred visual + FSA checks, then "go fix all issues". Findings came
from four review seats (backward vs plan, JS bug hunt, question-bank
fact-check, event/TV readiness) plus Chrome runs (FSA via an OPFS-backed
picker stub, 1280×720 + 1920×1080 screenshots, viewport fit
measurements). Tasks 14–23 fix them, one task per area, on branch
`claude/council-fixes`. Commits use the AGENTS.md format with the
implementing model's own Co-Authored-By line.

---

### Task 14: Question bank corrections (fact-check)

Council fact-check 2026-10-14: 7 wrong answers (4 invented by the
drafting model: The Room "Lenny", Eraserhead "balls", Home Alone
"Richie", Rhode Island "verb"; plus Thalmor = Altmer not Dunmer, three
Big Five winners not one, The Artist is also a silent Best Picture
winner) and 6 shaky/ambiguous ones. Two of the wrong ones were
introduced by the Task 8 council's own "fixes".

**Files:**
- Modify: `questions.yaml` (only)

- [ ] **Step 1: Replace `questions.yaml` with exactly this content**

```yaml
title: "Trivia Night"
rounds:
  - name: "Movies: Oscar"
    questions:
      - q: "Which 2012 film won Best Picture at the Oscars, beating 'Lincoln' and 'Django Unchained'?"
        a: "Argo"
      - q: "Which actress holds the record for the most Best Actress wins, with four?"
        a: "Katharine Hepburn"
      - q: >
          'It Happened One Night' (1934) was the first of only three films
          to win the "Big Five" Oscars — Picture, Director, Actor, Actress
          and Screenplay. Who directed it?
        a: "Frank Capra"
      - q: >
          Truffaut's 'Day for Night' (1973) won the only Oscar any of his
          films ever received. In which category?
        a: "Best Foreign Language Film (now International Feature Film)"
      - q: >
          The first Best Picture winner (1927–28), a WWI aviation epic,
          stayed the only silent film to win until 'The Artist' (2011).
          Name it.
        a: "Wings"

  - name: "Movies: Cult Classics"
    questions:
      - q: >
          In 'The Room' (2003), Johnny greets his best friend — the one
          Lisa seduces — with "Oh hi, ___". Name him.
        a: "Mark"
      - q: >
          In 'A Clockwork Orange' (1971), Alex DeLarge is obsessed with
          violence and the music of which composer?
        a: "Beethoven"
      - q: "In 'Eraserhead' (1977), Henry's severed head is taken to a factory and made into what?"
        a: "Pencil erasers"
      - q: "Who directed 'Don't Look Now' (1973), famous for its red raincoat scene?"
        a: "Nicolas Roeg"
      - q: >
          In 'The Wicker Man' (1973), the failure of which crop drives the
          islanders of Summerisle to human sacrifice?
        a: "Apples (the apple harvest)"

  - name: "Movies: Childhoods"
    questions:
      - q: "Which Toy Story character shouts 'To infinity and beyond!'?"
        a: "Buzz Lightyear"
      - q: "In 'The Lion King', what is the name of Simba's warthog friend?"
        a: "Pumbaa"
      - q: >
          In 'My Neighbor Totoro' (1988), what are the little black dust
          creatures that infest Satsuki and Mei's new house?
        a: "Soot sprites (susuwatari / makkuro kurosuke)"
      - q: >
          In 'Home Alone' (1990), what is the black-and-white gangster
          movie Kevin plays to scare off visitors?
        a: "Angels with Filthy Souls"
      - q: >
          In 'The Sandlot' (1992), the kids call the huge dog behind the
          fence "The Beast". What is its real name?
        a: "Hercules"

  # Music: placeholder text questions. Replace with listening questions
  # once real clips are dropped into audio/ (demo clips stay in
  # audio/demo/ for folder-mode use).
  - name: "Music"
    questions:
      - q: >
          Which 1982 Michael Jackson album remains the best-selling
          studio album of all time?
        a: "Thriller"
      - q: "Which artist released the album 'Purple Rain' in 1984?"
        a: "Prince (and the Revolution)"
      - q: >
          Which 1979 Pink Floyd concept album tells the story of a rock
          star building a wall between himself and the world?
        a: "The Wall"
      - q: >
          Which magazine's "500 Greatest Albums" list put the Beatles'
          'Sgt. Pepper' at No. 1 in 2003 and 2012, then dethroned it for
          'What's Going On' in 2020?
        a: "Rolling Stone"

  - name: "Nerd Culture"
    questions:
      - q: "In the 'Legend of Zelda' series, what is the name of Link's horse?"
        a: "Epona"
      - q: "In 'Ocarina of Time', what is the name of the fairy who follows (and annoys) Link?"
        a: "Navi"
      - q: "In 'Minecraft', which mob drops the string you need to craft a fishing rod?"
        a: "Spiders (cave spiders and witches drop it too)"
      - q: >
          In 'Doctor Who', who is the Doctor's very first companion, and
          what is their relationship to the Doctor?
        a: "Susan Foreman — his granddaughter"
      - q: "In 'The Elder Scrolls V: Skyrim', the Thalmor are members of which race?"
        a: "The High Elves (Altmer)"

  - name: "Words"
    questions:
      - q: "Which cartoon character's nose grows when he lies?"
        a: "Pinocchio"
      - q: "What is a group of crows called?"
        a: "A murder"
      - q: "How many US state names contain the letter X?"
        a: "Two — Texas and New Mexico"
      - q: "Which is the only US state whose name can be typed using just one row of a QWERTY keyboard?"
        a: "Alaska (all on the middle row)"
      - q: >
          Name either of the two classic English words that contain all
          five vowels exactly once, in alphabetical order.
        a: "Facetious or abstemious"
```

- [ ] **Step 2: Verify** — the README one-liner prints `6 rounds, 29
  questions`; `make test` green; a node check that the Alaska
  (one-row) and X-state answers hold over all 50 state names.
- [ ] **Step 3: Commit** — `fix(bank): 🤖 correct 7 wrong answers and 6 shaky questions`.

---

### Task 15: Validation messages a host can act on

Bug hunt 2026-10-14: misspelled optional keys are silently ignored
(`image:` instead of `images:` validates ok and the image never shows —
the spec's "silent load failure" anti-goal); schema-error locations are
0-based array paths (`rounds[2].questions[3]` = round 3, question 4);
`a: 1984` / `a: true` fail with only "must be a non-empty string".

Ruling: schema errors get a human locator, not a line number — the
vendored js-yaml 5 exposes no node positions (no `listener` option), and
a text-scanning line guesser would sometimes point at the wrong line.
YAML syntax errors keep their real line numbers (unchanged).

**Files:**
- Modify: `js/validate.js`, `test/validate.test.mjs`

- [ ] **Step 1: Failing tests first** in `test/validate.test.mjs`:
  - `image: "images/x.png"` on a question → `ok:false`, message contains
    `unknown key "image"` and `did you mean "images"`.
  - `Audio:` (wrong case) → unknown key with `did you mean "audio"`;
    `point: 300` → `did you mean "points"`; an unrelated key `foo:` →
    unknown key with no suggestion.
  - unknown keys at round level (allowed: `name`, `questions`) and top
    level (allowed: `title`, `rounds`) are reported too.
  - `a: 1984` → message tells the host to quote it, containing
    `a: "1984"`; same shape for `a: true` and for `q:`.
  - locations are 1-based and human: an error in the 2nd question of
    the 1st round (named "Movies") has `where` ===
    `round 1 "Movies", question 2`; a round-level error has `where` ===
    `round 1 "Movies"` (or `round 1` when the name is missing/invalid).
  - update the existing assertions that expect `rounds[0].questions[1]`.
- [ ] **Step 2: Implement** — allowed-key sets per level; suggestion =
  case-insensitive equal, or a singular/plural pair (`image`↔`images`,
  `point`↔`points`), or edit distance ≤ 2 against the allowed set;
  first match wins. Keep `{ line?, where, message }` and the
  never-half-succeeds rule; `renderError` in app.js needs no change
  (it prints `where: message`).
- [ ] **Step 3: Verify** — `node --test` green; the README one-liner on
  the shipped `questions.yaml` still prints `6 rounds, 29 questions`;
  `NEW_TEMPLATE` in `js/folder.js` still parses (folder test).
- [ ] **Step 4: Commit** — `fix(validate): 🤖 …`. README "Writing your own
  questions" gains one line: unknown keys are reported (typo guard).

---

### Task 16: Create new — picker first, never overwrite

Chrome 155 runs 2026-10-14 (real FSA handles from OPFS behind a stubbed
picker; the real picker for the gesture check):
1. `prompt()` runs BEFORE `showDirectoryPicker()`. If the host takes
   longer than ~5 s to type the folder name, the click's user activation
   has expired and the REAL picker throws `SecurityError: Must be
   handling a user gesture to show a file picker` (reproduced with a 7 s
   prompt; a 0.3 s prompt opens the picker).
2. The picker opens read-only (no `mode`), so the writes rely on an
   implicit second permission prompt.
3. `createNew` on an existing folder name silently truncates and
   replaces that folder's `questions.yaml` and `README.md` (reproduced:
   a pre-seeded host bank was overwritten by the template).

**Files:**
- Modify: `js/app.js` (Create new handler), `js/folder.js` (`createNew`),
  `test/folder.test.mjs`

- [ ] **Step 1: Failing tests** in `test/folder.test.mjs` with a small
  in-memory fake of the FileSystemDirectoryHandle API (getDirectoryHandle
  / getFileHandle with `{create}`, NotFoundError DOMException-shaped
  errors with `name === "NotFoundError"`, createWritable → write/close):
  - `createNew(parent, "night")` on an empty parent creates
    `night/questions.yaml` (=== `NEW_TEMPLATE`), `night/README.md`
    (=== `NEW_FOLDER_README`), `night/audio/`, `night/images/`.
  - `createNew(parent, "night")` when `night/` already exists rejects
    with an error whose `name === "ExistsError"` and whose message names
    the folder, and leaves the existing `night/questions.yaml` content
    byte-identical.
  - a non-NotFound error from the existence probe propagates (not
    treated as "free to create").
- [ ] **Step 2: Implement**
  - `createNew`: probe `parent.getDirectoryHandle(name)` WITHOUT create
    first; resolves → throw `ExistsError` ("a folder named "<name>"
    already exists there — pick another name"); `NotFoundError` →
    create as today; any other error → rethrow.
  - Create new handler in app.js: call
    `showDirectoryPicker({ mode: "readwrite", startIn: "documents" })`
    FIRST (consumes the click's activation and grants write in one
    prompt), THEN `prompt("New game folder name", "my-trivia-night")`;
    cancel/empty → return quietly; ExistsError → show its message in
    `#folder-msg` (the setup screen stays). Success message unchanged.
  - Load folder's picker call is unchanged (read-only is right there).
- [ ] **Step 3: Verify in Chrome** (Playwright, `channel: "chrome"`, a
  fresh `make serve PORT=…`): stub `window.showDirectoryPicker` to return
  an OPFS directory handle (`navigator.storage.getDirectory()`) and to
  record `navigator.userActivation.isActive` at call time. Reference
  script: `<scratchpad>/fsa-check.mjs` (the controller's run). Assert:
  picker receives `{mode:"readwrite", …}`; user activation is still
  active at picker time even when the prompt dialog is answered after
  7 s; Create new → files written → Load folder on the result → board
  "Round One" with 100/200; Create new again with the same name → the
  ExistsError message shows and the folder's `questions.yaml` is
  unchanged.
- [ ] **Step 4: Commit** — `fix(folder): 🤖 …`. The README/About Create
  new lines stay accurate (check; adjust only if wording now misleads).

---

### Task 17: Loading flows — error-screen exit, shared paths, carried names

Council 2026-10-14: (1) the error screen only has "Try again": mid-game,
Setup → Load folder → a bad folder → cancel the re-pick = stranded, and
the in-memory game is only reachable by a reload (which wipes it).
(2) "Try again" failures are written to `#folder-msg`, which lives on the
hidden setup screen — nothing visible happens. (3) Non-Chromium
fallback: `#folder-input` sits INSIDE `#screen-setup`; while the error
screen shows, setup is `display:none`, so `folderInput.click()` from Try
again likely never opens the chooser (the Task 9 note: a file input in
a `display:none` subtree does not open). (4) Media path normalization
differs between the FSA and webkitdirectory paths (`/images/x.png`
resolves via FSA only; `././x` and `.\x` fail on both), and shipped-bank
paths containing `#` or `?` break the URL. (5) Every bank load re-rolls
random team names, so board 2 of the night means retyping every team
(the Task 7.9 council's deferred "draft-carry across bank loads").
(6) `bank.title` is validated but never shown.

**Files:**
- Modify: `index.html`, `js/app.js`, `js/folder.js`, `js/question.js`,
  `styles.css` (only if the new button needs it), `test/folder.test.mjs`

- [ ] **Step 1: Error-screen exit** — `#screen-error` gains a
  `Back to setup` button (`#error-back-btn`, `.btn-quiet`) after
  `#retry-btn`, visible only when a bank is loaded (`state.bank !==
  null`); it calls `showScreen("setup")` and changes no state. A load
  failure while a game is in memory leaves that game intact (verify:
  scores + used cells survive bad-folder → Back to setup → Start with the
  same teams = resume).
- [ ] **Step 2: Visible failures** — Load-folder picker failures other
  than AbortError go through `renderError([{ where: "folder", message }])`
  (the error screen is always visible and now has an exit). Create new
  messages stay in `#folder-msg` (Create new lives on setup only).
- [ ] **Step 3: Fallback input reachable** — move `#folder-input` out of
  `#screen-setup` (a direct child of `<main>`), keeping it visually
  hidden + `tabindex="-1"`; its `change` handler is unchanged.
- [ ] **Step 4: One path normalizer** — export `normPath(p)` from
  `js/folder.js`: trim; backslashes → `/`; drop empty and `.` segments
  (so leading `/`, `./`, `././` and `//` all collapse); used by BOTH the
  FSA walk and the webkitRelativePath match. Node tests cover `/a/b.png`,
  `./a/b.png`, `././a//b.png`, `.\\a\\b.png`, `a/./b.png` on the
  webkitdirectory path (the FSA walk shares the function). Case-sensitive
  matching stays (filesystems differ; a case mismatch degrades to the
  note as today). In `js/question.js`, a media src that is not a
  `blob:`/`data:`/`http(s):` URL is percent-encoded per path segment
  (`split("/").map(encodeURIComponent).join("/")`) so `#`/`?`/spaces in
  shipped-bank filenames load.
- [ ] **Step 5: Carry team names across bank loads** — `startNewBank`
  pre-fills the setup rows with the CURRENT row values when every row is
  non-empty (fresh scores, same names); otherwise (app start, or rows
  blank) the two random names as today. `state.teamNames` still resets
  (no stale state).
- [ ] **Step 6: Show the bank title** — the setup `<h1>` shows
  `state.bank.title` (shipped bank: "Trivia Night", unchanged look);
  `document.title` follows it.
- [ ] **Step 7: Verify (Playwright, Chrome, fresh port, read your
  screenshots)** — bad folder mid-game → error screen shows Back to
  setup → back → same-count Start resumes scores/used cells; Try again
  → cancel → still on the error screen with Back available; folder with
  `/images/x.png` and `./audio/x.wav` refs loads both media via FSA stub
  AND webkitdirectory upload; second folder load keeps typed team names;
  folder bank title shows in the setup h1. `node --test` green.
- [ ] **Step 8: Commit(s)** — `fix(app): 🤖 …` / `fix(folder): 🤖 …`;
  README + About updated in the same commit if any human-visible
  behavior they describe changed (Back to setup on the error screen;
  names carry across boards).

---

### Task 18: Game safety — saved games, guarded resets, team identity

Council 2026-10-14 (🔴): all game state lives in memory (`app.js`
`state`); a refresh, Cmd-R, a trackpad swipe-back, a TV-remote Back or a
discarded tab wipes the night. "Reset scores" (board.js) clears scores
AND every played cell with one press and no confirm, and it is the
first button a D-pad lands on below the grid. 🟠: mid-game Setup →
remove team A → add a late team (count unchanged) → Start = `sameGame`
renames by index, so A's points silently move to B, B's to C, C's to the
new team. 🟡: a double-click on Reveal lands its second click on Done
(Done slides into Reveal's slot), and a double-click on Next can pass
the following question at 0.

Partner rule kept (Task 7.5): same teams = resume; a changed team list =
fresh game. This task makes "same teams" mean same team IDENTITY, and
guards the destructive paths with a confirm.

**Files:**
- Modify: `js/scoring.js`, `test/scoring.test.mjs`, `js/app.js`,
  `js/board.js`, `js/question.js`, `index.html` (About), `README.md`
- May add: `js/persist.js` (+ `test/persist.test.mjs`) if the
  save/restore logic is cleaner as its own pure module

- [ ] **Step 1: Scoring snapshot (pure, TDD)** — `Scoring.snapshot()` →
  plain JSON-safe `{ teams: [{name, points}], log: [[roundName,
  [{teamIdx, points}]]] }`; `restoreScoring(snapshot)` → a Scoring whose
  `teams`, `roundTotal`, `roundTeamTotal` match the original. Tests:
  round-trip through `JSON.stringify`/`JSON.parse`, then `give` still
  works on the restored object.
- [ ] **Step 2: Saved game** — key `trivia-night:game` in localStorage
  (every access in try/catch: private mode / disabled storage must never
  break play). Snapshot `{ v: 1, bankKey, mode, scoring:
  Scoring.snapshot(), used: [...keys], savedAt }`. `bankKey` = a short
  hash (e.g. FNV-1a 32-bit hex) of the raw `questions.yaml` text of the
  loaded source (shipped or folder), computed where the text is read and
  passed into `startNewBank`. Save after Start, after `done()`, after
  every `nextQuestion()` award, after Reset game, and after a resume.
- [ ] **Step 3: Resume** — when a bank loads and a saved game with the
  same `bankKey` has progress (any used cell or any non-zero score), the
  setup screen shows a primary `Resume game` button (`#resume-btn`) above
  Start with a one-line summary (team names + scores), and the rows are
  pre-filled with the saved names. Resume restores mode, names, scoring
  and used cells and shows the board. Pressing Start instead →
  `confirm("Discard the saved game in progress and start a new one?")`;
  cancel = stay on setup.
- [ ] **Step 4: Leave guards** — while a game has progress:
  `beforeunload` asks before leaving (`preventDefault` + `returnValue =
  ""`); on Start, `history.pushState` one entry and on `popstate` push it
  back — if the question screen is showing, run that screen's Back to
  board path (same as its button); on the tally screen, go to the board;
  elsewhere stay put.
- [ ] **Step 5: Reset game** — the board's "Reset scores" button becomes
  `Reset game` (`.btn-quiet`, placed AFTER Setup), and asks
  `confirm("Reset all scores and clear the board? This can't be undone.")`
  before clearing; the saved game is updated after a confirmed reset.
- [ ] **Step 6: Team identity on setup** — rows carry the index of the
  scoring team they came from (rows built for a running game get it;
  rows added later have none; Remove keeps the survivors' indices).
  Start resumes (rename in place, scores + used kept) ONLY when the rows
  are exactly the running game's teams in order (indices 0..n-1, none
  added or removed). Any other change while a game has progress →
  `confirm("The team list changed, so this starts a fresh game — all
  scores reset. Continue?")`; cancel = stay on setup.
- [ ] **Step 7: Input lock** — ignore clicks for 350 ms after a screen
  change and after Reveal / Next re-render the question screen (one
  capture-phase document listener + a `lockInput()` helper called by
  `showScreen` and those two renders). Team mark taps do NOT lock (fast
  green → red cycling stays possible).
- [ ] **Step 8: Verify (Playwright, Chrome, fresh port, read your
  screenshots)** — play 2 Jeopardy cells, `page.reload()` → Resume shows
  the right summary → resume → scores + used cells back; same for a
  half-played trivia column (awarded questions persist); Start instead of
  Resume → confirm (dismiss = still on setup; accept = fresh); Reset game
  → confirm dismiss keeps everything; remove+add team → confirm; same
  teams → resume without a prompt; `history.back()` on a question screen
  → board, cell not consumed; double-click on Reveal does not trigger
  Done; storage disabled (e.g. `localStorage` throwing via
  `addInitScript`) → the game still plays. `node --test` green.
- [ ] **Step 9: Commit(s)** — `feat(game): 🤖 …` etc.; README + About
  updated in the same commit: Resume after a refresh, Reset game asks
  first, changing the team list starts fresh (asks first).

---

### Task 19: Question media — clips keep playing, dark controls

Chrome run 2026-10-14: marking a team or pressing Reveal re-renders the
question screen and builds a NEW `<audio>`; the playing element is
removed, which pauses it — the clip stops and rewinds to 0:00 mid "Name
That Tune". Conversely Done/Back/last-Next only HIDE the screen, so a
playing clip keeps playing under the board with no control. The native
player renders light (white pill) on the dark theme.

**Files:**
- Modify: `js/question.js`, `styles.css`

- [ ] **Step 1: Build media once per question** — the audio block and
  the image block are created once when a question opens (both
  renderers) and the SAME nodes are re-appended on every re-render of
  that question (marks, Reveal); a new question (cell, next column
  question) builds fresh nodes. Missing-clip / missing-image notes keep
  working.
- [ ] **Step 2: Stop audio on leave** — pause any playing question
  audio on Done, Back to board (both modes), Next (advance and last →
  tally), and `resetFlow()`.
- [ ] **Step 3: Dark native controls** — `:root { color-scheme: dark; }`
  (audio controls, radios, scrollbars follow the theme). Check the
  radios and inputs still look right in a screenshot.
- [ ] **Step 4: Verify (Playwright, Chrome, fresh port, read your
  screenshots)** — folder bank via the OPFS picker stub (reference:
  `<scratchpad>/audio-rerender.mjs`, which reproduced the bug): play the
  clip, mark a team, Reveal → the same element is still playing and
  `currentTime` advanced; Done → audio paused; trivia column Next →
  previous clip paused. Screenshot shows a dark audio control.
- [ ] **Step 5: Commit** — `fix(question): 🤖 …`.

---

### Task 20: Layout fit — the board fits the screens it will run on

Chrome measurements 2026-10-14 (shipped bank, 3 teams): the board page
is ~946 px tall — it scrolls at 1280×720 (+225 px), 1440×789 windowed
MacBook Air (+157), 1512×862 windowed MacBook Pro (+84); it fits only at
1512×982 fullscreen and 1920×1080. The 500 row and the action buttons
sit below the fold. At 1920×1080 the board stays capped at 1200 px wide
(`.screen` max-width 1280). Category header "Movies: Childhoods" breaks
mid-word ("Childhood / s") at both sizes (`overflow-wrap: break-word`).
A folder question with a 640×480 image is 1066 px tall at 1280×720 — the
question text, team buttons and Done are below the fold. Setup with 3
team rows is 786 px at 1280×720 (Load folder / Create new / About cut
off).

**Files:**
- Modify: `styles.css`; `js/board.js` / `js/question.js` only if markup
  must change for the layout

- [ ] **Step 1: Board fits** — viewport-relative sizing (e.g. `clamp()`
  with `vh`/`vw`) for board cell height + numeral size, header type +
  padding, scoreboard plaques, gaps and screen padding, so that the
  shipped 6×5 board with 2–4 teams has NO vertical scroll at 1280×720,
  1440×789, 1512×862, 1920×1080 in both modes (trivia adds the hint
  line), and at 1920×1080 the grid uses ≥ 85% of the viewport width.
  Numerals never smaller than 32 px at 720p; nothing smaller than today
  at 1080p.
- [ ] **Step 2: Headers never split words** — no mid-word breaks in any
  shipped header at any of the sizes above (shrink type / balance
  wrapping; `overflow-wrap: break-word` remains only as a last resort
  for a single absurdly long word).
- [ ] **Step 3: Image questions fit** — a question with one 640×480 image
  + a 2-line question + 3 team buttons + controls, both before and after
  Reveal, has no vertical scroll at 1280×720 and 1920×1080 (cap image
  height by viewport, or put image and text side by side on landscape —
  builder's call; images stay as large as fits).
- [ ] **Step 4: Setup fits with 4 team rows** at 1280×720.
- [ ] **Step 5: Verify (Playwright, Chrome, fresh port)** — a script
  measuring `document.documentElement.scrollHeight` vs viewport for every
  size × mode × screen above (reference: `<scratchpad>/fit.mjs` and
  `<scratchpad>/shots.mjs`), plus screenshots you READ at 1280×720 and
  1920×1080 of setup, both boards, a revealed question, an image
  question, tally. Orange stays primary action + scores + answer only;
  legibility at TV distance must not drop (judge from the screenshots).
  Save final shots to `.playwright-mcp/claude-pass-2026-10-14/after/`.
- [ ] **Step 6: Commit** — `style(layout): 🤖 …`.

---

### Task 21: Remote navigation — D-pad can drive the board

Council 2026-10-14: board cells and category headers are `<div>`s with
click handlers — not focusable, no key handling, `:hover`-only styling.
With a focus-navigation TV remote (no pointer) no question can be
opened. Every mark/reveal re-render drops focus to `<body>`.

**Files:**
- Modify: `js/board.js`, `js/question.js`, `styles.css`

- [ ] **Step 1: Buttons** — clickable board cells (Jeopardy) and
  clickable category headers (Trivia) render as `<button type="button">`
  keeping their classes and look (reset button chrome: font, color,
  width, background from the existing tier/panel rules). Inert cells
  (used, trivia-mode cells, finished headers) stay non-focusable.
  `:focus-visible` on cells/headers: the same 3px `var(--text)` outline
  used by buttons, plus the hover fill.
- [ ] **Step 2: Focus survives re-renders** — question screens restore
  focus to the equivalent control after a mark/Reveal re-render (e.g. a
  `data-focus` key per team button / control); when the board renders
  after a question, focus goes to the cell that was just played's
  position's next clickable cell, or the first clickable cell/header.
- [ ] **Step 3: Verify (Playwright, Chrome, fresh port)** — keyboard
  only (Tab/Shift-Tab/Enter/Space; arrow keys not required): open a
  Jeopardy cell, mark a team twice (green → red), Reveal, Done, and run
  a Trivia column to the tally and back, never touching the mouse;
  screenshots (READ them) show a visible focus ring on a cell and on a
  header. Layout from Task 20 unchanged (re-run its fit script).
- [ ] **Step 4: Commit** — `feat(board): 🤖 …`.

---

### Task 22: Infra + TV compatibility

Council 2026-10-14: `.gitignore` ignores `audio/*` but not `images/*`
(host photos would be committed and published — spec says not);
`tools/local-server.py` binds `127.0.0.1` so the TV's own browser can't
reach the Mac (spec: the TV may open the Mac's IP); `.m4a` is served as
`audio/mp4a-latm`; Python tooling runs on bare `python3` (spec + partner
rule: uv); `package.json` `test` is npm's failing stub and `main` points
at a missing file; the deploy workflow publishes with no test/validation
gate and on deprecated majors (`actions/checkout@v4`,
`peaceiris/actions-gh-pages@v3`; current: v7.0.1 / v4.1.0 — re-check with
`gh api repos/<owner>/<repo>/releases/latest`); the app needs Chrome 86 /
Safari 14 (`replaceChildren` is the Chrome 86 floor; vendored yaml.js
`??=` needs Chrome 85) and on an older TV browser every section stays
hidden → a blank navy page with no explanation.

**Files:**
- Modify: `.gitignore`, `tools/local-server.py`, `Makefile`,
  `package.json`, `.github/workflows/deploy-gh-pages.yml`, `index.html`,
  `js/app.js` (hide the boot note), `styles.css`, `README.md`

- [ ] **Step 1: gitignore** — add `images/*` + `!images/demo/` with the
  same copyright comment style as `audio/`. Verify `git check-ignore
  images/x.png` ignores and `images/demo/blue-checker.png` stays tracked.
- [ ] **Step 2: Local server** — PEP 723 header (no dependencies,
  `requires-python = ">=3.9"`); optional second arg HOST (default
  `127.0.0.1`); `.m4a` → `audio/mp4`; on start print the URL(s) to open
  (for a LAN bind, the Mac's LAN IP). Makefile: `serve` = `uv run
  tools/local-server.py $(PORT)`, new `serve-lan` = same with `0.0.0.0`.
  Verify both targets answer 200 (`curl` from the Mac on 127.0.0.1 and on
  the LAN IP for serve-lan).
- [ ] **Step 3: package.json** — `"test": "node --test"`; remove `main`.
- [ ] **Step 4: Deploy gate** — the workflow runs `node --test` and the
  README bank one-liner before publishing (failure = no deploy); bump to
  the current majors (keep `publish_branch: gh-pages`, `publish_dir: .`,
  `github_token`; read the v4 README to confirm the inputs are
  unchanged). Validate the workflow YAML parses (`npx -y js-yaml …`).
  Do NOT push; the deploy is exercised when the partner merges.
- [ ] **Step 5: Old-browser fallback** — `index.html` gets a classic
  (non-module) inline polyfill for `Element.prototype.replaceChildren`
  (built on `textContent = ""` + `append`), and a visible-by-default
  `#boot` note inside `<main>` ("Loading… If this message stays, this
  browser is too old for the app — mirror the Mac's screen instead.")
  that `showScreen` hides on first call. Verify in Chrome that the note
  never shows once the app loads (screenshot), and that with the module
  blocked (Playwright `route` abort for `js/app.js`) the note is what
  the TV would show.
- [ ] **Step 6: README** — a short "Putting it on the TV" section: (1)
  mirror the Mac (recommended: everything works, including Load folder
  and real clips); (2) the TV's browser on the live URL (shipped board
  only — your real clips/photos aren't in the repo); (3) the TV's browser
  on the Mac over Wi-Fi with `make serve-lan` (macOS may ask to allow
  incoming connections; Load folder on the TV reads the TV's files, not
  the Mac's). Plus: "Test on the actual TV before the night"; the repo
  is public, so keep the real night's questions in a local folder (Load
  folder) or `question-drafts/`, not in the shipped `questions.yaml`;
  commands use `uv` (requires uv + node). Audio line: `.m4a`/`.mp3` play
  best on TV browsers; `.wav` works.
- [ ] **Step 7: Commit(s)** — `build(…)`/`ci(deploy)`/`fix(app)` per
  area, 🤖 prefix.

---

### Task 23: Docs reconciliation + plan/spec catch-up

Backward pass 2026-10-14 found stale text. Bring README, About, spec
and plan in line with the code as it stands after Tasks 14–22.

**Files:**
- Modify: `README.md`, `index.html` (About only), `styles.css` (one
  comment), `docs/superpowers/specs/2026-10-10-trivia-night-design.md`,
  `docs/superpowers/plans/2026-10-10-trivia-night.md`

- [ ] **Step 1: Human docs** — "dollar cell(s)" → "point cell(s)"
  (README + About; spec: points, not dollars); About "Mistapped?" line
  accurate (Back to board discards that question's marks and keeps the
  cell and scores); every behavior added in Tasks 15–22 that a host
  meets is in README and About (Resume, Reset game confirm, team-list
  change confirm, error-screen Back, carried names, typo-guard
  validation); `styles.css` About comment says 22px (matches code).
- [ ] **Step 2: Spec** — team count "2 or more (no cap, Task 7.9)"
  everywhere it says 2–4 / "4 teams max"; trivia loop includes the
  optional Reveal (Task 13); YAML schema lists `images:`; validation
  sentence: syntax errors carry line numbers, schema errors carry a
  1-based round/question locator (Task 15 ruling); demo media sentence:
  committed demo clips/images exist to exercise the media paths — the
  shipped bank references none; saved-game resume (Task 18) and the
  three TV routes (Task 22) recorded under Decided/Builder's calls as
  builder's calls flagged for review; no separate "final scoreboard"
  screen — the board's scoreboard is it.
- [ ] **Step 3: Plan** — Global Constraints "Teams: 2–4" → no cap;
  Review Focus 5 → "Stale taps (after Done/Next/Back, or a finished
  column header) are ignored; scores never double-count. (Tasks 7.5,
  7.8)"; Shared interfaces + File structure match the real exports and
  files (teams.js, folder.js exports, question.js exports, `pointsFor`,
  `renderError`, `setLoader`, `images?`, "about" screen, scoring
  snapshot/restore, any new module); Task 4 "no placeholder cells" notes
  the invisible `.board-gap` spacer; Task 7.7/7.8 px records annotated
  with the Task 13/20 values where they changed; Task 11 "all five
  how-to items" → current count. Do NOT rewrite history records — append
  "(superseded: …)" notes, the way earlier tasks did.
- [ ] **Step 4: Deferred section** — mark item 1 (visual review) and
  item 2 (demo media) done 2026-10-14 with one-line evidence (shots in
  `.playwright-mcp/claude-pass-2026-10-14/`; WAV pitches 440/523/
  440→523→659 Hz, no edge clicks, −8 dBFS peak; PNGs clean); item 3
  (font on the real TV) stays open; add item 4: the 30-second real-picker
  check (Create new → allow edit → Load folder on the result) in the
  partner's Chrome, and item 5: open the live URL on the friend's TV.
- [ ] **Step 5: Commit** — `docs(…): 🤖 …`.

---

## Deferred to the final Claude Code pass (partner note 2026-10-12)

The working model (qwen3.8 27b) is TEXT-ONLY: it cannot read images.
Everything below needs image input and is deliberately left to a
multimodal model. The partner will run a Claude Code pass at the end to
tie up loose ends — this is the list:

1. **UI pass visual review (Task 7.7):** take fresh 1280×720 screenshots
   of all five screens (setup, board, question with a revealed answer,
   trivia column, tally) against the no-store server and judge: board
   legibility at TV distance, font rendering, orange/blue role
   discipline (orange = primary action + scores only), motion feel
   (reveal + screen fade). Before-shots from 2026-10-11 are in
   `.playwright-mcp/ui-before-*.png` (gitignored, untracked).
2. **Demo media eyeball:** the two self-generated PNGs in `images/demo/`
   and the demo WAVs in `audio/demo/` were verified by bytes/dimensions,
   never looked at.
3. **Font fallback on a real TV:** confirm the self-hosted woff2 render
   (not the swap fallback) on the actual TV browser at the event.
