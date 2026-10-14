# Commit timeline (all 117 commits from `git log --all`)

Timestamps: author date, America/Los_Angeles (-0700), 2026. Sorted by author time. Model = Co-Authored-By trailer
(`github-actions` = the `peaceiris/actions-gh-pages` deploy commits onto the `gh-pages` branch, author `chendaniely`, no trailer, no 🤖).
+/- = lines added/removed, **excluding `js/yaml.js` (vendored js-yaml) and `package-lock.json`; binary files (wav/png/woff2) show as `-` in numstat and are not counted**. `files` counts every file including those. Bot deploy commits snapshot the whole tree, so their line counts are omitted.

Branch facts: `main` holds Qwen's work up to `f603230` (and the bot deploys); everything after `f603230` is on `claude/council-fixes` (head `81887b4` at time of writing). Task column: plan task number (see `requests.md` for plan evolution); `Setup`/`Plan` = pre-task scaffolding; `(unplanned)` = commit with no plan task.

Totals: 117 commits = 85 Qwen + 18 Claude (10 Opus 5.5, 6 Sonnet 5.5, 2 Haiku 5.5) + 14 bot deploys. One extra object exists only in the reflog: `900becc` (the pre-amend version of `35e2b32`; see below).

| # | sha | time | model | subject | task | files | +/- | flags |
|---|-----|------|-------|---------|------|-------|-----|-------|
| 1 | `1099feb` | 10-10 22:56 | Qwen | docs: 🤖 add design spec and agent protocol | Setup | 2 | +202/-0 | no scope |
| 2 | `d8b5fba` | 10-10 23:03 | Qwen | chore: 🤖 add playwright toolchain and project config | Setup | 4 | +41/-0 | no scope |
| 3 | `2032e93` | 10-11 00:30 | Qwen | docs: 🤖 add implementation plan (10 tasks, mvp demo milestone) | Plan | 1 | +460/-0 | no scope |
| 4 | `5083287` | 10-11 00:30 | Qwen | ci: 🤖 add gh-pages deploy workflow | 10 | 1 | +21/-0 | no scope |
| 5 | `7677f84` | 10-11 00:30 | Qwen | chore: 🤖 seed empty gh-pages branch for deploys | 10 | 0 | +0/-0 | no scope |
| 6 | `23538b0` | 10-11 00:30 | bot | deploy: 50832872fc93a62b7326f62e40618e732d583c62 | (deploy) | 1 | - | bot deploy (gh-pages) |
| 7 | `71d3f7f` | 10-11 01:55 | Qwen | docs(plan): 🤖 correct task 10 record after council fix | 10 | 1 | +14/-11 | docs(plan) bookkeeping |
| 8 | `d4f35d0` | 10-11 01:55 | Qwen | docs(protocol): 🤖 require type(scope) in commit messages | Setup | 1 | +2/-1 |  |
| 9 | `eb0be89` | 10-11 01:55 | Qwen | chore(repo): 🤖 mark package.json as module for ESM self-checks | Setup | 1 | +1/-1 |  |
| 10 | `3e86ac9` | 10-11 01:55 | Qwen | ci(deploy): 🤖 fix gh-pages workflow inputs to publish_branch/publish_dir | 10 | 1 | +2/-2 |  |
| 11 | `fa24cf7` | 10-11 01:55 | bot | deploy: 71d3f7f4e07e2fa8fb7e8a6e8afa47cf3c0b7881 | (deploy) | 7 | - | bot deploy (gh-pages) |
| 12 | `336fed8` | 10-11 03:00 | Qwen | chore(repo): 🤖 gitignore playwright mcp artifact dir | Setup | 1 | +1/-0 |  |
| 13 | `946de07` | 10-11 03:00 | Qwen | docs(plan): 🤖 apply council fixes across tasks 1-9 | Plan | 1 | +33/-21 | docs(plan) bookkeeping |
| 14 | `9c9d863` | 10-11 03:01 | Qwen | feat(scoring): 🤖 add scoring engine with per-round tallies | 1 | 2 | +60/-0 |  |
| 15 | `f143793` | 10-11 03:14 | Qwen | docs(plan): 🤖 check task 1 boxes, wire roundTeamTotal into task 6 | 1 | 1 | +9/-7 | docs(plan) bookkeeping |
| 16 | `faf8560` | 10-11 03:14 | Qwen | feat(scoring): 🤖 add per-team round totals for column tally | 1 | 2 | +17/-1 | council-driven |
| 17 | `31ef6f6` | 10-11 03:17 | Qwen | feat(yaml): 🤖 add yaml validation with line-numbered errors | 2 | 5 | +171/-0 |  |
| 18 | `496f4c1` | 10-11 03:18 | Qwen | docs(plan): 🤖 check task 2 boxes | 2 | 1 | +7/-7 | docs(plan) bookkeeping |
| 19 | `1d82698` | 10-11 03:34 | Qwen | feat(yaml): 🤖 reject duplicate round names and empty rounds | 2 | 2 | +47/-0 | council-driven |
| 20 | `bef05b6` | 10-11 03:38 | Qwen | docs(plan): 🤖 record task 2 council fixes (dup names, empty rounds) | 2 | 1 | +2/-2 | docs(plan) bookkeeping |
| 21 | `870b49a` | 10-11 03:41 | Qwen | feat(app): 🤖 add app shell and setup screen | 3 | 4 | +167/-0 |  |
| 22 | `10ff3da` | 10-11 03:41 | Qwen | docs(plan): 🤖 check task 3 boxes, add error screen to showScreen | 3 | 1 | +5/-5 | docs(plan) bookkeeping |
| 23 | `c5b9538` | 10-11 03:59 | Qwen | docs(plan): 🤖 record task 3 council fixes (loader hook, error export) | 3 | 1 | +3/-2 | docs(plan) bookkeeping |
| 24 | `67da820` | 10-11 03:59 | Qwen | feat(app): 🤖 export error panel and source-aware retry hook | 3 | 1 | +21/-7 | council-driven |
| 25 | `c0aa8b8` | 10-11 04:03 | Qwen | feat(board): 🤖 add board grid, scoreboard, and reset | 4 | 3 | +98/-1 |  |
| 26 | `3ea85d9` | 10-11 04:04 | Qwen | docs(plan): 🤖 check task 4 boxes, move block-scalar note to task 5 | 4 | 1 | +5/-5 | docs(plan) bookkeeping |
| 27 | `1b40bc5` | 10-11 04:21 | Qwen | docs(plan): 🤖 correct task 4 interfaces, add task 6 cell rule | 4 | 1 | +8/-3 | docs(plan) bookkeeping |
| 28 | `93aa194` | 10-11 04:21 | Qwen | fix(board): 🤖 wrap long category names in headers | 4 | 1 | +1/-0 | fix-after-feat; council-driven |
| 29 | `890eca0` | 10-11 04:25 | Qwen | feat(question): 🤖 add jeopardy question flow with claim and reveal | 5 | 3 | +105/-1 |  |
| 30 | `fa13f57` | 10-11 04:26 | Qwen | docs(plan): 🤖 check task 5 boxes, record verified sequence | 5 | 1 | +4/-4 | docs(plan) bookkeeping |
| 31 | `f808951` | 10-11 04:46 | Qwen | docs(plan): 🤖 record task 5 council notes for tasks 6/7/9 | 5 | 1 | +4/-4 | docs(plan) bookkeeping |
| 32 | `b49695e` | 10-11 04:46 | Qwen | fix(app): 🤖 reset flow state on bank load, un-point trivia cells | 5 | 3 | +10/-2 | fix-after-feat; council-driven |
| 33 | `127ee57` | 10-11 04:50 | Qwen | feat(trivia): 🤖 add trivia column flow with pass and tally | 6 | 4 | +107/-4 |  |
| 34 | `8967c64` | 10-11 04:51 | Qwen | docs(plan): 🤖 check task 6 boxes, record completed-column rule | 6 | 1 | +4/-4 | docs(plan) bookkeeping |
| 35 | `d8eb078` | 10-11 05:26 | Qwen | feat(audio): 🤖 add audio playback with generated demo clips | 7 | 7 | +83/-2 |  |
| 36 | `a5a89c5` | 10-11 05:26 | Qwen | docs(plan): 🤖 check task 7 boxes, record verified audio paths | 7 | 1 | +10/-10 | docs(plan) bookkeeping |
| 37 | `65714c3` | 10-11 05:43 | Qwen | docs(plan): 🤖 record task 7 council notes, mark milestone reached | 7 | 1 | +3/-3 | docs(plan) bookkeeping |
| 38 | `af71d0a` | 10-11 10:44 | Qwen | docs(plan): 🤖 add task 7.5 (MVP feedback), mark tasks 5/6 superseded | 7.5 | 1 | +70/-0 | docs(plan) bookkeeping; gap 5.0h before |
| 39 | `60021ff` | 10-11 10:44 | Qwen | docs(spec): 🤖 record MVP feedback — multi-win, reveal, setup return, NYC palette | 7.5 | 1 | +27/-8 |  |
| 40 | `7f53891` | 10-11 11:37 | Qwen | feat(theme): 🤖 add NYC orange/blue dark palette | 7.5 | 1 | +22/-15 |  |
| 41 | `05fcb4d` | 10-11 12:06 | Qwen | feat(question): 🤖 multi-win toggles with manual reveal and done | 7.5 | 2 | +139/-107 |  |
| 42 | `30fdb76` | 10-11 12:22 | Qwen | feat(board): 🤖 back-to-setup with prefilled names and kept scores | 7.5 | 2 | +24/-7 |  |
| 43 | `9abe0e8` | 10-11 12:22 | Qwen | chore(dev): 🤖 add no-store local server for reliable Playwright runs | 7.5 | 1 | +19/-0 |  |
| 44 | `dddda9c` | 10-11 13:05 | Qwen | fix(question): 🤖 skip used cells when a column starts mid-game | 7.5 | 2 | +17/-12 | fix-after-feat; council-driven |
| 45 | `a82ee3e` | 10-11 13:05 | Qwen | fix(app): 🤖 start a fresh game when the question bank reloads | 7.5 | 1 | +4/-0 | fix-after-feat; council-driven |
| 46 | `6373672` | 10-11 13:07 | Qwen | docs(plan): 🤖 close task 7.5 — council notes, fixes, verification record | 7.5 | 1 | +31/-7 | docs(plan) bookkeeping |
| 47 | `4a4ed3a` | 10-11 13:37 | Qwen | docs(plan): 🤖 add task 7.6 (question images), note media in tasks 8/9 | 7.6 | 1 | +45/-2 | docs(plan) bookkeeping |
| 48 | `d7964f1` | 10-11 13:37 | Qwen | docs(spec): 🤖 questions may reference images (images: list of paths) | 7.6 | 1 | +11/-3 |  |
| 49 | `367dd70` | 10-11 13:40 | Qwen | feat(validate): 🤖 accept question.images (list of paths) in the bank | 7.6 | 2 | +42/-0 |  |
| 50 | `22e00ee` | 10-11 14:14 | Qwen | feat(question): 🤖 render question images in both flows | 7.6 | 2 | +30/-2 |  |
| 51 | `9e69724` | 10-11 14:21 | Qwen | feat(bank): 🤖 demo image generator + stub image refs | 7.6 | 4 | +76/-0 |  |
| 52 | `5b0d2c5` | 10-11 14:21 | Qwen | docs(plan): 🤖 check off task 7.6 (question images), all steps verified | 7.6 | 1 | +9/-7 | docs(plan) bookkeeping |
| 53 | `c4c1e35` | 10-11 14:40 | Qwen | docs(plan): 🤖 apply task 7.6 council findings to plan + task 9 design | 7.6 | 1 | +7/-6 | docs(plan) bookkeeping |
| 54 | `19451d8` | 10-11 18:50 | Qwen | build(makefile): 🤖 add Makefile to launch the app locally | (unplanned) | 1 | +10/-0 | gap 4.2h before |
| 55 | `606dce8` | 10-12 00:09 | Qwen | docs(plan): 🤖 add task 7.7 (UI polish) + text-only verify constraint | 7.7 | 1 | +71/-0 | docs(plan) bookkeeping; gap 5.3h before |
| 56 | `1630f28` | 10-12 00:32 | Qwen | feat(theme): 🤖 vendor Atkinson Hyperlegible Next + base type tokens | 7.7 | 3 | +38/-18 |  |
| 57 | `51c468a` | 10-12 00:34 | Qwen | feat(board): 🤖 polish board grid, difficulty ramp, score plaques | 7.7 | 2 | +24/-11 |  |
| 58 | `fb7d3c4` | 10-12 00:36 | Qwen | feat(question): 🤖 motion pass — title card, question scale, reveal, reduced-motion | 7.7 | 1 | +33/-11 |  |
| 59 | `cba8805` | 10-12 01:19 | Qwen | docs(plan): 🤖 check off task 7.7 + apply council findings | 7.7 | 3 | +31/-17 | docs(plan) bookkeeping |
| 60 | `a60b03a` | 10-12 12:49 | Qwen | docs(plan): 🤖 add task 7.8 (back button + trivia click affordance) | 7.8 | 1 | +30/-0 | docs(plan) bookkeeping; gap 11.5h before |
| 61 | `5a78202` | 10-12 13:01 | Qwen | feat(question): 🤖 add Back to board on both question screens | 7.8 | 2 | +31/-0 |  |
| 62 | `38bcbf4` | 10-12 13:03 | Qwen | feat(board): 🤖 make trivia click target obvious | 7.8 | 2 | +14/-1 |  |
| 63 | `76a4c75` | 10-12 13:32 | Qwen | fix(question): 🤖 controls row keeps its own button classes | 7.8 | 2 | +5/-3 | fix-after-feat; council-driven |
| 64 | `65dac47` | 10-12 13:33 | Qwen | docs(plan): 🤖 check off task 7.8 + council record | 7.8 | 1 | +18/-6 | docs(plan) bookkeeping |
| 65 | `2f964fb` | 10-12 13:33 | bot | deploy: 65dac4795b925eac0dcfabf0641ad28c63338ca2 | (deploy) | 26 | - | bot deploy (gh-pages) |
| 66 | `c1b3331` | 10-12 13:35 | Qwen | build(repo): 🤖 add local question-drafts folder (contents ignored) | (unplanned) | 2 | +4/-0 |  |
| 67 | `ae9be60` | 10-12 13:35 | bot | deploy: c1b3331cae89d7c7f15cf55fb32e58e3b5be4dae | (deploy) | 2 | - | bot deploy (gh-pages) |
| 68 | `61c4a5e` | 10-12 14:09 | Qwen | docs(plan): 🤖 add task 7.9 (dynamic team count, no cap) | 7.9 | 1 | +34/-0 | docs(plan) bookkeeping |
| 69 | `add404e` | 10-12 14:11 | Qwen | feat(setup): 🤖 dynamic team rows — add/remove, min 2, no cap | 7.9 | 2 | +41/-16 |  |
| 70 | `15630bd` | 10-12 14:41 | Qwen | docs(plan): 🤖 check off task 7.9 + council fix (stale teamNames on bank load) | 7.9 | 2 | +18/-8 | docs(plan) bookkeeping |
| 71 | `40617e1` | 10-12 14:41 | bot | deploy: 15630bd91e05e3d97418c2a8e6a6953b7c7db7d2 | (deploy) | 3 | - | bot deploy (gh-pages) |
| 72 | `8552cac` | 10-12 15:16 | Qwen | docs(plan): 🤖 add task 7.10 (random adj+noun team names, no word reuse) | 7.10 | 1 | +30/-0 | docs(plan) bookkeeping |
| 73 | `cafc27d` | 10-12 15:18 | Qwen | feat(setup): 🤖 random adj+noun team names on Add, no word reuse | 7.10 | 3 | +83/-3 |  |
| 74 | `72645c6` | 10-12 15:38 | Qwen | docs(plan): 🤖 check off task 7.10 + fix vacuous typed-clash test | 7.10 | 2 | +18/-8 | docs(plan) bookkeeping |
| 75 | `e5a5713` | 10-12 15:38 | bot | deploy: 72645c6c06f024a5b7a8fdd9d6e52e253eb1da03 | (deploy) | 4 | - | bot deploy (gh-pages) |
| 76 | `035e7fc` | 10-12 16:08 | Qwen | docs(plan): 🤖 task 7.10 step 4 — pre-fill initial team rows on start | 7.10 | 1 | +8/-3 | docs(plan) bookkeeping |
| 77 | `f1c3319` | 10-12 16:08 | Qwen | feat(setup): 🤖 pre-fill initial team names on app start | 7.10 | 1 | +6/-1 |  |
| 78 | `acecbce` | 10-12 16:22 | Qwen | docs(plan): 🤖 check off task 7.10 step 4 + annotate stale verify notes | 7.10 | 1 | +11/-4 | docs(plan) bookkeeping |
| 79 | `bd8a0bc` | 10-12 16:23 | bot | deploy: acecbcea5a5aa883ff972c38fd65394766b7a348 | (deploy) | 2 | - | bot deploy (gh-pages) |
| 80 | `a3aae4e` | 10-12 17:51 | Qwen | feat(bank): 🤖 add starter question bank across six categories | 8 | 1 | +94/-31 | council-driven |
| 81 | `a1992f1` | 10-12 18:08 | Qwen | docs(plan): 🤖 check off task 8 (starter question bank) | 8 | 1 | +12/-4 | docs(plan) bookkeeping |
| 82 | `0ff3ef2` | 10-12 18:08 | bot | deploy: a1992f1b304b06bfefdcd7e677db16cafa2a8879 | (deploy) | 2 | - | bot deploy (gh-pages) |
| 83 | `d0f8440` | 10-12 19:17 | Qwen | docs(plan): 🤖 add tasks 11 (about page) + 12 (readme + agents sync rule) | 11/12 | 1 | +53/-0 | docs(plan) bookkeeping |
| 84 | `55a4bfb` | 10-12 19:34 | Qwen | feat(app): 🤖 add about page — what it is, how to use it, repo link | 11 | 3 | +58/-1 |  |
| 85 | `72b7cba` | 10-12 20:57 | Qwen | docs(plan): 🤖 check off task 11 + council fixes (link target, focus, task 9 pin) | 11 | 3 | +21/-7 | docs(plan) bookkeeping |
| 86 | `1c279ad` | 10-12 21:19 | Qwen | docs(readme): 🤖 add human-facing README + AGENTS sync rule | 12 | 3 | +91/-5 |  |
| 87 | `ede3231` | 10-12 21:19 | bot | deploy: 1c279ad13482828d755ecda4617b8666be4f4de5 | (deploy) | 6 | - | bot deploy (gh-pages) |
| 88 | `35e2b32` | 10-13 00:31 | Qwen | feat(folder): 🤖 add local folder mode + create new (Task 9) | 9 | 6 | +358/-17 | council-driven; AMENDED (orig 900becc, force-with-lease); gap 3.2h before |
| 89 | `4ad7f5b` | 10-13 00:31 | bot | deploy: 900becca17c5683de00aaabf1856af17eb5cfdbf | (deploy) | 6 | - | bot deploy (gh-pages) |
| 90 | `c79a2a9` | 10-13 11:38 | bot | deploy: 35e2b324b71115ad50e05f7205aa2380f03002c5 | (deploy) | 3 | - | bot deploy (gh-pages) |
| 91 | `2aa76e2` | 10-13 11:40 | Qwen | docs(plan): 🤖 check off task 9 (folder mode + create new) | 9 | 1 | +44/-17 | docs(plan) bookkeeping; gap 11.1h before |
| 92 | `7489dc9` | 10-13 11:40 | bot | deploy: 2aa76e2c950be33b2646317ffc929045d123999f | (deploy) | 1 | - | bot deploy (gh-pages) |
| 93 | `0bc6f71` | 10-13 14:33 | Qwen | docs(plan): 🤖 add task 13 (reveal answer in trivia mode) | 13 | 1 | +21/-0 | docs(plan) bookkeeping |
| 94 | `aa5f30d` | 10-13 14:35 | Qwen | feat(question): 🤖 add reveal answer to trivia mode (Task 13) | 13 | 3 | +31/-4 |  |
| 95 | `6387eba` | 10-13 17:07 | Qwen | fix(question): 🤖 fit worst-case question screen at 1280x720 | 13 | 1 | +7/-3 | fix-after-feat; council-driven |
| 96 | `0ed7223` | 10-14 00:41 | Qwen | docs(plan): 🤖 check off task 13 (reveal answer in trivia mode) | 13 | 1 | +17/-7 | docs(plan) bookkeeping; gap 7.6h before |
| 97 | `d5de633` | 10-14 00:42 | bot | deploy: 0ed7223f1b20b2fff15271f0436eea5e32c084e5 | (deploy) | 5 | - | bot deploy (gh-pages) |
| 98 | `f603230` | 10-14 08:18 | Qwen | docs(plan): 🤖 close two stale boxes (task 8 verify, task 10 pages handoff) | 8/10 bookkeeping | 1 | +7/-2 | docs(plan) bookkeeping; gap 7.6h before |
| 99 | `f97bd45` | 10-14 08:18 | bot | deploy: f60323026d50d3fa819ddfb1c1b48281305e437b | (deploy) | 1 | - | bot deploy (gh-pages) |
| 100 | `b15c778` | 10-14 08:44 | Opus 5.5 | docs(plan): 🤖 add tasks 14-23 (Claude Code council pass fixes) | 14-23 plan | 1 | +632/-0 | docs(plan) bookkeeping |
| 101 | `c2cc6c5` | 10-14 08:45 | Haiku 5.5 | fix(bank): 🤖 correct 7 wrong answers and 6 shaky questions | 14 | 1 | +48/-37 | fix (no earlier feat in task) |
| 102 | `bdf25d8` | 10-14 08:47 | Haiku 5.5 | fix(bank): 🤖 accept rarer five-vowel words in the Words finale | 14 | 1 | +1/-1 | fix (no earlier feat in task) |
| 103 | `9eb03e3` | 10-14 08:48 | Opus 5.5 | docs(plan): 🤖 check off task 14 (bank corrections) + council record | 14 | 1 | +6/-4 | docs(plan) bookkeeping |
| 104 | `a91b6e7` | 10-14 08:48 | Sonnet 5.5 | fix(validate): 🤖 report unknown keys and give hosts actionable locations | 15 | 3 | +122/-18 | fix (no earlier feat in task) |
| 105 | `80410e3` | 10-14 08:50 | Opus 5.5 | docs(plan): 🤖 check off task 15 (validation messages) + council record | 15 | 1 | +6/-4 | docs(plan) bookkeeping |
| 106 | `66604e1` | 10-14 08:51 | Sonnet 5.5 | fix(folder): 🤖 Create new picks the folder first and never overwrites | 16 | 3 | +97/-5 | fix (no earlier feat in task) |
| 107 | `6cc13d7` | 10-14 08:52 | Opus 5.5 | docs(plan): 🤖 check off task 16 (Create new picker-first, no overwrite) + council record | 16 | 1 | +6/-4 | docs(plan) bookkeeping |
| 108 | `21aba93` | 10-14 08:53 | Sonnet 5.5 | fix(folder): 🤖 one normPath for FSA and webkitdirectory; encode shipped media src | 17 | 3 | +44/-8 | fix (no earlier feat in task) |
| 109 | `b87e688` | 10-14 08:55 | Sonnet 5.5 | fix(app): 🤖 error-screen exit, visible picker failures, carried names, bank title | 17 | 3 | +44/-13 | fix (no earlier feat in task) |
| 110 | `82ebd70` | 10-14 08:57 | Sonnet 5.5 | fix(app): 🤖 keep error-screen buttons above the list | 17 | 2 | +5/-2 | fix (no earlier feat in task) |
| 111 | `83dd3b4` | 10-14 08:58 | Opus 5.5 | docs(plan): 🤖 check off task 17 (loading flows) + council record | 17 | 1 | +10/-8 | docs(plan) bookkeeping |
| 112 | `9dc83be` | 10-14 09:20 | Opus 5.5 | feat(scoring): 🤖 scoring snapshot/restore + pure saved-game module | 18 | 6 | +304/-8 |  |
| 113 | `cf26ed4` | 10-14 09:20 | Opus 5.5 | feat(game): 🤖 saved games with Resume, guarded resets and leaves, team identity | 18 | 6 | +290/-74 | council-driven |
| 114 | `739d029` | 10-14 09:47 | Opus 5.5 | fix(game): 🤖 one save slot per board, setup Back to board, save hints | 18 | 6 | +352/-82 | fix-after-feat |
| 115 | `218b811` | 10-14 09:49 | Opus 5.5 | docs(plan): 🤖 check off task 18 (saved games, guarded resets) + council record | 18 | 1 | +11/-9 | docs(plan) bookkeeping |
| 116 | `986abf9` | 10-14 09:54 | Sonnet 5.5 | fix(question): 🤖 media built once per question, audio pauses on leave, dark controls | 19 | 2 | +30/-5 | fix (no earlier feat in task) |
| 117 | `81887b4` | 10-14 09:55 | Opus 5.5 | docs(plan): 🤖 check off task 19 (question media) + council record | 19 | 1 | +7/-5 | docs(plan) bookkeeping |

