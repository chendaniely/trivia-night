import assert from "node:assert/strict";
import { parseBank } from "../js/validate.js";
import { NEW_TEMPLATE, loadFromFileList, revokeAll } from "../js/folder.js";

// create-new template parses on first load (optional keys are comments)
const t = parseBank(NEW_TEMPLATE);
assert.ok(t.ok, JSON.stringify(t.errors));
assert.equal(t.bank.rounds.length, 1);
assert.equal(t.bank.rounds[0].questions.length, 2);
assert.equal(t.bank.rounds[0].questions[0].audio, undefined);

// webkitdirectory load: media matched by relative path become blob:
// URLs; missing media keeps its path (404 -> note, no crash)
const yaml =
  "title: \"T\"\n" +
  "rounds:\n" +
  "  - name: \"R\"\n" +
  "    questions:\n" +
  "      - q: \"Q\"\n" +
  "        a: \"A\"\n" +
  "        audio: \"audio/x.wav\"\n" +
  "        images:\n" +
  "          - \"images/here.png\"\n" +
  "          - \"images/missing.png\"\n";
const mk = (rp, content) => Object.assign(new Blob([content]), { webkitRelativePath: rp });
// webkitRelativePath of a picked folder's root file is
// "pickedfolder/name" — two segments.
const r = await loadFromFileList([
  mk("q/questions.yaml", yaml),
  mk("q/audio/x.wav", "wav-bytes"),
  mk("q/images/here.png", "png-bytes"),
]);
assert.ok(r.ok, JSON.stringify(r.errors));
const q = r.bank.rounds[0].questions[0];
assert.ok(q.audio.startsWith("blob:"), `audio became a blob url: ${q.audio}`);
assert.ok(q.images[0].startsWith("blob:"), "found image became a blob url");
assert.equal(q.images[1], "images/missing.png", "missing image keeps its path");
revokeAll(r.urls);
assert.equal(r.urls.length, 2);

// no questions.yaml in the root -> the folder error, not a crash
const r2 = await loadFromFileList([mk("tv/other/readme.txt", "x")]);
assert.equal(r2.ok, false);
assert.equal(r2.errors[0].where, "folder");
