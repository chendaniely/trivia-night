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

// A text field that isn't a string is usually YAML turning 1984 / true into a non-string.
function textFieldError(q, field) {
  const v = q[field];
  if (typeof v === "string") return v.trim() ? null : `question.${field} must be a non-empty string`;
  if (v === undefined || v === null) return `question.${field} must be a non-empty string`;
  return `question.${field} must be text — put quotes around it: ${field}: "${String(v)}"`;
}

export function parseBank(text) {
  let data;
  try {
    data = load(text);
  } catch (err) {
    const line = err.mark ? err.mark.line + 1 : undefined;
    return { ok: false, errors: [{ line, where: "yaml", message: err.reason || String(err) }] };
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, errors: [{ where: "root", message: "top level must be a mapping with title and rounds" }] };
  }

  const errors = unknownKeyErrors(data, TOP_KEYS, "root");
  if (typeof data.title !== "string" || !data.title.trim()) {
    errors.push({ where: "title", message: "title must be a non-empty string" });
  }
  if (!Array.isArray(data.rounds)) {
    errors.push({ where: "rounds", message: "rounds must be a list" });
    return { ok: false, errors };
  }
  if (data.rounds.length === 0) {
    errors.push({ where: "rounds", message: "rounds must contain at least one round" });
    return { ok: false, errors };
  }

  const seenNames = new Set(); // Task 6 tallies key by round name
  for (let ri = 0; ri < data.rounds.length; ri++) {
    const round = data.rounds[ri];
    const label = typeof round?.name === "string" && round.name.trim() ? ` "${round.name}"` : "";
    const where = `round ${ri + 1}${label}`;
    if (typeof round !== "object" || round === null || Array.isArray(round)) {
      errors.push({ where, message: "round must be a mapping" });
      continue;
    }
    errors.push(...unknownKeyErrors(round, ROUND_KEYS, where));
    if (typeof round.name !== "string" || !round.name.trim()) {
      errors.push({ where, message: "round.name must be a non-empty string" });
    } else if (seenNames.has(round.name)) {
      errors.push({ where, message: `duplicate round name "${round.name}"` });
    } else {
      seenNames.add(round.name);
    }
    if (!Array.isArray(round.questions)) {
      errors.push({ where, message: "round.questions must be a list" });
      continue;
    }
    if (round.questions.length === 0) {
      errors.push({ where, message: "round.questions must contain at least one question" });
    }
    for (let qi = 0; qi < round.questions.length; qi++) {
      const q = round.questions[qi];
      const qwhere = `${where}, question ${qi + 1}`;
      if (typeof q !== "object" || q === null || Array.isArray(q)) {
        errors.push({ where: qwhere, message: "question must be a mapping" });
        continue;
      }
      errors.push(...unknownKeyErrors(q, QUESTION_KEYS, qwhere));
      for (const field of ["q", "a"]) {
        const message = textFieldError(q, field);
        if (message) errors.push({ where: qwhere, message });
      }
      if (q.points !== undefined && (!Number.isInteger(q.points) || q.points <= 0)) {
        errors.push({ where: qwhere, message: "question.points must be a positive integer" });
      }
      if (q.audio !== undefined && (typeof q.audio !== "string" || !q.audio.trim())) {
        errors.push({ where: qwhere, message: "question.audio must be a non-empty string" });
      }
      if (q.images !== undefined) {
        const imgsOk =
          Array.isArray(q.images) &&
          q.images.length > 0 &&
          q.images.every((s) => typeof s === "string" && s.trim());
        if (!imgsOk) {
          errors.push({ where: qwhere, message: "question.images must be a list of non-empty strings" });
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
