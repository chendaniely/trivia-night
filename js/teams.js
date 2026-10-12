// Pure fun-name generator for "Add team" (Task 7.10). No DOM, no IO.
// randomTeamName(existingNames): adjective + noun, neither word present
// (case-insensitive) in any current team name — typed or generated.
// No bookkeeping: callers pass the live names; removed/edited names free
// their words automatically.

export const TEAM_ADJ = [
  "Zesty", "Gilded", "Turbo", "Wacky", "Fuzzy", "Neon", "Rusty", "Cosmic",
  "Silky", "Breezy", "Grumpy", "Lucky", "Mellow", "Sparky", "Dapper",
  "Feral", "Golden", "Hazy", "Jolly", "Kooky", "Lively", "Misty", "Nifty",
  "Plucky", "Quirky", "Rugged", "Snazzy", "Vivid", "Zippy", "Bouncy",
];

export const TEAM_NOUN = [
  "Pigeons", "Badgers", "Otters", "Yetis", "Falcons", "Beavers", "Goblins",
  "Rockets", "Pickles", "Banjos", "Donkeys", "Walruses", "Comets",
  "Sprockets", "Flamingos", "Narwhals", "Turkeys", "Sausages", "Vultures",
  "Hedgehogs", "Meerkats", "Gophers", "Bison", "Jellyfish", "Bagpipes",
  "Cacti", "Marmots", "Gargoyles", "Tofu", "Bananas",
];

function wordsIn(names) {
  const used = new Set();
  for (const name of names)
    for (const w of name.toLowerCase().split(/\s+/)) used.add(w);
  return used;
}

export function randomTeamName(existingNames) {
  const used = wordsIn(existingNames);
  const adj = TEAM_ADJ.filter((w) => !used.has(w.toLowerCase()));
  const noun = TEAM_NOUN.filter((w) => !used.has(w.toLowerCase()));
  // shortcut: 15+ teams exhausts the lists — plain label beats a crash
  if (adj.length === 0 || noun.length === 0)
    return `Team ${existingNames.length + 1}`;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  return `${pick(adj)} ${pick(noun)}`;
}
