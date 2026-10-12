// Question flow (MVP feedback 2026-10-11): multiple teams can win one
// question in both modes.
// Jeopardy: tap cell -> question + team toggles (click cycles green = +pts
// -> red = -pts -> clear) + "Reveal answer" (manual: host doesn't know all
// answers; marks may be set before or after) + "Done" (applies all marks,
// consumes the cell, back to board; zero marks = nobody got it).
// Trivia column: team toggles (green = +pts, click again clears) + "Next"
// (applies greens, advances; no taps = pass); last question -> tally.
// Audio: questions with q.audio get a player in EVERY renderer (both modes);
// a missing clip swaps the player for a "no clip" note (Review Focus 3).
import { state, showScreen } from "./app.js";
import { renderBoard, pointsFor } from "./board.js";

function audioBlock(question) {
  if (!question.audio) return null;
  const wrap = document.createElement("div");
  wrap.className = "audio-block";
  const a = document.createElement("audio");
  a.controls = true;
  a.preload = "auto";
  a.src = question.audio; // relative path: works from /<repo>/ subpath
  a.addEventListener("error", () => {
    const note = document.createElement("p");
    note.className = "no-clip";
    note.textContent = "no clip — play it from any device";
    wrap.replaceChildren(note);
  });
  wrap.append(a);
  return wrap;
}

function imageBlock(images) {
  if (!images || !images.length) return null;
  const wrap = document.createElement("div");
  wrap.className = "images-block";
  for (const src of images) {
    const img = document.createElement("img");
    img.src = src; // relative path: works from /<repo>/ subpath
    img.loading = "lazy";
    img.alt = "";
    img.addEventListener("error", () => {
      const note = document.createElement("p");
      note.className = "no-image";
      note.textContent = "no image — show it from any device";
      img.replaceWith(note);
    });
    wrap.append(img);
  }
  return wrap;
}

let current = null; // { ri, qi } — active jeopardy question
let marks = new Map(); // teamIdx -> "green" | "red" (jeopardy marks)
let revealed = false;
let col = null; // { ri, qi } — active trivia column
let colMarks = new Map(); // teamIdx -> "green" (trivia marks)

// Team buttons shared by both renderers: colored by mark state, ✓ / ✕ suffix.
function teamButtons(markMap, onMark) {
  const btns = document.createElement("div");
  btns.className = "team-btns";
  btns.append(
    ...state.teamNames.map((name, idx) => {
      const b = document.createElement("button");
      const m = markMap.get(idx);
      b.textContent = m === "green" ? `${name} ✓` : m === "red" ? `${name} ✕` : name;
      if (m) {
        b.classList.add(m === "green" ? "marked-green" : "marked-red");
        b.setAttribute("aria-pressed", "true");
      }
      b.addEventListener("click", () => onMark(idx));
      return b;
    })
  );
  return btns;
}

export function resetFlow() {
  current = null;
  marks = new Map();
  revealed = false;
  col = null;
  colMarks = new Map();
}

// --- Jeopardy -------------------------------------------------------------

export function startQuestion(ri, qi) {
  current = { ri, qi };
  marks = new Map();
  revealed = false;
  showScreen("question");
  renderQuestion();
}

function cycleMark(idx) {
  if (!current) return; // guard stale taps (Review Focus 5)
  // green -> red -> clear
  const next = { undefined: "green", green: "red", red: undefined }[marks.get(idx)];
  if (next === undefined) marks.delete(idx);
  else marks.set(idx, next);
  renderQuestion();
}

function reveal() {
  if (!current || revealed) return;
  revealed = true;
  renderQuestion();
}

function done() {
  if (!current) return;
  const { ri, qi } = current;
  const round = state.bank.rounds[ri];
  const pts = pointsFor(round, qi);
  for (const [idx, m] of marks) {
    state.scoring.give(idx, m === "green" ? pts : -pts, round.name);
  }
  state.used.set(`${ri}:${qi}`, true);
  current = null;
  marks = new Map();
  revealed = false;
  renderBoard();
  showScreen("board");
}

function back() {
  if (!current) return; // guard stale taps (Task 7.8)
  // Accidental-tap escape: discard marks, do NOT consume the cell.
  current = null;
  marks = new Map();
  revealed = false;
  renderBoard();
  showScreen("board");
}

