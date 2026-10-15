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
import { deltasFor, signedPoints, formatScore } from "./scoring.js";

// Folder-mode media are already blob: URLs; a shipped-bank path is
// percent-encoded per segment so "#", "?" and spaces in filenames load.
function mediaSrc(p) {
  return /^(blob:|data:|https?:)/i.test(p)
    ? p
    : p.split("/").map(encodeURIComponent).join("/");
}

// The clip (Task 25, U8): a big Play clip / Pause / Replay button the host
// can hit from across the room or with a remote's OK, beside the native
// player (kept for its progress bar, out of the Tab order). The button is
// built once with the clip and re-appended on re-renders, so its label
// follows the clip; its width never changes (CSS ::after holds the
// widest label), so nothing slides under the pointer.
function audioBlock(question) {
  if (!question.audio) return null;
  const wrap = document.createElement("div");
  wrap.className = "audio-block";
  const a = document.createElement("audio");
  a.controls = true;
  a.preload = "auto";
  a.tabIndex = -1;
  a.src = mediaSrc(question.audio); // relative path: works from /<repo>/ subpath
  const btn = document.createElement("button");
  btn.className = "btn-secondary clip-btn";
  btn.dataset.focus = "clip";
  // "Loading…" until the clip really plays (a slow clip that said Pause
  // while silent invited a second press that paused it).
  const label = () => {
    btn.textContent = a.paused
      ? a.ended ? "\u21BA Replay" : "\u25B6 Play clip"
      : a.readyState >= 3 ? "\u275A\u275A Pause" : "Loading\u2026";
  };
  label();
  btn.addEventListener("click", (e) => {
    if (e.detail >= 2) return; // a double-click is one press, not play-then-pause
    if (a.paused) a.play().catch(() => {}); // an ended clip plays from the start
    else a.pause();
  });
  for (const ev of ["play", "playing", "waiting", "pause", "ended"]) a.addEventListener(ev, label);
  a.addEventListener("error", () => {
    const hadFocus = document.activeElement === btn;
    const note = document.createElement("p");
    note.className = "no-clip";
    note.tabIndex = -1;
    note.textContent = "no clip — play it from any device";
    wrap.replaceChildren(note);
    // Focus on the note, not a team: an OK pressed for the clip marks no one.
    if (hadFocus) note.focus();
  });
  wrap.append(btn, a);
  return wrap;
}

