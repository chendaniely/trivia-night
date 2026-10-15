import { formatScore } from "./scoring.js";

// Saved games (Task 18): a refresh, a stray Back or a discarded tab must
// not wipe the night. Pure — no DOM; the caller passes the Storage object
// (or null). Every storage access is wrapped: private mode / blocked site
// data must never break play.
//
// One slot per board (fix round 1): key "trivia-night:game:<bankKey>", so
// a game on one board never overwrites another board's save. The 10 most
// recently saved slots are kept (pruned on write). The old single key
// "trivia-night:game" is ignored.
//
// Save shape: { v: 1, bankKey, title, mode, scoring: Scoring.snapshot(),
//               used: ["roundIdx:qIdx", ...], savedAt (ISO time) }
// scoring.last (Task 25, Undo) is optional and still v: 1: a save written
// before it loads with nothing to undo, and a malformed one is dropped
// without losing the game.
export const SAVE_PREFIX = "trivia-night:game:";
export const MAX_SLOTS = 10;
const PROBE_KEY = "trivia-night:probe";

export function slotKey(bankKey) {
  return SAVE_PREFIX + bankKey;
}

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

// game: { bankKey, bank, mode, scoring, used: Map } (the app's state)
export function makeSave(game, now = new Date()) {
  return {
    v: 1,
    bankKey: game.bankKey,
    title: game.bank.title,
    mode: game.mode,
    scoring: game.scoring.snapshot(),
    used: [...game.used.keys()],
    savedAt: now.toISOString(),
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
  if (s.title !== undefined && typeof s.title !== "string") return null;
  if (s.mode !== "jeopardy" && s.mode !== "trivia") return null;
  if (typeof s.savedAt !== "string" || !Number.isFinite(Date.parse(s.savedAt))) return null;
  const teams = s.scoring && s.scoring.teams;
  const log = s.scoring && s.scoring.log;
  if (!Array.isArray(teams) || teams.length < 2) return null;
  if (!teams.every((t) => t && typeof t.name === "string" && t.name !== "" && isNum(t.points))) return null;
  if (!Array.isArray(log)) return null;
  const goodEntry = (e) =>
    e && Number.isInteger(e.teamIdx) && e.teamIdx >= 0 && e.teamIdx < teams.length && isNum(e.points);
  if (!log.every((r) => Array.isArray(r) && typeof r[0] === "string" && Array.isArray(r[1]) && r[1].every(goodEntry))) return null;
  if (!Array.isArray(s.used) || !s.used.every((k) => typeof k === "string" && /^\d+:\d+$/.test(k))) return null;
  const last = s.scoring.last;
  if (
    last !== undefined &&
    !(
      last && typeof last === "object" &&
      typeof last.cell === "string" && s.used.includes(last.cell) &&
      typeof last.round === "string" &&
      Array.isArray(last.deltas) && last.deltas.every(goodEntry)
    )
  ) {
    delete s.scoring.last;
  }
  return s;
}

// Progress = at least one played cell or any team off zero.
export function hasProgress(save) {
  return save.used.length > 0 || save.scoring.teams.some((t) => t.points !== 0);
}

// "just now" / "12 min ago" / "3 h ago" / "2 days ago"
export function ageText(savedAt, now = new Date()) {
  const min = Math.floor((now.getTime() - Date.parse(savedAt)) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

function teamsLine(save) {
  return save.scoring.teams.map((t) => `${t.name} ${formatScore(t.points)}`).join(" · ");
}

export function saveSummary(save, now = new Date()) {
  return `Saved game: ${teamsLine(save)} · saved ${ageText(save.savedAt, now)}`;
}

// Setup hint when the newest saved game belongs to another board. The
// shipped board comes back with a reload; a folder board with Load folder.
export function otherBoardHint(save, now = new Date(), shipped = false) {
  const board = save.title === undefined ? "another board" : `"${save.title}"`;
  const how = shipped ? "reload the page to resume it." : "Load folder and pick that folder to resume it.";
  return `Saved game on ${board} (${teamsLine(save)}, saved ${ageText(save.savedAt, now)}) — ${how}`;
}

// All valid saved games, newest first ([] when storage is unusable).
export function listSaves(storage) {
  try {
    const out = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k === null || !k.startsWith(SAVE_PREFIX)) continue;
      const s = parseSave(storage.getItem(k));
      if (s && slotKey(s.bankKey) === k) out.push(s);
    }
    return out.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  } catch {
    return [];
  }
}

// Keep the MAX_SLOTS newest slots; drop older and unreadable ones.
function pruneSaves(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k !== null && k.startsWith(SAVE_PREFIX)) keys.push(k);
  }
  const keep = new Set(listSaves(storage).slice(0, MAX_SLOTS).map((s) => slotKey(s.bankKey)));
  for (const k of keys) if (!keep.has(k)) storage.removeItem(k);
}

// true when the save landed (a failed prune afterwards doesn't undo that)
export function writeSave(storage, save) {
  try {
    storage.setItem(slotKey(save.bankKey), JSON.stringify(save));
  } catch {
    return false;
  }
  try {
    pruneSaves(storage);
  } catch {
    // a slot too many is harmless
  }
  return true;
}

export function readSave(storage, bankKey) {
  try {
    return parseSave(storage.getItem(slotKey(bankKey)));
  } catch {
    return null;
  }
}

// The saved game worth offering for this bank: its slot, with progress.
export function resumableSave(storage, bankKey) {
  const s = readSave(storage, bankKey);
  return s && hasProgress(s) ? s : null;
}

// The newest saved game with progress on a board OTHER than bankKey (e.g. a
// folder board after a reload brought up the shipped one) — even when this
// board has an older save of its own; the caller compares savedAt.
export function latestOtherSave(storage, bankKey) {
  return listSaves(storage).find((s) => hasProgress(s) && s.bankKey !== bankKey) ?? null;
}

// Can this browser save at all? (a probe write, removed straight away)
export function canSave(storage) {
  try {
    storage.setItem(PROBE_KEY, "1");
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}
