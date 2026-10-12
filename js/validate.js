// Parse + validate the question bank YAML. No DOM, no IO.
// Parse errors carry a 1-based line (js-yaml marks are 0-based; for
// mid-file errors the mark sits on the offending line). Schema errors
// carry a `where` like rounds[1].questions[2]. Never half-succeeds:
// ok:false means the caller must show the errors and render no board.
import { load } from "./yaml.js";

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

  const errors = [];
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
    const where = `rounds[${ri}]`;
    if (typeof round !== "object" || round === null) {
      errors.push({ where, message: "round must be a mapping" });
      continue;
    }
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
      const qwhere = `rounds[${ri}].questions[${qi}]`;
      if (typeof q !== "object" || q === null) {
        errors.push({ where: qwhere, message: "question must be a mapping" });
        continue;
      }
      if (typeof q.q !== "string" || !q.q.trim()) {
        errors.push({ where: qwhere, message: "question.q must be a non-empty string" });
      }
      if (typeof q.a !== "string" || !q.a.trim()) {
        errors.push({ where: qwhere, message: "question.a must be a non-empty string" });
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
