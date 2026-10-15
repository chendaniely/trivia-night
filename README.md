# Trivia Night

A single-device host app for trivia night. The TV shows the board; you
run everything — teams, modes, questions, scores — from one screen.
No install, no backend: it's a static site.

Live: <https://chendaniely.github.io/trivia-night/> (updates automatically
when the repo's `main` branch is pushed).

## Running it

Open the live link, or run it locally:

```sh
make              # serves on http://127.0.0.1:8080
make serve PORT=8090   # any other port
make serve-lan    # reachable from the TV's own browser (see below)
make test         # unit tests
make smoke        # end-to-end check in Chrome (needs `make serve` running in another terminal)
make fit          # every screen fits every TV size (needs `make serve`; ~15 min)
```

Screens are checked to fit without scrolling from 960×540 to 1920×1080
with up to six teams; more teams, or very long round names (over about
30 characters), may scroll on a small TV.

Run these from the repo folder. You need [uv](https://docs.astral.sh/uv/)
(`brew install uv`) and [node](https://nodejs.org/) (`brew install node`);
that's all. The server prints the one address to open. Only the app's own files are
served: `question-drafts/` and the repo's other files never are. On
`make serve-lan`, anyone on the same Wi-Fi can still open the app and
read `questions.yaml`, so use it on a network you trust (or mirror the
Mac instead). It serves the shipped board only: a Load folder board lives
on the device that loaded it.

## Putting it on the TV

Pick one:

1. **Mirror the Mac to the TV** (recommended). Everything works,
   including Load folder and your real clips and photos.
2. **The TV's own browser on the live link.** Only the shipped board is
   there; your real clips and photos aren't in the repo.
3. **The TV's own browser on the Mac, over Wi-Fi.** Run `make serve-lan`
   and open the address it prints on the TV. macOS may ask to allow
   incoming connections. Load folder on the TV reads the TV's files, not
   the Mac's.

Always open the same address: a saved game belongs to the address it was
played on (`localhost`, `127.0.0.1`, the LAN address, and another port
are all different).

**Test on the actual TV before the night:**

- Open the live URL.
- Check the font looks like the Mac's (Atkinson Hyperlegible, not a
  fallback).
- Press **Reset game**, then **Cancel**, with the remote: the app asks on
  its own screen, and Cancel keeps the game.
- Audio: `.m4a`/`.mp3` play best on TV browsers; `.wav` works.
- Nothing is cut off at the top or bottom edge (the scores, the buttons
  under the board). If it is, set the TV's picture size to Screen Fit /
  Just Scan, or turn off overscan in the Mac's Displays settings.

The app needs a reasonably recent browser (about Chrome 86 / Safari 14.1).
On an older one you'll see a "Loading…" note that never goes away: mirror
the Mac instead.

This repo is public, so never put the real night's questions in the
shipped `questions.yaml`. Keep them in a local folder and use **Load
folder**. `question-drafts/` is git-ignored scratch space and is never
served: to play a draft, copy it into a folder as `questions.yaml` (with
`audio/` and `images/` beside it) and Load folder that.

## Before the night

A week before, on the Mac and TV you'll actually use:

- `make test`, and run the check one-liner under "Writing your own
  questions" (it checks only the shipped `questions.yaml`; a folder
  board is checked by loading it, and the error screen lists problems).
- Play one full practice game on the same address and browser as the
  night (saved games belong to the address). **Reset game** clears it.
- On the TV: do the "Test on the actual TV" list above, and try a clip.
- Do the Create new, then Load folder check in Chrome (below).
- Run `make serve` once on the event Mac (the first `uv run` may fetch a
  Python).
- Push any last change to the app at least a day before, never on the
  night: the live site takes about 10 minutes to update, and a browser
  that loads half old, half new files may not start. After a change,
  wait 10 minutes, then Shift-reload on the Mac and the TV.

## On the night, if...

- **The page refreshed, or the remote's Back left the app:** reopen the
  same address and press **Resume game** (not Start: Start asks to
  discard the saved game). For a folder board, Load folder the same
  folder first, then Resume. You land on the board with scores and played
  cells; a question that was open isn't marked played.
- **The TV shows a blank page or a "Loading..." that stays:** refresh
  once, then mirror the Mac instead.
- **A clip won't play or says "no clip":** check the filename matches
  exactly (the real name, not URL-encoded) and use `.m4a`/`.mp3`. Or
  play it from the Mac and just **Reveal**.
- **A picture is missing:** the question still works; describe it or
  show it from a phone.
- **Wrong team marked:** before **Done**, click the team again to change
  or clear it (or **Back to board** drops the marks); the line under the
  teams shows what Done will bank. After Done, **Undo last question**
  under the board takes that question's points back and reopens it (it
  asks first). It goes back one question only.
- **Some private windows can't save:** setup says "Saving is off". Use a
  normal window.

## Using it at the event

1. Name your teams — fun names are suggested automatically, so you can
   just hit **Start** or edit, add, or remove teams (2 or more).
