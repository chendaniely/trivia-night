// Pure scoring state for trivia-night. No DOM, no IO — runs in node.
// give(teamIdx, points, roundName): points may be negative (Jeopardy wrong).
// roundTotal(roundName): signed sum of everything awarded in that round.
// bank(cell, roundName, deltas): one question's result, remembered as
// `last` so undoLast() can take it back (Task 25, U1 — one level only).
// snapshot() / restoreScoring(snap): plain JSON-safe copy for saved games
// (Task 18) — { teams: [{name, points}], log: [[roundName, [{teamIdx, points}]]],
// last?: {cell, round, deltas} }.
export function createScoring(teamNames) {
  return build(teamNames.map((name) => ({ name, points: 0 })), new Map(), null);
}

const copyDeltas = (ds) => ds.map((d) => ({ teamIdx: d.teamIdx, points: d.points }));

export function restoreScoring(snap) {
  const teams = snap.teams.map((t) => ({ name: t.name, points: t.points }));
  const log = new Map(
    snap.log.map(([round, entries]) => [
      round,
      entries.map((e) => ({ teamIdx: e.teamIdx, points: e.points })),
    ])
  );
  const l = snap.last;
  return build(teams, log, l ? { cell: l.cell, round: l.round, deltas: copyDeltas(l.deltas) } : null);
}

// A question's marks (teamIdx -> "green" | "red") as signed points, in team
// order: green gains the question's points, red loses them. One function
// for Done, Next, the bank preview and the score badges.
export function deltasFor(marks, points) {
  return [...marks]
    .sort(([a], [b]) => a - b)
    .map(([teamIdx, mark]) => ({ teamIdx, points: mark === "red" ? -points : points }));
}

// Points with a sign for display: "+500", "−500" (a true minus), "0".
export function signedPoints(n) {
  return n > 0 ? `+${n}` : n < 0 ? `\u2212${-n}` : "0";
}

function build(teams, log, last) {
  // log: roundName -> [{ teamIdx, points }]
  function give(teamIdx, points, roundName) {
    teams[teamIdx].points += points;
    if (!log.has(roundName)) log.set(roundName, []);
    log.get(roundName).push({ teamIdx, points });
  }

  // One question's result: its deltas are given (and logged) in order and
  // remembered — even an empty list, so a pass can be undone too.
  function bank(cell, roundName, deltas) {
    for (const d of deltas) give(d.teamIdx, d.points, roundName);
    last = { cell, round: roundName, deltas: copyDeltas(deltas) };
  }

  // Take back the last banked question: its points and its log entries
  // (the newest entries of that round). Returns { cell, round, deltas } or
  // null when there is nothing to undo.
  function undoLast() {
    if (!last) return null;
    const rec = last;
    last = null;
    const entries = log.get(rec.round) ?? [];
    for (const d of [...rec.deltas].reverse()) {
      teams[d.teamIdx].points -= d.points;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].teamIdx === d.teamIdx && entries[i].points === d.points) {
          entries.splice(i, 1);
          break;
        }
      }
    }
    return rec;
  }

  function reset() {
    for (const t of teams) t.points = 0;
    log.clear();
    last = null;
  }

  function roundTotal(roundName) {
    return (log.get(roundName) ?? []).reduce((sum, e) => sum + e.points, 0);
  }

  function roundTeamTotal(roundName, teamIdx) {
    return (log.get(roundName) ?? [])
      .filter((e) => e.teamIdx === teamIdx)
      .reduce((sum, e) => sum + e.points, 0);
  }

  function snapshot() {
    const snap = {
      teams: teams.map((t) => ({ name: t.name, points: t.points })),
      log: [...log].map(([round, entries]) => [
        round,
        entries.map((e) => ({ teamIdx: e.teamIdx, points: e.points })),
      ]),
    };
    if (last) snap.last = { cell: last.cell, round: last.round, deltas: copyDeltas(last.deltas) };
    return snap;
  }

  return {
    teams, give, bank, undoLast, reset, roundTotal, roundTeamTotal, snapshot,
    get last() { return last; },
  };
}
