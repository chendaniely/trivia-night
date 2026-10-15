# UX audit measurements (Oct 14)

These are the raw numbers behind [chapter 8](../08-ux-audit.md). Claude
Code (Opus 5.5) produced them by driving system Chrome through
Playwright against `make serve` at commit `5fdedc8`. The capture and
probe scripts, and all 72 screenshots (68 from the capture run, 4 from
the probes), are kept out of git in
`.playwright-mcp/ux-audit-research/`. The image and audio screens used a
test question file served in place of `questions.yaml`. It pointed at
`images/demo/` and `audio/demo/`, plus one missing clip.

## Fit (scroll overflow per screen)

There were 15 screens at each of four sizes (1920×1080, 1280×720,
960×540, 1440×900): setup (fresh, mid-game, Resume offer), About, the
board (fresh, mid-game, trivia), a question (unrevealed, marked and
revealed), a trivia question, the tally, image, audio and missing-clip
questions, and the error screen.

- 59 of 60 had no overflow. The error screen at 960×540 scrolls by 2 px.
- Six teams with long names at 1280×720: the scoreboard wraps to two
  rows, and the board still fits.
- Phone (390×844), which is not a target: the board overflows sideways
  by 101 px.

## Computed type sizes (px)

| Element | 960×540 | 1280×720 | 1440×900 | 1920×1080 |
|---|---|---|---|---|
| Board point value | 32 | 42.7 | 48 | 64 |
| Board category header | 22 | 29.3 | 33 | 44 |
| Scoreboard team name | 20 | 20 | 22.5 | 30 |
| Scoreboard points | 28 | 29.3 | 33 | 44 |
| Question (text-only) | 44.2 | 58.5 | 66.2 | 79.7 |
| Answer (text-only) | 35.3 | 46.8 | 53 | 63.8 |
| Question-screen category (`h2`) | 20 | 21.3 | 24 | 32 |
| Team / control buttons (text-only q.) | 20 | 26.7 | 30 | 40 |
| Trivia board hint | 18 | 18 | 19.5 | 26 |

## Contrast (WCAG 2 ratio)

| Pair | Ratio |
|---|---|
| text `#f5f9fc` on bg `#0a1620` | 17.27 |
| muted `#9fb3c8` on bg | 8.49 |
| muted on panel `#13242f` (quiet buttons) | 7.39 |
| white on blue `#236192` (team buttons, Setup) | 6.57 |
| orange `#f26522` on bg (answer, scores) | 5.80 |
| `#0a1620` on orange (primary buttons) | 5.80 |
| `#06130a` on green mark | 7.48 |
| `#160505` on red mark | 5.92 |
| red `#f85149` on bg (error list) | 5.45 |
| orange on panel (score pills) | 5.04 |
| muted on edge `#24405a` (disabled) | 4.99 |
| trivia-dimmed cell text (0.45 opacity) | 3.96 |
| trivia played cell text (0.45 opacity) | 2.70 |
| green mark vs red mark (to each other) | 1.32 |
| blue button vs bg (non-text) | 2.78 |
| quiet-button border vs bg (non-text) | 1.70 |

## Probes

**What the pointer is over after Reveal.** The probe clicked Reveal
answer at its center, then read `elementFromPoint` at the same spot.

| Size | Questions tried | Under the pointer after | Row shift |
|---|---|---|---|
| 1280×720 | Oscar 100, Oscar 500, Words 200 | second team's button, all three | 72 px |
| 1920×1080 | same | second team's button, all three | 100 px |

**Empty space below the controls on text-only questions**, as the share
of the viewport height under the controls row:

| Size | Wings (Oscar 500, 132 characters), before / after Reveal | Short question (Words 100), before / after Reveal |
|---|---|---|
| 1920×1080 | 43% / 34% | 53% / 44% |
| 1440×900 | 46% / 37% | 56% / 47% |
| 1280×720 | 41% / 31% | 51% / 41% |
| 960×540 | 39% / 29% | 50% / 40% |

Wings is the third-longest question, not the longest. The longest is
Oscar 300 (162 characters), then Music 400 (150). The forward reviewer
measured the worst case: Oscar 300, revealed, with long team names. The
space left was 87 px at 960×540, 129 px at 720p, 231 px at 1440×900 and
241 px at 1080p with four teams, and 33, 57, 150 and 133 px with six.

**Other transitions, re-checked after the forward review** (three teams;
four on the image question):

| After this click | Under the pointer at 1280×720 | At 1920×1080 |
|---|---|---|
| Reveal answer, image question | Done | Done |
| Opening Childhoods 300 | Done | nothing (the page background) |
| Next on trivia Words question 1 | nothing | nothing |

The trivia cases the forward reviewer reported (Words questions 2 and 3,
and Oscar question 4) were not re-run. When the last cell is played,
`document.activeElement` is `BODY`.

**Playing the board to the end** (four teams, 1280×720). After the last
cell, the screen shows only dashed cells and the scoreboard, which reads
900 / 600 / 600 / 900. Nothing indicates the end of the game, a leader
or a tie.

**An empty team name.** Start is disabled. The screen's text holds no
message about why: "Trivia Night Name your teams and pick a mode.
Remove Remove Add team Jeopardy Trivia Start Load folder Create new
About".

**Enter on a focused board cell** after a mouse Start opens the question,
with focus on the first team button. A second Enter marks that team
green. That is the designed behavior (Task 21), not a finding.

## Origins (`git blame` at `5fdedc8`)

| Behavior | Line | Commit | Model |
|---|---|---|---|
| Category-only question header | `question.js` `cat.textContent = round.name` | `05fcb4d` | Qwen 3.8 27B |
| Answer inserted above the team buttons | `question.js` `if (revealed)` | `05fcb4d` | Qwen 3.8 27B |
| 350 ms click lock on Reveal | `question.js` `lockInput(); // Done slides…` | `cf26ed4` | Claude Opus 5.5 |
| Reset / discard / team-change / load `confirm()` | `board.js`, `app.js` | `cf26ed4` | Claude Opus 5.5 |
| Create new `prompt()` | `app.js` | `35e2b32` (moved by `b87e688`, Sonnet) | Qwen 3.8 27B |
| Scoreboard | `board.js` `score.className` | `c0aa8b8` | Qwen 3.8 27B |
| Native audio player | `question.js` `a.controls = true` | `d8eb078` | Qwen 3.8 27B |
| `button:disabled` fill | `styles.css` | `1630f28` | Qwen 3.8 27B |
| Start disabled until all named | `app.js` `allNamed` | `add404e` | Qwen 3.8 27B |
| Trivia hint sentence | `board.js` | `38bcbf4` | Qwen 3.8 27B |
| Column tally | `question.js` `renderTally` | `127ee57` | Qwen 3.8 27B |
| No focus target at game end | `board.js` `focusBoard` early return | `7a8cb84` | Claude Sonnet 5.5 |
| `:focus-visible` rules (Safari 15.4+) | `styles.css` focus ring; cell and header fills | `1630f28`; `7a8cb84` | Qwen 3.8 27B; Claude Sonnet 5.5 |
