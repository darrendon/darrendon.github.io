// Headless bot games: node sim.js [games per squad size] [boss: gorvax|vael] [powers: 0|1] [simple]
// Default bots look ahead (about 0.1–0.3 s a game); add "simple" for the one-step bots.
const S = require('./engine.js');
const G = +process.argv[2] || 1000, boss = process.argv[3] || 'gorvax', powers = +(process.argv[4] || 0), simple = process.argv[5] === 'simple';
for (let n = 2; n <= 4; n++) {
  let wins = 0, misses = 0, fights = 0, flawless = 0, stuck = 0;
  const t = Date.now();
  for (let g = 0; g < G; g++) {
    const game = new S.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })), { boss, powers, simple });
    let steps = 0;
    while (!game.over() && steps++ < 4000) if (!game.botStep()) break;
    if (!game.over()) { stuck++; continue; }
    misses += game.misses; fights += game.fights;
    if (game.outcome.win) { wins++; if (!game.misses) flawless++; }
  }
  console.log(`${boss}${powers ? '+powers' : ''} ${n} Heroes (${simple ? 'simple' : 'look-ahead'}): wins ${(100 * wins / G).toFixed(0)}% · flawless ${(100 * flawless / G).toFixed(0)}% · ${boss === 'vael' ? 'strikes per game ' + (misses / G).toFixed(2) + ' · rounds ' + (fights / G).toFixed(1) : 'misses ' + (100 * misses / fights).toFixed(0) + '% of fights'}${stuck ? ' · STUCK ' + stuck : ''} · ${((Date.now() - t) / G).toFixed(0)}ms/game`);
}
