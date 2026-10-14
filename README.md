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
make test         # unit tests
```

(Requires python3 and node. That's all.)

## Using it at the event

1. Name your teams — fun names are suggested automatically, so you can
   just hit **Start** or edit, add, or remove teams (2 or more).
2. Pick a mode:
   - **Jeopardy** — click a dollar cell, mark teams green (correct) or
     red (wrong), **Reveal** the answer, **Done** to bank points.
   - **Trivia** — click a category name to start the round (the dollar
     cells aren't clickable), mark a team green when they answer,
     **Reveal** to show the answer, **Next** to move on.
3. **Back to board** is on every question screen if you mistap.
4. **Setup** mid-game: the same number of teams resumes the game
   (rename in place); a different number starts fresh.

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
  `.wav`/`.mp3` path), `images:` (list of paths). Missing files show a
  note, not an error.
- Check your file before the event:

  ```sh
  node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parseBank } from './js/validate.js'; const r = parseBank(readFileSync('questions.yaml','utf8')); if (!r.ok) { console.error(r.errors); process.exit(1); } console.log(r.bank.rounds.length + ' rounds,', r.bank.rounds.reduce((n, x) => n + x.questions.length, 0) + ' questions');"
  ```

Prefer to keep questions, clips, and photos together? Use **Load
folder** in the app — a folder with `questions.yaml`, `audio/`, and
`images/` becomes its own board — and **Create new** scaffolds one for
you (Chrome or Edge only). Loading another board keeps the team names
you typed (scores start fresh), and if a folder has a problem the error
screen lists it — **Back to setup** returns to your game untouched.

## Layout

- `index.html`, `styles.css`, `js/` — the app (vanilla, no build step)
- `questions.yaml` — the shipped question bank
- `audio/demo/`, `images/demo/` — self-generated demo media
- `tools/local-server.py` — the local dev server (`make` runs it)
- `fonts/` — the self-hosted face (Atkinson Hyperlegible Next)