2. Pick a mode:
   - **Jeopardy** — click a point cell, mark teams green (correct) or
     red (wrong), **Reveal** the answer, **Done** to bank points. The
     line under the teams shows what Done will bank.
   - **Trivia** — click a category name to start the round (the point
     cells aren't clickable), mark a team green when they answer,
     **Reveal** to show the answer, **Next** to move on. The line under
     the teams shows what Next will bank. At the end of the category, a
     tally shows each team's points from it and their new total.
   The top of each question shows its category and what it's worth. A
   question with a clip has a big **▶ Play clip** button at the top right
   (on a remote, OK plays it). After **Done**, small +/− badges on the
   scoreboard show who just gained or lost points. When the last
   question is played, the scoreboard turns into **Final scores**:
   ranked, with the winner (or a tie) named.
   No mouse needed: a TV remote's D-pad (or Tab / Shift-Tab) moves
   between cells, categories and buttons, and OK (Enter / Space) presses
   them.
3. **Back to board** is on every question screen if you mistap (the
   browser's Back button does the same). It drops that question's marks
   and keeps the cell and everyone's scores. Banked the wrong result?
   **Undo last question** under the board takes the last question back.
4. **Setup** mid-game: rename teams or switch modes and **Start** carries
   on with the same game; adding or removing a team starts a fresh game
   (it asks first). Changed your mind? **Back to board** on the setup
   screen returns to the game untouched. **Reset game** under the board
   clears all scores and played cells — it asks first too.
5. **Refreshed by accident?** The game saves in the browser as you play.
   Reload the page and press **Resume game** on the setup screen. For a
   folder board, use **Load folder** and pick the same folder again;
   Resume appears once that board is loaded (the setup screen reminds
   you which board has the saved game). Each board keeps its own saved
   game (the 10 most recent boards); editing a board's `questions.yaml`
   makes it a new board, so its old game can't be resumed.

The in-app **About** button (under Start) has the same rundown on the TV.

## Writing your own questions

The shipped board lives in one file: `questions.yaml`.

```yaml
title: "Trivia Night"
rounds:
  - name: "Movies"
    questions:
      - q: "Which 2012 film won Best Picture, beating 'Lincoln'?"
        a: "Argo"
      - q: >
          A longer question, written with a block scalar.
        a: "The answer"
```

Unknown keys are reported (typo guard): a misspelled `image:` or `Audio:`
is flagged with a "did you mean" hint instead of being silently ignored.
Each problem says what to add or change, like `has no answer — add a
line like a: "the answer"`, and the error screen names the file or
folder it is in.
Problems are located the way you'd look for them, e.g. `round 2 "Movies",
question 3`; YAML syntax errors give a line number.

- One round per column; top row is easy, bottom row is hard. Keep round
  names under about 30 characters.
- Put text with a colon or a `#` in quotes: `a: "Star Wars: A New Hope"`.
  Without them the file won't read, and the error screen says which line.
- Write media paths as real filenames, not URL-encoded:
  `audio/My Song.m4a`, not `audio/My%20Song.m4a`.
- Optional per question: `points:` (positive integer), `audio:` (a
  `.m4a`/`.mp3`/`.wav` path), `images:` (list of paths). Missing files show a
  note, not an error.
- Check your file before the event:

  ```sh
  node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parseBank } from './js/validate.js'; const r = parseBank(readFileSync('questions.yaml','utf8')); if (!r.ok) { console.error(r.errors); process.exit(1); } console.log(r.bank.rounds.length + ' rounds,', r.bank.rounds.reduce((n, x) => n + x.questions.length, 0) + ' questions');"
  ```

Prefer to keep questions, clips, and photos together? Use **Load
folder** in the app (works best in Chrome or Edge; other browsers use a
simpler folder picker): a folder with `questions.yaml`, `audio/`, and
`images/` becomes its own board.

**Create new** scaffolds one for you (Chrome or Edge only):

1. Type a name for the new game folder. It never overwrites an existing
   one.
2. Click **Choose where…** and pick (or make) a parent folder inside
   Documents. Chrome refuses Documents, Desktop, Downloads and your home
   folder themselves.
3. Chrome asks to allow editing: allow it.
4. Then use **Load folder** on it.

Loading another board mid-game asks first; it keeps the team names you
typed (unless that board has a saved game, then Resume is offered), and
if a folder has a problem the error screen lists it. **Back to setup**
returns to your game untouched.

## Layout

- `index.html`, `styles.css`, `js/` — the app (vanilla, no build step)
- `questions.yaml` — the shipped question bank
- `audio/demo/`, `images/demo/` — self-generated demo media
- `test/` — unit tests (`make test`)
- `tools/local-server.py` — the local dev server (`make` runs it)
- `tools/smoke.mjs`, `tools/fit.mjs` — the Chrome checks (`make smoke`, `make fit`)
- `fonts/` — the self-hosted face (Atkinson Hyperlegible Next)
