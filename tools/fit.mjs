// Fit + same-spot check in real Chrome (Task 25).
//   make serve            (terminal 1)
//   make fit              (terminal 2)  or: node tools/fit.mjs http://127.0.0.1:8090/
// Fit: every screen, at every TV size, in its worst case (the longest
// questions, revealed, every team marked, 4 and 6 long names) shows its
// last control without scrolling. Same spot: after a click that changes
// the screen, a second click at the same coordinates changes nothing.
// Serves nothing itself; exits non-zero on any failure.
import { chromium } from "playwright";
import { finishedSave } from "./finished-save.mjs";
import { readFileSync } from "node:fs";
import { parseBank } from "../js/validate.js";

const URL_ = process.argv[2] || "http://127.0.0.1:8080/";
const SIZES = [[960, 540], [1280, 720], [1440, 900], [1920, 1080]];
const NAMES = [
  "The Quizzly Bears",
  "Agatha Quiztie Fan Club",
  "Les Quizérables",
  "Universally Challenged",
  "Trivia Newton-John",
  "Quiz Khalifa and Friends",
];
// Worst shipped questions: the longest questions (Oscar 300, Music 400,
// Words 500, with the longest answer) and Oscar 400 (as tall revealed).
const WORST = [[0, 2], [3, 3], [5, 4], [0, 3]];
const MEDIA_BANK = `title: "Fit check"
rounds:
  - name: "Pictures and other very long category names"
    questions:
      - q: >
          This flag was adopted in 1915 for the 250th anniversary of the
          Dutch surrender of the city. Which city flies it, and whose
          colours does it borrow?
        a: "New York City; the Dutch House of Orange-Nassau"
        images: ["images/demo/blue-checker.png"]
        audio: "audio/demo/note-440.wav"
  - name: "Music"
    questions:
      - q: "Name this note."
        a: "A4"
        audio: "audio/demo/note-440.wav"
`;

// The worst questions again, each with a clip (Task 25 council: a clip
// row above a long question). JSON is YAML, so the bank can be built here.
const SHIPPED = parseBank(readFileSync(new URL("../questions.yaml", import.meta.url), "utf8")).bank;
const CLIP_BANK = JSON.stringify({
  title: "Clips",
  rounds: [{ name: "Music", questions: WORST.map(([ri, qi]) => ({ ...SHIPPED.rounds[ri].questions[qi], audio: "audio/demo/note-440.wav" })) }],
});

const failures = [];
let checks = 0;
const check = (ok, what) => {
  checks++;
  if (!ok) {
    failures.push(what);
    console.log(`FAIL ${what}`);
  }
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const settle = (page) => page.waitForTimeout(450); // 350 ms input lock
// A scripted click by a moving hand: the pointer leaves the last spot
// first, so the same-spot guard (Task 25) never mistakes it for a repeat.
async function tap(page, selector) {
  await page.mouse.move(1, 1);
  await page.click(selector);
}

async function open(w, h, bank) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  page.on("dialog", (d) => d.accept());
  if (bank) await page.route("**/questions.yaml", (r) => r.fulfill({ body: bank, contentType: "text/yaml" }));
  await page.goto(URL_);
  await page.waitForSelector("#screen-setup:not(.hidden)", { timeout: 10000 });
  await settle(page);
  return page;
}

async function start(page, n, mode = "jeopardy") {
  for (let i = 0; i < n; i++) {
    if (i >= 2) await tap(page, "#add-team-btn");
    await page.fill(`#team-${i + 1}`, NAMES[i]);
  }
  await page.check(`input[name=mode][value=${mode}]`);
  await tap(page, "#start-btn");
  await settle(page);
}

const screen = (page) =>
  page.evaluate(() =>
    ["setup", "board", "question", "tally", "error", "about", "confirm"].find(
      (s) => document.getElementById(`screen-${s}`) && !document.getElementById(`screen-${s}`).classList.contains("hidden")
    )
  );

