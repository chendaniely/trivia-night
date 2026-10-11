// Entry: state, screen switching, data loading, setup screen.
import { parseBank } from "./validate.js";
import { createScoring } from "./scoring.js";

export const state = {
  mode: "jeopardy", // "jeopardy" | "trivia"
  teamNames: [],
  bank: null,
  used: new Map(), // "roundIdx:qIdx" -> true
  scoring: null,
};

const SCREENS = ["setup", "board", "question", "tally", "error"];

export function showScreen(id) {
  for (const s of SCREENS) {
    document.getElementById(`screen-${s}`).classList.toggle("hidden", s !== id);
  }
}

function renderError(errors) {
  const list = document.getElementById("error-list");
  list.replaceChildren(
    ...errors.map((e) => {
      const li = document.createElement("li");
      li.textContent = e.line ? `line ${e.line}: ${e.message}` : `${e.where}: ${e.message}`;
      return li;
    })
  );
  showScreen("error");
}

async function loadBank() {
  let text;
  try {
    const res = await fetch("questions.yaml", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    renderError([{ where: "fetch", message: `questions.yaml could not be loaded (${err.message})` }]);
    return;
  }
  const result = parseBank(text);
  if (!result.ok) {
    renderError(result.errors);
    return;
  }
  state.bank = result.bank;
  renderSetup();
  showScreen("setup");
}

function renderSetup() {
  const wrap = document.getElementById("team-inputs");
  wrap.replaceChildren(
    ...[1, 2, 3, 4].map((i) => {
      const input = document.createElement("input");
      input.id = `team-${i}`;
      input.placeholder = `Team ${i}`;
      input.setAttribute("autocomplete", "off");
      return input;
    })
  );
  const startBtn = document.getElementById("start-btn");
  const teamNames = () =>
    [1, 2, 3, 4].map((i) => document.getElementById(`team-${i}`).value.trim()).filter(Boolean);
  wrap.addEventListener("input", () => {
    startBtn.disabled = teamNames().length < 2;
  });
  startBtn.disabled = teamNames().length < 2;
  startBtn.onclick = () => {
    state.teamNames = teamNames();
    state.mode = document.querySelector('input[name="mode"]:checked').value;
    state.used = new Map();
    state.scoring = createScoring(state.teamNames);
    showScreen("board");
    // Board rendering lands in Task 4.
  };
}

document.getElementById("retry-btn").addEventListener("click", loadBank);
loadBank();
