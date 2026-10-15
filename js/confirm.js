// The app's own confirm screen (Task 25, U7). It replaces window.confirm()
// and prompt(): those look foreign on the TV, and some TV browsers suppress
// them — a suppressed confirm() returns false, so Reset game could never
// work. A screen of its own rather than an overlay: <dialog> and `inert`
// postdate the Chrome 86 / Safari 14 floor, and a remote's D-pad ignores
// focus traps.
//
// askConfirm({ title, text, ok, input?, onOk(value), onCancel? }): focus
// starts on Cancel (or on the text field when `input` is given). Cancel,
// Esc and Back (app.js popstate) cancel; OK runs onOk synchronously inside
// its own click, so a folder picker opened there keeps its user activation.
// Either way the opener's screen comes back first, with focus on the opener.
import { showScreen, visibleScreen, armBackGuard, disarmBackGuard } from "./app.js";

let pending = null; // { from, opener, onOk, onCancel }

const el = (id) => document.getElementById(id);

export function askConfirm({ title, text, ok, input, onOk, onCancel }) {
  // A confirm asked from a confirm returns to the first one's screen.
  pending = { from: pending ? pending.from : visibleScreen(), opener: document.activeElement, onOk, onCancel };
  el("confirm-title").textContent = title;
  el("confirm-text").textContent = text;
  el("confirm-input").classList.toggle("hidden", input === undefined);
  el("confirm-input").value = input ?? "";
  el("confirm-ok").textContent = ok;
  armBackGuard(); // Back cancels, even before a game is running
  showScreen("confirm");
  (input === undefined ? el("confirm-cancel") : el("confirm-input")).focus();
}

function close(confirmed) {
  if (!pending) return;
  const p = pending;
  pending = null;
  const value = el("confirm-input").value;
  showScreen(p.from);
  if (p.opener && p.opener.isConnected && p.opener !== document.body) p.opener.focus();
  if (!confirmed) disarmBackGuard(); // no game yet: give the history entry back
  (confirmed ? p.onOk : p.onCancel)?.(value);
}

export function cancelConfirm() {
  close(false);
}

// Forget the question without answering it (app.js showScreen: another
// screen took over — a folder load, an error).
export function dropConfirm() {
  pending = null;
}

// (?.: a stale cached index.html without the screen must not stop the app
// from booting mid-deploy — the confirm just isn't there until a reload.)
el("confirm-ok")?.addEventListener("click", () => close(true));
el("confirm-cancel")?.addEventListener("click", () => close(false));
// Esc cancels — the one key handler besides the held-Enter swallow (an
// exception to Task 21's "no keydown handlers"); a TV remote's Back
// arrives as popstate instead. Enter in the text field means OK.
document.addEventListener("keydown", (e) => {
  if (!pending || visibleScreen() !== "confirm") return;
  if (e.key === "Escape") {
    e.preventDefault();
    close(false);
  } else if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229 && e.target === el("confirm-input")) {
    // (an IME committing a candidate sends Enter too — not an OK)
    e.preventDefault();
    close(true);
  }
});
