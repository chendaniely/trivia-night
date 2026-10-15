// Undo last question (Task 25, U1): one banked question can be taken back.
import assert from "node:assert/strict";
import { createScoring, restoreScoring, deltasFor } from "../js/scoring.js";
import { makeSave, parseSave } from "../js/persist.js";

// deltasFor: marks (teamIdx -> "green" | "red") to signed points, by team
assert.deepEqual(
  deltasFor(new Map([[2, "red"], [0, "green"]]), 300),
  [{ teamIdx: 0, points: 300 }, { teamIdx: 2, points: -300 }]
);
assert.deepEqual(deltasFor(new Map(), 300), []);

// bank applies the deltas and remembers them; undoLast takes them back
const s = createScoring(["A", "B", "C"]);
assert.equal(s.last, null);
s.bank("0:0", "Movies", [{ teamIdx: 0, points: 100 }]);
s.bank("0:2", "Movies", [{ teamIdx: 0, points: 300 }, { teamIdx: 1, points: -300 }]);
assert.deepEqual(s.teams.map((t) => t.points), [400, -300, 0]);
assert.deepEqual(s.last, { cell: "0:2", round: "Movies", deltas: [{ teamIdx: 0, points: 300 }, { teamIdx: 1, points: -300 }] });
const undone = s.undoLast();
assert.equal(undone.cell, "0:2");
assert.deepEqual(s.teams.map((t) => t.points), [100, 0, 0]);
assert.equal(s.roundTeamTotal("Movies", 0), 100); // the column tally forgets it too
assert.equal(s.roundTeamTotal("Movies", 1), 0);
assert.equal(s.roundTotal("Movies"), 100);
// one level only
assert.equal(s.last, null);
assert.equal(s.undoLast(), null);
assert.deepEqual(s.teams.map((t) => t.points), [100, 0, 0]);

// a question nobody got (no marks, or a trivia pass) can be undone too
const p = createScoring(["A", "B"]);
p.bank("3:1", "Music", []);
assert.deepEqual(p.last, { cell: "3:1", round: "Music", deltas: [] });
assert.equal(p.undoLast().cell, "3:1");

// undo removes this question's entries even when another round was played in between rounds
const r = createScoring(["A", "B"]);
r.bank("0:0", "Movies", [{ teamIdx: 0, points: 100 }]);
r.bank("1:0", "Music", [{ teamIdx: 1, points: 100 }]);
r.bank("0:1", "Movies", [{ teamIdx: 1, points: 200 }]);
r.undoLast();
assert.equal(r.roundTeamTotal("Movies", 0), 100);
assert.equal(r.roundTeamTotal("Movies", 1), 0);
assert.equal(r.roundTeamTotal("Music", 1), 100);

// reset forgets it; a new game starts without one
const q = createScoring(["A", "B"]);
q.bank("0:0", "Movies", [{ teamIdx: 0, points: 100 }]);
q.reset();
assert.equal(q.last, null);
assert.equal(q.undoLast(), null);

// saved with the game, and restored: undo still works after a refresh
const g = createScoring(["A", "B"]);
g.bank("0:0", "Movies", [{ teamIdx: 0, points: 100 }]);
g.bank("2:4", "Words", [{ teamIdx: 1, points: -500 }]);
const save = makeSave({ bankKey: "abcd1234", bank: { title: "T" }, mode: "jeopardy", scoring: g, used: new Map([["0:0", true], ["2:4", true]]) });
assert.equal(save.v, 1); // the format version stays 1
const back = parseSave(JSON.stringify(save));
assert.ok(back);
const h = restoreScoring(back.scoring);
assert.deepEqual(h.last, { cell: "2:4", round: "Words", deltas: [{ teamIdx: 1, points: -500 }] });
assert.equal(h.undoLast().cell, "2:4");
assert.deepEqual(h.teams.map((t) => t.points), [100, 0]);
assert.equal(h.roundTeamTotal("Words", 1), 0);

// an old save (before undo existed) still loads, with nothing to undo
const old = JSON.parse(JSON.stringify(save));
delete old.scoring.last;
const oldBack = parseSave(JSON.stringify(old));
assert.ok(oldBack);
assert.equal(restoreScoring(oldBack.scoring).last, null);

// a malformed record is dropped; the save is kept
for (const bad of [
  { cell: "x", round: "Words", deltas: [] },
  { cell: "2:4", round: 7, deltas: [] },
  { cell: "2:4", round: "Words", deltas: [{ teamIdx: 9, points: 5 }] },
  { cell: "2:4", round: "Words", deltas: "no" },
  { cell: "1:1", round: "Words", deltas: [] }, // not a played cell
  "junk",
]) {
  const b = JSON.parse(JSON.stringify(save));
  b.scoring.last = bad;
  const kept = parseSave(JSON.stringify(b));
  assert.ok(kept, `save kept with last=${JSON.stringify(bad)}`);
  assert.equal(kept.scoring.last, undefined);
  assert.equal(restoreScoring(kept.scoring).last, null);
}
