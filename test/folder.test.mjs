import assert from "node:assert/strict";
import { parseBank } from "../js/validate.js";
import { normPath, NEW_TEMPLATE, NEW_FOLDER_README, createNew, loadFromFileList, revokeAll } from "../js/folder.js";

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

// createNew: in-memory fake of the FileSystemDirectoryHandle API
function notFound(n) {
  const e = new Error(`"${n}" not found`);
  e.name = "NotFoundError";
  return e;
}
function fakeDir() {
  const dirs = new Map();
  const files = new Map();
  return {
    dirs,
    files,
    async getDirectoryHandle(n, o = {}) {
      if (!dirs.has(n)) {
        if (!o.create) throw notFound(n);
        dirs.set(n, fakeDir());
      }
      return dirs.get(n);
    },
    async getFileHandle(n, o = {}) {
      if (!files.has(n)) {
        if (!o.create) throw notFound(n);
        files.set(n, "");
      }
      return {
        async createWritable() {
          let buf = "";
          return {
            async write(x) { buf += x; },
            async close() { files.set(n, buf); },
          };
        },
      };
    },
  };
}

const parent = fakeDir();
await createNew(parent, "night");
const night = parent.dirs.get("night");
assert.equal(night.files.get("questions.yaml"), NEW_TEMPLATE);
assert.equal(night.files.get("README.md"), NEW_FOLDER_README);
assert.ok(night.dirs.has("audio"));
assert.ok(night.dirs.has("images"));

// existing folder: refuse, name the folder, touch nothing
const host = fakeDir();
const mine = await host.getDirectoryHandle("night", { create: true });
const fh = await mine.getFileHandle("questions.yaml", { create: true });
const w = await fh.createWritable();
await w.write("title: HOST BANK\n");
await w.close();
await assert.rejects(createNew(host, "night"), (err) => {
  assert.equal(err.name, "ExistsError");
  assert.ok(err.message.includes('"night"'), err.message);
  return true;
});
assert.equal(mine.files.get("questions.yaml"), "title: HOST BANK\n");
assert.equal(mine.files.size, 1);

// a non-NotFound probe error is not "free to create"
const broken = {
  async getDirectoryHandle() {
    const e = new Error("denied");
    e.name = "NotAllowedError";
    throw e;
  },
};
await assert.rejects(createNew(broken, "night"), { name: "NotAllowedError" });

// normPath: one normalizer for both load paths
for (const [input, want] of [
  ["/a/b.png", "a/b.png"],
  ["./a/b.png", "a/b.png"],
  ["././a//b.png", "a/b.png"],
  [".\\a\\b.png", "a/b.png"],
  ["a/./b.png", "a/b.png"],
  ["  images/x.png ", "images/x.png"],
])
  assert.equal(normPath(input), want, `normPath(${JSON.stringify(input)})`);

// webkitdirectory path matches every spelling of the same file
for (const spelling of ["/images/x.png", "./images/x.png", "././images//x.png", ".\\images\\x.png", "images/./x.png"]) {
  const y = yaml.replace('"audio/x.wav"', '"audio/none.wav"').replace('"images/here.png"', JSON.stringify(spelling));
  const rr = await loadFromFileList([mk("q/questions.yaml", y), mk("q/images/x.png", "png")]);
  assert.ok(rr.ok, JSON.stringify(rr.errors));
  assert.ok(rr.bank.rounds[0].questions[0].images[0].startsWith("blob:"), `matched ${spelling}`);
  revokeAll(rr.urls);
}
