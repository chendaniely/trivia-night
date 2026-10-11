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
Expected: setup screen visible; Start disabled; type two team names → Start enabled; click Start → board screen visible (empty grid fine — Task 4 fills it).

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
  `audio:`). Validated like audio: not a list, or a non-empty-string item
  missing → schema error with the question's `where`.
- Renderer: `imageBlock` in BOTH renderers (Jeopardy + trivia column),
  between audio and question text; TV-sized (max 640×480, contain); a
  missing image swaps for a "no image — show it from any device" note
  (same graceful-degrade pattern as audio; question stays playable).
- Demo: `tools/make-demo-images.mjs` generates 2 self-generated PNGs into
  committed `images/demo/` (no deps: hand-built PNG + node:zlib); the stub
  bank references one demo image and one MISSING image as the fallback
  probe (mirrors the missing.wav probe; neither survives the Task 8 bank
  replace — the shipped bank carries no media refs, the host supplies
  content in folder mode).
- Scope call: text/audio/images only; video or other media types can reuse
  the same list-of-paths + renderer pattern later (not built now).

**Files:**
- Modify: `js/validate.js`, `test/validate.test.mjs`, `js/question.js`, `styles.css`, `questions.yaml` (stub)
- Add: `tools/make-demo-images.mjs`, `images/demo/*.png`

- [ ] **Step 1: Schema + tests** — images validation in `parseBank` + 3
  test cases (list ok / not a list / bad item). `node --test` green.

- [ ] **Step 2: Renderer** — `imageBlock` in both renderers + CSS
  (`.images-block`, TV-sized img, no-image note).

- [ ] **Step 3: Demo images + stub refs** — generator, 2 PNGs in
  `images/demo/`, stub question refs (demo image + missing probe).

- [ ] **Step 4: Verify (Playwright)** — Jeopardy question shows the demo
  image (`naturalWidth > 0`); missing-image question shows the note;
  trivia column renderer shows the image too.

- [ ] **Step 5: Commit** — one commit per step + this plan update.

---

### Task 8: Full starter question bank

**Files:**
- Modify: `questions.yaml` (replace stub)

**Interfaces:**
- Consumes: `parseBank` rules (Task 2)

- [ ] **Step 1: Write the bank**

Six rounds, deliberately hard (spec): Movies: Oscar (5), Movies: Cult Classics (5), Movies: Childhoods (5), Music (4 — placeholder questions, NO `audio:` references: spec ships music as placeholders until real clips are dropped into `audio/`; the generated demo clips stay in `audio/demo/` for folder-mode use), Nerd Culture (5 — e.g. "name the game by its fishing minigame"), Words (5 — e.g. "cartoon character by their nose"). Easy → hard within each round. Long questions use `>` block scalars.
The stub's `missing.wav` fallback-test question does NOT survive this replace — the shipped bank has no broken references; the missing-clip path stays verified by Task 7's record. Same for Task 7.6: the shipped bank carries no `audio:`/`images:` refs at all (host content, copyright); the media renderers stay verified by the stub/demo record.

- [ ] **Step 2: Verify**

Run: `node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parseBank } from './js/validate.js'; const r = parseBank(readFileSync('questions.yaml','utf8')); if (!r.ok) { console.error(r.errors); process.exit(1); } console.log(r.bank.rounds.length + ' rounds,', r.bank.rounds.reduce((n, x) => n + x.questions.length, 0) + ' questions');"`
Expected: `6 rounds, 29 questions`
MCP: reload against the running no-store server (`tools/local-server.py`, port 8080), Start → board shows 6 columns. If the browser profile already loaded files that changed since its last visit, verify on a fresh port (see Task 7.5 execution note).

- [ ] **Step 3: Commit**

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
- Produces: `loadFolder(dirHandleOrFiles) -> parseBank result` (audio as object URLs; a malformed `questions.yaml` in the folder surfaces the same line-numbered error panel), `createNew(parentHandle, name) -> dirHandle`, both with graceful fallbacks

- [ ] **Step 1: Implement `js/folder.js`**

Setup screen gains two buttons: **Load folder** and **Create new**. Primary: File System Access API (`window.showDirectoryPicker`); read `questions.yaml` via `File.text()`, audio files via `URL.createObjectURL`. Fallback when the API is absent: hidden `<input type="file" webkitdirectory>` covering the same load path. **Create new**: `showDirectoryPicker()` first (user picks the parent, e.g. Documents), then `parent.getDirectoryHandle(name, { create: true })` writes a template `questions.yaml` (schema from Task 3 stub, showing the optional `audio:` and `images:` keys), an `audio/` dir, an `images/` dir, and a README explaining the layout and the `>` block-scalar convention. FSA absent → inline message with instructions, no crash. Loading any source resets `state` to a fresh board (one board per data source). Audio files from the folder become object URLs — `URL.revokeObjectURL` all of them on every load/reset (no leaks across sources). A folder bank referencing audio that is NOT in the folder keeps the path as-is: 404 → the existing "no clip" note (graceful, no crash).
app.js hooks for this task: `renderError(errors)` (exported — folder loads route to the same error panel) and `setLoader(fn)` (exported — "Try again" reloads the active source, not always the shipped file). `renderSetup`'s input listener is one-time wired at app.js init — do not re-add it per load. `loadBank` calls question.js `resetFlow()` on every successful bank load AND resets `state.scoring`/`state.used` to a fresh game (council fix 2026-10-11 — a mid-game source swap must not carry old-bank scores or old-index used cells into the new bank) — folder loads go through the same path; don't bypass it.

- [ ] **Step 2: Verify with Playwright**

Verified environment fact: headless Chromium (this MCP, Chrome 155) does NOT expose FSA — `showDirectoryPicker` is undefined — so the webkitdirectory fallback is the path Playwright exercises; FSA load + create-new are manual (user's machine), noted in handoff.
1. Create a temp folder (e.g. `/tmp/tv-test/`) with its own `questions.yaml` (2 rounds) + `audio/x.wav`.
2. MCP: on the setup screen, snapshot → fallback visible (webkitdirectory input shown, no FSA button). `browser_file_upload` the file list to the webkitdirectory input → snapshot: board renders from the folder's bank, not the shipped one.
3. Second temp folder with a MALFORMED `questions.yaml` → snapshot: line-numbered error panel, no board.
4. Create-new: code-path review only (FSA-only); the manual test is a handoff item.

- [ ] **Step 3: Commit**

```bash
git add js/folder.js js/app.js
git commit -m "feat(folder): 🤖 add local folder loading and create-new scaffold

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

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

- [ ] **Step: Handoff for the user (not agent work)**

Remote already configured. Pushing `main` triggers the deploy. Set the repo's Pages source to the `gh-pages` branch (Settings → Pages → Branch: gh-pages). Site: `https://chendaniely.github.io/trivia-night/`. Until Task 3 lands, the site root has no `index.html`.
