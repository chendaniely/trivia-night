// Entry: state, screen switching, data loading, setup screen.
import { parseBank } from "./validate.js";
import { createScoring, restoreScoring } from "./scoring.js";
import { renderBoard, focusBoard, setCellClick, setColumnClick } from "./board.js";
import { startQuestion, startColumn, resetFlow, leaveQuestion } from "./question.js";
import { randomTeamName } from "./teams.js";
import {
  loadFromDirHandle,
  loadFromFileList,
  createNew,
  revokeAll,
} from "./folder.js";
import {
  bankKeyOf,
  makeSave,
  hasProgress,
  saveSummary,
  otherBoardHint,
  writeSave,
  resumableSave,
  latestOtherSave,
  canSave,
} from "./persist.js";

export const state = {
  mode: "jeopardy", // "jeopardy" | "trivia"
  teamNames: [],
  bank: null,
  bankKey: null, // hash of the bank's questions.yaml text (Task 18 saved game)
  used: new Map(), // "roundIdx:qIdx" -> true
  scoring: null,
};

const SCREENS = ["setup", "board", "question", "tally", "error", "about"];

export function showScreen(id) {
  for (const s of SCREENS) {
    document.getElementById(`screen-${s}`).classList.toggle("hidden", s !== id);
  }
  lockInput();
}

function visibleScreen() {
  return SCREENS.find((s) => !document.getElementById(`screen-${s}`).classList.contains("hidden"));
}

