import assert from "node:assert/strict";
import { createScoring } from "../js/scoring.js";
import {
  SAVE_PREFIX,
  MAX_SLOTS,
  slotKey,
  bankKeyOf,
  makeSave,
  parseSave,
  hasProgress,
  ageText,
  saveSummary,
  otherBoardHint,
  writeSave,
  readSave,
  listSaves,
  resumableSave,
  latestOtherSave,
  canSave,
} from "../js/persist.js";

// bankKeyOf: FNV-1a 32-bit over the UTF-8 bytes, 8 lowercase hex chars
assert.equal(bankKeyOf(""), "811c9dc5");
assert.equal(bankKeyOf("a"), "e40c292c");
assert.equal(bankKeyOf("foobar"), "bf9cf968");
assert.match(bankKeyOf("café — ünïcode"), /^[0-9a-f]{8}$/);
assert.notEqual(bankKeyOf("café"), bankKeyOf("cafe"));
assert.notEqual(bankKeyOf('title: "A"\n'), bankKeyOf('title: "B"\n'));

// one slot per board
assert.equal(SAVE_PREFIX, "trivia-night:game:");
assert.equal(slotKey("deadbeef"), "trivia-night:game:deadbeef");
assert.equal(MAX_SLOTS, 10);

const T0 = new Date("2026-11-08T20:00:00.000Z");
const minutes = (m) => new Date(T0.getTime() + m * 60000);

// a game in progress: 2 cells played, one wrong answer
function playedGame(bankKey = "deadbeef", title = "Folder Night") {
  const scoring = createScoring(["Hazy Bagpipes", "Misty Goblins"]);
  scoring.give(0, 300, "Movies");
  scoring.give(1, 100, "Music");
  scoring.give(1, -100, "Music");
  scoring.give(1, 100, "Music");
  const used = new Map([["0:2", true], ["1:0", true]]);
  return { bankKey, bank: { title }, mode: "jeopardy", scoring, used };
}
function freshGame(bankKey = "k") {
  return { bankKey, bank: { title: "Fresh" }, mode: "trivia", scoring: createScoring(["A", "B"]), used: new Map() };
}

// makeSave: versioned, JSON-safe, used cells as keys, board title, time
const save = makeSave(playedGame(), T0);
assert.equal(save.v, 1);
assert.equal(save.bankKey, "deadbeef");
assert.equal(save.title, "Folder Night");
assert.equal(save.mode, "jeopardy");
assert.deepEqual(save.used, ["0:2", "1:0"]);
assert.deepEqual(save.scoring.teams, [
  { name: "Hazy Bagpipes", points: 300 },
  { name: "Misty Goblins", points: 100 },
]);
assert.equal(save.savedAt, "2026-11-08T20:00:00.000Z");
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
assert.equal(bad((s) => { s.savedAt = "yesterday-ish"; }), null, "savedAt not a date");
assert.equal(bad((s) => { s.title = 7; }), null, "title not a string");
assert.equal(bad((s) => { delete s.title; }).title, undefined, "title may be missing");

// hasProgress: any used cell OR any non-zero score
assert.equal(hasProgress(save), true);
const fresh = makeSave(freshGame(), T0);
assert.equal(hasProgress(fresh), false, "a just-started game has no progress");
assert.equal(hasProgress({ ...fresh, used: ["0:0"] }), true, "a played cell (nobody got it) is progress");
const scoredOnly = createScoring(["A", "B"]);
scoredOnly.give(1, -200, "Movies");
assert.equal(hasProgress(makeSave({ ...freshGame(), scoring: scoredOnly }, T0)), true, "a non-zero score is progress");

// ageText: just now / N min / N h / N days
assert.equal(ageText(save.savedAt, minutes(0)), "just now");
assert.equal(ageText(save.savedAt, minutes(0.9)), "just now");
assert.equal(ageText(save.savedAt, minutes(-3)), "just now", "clock skew never reads as the future");
assert.equal(ageText(save.savedAt, minutes(1)), "1 min ago");
assert.equal(ageText(save.savedAt, minutes(12)), "12 min ago");
assert.equal(ageText(save.savedAt, minutes(59)), "59 min ago");
assert.equal(ageText(save.savedAt, minutes(60)), "1 h ago");
assert.equal(ageText(save.savedAt, minutes(23 * 60 + 59)), "23 h ago");
assert.equal(ageText(save.savedAt, minutes(24 * 60)), "1 day ago");
assert.equal(ageText(save.savedAt, minutes(3 * 24 * 60)), "3 days ago");

// saveSummary: names + points + age, joined by " · "
assert.equal(saveSummary(save, minutes(12)), "Saved game: Hazy Bagpipes 300 · Misty Goblins 100 · saved 12 min ago");
assert.equal(saveSummary(save, minutes(0)), "Saved game: Hazy Bagpipes 300 · Misty Goblins 100 · saved just now");

