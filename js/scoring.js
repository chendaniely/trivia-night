// Pure scoring state for trivia-night. No DOM, no IO — runs in node.
// give(teamIdx, points, roundName): points may be negative (Jeopardy wrong).
// roundTotal(roundName): signed sum of everything awarded in that round.
export function createScoring(teamNames) {
  const teams = teamNames.map((name) => ({ name, points: 0 }));
  const log = new Map(); // roundName -> [{ teamIdx, points }]

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

  return { teams, give, reset, roundTotal };
}