function renderQuestion() {
  const { ri, qi } = current;
  const round = state.bank.rounds[ri];
  const question = round.questions[qi];
  const root = document.getElementById("screen-question");

  const wrap = document.createElement("div");
  wrap.className = "question-wrap";
  const cat = document.createElement("h2");
  cat.textContent = round.name;
  const qText = document.createElement("p");
  qText.className = "question-text";
  qText.textContent = question.q.trim(); // block scalars fold to one paragraph
  const ab = audioBlock(question);
  const ib = imageBlock(question.images);

  wrap.append(cat, ...(ab ? [ab] : []), ...(ib ? [ib] : []), qText);
  if (revealed) {
    const ans = document.createElement("p");
    ans.className = "answer-text";
    ans.textContent = question.a.trim();
    wrap.append(ans);
  }
  wrap.append(teamButtons(marks, (idx) => cycleMark(idx)));

  const controls = document.createElement("div");
  controls.className = "controls";
  const bk = document.createElement("button");
  bk.className = "btn-quiet";
  bk.textContent = "Back to board";
  bk.addEventListener("click", back);
  controls.append(bk);
  if (!revealed) {
    const rv = document.createElement("button");
    rv.className = "btn-secondary";
    rv.textContent = "Reveal answer";
    rv.addEventListener("click", reveal);
    controls.append(rv);
  }
  const dn = document.createElement("button");
  dn.className = "btn-primary";
  dn.textContent = "Done";
  dn.addEventListener("click", done);
  controls.append(dn);
  wrap.append(controls);
  root.replaceChildren(wrap);
}

// --- Trivia column ----------------------------------------------------------

// Mid-game mode switch keeps used cells, so the column flow must skip
// questions already awarded (council 2026-10-11: no re-awarding).
function firstUnused(round, ri, from) {
  for (let qi = from; qi < round.questions.length; qi++) {
    if (!state.used.has(`${ri}:${qi}`)) return qi;
  }
  return -1;
}

export function startColumn(ri) {
  const round = state.bank.rounds[ri];
  const qi = firstUnused(round, ri, 0);
  if (qi === -1) return; // fully-used column (Review Focus 5: no re-awarding)
  col = { ri, qi };
  colMarks = new Map();
  showScreen("question");
  renderColumn();
}

function cycleColMark(idx) {
  if (!col) return; // guard stale taps (Review Focus 5)
  if (colMarks.get(idx) === "green") colMarks.delete(idx);
  else colMarks.set(idx, "green");
  renderColumn();
}

function nextQuestion() {
  if (!col) return;
  const { ri, qi } = col;
  const round = state.bank.rounds[ri];
  const pts = pointsFor(round, qi);
  for (const idx of colMarks.keys()) state.scoring.give(idx, pts, round.name);
  state.used.set(`${ri}:${qi}`, true);
  colMarks = new Map();
  const next = firstUnused(round, ri, qi + 1);
  if (next !== -1) {
    col = { ri, qi: next };
    renderColumn();
    return;
  }
  const roundName = round.name; // capture before clearing (tally needs it)
  col = null;
  renderTally(roundName);
  showScreen("tally");
}

function backToBoard() {
  if (!col) return; // guard stale taps (Task 7.8)
  // Accidental-tap escape: leave the column, no cell consumed.
  col = null;
  colMarks = new Map();
  renderBoard();
  showScreen("board");
}

function renderColumn() {
  const { ri, qi } = col;
  const round = state.bank.rounds[ri];
  const question = round.questions[qi];
  const root = document.getElementById("screen-question");

  const wrap = document.createElement("div");
  wrap.className = "question-wrap";
  const cat = document.createElement("h2");
  cat.textContent = `${round.name} — question ${qi + 1} of ${round.questions.length}`;
  const qText = document.createElement("p");
  qText.className = "question-text";
  qText.textContent = question.q.trim();
  const ab = audioBlock(question);
  const ib = imageBlock(question.images);

  wrap.append(cat, ...(ab ? [ab] : []), ...(ib ? [ib] : []), qText);
  wrap.append(teamButtons(colMarks, (idx) => cycleColMark(idx)));

  const controls = document.createElement("div");
  controls.className = "controls";
  const bk = document.createElement("button");
  bk.className = "btn-quiet";
  bk.textContent = "Back to board";
  bk.addEventListener("click", backToBoard);
  controls.append(bk);
  const nx = document.createElement("button");
  nx.className = "btn-primary";
  nx.textContent = "Next";
  nx.addEventListener("click", nextQuestion);
  controls.append(nx);
  wrap.append(controls);
  root.replaceChildren(wrap);
}

function renderTally(roundName) {
  const el = document.getElementById("screen-tally");
  const wrap = document.createElement("div");
  wrap.className = "question-wrap";
  const h = document.createElement("h2");
  h.textContent = `Column tally: ${roundName}`;
  const rows = document.createElement("div");
  rows.className = "team-btns";
  rows.append(
    ...state.scoring.teams.map((t, idx) => {
      const d = document.createElement("div");
      d.className = "tally-row";
      const pts = document.createElement("span");
      pts.className = "score-points";
      pts.textContent = state.scoring.roundTeamTotal(roundName, idx);
      d.append(document.createTextNode(t.name + " "), pts);
      return d;
    })
  );
  const back = document.createElement("button");
  back.textContent = "Back to board";
  back.addEventListener("click", () => {
    renderBoard();
    showScreen("board");
  });
  wrap.append(h, rows, back);
  el.replaceChildren(wrap);
}
