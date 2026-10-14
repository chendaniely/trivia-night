// Saved games (Task 18): a refresh, a stray Back or a discarded tab must
// not wipe the night. Pure — no DOM; the caller passes the Storage object
// (or null). Every storage access is wrapped: private mode / blocked site
// data must never break play.
//
// Save shape: { v: 1, bankKey, mode, scoring: Scoring.snapshot(),
//               used: ["roundIdx:qIdx", ...], savedAt }
// One slot: starting a new game (any board) replaces the saved one.
export const SAVE_KEY = "trivia-night:game";

// Identity of a question bank: FNV-1a 32-bit (hex) over the UTF-8 bytes of
// the raw questions.yaml text. A changed file = a different board, so a
// save's used-cell keys can never point at the wrong questions.
export function bankKeyOf(text) {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// game: { bankKey, mode, scoring, used: Map } (the app's state)
export function makeSave(game) {
  return {
    v: 1,
    bankKey: game.bankKey,
    mode: game.mode,
    scoring: game.scoring.snapshot(),
    used: [...game.used.keys()],
    savedAt: new Date().toISOString(),
  };
}

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

// JSON text -> a well-formed save, or null (never throws).
export function parseSave(json) {
  let s;
  try {
    s = JSON.parse(json);
  } catch {
    return null;
  }
  if (!s || typeof s !== "object" || s.v !== 1) return null;
  if (typeof s.bankKey !== "string") return null;
  if (s.mode !== "jeopardy" && s.mode !== "trivia") return null;
  const teams = s.scoring && s.scoring.teams;
  const log = s.scoring && s.scoring.log;
  if (!Array.isArray(teams) || teams.length < 2) return null;
  if (!teams.every((t) => t && typeof t.name === "string" && t.name !== "" && isNum(t.points))) return null;
  if (!Array.isArray(log)) return null;
  const goodEntry = (e) =>
    e && Number.isInteger(e.teamIdx) && e.teamIdx >= 0 && e.teamIdx < teams.length && isNum(e.points);
  if (!log.every((r) => Array.isArray(r) && typeof r[0] === "string" && Array.isArray(r[1]) && r[1].every(goodEntry))) return null;
  if (!Array.isArray(s.used) || !s.used.every((k) => typeof k === "string" && /^\d+:\d+$/.test(k))) return null;
  return s;
}

// Progress = at least one played cell or any team off zero.
export function hasProgress(save) {
  return save.used.length > 0 || save.scoring.teams.some((t) => t.points !== 0);
}

export function saveSummary(save) {
  return "Saved game: " + save.scoring.teams.map((t) => `${t.name} ${t.points}`).join(" · ");
}

export function writeSave(storage, save) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function readSave(storage) {
  try {
    return parseSave(storage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

// The saved game worth offering for this bank: same bankKey AND progress.
export function resumableSave(storage, bankKey) {
  const s = readSave(storage);
  return s && s.bankKey === bankKey && hasProgress(s) ? s : null;
}
