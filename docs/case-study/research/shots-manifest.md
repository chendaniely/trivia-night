# Historical screenshot manifest

Viewport 1280x720, Google Chrome via Playwright, fresh context per snapshot. Each commit exported with `git archive` into `snapshots/<sha>/` (git-ignored) and served by a dependency-free Node server on ports 8200-8213 (all stopped). Capture script lives in the session scratchpad (cap.mjs); raw results in `report.json`.

File naming: `<NN>-<milestone>-<screen>.png`, NN = milestone order below.
Screens: 01-setup, 02a-board-fresh, 03-question (marks set + answer revealed; Task 5 era = claim + answer + Correct/Wrong), 02-board (after playing one cell via Done), 04-trivia-board, 05-trivia-question, 06-tally, 07-about, 08-media (audio/image question), 01b-after-start (Task 3 only).
Team names: typed Alpha/Beta/Gamma where inputs were empty (Task 3-7.8); pre-filled random names used from Task 7.10 on (2 teams).
Console errors: every snapshot logged exactly one error, a 404 "Failed to load resource" (no favicon shipped); no JS exceptions in any snapshot.
Order note: Task 9 (folder mode) landed after Task 11 chronologically, so it is listed after it.

## Qwen's own saved screenshots (qwen-saved/, mtimes in qwen-saved/mtimes.txt)
ui-before-setup/board/question/tally/trivia: 2026-10-11 20:22-20:26 (before Task 7.7 polish). ui-after-setup/board/question/trivia/tally: 2026-10-12 00:37-00:39 (Task 7.7). ui-after-backbtn and ui-after-trivia-hint: 2026-10-12 13:04 (Task 7.8). ui-after-5teams: 2026-10-12 14:13 (Task 7.9). ui-after-bank: 2026-10-12 16:32 (Task 7.10 era). Later Claude Code shots in .playwright-mcp/claude-pass-2026-10-14/ were not copied.

## Milestones

### 01 Task 3 app shell + setup (`c5b9538`)
- Date: 2026-10-11 03:59:34 -0700
- Subject: docs(plan): 🤖 record task 3 council fixes (loader hook, error export)
- Captured: `01-task3-shell-01-setup.png`, `01-task3-shell-01b-after-start.png`
- Not captured: none
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Dark slate background, left-aligned system-sans heading, four fixed Team 1-4 inputs, native radios Jeopardy/Trivia, grey disabled Start; the right half of the screen is empty. After Start the screen is blank because no board exists yet (01b). No other defects.

### 02 Task 4 board (`1b40bc5`)
- Date: 2026-10-11 04:21:28 -0700
- Subject: docs(plan): 🤖 correct task 4 interfaces, add task 6 cell rule
- Captured: `02-task4-board-01-setup.png`, `02-task4-board-02a-board-fresh.png`, `02-task4-board-03-question.png`, `02-task4-board-02-board.png`, `02-task4-board-04-trivia-board.png`, `02-task4-board-05-trivia-question.png`
- Not captured: no media question found in jeopardy sweep; tally not reached
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: First board: centered score chips, header row plus dollar-cell grid with a blue hover state. Defect: rows run off the bottom (500 row clipped at 720px). Cells do nothing on click yet, so no question flow exists; the duplicate 02-board/03/05 shots were dropped, and 04-trivia-board is the same board.

### 03 Task 5 Jeopardy flow (`f808951`)
- Date: 2026-10-11 04:46:18 -0700
- Subject: docs(plan): 🤖 record task 5 council notes for tasks 6/7/9
- Captured: `03-task5-jeopardy-01-setup.png`, `03-task5-jeopardy-02a-board-fresh.png`, `03-task5-jeopardy-03-question.png`, `03-task5-jeopardy-02-board.png`, `03-task5-jeopardy-04-trivia-board.png`, `03-task5-jeopardy-05-trivia-question.png`
- Not captured: no media question found in jeopardy sweep; tally not reached
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Cells open a question screen with team buttons, then a green Answer with Correct/Wrong; the played cell becomes a dashed ghost and scores update. Defect: the claimed team button is green with grey text (low contrast); question screen is left-aligned with lots of unused space; board still clips the 500 row.

