// Board grid + scoreboard + setup return + reset game. No state of its own:
// reads app.js state. Clicks route through the callbacks wired by app.js.
import { state, showScreen, saveGame } from "./app.js";

let onCellClick = () => {};
let onColumnClick = () => {};

export function setCellClick(fn) { onCellClick = fn; }
export function setColumnClick(fn) { onColumnClick = fn; }

export function pointsFor(round, qIdx) {
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
  if (mode === "trivia") grid.classList.add("trivia"); // dim inert cells (Task 7.8)
  grid.style.gridTemplateColumns = `repeat(${bank.rounds.length}, 1fr)`;

  bank.rounds.forEach((round, ri) => {
    const hasUnused = round.questions.some((_, qi) => !used.has(`${ri}:${qi}`));
    const live = mode === "trivia" && hasUnused;
    // Clickable headers are real buttons (focus + Enter/Space for a remote);
    // finished headers stay inert divs (Task 21).
    const h = document.createElement(live ? "button" : "div");
    if (live) h.type = "button";
    h.className = "board-header";
    h.textContent = round.name;
    if (live) {
      h.classList.add("clickable");
      h.dataset.ri = ri;
      h.addEventListener("click", () => onColumnClick(ri));
    } else if (mode === "trivia") {
      h.classList.add("dim"); // round finished: header is inert (Task 7.8)
    }
    grid.append(h);
  });

  for (let qi = 0; qi < rows; qi++) {
    bank.rounds.forEach((round, ri) => {
      const playable = qi < round.questions.length && !used.has(`${ri}:${qi}`) && mode !== "trivia";
      const cell = document.createElement(playable ? "button" : "div");
      if (playable) cell.type = "button";
      cell.className = "board-cell";
      cell.classList.add("tier-" + Math.min(qi, 4)); // difficulty ramp (Task 7.7)
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
        cell.dataset.ri = ri;
        cell.dataset.qi = qi;
        cell.addEventListener("click", () => onCellClick(ri, qi));
      }
      grid.append(cell);
    });
  }

  const actions = document.createElement("div");
  actions.className = "btn-row";
  const setupBtn = document.createElement("button");
  setupBtn.id = "setup-btn";
  setupBtn.className = "btn-secondary";
  setupBtn.textContent = "Setup";
  setupBtn.addEventListener("click", () => showScreen("setup"));
  // Destructive, so quiet, last in the row and behind a confirm (Task 18):
  // it clears every score AND every played cell.
  const resetBtn = document.createElement("button");
  resetBtn.id = "reset-btn";
  resetBtn.className = "btn-quiet";
  resetBtn.textContent = "Reset game";
  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset all scores and clear the board? This can't be undone.")) return;
    scoring.reset();
    used.clear();
    saveGame();
    renderBoard();
    focusBoard();
  });
  actions.append(setupBtn, resetBtn);

  let hint = null;
  if (mode === "trivia") {
    hint = document.createElement("p");
    hint.className = "board-hint";
    hint.textContent = "Trivia: click a category name to start that round — the amounts are not clickable.";
  }
  el.replaceChildren(score, ...(hint ? [hint] : []), grid, actions);
}

// Put focus on the board's next clickable header/cell (Task 21), so a
// remote's D-pad / Tab starts where the host left off. Call it AFTER
// showScreen("board") (a hidden element can't take focus). `from` is the
// column ({ ri }) or cell ({ ri, qi }) just left: the first clickable
// target at or after it in column-major order, wrapping to the first. The
// played cell is no longer clickable, so that is the next one down. With
// no `from`: the first target.
export function focusBoard(from) {
  const targets = [...document.querySelectorAll("#screen-board .clickable")];
  if (!targets.length) return;
  const key = (t) => Number(t.dataset.ri) * 1000 + (t.dataset.qi === undefined ? -1 : Number(t.dataset.qi));
  const at = from ? from.ri * 1000 + (from.qi === undefined ? -1 : from.qi) : -Infinity;
  const pick = targets.sort((a, b) => key(a) - key(b)).find((t) => key(t) >= at) || targets[0];
  pick.focus();
}
