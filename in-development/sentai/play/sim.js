// Headless bot games: node sim.js [games per squad size]
const S = require('./engine.js');
const G = +process.argv[2] || 4000;
for (let n = 2; n <= 4; n++) {
  let wins = 0, misses = 0, encs = 0, byPlay = 0, byDiscard = 0, stuck = 0;
  for (let g = 0; g < G; g++) {
    const game = new S.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })));
    let steps = 0;
    while (!game.over() && steps++ < 2000) if (!game.botStep()) break;
    if (!game.over()) { stuck++; continue; }
    misses += game.misses; encs += game.done + (game.outcome.win ? 0 : 1);
    if (game.outcome.win) wins++; else if (/played/.test(game.outcome.how)) byPlay++; else byDiscard++;
  }
  console.log(`${n} Heroes: squad wins ${(100 * wins / G).toFixed(0)}% · lost by playing last card ${(100 * byPlay / G).toFixed(0)}% · lost to a miss ${(100 * byDiscard / G).toFixed(0)}% · misses ${(100 * misses / encs).toFixed(0)}% of encounters${stuck ? ' · STUCK ' + stuck : ''}`);
}