### 04 Task 6 trivia column + tally (`8967c64`)
- Date: 2026-10-11 04:51:13 -0700
- Subject: docs(plan): 🤖 check task 6 boxes, record completed-column rule
- Captured: `04-task6-trivia-01-setup.png`, `04-task6-trivia-02a-board-fresh.png`, `04-task6-trivia-03-question.png`, `04-task6-trivia-02-board.png`, `04-task6-trivia-04-trivia-board.png`, `04-task6-trivia-05-trivia-question.png`, `04-task6-trivia-06-tally.png`
- Not captured: no media question found in jeopardy sweep
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Adds trivia mode: clicking a header runs the column (blue team buttons plus grey Pass) and a Column tally screen with a blue Back to board button. Sparse but legible; board overflow unchanged.

### 05 Task 7 audio (MVP) (`65714c3`)
- Date: 2026-10-11 05:43:54 -0700
- Subject: docs(plan): 🤖 record task 7 council notes, mark milestone reached
- Captured: `05-task7-audio-01-setup.png`, `05-task7-audio-02a-board-fresh.png`, `05-task7-audio-03-question.png`, `05-task7-audio-02-board.png`, `05-task7-audio-08-media.png`, `05-task7-audio-04-trivia-board.png`, `05-task7-audio-05-trivia-question.png`, `05-task7-audio-06-tally.png`
- Not captured: none
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: A native browser audio player appears above the question text, and a Music column is added. Visually the same as Task 6 otherwise; claimed green button still has grey text.

### 06 Task 7.5 multi-win + NYC palette (`6373672`)
- Date: 2026-10-11 13:07:35 -0700
- Subject: docs(plan): 🤖 close task 7.5 — council notes, fixes, verification record
- Captured: `06-task7.5-multiwin-01-setup.png`, `06-task7.5-multiwin-02a-board-fresh.png`, `06-task7.5-multiwin-03-question.png`, `06-task7.5-multiwin-02-board.png`, `06-task7.5-multiwin-08-media.png`, `06-task7.5-multiwin-04-trivia-board.png`, `06-task7.5-multiwin-05-trivia-question.png`, `06-task7.5-multiwin-06-tally.png`
- Not captured: none
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Palette changes from slate/blue to deep navy with NYC orange accents (hover cell, scores, answer text) and steel-blue buttons. Team buttons now toggle green check / red cross, with Reveal answer and Done; negative scores appear. Marked buttons are now white on green/red (readable).

### 07 Task 7.6 images (`c4c1e35`)
- Date: 2026-10-11 14:40:14 -0700
- Subject: docs(plan): 🤖 apply task 7.6 council findings to plan + task 9 design
- Captured: `07-task7.6-images-01-setup.png`, `07-task7.6-images-02a-board-fresh.png`, `07-task7.6-images-03-question.png`, `07-task7.6-images-02-board.png`, `07-task7.6-images-08-media.png`, `07-task7.6-images-04-trivia-board.png`, `07-task7.6-images-05-trivia-question.png`, `07-task7.6-images-06-tally.png`
- Not captured: none
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Question images render above the text. Defect: a 640px solid image fills the top of the 1280x720 screen and pushes the question text, marks and Done below the fold (clipped in 08-media).

### 08 Task 7.7 UI polish (`cba8805`)
- Date: 2026-10-12 01:19:19 -0700
- Subject: docs(plan): 🤖 check off task 7.7 + apply council findings
- Captured: `08-task7.7-polish-01-setup.png`, `08-task7.7-polish-02a-board-fresh.png`, `08-task7.7-polish-03-question.png`, `08-task7.7-polish-02-board.png`, `08-task7.7-polish-08-media.png`, `08-task7.7-polish-04-trivia-board.png`, `08-task7.7-polish-05-trivia-question.png`, `08-task7.7-polish-06-tally.png`
- Not captured: none
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Largest visual change: vendored Atkinson Hyperlegible Next, centered setup with an orange underline, slashed-zero tabular numerals on scores and cells, difficulty ramp (lower rows lighter), rounded bordered cells, Reset scores + Setup buttons. Defects: Start is clipped off the bottom of the four-input setup at 720px; image questions still overflow the viewport.

### 09 Task 7.8 back button + trivia affordance (`65dac47`)
- Date: 2026-10-12 13:33:07 -0700
- Subject: docs(plan): 🤖 check off task 7.8 + council record
- Captured: `09-task7.8-backbtn-01-setup.png`, `09-task7.8-backbtn-02a-board-fresh.png`, `09-task7.8-backbtn-03-question.png`, `09-task7.8-backbtn-02-board.png`, `09-task7.8-backbtn-08-media.png`, `09-task7.8-backbtn-04-trivia-board.png`, `09-task7.8-backbtn-05-trivia-question.png`, `09-task7.8-backbtn-06-tally.png`
- Not captured: none
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Trivia board gains an instruction line (click a category name) and dimmed amounts; question screens get Back to board. Defects: in the trivia board capture the scoreboard top edge is clipped; image question still pushes controls below the fold.

