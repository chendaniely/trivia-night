// Parse + validate the question bank YAML. No DOM, no IO.
// Parse errors carry a 1-based line (js-yaml marks are 0-based; for
// mid-file errors the mark sits on the offending line). Schema errors
// carry a 1-based human `where` like: round 2 "Movies", question 3. Never half-succeeds:
// ok:false means the caller must show the errors and render no board.
import { load } from "./yaml.js";

const TOP_KEYS = ["title", "rounds"];
const ROUND_KEYS = ["name", "questions"];
const QUESTION_KEYS = ["q", "a", "points", "audio", "images"];

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// First match wins: case-insensitive equal, singular/plural pair, edit distance <= 2.
function suggest(key, allowed) {
  const k = key.toLowerCase();
  return (
    allowed.find((a) => a === k) ||
    allowed.find((a) => a + "s" === k || k + "s" === a) ||
    allowed.find((a) => editDistance(k, a) <= 2)
  );
}

function unknownKeyErrors(obj, allowed, where) {
  return Object.keys(obj)
    .filter((key) => !allowed.includes(key))
    .map((key) => {
      const hint = suggest(key, allowed);
      return {
        where,
        message: `unknown key "${key}"` + (hint ? ` — did you mean "${hint}"?` : ` (allowed: ${allowed.join(", ")})`),
      };
    });
}

// Messages are written for the host editing the file (Task 25, U16): what
// is wrong and the line that fixes it, never schema words.
const FIELD = { q: ["question", "the question"], a: ["answer", "the answer"] };

// A text field that isn't a string is usually YAML turning 1984 / true into a non-string.
function textFieldError(q, field) {
  const v = q[field];
  const [noun, example] = FIELD[field];
  const missing = `has no ${noun} — add a line like  ${field}: "${example}"`;
  if (typeof v === "string") return v.trim() ? null : missing;
  if (v === undefined || v === null) return missing;
  return `the ${noun} must be text — put quotes around it: ${field}: "${String(v)}"`;
}

// YAML that doesn't parse, in the host's words (Task 25 council): the line
// as written and the fix for the likeliest mistake — a colon or a # in
// unquoted text (`a: Star Wars: A New Hope`). js-yaml often reports the
// line after an unclosed quote, so the line above gets a mention too.
function parseErrorMessage(err, lines) {
  const at = err.mark ? lines[err.mark.line] : undefined;
  const shown = at !== undefined && at.trim() ? at.trim() : undefined;
  if (/duplicated mapping key/.test(err.reason || "") && shown) {
    return `"${shown.split(":")[0].replace(/^-\s*/, "")}:" appears twice in the same question or round — keep one`;
  }
  return (
    (shown ? `can't read this line: ${shown}` : "the file doesn't read as YAML") +
    ` — text with a colon (:) or a # needs quotes, like  a: "Star Wars: A New Hope"; check the quotes on the line above too`
  );
}

const EMPTY = "the file is empty — it should start with  title:  and  rounds:";

export function parseBank(text) {
  if (!text.trim()) return { ok: false, errors: [{ message: EMPTY }] };
  let data;
  try {
    data = load(text);
  } catch (err) {
    const line = err.mark ? err.mark.line + 1 : undefined;
    return { ok: false, errors: [{ line, message: parseErrorMessage(err, text.split(/\r?\n/)) }] };
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, errors: [{ message: "it should start with a  title:  line, then  rounds:" }] };
  }

  const errors = unknownKeyErrors(data, TOP_KEYS, "the top of the file");
  if (typeof data.title !== "string" || !data.title.trim()) {
    errors.push({ where: "title", message: 'the file needs a title, like  title: "Trivia Night"' });
  }
  if (!Array.isArray(data.rounds)) {
    errors.push({ where: "rounds", message: "must be a list of rounds, each starting with  - name:" });
    return { ok: false, errors };
  }
  if (data.rounds.length === 0) {
    errors.push({ where: "rounds", message: "there are no rounds yet — add one under  rounds:" });
    return { ok: false, errors };
  }

  const seenNames = new Set(); // Task 6 tallies key by round name
  for (let ri = 0; ri < data.rounds.length; ri++) {
    const round = data.rounds[ri];
    const label = typeof round?.name === "string" && round.name.trim() ? ` "${round.name}"` : "";
    const where = `round ${ri + 1}${label}`;
    if (typeof round !== "object" || round === null || Array.isArray(round)) {
      errors.push({ where, message: "each round needs a  name:  and its  questions:" });
      continue;
    }
    errors.push(...unknownKeyErrors(round, ROUND_KEYS, where));
    if (typeof round.name !== "string" || !round.name.trim()) {
      errors.push({ where, message: 'has no name — add a line like  name: "Movies"' });
    } else if (seenNames.has(round.name)) {
      errors.push({ where, message: `duplicate round name "${round.name}" — every round needs its own name` });
    } else {
      seenNames.add(round.name);
    }
    if (!Array.isArray(round.questions)) {
      errors.push({ where, message: "its questions: must be a list, each question starting with  - q:" });
      continue;
    }
    if (round.questions.length === 0) {
      errors.push({ where, message: "has no questions yet — add one under  questions:" });
    }
    for (let qi = 0; qi < round.questions.length; qi++) {
      const q = round.questions[qi];
      const qwhere = `${where}, question ${qi + 1}`;
      if (typeof q !== "object" || q === null || Array.isArray(q)) {
        errors.push({ where: qwhere, message: "each question needs its own  q:  and  a:  lines" });
        continue;
      }
      errors.push(...unknownKeyErrors(q, QUESTION_KEYS, qwhere));
      for (const field of ["q", "a"]) {
        const message = textFieldError(q, field);
        if (message) errors.push({ where: qwhere, message });
      }
      if (q.points !== undefined && (!Number.isInteger(q.points) || q.points <= 0)) {
        errors.push({ where: qwhere, message: "points: must be a whole number above 0, like  points: 300" });
      }
      if (q.audio !== undefined && (typeof q.audio !== "string" || !q.audio.trim())) {
        errors.push({ where: qwhere, message: 'audio: must be a file name, like  audio: "audio/clip.m4a"' });
      }
      if (q.images !== undefined) {
        const imgsOk =
          Array.isArray(q.images) &&
          q.images.length > 0 &&
          q.images.every((s) => typeof s === "string" && s.trim());
        if (!imgsOk) {
          errors.push({ where: qwhere, message: 'images: must be a list of file names, like  images: ["images/photo.jpg"]' });
        }
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    bank: {
      title: data.title,
      rounds: data.rounds.map((round) => ({ name: round.name, questions: round.questions })),
    },
  };
}
