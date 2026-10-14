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
```

(Requires [uv](https://docs.astral.sh/uv/) and node. That's all.) The
server prints the one address to open. Only the app's own files are
served: `question-drafts/` and the repo's other files never are. On
`make serve-lan`, anyone on the same Wi-Fi can still open the app and
read `questions.yaml`, so use it on a network you trust (or mirror the
Mac instead).

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
- Press **Reset game** and confirm the browser's OK/Cancel dialog appears
  and OK works. Some TV browsers suppress dialogs; if so, mirror the Mac
  instead.
- Audio: `.m4a`/`.mp3` play best on TV browsers; `.wav` works.

The app needs a reasonably recent browser (about Chrome 86 / Safari 14).
On an older one you'll see a "Loading…" note that never goes away: mirror
the Mac instead.

This repo is public, so keep the real night's questions in a local
folder (Load folder) or in `question-drafts/`, not in the shipped
`questions.yaml`.

## Using it at the event

1. Name your teams — fun names are suggested automatically, so you can
   just hit **Start** or edit, add, or remove teams (2 or more).
2. Pick a mode:
   - **Jeopardy** — click a dollar cell, mark teams green (correct) or
     red (wrong), **Reveal** the answer, **Done** to bank points.
   - **Trivia** — click a category name to start the round (the dollar
     cells aren't clickable), mark a team green when they answer,
     **Reveal** to show the answer, **Next** to move on.
   No mouse needed: a TV remote's D-pad (or Tab / Shift-Tab) moves
   between cells, categories and buttons, and OK (Enter / Space) presses
   them.
3. **Back to board** is on every question screen if you mistap (the
   browser's Back button does the same).
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

Unknown keys are reported (typo guard): a misspelled `image:` or `Audio:` is flagged with a "did you mean" hint instead of being silently ignored.

- One round per column; top row is easy, bottom row is hard.
- Optional per question: `points:` (positive integer), `audio:` (a
  `.m4a`/`.mp3`/`.wav` path), `images:` (list of paths). Missing files show a
  note, not an error.
- Check your file before the event:

  ```sh
  node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parseBank } from './js/validate.js'; const r = parseBank(readFileSync('questions.yaml','utf8')); if (!r.ok) { console.error(r.errors); process.exit(1); } console.log(r.bank.rounds.length + ' rounds,', r.bank.rounds.reduce((n, x) => n + x.questions.length, 0) + ' questions');"
  ```

Prefer to keep questions, clips, and photos together? Use **Load
folder** in the app — a folder with `questions.yaml`, `audio/`, and
`images/` becomes its own board — and **Create new** scaffolds one for
you (Chrome or Edge only). Loading another board mid-game asks first;
it keeps the team names you typed (unless that board has a saved game —
then Resume is offered), and if a folder has a problem the error screen
lists it — **Back to setup** returns to your game untouched.

## Layout

- `index.html`, `styles.css`, `js/` — the app (vanilla, no build step)
- `questions.yaml` — the shipped question bank
- `audio/demo/`, `images/demo/` — self-generated demo media
- `tools/local-server.py` — the local dev server (`make` runs it)
- `fonts/` — the self-hosted face (Atkinson Hyperlegible Next)