// otherBoardHint: points the host at the board that holds the save
assert.equal(
  otherBoardHint(save, minutes(12)),
  'Saved game on "Folder Night" (Hazy Bagpipes 300 · Misty Goblins 100, saved 12 min ago) — Load folder and pick that folder to resume it.'
);
assert.equal(
  otherBoardHint(save, minutes(12), true),
  'Saved game on "Folder Night" (Hazy Bagpipes 300 · Misty Goblins 100, saved 12 min ago) — reload the page to resume it.',
  "the shipped board comes back with a reload, not Load folder"
);
const untitled = { ...save };
delete untitled.title;
assert.match(otherBoardHint(untitled, minutes(12)), /^Saved game on another board \(/);

// storage: a Map-backed fake of the Web Storage API
function fake() {
  const m = new Map();
  return {
    m,
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
const throwing = {
  get length() { throw new Error("SecurityError"); },
  key() { throw new Error("SecurityError"); },
  getItem() { throw new Error("SecurityError"); },
  setItem() { throw new Error("QuotaExceededError"); },
  removeItem() { throw new Error("SecurityError"); },
};

// write/read by board: each board has its own slot
const store = fake();
assert.equal(readSave(store, "deadbeef"), null, "nothing saved yet");
assert.equal(writeSave(store, save), true);
assert.equal(typeof store.m.get("trivia-night:game:deadbeef"), "string");
assert.deepEqual(readSave(store, "deadbeef"), save);
const other = makeSave(playedGame("cafef00d", "Trivia Night"), minutes(5));
writeSave(store, other);
assert.deepEqual(readSave(store, "deadbeef"), save, "another board's write leaves this slot alone");
assert.deepEqual(readSave(store, "cafef00d"), other);
writeSave(store, makeSave(freshGame("deadbeef"), minutes(6)));
assert.deepEqual(readSave(store, "cafef00d"), other, "starting a game on one board never touches another's slot");
store.m.set(slotKey("deadbeef"), "{corrupt");
assert.equal(readSave(store, "deadbeef"), null, "corrupt value reads as no save");

// the old single-slot key is ignored
const legacy = fake();
legacy.setItem("trivia-night:game", JSON.stringify(save));
assert.equal(readSave(legacy, "deadbeef"), null);
assert.deepEqual(listSaves(legacy), []);

// listSaves: valid slots, newest first; foreign keys and junk skipped
const many = fake();
many.setItem("someone-else", "x");
many.setItem(slotKey("junk"), "{corrupt");
writeSave(many, makeSave(playedGame("b1", "One"), minutes(1)));
writeSave(many, makeSave(playedGame("b3", "Three"), minutes(3)));
writeSave(many, makeSave(playedGame("b2", "Two"), minutes(2)));
assert.deepEqual(listSaves(many).map((s) => s.bankKey), ["b3", "b2", "b1"]);

// pruning on write: only the MAX_SLOTS most recent slots remain
const crowd = fake();
crowd.setItem("someone-else", "keep me");
for (let i = 0; i < 11; i++) writeSave(crowd, makeSave(playedGame(`board${i}`, `Board ${i}`), minutes(i)));
const slots = [...crowd.m.keys()].filter((k) => k.startsWith(SAVE_PREFIX));
assert.equal(slots.length, 10, "11 boards -> 10 slots");
assert.equal(crowd.getItem(slotKey("board0")), null, "the oldest board was dropped");
assert.notEqual(crowd.getItem(slotKey("board10")), null, "the newest board is kept");
assert.equal(crowd.getItem("someone-else"), "keep me", "other keys are never pruned");
// re-saving an old board makes it recent again
writeSave(crowd, makeSave(playedGame("board1", "Board 1"), minutes(20)));
writeSave(crowd, makeSave(playedGame("board11", "Board 11"), minutes(21)));
assert.notEqual(crowd.getItem(slotKey("board1")), null, "a board saved again is kept");
assert.equal(crowd.getItem(slotKey("board2")), null, "the now-oldest board was dropped");

// resumableSave: this board's slot with progress, else null
const s2 = fake();
writeSave(s2, save);
assert.deepEqual(resumableSave(s2, "deadbeef"), save);
assert.equal(resumableSave(s2, "cafef00d"), null, "another board's save is not offered");
writeSave(s2, makeSave(freshGame("deadbeef"), minutes(1)));
assert.equal(resumableSave(s2, "deadbeef"), null, "a game with no progress is not offered");

// latestOtherSave: the most recent save WITH progress, when it is another board's
const s3 = fake();
writeSave(s3, makeSave(playedGame("folder", "Folder Night"), minutes(1)));
writeSave(s3, makeSave(freshGame("shipped"), minutes(2))); // newer, but no progress
assert.equal(latestOtherSave(s3, "shipped").bankKey, "folder", "newest WITH progress");
assert.equal(latestOtherSave(s3, "folder"), null, "it is this board's own save");
writeSave(s3, makeSave(playedGame("third", "Third"), minutes(3)));
assert.equal(latestOtherSave(s3, "folder").bankKey, "third");
assert.equal(latestOtherSave(fake(), "x"), null, "nothing saved");
// an older save of this board's own does not hide a newer other-board one
assert.equal(latestOtherSave(s3, "folder").bankKey, "third", "skips this board's own slot");

// canSave: a probe write; no trace left behind
const s4 = fake();
assert.equal(canSave(s4), true);
assert.equal(s4.m.size, 0, "probe removed");

// throwing / missing storage: reads give null or [], writes give false
assert.equal(readSave(throwing, "deadbeef"), null);
assert.equal(writeSave(throwing, save), false);
assert.deepEqual(listSaves(throwing), []);
assert.equal(resumableSave(throwing, "deadbeef"), null);
assert.equal(latestOtherSave(throwing, "deadbeef"), null);
assert.equal(canSave(throwing), false);
assert.equal(readSave(null, "deadbeef"), null, "no storage at all");
assert.equal(writeSave(null, save), false);
assert.deepEqual(listSaves(null), []);
assert.equal(canSave(null), false);

console.log("persist: all assertions passed");
