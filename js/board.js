// Board grid + scoreboard + setup return + reset game. No state of its own:
// reads app.js state. Clicks route through the callbacks wired by app.js.
import { state, showScreen, saveGame } from "./app.js";
import { askConfirm } from "./confirm.js";
import { signedPoints } from "./scoring.js";

let onCellClick = () => {};
let onColumnClick = () => {};

export function setCellClick(fn) { onCellClick = fn; }
export function setColumnClick(fn) { onColumnClick = fn; }

export function pointsFor(round, qIdx) {
  const q = round.questions[qIdx];
  return q.points !== undefined ? q.points : (qIdx + 1) * 100;
}

// badges (Task 25, U5): [{ teamIdx, points }] just banked — shown as
// "+500" / "−500" on those teams' score pills until the board is drawn
// again. Drawn over the pill's corner, so they move nothing.
export function renderBoard({ badges = [] } = {}) {
  const el = document.getElementById("screen-board");
  const { bank, used, scoring, mode } = state;
  const rows = Math.max(...bank.rounds.map((r) => r.questions.length));
  // The game is over when no question is left (Task 25, U6): the board's
  // scoreboard becomes the final standings — ranked, the winner or a tie
  // named. Worked out on every render, so Undo, Resume and Reset just work.
  const finished = bank.rounds.every((r, ri) => r.questions.every((_, qi) => used.has(`${ri}:${qi}`)));
  const top = Math.max(...scoring.teams.map((t) => t.points));
  const order = scoring.teams.map((t, idx) => ({ t, idx }));
  if (finished) order.sort((a, b) => b.t.points - a.t.points); // stable: ties keep setup order

  const score = document.createElement("div");
  score.className = "scoreboard";
  if (finished) score.classList.add("final");
  score.append(
    ...order.map(({ t, idx }) => {
      const d = document.createElement("div");
      d.className = "score-team";
      if (finished && t.points === top) d.classList.add("leader");
      const pts = document.createElement("span");
      pts.className = "score-points";
      pts.textContent = t.points;
      d.append(document.createTextNode(t.name + " "), pts);
      const change = badges.filter((b) => b.teamIdx === idx).reduce((sum, b) => sum + b.points, 0);
      if (change !== 0) {
        const badge = document.createElement("span");
        badge.className = "score-badge " + (change > 0 ? "up" : "down");
        badge.textContent = signedPoints(change);
        d.append(badge);
      }
      return d;
    })
  );

  const grid = document.createElement("div");
  grid.className = "board-grid";
  if (mode === "trivia") grid.classList.add("trivia"); // dim inert cells (Task 7.8)
  if (finished) grid.classList.add("final"); // played-out cells give the final scores room
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
  setupBtn.addEventListener("click", () => {
    showScreen("setup");
    // Focus where a remote can act: Back to board (a game is running).
    document.getElementById("setup-back-btn").focus();
  });
  // Destructive, so quiet, last in the row and behind a confirm (Task 18):
  // it clears every score AND every played cell.
  const resetBtn = document.createElement("button");
  resetBtn.id = "reset-btn";
  resetBtn.className = "btn-quiet";
  resetBtn.textContent = "Reset game";
  resetBtn.addEventListener("click", () =>
    askConfirm({
      title: "Reset the game?",
      text: "This clears every score and every played cell. It can't be undone.",
      ok: "Reset game",
      onOk: () => {
        state.scoring.reset();
        state.used.clear();
        saveGame();
        renderBoard();
        focusBoard();
      },
    })
  );
  // Undo last question (Task 25, U1): one level, asks first. It stays in
  // its place, disabled, when there is nothing to undo — so Reset never
  // slides under the pointer.
  const undoBtn = document.createElement("button");
  undoBtn.id = "undo-btn";
  undoBtn.className = "btn-quiet";
  undoBtn.textContent = "Undo last question";
  undoBtn.disabled = !scoring.last;
  undoBtn.addEventListener("click", () => {
    const rec = state.scoring.last;
    if (!rec) return;
    const [ri, qi] = rec.cell.split(":").map(Number);
    const round = state.bank.rounds[ri];
    const what = rec.deltas.length
      ? "Undoes " + rec.deltas.map((d) => `${state.scoring.teams[d.teamIdx].name} ${signedPoints(d.points)}`).join(" · ") + "."
      : "Nobody scored on it.";
    askConfirm({
      title: `Undo ${round.name} · ${pointsFor(round, qi)}?`,
      text: `${what} The question opens again.`,
      ok: "Undo",
      onOk: () => {
        const back = state.scoring.undoLast();
        if (!back) return;
        state.used.delete(back.cell);
        saveGame();
        renderBoard();
        focusBoard(state.mode === "trivia" ? { ri } : { ri, qi });
      },
    });
  });
  actions.append(setupBtn, undoBtn, resetBtn);

  let title = null;
  if (finished) {
    const leaders = scoring.teams.filter((t) => t.points === top).map((t) => t.name);
    title = document.createElement("p");
    title.className = "final-title";
    const all = leaders.length === scoring.teams.length;
    title.textContent =
      leaders.length === 1
        ? `Final scores · ${leaders[0]} wins`
        : all && top === 0
        ? "Final scores · no one scored"
        : all && leaders.length > 2
        ? "Final scores · everyone ties"
        : `Final scores · a tie between ${leaders.slice(0, -1).join(", ")} and ${leaders[leaders.length - 1]}`;
  }

  let hint = null;
  if (mode === "trivia" && !finished) {
    hint = document.createElement("p");
    hint.className = "board-hint";
    hint.textContent = "Trivia: click a category name to start that round — the amounts are not clickable.";
  }
  el.replaceChildren(...(title ? [title] : []), score, ...(hint ? [hint] : []), grid, actions);
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
  if (!targets.length) {
    // Game over (Task 25, U18): focus on Setup — never lost, and never on
    // Undo or Reset.
    document.getElementById("setup-btn")?.focus();
    return;
  }
  const key = (t) => Number(t.dataset.ri) * 1000 + (t.dataset.qi === undefined ? -1 : Number(t.dataset.qi));
  const at = from ? from.ri * 1000 + (from.qi === undefined ? -1 : from.qi) : -Infinity;
  const pick = targets.sort((a, b) => key(a) - key(b)).find((t) => key(t) >= at) || targets[0];
  pick.focus();
}