## Amended / rewritten history

| What | Evidence |
|---|---|
| `35e2b32` was amended from `900becc` | reflog: `900becc commit: feat(folder): add local folder mode + create new (Task 9 step 1)` at 10-13 00:31, then `35e2b32 commit (amend): feat(folder): 🤖 add local folder mode + create new (Task 9)` at 10-13 11:38. Author date stays 00:31, committer date is 11:38. Plan (Task 9 Step 3): "the 🤖 prefix -> amended + force-with-lease". `900becc` lacked the 🤖 prefix (the only commit missing it); the amend also folded in the Task 9 council fixes (+42/-23 lines in index.html, js/folder.js, styles.css vs `900becc`). Between the two, `4ad7f5b` (bot deploy 10-13 07:31) had already published `900becc`. |
| No other amend/reset/rebase/merge/revert | `git reflog` has exactly 1 `amend` entry and no reset/rebase/merge; `git log --all` has no merge/revert subjects. |

## Commits missing scope or 🤖

| sha | issue |
|---|---|
| `1099feb`, `d8b5fba`, `2032e93`, `5083287`, `7677f84` | subject has 🤖 but no `(scope)`: all predate `d4f35d0` (10-11 01:55, "docs(protocol): require type(scope) in commit messages"). Every Qwen commit from `3e86ac9` onward has a scope. |
| `900becc` (reflog only) | had a scope but no 🤖; fixed by amend (`35e2b32`). |
| 14 bot deploys | `deploy: <sha>` - no scope, no 🤖, no trailer, by design (GitHub Actions). |

