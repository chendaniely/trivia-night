// Entry: state, screen switching, data loading, setup screen.
import { parseBank } from "./validate.js";
import { createScoring } from "./scoring.js";
import { renderBoard, setCellClick, setColumnClick } from "./board.js";
import { startQuestion, startColumn, resetFlow } from "./question.js";
import { randomTeamName } from "./teams.js";
import {
  loadFromDirHandle,
  loadFromFileList,
  createNew,
  revokeAll,
} from "./folder.js";

export const state = {
  mode: "jeopardy", // "jeopardy" | "trivia"
  teamNames: [],
  bank: null,
  used: new Map(), // "roundIdx:qIdx" -> true
  scoring: null,
};

const SCREENS = ["setup", "board", "question", "tally", "error", "about"];

export function showScreen(id) {
  for (const s of SCREENS) {
    document.getElementById(`screen-${s}`).classList.toggle("hidden", s !== id);
  }
}

export function renderError(errors) {
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
  startNewBank(result.bank, []);
}

// One board per data source (Task 9): any bank load starts a fresh game.
let mediaUrls = []; // object URLs from the active folder bank
function startNewBank(bank, urls) {
  revokeAll(mediaUrls); // no blob leaks across sources
  mediaUrls = urls;
  state.bank = bank;
  // Bank swap (retry / folder mode): previous game state no longer applies
  // (used-cell keys and round logs refer to the old bank).
  state.scoring = null;
  state.used = new Map();
  state.teamNames = []; // no stale names for the next setup (council 7.9, Task 9)
  resetFlow(); // no stale question state across bank loads (Task 9 folder mode)
  renderSetup();
  showScreen("setup");
}

// Dynamic team rows (Task 7.9): min 2, no cap; row count IS the team count.
function setupInputs() {
  return [...document.querySelectorAll("#team-inputs input")];
}

function allNamed() {
  return setupInputs().every((el) => el.value.trim() !== "");
}

function renderSetup(draftNames) {
  if (draftNames === undefined) {
    // App start (Task 7.10 step 4): pre-fill so the host can Start fast.
    const first = randomTeamName([]);
    draftNames = [first, randomTeamName([first])];
  }
  const wrap = document.getElementById("team-inputs");
  const addBtn = document.createElement("button");
  addBtn.id = "add-team-btn";
  addBtn.className = "btn-quiet";
  addBtn.textContent = "Add team";
  addBtn.addEventListener("click", () => {
    const vals = setupInputs().map((el) => el.value);
    // fun auto-name (Task 7.10); the host can still edit it
    renderSetup(vals.concat(randomTeamName(vals)));
  });
  wrap.replaceChildren(
    ...draftNames.map((val, i) => {
      const row = document.createElement("div");
      row.className = "team-row";
      const input = document.createElement("input");
      input.id = `team-${i + 1}`;
      input.placeholder = `Team ${i + 1}`;
      input.setAttribute("autocomplete", "off");
      input.value = val;
      const rm = document.createElement("button");
      rm.className = "btn-quiet team-remove";
      rm.textContent = "Remove";
      rm.disabled = draftNames.length <= 2; // 2 teams is the playable minimum
      rm.addEventListener("click", () => {
        const vals = setupInputs().map((el) => el.value);
        renderSetup(vals.filter((_, j) => j !== i));
      });
      row.append(input, rm);
      return row;
    }),
    addBtn
  );
  const startBtn = document.getElementById("start-btn");
  startBtn.disabled = !allNamed();
  startBtn.onclick = () => {
    const names = setupInputs().map((el) => el.value.trim());
    const sameGame =
      state.scoring !== null && names.length === state.teamNames.length;
    state.teamNames = names;
    state.mode = document.querySelector('input[name="mode"]:checked').value;
    if (sameGame) {
      // Back-to-setup (Task 7.5): rename in place, keep scores + used cells.
      names.forEach((n, i) => { state.scoring.teams[i].name = n; });
    } else {
      state.used = new Map();
      state.scoring = createScoring(names);
    }
    showScreen("board");
    renderBoard();
  };
}

// One-time wiring (renderSetup runs again on folder loads — Task 9).
document
  .getElementById("team-inputs")
  .addEventListener("input", () => {
    document.getElementById("start-btn").disabled = !allNamed();
  });

setCellClick((ri, qi) => {
  if (state.mode !== "jeopardy") return; // trivia cells are not targets (Task 6)
  startQuestion(ri, qi);
});
setColumnClick((ri) => {
  if (state.mode !== "trivia") return;
  startColumn(ri);
});

// About page (Task 11): static screen, no state — showScreen only.
document.getElementById("about-btn").addEventListener("click", () => showScreen("about"));
document.getElementById("about-back-btn").addEventListener("click", () => showScreen("setup"));

// Task 9 folder mode swaps this via setLoader so "Try again" reloads the active source.
let currentLoader = loadBank;
export function setLoader(fn) { currentLoader = fn; }
document.getElementById("retry-btn").addEventListener("click", () => currentLoader());

// Local folder mode (Task 9): Load folder (FSA primary, webkitdirectory
// fallback) + Create new (FSA only). Buttons live OUTSIDE #team-inputs
// (council Task 11: renderSetup's replaceChildren would wipe them).
const folderInput = document.getElementById("folder-input");
const folderMsg = document.getElementById("folder-msg");
const setFolderMsg = (text) => {
  folderMsg.textContent = text;
  folderMsg.classList.toggle("hidden", !text);
};

async function pickFolder() {
  let handle;
  try {
    handle = await window.showDirectoryPicker();
  } catch (err) {
    if (err && err.name === "AbortError") return; // host cancelled
    setFolderMsg("Could not open the folder: " + err.message);
    return;
  }
  const result = await loadFromDirHandle(handle);
  if (!result.ok) {
    renderError(result.errors);
    return;
  }
  startNewBank(result.bank, result.urls);
  setFolderMsg("");
}

document.getElementById("load-folder-btn").addEventListener("click", () => {
  if (window.showDirectoryPicker) {
    setLoader(pickFolder); // "Try again" re-picks the folder
    pickFolder();
  } else {
    setLoader(() => folderInput.click());
    folderInput.click();
  }
});
folderInput.addEventListener("change", async () => {
  if (!folderInput.files.length) return;
  const result = await loadFromFileList(folderInput.files);
  folderInput.value = ""; // allow re-picking the same folder
  if (!result.ok) {
    renderError(result.errors);
    return;
  }
  startNewBank(result.bank, result.urls);
  setFolderMsg("");
});

document.getElementById("create-new-btn").addEventListener("click", async () => {
  if (!window.showDirectoryPicker) {
    setFolderMsg(
      "Create new needs Chrome or Edge (File System Access API) — open the app there on your computer."
    );
    return;
  }
  const name = prompt("New game folder name", "my-trivia-night");
  if (!name) return;
  let parent;
  try {
    parent = await window.showDirectoryPicker();
  } catch (err) {
    if (err && err.name === "AbortError") return;
    setFolderMsg("Could not pick the parent folder: " + err.message);
    return;
  }
  try {
    await createNew(parent, name);
    setFolderMsg(`Created ${name}/ with a starter questions.yaml — load it with Load folder.`);
  } catch (err) {
    setFolderMsg("Could not create the folder: " + err.message);
  }
});

loadBank();
