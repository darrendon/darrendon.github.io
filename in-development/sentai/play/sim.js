// Headless bot games: node sim.js [games per squad size] [simple]
// Default bots look ahead (about 0.1 s a game); add "simple" for the old one-step bots.
const S = require('./engine.js');
const G = +process.argv[2] || 1000, simple = process.argv[3] === 'simple';
for (let n = 2; n <= 4; n++) {
  let wins = 0, misses = 0, fights = 0, flawless = 0, stuck = 0;
  for (let g = 0; g < G; g++) {
    const game = new S.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })), { simple });
    let steps = 0;
    while (!game.over() && steps++ < 3000) if (!game.botStep()) break;
    if (!game.over()) { stuck++; continue; }
    misses += game.misses; fights += game.fights;
    if (game.outcome.win) { wins++; if (!game.misses) flawless++; }
  }
  console.log(`${n} Heroes (${simple ? 'simple' : 'look-ahead'} bots): squad wins ${(100 * wins / G).toFixed(0)}% · flawless ${(100 * flawless / G).toFixed(0)}% · misses ${(100 * misses / fights).toFixed(0)}% of fights${stuck ? ' · STUCK ' + stuck : ''}`);
}