## Gaps (>= 3 h between consecutive non-bot commits) and bursts

Gaps are between author timestamps and include sleep, but the log cannot say what happened inside them.

| before | at | gap (h) |
|---|---|---|
| `65714c3` 10-11 05:43 | `af71d0a` 10-11 10:44 | 5.0 |
| `c4c1e35` 10-11 14:40 | `19451d8` 10-11 18:50 | 4.2 |
| `19451d8` 10-11 18:50 | `606dce8` 10-12 00:09 | 5.3 |
| `cba8805` 10-12 01:19 | `a60b03a` 10-12 12:49 | 11.5 |
| `1c279ad` 10-12 21:19 | `35e2b32` 10-13 00:31 | 3.2 |
| `35e2b32` 10-13 00:31 | `2aa76e2` 10-13 11:40 | 11.1 |
| `6387eba` 10-13 17:07 | `0ed7223` 10-14 00:41 | 7.6 |
| `0ed7223` 10-14 00:41 | `f603230` 10-14 08:18 | 7.6 |

### Bursts (runs of non-bot commits with <=45 min between neighbours, >=6 commits)

| start | end | commits | minutes | models | first..last sha |
|---|---|---|---|---|---|
| 10-11 03:00 | 10-11 05:43 | 26 | 163 | {'Qwen': 26} | `336fed8`..`65714c3` |
| 10-11 11:37 | 10-11 14:40 | 14 | 182 | {'Qwen': 14} | `7f53891`..`c4c1e35` |
| 10-12 12:49 | 10-12 16:22 | 15 | 213 | {'Qwen': 15} | `a60b03a`..`acecbce` |
| 10-14 08:18 | 10-14 09:55 | 19 | 97 | {'Qwen': 1, 'Opus 5.5': 10, 'Haiku 5.5': 2, 'Sonnet 5.5': 6} | `f603230`..`81887b4` |

