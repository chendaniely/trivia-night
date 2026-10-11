// Board grid + scoreboard + reset. No state of its own: reads app.js state.
// Clicks route through the callbacks wired by app.js (Tasks 5-6).
import { state } from "./app.js";

let onCellClick = () => {};
let onColumnClick = () => {};

export function setCellClick(fn) { onCellClick = fn; }
export function setColumnClick(fn) { onColumnClick = fn; }

function pointsFor(round, qIdx) {
  const q = round.questions[qIdx];
  return q.points !== undefined ? q.points : (qIdx + 1) * 100;
}

export function renderBoard() {
  const el = document.getElementById("screen-board");
  const { bank, used, scoring, mode } = state;
  const rows = Math.max(...bank.rounds.map((r) => r.questions.length));

  const score = document.createElement("div");
  score.className = "scoreboard";
  score.append(
    ...scoring.teams.map((t) => {
      const d = document.createElement("div");
      d.className = "score-team";
      const pts = document.createElement("span");
      pts.className = "score-points";
      pts.textContent = t.points;
      d.append(document.createTextNode(t.name + " "), pts);
      return d;
    })
  );

  const grid = document.createElement("div");
  grid.className = "board-grid";
  grid.style.gridTemplateColumns = `repeat(${bank.rounds.length}, 1fr)`;

  bank.rounds.forEach((round, ri) => {
    const h = document.createElement("div");
    h.className = "board-header";
    h.textContent = round.name;
    if (mode === "trivia") {
      h.classList.add("clickable");
      h.addEventListener("click", () => onColumnClick(ri));
    }
    grid.append(h);
  });

  for (let qi = 0; qi < rows; qi++) {
    bank.rounds.forEach((round, ri) => {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      if (qi >= round.questions.length) {
        cell.classList.add("board-gap"); // no placeholder content (spec)
        grid.append(cell);
        return;
      }
      cell.textContent = pointsFor(round, qi);
      if (used.has(`${ri}:${qi}`)) {
        cell.classList.add("used");
      } else if (mode !== "trivia") {
        // trivia: the header is the click target, cells are not pointable
        cell.classList.add("clickable");
        cell.addEventListener("click", () => onCellClick(ri, qi));
      }
      grid.append(cell);
    });
  }

  const resetBtn = document.createElement("button");
  resetBtn.id = "reset-btn";
  resetBtn.textContent = "Reset scores";
  resetBtn.addEventListener("click", () => {
    scoring.reset();
    used.clear();
    renderBoard();
  });

  el.replaceChildren(score, grid, resetBtn);
}
