# Qwen's council notes, the Deferred list, and a factual cross-check

Source: plan at `f603230` (Qwen's last commit; extract with `git show f603230:docs/superpowers/plans/2026-10-10-trivia-night.md`), plus Qwen's commit bodies. "Council" in this repo = the AGENTS.md rule "dispatch a council of review subagents, two passes" (backward = built vs plan, forward = downstream risk). The git log does not show what the subagents returned; only Qwen's own summary of findings is recorded in the repo. (The sibling file `../opencode/sessions.md`, written by another agent from the opencode DB, lists 43 child "Backward council"/"Forward council" sessions dispatched from the build session, so councils were real subagent runs; I did not read their transcripts.) Severity glyphs (🔴🟠🟡) are Qwen's.

## 1. Every council record Qwen wrote

Legend: B = backward pass, F = forward pass. "fixed in" = commit that carried the fix.

| Date / where | Task | B finding | F finding | Fix |
|---|---|---|---|---|
| 10-11 03:00 plan body of `946de07` ("Backward+forward council on the plan") | plan, Tasks 1-10 | n/a | js-yaml exports `load` not `parse`; line-number test fixture must be mid-file (EOF marks mislead); Task 6 verify must drive the 5-question stub round with exact taps (A=600, B=700); Task 9 folder load must return parseBank result, create-new needs a parent handle; "headless Chromium lacks FSA (webkitdirectory is the tested path)"; wav demo deviation; music round placeholder per spec; empty-cell rule; type(scope) on all commit templates; stale workflow filename; existing-files note | plan edits only (`946de07`) |
| 10-11 plan Task 10 `71d3f7f`/`3e86ac9` | 10 | n/a | first deploy used `destination_branch`/`force_sync`, which the action silently ignores (real inputs `publish_branch`/`publish_dir`); gh-pages ended up with only `.nojekyll` | `3e86ac9`, plan corrected `71d3f7f`; plan wording first said "pinned v3 SHA" then "`@v3` tag's resolved SHA" |
| 10-11 `faf8560` | 1 | n/a | `roundTotal` is cross-team but the Trivia tally needs per-team column earnings | `roundTeamTotal` added (`faf8560`), wired into Task 6 (`f143793`) |
| 10-11 `1d82698`/`bef05b6` | 2 | n/a | duplicate round names would merge Task 6 tallies; zero-question rounds and empty rounds list break board/column flows | `1d82698` |
| 10-11 `67da820`/`c5b9538` | 3 | n/a | `renderError` module-private (Task 9 needs it); retry reloaded only the shipped file; `renderSetup` re-attached input listener on every load | `67da820` (`setLoader`, one-time listener) |
| 10-11 `93aa194`/`1b40bc5` | 4 | n/a | 6-column banks with long names overflow 192px columns; plan interfaces (`setCellClick`/`setColumnClick`) and empty-cell rule missing | `93aa194` fix; plan `1b40bc5` |
| 10-11 `b49695e`/`f808951` | 5 | n/a | question.js module vars survived bank reloads; trivia cells kept pointer cursor though clicks no-op; notes pushed to Tasks 6/7/9 (`resetFlow()` on every bank load; audio must be in every phase branch and in the trivia renderer) | `b49695e` |
| 10-11 `8967c64` | 6 | "record completed-column rule" (no findings text) | – | – |
| 10-11 `65714c3` ("record task 7 council notes, mark milestone reached") | 7 | – | Task 9 text gets: revoke object URLs on every load, missing audio keeps path (404 -> "no clip") | plan only |
| 10-11 plan note after Task 7.5 (`6373672`) | 7.5 | "backward pass clean (palette values exact, v1 dead code gone, commits conform)" | 2 majors: (1) `loadBank` kept old game's scoring/used across bank reloads; (2) column flow re-awarded used cells after a mid-game mode switch. Plus `pointsFor` duplicated. Skipped: early-exit "Board" button on trivia column ("not requested ... revisit if it bothers at the event") | `a82ee3e`, `dddda9c` (+ dedupe in `dddda9c`) |
| 10-11 `c4c1e35` | 7.6 | "no mismatches; tighten 7.6 wording" | Task 9 folder mode must map images to object URLs or folder images 404 into "no image"; create-new template's `audio:`/`images:` must be commented examples (empty list fails validation) | plan only (pre-emptive) |
| 10-12 `cba8805` | 7.7 | code h1 68px vs plan 72px (code aligned); stale "serif" wording | `font-display: swap` flagged as reflow risk; KEPT ("text visible immediately beats a one-time reflow"), mitigation `<link rel=preload as=font>`; "real-TV reflow re-checked in the Claude pass" | code (`index.html` +1, `styles.css`) and plan changed inside the `docs(plan)` commit `cba8805` |
| 10-12 `65dac47` | 7.8 | clean (record-keeping only) | 🔴 `.team-btns button` (0,1,1) outranked `.btn-quiet` (0,1,0): Back rendered blue; 🟠 same root cause since 7.5: Done/Next blue, breaking "orange = primary" | `76a4c75` (verified port 8089) |
| 10-12 `15630bd` | 7.9 | clean (plan heading "2-4" corrected to no-cap) | 🟠 `loadBank` did not reset `state.teamNames`; 🟡 draft-carry across bank loads deferred to Task 9; 🟡 5+ rows scroll at 720p accepted | one-line fix in `js/app.js` carried inside the `docs(plan)` commit `15630bd`; draft-carry deferred (became Claude Task 17 item 5) |
| 10-12 `72645c6` | 7.10 | 🟠 typed-clash test assertion vacuous (full-name string vs single word, could never fail) | no downstream risk | `test/teams.test.mjs` rewritten inside the `docs(plan)` commit `72645c6` |
| 10-12 `acecbce` | 7.10 step 4 | clean | no downstream risk; 2 🟡 stale "Start disabled" verify records in Tasks 4/7.9 | annotations only |
| 10-12 `a3aae4e`/`a1992f1` | 8 | "clean after fix" | forward fact-check "caught 5" (see section 3 for the text and what was wrong) | bank edited before commit `a3aae4e` |
| 10-12 `72b7cba` | 11 | clean (how-to text re-verified against question.js/board.js/app.js) | 🟠 GitHub link same-tab (TV remote would wipe the game) -> `target=_blank`; 🟡 no focus-visible rule; 🟠 Task 9 buttons must live outside `#team-inputs` | `72b7cba` (a `docs(plan)` commit that also changed `index.html` +1/-1 and `styles.css` +1) |
| 10-12 `1c279ad` (plan Task 12 step 3) | 12 | clean (every command + behavioural claim re-verified) | 🟠 "The whole board lives in one file" false after Task 9; 🟠 sync rule covered README only, not About screen | `1c279ad` wording |
| 10-13 `2aa76e2` / amended `35e2b32` | 9 | "clean (every spec bullet re-verified; single reset funnel `startNewBank` confirmed)" | 🟠 setup screen 871px tall at 1280x720 (Load folder/Create new ~15px visible, About off-screen) -> compacted to 680px; 🟡 `#folder-input` invisible tab stop; 🟡 unguarded FSA media reads -> `fileUrl()` helper; 🟠 original commit lacked 🤖 | amend `35e2b32` (+ force-with-lease) |
| 10-13 `0ed7223` | 13 | "NO MISMATCHES" (flag reset at all four colMarks sites, answer paragraph same DOM position as Jeopardy, no leak paths) | 🟠 worst case (longest question + revealed answer + 3 long team names wrapping) put controls 70px below the 720 fold (measured 790px) -> padding 40->24 etc.; measured 700px | `6387eba` |

Totals: 21 rows above (one per council record or commit-body council note; Task 6's has no findings text). Backward-pass entries that recorded any mismatch: Task 7.6 (wording tightened), Task 7.7 (h1 68px vs 72px; stale "serif"), Task 7.10 (vacuous test assertion), Task 12 / 7.9 (wording or heading corrections). All other backward passes are recorded as "clean" or "NO MISMATCHES". Council fixes were frequently committed inside `docs(plan)` check-off commits rather than in a code commit: `15630bd` (js/app.js), `72b7cba` (index.html, styles.css), `cba8805` (index.html, styles.css), `72645c6` (test file).

## 2. "Deferred to the final Claude Code pass (partner note 2026-10-12)"

Text of the section (added `606dce8`, unchanged through `f603230`): "The working model (qwen3.8 27b) is TEXT-ONLY: it cannot read images. Everything below needs image input and is deliberately left to a multimodal model. The partner will run a Claude Code pass at the end to tie up loose ends".

| # | Item (verbatim summary) | State at `f603230` | What the Claude pass recorded |
|---|---|---|---|
| 1 | UI pass visual review (Task 7.7): fresh 1280x720 screenshots of all five screens, judge board legibility at TV distance, font rendering, orange/blue role discipline, motion feel. "Before-shots from 2026-10-11 are in `.playwright-mcp/ui-before-*.png`" | open | Claude pass took 1280 and 1920 screenshots (`.playwright-mcp/claude-pass-2026-10-14/`, 36 files). Findings turned into Tasks 20 (layout fit), 19 (dark controls). Task 23 step 4 will mark it done (unchecked at head). |
| 2 | Demo media eyeball: the two PNGs in `images/demo/` and WAVs in `audio/demo/` "were verified by bytes/dimensions, never looked at" | open | Task 23 step 4 plans: "WAV pitches 440/523/440->523->659 Hz, no edge clicks, -8 dBFS peak; PNGs clean" |
| 3 | Font fallback on a real TV: confirm self-hosted woff2 renders on the actual TV browser | open | Task 23 keeps it open; adds items 4 (real-picker check) and 5 (open live URL on friend's TV) |

## 3. Cross-check: claims in Qwen's records that later proved wrong or unsupported

### 3a. Task 8 question-bank fact-check (Qwen's council "caught 5")

Compared `questions.yaml` at `f603230` (Qwen's last) with `bdf25d8` (after Claude's `c2cc6c5` + `bdf25d8`; `git diff f603230 bdf25d8 -- questions.yaml`). The plan's Task 8 step 3 note at `f603230` ("caught 5") lists six items; `a3aae4e`'s commit body also lists six; `a1992f1` says "five answers".

| Qwen council "fix" (plan Task 8 step 3) | Status after Claude Task 14 |
|---|---|
| "Hepburn's record is FOUR wins (not three)" | still in bank unchanged (kept) |
| "Truffaut never won Best Director - replaced with his only Oscar, Day for Night (Best Foreign Language Film)" | kept but reworded: Claude listed it among 6 "shaky" questions ("Day for Night's award is now named as the Foreign Language category") |
| "Old Town Road's #1-weeks record churns - replaced with stable Thriller fact" | kept; moved to Music Q1; council minor "Thriller 'studio album' hedge" left |
| ""to main" is not a verb - replaced with the real state-verb (Rhode Island)" | **WRONG.** Task 14: "Rhode Island 'verb'" is one of the 4 answers "invented by the drafting model". Replaced (`c2cc6c5`) with the QWERTY one-row state question (answer Alaska) |
| "Wings is not a lost film - rephrased as 'only silent film to win Best Picture'" | **WRONG.** Task 14: "The Artist is also a silent Best Picture winner". Fixed text: "stayed the only silent film to win until 'The Artist' (2011)" |
| "Minecraft string comes from spiders/witches, not creepers" | kept; Claude: "Minecraft spider drop is now complete" (adds cave spiders) |

Plan Task 14 header (Claude): "Two of the wrong ones were introduced by the Task 8 council's own 'fixes'." The two items above marked WRONG are the only two Task 8 council fixes that appear in Claude's wrong-answer list, matching that count (the plan does not name them).

Full list of Task 14 corrections, from `c2cc6c5`'s body and the `questions.yaml` diff:

| Round | Qwen's bank at `f603230` | Wrong / shaky per Claude | Claude's fix |
|---|---|---|---|
| Cult Classics | The Room: Tommy's "ever-present butler" = "Lenny" | invented (Johnny's friend is Mark) | "Mark" |
| Cult Classics | Eraserhead opening: machines spit out "Balls (spheres)" | wrong | severed head -> "Pencil erasers" |
| Childhoods | Home Alone: "Kevin's neighbor kid ... Richie" | invented | gangster movie "Angels with Filthy Souls" |
| Words | "US state name that is also a verb" = Rhode Island | invented | one-row-QWERTY state = Alaska |
| Nerd Culture | Skyrim: Thalmor = "Dark Elves (Dunmer)" | wrong | High Elves (Altmer) |
| Oscar | "It Happened One Night remains the only film to win the Big Five" | wrong (first of three) | reworded "first of only three films" |
| Oscar | Wings "the only silent film ever to win" | wrong | "until 'The Artist' (2011)" |
| shaky | Truffaut/Day for Night; Wicker Man ("ancient pagan ritual"); Totoro soot sprites; Sgt. Pepper Rolling Stone ranking; Minecraft string; Prince credit | ambiguous | tightened (`c2cc6c5`) |
| Words finale | "Which word famously contains all five vowels in alphabetical order? Abstemious" | not unique (facetious, arsenious, caesious) | `bdf25d8`: answer accepts alternatives |

Task 14 council afterwards: "independent fact-check of all 29: no wrong answers; one Important: the five-vowel finale is not unique". So 7 wrong + 6 shaky + 1 non-unique finale = 14 changed items out of 29 questions, in a bank Qwen's council had described as fact-checked.

### 3b. Verification / council records that asserted something the code did not do

| # | Qwen record | What the later evidence shows | Evidence |
|---|---|---|---|
| 1 | `946de07` plan council: "headless Chromium lacks FSA (webkitdirectory is the tested path)"; plan Task 9 "Verified environment fact: headless Chromium (this MCP, Chrome 155) does NOT expose FSA - `showDirectoryPicker` is undefined" | Corrected by Qwen on 10-13: "this headless Chromium DOES expose FSA (`showDirectoryPicker` is a function) - the original note was wrong". The 10-11 note labelled "verified" was written before Task 9 existed. | plan Task 9 step 2 text; `2aa76e2` body ("Environment fact corrected") |
| 2 | Task 7.5 council: "backward pass clean (palette values exact ...)"; its verification checked body bg and Start bg only | Done/Next buttons rendered blue (not orange) from Task 7.5 until the Task 7.8 forward pass (`76a4c75`, 10-12 13:32), ~1 day later | `76a4c75` body: "Same pre-existing root cause since Task 7.5: Done/Next (.btn-primary) were overridden to blue" |
| 3 | Task 7 verify: audio "`play()` via evaluate -> waits to `currentTime` 1.5 (full clip), no error" and warning "audio element must be rendered in EVERY phase branch" | After Task 7.5 made every team mark / Reveal re-render, the re-render built a new `<audio>` and the playing clip stopped and rewound; found 10-14 in Chrome. Qwen's checks proved the element existed per phase, not that a playing clip survived a re-render; Task 7.5's verification sequences used no media question | Claude plan Task 19; `986abf9` body |
| 4 | Task 9 council 10-13: "backward - clean (every spec bullet re-verified)". Plan Task 9 text: "**Create new**: `showDirectoryPicker()` first (user picks the parent...), then `getDirectoryHandle(name,{create:true})`" | `js/app.js` at `f603230` calls `prompt()` (line 224) before `showDirectoryPicker()` (line 228). With a >~5 s prompt the picker throws SecurityError (reproduced 7 s). Also picker opened read-only (implicit second permission) and `createNew` silently truncated an existing `questions.yaml`/`README.md` | `git show f603230:js/app.js`; plan Task 16; `66604e1` |
| 5 | Task 9: Create-new and FSA load "stay a manual handoff"; tests are node fakes | FSA paths were first exercised by the Claude pass (OPFS-backed picker stub); two Create-new bugs (#4) and a path-normalisation divergence were found | plan Tasks 16, 17; `21aba93` |
| 6 | Task 9 retry flow: `setLoader` "Try again reloads the active source"; plan also warned "a `display:none` file input never opens the chooser on a programmatic `.click()`" | `#folder-input` was inside `#screen-setup`; on the error screen setup is `display:none`, so Try again's `folderInput.click()` on the fallback path likely does nothing; Try-again failures were written to `#folder-msg` on the hidden setup screen. Qwen's own note and its layout contradicted | plan Task 17 items (2),(3); `b87e688` moved `#folder-input` out of `#screen-setup` |
| 7 | Task 4 `93aa194` "wrap long category names in headers: break-word + min-width 0" fixes overflow of "Movies: Cult Classics" | Claude measured "Movies: Childhoods" breaking mid-word ("Childhood / s") at 1280 and 1920 | plan Task 20 |
| 8 | Task 9 / Task 13 fit work: "setup 680px, about 692px, both fit one TV screen" (10-13); Task 13 "measured worst case now 700px at 1280x720" | Board page ~946px tall at 1280x720 (+225); question with a 640x480 folder image 1066px; setup with 3 team rows 786px; About 745px at HEAD (`cf26ed4` body: "745 px at 1280x720, as at HEAD"). Different dates and conditions (Task 13 added About text after the 692px reading), so this is not necessarily a measurement error; but Qwen's recorded measurements covered setup/about with 2 team rows and a question without media, and no record shows the board screen's page height or a media question being measured | plan Task 20; `cf26ed4` |
| 9 | Task 2 "Never half-succeeds"; validator tests | Misspelled optional keys (`image:`, `Audio:`, `point:`) silently ignored, so images never showed (the spec's "silent load failure" anti-goal); non-string `a: 1984` gave only a generic error | `a91b6e7`; plan Task 15 |
| 10 | Task 7.10 test assertion (green) | assertion "could never fail" (full name compared to a single word); fixed by Qwen's own council | `72645c6` |
| 11 | README sync rule (`1c279ad`) and Task 9/13 "sync rule" claims; About "Mistapped?" line | Claude's backward pass 10-14 "found stale text"; Task 23 (open at head) lists: "dollar cell(s)" -> "point cell(s)" in README + About, spec still "2-4 / 4 teams max", plan Global Constraints "Teams: 2-4", and the About CSS comment vs code (22px) | plan Task 23 |
| 12 | Task 8 step 2 box left unchecked | verification was run and recorded 10-12 (`a1992f1` body "Verify: 6 rounds, 29 questions") but the box was only closed 10-14 08:18 (`f603230`) | `f603230` body |
| 13 | Persisted state: none claimed. | Whole game lived in memory; refresh wiped the night, one press of "Reset scores" cleared everything, remove-A + add-late-team silently moved A's points to B | plan Task 18 (not a Qwen claim; omission surfaced by Claude) |

### 3c. Items Qwen flagged correctly (for balance)

- Task 7.8 council caught its own CSS-specificity bug (#2 above) before the event; Task 7.5 forward pass found two real state-carry bugs (`a82ee3e`, `dddda9c`); Task 11 caught the same-tab link hazard on a TV remote; Task 9 council measured the 871px setup screen.
- Items deferred by Qwen that Claude later turned into tasks: draft-carry across bank loads (Task 7.9 council -> Claude Task 17 item 5); the trivia early-exit/"Board" button (Task 7.5 skipped; Task 7.8 added Back).