// The page doesn't scroll, and the last button on the visible screen is
// fully on screen.
async function fits(page, what) {
  const r = await page.evaluate(() => {
    const scr = [...document.querySelectorAll(".screen")].find((s) => !s.classList.contains("hidden"));
    const btns = [...scr.querySelectorAll("button")].filter((b) => b.offsetParent !== null);
    const bottom = Math.max(...btns.map((b) => b.getBoundingClientRect().bottom));
    const se = document.scrollingElement;
    return { overY: se.scrollHeight - innerHeight, overX: se.scrollWidth - innerWidth, bottom, h: innerHeight };
  });
  check(r.overY <= 0 && r.overX <= 0 && r.bottom <= r.h, `${what} fits (scroll y=${r.overY} x=${r.overX}, last button bottom ${Math.round(r.bottom)}/${r.h})`);
  // Question screens: the question + answer never run into the team
  // buttons, and no text is cut off (the round name's ellipsis aside).
  const q = await page.evaluate(() => {
    const scr = document.getElementById("screen-question");
    if (scr.classList.contains("hidden")) return null;
    const qa = scr.querySelector(".qa").getBoundingClientRect();
    const tb = scr.querySelector(".team-btns").getBoundingClientRect();
    // Wider than its box: a word running out of the column, or the
    // preview line (overflow hidden) losing text. Height is not checked:
    // line-height rounding leaves a pixel or two, and running into the
    // team buttons is the gap check above.
    const cut = [...scr.querySelectorAll(".question-text, .answer-text, .bank-preview")]
      .filter((e) => e.scrollWidth > e.clientWidth + 1)
      .map((e) => e.className);
    return { gap: Math.round(tb.top - qa.bottom), cut };
  });
  if (q) {
    check(q.gap >= 0, `${what}: the question and answer stay clear of the team buttons (gap ${q.gap})`);
    check(q.cut.length === 0, `${what}: no text cut off (${q.cut.join(", ")})`);
  }
  if (process.env.FIT_VERBOSE) console.log(`  slack ${String(Math.round(r.h - r.bottom)).padStart(4)} px  ${what}`);
}

// Where the host's targets are: the team buttons and the controls row.
const targets = (page) =>
  page.evaluate(() =>
    JSON.stringify(
      [".team-btns", ".controls"].map((sel) => {
        const r = document.querySelector(`#screen-question ${sel}`).getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      })
    )
  );

async function markAll(page) {
  const n = await page.locator("#screen-question .team-btns button").count();
  for (let i = 0; i < n; i++) await tap(page, `#screen-question .team-btns button >> nth=${i}`);
}

async function reveal(page) {
  await tap(page, "#screen-question button:text-is('Reveal answer')");
  await settle(page);
}

