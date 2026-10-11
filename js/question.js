// Question flow. Jeopardy: show -> claim -> reveal -> correct/wrong -> board.
// Taps after reveal are ignored (phase guards). Trivia column flow: Task 6.
import { state, showScreen } from "./app.js";
import { renderBoard } from "./board.js";

let phase = "idle"; // "claim" | "reveal"
let current = null; // { ri, qi }
let claimedIdx = -1;

function points() {
  const question = state.bank.rounds[current.ri].questions[current.qi];
  return question.points !== undefined ? question.points : (current.qi + 1) * 100;
}

export function resetFlow() {
  phase = "idle";
  current = null;
  claimedIdx = -1;
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
