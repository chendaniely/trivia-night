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
assert.equal(r2.errors[0].where, 'round 1 "R", question 2');
assert.match(r2.errors[0].message, /^has no answer — add a line like {2}a: "the answer"$/); // host wording (Task 25, U16)

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
assert.equal(r3.errors[0].where, undefined); // the line number locates it (Task 25)
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
assert.equal(r4.errors[0].where, 'round 1 "R", question 1');
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
assert.equal(r6.errors[0].where, 'round 1 "R", question 1');
assert.match(r6.errors[0].message, /^has no question — add a line like {2}q: "the question"$/);

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
assert.match(r7.errors[0].where, /round 2 "R"/);
assert.match(r7.errors[0].message, /duplicate/);

// zero-question round -> error (Task 6 column would have no first question)
const emptyQ = `title: "T"
rounds:
  - name: "R"
    questions: []
`;
const r8 = parseBank(emptyQ);
assert.equal(r8.ok, false);
assert.match(r8.errors[0].where, /round 1 "R"/);

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
assert.equal(r10.errors[0].where, 'round 1 "R", question 1');
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
assert.equal(r11.errors[0].where, 'round 1 "R", question 1');
assert.match(r11.errors[0].message, /images/);

// --- Task 15: host-actionable messages ---
const wrap = (extra, roundExtra = "", top = "") => `title: "T"
${top}rounds:
  - name: "Movies"
${roundExtra}    questions:
      - q: "Q1"
        a: "A1"
      - q: "Q2"
        a: "A2"
${extra}`;
const bad = (text) => {
  const r = parseBank(text);
  assert.equal(r.ok, false);
  return r.errors;
};

// misspelled / wrong-case keys get a suggestion
let e = bad(wrap('        image: "images/x.png"\n'));
assert.equal(e[0].where, 'round 1 "Movies", question 2');
assert.match(e[0].message, /unknown key "image"/);
assert.match(e[0].message, /did you mean "images"/);
e = bad(wrap('        Audio: "a.wav"\n'));
assert.match(e[0].message, /unknown key "Audio"/);
assert.match(e[0].message, /did you mean "audio"/);
e = bad(wrap("        point: 300\n"));
assert.match(e[0].message, /did you mean "points"/);
e = bad(wrap('        foo: 1\n'));
assert.match(e[0].message, /unknown key "foo"/);
assert.doesNotMatch(e[0].message, /did you mean/);

// round and top level unknown keys
e = bad(wrap("", "    nmae: x\n"));
assert.equal(e[0].where, 'round 1 "Movies"');
assert.match(e[0].message, /unknown key "nmae"/);
assert.match(e[0].message, /did you mean "name"/);
e = bad(wrap("", "", "titel: x\n"));
assert.match(e[0].message, /unknown key "titel"/);
assert.match(e[0].message, /did you mean "title"/);

// non-string q / a: tell the host to quote
e = bad(wrap("      - q: \"Q3\"\n        a: 1984\n"));
assert.equal(e[0].where, 'round 1 "Movies", question 3');
assert.match(e[0].message, /^the answer must be text — put quotes around it: a: "1984"$/);
e = bad(wrap("      - q: \"Q3\"\n        a: true\n"));
assert.match(e[0].message, /a: "true"/);
e = bad(wrap("      - q: 42\n        a: \"x\"\n"));
assert.match(e[0].message, /^the question must be text — put quotes around it: q: "42"$/);

// round without a usable name
e = bad(`title: "T"
rounds:
  - questions: []
`);
assert.ok(e.some((x) => x.where === "round 1"));

// No schema words reach the host (Task 25, U16): every message from a
// broken file avoids "question.a", "round.name", "mapping", "non-empty".
const broken = `title: ""
rounds:
  - name: ""
    questions:
      - a: "x"
        points: -1
        audio: ""
        images: []
      - "just text"
  - name: "R"
    questions: []
  - "just text"
`;
for (const er of parseBank(broken).errors) {
  assert.doesNotMatch(er.message, /question\.|round\.|mapping|non-empty/, er.message);
}

// YAML that doesn't parse (Task 25 council): the host sees the line, and
// how to fix the likeliest mistake — a colon or # in unquoted text.
const T = (body) => `title: "T"\nrounds:\n  - name: "R"\n    questions:\n${body}`;
let pe = parseBank(T('      - q: "Q"\n        a: Star Wars: A New Hope\n')).errors[0];
assert.equal(pe.line, 6);
assert.equal(
  pe.message,
  `can't read this line: a: Star Wars: A New Hope — text with a colon (:) or a # needs quotes, like  a: "Star Wars: A New Hope"; check the quotes on the line above too`
);
pe = parseBank(T('      - q: "Q"\n        a: "x"\n        a: "y"\n')).errors[0];
assert.equal(pe.line, 7);
assert.equal(pe.message, '"a:" appears twice in the same question or round — keep one');
pe = parseBank("").errors[0];
assert.equal(pe.where, undefined);
assert.equal(pe.message, "the file is empty — it should start with  title:  and  rounds:");
pe = parseBank("   \n\n").errors[0];
assert.equal(pe.message, "the file is empty — it should start with  title:  and  rounds:");
// the top level is "the top of the file"; no message repeats its location
pe = parseBank('titel: "T"\nrounds:\n  - name: "R"\n    questions:\n      - q: "Q"\n        a: "x"\n').errors[0];
assert.equal(pe.where, "the top of the file");
for (const text of [broken, 'title: "T"\nrounds:\n', 'title: "T"\n', "rounds: 3\n"]) {
  for (const er of parseBank(text).errors) {
    if (er.where) assert.ok(!er.message.startsWith(er.where.split(" ")[0] + ":"), `"${er.where}: ${er.message}" repeats its location`);
  }
}
assert.equal(parseBank('title: "T"\nrounds:\n').errors[0].message, "must be a list of rounds, each starting with  - name:");

console.log("validate: all assertions passed");
