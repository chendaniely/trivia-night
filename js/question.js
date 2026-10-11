// Question flow. Jeopardy: show -> claim -> reveal -> correct/wrong -> board.
// Taps after reveal are ignored (phase guards). Trivia column flow: Task 6.
import { state, showScreen } from "./app.js";
import { renderBoard } from "./board.js";

let phase = "idle"; // "claim" | "reveal" | "column"
let current = null; // { ri, qi }
let claimedIdx = -1;
let col = null; // { ri, qi } — active trivia column

function points() {
  const question = state.bank.rounds[current.ri].questions[current.qi];
  return question.points !== undefined ? question.points : (current.qi + 1) * 100;
}

export function resetFlow() {
  phase = "idle";
  current = null;
  claimedIdx = -1;
  col = null;
}

export function startQuestion(ri, qi) {
  current = { ri, qi };
  claimedIdx = -1;
  phase = "claim";
  showScreen("question");
  renderPhase();
}

function claim(idx) {
  if (phase !== "claim") return; // Review Focus 5: ignore stale taps
  claimedIdx = idx;
  phase = "reveal";
  renderPhase();
}

function resolve(correct) {
  if (phase !== "reveal") return;
  const round = state.bank.rounds[current.ri];
  const pts = points();
  state.scoring.give(claimedIdx, correct ? pts : -pts, round.name);
  state.used.set(`${current.ri}:${current.qi}`, true);
  phase = "idle";
  current = null;
  renderBoard();
  showScreen("board");
}

// Trivia column: one tap awards (or passes), auto-advances, ends on the tally.
export function startColumn(ri) {
  // ignore fully-used columns (Review Focus 5: no re-awarding)
  const round = state.bank.rounds[ri];
  if (round.questions.every((_, qi) => state.used.has(`${ri}:${qi}`))) return;
  col = { ri, qi: 0 };
  phase = "column";
  showScreen("question");
  renderColumnPhase();
}

function award(idx) { // idx === -1 -> pass (0 points)
  if (phase !== "column") return; // Review Focus 5: ignore stale taps
  const { ri, qi } = col;
  const round = state.bank.rounds[ri];
  const question = round.questions[qi];
  const pts = question.points !== undefined ? question.points : (qi + 1) * 100;
  if (idx >= 0) state.scoring.give(idx, pts, round.name);
  state.used.set(`${ri}:${qi}`, true);
  if (qi + 1 < round.questions.length) {
    col = { ri, qi: qi + 1 };
    renderColumnPhase();
    return;
  }
  const roundName = round.name; // capture before clearing (tally needs it)
  col = null;
  phase = "idle";
  renderTally(roundName);
  showScreen("tally");
}

function renderColumnPhase() {
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

  const btns = document.createElement("div");
  btns.className = "team-btns";
  btns.append(
    ...state.teamNames.map((name, idx) => {
      const b = document.createElement("button");
      b.textContent = name;
      b.addEventListener("click", () => award(idx));
      return b;
    })
  );
  const pass = document.createElement("button");
  pass.className = "btn-pass";
  pass.textContent = "Pass";
  pass.addEventListener("click", () => award(-1));
  btns.append(pass);

  wrap.append(cat, qText, btns);
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

function renderPhase() {
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

  const btns = document.createElement("div");
  btns.className = "team-btns";
  btns.append(
    ...state.teamNames.map((name, idx) => {
      const b = document.createElement("button");
      b.textContent = name;
      b.disabled = phase !== "claim";
      if (phase === "reveal" && idx === claimedIdx) b.classList.add("claimed");
      b.addEventListener("click", () => claim(idx));
      return b;
    })
  );
  wrap.append(cat, qText, btns);

  if (phase === "reveal") {
    const ans = document.createElement("p");
    ans.className = "answer-text";
    ans.textContent = question.a.trim();
    const controls = document.createElement("div");
    controls.className = "team-btns";
    const ok = document.createElement("button");
    ok.className = "btn-good";
    ok.textContent = "Correct";
    ok.addEventListener("click", () => resolve(true));
    const no = document.createElement("button");
    no.className = "btn-bad";
    no.textContent = "Wrong";
    no.addEventListener("click", () => resolve(false));
    controls.append(ok, no);
    wrap.append(ans, controls);
  }

  root.replaceChildren(wrap);
}
