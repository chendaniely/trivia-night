# Trivia Night App — Design

## Intent and why

Dan builds and operates a single-device trivia host app for a home trivia
night: Sunday Nov 8 2026, ~3–7pm, at his friend's place, on their TV.
~6–10 people, split into 2–3 teams (headcount not final, so any number of
teams from 2 up is accepted).
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
- Two game modes on the same board (revised 2026-10-11 after the MVP demo —
  multiple teams can win one question):
  - **Jeopardy mode** — host clicks any cell → question screen → host taps
    team buttons to mark who got it: click cycles green (correct, gains the
    cell's points) → red (wrong, loses them) → clear (misclick). A "Reveal
    answer" button shows the answer (the host doesn't know all the answers;
    marks can be set before or after revealing). "Done" applies all marks,
    consumes the cell, back to the board; zero marks = nobody got it.
  - **Trivia mode** — host clicks a category → its questions run in order
    (easy → hard), one at a time → host taps every team that got it (green,
    each gains the tier points; click again to clear), optionally pressing
    "Reveal answer" to show the answer (Task 13) → "Next" (no taps =
    pass) → column tally shown at the end of the column. The board's
    scoreboard is the final standings; there is no separate final screen.
- Setup screen at launch: enter team names, pick mode. The board has a
  "Setup" button that returns to it with names and mode prefilled; starting
  with the same teams (renames and a mode switch allowed) keeps scores and
  played cells; adding or removing a team starts a fresh game after a
  confirm.
- Team scoreboard with points; "Reset game" (asks first) clears scores and
  played cells, and loading another folder set starts a fresh board.
- Music round: a question may reference an audio clip; the question screen
  plays it through the TV speakers (host-triggered, then the question is
  answered as usual).
- Any question may reference images (`images:` — list of relative paths,
  same convention as `audio:`); the question screen shows them TV-sized
  beside the question text (image right, text left), in both modes.
- Demo data in the repo (questions + a few safe self-generated clips and
  images) so the Pages deployment works out of the box. The committed demo
  clips/images exist to exercise the media paths; the shipped bank
  references none of them.
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
- Images: host images are NOT committed (copyright); a few demo images
  (self-generated) ARE committed so the image path works out of the box.
  A missing image degrades to a "no image" note; the question stays
  playable.
- Local folder mode: host picks a trivia-night folder on their own
  computer (File System Access API on Chromium, `webkitdirectory`
  fallback). "Create new" scaffolds the structure: `questions.yaml`
  template, `audio/`, `images/`, README.
- Offline deps: every JS dependency vendored locally. No CDN.
- Runtimes available on the Mac: Node v25, python3 3.9. If Python is used
  for tooling, it must be uv-managed in a project-local `.venv/`
  (gitignored) — never installed into the user's global or active
  environment.
- Question content: one `questions.yaml` plus `audio/` and `images/`
  folders. The app validates the file on load: YAML syntax errors carry a
  line number; schema errors carry a 1-based round/question locator such
  as `round 2 "Movies", question 3` (Task 15 ruling). Unknown keys are
  reported with a "did you mean" hint (typo guard).
- Long question/answer text should use YAML block scalars (`>` folded, `|`
  literal) so colons and quotes need no escaping. Parser must handle them.
- Audio clips: prefer `.m4a`/`.mp3` (widest TV-browser support).

## Decided with the partner (as decided)

- Board structure: category × difficulty grid, easy → hard.
- Modes named **Jeopardy mode** and **Trivia mode**; both run on the same
  board; mode chosen once on the setup screen.
- Core loop (original, as first confirmed):
  - Jeopardy: click cell → question → tap claiming team → reveal →
    correct (gain) / wrong (lose).
  - Trivia: click category → questions in order → tap team that got it →
    next → column tally at end.
- Revised 2026-10-11 after the MVP demo (partner): multiple teams can win
  one question in both modes — Jeopardy buttons cycle green (gain) → red
  (lose) → clear with a manual "Reveal answer" button and "Done"; trivia
  buttons toggle green with "Next" (no taps = pass). The Goals section
  above is the current loop.
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
  may pass a question (0 points). Revised 2026-10-11: any NUMBER of teams
  can earn a question (multiple green marks); per-team tally math
  unchanged.
- Visual theme (partner's signature colors, 2026-10-11): dark blue-black
  background with NYC flag orange #F26522 as primary action / score accent
  and NYC blue #236192 as surfaces / secondary buttons; green and red stay
  reserved for correct / wrong team marks. UI pass (Task 26, partner's
  pick 2026-10-15): the board is lit — unplayed cells in NYC blue, a
  shade lighter each row down, played cells dropping into the background,
  category names on an orange rule (in trivia the headers are lit
  instead: what's lit is what you press); on Final scores the winner is
  filled orange; a blue-white-orange NYC flag stripe under the setup and
  Final scores titles is the app's one signature mark.
- Teams: 2 or more, no cap (Task 7.9; partner said 2–3, headcount was
  uncertain, so the app adds/removes teams freely).
- Points: default tier values 100/200/300/400/500 by position, overridable
  per question in YAML. Displayed as points, not dollars ("point cells").
- Saved games (Task 18, builder's call, flagged for review): the game is
  saved in the browser as it is played, one slot per board (10 most
  recent kept); after a reload, "Resume game" on setup restores scores,
  played cells and mode. A changed `questions.yaml` is a new board.
- Three ways to put it on the TV (Task 22, builder's call, flagged for
  review): mirror the Mac (recommended; everything works); the TV's own
  browser on the live Pages URL (shipped board only); the TV's own browser
  on the Mac over Wi-Fi via `make serve-lan`. Test on the real TV before
  the night.
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
        images: ["images/poster.png"]    # optional, list
        points: 300                      # optional, overrides the tier value
```

- Difficulty = position in the round's question list (first = easiest).
- Optional `points:` on a question overrides the tier default.
- Optional `images:` is a list of paths, same convention as `audio:`.
- Optional `audio:` is a path relative to the project root. When present,
  the question screen gets a play control.
- A round with fewer questions than tiers is fine; the board only shows
  cells that have content.

## Left to the builder

- Exact screens: setup, board, question, answer reveal, column tally,
  about, error. No separate final-scoreboard screen: the board's
  scoreboard is it.
- Visual design: dark, high contrast, large type, TV-readable.
- State and reset semantics (reset scores, return to board, replay a cell
  in Jeopardy mode after reveal).
- Local folder mode: directory pick, "create new" scaffolding, and a
  graceful fallback message on non-Chromium browsers.
- One self-check for the YAML validator: a malformed file must produce an
  error naming the offending line (syntax) or round/question (schema),
  and the app must not half-load.
