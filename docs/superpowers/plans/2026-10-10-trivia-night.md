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
.github/workflows/deploy-pages.yml
```

**Shared interfaces** (exact; every task uses these names):

```js
// js/scoring.js
createScoring(teamNames: string[]) -> Scoring
Scoring.teams: { name: string, points: number }[]
Scoring.give(teamIdx: number, points: number, roundName: string)
Scoring.reset()
Scoring.roundTotal(roundName: string) -> number

// js/validate.js
parseBank(text: string) -> { ok: true, bank: Bank } | { ok: false, errors: BankError[] }
BankError = { line?: number, where: string, message: string }
Bank = { title: string, rounds: Round[] }
Round = { name: string, questions: Question[] }
Question = { q: string, a: string, audio?: string, points?: number }

// js/app.js (module-level, consumed by board.js / question.js / folder.js)
state = { mode: "jeopardy" | "trivia", teamNames: string[], bank: Bank,
          used: Map /* "roundIdx:qIdx" -> true */, scoring: Scoring }
showScreen(id: "setup" | "board" | "question" | "tally")
```

---

### Task 1: Scoring engine (pure)

**Files:**
- Create: `js/scoring.js`
- Test: `test/scoring.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `createScoring`, `Scoring` (shape above)

- [ ] **Step 1: Write the failing test**

`test/scoring.test.mjs`, using `node:assert/strict`:

```js
import { createScoring } from "../js/scoring.js";
// - give(0, 300, "Movies") then teams[0].points === 300
// - give(1, -200, "Movies") then teams[1].points === -200  (Jeopardy wrong answer)
// - roundTotal("Movies") === 100 after give(0,300,"Movies"); give(1,-200,"Movies")
// - reset() zeroes every team and roundTotal returns 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/scoring.test.mjs`
Expected: FAIL — `Cannot find module '../js/scoring.js'`

- [ ] **Step 3: Implement `js/scoring.js`**

Plain object + closures. `give` records `{teamIdx, points}` into a per-round log so `roundTotal` can recompute. `reset` zeroes points and clears the log.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/scoring.test.mjs`
Expected: PASS (no output, exit 0)

- [ ] **Step 5: Commit**

```bash
git add js/scoring.js test/scoring.test.mjs
git commit -m "feat: 🤖 add scoring engine with per-round tallies

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

- [ ] **Step 1: Vendor js-yaml**

Run: `npm i -D js-yaml` then copy `node_modules/js-yaml/dist/js-yaml.mjs` to `js/yaml.js`, prepending a one-line header: `// Vendored js-yaml — refresh: npm i -D js-yaml && cp node_modules/js-yaml/dist/js-yaml.mjs js/yaml.js`

- [ ] **Step 2: Write the failing test**

`test/validate.test.mjs`, using `node:assert/strict`:

```js
import { parseBank } from "../js/validate.js";
// - valid bank (title + 2 rounds, one question using a `>` block scalar) -> ok, bank.rounds[0].questions[0].q is the folded text
// - question missing `a` -> ok:false, errors[0].where === 'rounds[0].questions[1]', message names the missing field
// - YAML typo (unclosed quote on line 4) -> ok:false, errors[0].line === 3 (js-yaml marks are 0-based; store line+1)
// - `points` must be a positive integer when present
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node test/validate.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 4: Implement `js/validate.js`**

`parse` in try/catch: on syntax error return `errors: [{ line: err.mark.line + 1, where: "yaml", message: err.reason }]`. On success, walk the structure; collect every schema error with `where` like `rounds[1].questions[2]`. Return `{ ok: errors.length === 0, ... }`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test/validate.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/yaml.js js/validate.js test/validate.test.mjs package.json package-lock.json
git commit -m "feat: 🤖 add yaml validation with line-numbered errors

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

- [ ] **Step 1: Write `index.html` + `styles.css` + `js/app.js` skeleton**

`index.html`: one `<main id="root">` with four screen containers (`#screen-setup`, `#screen-board`, `#screen-question`, `#screen-tally`), loads `js/app.js` as a module. `styles.css`: dark background, light text, large type (min 28 px body), high contrast. `js/app.js`: `state` object, `showScreen(id)` toggles `.hidden`, and on load `fetch("questions.yaml")` → `parseBank` → on failure show the errors (line numbers included) and stop; on success render setup.

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

- [ ] **Step 2: Verify with Playwright**

Start a static server in the background: `python3 -m http.server 8080 --bind 127.0.0.1` (from repo root).
MCP: `browser_navigate` → `http://127.0.0.1:8080`, then `browser_snapshot`.
Expected: setup screen visible; Start disabled; type two team names → Start enabled; click Start → board screen visible (empty grid fine — Task 4 fills it).

- [ ] **Step 3: Verify the malformed-YAML path**

