# Trivia Night App — Design

## Intent and why

Dan builds and operates a single-device trivia host app for a home trivia
night: Sunday Nov 8 2026, ~3–7pm, at his friend's place, on their TV.
~6–10 people, split into 2–3 teams (headcount not final, so 4 teams max).
Dan and the host couple (friend + wife Helena) are strong at trivia —
questions should be deliberately hard. The whole evening runs from one
screen the host controls; nobody else touches a device.

The friend wanted a real "actual trivia night" (grouped category rounds),
not random questions. Dan proposed a Jeopardy-style board; the friend did
not envision it, but it is the agreed structure because it flexes to both
styles of play (see modes below).

## Goals

- Jeopardy-style board: categories as columns, difficulty tiers as rows,
  easy → hard top to bottom. All content comes from one editable
  plain-text YAML file.
- Two game modes on the same board:
  - **Jeopardy mode** — host clicks any cell → question screen → host taps
    the claiming team → answer flips → host marks correct (that team gains
    the cell's points) or wrong (that team loses them).
  - **Trivia mode** — host clicks a category → its questions run in order
    (easy → hard), one at a time → host taps the team that got it → next
    question → column tally shown at the end of the column.
- Setup screen at launch: enter team names, pick mode.
- Team scoreboard with points; score reset available, and loading
  another folder set starts a fresh board.
- Music round: a question may reference an audio clip; the question screen
  plays it through the TV speakers (host-triggered, then the question is
  answered as usual).
- Demo data in the repo (questions + a few safe self-generated clips) so
  the Pages deployment works out of the box.
- Local folder mode: host loads questions + audio from a folder on their
  own computer; a "create new" action scaffolds that folder structure.

## Non-goals

- No buzzers, no team-side phones, no multi-device sync.
- No timers.
- No online services, accounts, or cloud — fully offline.
- No in-app question editing. Questions live in the YAML file; the app
  only loads and validates them.
- No fancy theming beyond a clean, dark, high-contrast board readable from
  across the room.

## Anti-goals (failure looks like this)

- Host is stuck mid-game: file fails to load silently, audio won't play,
  or a click does something ambiguous.
- Editing questions is a chore — YAML must be trivially editable by a
  human in a text editor.
- Board or question text is unreadable from ~10 ft on the TV.

## Constraints

- Single host device. The TV displays the app either via the TV's own
  browser (over the LAN, at the Mac's IP) or via screen mirroring from the
  Mac. The app must work identically either way — never assume which.
- Hosting: GitHub Pages, deployed by a GitHub Actions workflow. Static
  files only — no server at runtime. The TV opens the Pages URL in its
  browser.
- Everything must work as plain static files: `questions.yaml` via
  same-origin `fetch()`, audio via relative paths. Paths must survive the
  `/<repo>/` subpath that Pages serves under.
- Audio: real clips are NOT committed to the repo (copyright); they live
  in a gitignored local `audio/` folder. A few demo clips (self-generated,
  no copyright) ARE committed so the Pages deployment works out of the
  box. The app degrades gracefully when a referenced clip is missing —
  the question stays playable and the host can sound the clip from any
  other device.
- Local folder mode: host picks a trivia-night folder on their own
  computer (File System Access API on Chromium, `webkitdirectory`
  fallback). "Create new" scaffolds the structure: `questions.yaml`
  template, `audio/`, README.
- Offline deps: every JS dependency vendored locally. No CDN.
- Runtimes available on the Mac: Node v25, python3 3.9. If Python is used
  for tooling, it must be uv-managed in a project-local `.venv/`
  (gitignored) — never installed into the user's global or active
  environment.
- Question content: one `questions.yaml` plus an `audio/` folder. The app
  validates the file on load and reports bad lines with line numbers.
- Long question/answer text should use YAML block scalars (`>` folded, `|`
  literal) so colons and quotes need no escaping. Parser must handle them.
- Audio clips: prefer `.m4a`/`.mp3` (widest TV-browser support).

## Decided with the partner (as decided)

- Board structure: category × difficulty grid, easy → hard.
- Modes named **Jeopardy mode** and **Trivia mode**; both run on the same
  board; mode chosen once on the setup screen.
- Core loop exactly as confirmed:
  - Jeopardy: click cell → question → tap claiming team → reveal →
    correct (gain) / wrong (lose).
  - Trivia: click category → questions in order → tap team that got it →
    next → column tally at end.
- Setup screen: team names + mode pick, at startup.
- Question bank in YAML, plain-text editable.
- One board per night: the app always renders exactly one board from the
  active data source (repo default or a picked folder). Multiple boards
  for the evening = multiple folder sets, each with its own
  questions.yaml; loading another set starts fresh. No multi-board state
  machine.

## Builder's calls (not partner-decided — flagged for review)

- Stack (settled — partner deferred the choice to the builder): vanilla
  JS/HTML/CSS, no build step, vendored js-yaml. Python only for optional
  tooling, uv-managed project venv. GitHub Actions workflow deploys to
  Pages.
- Audio: real clips gitignored locally; a few self-generated demo clips
  committed so Pages works. Missing clips degrade to a "no clip" state,
  never a broken question.
- Demo clips made by a small dependency-free Node script that writes WAV
  (no ffmpeg, no copyrighted material).
- Trivia-mode scoring (settled by builder): the team that got it earns
  the tier points; the column tally shows the column's point total; host
  may pass a question (0 points).
- Teams: 2–4 names accepted (partner said 2–3; +1 headroom for uncertain
  headcount).
- Points: default tier values 100/200/300/400/500 by position, overridable
  per question in YAML. Displayed as points, not dollars.
- Ship a starter question bank: multiple movie categories (Oscar,
  cult classics, childhoods), music, nerd culture, words. Deliberately
  hard. Music questions ship as placeholders until real clips are dropped
  into `audio/`.

## YAML schema (builder may refine; must stay plain-text friendly)

```yaml
title: "Trivia Night — Nov 8"
rounds:
  - name: "Movies: Oscar"
    questions:
      - q: >
          Name the 1997 film where the captain
          never abandons his ship.
        a: >
          Titanic
      - q: "Name this song by its intro"
        a: "Happy"
        audio: "audio/happy-intro.m4a"   # optional
```

- Difficulty = position in the round's question list (first = easiest).
- Optional `points:` on a question overrides the tier default.
- Optional `audio:` is a path relative to the project root. When present,
  the question screen gets a play control.
- A round with fewer questions than tiers is fine; the board only shows
  cells that have content.

## Left to the builder

- Exact screens: setup, board, question, answer reveal, column tally,
  final scoreboard.
- Visual design: dark, high contrast, large type, TV-readable.
- State and reset semantics (reset scores, return to board, replay a cell
  in Jeopardy mode after reveal).
- Local folder mode: directory pick, "create new" scaffolding, and a
  graceful fallback message on non-Chromium browsers.
- One self-check for the YAML validator: a malformed file must produce an
  error naming the offending line, and the app must not half-load.
