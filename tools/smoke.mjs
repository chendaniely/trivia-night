// End-to-end smoke test: one whole game night in real Chrome.
//   make serve            (terminal 1)
//   make smoke            (terminal 2)  or: node tools/smoke.mjs http://127.0.0.1:8090/
// Serves nothing itself. Exits non-zero on a failed check or on any console
// error / page error other than a missing audio / image file (404).
import { chromium } from "playwright";

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
  page.$$eval("#screen-board .score-team", (els) => els.map((e) => e.textContent.trim()));
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
  // The bank preview (Task 25, U3) says what Done will do, in a line that
  // never changes height.
  const preview = () =>
    page.$eval("#screen-question .bank-preview", (e) => ({ text: e.textContent, h: e.getBoundingClientRect().height }));
  const p0 = await preview();
  check(p0.text === "Done: no one scores", `the preview starts at "no one scores" (${p0.text})`);
  await click("#screen-question .team-btns button >> nth=0");
  await click("#screen-question .team-btns button >> nth=1");
  await click("#screen-question .team-btns button >> nth=1");
  const p1 = await preview();
  check(p1.text === "Done: Hazy Bagpipes +100 · Misty Goblins \u2212100", `the preview names the points (${p1.text})`);
  check(p1.h === p0.h, "the preview keeps its height");
  await click("#screen-question button:text-is('Reveal answer')");
  await settle();
  check((await page.textContent("#screen-question .answer-text")).trim() !== "", "Reveal shows the answer");
  await click("#screen-question button:text-is('Done')");
  await settle();
  const played = await scores();
  check((await screen()) === "board" && played.join() !== before.join(), "Done banks points on the board");
  check((await page.$$(".board-cell.used")).length === 1, "the played cell is closed");

  // Reload -> Resume
  await page.reload();
  await page.waitForSelector("#screen-setup:not(.hidden)");
  await settle();
  check(await page.isVisible("#resume-btn"), "reload offers Resume");
  await click("#resume-btn");
  await settle();
  check((await scores()).join() === played.join(), "Resume restores the scores");
  check((await page.$$(".board-cell.used")).length === 1, "Resume restores the played cell");

  // Setup -> trivia; run a column to the tally
  await click("#setup-btn");
  await settle();
  await page.check('input[name=mode][value=trivia]');
  await click("#start-btn");
  await settle();
  check((await screen()) === "board", "switching to trivia returns to the board");
  await click('.board-header.clickable[data-ri="0"]');
  await settle();
  let n = 0;
  while ((await screen()) === "question" && n < 12) {
    if (n % 2 === 0) await click("#screen-question .team-btns button >> nth=0");
    await click("#screen-question button:text-is('Next')");
    await settle();
    n++;
  }
  check((await screen()) === "tally" && n > 0, `a trivia column ends on the tally (${n} questions)`);
  await click("#screen-tally button");
  await settle();
  check((await screen()) === "board", "the tally returns to the board");

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
} catch (err) {
  failures.push(`exception: ${err.message}`);
  console.log("FAIL exception:", err.message);
}

for (const p of problems) console.log("FAIL", p);
await browser.close();
const bad = failures.length + problems.length;
console.log(bad ? `\nSMOKE FAILED (${bad})` : "\nSMOKE OK");
process.exit(bad ? 1 : 0);
