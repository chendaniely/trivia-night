# Numbers

All counts from `git log --all` (117 commits) at head `81887b4` on `claude/council-fixes`. Model = Co-Authored-By trailer. Times America/Los_Angeles.

**Line-count rule:** lines added/removed come from `git log --numstat`, **excluding `js/yaml.js` (vendored js-yaml 5.4.3), `package-lock.json`, binary files (3 wav, 2 png, 1 woff2: numstat prints `-`) and the 14 bot deploy commits** (they snapshot the whole tree onto gh-pages). Everything else counts, including docs and plan edits.

## 1. Commits and lines by model

| model | commits | lines added | lines removed |
|---|---|---|---|
| Qwen 3.8 27B | 85 | 3673 | 494 |
| Claude Opus 5.5 | 10 | 1624 | 198 |
| Claude Sonnet 5.5 | 6 | 342 | 51 |
| Claude Haiku 5.5 | 2 | 49 | 38 |
| github-actions (bot) | 14 | - | - |
| **Claude total** | 18 | 2015 | 287 |
| **All** | 117 | 5688 | 781 |

Lines added / removed by file category (same exclusions):

| who | src (js/*.js, css, html) | tests | bank (questions.yaml) | docs (*.md, docs/ incl. README, AGENTS) | other (tools, Makefile, workflows, json, gitignore) |
|---|---|---|---|---|---|
| Qwen | +1507/-243 | +299/-3 | +131/-31 | +1517/-214 | +219/-3 |
| Claude (all) | +773/-157 | +483/-42 | +49/-38 | +710/-50 | +0/-0 |
| Opus 5.5 | +590/-116 | +329/-33 | +0/-0 | +705/-49 | +0/-0 |
| Sonnet 5.5 | +183/-41 | +154/-9 | +0/-0 | +5/-1 | +0/-0 |
| Haiku 5.5 | +0/-0 | +0/-0 | +49/-38 | +0/-0 | +0/-0 |

The Claude docs figure is dominated by `b15c778` (+632 lines, adding Tasks 14-23 to the plan).

## 2. Commits by type (conventional-commit prefix)

| type | commits | by model |
|---|---|---|
| docs | 49 | {'Qwen': 42, 'Opus': 7} |
| feat | 30 | {'Qwen': 28, 'Opus': 2} |
| fix | 15 | {'Qwen': 6, 'Haiku': 2, 'Sonnet': 6, 'Opus': 1} |
| deploy | 14 | {'bot': 14} |
| chore | 5 | {'Qwen': 5} |
| ci | 2 | {'Qwen': 2} |
| build | 2 | {'Qwen': 2} |

`docs(plan)` commits (add-task / check-off / council bookkeeping): 43 of 103 non-bot commits (41%); Qwen 36, Claude 7. All `docs` commits of any scope: 49.

Qwen's 85 commits: 28 feat, 6 fix, 42 docs, 9 chore/build/ci. Claude's 18: 2 feat, 9 fix, 7 docs. No `test:`, `refactor:`, `style:` or `perf:` type was ever used; test files only ever changed inside feat/fix/docs(plan) commits.

`docs(plan)` commits that also changed non-doc files (code/test/CSS folded into a bookkeeping commit): `cba8805`, `15630bd`, `72645c6`, `72b7cba`.

## 3. Time span per task (first -> last non-bot commit by author date)

| task | model | first | last | span | commits | feat/fix/docs | + | - |
|---|---|---|---|---|---|---|---|---|
| Setup | Qwen | 10-10 22:56 | 10-11 03:00 | 4.1 h | 5 | 0/0/2 | 247 | 2 |
| Plan | Qwen | 10-11 00:30 | 10-11 03:00 | 150 min | 2 | 0/0/2 | 493 | 21 |
| 10 | Qwen | 10-11 00:30 | 10-11 01:55 | 84 min | 4 | 0/0/1 | 37 | 13 |
| 1 | Qwen | 10-11 03:01 | 10-11 03:14 | 12 min | 3 | 2/0/1 | 86 | 8 |
| 2 | Qwen | 10-11 03:17 | 10-11 03:38 | 20 min | 4 | 2/0/2 | 227 | 9 |
| 3 | Qwen | 10-11 03:41 | 10-11 03:59 | 18 min | 4 | 2/0/2 | 196 | 14 |
| 4 | Qwen | 10-11 04:03 | 10-11 04:21 | 17 min | 4 | 1/1/2 | 112 | 9 |
| 5 | Qwen | 10-11 04:25 | 10-11 04:46 | 20 min | 4 | 1/1/2 | 123 | 11 |
| 6 | Qwen | 10-11 04:50 | 10-11 04:51 | 0 min | 2 | 1/0/1 | 111 | 8 |
| 7 | Qwen | 10-11 05:26 | 10-11 05:43 | 17 min | 3 | 1/0/2 | 96 | 15 |
| 7.5 | Qwen | 10-11 10:44 | 10-11 13:07 | 142 min | 9 | 3/2/3 | 353 | 156 |
| 7.6 | Qwen | 10-11 13:37 | 10-11 14:40 | 62 min | 7 | 3/0/4 | 220 | 20 |
| (unplanned) | Qwen | 10-11 18:50 | 10-12 13:35 | 18.8 h | 2 | 0/0/0 | 14 | 0 |
| 7.7 | Qwen | 10-12 00:09 | 10-12 01:19 | 69 min | 5 | 3/0/2 | 197 | 57 |
| 7.8 | Qwen | 10-12 12:49 | 10-12 13:33 | 43 min | 5 | 2/1/2 | 98 | 10 |
| 7.9 | Qwen | 10-12 14:09 | 10-12 14:41 | 31 min | 3 | 1/0/2 | 93 | 24 |
| 7.10 | Qwen | 10-12 15:16 | 10-12 16:22 | 66 min | 6 | 2/0/4 | 156 | 19 |
| 8 | Qwen | 10-12 17:51 | 10-12 18:08 | 17 min | 2 | 1/0/1 | 106 | 35 |
| 11/12 | Qwen | 10-12 19:17 | 10-12 19:17 | 0 min | 1 | 0/0/1 | 53 | 0 |
| 11 | Qwen | 10-12 19:34 | 10-12 20:57 | 83 min | 2 | 1/0/1 | 79 | 8 |
| 12 | Qwen | 10-12 21:19 | 10-12 21:19 | 0 min | 1 | 0/0/1 | 91 | 5 |
| 9 | Qwen | 10-13 00:31 | 10-13 11:40 | 11.1 h | 2 | 1/0/1 | 402 | 34 |
| 13 | Qwen | 10-13 14:33 | 10-14 00:41 | 10.1 h | 4 | 1/1/2 | 76 | 14 |
| 8/10 bookkeeping | Qwen | 10-14 08:18 | 10-14 08:18 | 0 min | 1 | 0/0/1 | 7 | 2 |
| 14-23 plan | Opus | 10-14 08:44 | 10-14 08:44 | 0 min | 1 | 0/0/1 | 632 | 0 |
| 14 | Haiku/Opus | 10-14 08:45 | 10-14 08:48 | 2 min | 3 | 0/2/1 | 55 | 42 |
| 15 | Opus/Sonnet | 10-14 08:48 | 10-14 08:50 | 1 min | 2 | 0/1/1 | 128 | 22 |
| 16 | Opus/Sonnet | 10-14 08:51 | 10-14 08:52 | 1 min | 2 | 0/1/1 | 103 | 9 |
| 17 | Opus/Sonnet | 10-14 08:53 | 10-14 08:58 | 4 min | 4 | 0/3/1 | 103 | 31 |
| 18 | Opus | 10-14 09:20 | 10-14 09:49 | 29 min | 4 | 2/1/1 | 957 | 173 |
| 19 | Opus/Sonnet | 10-14 09:54 | 10-14 09:55 | 1 min | 2 | 0/1/1 | 37 | 10 |

Caveats: spans include sleep/idle. Task 9's `35e2b32` carries author date 00:31 but was amended at 11:38 (committer date), so its span is 00:31 -> 11:40 with the code finished mid-span. Task 13 runs 10-13 14:33 -> 10-14 00:41 because the check-off commit came overnight. Task 8 plan task has its feat at 17:51 and check-off at 18:08. Task 10 is listed under '10' (executed first, 10-11 00:30-01:55). Row '(unplanned)' is the Makefile commit (10-11 18:50) and the question-drafts folder commit (10-12 13:35), not a unit of work; its 18.8 h span is meaningless. Row '11/12' is the single `docs(plan)` commit that added both tasks.

## 4. fix commits and fix-after-feat

| sha | model | task | time | subject | after a feat in same task? |
|---|---|---|---|---|---|
| `93aa194` | Qwen | 4 | 10-11 04:21 | fix(board): 🤖 wrap long category names in headers | yes |
| `b49695e` | Qwen | 5 | 10-11 04:46 | fix(app): 🤖 reset flow state on bank load, un-point trivia cells | yes |
| `dddda9c` | Qwen | 7.5 | 10-11 13:05 | fix(question): 🤖 skip used cells when a column starts mid-game | yes |
| `a82ee3e` | Qwen | 7.5 | 10-11 13:05 | fix(app): 🤖 start a fresh game when the question bank reloads | yes |
| `76a4c75` | Qwen | 7.8 | 10-12 13:32 | fix(question): 🤖 controls row keeps its own button classes | yes |
| `6387eba` | Qwen | 13 | 10-13 17:07 | fix(question): 🤖 fit worst-case question screen at 1280x720 | yes |
| `c2cc6c5` | Haiku | 14 | 10-14 08:45 | fix(bank): 🤖 correct 7 wrong answers and 6 shaky questions | no feat earlier in task |
| `bdf25d8` | Haiku | 14 | 10-14 08:47 | fix(bank): 🤖 accept rarer five-vowel words in the Words finale | no feat earlier in task |
| `a91b6e7` | Sonnet | 15 | 10-14 08:48 | fix(validate): 🤖 report unknown keys and give hosts actionable locations | no feat earlier in task |
| `66604e1` | Sonnet | 16 | 10-14 08:51 | fix(folder): 🤖 Create new picks the folder first and never overwrites | no feat earlier in task |
| `21aba93` | Sonnet | 17 | 10-14 08:53 | fix(folder): 🤖 one normPath for FSA and webkitdirectory; encode shipped media src | no feat earlier in task |
| `b87e688` | Sonnet | 17 | 10-14 08:55 | fix(app): 🤖 error-screen exit, visible picker failures, carried names, bank title | no feat earlier in task |
| `82ebd70` | Sonnet | 17 | 10-14 08:57 | fix(app): 🤖 keep error-screen buttons above the list | no feat earlier in task |
| `739d029` | Opus | 18 | 10-14 09:47 | fix(game): 🤖 one save slot per board, setup Back to board, save hints | yes |
| `986abf9` | Sonnet | 19 | 10-14 09:54 | fix(question): 🤖 media built once per question, audio pauses on leave, dark controls | no feat earlier in task |

Qwen: 6 `fix` commits vs 28 `feat` commits; 6 of those fixes follow a feat of the same task. Claude pass: 9 `fix` commits (Tasks 14, 14, 15, 16, 17, 17, 17, 18, 19), i.e. fixes there are the primary deliverable, not follow-ups (only `739d029` is a follow-up to a feat in the same task, `cf26ed4`).

Feat-then-fix-in-same-task pairs (Qwen): `93aa194` (4), `b49695e` (5), `dddda9c` (7.5), `a82ee3e` (7.5), `76a4c75` (7.8), `6387eba` (13).
Besides `fix`-typed commits, several Qwen `feat` commits implement a forward-council finding on a task already closed (`faf8560` for Task 1, `1d82698` for Task 2, `67da820` for Task 3): these are fix-after-feat in substance but typed feat.

## 5. Tests over time

Test files are plain `node:assert/strict` scripts (no framework); `node --test` runs each file as one test. "assertions" = count of `assert(...)`/`assert.xxx(` calls in the file text at that commit (static count; loops in a test would execute more at runtime). Rows = every non-bot commit that touched `test/`.

| commit | time | subject | test files | assert calls | per file |
|---|---|---|---|---|---|
| `9c9d863` | 10-11 03:01 | feat(scoring): 🤖 add scoring engine with per-round tallies | 1 | 12 | scoring 12 |
| `faf8560` | 10-11 03:14 | feat(scoring): 🤖 add per-team round totals for column tally | 1 | 16 | scoring 16 |
| `31ef6f6` | 10-11 03:17 | feat(yaml): 🤖 add yaml validation with line-numbered errors | 2 | 37 | scoring 16, validate 21 |
| `1d82698` | 10-11 03:34 | feat(yaml): 🤖 reject duplicate round names and empty rounds | 2 | 44 | scoring 16, validate 28 |
| `367dd70` | 10-11 13:40 | feat(validate): 🤖 accept question.images (list of paths) in  | 2 | 51 | scoring 16, validate 35 |
| `cafc27d` | 10-12 15:18 | feat(setup): 🤖 random adj+noun team names on Add, no word re | 3 | 59 | scoring 16, teams 8, validate 35 |
| `72645c6` | 10-12 15:38 | docs(plan): 🤖 check off task 7.10 + fix vacuous typed-clash  | 3 | 59 | scoring 16, teams 8, validate 35 |
| `35e2b32` | 10-13 00:31 | feat(folder): 🤖 add local folder mode + create new (Task 9) | 4 | 70 | folder 11, scoring 16, teams 8, validate 35 |
| `a91b6e7` | 10-14 08:48 | fix(validate): 🤖 report unknown keys and give hosts actionab | 4 | 89 | folder 11, scoring 16, teams 8, validate 54 |
| `66604e1` | 10-14 08:51 | fix(folder): 🤖 Create new picks the folder first and never o | 4 | 99 | folder 21, scoring 16, teams 8, validate 54 |
| `21aba93` | 10-14 08:53 | fix(folder): 🤖 one normPath for FSA and webkitdirectory; enc | 4 | 102 | folder 24, scoring 16, teams 8, validate 54 |
| `9dc83be` | 10-14 09:20 | feat(scoring): 🤖 scoring snapshot/restore + pure saved-game  | 5 | 170 | folder 27, persist 48, scoring 33, teams 8, validate 54 |
| `739d029` | 10-14 09:47 | fix(game): 🤖 one save slot per board, setup Back to board, s | 5 | 213 | folder 27, persist 91, scoring 33, teams 8, validate 54 |

`node --test` at `f603230` (exported with `git archive` into a scratch dir): tests 4, pass 4, fail 0 (folder, scoring, teams, validate). At head `81887b4`: tests 5, pass 5, fail 0 (adds persist).

Never tested by any test file: `js/app.js`, `js/board.js`, `js/question.js` (all DOM), `styles.css`. Tests cover only pure modules (scoring, validate, teams, folder helpers, persist). UI behaviour was verified by Playwright MCP text snapshots + computed-style assertions (Qwen) and by Chrome scripts under `.superpowers/sdd/.../work-task-*/verify.mjs` (Claude pass, not committed to the tracked tree).

## 6. Lines per file: Qwen's last commit `f603230` vs branch head `81887b4`

Text files only; excludes `js/yaml.js` (vendored), `package-lock.json`, binaries (fonts/audio/images) and the plan/spec under `docs/` (listed separately). `-` = file does not exist at that commit. Line counts are `wc -l` style (newline count).

| file | f603230 | 81887b4 (head) | delta |
|---|---|---|---|
| `.github/workflows/deploy-gh-pages.yml` | 21 | 21 | 0 |
| `AGENTS.md` | 48 | 48 | 0 |
| `README.md` | 75 | 91 | 16 |
| `index.html` | 87 | 101 | 14 |
| `js/app.js` | 242 | 516 | 274 |
| `js/board.js` | 101 | 105 | 4 |
| `js/folder.js` | 185 | 209 | 24 |
| `js/persist.js` | - | 177 | 177 |
| `js/question.js` | 329 | 373 | 44 |
| `js/scoring.js` | 30 | 55 | 25 |
| `js/teams.js` | 38 | 38 | 0 |
| `js/validate.js` | 95 | 142 | 47 |
| `opencode.json` | 12 | 12 | 0 |
| `package.json` | 21 | 21 | 0 |
| `questions.yaml` | 100 | 111 | 11 |
| `styles.css` | 157 | 164 | 7 |
| `test/folder.test.mjs` | 44 | 148 | 104 |
| `test/persist.test.mjs` | - | 231 | 231 |
| `test/scoring.test.mjs` | 46 | 97 | 51 |
| `test/teams.test.mjs` | 42 | 42 | 0 |
| `test/validate.test.mjs` | 164 | 219 | 55 |
| `tools/local-server.py` | 19 | 19 | 0 |
| `tools/make-demo-audio.mjs` | 48 | 48 | 0 |
| `tools/make-demo-images.mjs` | 71 | 71 | 0 |
| **total (listed)** | 1975 | 3059 | 1084 |

Plan: 988 lines at `f603230` -> 1632 at head (29 `### Task` headings at head, 19 at `f603230`, 10 originally). Spec: 192 -> 192 (spec untouched since 10-11). `js/yaml.js` (vendored): 3602 lines.

Note: the working tree on `claude/council-fixes` had uncommitted edits to `js/question.js` and `styles.css` when this was generated (Task 20+ work in progress); the head column is the committed `81887b4`, not the working tree.
