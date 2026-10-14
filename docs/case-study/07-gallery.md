# 7. Gallery — the app at each milestone

Each screenshot was taken for this case study by exporting the commit with
`git archive`, serving it, and driving Google Chrome at **1280×720**. Qwen
never saw any of these: it is text-only, so its own UI checks were
accessibility snapshots and computed-style numbers.

## Qwen's build, Oct 11–14

| Milestone | Screenshot | What changed / what's visibly wrong |
|---|---|---|
| Task 3 — app shell (`c5b9538`, Oct 11 03:59) | ![](assets/history/01-task3-shell-01-setup.png) | Four fixed team inputs, native radios, disabled Start. |
| Task 4 — board (`1b40bc5`, 04:21) | ![](assets/history/02-task4-board-02a-board-fresh.png) | First board; the 500 row is already below the 720 fold. |
| Task 5 — Jeopardy flow (`f808951`, 04:46) | ![](assets/history/03-task5-jeopardy-03-question.png) | Claim → answer → Correct/Wrong. The claimed team is grey text on green (low contrast). |
| Task 6 — trivia tally (`8967c64`, 04:51) | ![](assets/history/04-task6-trivia-06-tally.png) | Column flow with Pass and a tally screen. |
| Task 7 — MVP with audio (`65714c3`, 05:43) | ![](assets/history/05-task7-audio-08-media.png) | Native audio player; this is what the partner demoed. |
| Task 7.5 — multi-win + NYC palette (`6373672`, 13:07) | ![](assets/history/06-task7.5-multiwin-03-question.png) | Green/red/clear marks, Reveal, Done; navy + NYC orange. |
| Task 7.6 — images (`c4c1e35`, 14:40) | ![](assets/history/07-task7.6-images-08-media.png) | A 640×480 image pushes the question and every control off-screen. |
| Task 7.7 — polish + font (`cba8805`, Oct 12 01:19) | ![](assets/history/08-task7.7-polish-02-board.png) | Atkinson Hyperlegible Next, difficulty ramp, score plaques. |
| Task 7.8 — Back + trivia hint (`65dac47`, 13:33) | ![](assets/history/09-task7.8-backbtn-04-trivia-board.png) | Trivia amounts dimmed, instruction line. |
| Task 7.10 — random names (`acecbce`, 16:22) | ![](assets/history/10-task7.10-names-01-setup.png) | Pre-filled two-word team names; Start enabled at once. |
| Task 8 — starter bank (`a1992f1`, 18:08) | ![](assets/history/11-task8-bank-02a-board-fresh.png) | Six real categories; "Childhood / s" splits mid-word. |
| Task 11 — About (`72b7cba`, 20:57) | ![](assets/history/12-task11-about-07-about.png) | Runs below the fold at 720p. |
| Task 9 — folder mode (`2aa76e2`, Oct 13 11:40) | ![](assets/history/13-task9-folder-01-setup.png) | Load folder / Create new / About under Start. |
| Qwen's final (`f603230`, Oct 14 08:18) | ![](assets/history/14-task13-final-02a-board-fresh.png) | Bottom row still cut off at 720p; header still splits. |

## What Qwen "saw" instead

These are three of the 14 screenshots Qwen saved during its UI work (Oct
11–12). The plan records them as "saved but NOT read — text-only model".
Reading the first one back into its own context is what triggered the
3.5-hour `image input is not supported` loop.

| `ui-before-board.png` (Oct 11 20:22) | `ui-after-board.png` (Oct 12 00:37) | `ui-after-question.png` |
|---|---|---|
| ![](assets/qwen-saved/ui-before-board.png) | ![](assets/qwen-saved/ui-after-board.png) | ![](assets/qwen-saved/ui-after-question.png) |

## After the Claude Code pass

See chapter 4 for what changed and why. Same viewport, same bank:

| Qwen's final | After the Claude pass |
|---|---|
| ![](assets/history/14-task13-final-02a-board-fresh.png) | ![](assets/claude/1280-board.png) |
| ![](assets/history/14-task13-final-03-question.png) | ![](assets/claude/1280-question-revealed.png) |
| ![](assets/history/14-task13-final-01-setup.png) | ![](assets/claude/1280-setup-resume.png) |

More from the Claude pass, including the 1920×1080 and 960×540 sizes:

| | |
|---|---|
| ![](assets/claude/1920-board.png) | ![](assets/claude/1280-image-question.png) |
| ![](assets/claude/960-question-revealed.png) | ![](assets/claude/1280-about.png) |
