// Older TV browsers (Task 25, U19): before Safari 15.4 `:focus-visible` is
// unknown, and a browser drops a whole rule over one selector it doesn't
// know. So a :focus-visible selector stands alone in its rule (its
// neighbours, like :hover, survive), and each has a `.no-fv … :focus`
// twin that app.js switches on where :focus-visible is missing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const lists = [...css.matchAll(/([^{}@]+)\{/g)].map((m) => m[1].trim());
const fv = [];
for (const list of lists) {
  const sels = list.split(",").map((s) => s.trim());
  if (!sels.some((s) => s.includes(":focus-visible"))) continue;
  assert.equal(sels.length, 1, `":focus-visible" shares a rule with other selectors: ${list}`);
  fv.push(sels[0]);
}
assert.ok(fv.length > 0);
const all = new Set(lists.flatMap((l) => l.split(",").map((s) => s.trim())));
for (const s of fv) {
  const twin = ".no-fv.kbd " + s.replace(/:focus-visible/g, ":focus");
  assert.ok(all.has(twin), `no fallback for "${s}" (expected "${twin}")`);
}

// and app.js sets the class where :focus-visible is missing
const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert.match(app, /":focus-visible"/);
assert.match(app, /no-fv/);
assert.match(app, /classList\.(add|toggle)\("kbd"/);
