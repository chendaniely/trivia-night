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
page.on("dialog", (d) => d.accept()); // Reset game's confirm

const settle = () => page.waitForTimeout(450); // 350 ms input lock
const screen = () =>
  page.evaluate(() =>
    ["setup", "board", "question", "tally", "error", "about"].find(
      (s) => !document.getElementById(`screen-${s}`).classList.contains("hidden")
    )
  );
const scores = () =>
  page.$$eval("#screen-board .score-team", (els) => els.map((e) => e.textContent.trim()));
const cell = (ri, qi) => `.board-cell.clickable[data-ri="${ri}"][data-qi="${qi}"]`;

try {
  await page.goto(URL_);
  await page.waitForSelector("#screen-setup:not(.hidden)", { timeout: 10000 });
  await settle();
  await page.fill("#team-1", "Hazy Bagpipes");
  await page.fill("#team-2", "Misty Goblins");
  await page.click("#start-btn");
  await settle();
  check((await screen()) === "board", "Start opens the board");
  const before = await scores();

  // Jeopardy: team 1 right, team 2 wrong, Reveal, Done
  await page.click(cell(0, 0));
  await settle();
  check((await screen()) === "question", "a cell opens its question");
  await page.click("#screen-question .team-btns button >> nth=0");
  await page.click("#screen-question .team-btns button >> nth=1");
  await page.click("#screen-question .team-btns button >> nth=1");
  await page.click("#screen-question button:text-is('Reveal answer')");
  await settle();
  check((await page.textContent("#screen-question .answer-text")).trim() !== "", "Reveal shows the answer");
  await page.click("#screen-question button:text-is('Done')");
  await settle();
  const played = await scores();
  check((await screen()) === "board" && played.join() !== before.join(), "Done banks points on the board");
  check((await page.$$(".board-cell.used")).length === 1, "the played cell is closed");

  // Reload -> Resume
  await page.reload();
  await page.waitForSelector("#screen-setup:not(.hidden)");
  await settle();
  check(await page.isVisible("#resume-btn"), "reload offers Resume");
  await page.click("#resume-btn");
  await settle();
  check((await scores()).join() === played.join(), "Resume restores the scores");
  check((await page.$$(".board-cell.used")).length === 1, "Resume restores the played cell");

  // Setup -> trivia; run a column to the tally
  await page.click("#setup-btn");
  await settle();
  await page.check('input[name=mode][value=trivia]');
  await page.click("#start-btn");
  await settle();
  check((await screen()) === "board", "switching to trivia returns to the board");
  await page.click('.board-header.clickable[data-ri="0"]');
  await settle();
  let n = 0;
  while ((await screen()) === "question" && n < 12) {
    if (n % 2 === 0) await page.click("#screen-question .team-btns button >> nth=0");
    await page.click("#screen-question button:text-is('Next')");
    await settle();
    n++;
  }
  check((await screen()) === "tally" && n > 0, `a trivia column ends on the tally (${n} questions)`);
  await page.click("#screen-tally button");
  await settle();
  check((await screen()) === "board", "the tally returns to the board");

  // Reset game (confirm accepted)
  await page.click("#reset-btn");
  await settle();
  check((await scores()).every((s) => /\b0$/.test(s)), "Reset game zeroes the scores");
  check((await page.$$(".board-cell.used")).length === 0, "Reset game reopens every cell");

  // Held Enter must not leak through the click lock
  await page.click("#setup-btn");
  await settle();
  await page.check('input[name=mode][value=jeopardy]');
  await page.click("#start-btn");
  await settle();
  await page.click(cell(0, 0));
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
} catch (err) {
  failures.push(`exception: ${err.message}`);
  console.log("FAIL exception:", err.message);
}

for (const p of problems) console.log("FAIL", p);
await browser.close();
const bad = failures.length + problems.length;
console.log(bad ? `\nSMOKE FAILED (${bad})` : "\nSMOKE OK");
process.exit(bad ? 1 : 0);
