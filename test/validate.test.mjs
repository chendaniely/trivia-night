import assert from "node:assert/strict";
import { parseBank } from "../js/validate.js";

// valid bank: title + 2 rounds, block-scalar question, optional fields
const good = `title: "Trivia Night"
rounds:
  - name: "Demo"
    questions:
      - q: >
          A longer question written with a block
          scalar to check rendering.
        a: "Answer"
      - q: "Second"
        a: "Second answer"
        points: 250
        audio: "audio/demo/note.wav"
        images:
          - "images/demo/orange.png"
  - name: "Demo 2"
    questions:
      - q: "Q1"
        a: "A1"
`;
const r = parseBank(good);
assert.equal(r.ok, true);
assert.equal(r.bank.title, "Trivia Night");
assert.equal(r.bank.rounds.length, 2);
assert.equal(
  r.bank.rounds[0].questions[0].q,
  "A longer question written with a block scalar to check rendering.\n"
);
assert.equal(r.bank.rounds[0].questions[1].points, 250);
assert.equal(r.bank.rounds[0].questions[1].audio, "audio/demo/note.wav");
assert.deepEqual(r.bank.rounds[0].questions[1].images, ["images/demo/orange.png"]);

// question missing `a` -> error with where pointing at the question
const noA = `title: "T"
rounds:
  - name: "R"
    questions:
      - q: "ok"
        a: "ok"
      - q: "no answer here"
`;
const r2 = parseBank(noA);
assert.equal(r2.ok, false);
assert.equal(r2.errors[0].where, "rounds[0].questions[1]");
assert.match(r2.errors[0].message, /a\b/);

// mid-file YAML error: line 6 is `        a: bad: line`
// (EOF-truncated errors mark EOF, so the fixture stays mid-file)
const badYaml = `title: "T"
rounds:
  - name: "R"
    questions:
      - q: "ok"
        a: bad: line
      - q: "next"
        a: "next answer"
`;
const r3 = parseBank(badYaml);
assert.equal(r3.ok, false);
assert.equal(r3.errors[0].where, "yaml");
assert.equal(r3.errors[0].line, 6);
assert.ok(r3.errors[0].message.length > 0);

// points must be a positive integer when present
const badPts = `title: "T"
rounds:
  - name: "R"
    questions:
      - q: "Q"
        a: "A"
        points: -5
`;
const r4 = parseBank(badPts);
assert.equal(r4.ok, false);
assert.equal(r4.errors[0].where, "rounds[0].questions[0]");
assert.match(r4.errors[0].message, /points/);

// missing rounds
const noRounds = `title: "T"`;
const r5 = parseBank(noRounds);
assert.equal(r5.ok, false);
assert.match(r5.errors[0].where, /rounds/);

// question missing q
const noQ = `title: "T"
rounds:
  - name: "R"
    questions:
      - a: "only answer"
`;
const r6 = parseBank(noQ);
assert.equal(r6.ok, false);
assert.equal(r6.errors[0].where, "rounds[0].questions[0]");
assert.match(r6.errors[0].message, /q\b/);

// duplicate round names -> error (Task 6 tallies key by name)
const dupNames = `title: "T"
rounds:
  - name: "R"
    questions:
      - q: "Q"
        a: "A"
  - name: "R"
    questions:
      - q: "Q"
        a: "A"
`;
const r7 = parseBank(dupNames);
assert.equal(r7.ok, false);
assert.match(r7.errors[0].where, /rounds\[1\]/);
assert.match(r7.errors[0].message, /duplicate/);

// zero-question round -> error (Task 6 column would have no first question)
const emptyQ = `title: "T"
rounds:
  - name: "R"
    questions: []
`;
const r8 = parseBank(emptyQ);
assert.equal(r8.ok, false);
assert.match(r8.errors[0].where, /rounds\[0\]/);

// empty rounds list -> error
const emptyR = `title: "T"
rounds: []
`;
const r9 = parseBank(emptyR);
assert.equal(r9.ok, false);
assert.match(r9.errors[0].where, /rounds/);

// images must be a list of non-empty strings (Task 7.6): not a list
const imgsNotList = `title: "T"
rounds:
  - name: "R"
    questions:
      - q: "Q"
        a: "A"
        images: "images/demo/orange.png"
`;
const r10 = parseBank(imgsNotList);
assert.equal(r10.ok, false);
assert.equal(r10.errors[0].where, "rounds[0].questions[0]");
assert.match(r10.errors[0].message, /images/);

// images with a non-string item -> same where
const imgsBadItem = `title: "T"
rounds:
  - name: "R"
    questions:
      - q: "Q"
        a: "A"
        images:
          - "images/demo/orange.png"
          - 42
`;
const r11 = parseBank(imgsBadItem);
assert.equal(r11.ok, false);
assert.equal(r11.errors[0].where, "rounds[0].questions[0]");
assert.match(r11.errors[0].message, /images/);

console.log("validate: all assertions passed");
