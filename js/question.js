// Question flow (MVP feedback 2026-10-11): multiple teams can win one
// question in both modes.
// Jeopardy: tap cell -> question + team toggles (click cycles green = +pts
// -> red = -pts -> clear) + "Reveal answer" (manual: host doesn't know all
// answers; marks may be set before or after) + "Done" (applies all marks,
// consumes the cell, back to board; zero marks = nobody got it).
// Trivia column: team toggles (green = +pts, click again clears) +
// "Reveal answer" (manual, per-question — Task 13) + "Next" (applies
// greens, advances; no taps = pass); last question -> tally.
// Audio: questions with q.audio get a player in EVERY renderer (both modes);
// a missing clip swaps the player for a "no clip" note (Review Focus 3).
import { state, showScreen, lockInput, saveGame } from "./app.js";
import { renderBoard, focusBoard, pointsFor } from "./board.js";
import { deltasFor, signedPoints } from "./scoring.js";

// Folder-mode media are already blob: URLs; a shipped-bank path is
// percent-encoded per segment so "#", "?" and spaces in filenames load.
function mediaSrc(p) {
  return /^(blob:|data:|https?:)/i.test(p)
    ? p
    : p.split("/").map(encodeURIComponent).join("/");
}

function audioBlock(question) {
  if (!question.audio) return null;
  const wrap = document.createElement("div");
  wrap.className = "audio-block";
  const a = document.createElement("audio");
  a.controls = true;
  a.preload = "auto";
  a.src = mediaSrc(question.audio); // relative path: works from /<repo>/ subpath
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
    img.src = mediaSrc(src); // relative path: works from /<repo>/ subpath
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

// Media nodes are built once per opened question and re-appended on every
// re-render (marks, Reveal) so a playing clip is not torn down and rewound.
// Leaving the question pauses the clip and drops the cache, so the next
// question (or a re-opened cell) always builds fresh nodes.
let media = null; // { key, ab, ib }

function mediaFor(flow, ri, qi, question) {
  const key = `${flow}:${ri}:${qi}`;
  if (!media || media.key !== key) {
    media = { key, ab: audioBlock(question), ib: imageBlock(question.images) };
  }
  return media;
}

function endMedia() {
  media?.ab?.querySelector("audio")?.pause();
  media = null;
}

// Focus survives a re-render (Task 21): replaceChildren drops it to <body>,
// which strands a remote. Team buttons and Reveal carry a data-focus key;
// after the (synchronous) re-render focus returns to the same key. When
// the key is gone (Reveal just revealed) or is forced (a fresh question),
// it lands on the first team button — NEVER on Done/Next, so a second OK
// press can't bank or pass the question. Focus that was on the native
// <audio> control is simply lost (no key); that is accepted.
function focusKeyIn(root) {
  const a = document.activeElement;
  return root.contains(a) ? a.dataset.focus : undefined;
}

function restoreFocus(root, key) {
  if (!key) return;
  const el = root.querySelector(`[data-focus="${key}"]`) || root.querySelector('[data-focus="team-0"]');
  el?.focus();
}

let current = null; // { ri, qi } — active jeopardy question
let marks = new Map(); // teamIdx -> "green" | "red" (jeopardy marks)
let revealed = false;
let col = null; // { ri, qi } — active trivia column
let colMarks = new Map(); // teamIdx -> "green" (trivia marks)
let lastColumn = null; // the column whose tally was just shown (Task 21)
let colRevealed = false; // per-question (Task 13: host may need the answer)

// Team buttons shared by both renderers: colored by mark state, ✓ / ✕ suffix.
function teamButtons(markMap, onMark) {
  const btns = document.createElement("div");
  btns.className = "team-btns";
  btns.append(
    ...state.teamNames.map((name, idx) => {
      const b = document.createElement("button");
      b.dataset.focus = `team-${idx}`;
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

// The bank preview (Task 25, U3): what Done / Next will bank, on one line
// of fixed height under the team buttons — it updates as marks change, and
// a line that grew would move the controls under the pointer.
function bankPreview(verb, markMap, points) {
  const deltas = deltasFor(markMap, points);
  const p = document.createElement("p");
  p.className = "bank-preview";
  p.textContent = deltas.length
    ? `${verb}: ` + deltas.map((d) => `${state.teamNames[d.teamIdx]} ${signedPoints(d.points)}`).join(" · ")
    : `${verb}: no one scores`;
  return p;
}

export function resetFlow() {
  endMedia(); // also drops nodes pointing at a revoked blob: URL
  current = null;
  marks = new Map();
  revealed = false;
  col = null;
  colMarks = new Map();
  colRevealed = false;
}

// --- Jeopardy -------------------------------------------------------------

export function startQuestion(ri, qi) {
  endMedia();
  current = { ri, qi };
  marks = new Map();
  revealed = false;
  showScreen("question");
  renderQuestion("team-0");
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
  lockInput(); // Done slides into Reveal's slot: no double-click Done
  renderQuestion();
}

function done() {
  if (!current) return;
  endMedia();
  const { ri, qi } = current;
  const round = state.bank.rounds[ri];
  // One banked result, so Undo last question can take it back (Task 25).
  state.scoring.bank(`${ri}:${qi}`, round.name, deltasFor(marks, pointsFor(round, qi)));
  state.used.set(`${ri}:${qi}`, true);
  saveGame();
  current = null;
  marks = new Map();
  revealed = false;
  renderBoard();
  showScreen("board");
  focusBoard({ ri, qi });
}

function back() {
  if (!current) return; // guard stale taps (Task 7.8)
  endMedia();
  // Accidental-tap escape: discard marks, do NOT consume the cell.
  const { ri, qi } = current;
  current = null;
  marks = new Map();
  revealed = false;
  renderBoard();
  showScreen("board");
  focusBoard({ ri, qi }); // the cell is still playable: focus returns to it
}

function renderQuestion(focusKey) {
  const { ri, qi } = current;
  const round = state.bank.rounds[ri];
  const question = round.questions[qi];
  const root = document.getElementById("screen-question");
  const key = focusKey ?? focusKeyIn(root);

  const wrap = document.createElement("div");
  wrap.className = "question-wrap";
  const cat = document.createElement("h2");
  cat.textContent = round.name;
  const qText = document.createElement("p");
  qText.className = "question-text";
  qText.textContent = question.q.trim(); // block scalars fold to one paragraph
  const { ab, ib } = mediaFor("j", ri, qi, question);

  if (ib) wrap.classList.add("has-images"); // image beside the text (Task 20)
  wrap.append(cat, ...(ab ? [ab] : []), ...(ib ? [ib] : []), qText);
  if (revealed) {
    const ans = document.createElement("p");
    ans.className = "answer-text";
    ans.textContent = question.a.trim();
    wrap.append(ans);
  }
  wrap.append(teamButtons(marks, (idx) => cycleMark(idx)), bankPreview("Done", marks, pointsFor(round, qi)));

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
    rv.dataset.focus = "reveal";
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
  restoreFocus(root, key);
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
  endMedia();
  col = { ri, qi };
  colMarks = new Map();
  colRevealed = false;
  showScreen("question");
  renderColumn("team-0");
}

function revealCol() {
  if (!col || colRevealed) return;
  colRevealed = true;
  lockInput(); // Next slides into Reveal's slot: no double-click Next
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
  endMedia(); // advance or tally: the finished question's clip stops
  const { ri, qi } = col;
  const round = state.bank.rounds[ri];
  state.scoring.bank(`${ri}:${qi}`, round.name, deltasFor(colMarks, pointsFor(round, qi)));
  state.used.set(`${ri}:${qi}`, true);
  saveGame(); // mid-column refresh keeps the awarded questions (Task 18)
  colMarks = new Map();
  colRevealed = false; // fresh question: answer hidden again
  const next = firstUnused(round, ri, qi + 1);
  if (next !== -1) {
    col = { ri, qi: next };
    lockInput(); // same screen, new question: a double-click must not pass it
    renderColumn("team-0");
    return;
  }
  const roundName = round.name; // capture before clearing (tally needs it)
  col = null;
  lastColumn = ri;
  renderTally(roundName);
  showScreen("tally");
  document.querySelector("#screen-tally button")?.focus();
}

function backToBoard() {
  if (!col) return; // guard stale taps (Task 7.8)
  endMedia();
  // Accidental-tap escape: leave the column, no cell consumed.
  const { ri } = col;
  col = null;
  colMarks = new Map();
  colRevealed = false;
  renderBoard();
  showScreen("board");
  focusBoard({ ri });
}

// Browser Back on the question screen (Task 18): exactly that screen's own
// "Back to board" — marks discarded, no cell consumed.
export function leaveQuestion() {
  if (current) back();
  else if (col) backToBoard();
}

function renderColumn(focusKey) {
  const { ri, qi } = col;
  const round = state.bank.rounds[ri];
  const question = round.questions[qi];
  const root = document.getElementById("screen-question");
  const key = focusKey ?? focusKeyIn(root);

  const wrap = document.createElement("div");
  wrap.className = "question-wrap";
  const cat = document.createElement("h2");
  cat.textContent = `${round.name} — question ${qi + 1} of ${round.questions.length}`;
  const qText = document.createElement("p");
  qText.className = "question-text";
  qText.textContent = question.q.trim();
  const { ab, ib } = mediaFor("c", ri, qi, question);

  if (ib) wrap.classList.add("has-images"); // image beside the text (Task 20)
  wrap.append(cat, ...(ab ? [ab] : []), ...(ib ? [ib] : []), qText);
  if (colRevealed) {
    const ans = document.createElement("p");
    ans.className = "answer-text";
    ans.textContent = question.a.trim();
    wrap.append(ans);
  }
  wrap.append(teamButtons(colMarks, (idx) => cycleColMark(idx)), bankPreview("Next", colMarks, pointsFor(round, qi)));

  const controls = document.createElement("div");
  controls.className = "controls";
  const bk = document.createElement("button");
  bk.className = "btn-quiet";
  bk.textContent = "Back to board";
  bk.addEventListener("click", backToBoard);
  controls.append(bk);
  if (!colRevealed) {
    const rv = document.createElement("button");
    rv.className = "btn-secondary";
    rv.dataset.focus = "reveal";
    rv.textContent = "Reveal answer";
    rv.addEventListener("click", revealCol);
    controls.append(rv);
  }
  const nx = document.createElement("button");
  nx.className = "btn-primary";
  nx.textContent = "Next";
  nx.addEventListener("click", nextQuestion);
  controls.append(nx);
  wrap.append(controls);
  root.replaceChildren(wrap);
  restoreFocus(root, key);
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
    focusBoard({ ri: lastColumn ?? 0 });
  });
  wrap.append(h, rows, back);
  el.replaceChildren(wrap);
}