Notes on gaps and bursts:
- The two `35e2b32` gaps (3.2 h before, 11.1 h after) use its *author* date 00:31; its committer date is 11:38, so the real inactivity there is 1c279ad 21:19 -> 900becc 00:31 (3.2 h), then 00:31 -> 11:38 (the amend; the 11 h gap contains the Task 9 council fixes that were folded into the amend).
- Dated plan notes (see `requests.md`) place the partner's text-only note on 10-12 and request messages across the gaps; the commits say nothing about when the partner replied.
- Qwen's first session ran 10-10 22:56 -> 10-11 05:43 (spec/plan/CI before 02:00, then the 26-commit Task 1-7 burst 03:00-05:43). MVP milestone `65714c3` 05:43; the partner's feedback commit `60021ff` is 10:44 (5.0 h later).
- Qwen's last commit `f603230` is 10-14 08:18; the Claude Code pass begins with `b15c778` at 08:44 (26 min later; branch `claude/council-fixes` created 08:41 per reflog `checkout: moving from main to claude/council-fixes`).
- The Claude pass's 18 commits span 08:44 -> 09:55 (71 min wall clock). Qwen's 85 commits span 10-10 22:56 -> 10-14 08:18 (about 81 h calendar).
- Bot deploy commits carry the same timestamp as the commit they deploy (their message is `deploy: <full sha of source commit>`; raw `git log` shows them in UTC, converted here to -0700). Deploy of `900becc` (`4ad7f5b`) and of `35e2b32` (`c79a2a9`) both exist, i.e. the pre-amend commit was live on gh-pages before the amend was force-pushed.
