// A finished game as a real saved game (Task 25 checks): every cell of
// the served questions.yaml played, the given scores. Built with the app's
// own persist/validate code, so its key and shape are the app's.
import { bankKeyOf, slotKey } from "../js/persist.js";
import { parseBank } from "../js/validate.js";

// last: an optional Undo record ({ cell, round, deltas }).
export async function finishedSave(baseUrl, teams, last) {
  const text = await (await fetch(new URL("questions.yaml", baseUrl))).text();
  const { bank } = parseBank(text);
  const bankKey = bankKeyOf(text);
  const used = bank.rounds.flatMap((r, ri) => r.questions.map((_, qi) => `${ri}:${qi}`));
  const save = {
    v: 1,
    bankKey,
    title: bank.title,
    mode: "jeopardy",
    scoring: { teams: teams.map(([name, points]) => ({ name, points })), log: [], ...(last ? { last } : {}) },
    used,
    savedAt: new Date().toISOString(),
  };
  return { key: slotKey(bankKey), json: JSON.stringify(save) };
}
