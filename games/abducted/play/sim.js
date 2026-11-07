// Headless bot games: node sim.js [games per player count]
const Ab = require('./engine.js');
const G = +process.argv[2] || 3000;
for (let n = 5; n <= 12; n++) {
  let turns = 0, hw = 0, ties = 0, votes = 0, correct = 0, winners = 0, stuck = 0, seen = 0;
  for (let g = 0; g < G; g++) {
    const game = new Ab.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })));
    let steps = 0, lastTurn = 0;
    while (!game.over() && steps++ < 4000) {
      if (game.phase === 'reveal' && game.turn !== lastTurn) {
        lastTurn = game.turn; if (!game.result.win) ties++;
        for (const [s, v] of Object.entries(game.votes)) { votes++; if (game.cards[s].t === v) correct++; }
      }
      game.botStep();
    }
    if (steps >= 4000) stuck++;
    turns += game.turn; if (game.winTeam === 'H') hw++;
    winners += game.cards.filter((c) => c.t === game.winTeam).length; seen += n;
  }
  console.log(`${n}p: ${(turns / G).toFixed(1)} turns · Humans win ${(100 * hw / G).toFixed(0)}% · ties ${(100 * ties / turns).toFixed(0)}% of turns · bots vote their true side ${(100 * correct / votes).toFixed(0)}% · ${(100 * winners / seen).toFixed(0)}% of players win${stuck ? ' · STUCK ' + stuck : ''}`);
}
