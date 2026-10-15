// Scores as the room reads them (Task 25, U17): a true minus sign.
import assert from "node:assert/strict";
import { formatScore, signedPoints, createScoring } from "../js/scoring.js";
import { makeSave, saveSummary } from "../js/persist.js";

assert.equal(formatScore(500), "500");
assert.equal(formatScore(0), "0");
assert.equal(formatScore(-500), "−500"); // U+2212, not a hyphen
assert.equal(signedPoints(300), "+300");
assert.equal(signedPoints(-300), "−300");
assert.equal(signedPoints(0), "0");

// the setup's saved-game line uses it too
const s = createScoring(["A", "B"]);
s.give(1, -200, "Movies");
const save = makeSave({ bankKey: "abcd1234", bank: { title: "T" }, mode: "jeopardy", scoring: s, used: new Map() }, new Date("2026-11-08T20:00:00Z"));
assert.equal(saveSummary(save, new Date("2026-11-08T20:00:00Z")), "Saved game: A 0 · B −200 · saved just now");
