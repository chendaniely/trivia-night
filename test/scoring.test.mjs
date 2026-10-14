import assert from "node:assert/strict";
import { createScoring, restoreScoring } from "../js/scoring.js";

// initial state: one entry per team, 0 points
const s = createScoring(["A", "B"]);
assert.deepEqual(s.teams, [
  { name: "A", points: 0 },
  { name: "B", points: 0 },
]);

// give adds points (Jeopardy correct / Trivia got-it)
s.give(0, 300, "Movies");
assert.equal(s.teams[0].points, 300);
assert.equal(s.teams[1].points, 0);

// negative give subtracts (Jeopardy wrong)
s.give(1, -200, "Movies");
assert.equal(s.teams[1].points, -200);

// roundTotal: signed sum of what was awarded in that round
assert.equal(s.roundTotal("Movies"), 100); // 300 + (-200)
assert.equal(s.roundTotal("Music"), 0);

// rounds are independent
s.give(1, 500, "Music");
assert.equal(s.roundTotal("Music"), 500);
assert.equal(s.roundTotal("Movies"), 100);
assert.equal(s.teams[1].points, 300); // -200 + 500

// reset zeroes points and per-round logs
s.reset();
assert.deepEqual(s.teams.map((t) => t.points), [0, 0]);
assert.equal(s.roundTotal("Movies"), 0);
assert.equal(s.roundTotal("Music"), 0);

// roundTeamTotal: per-team slice of a round (Task 6 column tally)
const t = createScoring(["A", "B"]);
t.give(0, 300, "Movies");
t.give(1, -200, "Movies");
t.give(0, 500, "Movies");
assert.equal(t.roundTeamTotal("Movies", 0), 800); // 300 + 500
assert.equal(t.roundTeamTotal("Movies", 1), -200);
assert.equal(t.roundTeamTotal("Music", 0), 0);
assert.equal(t.roundTotal("Movies"), 600); // signed sum across teams

// snapshot (Task 18 saved games): plain JSON-safe teams + per-round log
const g = createScoring(["A", "B", "C"]);
g.give(0, 300, "Movies");
g.give(1, -200, "Movies");
g.give(2, 100, "Music");
g.give(0, 500, "Music");
const snap = g.snapshot();
assert.deepEqual(snap, {
  teams: [
    { name: "A", points: 800 },
    { name: "B", points: -200 },
    { name: "C", points: 100 },
  ],
  log: [
    ["Movies", [{ teamIdx: 0, points: 300 }, { teamIdx: 1, points: -200 }]],
    ["Music", [{ teamIdx: 2, points: 100 }, { teamIdx: 0, points: 500 }]],
  ],
});

// the snapshot is a copy: later play does not change it
g.give(1, 400, "Music");
g.teams[0].name = "Renamed";
assert.equal(snap.teams[1].points, -200);
assert.equal(snap.teams[0].name, "A");
assert.equal(snap.log[1][1].length, 2);

// restore after a JSON round trip (localStorage stores strings)
const r = restoreScoring(JSON.parse(JSON.stringify(snap)));
assert.deepEqual(r.teams, snap.teams);
assert.equal(r.roundTotal("Movies"), 100);
assert.equal(r.roundTotal("Music"), 600);
assert.equal(r.roundTeamTotal("Music", 0), 500);
assert.equal(r.roundTeamTotal("Movies", 1), -200);
assert.deepEqual(r.snapshot(), snap, "snapshot -> restore -> snapshot is stable");

// give and reset still work on the restored object
r.give(2, 200, "Movies");
assert.equal(r.teams[2].points, 300);
assert.equal(r.roundTotal("Movies"), 300);
assert.equal(r.roundTeamTotal("Movies", 2), 200);
r.reset();
assert.deepEqual(r.teams.map((t) => t.points), [0, 0, 0]);
assert.equal(r.roundTotal("Music"), 0);

// restoring does not alias the snapshot it was built from
const src = JSON.parse(JSON.stringify(snap));
const r2 = restoreScoring(src);
r2.give(0, 100, "Movies");
assert.equal(src.teams[0].points, 800);
assert.equal(src.log[0][1].length, 2);

console.log("scoring: all assertions passed");