// --- Fit -------------------------------------------------------------------
for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  for (const n of [4, 6]) {
    const page = await open(w, h);
    await start(page, n);
    await fits(page, `${tag} ${n} teams: board`);
    for (const [ri, qi] of WORST) {
      await tap(page, `.board-cell.clickable[data-ri="${ri}"][data-qi="${qi}"]`);
      await settle(page);
      await markAll(page);
      const before = await targets(page);
      await reveal(page);
      check(before === (await targets(page)), `${tag} ${n} teams: jeopardy ${ri}:${qi} — Reveal moves no button (Task 25, U2)`);
      await fits(page, `${tag} ${n} teams: jeopardy ${ri}:${qi} marked + revealed`);
      await tap(page, "#screen-question button:text-is('Back to board')");
      await settle(page);
    }
    // trivia: run each worst question's column down to it
    await tap(page, "#setup-btn");
    await settle(page);
    await page.check("input[name=mode][value=trivia]");
    await tap(page, "#start-btn");
    await settle(page);
    for (const [ri, qi] of WORST) {
      await tap(page, `.board-header.clickable[data-ri="${ri}"]`);
      await settle(page);
      // Next until this question is up (earlier passes may have used some)
      while (!(await page.textContent("#screen-question .q-head")).includes(`question ${qi + 1} of`)) {
        await tap(page, "#screen-question button:text-is('Next')");
        await settle(page);
      }
      await markAll(page);
      await reveal(page);
      await fits(page, `${tag} ${n} teams: trivia ${ri}:${qi} marked + revealed`);
      await tap(page, "#screen-question button:text-is('Back to board')");
      await settle(page);
    }
    await fits(page, `${tag} ${n} teams: trivia board`);
    // a column played to its tally card (Task 25, U15)
    await tap(page, `.board-header.clickable[data-ri="4"]`);
    await settle(page);
    while ((await screen(page)) === "question") {
      await markAll(page);
      await tap(page, "#screen-question button:text-is('Next')");
      await settle(page);
    }
    await fits(page, `${tag} ${n} teams: column tally`);
    await tap(page, "#screen-tally button");
    await settle(page);
    await fits(page, `${tag} ${n} teams: trivia board with a partly played column`);
    // a refresh -> setup with the Resume offer
    await page.reload();
    await page.waitForSelector("#screen-setup:not(.hidden)");
    await settle(page);
    // Setup is the host's screen: Task 20's contract is 4 teams + Resume.
    if (n === 4) await fits(page, `${tag} ${n} teams: setup with Resume`);
    await page.context().close();
  }
  // the worst questions with a clip, 6 long names, both modes
  {
    const page = await open(w, h, CLIP_BANK);
    await start(page, 6);
    for (let qi = 0; qi < WORST.length; qi++) {
      await tap(page, `.board-cell.clickable[data-ri="0"][data-qi="${qi}"]`);
      await settle(page);
      await markAll(page);
      await reveal(page);
      await fits(page, `${tag} 6 teams: clip question ${qi + 1} marked + revealed`);
      await tap(page, "#screen-question button:text-is('Back to board')");
      await settle(page);
    }
    await tap(page, "#setup-btn");
    await settle(page);
    await page.check("input[name=mode][value=trivia]");
    await tap(page, "#start-btn");
    await settle(page);
    await tap(page, `.board-header.clickable[data-ri="0"]`);
    await settle(page);
    for (let qi = 0; qi < WORST.length; qi++) {
      await markAll(page);
      await reveal(page);
      await fits(page, `${tag} 6 teams: trivia clip question ${qi + 1} marked + revealed`);
      await tap(page, "#screen-question button:text-is('Next')");
      await settle(page);
    }
    await page.context().close();
  }
  // the finished board: Final scores, 6 long names
  {
    const page = await open(w, h);
    const { key, json } = await finishedSave(URL_, NAMES.map((n, i) => [n, 1000 - 100 * i]));
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, json]);
    await page.reload();
    await page.waitForSelector("#resume-btn:not(.hidden)");
    await settle(page);
    await tap(page, "#resume-btn");
    await settle(page);
    await fits(page, `${tag} 6 teams: Final scores`);
    if (w === 960) await page.screenshot({ path: ".superpowers/sdd/2026-10-10-trivia-night/final-960.png" }).catch(() => {});
    await page.context().close();
  }
  // image + audio question, 6 teams
  const page = await open(w, h, MEDIA_BANK);
  await start(page, 6);
  await tap(page, `.board-cell.clickable[data-ri="0"][data-qi="0"]`);
  await settle(page);
  await markAll(page);
  await reveal(page);
  await fits(page, `${tag} 6 teams: image + audio question marked + revealed`);
  await page.context().close();
}

// --- Same spot -------------------------------------------------------------
// Click at a control's centre, then click the same point again (no pointer
// movement): the second click must not change the app's state.
const stateOf = (page) =>
  page.evaluate(() => {
    const scr = ["setup", "board", "question", "tally", "error", "about", "confirm"].find(
      (s) => document.getElementById(`screen-${s}`) && !document.getElementById(`screen-${s}`).classList.contains("hidden")
    );
    const q = document.getElementById("screen-question");
    return JSON.stringify({
      scr,
      q: scr === "question" ? q.querySelector(".question-text")?.textContent : null,
      revealed: scr === "question" ? !!q.querySelector(".answer-text:not(.pending)") : null,
      marks: [...q.querySelectorAll(".team-btns button")].map((b) => b.className),
      scores: [...document.querySelectorAll("#screen-board .score-points")].map((e) => e.textContent),
      used: document.querySelectorAll("#screen-board .board-cell.used").length,
    });
  });

// The pointer's target after the first click: the live (enabled) button
// under it now, if any.
const liveUnder = (page, x, y) =>
  page.evaluate(([x, y]) => {
    const b = document.elementFromPoint(x, y)?.closest("button");
    return b && !b.disabled ? b.textContent.trim() : null;
  }, [x, y]);

// kind "guard": the transition really puts a live button under the
// pointer (checked), and a second click there must change nothing.
// kind "still": the screen keeps no live button under the pointer.
async function sameSpot(page, selector, what, kind = "guard") {
  const box = await page.locator(selector).first().boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(600); // past the 350 ms lock: a second, separate click
  const live = await liveUnder(page, x, y);
  if (process.argv.includes("--list")) console.log(`  under the pointer: ${live ?? "-"}  (${what})`);
  if (kind === "guard") check(live !== null, `same spot: ${what} — a live button lands under the pointer (precondition)`);
  else check(live === null, `same spot: ${what} — nothing live is left under the pointer`);
  const before = await stateOf(page);
  await page.mouse.click(x, y);
  await page.waitForTimeout(450);
  const after = await stateOf(page);
  check(before === after, `same spot: ${what} — a second click changed nothing`);
}