// Input lock (Task 18): for a moment after the screen changes under the
// pointer, clicks are ignored — a double-click can't land its second click
// on whatever slid into place (Reveal -> Done, Next -> the next question's
// Next, a board cell -> a team button). Team mark taps never lock.
const INPUT_LOCK_MS = 350;
let inputLockedUntil = 0;
export function lockInput() {
  inputLockedUntil = performance.now() + INPUT_LOCK_MS;
}
document.addEventListener(
  "click",
  (e) => {
    // Only real clicks: the programmatic click that opens the hidden
    // folder input must always get through.
    if (e.isTrusted && performance.now() < inputLockedUntil) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true
);

// --- Saved game (Task 18) ---------------------------------------------------
// One localStorage slot per board (persist.js), written after Start, Done,
// every trivia Next, Reset game and Resume. Loading a bank never writes,
// and a game on one board never touches another board's slot. Storage
// that is missing or throws (private mode, blocked site data, full) just
// means no save — play goes on, and setup says so.
function storage() {
  try {
    return window.localStorage; // the getter itself throws when blocked
  } catch {
    return null;
  }
}

let resumable = null; // this board's saved game, offered on setup
let otherSave = null; // newest saved game with progress, on ANOTHER board
let saveOff = false; // the last save (or the probe) failed
let shippedKey = null; // bankKey of the shipped questions.yaml

export function saveGame() {
  if (state.scoring === null) return;
  const ok = writeSave(storage(), makeSave(state));
  if (ok === saveOff) {
    saveOff = !ok;
    renderSaveNote();
  }
}

function gameInProgress() {
  return state.scoring !== null && hasProgress(makeSave(state));
}

const ERROR_CAP = 12; // keeps Try again / Back to setup on screen on a TV

export function renderError(errors) {
  const list = document.getElementById("error-list");
  const items = errors.slice(0, ERROR_CAP).map((e) => {
    const li = document.createElement("li");
    li.textContent = e.line ? `line ${e.line}: ${e.message}` : `${e.where}: ${e.message}`;
    return li;
  });
  if (errors.length > ERROR_CAP) {
    const more = document.createElement("li");
    more.textContent = `…and ${errors.length - ERROR_CAP} more`;
    items.push(more);
  }
  list.replaceChildren(...items);
  // A loaded bank (maybe a game in memory) can be returned to untouched.
  document.getElementById("error-back-btn").classList.toggle("hidden", state.bank === null);
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
  shippedKey = bankKeyOf(text);
  startNewBank(result.bank, [], shippedKey);
}

// One board per data source (Task 9): any bank load starts a fresh game —
// or offers this board's saved game (Task 18). bankKey identifies the
// board: a hash of its raw questions.yaml text.
let mediaUrls = []; // object URLs from the active folder bank
function startNewBank(bank, urls, bankKey) {
  revokeAll(mediaUrls); // no blob leaks across sources
  mediaUrls = urls;
  state.bank = bank;
  state.bankKey = bankKey;
  document.getElementById("error-back-btn").classList.remove("hidden");
  // The setup heading and tab title follow the bank (Task 17).
  document.querySelector("#screen-setup h1").textContent = bank.title;
  document.title = bank.title;
  const store = storage();
  resumable = resumableSave(store, bankKey);
  otherSave = resumable ? null : latestOtherSave(store, bankKey);
  saveOff = !canSave(store);
  const names = prefillNames();
  // Bank swap (retry / folder mode): previous game state no longer applies
  // (used-cell keys and round logs refer to the old bank).
  state.scoring = null;
  state.used = new Map();
  state.teamNames = []; // no stale names for the next setup (council 7.9, Task 9)
  resetFlow(); // no stale question state across bank loads (Task 9 folder mode)
  if (resumable) setMode(resumable.mode);
  renderSetup(names.map((name) => ({ name })));
  showScreen("setup");
}

// Dynamic team rows (Task 7.9): min 2, no cap; row count IS the team count.
function setupInputs() {
  return [...document.querySelectorAll("#team-inputs input")];
}

// Team identity (Task 18): a row may carry data-team = the index of the
// running game's team it came from. Rows built for a running game get one,
// rows added later have none, and Remove keeps the survivors' indices — so
// "same teams" means the same teams, not just the same count.
function setupRows() {
  return setupInputs().map((el) => ({
    name: el.value,
    team: el.dataset.team === undefined ? undefined : Number(el.dataset.team),
  }));
}

function allNamed() {
  return setupInputs().every((el) => el.value.trim() !== "");
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function setMode(mode) {
  document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
}

// Names to pre-fill after a bank load — the one place that decides
// (Tasks 17 + 18): this board's resumable saved game (Resume is offered);
// else the typed names, when there are at least 2 and all are filled (board
// 2 of the night needs no retyping); else two random names (app start).
function prefillNames() {
  if (resumable) return resumable.scoring.teams.map((t) => t.name);
  const vals = setupInputs().map((el) => el.value.trim());
  if (vals.length >= 2 && vals.every((v) => v !== "")) return vals;
  const first = randomTeamName([]);
  return [first, randomTeamName([first])];
}

// rows: [{ name, team? }] (see setupRows)
function renderSetup(rows) {
  const wrap = document.getElementById("team-inputs");
  const addBtn = document.createElement("button");
  addBtn.id = "add-team-btn";
  addBtn.className = "btn-quiet";
  addBtn.textContent = "Add team";
  addBtn.addEventListener("click", () => {
    const cur = setupRows();
    // fun auto-name (Task 7.10); the host can still edit it. No team index:
    // a late team is a new team.
    renderSetup(cur.concat({ name: randomTeamName(cur.map((r) => r.name)) }));
  });
  wrap.replaceChildren(
    ...rows.map((r, i) => {
      const row = document.createElement("div");
      row.className = "team-row";
      const input = document.createElement("input");
      input.id = `team-${i + 1}`;
      input.placeholder = `Team ${i + 1}`;
      input.setAttribute("autocomplete", "off");
      input.value = r.name;
      if (r.team !== undefined) input.dataset.team = String(r.team);
      const rm = document.createElement("button");
      rm.className = "btn-quiet team-remove";
      rm.textContent = "Remove";
      rm.disabled = rows.length <= 2; // 2 teams is the playable minimum
      rm.addEventListener("click", () => {
        renderSetup(setupRows().filter((_, j) => j !== i));
      });
      row.append(input, rm);
      return row;
    }),
    addBtn
  );
  renderResumeOffer();
  renderSaveNote();
  // Mid-game, setup can always be left without changing anything.
  document.getElementById("setup-back-btn").classList.toggle("hidden", state.scoring === null);
  document.getElementById("start-btn").disabled = !allNamed();
}

// The saved-game offer (Task 18): one summary line + the primary Resume
// button; Start steps down to secondary while it shows.
function renderResumeOffer() {
  document.getElementById("resume-offer").classList.toggle("hidden", !resumable);
  document.getElementById("resume-summary").textContent = resumable ? saveSummary(resumable) : "";
  document.getElementById("start-btn").classList.toggle("btn-secondary", resumable !== null);
}

// One setup line about saving: saving is off, or the newest saved game is
// on another board (after a reload the shipped board comes up — the
// night's folder board has to be loaded again to offer Resume).
function renderSaveNote() {
  const text = saveOff
    ? "Saving is off in this browser — a refresh will lose the game."
    : otherSave
    ? otherBoardHint(otherSave, new Date(), otherSave.bankKey === shippedKey)
    : "";
  const note = document.getElementById("save-note");
  note.textContent = text;
  note.classList.toggle("hidden", !text);
}

// Setup -> the running game as it is: rows and mode snap back to the game
// (unsaved setup edits dropped) and a stale Load-folder OK is forgotten.
// Start/Resume (enterGame), setup's Back to board and browser Back on
// setup all end here.
function showRunningGame() {
  loadConsented = false;
  setFolderMsg("");
  renderSetup(state.teamNames.map((name, i) => ({ name, team: i })));
  setMode(state.mode);
  renderBoard();
  showScreen("board");
  focusBoard();
}

// Start and Resume both land here: the setup rows now ARE the running
// game's teams (identity for the next Start), the game is saved, and Back
// is guarded.
function enterGame() {
  resumable = null;
  otherSave = null;
  saveGame();
  armBackGuard();
  showRunningGame();
}

// One-time wiring (renderSetup runs again on folder loads — Task 9).
document
  .getElementById("team-inputs")
  .addEventListener("input", () => {
    document.getElementById("start-btn").disabled = !allNamed();
  });

document.getElementById("start-btn").addEventListener("click", () => {
  const rows = setupRows();
  const names = rows.map((r) => r.name.trim());
  // Same teams (Task 7.5 partner rule, by identity since Task 18): exactly
  // the running game's teams, in order, none added or removed. Renames and
  // a mode switch keep the game.
  const sameTeams =
    state.scoring !== null &&
    rows.length === state.scoring.teams.length &&
    rows.every((r, i) => r.team === i);
  if (resumable && !confirm("Discard the saved game in progress and start a new one?")) return;
  if (
    !sameTeams &&
    gameInProgress() &&
    !confirm("The team list changed, so this starts a fresh game — all scores reset. Continue?")
  )
    return;
  state.teamNames = names;
  state.mode = selectedMode();
  if (sameTeams) {
    // rename in place, keep scores + used cells
    names.forEach((n, i) => { state.scoring.teams[i].name = n; });
  } else {
    state.used = new Map();
    state.scoring = createScoring(names);
  }
  enterGame();
});

document.getElementById("resume-btn").addEventListener("click", () => {
  if (!resumable) return;
  state.scoring = restoreScoring(resumable.scoring);
  // Names typed over the pre-filled rows win when they line up with the
  // saved teams (rename in place); otherwise the saved names.
  const typed = setupRows().map((r) => r.name.trim());
  if (typed.length === state.scoring.teams.length && typed.every((n) => n !== "")) {
    typed.forEach((n, i) => { state.scoring.teams[i].name = n; });
  }
  state.teamNames = state.scoring.teams.map((t) => t.name);
  state.mode = resumable.mode;
  state.used = new Map(resumable.used.map((k) => [k, true]));
  setMode(state.mode);
  enterGame();
});

document.getElementById("setup-back-btn").addEventListener("click", () => {
  if (state.scoring !== null) showRunningGame();
});

// Leave guards (Task 18). Reload / close mid-game asks first (the saved
// game covers it anyway). Back — browser button, trackpad swipe, TV remote
// — never leaves a running game: one history entry is pushed on Start /
// Resume and pushed again on every Back, which then acts like the screen's
// own back button (question, tally or setup -> board; elsewhere, stay put).
window.addEventListener("beforeunload", (e) => {
  if (!gameInProgress()) return;
  e.preventDefault();
  e.returnValue = "";
});

let backGuarded = false; // is the current history entry our pushed one?
function armBackGuard() {
  if (backGuarded) return;
  try {
    history.pushState({ triviaNight: "guard" }, "");
    backGuarded = true;
  } catch {
    // history unavailable: play on without the guard
  }
}

window.addEventListener("popstate", () => {
  backGuarded = false;
  if (state.scoring === null) return; // no game running: Back works normally
  armBackGuard();
  const on = visibleScreen();
  if (on === "question") {
    leaveQuestion();
  } else if (on === "tally") {
    renderBoard();
    showScreen("board");
    focusBoard();
  } else if (on === "setup") {
    showRunningGame();
  }
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
// Exit without touching state: the loaded bank and any game stay intact.
document.getElementById("error-back-btn").addEventListener("click", () => showScreen("setup"));

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
    renderError([{ where: "folder", message: "could not open the folder (" + err.message + ")" }]);
    return;
  }
  const result = await loadFromDirHandle(handle);
  if (!result.ok) {
    renderError(result.errors);
    return;
  }
  startNewBank(result.bank, result.urls, bankKeyOf(result.text));
  setFolderMsg("");
}

// Mid-game, Load folder asks first (Task 18) — BEFORE the picker, so
// Cancel costs nothing. The old board's saved game is not deleted: it is
// replaced only when a new game is Started.
let loadConsented = false; // OK'd, but the click went stale (see below)
document.getElementById("load-folder-btn").addEventListener("click", () => {
  // The OK is good for this one click only: once the picker opens, a
  // cancelled or failed load means the next Load folder asks again.
  const consented = loadConsented;
  loadConsented = false;
  if (
    !consented &&
    gameInProgress() &&
    !confirm("Load a different board? This ends the game in progress.")
  )
    return;
  // The picker needs the click's activation, which lapses ~5 s after the
  // click: a slow read of the confirm would leave the picker refusing to
  // open (silently, for the fallback input). Ask for one more click.
  if (navigator.userActivation && !navigator.userActivation.isActive) {
    loadConsented = true;
    setFolderMsg("Click Load folder again to pick the folder.");
    return;
  }
  setFolderMsg("");
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
  startNewBank(result.bank, result.urls, bankKeyOf(result.text));
  setFolderMsg("");
});

document.getElementById("create-new-btn").addEventListener("click", async () => {
  if (!window.showDirectoryPicker) {
    setFolderMsg(
      "Create new needs Chrome or Edge (File System Access API) — open the app there on your computer."
    );
    return;
  }
  // Picker FIRST: it needs the click's user activation (expires in ~5 s,
  // so a slow prompt() before it would break it) and readwrite asks for
  // write access in the same single prompt.
  let parent;
  try {
    parent = await window.showDirectoryPicker({ mode: "readwrite", startIn: "documents" });
  } catch (err) {
    if (err && err.name === "AbortError") return;
    setFolderMsg("Could not pick the parent folder: " + err.message);
    return;
  }
  const name = ((prompt("New game folder name", "my-trivia-night")) || "").trim();
  if (!name) return;
  try {
    await createNew(parent, name);
    setFolderMsg(`Created ${name}/ with a starter questions.yaml — load it with Load folder.`);
  } catch (err) {
    setFolderMsg(
      err && err.name === "ExistsError"
        ? err.message
        : err && err.name === "NotAllowedError"
        ? "Chrome didn't give edit access to that folder — click Create new again and allow editing when asked."
        : "Could not create the folder: " + err.message
    );
  }
});

loadBank();
