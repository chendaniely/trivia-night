// Pure scoring state for trivia-night. No DOM, no IO — runs in node.
// give(teamIdx, points, roundName): points may be negative (Jeopardy wrong).
// roundTotal(roundName): signed sum of everything awarded in that round.
// snapshot() / restoreScoring(snap): plain JSON-safe copy for saved games
// (Task 18) — { teams: [{name, points}], log: [[roundName, [{teamIdx, points}]]] }.
export function createScoring(teamNames) {
  return build(teamNames.map((name) => ({ name, points: 0 })), new Map());
}

export function restoreScoring(snap) {
  const teams = snap.teams.map((t) => ({ name: t.name, points: t.points }));
  const log = new Map(
    snap.log.map(([round, entries]) => [
      round,
      entries.map((e) => ({ teamIdx: e.teamIdx, points: e.points })),
    ])
  );
  return build(teams, log);
}

function build(teams, log) {
  // log: roundName -> [{ teamIdx, points }]
  function give(teamIdx, points, roundName) {
    teams[teamIdx].points += points;
    if (!log.has(roundName)) log.set(roundName, []);
    log.get(roundName).push({ teamIdx, points });
  }

  function reset() {
    for (const t of teams) t.points = 0;
    log.clear();
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
    return {
      teams: teams.map((t) => ({ name: t.name, points: t.points })),
      log: [...log].map(([round, entries]) => [
        round,
        entries.map((e) => ({ teamIdx: e.teamIdx, points: e.points })),
      ]),
    };
  }

  return { teams, give, reset, roundTotal, roundTeamTotal, snapshot };
}