// [what, kind, bank, mode, arrange]. Since the Task 25 layout (controls
// pinned at the bottom, Reveal kept as a disabled "Answer shown") most
// transitions leave nothing live under the pointer ("still"); trivia's Next
// lands on the next question's Next ("guard": the guard must hold).
const SAME_SPOT = [
  ["opening a cell", "still", null, "jeopardy", async (p) => `.board-cell.clickable[data-ri="2"][data-qi="2"]`],
  ["Reveal on Oscar 100", "still", null, "jeopardy", async (p) => {
    await tap(p, `.board-cell.clickable[data-ri="0"][data-qi="0"]`); await settle(p);
    return "#screen-question button:text-is('Reveal answer')";
  }],
  ["Reveal on Words 200", "still", null, "jeopardy", async (p) => {
    await tap(p, `.board-cell.clickable[data-ri="5"][data-qi="1"]`); await settle(p);
    return "#screen-question button:text-is('Reveal answer')";
  }],
  ["Done back to the board", "still", null, "jeopardy", async (p) => {
    await tap(p, `.board-cell.clickable[data-ri="1"][data-qi="0"]`); await settle(p);
    return "#screen-question button:text-is('Done')";
  }],
  ["Reveal on an image question", "still", MEDIA_BANK, "jeopardy", async (p) => {
    await tap(p, `.board-cell.clickable[data-ri="0"][data-qi="0"]`); await settle(p);
    return "#screen-question button:text-is('Reveal answer')";
  }],
  ["trivia Next", "guard", null, "trivia", async (p) => {
    await tap(p, `.board-header.clickable[data-ri="5"]`); await settle(p);
    return "#screen-question button:text-is('Next')";
  }],
  ["trivia Reveal then Next", "guard", null, "trivia", async (p) => {
    await tap(p, `.board-header.clickable[data-ri="5"]`); await settle(p);
    await tap(p, "#screen-question button:text-is('Next')"); await settle(p);
    await reveal(p);
    return "#screen-question button:text-is('Next')";
  }],
  // The tally card's Back to board lands where the last Next was: the
  // guard must hold (a quick second click would leave the tally early).
  ["the last Next into the tally", "guard", null, "trivia", async (p) => {
    await tap(p, `.board-header.clickable[data-ri="3"]`); await settle(p);
    for (let k = 0; k < 3; k++) { await tap(p, "#screen-question button:text-is('Next')"); await settle(p); }
    return "#screen-question button:text-is('Next')";
  }],
  ["the tally's Back to board", "still", null, "trivia", async (p) => {
    await tap(p, `.board-header.clickable[data-ri="3"]`); await settle(p);
    for (let k = 0; k < 4; k++) { await tap(p, "#screen-question button:text-is('Next')"); await settle(p); }
    return "#screen-tally button";
  }],
];
for (const [w, h] of [[960, 540], [1280, 720], [1920, 1080]]) {
  for (const [what, kind, bank, mode, arrange] of SAME_SPOT) {
    const page = await open(w, h, bank);
    await start(page, 4, mode);
    const target = await arrange(page);
    await sameSpot(page, target, `${w}x${h} ${what}`, kind);
    await page.context().close();
  }
}

// The guard holds for a quick re-click and lets a deliberate one through
// after 2.5 s. A board cell stays put: open it with the pointer, come back
// with the keyboard, and the same cell is under the pointer again.
{
  const page = await open(1280, 720);
  await start(page, 2);
  const box = await page.locator(`.board-cell.clickable[data-ri="0"][data-qi="0"]`).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y); // opens the question and guards (x, y)
  await settle(page);
  await page.focus("#screen-question button:text-is('Back to board')");
  await page.keyboard.press("Enter"); // keyboard clicks are never guarded
  await settle(page);
  const quick = await stateOf(page);
  await page.mouse.click(x, y);
  await settle(page);
  check(quick === (await stateOf(page)), "same spot: a quick re-click on the cell just left is ignored");
  await page.waitForTimeout(2600);
  const before = await stateOf(page);
  await page.mouse.click(x, y);
  await settle(page);
  check(before !== (await stateOf(page)), "same spot: a deliberate click after 2.5 s still works");
  await page.context().close();
}

await browser.close();
console.log(failures.length ? `FIT FAILED: ${failures.length} of ${checks} checks` : `FIT OK: ${checks} checks`);
process.exit(failures.length ? 1 : 0);
