import assert from "node:assert/strict";
import { createScoring } from "../js/scoring.js";

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

console.log("scoring: all assertions passed");
