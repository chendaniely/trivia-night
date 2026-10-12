import assert from "node:assert/strict";
import { randomTeamName, TEAM_ADJ, TEAM_NOUN } from "../js/teams.js";

// two words, one from each list
const n = randomTeamName([]);
assert.match(n, /^[\p{L}]+ [\p{L}]+$/u);
const [a, b] = n.split(" ");
assert.ok(TEAM_ADJ.includes(a), `adjective from list: ${a}`);
assert.ok(TEAM_NOUN.includes(b), `noun from list: ${b}`);

// no word is reused across generated names
const names = [];
for (let i = 0; i < 20; i++) names.push(randomTeamName(names));
const seen = new Set();
for (const name of names)
  for (const w of name.toLowerCase().split(" ")) {
    assert.ok(!seen.has(w), `word reused: ${w}`);
    seen.add(w);
  }

// no clash with words the host typed
const typed = ["Zesty Rockets"];
for (let i = 0; i < 10; i++) {
  const m = randomTeamName([...typed, ...names]);
  for (const w of m.toLowerCase().split(" "))
    assert.ok(!typed.some((t) => t.toLowerCase() === w), `clash with typed: ${w}`);
}

// a name containing a list word blocks that word only
const one = randomTeamName(["Wacky Pigeons"]);
assert.ok(!one.toLowerCase().includes("wacky"), "reused blocked adjective");
assert.ok(!one.toLowerCase().includes("pigeons"), "reused blocked noun");

// exhaustion falls back to a plain label, no crash
const wall = [
  ...TEAM_ADJ.map((w) => `${w} x`),
  ...TEAM_NOUN.map((w) => `y ${w}`),
];
assert.equal(randomTeamName(wall), `Team ${wall.length + 1}`);
