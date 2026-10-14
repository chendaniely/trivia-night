// Local folder mode (Task 9): one folder = one board. Load the folder's
// questions.yaml plus its media as object URLs; scaffold a new game
// folder. FSA (showDirectoryPicker) primary, webkitdirectory fallback.
// Pure logic — the DOM lives in app.js.
import { parseBank } from "./validate.js";

// ONE normalizer for both load paths: trim, backslashes -> "/", drop empty
// and "." segments (so "/a/b", "./a/b", "././a//b", ".\\a\\b" and "a/./b"
// all become "a/b"). Case-sensitive on purpose (filesystems differ).
export function normPath(p) {
  return String(p)
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter((seg) => seg !== "" && seg !== ".")
    .join("/");
}

export function revokeAll(urls) {
  for (const u of urls) URL.revokeObjectURL(u);
}

// FSA: walk the directory handle by path parts; null when any part is
// missing (the path stays as-is -> 404 -> the existing "no clip"/
// "no image" note).
async function resolveFsa(handle, relPath) {
  const parts = normPath(relPath).split("/");
  if (parts[0] === "") return null;
  if (!parts.length) return null;
  let h = handle;
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      h = await h.getDirectoryHandle(parts[i]);
    } catch {
      return null;
    }
  }
  try {
    return await h.getFileHandle(parts[parts.length - 1]);
  } catch {
    return null;
  }
}

// Object URL from a file handle; null when the read fails (permission etc) —
// the path is then kept and surfaces as the usual note, never a stall.
async function fileUrl(fh) {
  try {
    return URL.createObjectURL(await fh.getFile());
  } catch {
    return null;
  }
}

// Swap found media for object URLs in place; return the URL list so the
// caller can revoke it on the next load.
async function swapMediaFromDirHandle(dir, bank, urls) {
  for (const round of bank.rounds)
    for (const q of round.questions) {
      if (q.audio) {
        const fh = await resolveFsa(dir, q.audio);
        const u = fh ? await fileUrl(fh) : null;
        if (u) {
          q.audio = u;
          urls.push(u);
        }
      }
      if (q.images) {
        const out = [];
        for (const p of q.images) {
          const fh = await resolveFsa(dir, p);
          const u = fh ? await fileUrl(fh) : null;
          if (u) {
            out.push(u);
            urls.push(u);
          } else {
            out.push(p); // not in folder: keep the path -> note, no crash
          }
        }
        q.images = out;
      }
    }
}

export async function loadFromDirHandle(handle) {
  let text;
  try {
    const fh = await handle.getFileHandle("questions.yaml");
    text = await (await fh.getFile()).text();
  } catch (err) {
    // NotFoundError = no yaml in the root; anything else (e.g. a denied
    // permission mid-read) is reported, not silently swallowed.
    const message =
      err && err.name === "NotFoundError"
        ? "no questions.yaml in the folder root"
        : `could not read questions.yaml (${err.message})`;
    return { ok: false, errors: [{ where: "folder", message }] };
  }
  const result = parseBank(text);
  if (!result.ok) return result;
  const urls = [];
  await swapMediaFromDirHandle(handle, result.bank, urls);
  return { ok: true, bank: result.bank, urls };
}

// webkitdirectory fallback: match media on webkitRelativePath. The
// folder root is the first path segment of the picked questions.yaml.
export async function loadFromFileList(files) {
  const arr = [...files];
  const yaml = arr.find((f) => {
    const parts = (f.webkitRelativePath || "").split("/");
    return parts.length === 2 && parts[1] === "questions.yaml";
  });
  if (!yaml) {
    return { ok: false, errors: [{ where: "folder", message: "no questions.yaml in the folder root" }] };
  }
  const result = parseBank(await yaml.text());
  if (!result.ok) return result;
  const root = yaml.webkitRelativePath.split("/")[0];
  const urls = [];
  const find = (rel) =>
    arr.find((f) => f.webkitRelativePath === `${root}/${normPath(rel)}`);
  for (const round of result.bank.rounds)
    for (const q of round.questions) {
      if (q.audio) {
        const f = find(q.audio);
        if (f) {
          q.audio = URL.createObjectURL(f);
          urls.push(q.audio);
        }
      }
      if (q.images) {
        q.images = q.images.map((p) => {
          const f = find(p);
          if (f) {
            const u = URL.createObjectURL(f);
            urls.push(u);
            return u;
          }
          return p; // not in folder: keep the path -> note, no crash
        });
      }
    }
  return { ok: true, bank: result.bank, urls };
}

// Create-new scaffold (FSA only): template keys that are optional
// (audio:/images:) appear as COMMENTED example lines, so the file
// parses on first load.
export const NEW_TEMPLATE = `title: "My Trivia Night"
rounds:
  - name: "Round One"
    questions:
      - q: "First question — the easy one (top row is easy, bottom is hard)."
        a: "First answer"
      - q: >
          A longer question, written with a block scalar.
        a: "Second answer"
      # Optional per question (uncomment and fill in):
      #   points: 300
      #   audio: "audio/clip.wav"
      #   images:
      #     - "images/photo.png"
`;

export const NEW_FOLDER_README = `# Trivia Night folder

One folder = one board. Load this folder in the app with "Load folder".

- questions.yaml — the board (title, rounds, questions; top row of a
  round is easy, bottom row is hard)
- audio/ — clips referenced with audio: (e.g. "audio/clip.wav")
- images/ — photos referenced with images: (e.g. "images/photo.png")

Long questions: use a block scalar (>), like the second question.
Missing files never break the game — they show a "no clip"/"no image"
note instead.
`;

export async function createNew(parentHandle, name) {
  // Never overwrite: only a NotFoundError means the name is free.
  let exists = true;
  try {
    await parentHandle.getDirectoryHandle(name);
  } catch (err) {
    if (!err || err.name !== "NotFoundError") throw err;
    exists = false;
  }
  if (exists) {
    const err = new Error(
      `a folder named "${name}" already exists there — pick another name`
    );
    err.name = "ExistsError";
    throw err;
  }
  const dir = await parentHandle.getDirectoryHandle(name, { create: true });
  const write = async (fileName, text) => {
    const fh = await dir.getFileHandle(fileName, { create: true });
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
  };
  await write("questions.yaml", NEW_TEMPLATE);
  await write("README.md", NEW_FOLDER_README);
  await dir.getDirectoryHandle("audio", { create: true });
  await dir.getDirectoryHandle("images", { create: true });
  return dir;
}