MCP: use `browser_navigate` to a temporary copy is NOT needed — instead temporarily append a bad line to `questions.yaml`, reload via `browser_navigate`, expect the error panel with a line number and no board. Restore the file when done.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css js/app.js questions.yaml
git commit -m "feat: 🤖 add app shell and setup screen

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 4: Board screen + scoreboard + reset

**Files:**
- Create: `js/board.js`
- Modify: `js/app.js` (wire `renderBoard` into the board screen)

**Interfaces:**
- Consumes: `state` (Task 3), `Scoring` (Task 1)
- Produces: `renderBoard(rootEl: HTMLElement)` — grid + scoreboard + reset; cell click → `onCellClick(roundIdx, qIdx)` callback set by app.js

- [ ] **Step 1: Implement `js/board.js`**

Grid: columns = rounds (header = round name; in Trivia mode the header is the click target for the whole column), rows = max question count across rounds (Review Focus 4). Cell text = points (position default 100×n, or `q.points`). Used cells (key `roundIdx:qIdx` in `state.used`) render dimmed with no click. Scoreboard strip: team names + live points. Reset button → `state.scoring.reset()`, clear `state.used`, re-render. Question text must render block-scalar content as clean paragraphs (Review Focus 2). Clicks route through app.js callbacks `onCellClick(roundIdx, qIdx)` / `onColumnClick(roundIdx)`; until Tasks 5–6 land those callbacks are no-ops, so the board is fully navigable-looking but inert.

- [ ] **Step 2: Verify with Playwright**

MCP: reload, setup with two teams, Start. `browser_snapshot`: board shows 2 columns, row counts 5 and 3 (adapted, Review Focus 4), cell values 100–500, scoreboard shows both teams at 0. Click Reset → still 0.

- [ ] **Step 3: Commit**

```bash
git add js/board.js js/app.js
git commit -m "feat: 🤖 add board grid, scoreboard, and reset

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 5: Question flow — Jeopardy mode

**Files:**
- Create: `js/question.js`
- Modify: `js/app.js` (cell click routing, back-to-board)

**Interfaces:**
- Consumes: `state`, `Scoring`, `renderBoard`
- Produces: `startQuestion(roundIdx, qIdx)` (Jeopardy mode)

- [ ] **Step 1: Implement the Jeopardy flow in `js/question.js`**

Phases: `show` (question text; no answer) → `claim` (tap a team button to claim; claim locks the team) → `reveal` (answer shown; Correct / Wrong buttons) → back to board. `Correct`: `scoring.give(claimIdx, +points, round.name)`, mark used. `Wrong`: `scoring.give(claimIdx, -points, round.name)`, mark used. Taps on team buttons after `reveal` are ignored (Review Focus 5).

- [ ] **Step 2: Verify with Playwright**

MCP: setup (teams "A", "B"), Jeopardy mode, Start. Click the 300 cell of Demo → question text visible, no answer. Tap "B" → answer reveals. Click Wrong → scoreboard B = -300, back on board, cell dimmed. Click a fresh 100 cell, tap "A", Correct → A = +100.

- [ ] **Step 3: Commit**

```bash
git add js/question.js js/app.js
git commit -m "feat: 🤖 add jeopardy question flow with claim and reveal

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 6: Question flow — Trivia mode + column tally

**Files:**
- Modify: `js/question.js` (column mode), `js/app.js` (tally screen)

**Interfaces:**
- Consumes: `state`, `Scoring`, `renderBoard`
- Produces: `startColumn(roundIdx)`, tally screen renderer

- [ ] **Step 1: Implement the Trivia flow**

Round header click → first question of the column. Per question: team buttons (tap = that team got it, `give(+points)`) plus a **Pass** button (`give` nothing, 0 points). Next → following question; used cells update as the column progresses. After the last question: tally screen — per-team points earned in this column via `scoring.roundTotal(round.name)` — then back to board. Invalid taps after a question is awarded are ignored (Review Focus 5).

- [ ] **Step 2: Verify with Playwright**

MCP: setup, Trivia mode, Start. Click "Demo" header → Q1. Tap "A" → Q2. Pass → Q3. Tap "B" → Q4 → Q5 → tally screen shows A = 100, B = 400 (positions 100/200/300/400/500). Back to board → Demo column fully dimmed.

- [ ] **Step 3: Commit**