function imageBlock(images) {
  if (!images || !images.length) return null;
  const wrap = document.createElement("div");
  wrap.className = "images-block";
  // The pictures fill the block from an absolutely placed row: they never
  // add to the row's height, so long text and a big image can't overflow.
  const fill = document.createElement("div");
  fill.className = "images-fill";
  wrap.append(fill);
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
    fill.append(img);
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

let justRevealed = false; // animate the answer on this render only
let current = null; // { ri, qi } — active jeopardy question
let marks = new Map(); // teamIdx -> "green" | "red" (jeopardy marks)
let revealed = false;
let col = null; // { ri, qi } — active trivia column
let colMarks = new Map(); // teamIdx -> "green" (trivia marks)
let lastColumn = null; // the column whose tally was just shown (Task 21)
let colRevealed = false; // per-question (Task 13: host may need the answer)
let colGains = []; // [{ teamIdx, points }] banked in this run through the column (badges)

// Team buttons shared by both renderers: colored by mark state, ✓ / ✕ suffix.
function teamButtons(markMap, onMark) {
  const btns = document.createElement("div");
  btns.className = "team-btns";
  btns.append(
    ...state.teamNames.map((name, idx) => {
      const b = document.createElement("button");
      b.dataset.focus = `team-${idx}`;
      const m = markMap.get(idx);
      // The ✓ / ✕ has a slot of its own, there when empty too: marking
      // never widens a button, so the row never re-wraps under the pointer.
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.textContent = m === "green" ? "✓" : m === "red" ? "✕" : "";
      b.append(name, mark);
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

// The header line: the stakes, and the clip's controls at its right end —
// a row of its own cost long questions their room (Task 25 council).
function questionTop(head, clip) {
  const top = document.createElement("div");
  top.className = "q-top";
  top.append(head, ...(clip ? [clip] : []));
  return top;
}

// The question screen's parts (Task 25 layout). The header says what is at
// stake (U4): the round, then the points, on one line — a long round name
// is cut short, never the points.
function questionHead(roundName, pts, progress) {
  const h = document.createElement("h2");
  h.className = "q-head";
  const r = document.createElement("span");
  r.className = "q-round";
  r.textContent = roundName;
  const m = document.createElement("span");
  m.className = "q-meta";
  const p = document.createElement("strong");
  p.className = "q-pts";
  p.textContent = pts;
  m.append(`\u00a0·\u00a0${progress ? `${progress}\u00a0·\u00a0` : ""}`, p);
  h.append(r, m);
  return h;
}

// Question and answer together. The answer is always there, hidden until
// Reveal, so revealing moves nothing (U2); it animates only on the reveal
// itself, not on every re-render after it.
function questionAndAnswer(question, shown, animate) {
  const qa = document.createElement("div");
  qa.className = "qa";
  const qText = document.createElement("p");
  qText.className = "question-text";
  qText.textContent = question.q.trim(); // block scalars fold to one paragraph
  const ans = document.createElement("p");
  ans.className = "answer-text";
  if (!shown) {
    ans.classList.add("pending");
    ans.style.visibility = "hidden"; // also inline: a stale cached styles.css can't show it
    ans.setAttribute("aria-hidden", "true");
  } else if (animate) {
    ans.classList.add("reveal-now");
  }
  const label = document.createElement("span");
  label.className = "answer-label";
  label.textContent = "Answer:";
  ans.append(label, "\u00a0" + question.a.trim());
  qa.append(qText, ans);
  return qa;
}

// Reveal answer, then a disabled "Answer shown" of the same size in the
// same place (its width covers both labels — CSS ::after), never Done
// sliding in under the pointer (U2). It has no focus key once revealed,
// so focus goes to the first team, never to Done / Next.
function revealButton(shown, onReveal) {
  const b = document.createElement("button");
  b.className = "btn-secondary ctl-reveal";
  if (shown) {
    b.textContent = "Answer shown";
    b.disabled = true;
  } else {
    b.textContent = "Reveal answer";
    b.dataset.focus = "reveal";
    b.addEventListener("click", onReveal);
  }
  return b;
}

// The bank preview (Task 25, U3): what Done / Next will bank, on one line
// of fixed height under the team buttons — it updates as marks change, and
// a line that grew would move the controls under the pointer.
function bankPreview(verb, markMap, points) {
  const deltas = deltasFor(markMap, points);
  const p = document.createElement("p");
  p.className = "bank-preview";
  // Grouped by sign: "Done: +300 A, B · −300 C". Too long for the line
  // (six long names), it falls back to counts (fitPreview, after render).
  const groups = [points, -points]
    .map((v) => ({ v, names: deltas.filter((d) => d.points === v).map((d) => state.teamNames[d.teamIdx]) }))
    .filter((g) => g.names.length);
  p.textContent = groups.length
    ? `${verb}: ` + groups.map((g) => `${signedPoints(g.v)} ${g.names.join(", ")}`).join(" · ")
    : `${verb}: no one scores`;
  p.dataset.compact = groups.length
    ? `${verb}: ` + groups.map((g) => `${signedPoints(g.v)} for ${g.names.length} team${g.names.length === 1 ? "" : "s"}`).join(" · ")
    : p.textContent;
  p.dataset.full = p.textContent;
  return p;
}

function fitPreview(root) {
  const p = root.querySelector(".bank-preview");
  if (!p) return;
  p.textContent = p.dataset.full;
  if (p.scrollWidth > p.clientWidth) p.textContent = p.dataset.compact;
}
// Measured again when the window changes size or the font arrives.
const refitPreview = () => fitPreview(document.getElementById("screen-question"));
window.addEventListener("resize", refitPreview);
document.fonts?.ready.then(refitPreview);

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
  renderQuestion(firstFocus(state.bank.rounds[ri].questions[qi]));
}

// A clip question starts on its Play clip button (OK plays it); any other
// on the first team. Never on Done / Next.
function firstFocus(question) {
  return question.audio ? "clip" : "team-0";
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
  justRevealed = true;
  lockInput(); // Reveal became "Answer shown": no double-click past it
  renderQuestion();
}

function done() {
  if (!current) return;
  endMedia();
  const { ri, qi } = current;
  const round = state.bank.rounds[ri];
  // One banked result, so Undo last question can take it back (Task 25).
  const deltas = deltasFor(marks, pointsFor(round, qi));
  state.scoring.bank(`${ri}:${qi}`, round.name, deltas);
  state.used.set(`${ri}:${qi}`, true);
  saveGame();
  current = null;
  marks = new Map();
  revealed = false;
  renderBoard({ badges: deltas });
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
  const pts = pointsFor(round, qi);
  const { ab, ib } = mediaFor("j", ri, qi, question);
  if (ib) wrap.classList.add("has-images"); // image beside the text (Task 20)
  wrap.append(
    questionTop(questionHead(round.name, pts), ab),
    questionAndAnswer(question, revealed, justRevealed),
    ...(ib ? [ib] : []),
    teamButtons(marks, (idx) => cycleMark(idx)),
    bankPreview("Done", marks, pts)
  );
  justRevealed = false;

  // Reveal · Done · Back to board, in that order on screen and for Tab.
  const controls = document.createElement("div");
  controls.className = "controls";
  const dn = document.createElement("button");
  dn.className = "btn-primary";
  dn.textContent = "Done";
  dn.addEventListener("click", done);
  const bk = document.createElement("button");
  bk.className = "btn-quiet";
  bk.textContent = "Back to board";
  bk.addEventListener("click", back);
  controls.append(revealButton(revealed, reveal), dn, bk);
  wrap.append(controls);
  root.replaceChildren(wrap);
  fitPreview(root);
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
  colGains = [];
  showScreen("question");
  renderColumn(firstFocus(round.questions[qi]));
}

function revealCol() {
  if (!col || colRevealed) return;
  colRevealed = true;
  justRevealed = true;
  lockInput(); // Reveal became "Answer shown": no double-click past it
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
  const deltas = deltasFor(colMarks, pointsFor(round, qi));
  state.scoring.bank(`${ri}:${qi}`, round.name, deltas);
  colGains.push(...deltas);
  state.used.set(`${ri}:${qi}`, true);
  saveGame(); // mid-column refresh keeps the awarded questions (Task 18)
  colMarks = new Map();
  colRevealed = false; // fresh question: answer hidden again
  const next = firstUnused(round, ri, qi + 1);
  if (next !== -1) {
    col = { ri, qi: next };
    lockInput(); // same screen, new question: a double-click must not pass it
    renderColumn(firstFocus(round.questions[next]));
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
  const pts = pointsFor(round, qi);
  const { ab, ib } = mediaFor("c", ri, qi, question);
  if (ib) wrap.classList.add("has-images"); // image beside the text (Task 20)
  wrap.append(
    questionTop(questionHead(round.name, pts, `question ${qi + 1} of ${round.questions.length}`), ab),
    questionAndAnswer(question, colRevealed, justRevealed),
    ...(ib ? [ib] : []),
    teamButtons(colMarks, (idx) => cycleColMark(idx)),
    bankPreview("Next", colMarks, pts)
  );
  justRevealed = false;

  // Reveal · Next · Back to board, in that order on screen and for Tab.
  const controls = document.createElement("div");
  controls.className = "controls";
  const nx = document.createElement("button");
  nx.className = "btn-primary";
  nx.textContent = "Next";
  nx.addEventListener("click", nextQuestion);
  const bk = document.createElement("button");
  bk.className = "btn-quiet";
  bk.textContent = "Back to board";
  bk.addEventListener("click", backToBoard);
  controls.append(revealButton(colRevealed, revealCol), nx, bk);
  wrap.append(controls);
  root.replaceChildren(wrap);
  fitPreview(root);
  restoreFocus(root, key);
}

// The end of a trivia column (Task 25, U15): a title card — the round,
// then each team's points from it and their new total, sized for the TV.
function renderTally(roundName) {
  const el = document.getElementById("screen-tally");
  const wrap = document.createElement("div");
  wrap.className = "tally-wrap";
  const h = document.createElement("h2");
  h.className = "tally-title";
  h.textContent = `${roundName} — round over`;
  const rows = document.createElement("div");
  rows.className = "tally-cards";
  rows.append(
    ...state.scoring.teams.map((t, idx) => {
      const d = document.createElement("div");
      d.className = "tally-card";
      const name = document.createElement("span");
      name.className = "tally-name";
      name.textContent = t.name;
      const got = state.scoring.roundTeamTotal(roundName, idx);
      const round = document.createElement("span");
      round.className = "tally-round" + (got > 0 ? " up" : "");
      round.textContent = `${signedPoints(got)} this round`;
      const total = document.createElement("span");
      total.className = "tally-total";
      total.textContent = `total ${formatScore(t.points)}`;
      d.append(name, round, total);
      return d;
    })
  );
  const back = document.createElement("button");
  back.className = "btn-primary";
  back.textContent = "Back to board";
  back.addEventListener("click", () => {
    // What this run through the column added, as badges (Task 25, U5) —
    // not the round's whole total, which can hold Jeopardy play from
    // before a mode switch.
    renderBoard({ badges: colGains });
    showScreen("board");
    focusBoard({ ri: lastColumn ?? 0 });
  });
  wrap.append(h, rows, back);
  el.replaceChildren(wrap);
}
