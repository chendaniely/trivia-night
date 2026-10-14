import assert from "node:assert/strict";
import { createScoring } from "../js/scoring.js";
import {
  SAVE_KEY,
  bankKeyOf,
  makeSave,
  parseSave,
  hasProgress,
  saveSummary,
  writeSave,
  readSave,
  resumableSave,
} from "../js/persist.js";

// bankKeyOf: FNV-1a 32-bit over the UTF-8 bytes, 8 lowercase hex chars
assert.equal(bankKeyOf(""), "811c9dc5");
assert.equal(bankKeyOf("a"), "e40c292c");
assert.equal(bankKeyOf("foobar"), "bf9cf968");
assert.match(bankKeyOf("café — ünïcode"), /^[0-9a-f]{8}$/);
assert.notEqual(bankKeyOf("café"), bankKeyOf("cafe"));
assert.notEqual(bankKeyOf('title: "A"\n'), bankKeyOf('title: "B"\n'));

// a game in progress: 2 cells played, one wrong answer
function playedGame() {
  const scoring = createScoring(["Hazy Bagpipes", "Misty Goblins"]);
  scoring.give(0, 300, "Movies");
  scoring.give(1, 100, "Music");
  scoring.give(1, -100, "Music");
  scoring.give(1, 100, "Music");
  const used = new Map([["0:2", true], ["1:0", true]]);
  return { bankKey: "deadbeef", mode: "jeopardy", scoring, used };
}

// makeSave: versioned, JSON-safe, used cells as keys
const save = makeSave(playedGame());
assert.equal(save.v, 1);
assert.equal(save.bankKey, "deadbeef");
assert.equal(save.mode, "jeopardy");
assert.deepEqual(save.used, ["0:2", "1:0"]);
assert.deepEqual(save.scoring.teams, [
  { name: "Hazy Bagpipes", points: 300 },
  { name: "Misty Goblins", points: 100 },
]);
assert.equal(typeof save.savedAt, "string");
assert.deepEqual(parseSave(JSON.stringify(save)), save, "JSON round trip");

// parseSave: anything malformed is null, never a throw
const bad = (mutate) => {
  const s = JSON.parse(JSON.stringify(save));
  mutate(s);
  return parseSave(JSON.stringify(s));
};
assert.equal(parseSave(null), null);
assert.equal(parseSave(""), null);
assert.equal(parseSave("{not json"), null);
assert.equal(parseSave("42"), null);
assert.equal(parseSave("null"), null);
assert.equal(bad((s) => { s.v = 2; }), null, "unknown version");
assert.equal(bad((s) => { delete s.bankKey; }), null, "no bankKey");
assert.equal(bad((s) => { s.mode = "quiz"; }), null, "unknown mode");
assert.equal(bad((s) => { s.scoring.teams.pop(); }), null, "fewer than 2 teams");
assert.equal(bad((s) => { s.scoring.teams[0].name = ""; }), null, "empty name");
assert.equal(bad((s) => { s.scoring.teams[1].points = "100"; }), null, "points not a number");
assert.equal(bad((s) => { s.scoring.log = {}; }), null, "log not a list");
assert.equal(bad((s) => { s.scoring.log[0][1][0].teamIdx = 2; }), null, "teamIdx out of range");
assert.equal(bad((s) => { s.scoring.log[0][0] = 7; }), null, "round name not a string");
assert.equal(bad((s) => { s.used.push("x:1"); }), null, "malformed used key");
assert.equal(bad((s) => { s.used = "0:2"; }), null, "used not a list");

// hasProgress: any used cell OR any non-zero score
assert.equal(hasProgress(save), true);
const fresh = makeSave({ bankKey: "k", mode: "trivia", scoring: createScoring(["A", "B"]), used: new Map() });
assert.equal(hasProgress(fresh), false, "a just-started game has no progress");
assert.equal(hasProgress({ ...fresh, used: ["0:0"] }), true, "a played cell (nobody got it) is progress");
const scoredOnly = createScoring(["A", "B"]);
scoredOnly.give(1, -200, "Movies");
assert.equal(hasProgress(makeSave({ bankKey: "k", mode: "jeopardy", scoring: scoredOnly, used: new Map() })), true, "a non-zero score is progress");

// saveSummary: one line, names + points joined by " · "
assert.equal(saveSummary(save), "Saved game: Hazy Bagpipes 300 · Misty Goblins 100");

// storage: a Map-backed fake, then storage that throws (private mode,
// blocked site data) — reads give null, writes give false, nothing throws
const fake = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};
const store = fake();
assert.equal(readSave(store), null, "nothing saved yet");
assert.equal(writeSave(store, save), true);
assert.equal(typeof store.m.get(SAVE_KEY), "string");
assert.equal(SAVE_KEY, "trivia-night:game");
assert.deepEqual(readSave(store), save);
store.m.set(SAVE_KEY, "{corrupt");
assert.equal(readSave(store), null, "corrupt value reads as no save");

const throwing = {
  getItem() { throw new Error("SecurityError"); },
  setItem() { throw new Error("QuotaExceededError"); },
};
assert.equal(readSave(throwing), null);
assert.equal(writeSave(throwing, save), false);
assert.equal(readSave(null), null, "no storage at all");
assert.equal(writeSave(null, save), false);

// resumableSave: same bank AND progress, else null
const s2 = fake();
writeSave(s2, save);
assert.deepEqual(resumableSave(s2, "deadbeef"), save);
assert.equal(resumableSave(s2, "cafef00d"), null, "another bank's save is not offered");
writeSave(s2, { ...fresh, bankKey: "deadbeef" });
assert.equal(resumableSave(s2, "deadbeef"), null, "a game with no progress is not offered");
assert.equal(resumableSave(throwing, "deadbeef"), null);

console.log("persist: all assertions passed");