```bash
git add js/question.js js/app.js
git commit -m "feat: 🤖 add trivia column flow with pass and tally

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

- [ ] **Step 1: Write `tools/make-demo-audio.mjs`**

Dependency-free Node: writes three 16-bit PCM WAV files (44.1 kHz, ~1.5 s each) into `audio/demo/`: `note-440.wav` (A4), `note-523.wav` (C5), `arpeggio.wav` (440→523→659). Pure math + DataView, no npm packages.

- [ ] **Step 2: Generate and check the clips**

Run: `node tools/make-demo-audio.mjs` then `ls -la audio/demo/`
Expected: three files, each a few hundred KB, RIFF header (`xxd -l 4` shows `RIFF`).

- [ ] **Step 3: Wire playback into the question screen**

If `q.audio` present: render an `<audio controls preload="auto" src={q.audio}>` (relative path) above the question text. On `error` event (missing file): hide the player, show a "no clip — play it from any device" note, continue the flow (Review Focus 3).

- [ ] **Step 4: Add audio questions to the stub bank**

Add to `questions.yaml` under a new round "Music": one question referencing `audio/demo/arpeggio.wav`, one referencing `audio/demo/missing.wav` (does not exist — exercises the fallback).

- [ ] **Step 5: Verify with Playwright**

MCP: Jeopardy mode, open the arpeggio question → snapshot shows the audio element; click play → `browser_wait_for` 2 s → snapshot: no error note. Open the missing-clip question → snapshot shows the "no clip" note and the claim buttons still work.

- [ ] **Step 6: Commit**

```bash
git add tools/make-demo-audio.mjs audio/demo js/question.js questions.yaml
git commit -m "feat: 🤖 add audio playback with generated demo clips

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

- [ ] **Step: MILESTONE — MVP demo (no commit)**

Start the server (`python3 -m http.server 8080 --bind 127.0.0.1` from repo root, background), hand the user `http://127.0.0.1:8080`, and **stop: wait for the user's demo feedback before Task 8**.

---

### Task 8: Full starter question bank

**Files:**
- Modify: `questions.yaml` (replace stub)

**Interfaces:**
- Consumes: `parseBank` rules (Task 2)

- [ ] **Step 1: Write the bank**

Six rounds, deliberately hard (spec): Movies: Oscar (5), Movies: Cult Classics (5), Movies: Childhoods (5), Music (4 — two reference `audio/demo/` clips), Nerd Culture (5 — e.g. "name the game by its fishing minigame"), Words (5 — e.g. "cartoon character by their nose"). Easy → hard within each round. Long questions use `>` block scalars.

- [ ] **Step 2: Verify**

Run: `node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parseBank } from './js/validate.js'; const r = parseBank(readFileSync('questions.yaml','utf8')); if (!r.ok) { console.error(r.errors); process.exit(1); } console.log(r.bank.rounds.length + ' rounds,', r.bank.rounds.reduce((n, x) => n + x.questions.length, 0) + ' questions');"`
Expected: `6 rounds, 29 questions`
MCP: reload, Start → board shows 6 columns.

- [ ] **Step 3: Commit**

```bash
git add questions.yaml
git commit -m "feat: 🤖 add starter question bank across six categories

Co-Authored-By: Qwen 3.8 27B <qwen-coder@alibabacloud.com>"
```

---

### Task 9: Local folder mode + create-new

**Files:**
- Create: `js/folder.js`
- Modify: `js/app.js` (setup screen buttons)

**Interfaces:**
- Consumes: `parseBank`, `state`
- Produces: `loadFolder(dirHandleOrFiles) -> Bank` (object URLs for audio), `createNew(name) -> dirHandle`, both with graceful fallbacks

- [ ] **Step 1: Implement `js/folder.js`**

Setup screen gains two buttons: **Load folder** and **Create new**. Primary: File System Access API (`window.showDirectoryPicker`); read `questions.yaml` via `File.text()`, audio files via `URL.createObjectURL`. Fallback when the API is absent: hidden `<input type="file" webkitdirectory>` covering the same load path. **Create new**: `getDirectoryHandle(name, { create: true })` writes a template `questions.yaml` (schema from Task 3 stub), an `audio/` dir, and a README explaining the layout and the `>` block-scalar convention. Unsupported browser → inline message with instructions, no crash. Loading any source resets `state` to a fresh board (one board per data source).

- [ ] **Step 2: Verify with Playwright**

Create a temp folder (e.g. `/tmp/tv-test/`) with its own `questions.yaml` (2 rounds) + `audio/x.wav`. MCP: on the setup screen, set files on the `webkitdirectory` input (browser_file_upload with the file list) → snapshot: board renders from the folder's bank, not the shipped one. Also snapshot the fallback message on a path where the FSA API is unavailable (skip if headless exposes it — note which path was exercised).

- [ ] **Step 3: Commit**

```bash
git add js/folder.js js/app.js
git commit -m "feat: 🤖 add local folder loading and create-new scaffold

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
Council fix 2026-10-11: the first deploy used `destination_branch`/`force_sync`, which the pinned v3 SHA silently ignores (its inputs are `publish_branch`/`publish_dir`); the branch ended up with only `.nojekyll`. Fixed, redeployed, verified live.

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
