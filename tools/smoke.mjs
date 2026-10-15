// End-to-end smoke test: one whole game night in real Chrome.
//   make serve            (terminal 1)
//   make smoke            (terminal 2)  or: node tools/smoke.mjs http://127.0.0.1:8090/
// Serves nothing itself. Exits non-zero on a failed check or on any console
// error / page error other than a missing audio / image file (404).
import { chromium } from "playwright";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finishedSave } from "./finished-save.mjs";

const URL_ = process.argv[2] || "http://127.0.0.1:8080/";
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const problems = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const loc = m.location().url || "";
  if (/404/.test(m.text()) && /\/(audio|images)\//.test(loc)) return; // intentional missing media
  problems.push(`console: ${m.text()} (${loc})`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
// The app asks on its own confirm screen (Task 25, U7): any native dialog
// other than the leave-page prompt is a failure.
page.on("dialog", (d) => {
  if (d.type() !== "beforeunload") problems.push(`native ${d.type()}: ${d.message()}`);
  d.accept();
});

const settle = () => page.waitForTimeout(450); // 350 ms input lock
// A scripted click by a moving hand: the pointer leaves the last spot
// first, so the same-spot guard (Task 25) never mistakes it for a repeat.
const click = async (selector) => {
  await page.mouse.move(1, 1);
  await page.click(selector);
};
const screen = () =>
  page.evaluate(() =>
    ["setup", "board", "question", "tally", "error", "about", "confirm"].find(
      (s) => document.getElementById(`screen-${s}`) && !document.getElementById(`screen-${s}`).classList.contains("hidden")
    )
  );
const scores = () =>
  page.$$eval("#screen-board .score-team", (els) =>
    els.map((e) => `${e.firstChild.textContent.trim()} ${e.querySelector(".score-points").textContent}`)
  ); // name + points, not the score badge
const cell = (ri, qi) => `.board-cell.clickable[data-ri="${ri}"][data-qi="${qi}"]`;

try {
  await page.goto(URL_);
  await page.waitForSelector("#screen-setup:not(.hidden)", { timeout: 10000 });
  await settle();
  // Disabled buttons fade their own look (Task 25, U11): two teams means
  // Remove is disabled, and it must not look like a different, active button.
  const look = await page.evaluate(() => {
    const st = (el) => getComputedStyle(el);
    const rm = document.querySelector(".team-remove");
    const add = document.getElementById("add-team-btn");
    return { disabled: rm.disabled, sameFill: st(rm).backgroundColor === st(add).backgroundColor, opacity: Number(st(rm).opacity) };
  });
  check(look.disabled && look.sameFill && look.opacity < 0.6, "a disabled Remove is the quiet button, faded");
  // The setup title carries the NYC tricolor stripe (Task 26).
  check(
    /linear-gradient\(90deg, rgb\(35, 97, 146\).*rgb\(245, 249, 252\).*rgb\(242, 101, 34\)/.test(
      await page.$eval("#screen-setup h1", (e) => getComputedStyle(e, "::after").backgroundImage)
    ),
    "the setup title has the blue-white-orange stripe"
  );
  // Each mode says what it is (U13).
  check(
    (await page.textContent("#mode-pick")).replace(/\s+/g, " ").includes("Jeopardy any cell; wrong answers lose points") &&
      (await page.textContent("#mode-pick")).replace(/\s+/g, " ").includes("Trivia a category, top to bottom"),
    "setup explains the two modes"
  );
  // Start off for an empty name, and the subtitle says why (U12).
  await page.fill("#team-2", "");
  check(
    (await page.isDisabled("#start-btn")) && (await page.textContent("#screen-setup .subtitle")) === "Every team needs a name.",
    "an empty name: Start is off and the subtitle says why"
  );
  const warn = await page.$eval("#screen-setup .subtitle", (e) => [getComputedStyle(e).fontWeight, getComputedStyle(e).color]);
  check(warn[0] === "700" && warn[1] === "rgb(245, 249, 252)", `the warning is bold text, not orange (${warn})`);
  await page.fill("#team-1", "Hazy Bagpipes");
  await page.fill("#team-2", "Misty Goblins");
  await click("#start-btn");
  await settle();
  check((await screen()) === "board", "Start opens the board");
  const before = await scores();

  // Jeopardy: team 1 right, team 2 wrong, Reveal, Done
  await click(cell(0, 0));
  await settle();
  check((await screen()) === "question", "a cell opens its question");
  // The header says what it's worth (Task 25, U4); the answer's space is
  // there before Reveal, hidden (U2).
  check((await page.textContent("#screen-question h2")).replace(/\s+/g, " ").trim() === "Movies: Oscar · 100", "the question header shows the round and its points");
  check(!(await page.isVisible("#screen-question .answer-text")), "the answer is hidden before Reveal");
  // The bank preview (Task 25, U3) says what Done will do, in a line that
  // never changes height.
  const preview = () =>
    page.$eval("#screen-question .bank-preview", (e) => ({ text: e.textContent, h: e.getBoundingClientRect().height }));
  const p0 = await preview();
  // Marking moves nothing (Task 25 council): the ✓ / ✕ slot is reserved.
  // (the pointer leaves first: a hovered button lifts by 1 px)
  // (the pointer leaves, and the 140 ms hover lift settles, first)
  const targetsNow = async () => (await page.mouse.move(1, 1)) ?? (await page.waitForTimeout(250)) ??
    page.$$eval("#screen-question .team-btns button, #screen-question .controls", (els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width].map(Math.round).join(); }).join("|")
    );
  await page.evaluate(() => document.fonts.ready); // measure in the real font
  const t0 = await targetsNow();
  check(p0.text === "Done: no one scores", `the preview starts at "no one scores" (${p0.text})`);
  await click("#screen-question .team-btns button >> nth=0");
  await click("#screen-question .team-btns button >> nth=1");
  await click("#screen-question .team-btns button >> nth=1");
  const p1 = await preview();
  check(p1.text === "Done: +100 Hazy Bagpipes · \u2212100 Misty Goblins", `the preview names the points (${p1.text})`);
  check(p1.h === p0.h, "the preview keeps its height");
  check((await targetsNow()) === t0, "marking teams moves no button");
  await click("#screen-question button:text-is('Reveal answer')");
  await settle();
  check((await page.textContent("#screen-question .answer-text")).trim() !== "", "Reveal shows the answer");
  await click("#screen-question button:text-is('Done')");
  await settle();
  const played = await scores();
  check((await screen()) === "board" && played.join() !== before.join(), "Done banks points on the board");
  check((await page.$$(".board-cell.used")).length === 1, "the played cell is closed");
  // The lit board (Task 26): unplayed cells in NYC blue, lighter each row
  // down; a played cell drops into the background; category names sit on
  // an orange rule, unboxed.
  const lit = await page.evaluate(() => {
    const bg = (s) => getComputedStyle(document.querySelector(s)).backgroundColor;
    const h = getComputedStyle(document.querySelector(".board-header"));
    return { top: bg(".board-cell.clickable.tier-0"), bottom: bg(".board-cell.clickable.tier-4"), used: bg(".board-cell.used"), head: [h.backgroundColor, h.borderBottomColor] };
  });
  check(lit.top === "rgb(31, 87, 132)" && lit.bottom === "rgb(43, 115, 170)", `unplayed cells are lit blue, lighter down the board (${lit.top} → ${lit.bottom})`);
  check(lit.used === "rgba(0, 0, 0, 0)", `a played cell drops into the background (${lit.used})`);
  check(lit.head[0] === "rgba(0, 0, 0, 0)" && lit.head[1] === "rgb(242, 101, 34)", `category names sit on an orange rule (${lit.head})`);
  // Score badges (Task 25, U5): what just changed, on the score pills, and
  // gone at the next board.
  const badges = () => page.$$eval("#screen-board .score-badge", (e) => e.map((x) => x.textContent));
  check((await badges()).join() === "+100,\u2212100", `badges show what Done changed (${await badges()})`);
  await click(cell(0, 1));
  await settle();
  await click("#screen-question button:text-is('Back to board')");
  await settle();
  check((await badges()).length === 0, "badges are gone when the board is drawn again");
  // A score below zero reads "−100" (a true minus) in a muted colour (U17).
  const neg = await page.$eval("#screen-board .score-team:nth-child(2) .score-points", (e) => ({ t: e.textContent, c: getComputedStyle(e).color }));
  check(neg.t === "\u2212100" && neg.c === "rgb(159, 179, 200)", `a negative score reads ${neg.t}, muted (${neg.c})`);

  // Reload -> Resume
  await page.reload();
  await page.waitForSelector("#screen-setup:not(.hidden)");
  await settle();
  check(await page.isVisible("#resume-btn"), "reload offers Resume");
  // Start over a saved game asks first; with no game running yet, Back
  // still means Cancel and stays in the app (Task 25 council).
  await click("#start-btn");
  await settle();
  check((await screen()) === "confirm" && /saved game/.test(await page.textContent("#confirm-title")), "Start over a saved game asks first");
  await page.goBack();
  await settle();
  check(page.url().startsWith(URL_) && (await screen()) === "setup", "Back on that confirm cancels and stays in the app");
  await click("#resume-btn");
  await settle();
  check((await scores()).join() === played.join(), "Resume restores the scores");
  check((await badges()).length === 0, "badges are gone on the next board");
  check((await page.$$(".board-cell.used")).length === 1, "Resume restores the played cell");

  // Setup -> trivia; run a column to the tally
  await click("#setup-btn");
  await settle();
  await page.check('input[name=mode][value=trivia]');
  await click("#start-btn");
  await settle();
  check((await screen()) === "board", "switching to trivia returns to the board");
  // Trivia (U14): live headers look like buttons; the hint is short.
  const hdr = await page.$eval('.board-header.clickable[data-ri="0"]', (e) => getComputedStyle(e).backgroundColor);
  check(hdr === "rgb(35, 97, 146)", `live trivia headers look like buttons (${hdr})`);
  check((await page.textContent(".board-hint")) === "Trivia: click a category to play it.", "the trivia hint is short");
  // In trivia what's lit is what you press: the headers, not the cells.
  check(
    (await page.$eval(".board-grid.trivia .board-cell:not(.used):not(.board-gap)", (e) => getComputedStyle(e).backgroundColor)) === "rgba(0, 0, 0, 0)",
    "trivia cells stay dark (the headers are lit)"
  );
  await click('.board-header.clickable[data-ri="0"]');
  await settle();
  let n = 0;
  while ((await screen()) === "question" && n < 12) {
    if (n % 2 === 0) await click("#screen-question .team-btns button >> nth=0");
    if (n === 0)
      check(/^Next: \+\d+ Hazy Bagpipes$/.test(await page.textContent("#screen-question .bank-preview")), "the trivia preview says what Next banks");
    await click("#screen-question button:text-is('Next')");
    await settle();
    n++;
  }
  check((await screen()) === "tally" && n > 0, `a trivia column ends on the tally (${n} questions)`);
  // The tally is a title card: the round, each team's points from it and
  // their new total (U15).
  const tally = await page.evaluate(() => ({
    title: document.querySelector("#screen-tally .tally-title")?.textContent,
    cards: [...document.querySelectorAll("#screen-tally .tally-card")].map((c) => [
      c.querySelector(".tally-name").textContent,
      c.querySelector(".tally-round").textContent,
      c.querySelector(".tally-total").textContent,
    ]),
  }));
  check(tally.title === "Movies: Oscar — round over", `the tally names the round (${tally.title})`);
  check(
    tally.cards.length === 2 && tally.cards[0][0] === "Hazy Bagpipes" && /^\+\d+ this round$/.test(tally.cards[0][1]) && /^total \d+$/.test(tally.cards[0][2]) &&
      tally.cards[1][2] === "total \u2212100",
    `each team shows its round points and total, a true minus below zero (${JSON.stringify(tally.cards)})`
  );
  check(
    (await page.$eval("#screen-tally .tally-round.up", (e) => getComputedStyle(e).color)) === "rgb(242, 101, 34)",
    "points won in the round are orange"
  );
  await click("#screen-tally button");
  await settle();
  check((await screen()) === "board", "the tally returns to the board");
  check(/^\+\d+$/.test((await badges()).join()), `the board shows the column's points as badges (${await badges()})`);
  // Trivia Undo takes back the column's last question and reopens the column.
  await click("#undo-btn");
  await settle();
  await click("#confirm-ok");
  await settle();
  check(
    (await page.$$('.board-header.clickable[data-ri="0"]')).length === 1 &&
      (await page.evaluate(() => document.activeElement.dataset.ri)) === "0",
    "trivia Undo reopens the column, focus on its header"
  );
  check(
    (await page.textContent('.board-header.clickable[data-ri="0"] .col-left')) === "1 left" &&
      (await page.isVisible('.board-header.clickable[data-ri="0"] .col-left')),
    "a partly played column says how many are left"
  );
  // Leaving a tally with the browser's Back shows the badges too.
  await click('.board-header.clickable[data-ri="0"]');
  await settle();
  await click("#screen-question .team-btns button >> nth=0");
  await click("#screen-question button:text-is('Next')");
  await settle();
  await page.goBack();
  await settle();
  check((await screen()) === "board" && /^\+\d+$/.test((await badges()).join()), `Back from a tally shows the badges (${await badges()})`);

  // Reset game asks on the app's confirm screen: Cancel, Esc and Back keep
  // the game; OK resets it.
  const kept = await scores();
  await click("#reset-btn");
  await settle();
  check((await screen()) === "confirm", "Reset game asks first, on the app's confirm screen");
  check((await page.evaluate(() => document.activeElement.id)) === "confirm-cancel", "the confirm screen starts on Cancel");
  await click("#confirm-cancel");
  await settle();
  check((await screen()) === "board" && (await scores()).join() === kept.join(), "Cancel keeps the game");
  check((await page.evaluate(() => document.activeElement.id)) === "reset-btn", "Cancel returns focus to Reset game");
  await click("#reset-btn");
  await settle();
  await page.keyboard.press("Escape");
  await settle();
  check((await screen()) === "board" && (await scores()).join() === kept.join(), "Esc cancels");
  await click("#reset-btn");
  await settle();
  await page.goBack();
  await settle();
  check((await screen()) === "board" && (await scores()).join() === kept.join(), "Back cancels and stays in the app");
  await click("#reset-btn");
  await settle();
  await click("#confirm-ok");
  await settle();
  check((await scores()).every((s) => /\b0$/.test(s)), "Reset game zeroes the scores");
  check((await page.$$(".board-cell.used")).length === 0, "Reset game reopens every cell");

  // Held Enter must not leak through the click lock
  await click("#setup-btn");
  await settle();
  await page.check('input[name=mode][value=jeopardy]');
  await click("#start-btn");
  await settle();
  await click(cell(0, 0));
  await settle();
  await page.focus("#screen-question button[data-focus=reveal]");
  await page.keyboard.down("Enter");
  await page.waitForTimeout(450);
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down("Enter"); // auto-repeat keydowns
    await page.waitForTimeout(35);
  }
  await page.keyboard.up("Enter");
  check(
    (await page.$$eval("#screen-question .team-btns button", (b) => b.some((x) => /marked/.test(x.className)))) === false,
    "a held Enter on Reveal marks no team"
  );

  // Undo last question (Task 25, U1): asks, takes the points back, reopens
  // the cell, and is then disabled (one level).
  await click("#screen-question button:text-is('Back to board')");
  await settle();
  const beforeQ = await scores();
  check(await page.isDisabled("#undo-btn"), "Undo is disabled before anything is banked");
  await click(cell(1, 1));
  await settle();
  await click("#screen-question .team-btns button >> nth=0");
  await click("#screen-question .team-btns button >> nth=1");
  await click("#screen-question .team-btns button >> nth=1");
  await click("#screen-question button:text-is('Done')");
  await settle();
  check((await scores()).join() !== beforeQ.join() && (await page.isEnabled("#undo-btn")), "Done banks, and Undo is ready");
  await click("#undo-btn");
  await settle();
  check((await screen()) === "confirm" && /\+200|−200/.test(await page.textContent("#confirm-text")), "Undo asks first and names the points");
  await click("#confirm-ok");
  await settle();
  check((await scores()).join() === beforeQ.join(), "Undo takes the points back");
  check((await page.$$(cell(1, 1))).length === 1, "Undo reopens the cell");
  check(await page.isDisabled("#undo-btn"), "Undo is one level: disabled again");
  check((await page.evaluate(() => document.activeElement.dataset.ri + ":" + document.activeElement.dataset.qi)) === "1:1", "focus returns to the reopened cell");
  // Undo is saved with the game: after a reload and Resume it still works.
  await click(cell(1, 1));
  await settle();
  await click("#screen-question .team-btns button >> nth=0");
  await click("#screen-question button:text-is('Done')");
  await settle();
  await page.reload();
  await page.waitForSelector("#resume-btn:not(.hidden)");
  await settle();
  await click("#resume-btn");
  await settle();
  check(await page.isEnabled("#undo-btn"), "Undo survives a reload");
  await click("#undo-btn");
  await settle();
  await click("#confirm-ok");
  await settle();
  check((await scores()).join() === beforeQ.join() && (await page.$$(cell(1, 1))).length === 1, "Undo after Resume takes the points back");

  // The clip's own big button (Task 25, U8): first focus on a clip
  // question; OK plays, the label follows the clip; a missing clip
  // removes it and focus moves to the first team.
  const clips = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  clips.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  await clips.route("**/questions.yaml", (r) =>
    r.fulfill({
      contentType: "text/yaml",
      body: `title: "Clips"\nrounds:\n  - name: "Music"\n    questions:\n      - q: "Name this note."\n        a: "A4"\n        audio: "audio/demo/note-440.wav"\n      - q: "And this one?"\n        a: "Nothing"\n        audio: "audio/demo/missing.m4a"\n`,
    })
  );
  await clips.goto(URL_);
  await clips.waitForSelector("#screen-setup:not(.hidden)");
  await clips.waitForTimeout(450);
  await clips.mouse.move(1, 1);
  await clips.click("#start-btn");
  await clips.waitForTimeout(450);
  await clips.keyboard.press("Enter"); // the focused first cell
  await clips.waitForTimeout(450);
  const clipBtn = "#screen-question .clip-btn";
  check((await clips.evaluate(() => document.activeElement.classList.contains("clip-btn"))), "a clip question starts with focus on Play clip");
  check((await clips.textContent(clipBtn)) === "\u25B6 Play clip", "the clip button says Play clip");
  // Wait for the label rather than a fixed time: it says "Loading…" until
  // the clip really plays.
  const label = (text) =>
    clips.waitForFunction((t) => document.querySelector("#screen-question .clip-btn")?.textContent === t, text, { timeout: 4000 }).then(() => true, () => false);
  await clips.keyboard.press("Enter");
  check(await label("\u275A\u275A Pause"), "OK plays the clip (the button says Pause)");
  check(await label("\u21BA Replay"), "after the clip ends the button says Replay"); // the demo clip is 1 s
  await clips.mouse.move(1, 1);
  await clips.dblclick(clipBtn);
  check(await label("\u275A\u275A Pause"), "a double-click on the clip button is one press");
  await clips.mouse.move(1, 1);
  await clips.click("#screen-question button:text-is('Back to board')");
  await clips.waitForTimeout(450);
  await clips.mouse.move(1, 1);
  await clips.click(".board-cell.clickable[data-ri='0'][data-qi='1']");
  await clips.waitForTimeout(900);
  check((await clips.$$(clipBtn)).length === 0 && (await clips.isVisible("#screen-question .no-clip")), "a missing clip shows a note, not the button");
  check((await clips.evaluate(() => document.activeElement.classList.contains("no-clip"))), "focus moves to the note, so a stray OK marks no team");
  await clips.close();

  // The other confirms (Task 25, U7): a team-list change mid-game, Load
  // folder mid-game and Create new — the folder picker stubbed, so the
  // check is that OK (or Enter in the name field) opens it with the
  // click's user activation still live.
  const cf = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  cf.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  cf.on("dialog", (d) => {
    if (d.type() !== "beforeunload") problems.push(`native ${d.type()}: ${d.message()}`);
    d.accept();
  });
  await cf.addInitScript(() => {
    window.__picks = [];
    window.showDirectoryPicker = async (opts) => {
      window.__picks.push({ mode: opts && opts.mode, active: navigator.userActivation.isActive });
      throw new DOMException("stub", "AbortError");
    };
  });
  const cfClick = async (sel) => {
    await cf.mouse.move(1, 1);
    await cf.click(sel);
    await cf.waitForTimeout(450);
  };
  const cfScreen = () => cf.evaluate(() => ["setup", "board", "confirm"].find((s) => !document.getElementById(`screen-${s}`).classList.contains("hidden")));
  await cf.goto(URL_);
  await cf.waitForSelector("#screen-setup:not(.hidden)");
  await cf.waitForTimeout(450);
  await cfClick("#start-btn");
  await cfClick(".board-cell.clickable[data-ri='0'][data-qi='0']");
  await cfClick("#screen-question .team-btns button >> nth=0");
  await cfClick("#screen-question button:text-is('Done')");
  await cfClick("#setup-btn");
  await cfClick("#add-team-btn");
  await cfClick("#start-btn");
  check((await cfScreen()) === "confirm" && /fresh game/.test(await cf.textContent("#confirm-text")), "a team-list change mid-game asks first");
  await cfClick("#confirm-cancel");
  check((await cfScreen()) === "setup", "Cancel returns to setup");
  await cfClick("#load-folder-btn");
  check((await cfScreen()) === "confirm", "Load folder mid-game asks first");
  await cfClick("#confirm-ok");
  let picks = await cf.evaluate(() => window.__picks);
  check(picks.length === 1 && picks[0].active, "its OK opens the folder picker in the same click");
  await cfClick("#create-new-btn");
  check((await cf.evaluate(() => document.activeElement.id)) === "confirm-input", "Create new asks for the folder name first");
  await cf.keyboard.press("Enter");
  await cf.waitForTimeout(450);
  picks = await cf.evaluate(() => window.__picks);
  check(picks.length === 2 && picks[1].active && picks[1].mode === "readwrite", "Enter in the name field opens the readwrite picker");
  await cf.close();

  // A broken question file (Task 25, U16): plain wording, the file named,
  // the text in the normal colour (the bullets carry the red).
  const er = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await er.route("**/questions.yaml", (r) =>
    r.fulfill({ contentType: "text/yaml", body: 'title: "T"\nrounds:\n  - name: "R"\n    questions:\n      - q: "ok"\n        a: "ok"\n      - q: "no answer here"\n' })
  );
  await er.goto(URL_);
  await er.waitForSelector("#screen-error:not(.hidden)");
  check((await er.textContent("#error-source")) === "In the shipped questions.yaml:", "the error screen names the file");
  const li = await er.$eval("#error-list li", (e) => ({ text: e.textContent.replace(/\s+/g, " "), red: getComputedStyle(e).color === "rgb(248, 81, 73)" }));
  check(li.text === 'round 1 "R", question 2: has no answer — add a line like a: "the answer"' && !li.red, `the error reads plainly, not all red (${li.text})`);
  await er.close();

  // Older browsers (U19, made real): without :focus-visible — the check
  // throws and its rules are dropped, as an old browser drops them — the
  // .no-fv twins give a ring for the keyboard and nothing after a mouse
  // click (the room would read a ring as "next question picked").
  const old = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  old.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  await old.addInitScript(() => {
    const qs = Document.prototype.querySelector;
    Document.prototype.querySelector = function (sel) {
      if (sel === ":focus-visible") throw new SyntaxError("unknown pseudo-class");
      return qs.call(this, sel);
    };
  });
  await old.goto(URL_);
  await old.waitForSelector("#screen-setup:not(.hidden)");
  await old.evaluate(() => {
    for (const sheet of document.styleSheets)
      for (let i = sheet.cssRules.length - 1; i >= 0; i--)
        if ((sheet.cssRules[i].selectorText || "").includes(":focus-visible")) sheet.deleteRule(i);
  });
  check(await old.evaluate(() => document.documentElement.classList.contains("no-fv")), "no :focus-visible: the app switches on .no-fv");
  await old.waitForTimeout(450);
  await old.mouse.move(1, 1);
  await old.click("#start-btn"); // a mouse click; focus then goes to the first cell
  await old.waitForTimeout(450);
  const ring = () => old.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}`; });
  check(!(await ring()).startsWith("solid"), `after a mouse click, no ring (${await ring()})`);
  await old.keyboard.press("Tab");
  check(/^solid ([3-9]|1\d)(\.\d+)?px$/.test(await ring()), `with the keyboard, the ring (${await ring()})`);
  await old.close();

  // Mid-deploy (Task 26 council): a cached index.html from before the
  // confirm screen, with the new scripts, must still play a question.
  const stale = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  stale.on("pageerror", (e) => problems.push(`stale index.html: ${e.message}`));
  await stale.route(/\/(index\.html)?(\?.*)?$/, async (r) => {
    const res = await r.fetch();
    const html = (await res.text()).replace(/<section id="screen-confirm"[\s\S]*?<\/section>/, "");
    await r.fulfill({ response: res, body: html });
  });
  await stale.goto(URL_);
  await stale.waitForSelector("#screen-setup:not(.hidden)");
  check((await stale.$$("#screen-confirm")).length === 0, "the stale page has no confirm screen (precondition)");
  await stale.waitForTimeout(450);
  await stale.mouse.move(1, 1);
  await stale.click("#start-btn");
  await stale.waitForTimeout(450);
  await stale.mouse.move(1, 1);
  await stale.click(".board-cell.clickable");
  await stale.waitForTimeout(450);
  check(await stale.isVisible("#screen-question button:text-is('Done')"), "with a stale index.html a question still opens and plays");
  await stale.close();

  // A folder that fails through the folder picker names the folder.
  const pk = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await pk.addInitScript(() => {
    window.showDirectoryPicker = async () => ({
      name: "quiz-night",
      getFileHandle: async () => { throw new DOMException("missing", "NotFoundError"); },
    });
  });
  await pk.goto(URL_);
  await pk.waitForSelector("#screen-setup:not(.hidden)");
  await pk.waitForTimeout(450);
  await pk.click("#load-folder-btn");
  await pk.waitForSelector("#screen-error:not(.hidden)");
  check(
    (await pk.textContent("#error-source")) === 'In the folder "quiz-night":' &&
      (await pk.textContent("#error-list li")) === "there is no questions.yaml at its top level",
    "a broken folder: the error names it, and the line reads on its own"
  );
  await pk.close();

  // The end of the game (Task 25, U6 + U18): when no cell is left, the
  // scoreboard is the final standings — ranked, the winner (or a tie)
  // named — and focus is on Setup, not lost.
  const fin = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  fin.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  for (const [teams, title] of [
    [[["Bouncy Gophers", 900], ["Silky Marmots", 600], ["Feral Pickles", 900]], "Final scores · a tie between Bouncy Gophers and Feral Pickles"],
    [[["Bouncy Gophers", 300], ["Silky Marmots", 600], ["Feral Pickles", -100]], "Final scores · Silky Marmots wins"],
    [[["A", 500], ["B", 500], ["C", 500], ["D", 100]], "Final scores · a tie between A, B and C"],
    [[["A", 700], ["B", 700], ["C", 700]], "Final scores · everyone ties"],
    [[["A", 0], ["B", 0], ["C", 0]], "Final scores · everyone ends on 0"],
    [[["A", -200], ["B", -500], ["C", -900]], "Final scores · A wins"], // a leader below zero reads on orange
  ]) {
    const { key, json } = await finishedSave(URL_, teams);
    await fin.goto(URL_);
    await fin.waitForSelector("#screen-setup:not(.hidden)");
    await fin.evaluate(([k, v]) => localStorage.setItem(k, v), [key, json]);
    await fin.reload();
    await fin.waitForSelector("#resume-btn:not(.hidden)");
    await fin.waitForTimeout(450);
    await fin.mouse.move(1, 1);
    await fin.click("#resume-btn");
    await fin.waitForTimeout(450);
    check((await fin.textContent("#screen-board .final-title")) === title, `the finished board says "${title}"`);
    const order = await fin.$$eval("#screen-board .score-team", (e) => e.map((x) => x.firstChild.textContent.trim()));
    const ranked = [...teams].sort((a, b) => b[1] - a[1]).map((t) => t[0]);
    check(order.join() === ranked.join(), `the final scores are ranked (${order.join(", ")})`);
    const top = Math.max(...teams.map((t) => t[1]));
    check((await fin.$$("#screen-board .score-team.leader")).length === teams.filter((t) => t[1] === top).length, "the leader(s) stand out");
    // The finish (Task 26): the winner filled orange, dark text; the title
    // has the tricolor stripe.
    const win = await fin.$eval("#screen-board .score-team.leader", (e) => [
      getComputedStyle(e).backgroundColor,
      getComputedStyle(e.querySelector(".score-points")).color,
      getComputedStyle(e.querySelector(".score-name")).color,
    ]);
    check(
      win[0] === "rgb(242, 101, 34)" && win[1] === "rgb(10, 22, 32)" && win[2] === "rgb(10, 22, 32)",
      `the winner is filled orange, name and score dark (${win})`
    );
    check(
      /linear-gradient\(90deg, rgb\(35, 97, 146\).*rgb\(245, 249, 252\).*rgb\(242, 101, 34\)/.test(
        await fin.$eval("#screen-board .final-title", (e) => getComputedStyle(e, "::after").backgroundImage)
      ),
      "the Final scores title has the blue-white-orange stripe"
    );
    const played = await fin.$eval("#screen-board .board-cell.used", (e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]);
    check(played[0] === "rgb(58, 88, 114)" && played[1] === "rgba(0, 0, 0, 0)", `played cells recede: faint number, no fill (${played})`);
    check((await fin.evaluate(() => document.activeElement.id)) === "setup-btn", "focus is on Setup when the game is over");
    await fin.keyboard.press("Enter");
    await fin.waitForTimeout(450);
    check((await fin.evaluate(() => document.activeElement.id)) === "setup-back-btn", "Setup from the final board starts on Back to board");
  }
  // Undo from the Final scores: the last question reopens and the normal
  // board comes back.
  {
    const { key, json } = await finishedSave(URL_, [["Bouncy Gophers", 900], ["Silky Marmots", 600]], {
      cell: "5:4", round: "Words", deltas: [{ teamIdx: 0, points: 500 }],
    });
    await fin.goto(URL_);
    await fin.waitForSelector("#screen-setup:not(.hidden)");
    await fin.evaluate(([k, v]) => localStorage.setItem(k, v), [key, json]);
    await fin.reload();
    await fin.waitForSelector("#resume-btn:not(.hidden)");
    await fin.waitForTimeout(450);
    await fin.mouse.move(1, 1);
    await fin.click("#resume-btn");
    await fin.waitForTimeout(450);
    await fin.mouse.move(1, 1);
    await fin.click("#undo-btn");
    await fin.waitForTimeout(450);
    await fin.mouse.move(1, 1);
    await fin.click("#confirm-ok");
    await fin.waitForTimeout(450);
    check(
      (await fin.$$("#screen-board .final-title")).length === 0 &&
        (await fin.$$(".board-cell.clickable[data-ri='5'][data-qi='4']")).length === 1 &&
        (await fin.$$eval("#screen-board .score-points", (e) => e.map((x) => x.textContent))).join() === "400,600",
      "Undo from the Final scores reopens the last question"
    );
  }
  await fin.close();

  // Council fixes (Task 25 Step 2). A touch tap elsewhere ends the
  // same-spot guard (touch has no pointermove); a held-back click doesn't
  // move focus; a folder load while a confirm is open doesn't leave a
  // stale confirm behind; a double-click on Remove removes one team.
  const tc = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true })).newPage();
  tc.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const centre = async (p, sel) => {
    const b = await p.locator(sel).first().boundingBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  };
  const tcScreen = () => tc.evaluate(() => ["setup", "board", "question", "confirm"].find((s) => !document.getElementById(`screen-${s}`).classList.contains("hidden")));
  await tc.goto(URL_);
  await tc.waitForSelector("#screen-setup:not(.hidden)");
  await tc.waitForTimeout(450);
  await tc.tap("#start-btn");
  await tc.waitForTimeout(450);
  const [gx, gy] = await centre(tc, ".board-cell.clickable[data-ri='0'][data-qi='0']");
  await tc.touchscreen.tap(gx, gy); // opens the question, guards (gx, gy)
  await tc.waitForTimeout(450);
  await tc.tap("#screen-question .team-btns button >> nth=0"); // a tap elsewhere (marks never lock)
  await tc.waitForTimeout(100);
  await tc.tap("#screen-question .team-btns button >> nth=0"); // clear the mark again
  await tc.focus("#screen-question button:text-is('Back to board')");
  await tc.keyboard.press("Enter");
  await tc.waitForTimeout(450);
  await tc.touchscreen.tap(gx, gy); // within 2.5 s of the first tap
  await tc.waitForTimeout(450);
  check((await tcScreen()) === "question", "on touch, a tap elsewhere ends the same-spot guard");
  await tc.close();

  const fg = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  fg.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const fgClick = async (sel) => {
    await fg.mouse.move(1, 1);
    await fg.click(sel);
    await fg.waitForTimeout(450);
  };
  await fg.goto(URL_);
  await fg.waitForSelector("#screen-setup:not(.hidden)");
  await fg.waitForTimeout(450);
  // double-click Remove: one team goes
  await fgClick("#add-team-btn");
  await fgClick("#add-team-btn");
  await fg.mouse.move(1, 1);
  await fg.dblclick(".team-remove >> nth=0");
  await fg.waitForTimeout(450);
  check((await fg.$$("#team-inputs .team-row")).length === 3, "a double-click on Remove removes one team");
  await fgClick("#start-btn");
  // a held-back click moves no focus: trivia Next, then the same spot again
  await fgClick("#setup-btn");
  await fg.check("input[name=mode][value=trivia]");
  await fgClick("#start-btn");
  await fgClick('.board-header.clickable[data-ri="5"]');
  const [nx, ny] = await centre(fg, "#screen-question button:text-is('Next')");
  await fg.mouse.click(nx, ny); // passes question 1: guards (nx, ny)
  await fg.waitForTimeout(600);
  const focusBefore = await fg.evaluate(() => document.activeElement.outerHTML);
  const qBefore = await fg.textContent("#screen-question .question-text");
  await fg.mouse.click(nx, ny);
  await fg.waitForTimeout(450);
  check(
    (await fg.evaluate(() => document.activeElement.outerHTML)) === focusBefore &&
      (await fg.textContent("#screen-question .question-text")) === qBefore,
    "a held-back click changes nothing and moves no focus"
  );
  await fgClick("#screen-question button:text-is('Back to board')");
  // a folder load while the Reset confirm is open, then Esc
  const dir = mkdtempSync(join(tmpdir(), "trivia-smoke-"));
  mkdirSync(join(dir, "night"));
  writeFileSync(join(dir, "night", "questions.yaml"), 'title: "Folder board"\nrounds:\n  - name: "Only"\n    questions:\n      - q: "Q?"\n        a: "A"\n');
  await fgClick("#reset-btn");
  await fg.setInputFiles("#folder-input", join(dir, "night"));
  await fg.waitForTimeout(800);
  await fg.keyboard.press("Escape");
  await fg.waitForTimeout(450);
  check(
    (await fg.evaluate(() => ["setup", "board", "confirm"].find((s) => !document.getElementById(`screen-${s}`).classList.contains("hidden")))) === "setup" &&
      (await fg.textContent("#screen-setup h1")) === "Folder board",
    "a folder load closes an open confirm; Esc doesn't bring back the old board"
  );
  rmSync(dir, { recursive: true, force: true });
  await fg.close();
} catch (err) {
  failures.push(`exception: ${err.message}`);
  console.log("FAIL exception:", err.message);
}

for (const p of problems) console.log("FAIL", p);
await browser.close();
const bad = failures.length + problems.length;
console.log(bad ? `\nSMOKE FAILED (${bad})` : "\nSMOKE OK");
process.exit(bad ? 1 : 0);