### 10 Task 7.10 random team names (`acecbce`)
- Date: 2026-10-12 16:22:58 -0700
- Subject: docs(plan): 🤖 check off task 7.10 step 4 + annotate stale verify notes
- Captured: `10-task7.10-names-01-setup.png`, `10-task7.10-names-02a-board-fresh.png`, `10-task7.10-names-03-question.png`, `10-task7.10-names-02-board.png`, `10-task7.10-names-08-media.png`, `10-task7.10-names-04-trivia-board.png`, `10-task7.10-names-05-trivia-question.png`, `10-task7.10-names-06-tally.png`
- Not captured: none
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Setup starts with two pre-filled random names (Rusty Gophers, Misty Pickles) with Remove buttons and Add team; Start is orange and enabled immediately. Fits in 720px; no obvious defects.

### 11 Task 8 starter bank (`a1992f1`)
- Date: 2026-10-12 18:08:19 -0700
- Subject: docs(plan): 🤖 check off task 8 (starter question bank)
- Captured: `11-task8-bank-01-setup.png`, `11-task8-bank-02a-board-fresh.png`, `11-task8-bank-03-question.png`, `11-task8-bank-02-board.png`, `11-task8-bank-04-trivia-board.png`, `11-task8-bank-05-trivia-question.png`, `11-task8-bank-06-tally.png`
- Not captured: no media question found in jeopardy sweep
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Real six-category bank replaces the stub; headers are taller. Defects: Childhoods breaks mid-word (Childhood / s); the 500 row is below the fold. The shipped bank has no audio/image questions, so there is no 08-media shot.

### 12 Task 11 about page (`72b7cba`)
- Date: 2026-10-12 20:57:43 -0700
- Subject: docs(plan): 🤖 check off task 11 + council fixes (link target, focus, task 9 pin)
- Captured: `12-task11-about-01-setup.png`, `12-task11-about-02a-board-fresh.png`, `12-task11-about-03-question.png`, `12-task11-about-02-board.png`, `12-task11-about-04-trivia-board.png`, `12-task11-about-05-trivia-question.png`, `12-task11-about-06-tally.png`, `12-task11-about-07-about.png`
- Not captured: no media question found in jeopardy sweep
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: About button appears under the setup controls, and the About page is a single-column bullet list at large type. Defect: the heading is tight to the top and the list runs below the 720px fold.

### 13 Task 9 folder mode (`2aa76e2`)
- Date: 2026-10-13 11:40:01 -0700
- Subject: docs(plan): 🤖 check off task 9 (folder mode + create new)
- Captured: `13-task9-folder-01-setup.png`, `13-task9-folder-02a-board-fresh.png`, `13-task9-folder-03-question.png`, `13-task9-folder-02-board.png`, `13-task9-folder-04-trivia-board.png`, `13-task9-folder-05-trivia-question.png`, `13-task9-folder-06-tally.png`, `13-task9-folder-07-about.png`
- Not captured: no media question found in jeopardy sweep
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Setup gains quiet Load folder / Create new / About buttons under Start and still fits in 720px. Board and question screens unchanged; mid-word Childhoods break and cut-off bottom row persist.

### 14 Task 13 / Qwen final (`f603230`)
- Date: 2026-10-14 08:18:03 -0700
- Subject: docs(plan): 🤖 close two stale boxes (task 8 verify, task 10 pages handoff)
- Captured: `14-task13-final-01-setup.png`, `14-task13-final-02a-board-fresh.png`, `14-task13-final-03-question.png`, `14-task13-final-02-board.png`, `14-task13-final-04-trivia-board.png`, `14-task13-final-05-trivia-question.png`, `14-task13-final-06-tally.png`, `14-task13-final-07-about.png`
- Not captured: no media question found in jeopardy sweep
- Console errors: Failed to load resource: the server responded with a status of 404 (Not Found)
- Visible vs previous: Question screen is tightened to fit worst case, trivia question has Reveal answer, and About is a two-column layout that fits on one screen with an orange link. Remaining defects: Childhoods still breaks mid-word, bottom board row is cut at 720px, slashed-zero numerals look odd.
