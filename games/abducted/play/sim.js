// Headless bot games: node sim.js [games per player count]
const Ab = require('./engine.js');
const G = +process.argv[2] || 3000;
for (let n = 5; n <= 12; n++) {
  let rounds = 0, hw = 0, ties = 0, flips = 0, sig = 0, right = 0, winners = 0, seen = 0, stuck = 0, known = 0;
  for (let g = 0; g < G; g++) {
    const game = new Ab.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })));
    let steps = 0, lastR = 0;
    while (!game.over() && steps++ < 5000) {
      if (game.phase === 'signal' && game.round !== lastR) {
        lastR = game.round;
        for (const s of game.searchers) { sig++; if (game.botTeam(s) === game.cards[s].t) right++; }
      }
      game.botStep();
      if (game.last && game.last.round === lastR && game.last._c !== 1) { game.last._c = 1; if (game.last.flip) flips++; }
    }
    if (steps >= 5000) stuck++;
    rounds += game.round; if (game.winner === 'H') hw++;
    winners += game.cards.filter((c) => c.t === game.winner).length; seen += n; known += Object.keys(game.known).length;
  }
  console.log(`${n}p: ${(rounds / G).toFixed(1)} rounds · Humans win ${(100 * hw / G).toFixed(0)}% · tied signals ${(100 * flips / rounds).toFixed(0)}% of rounds · searchers on their true side ${(100 * right / sig).toFixed(0)}% · ${(100 * winners / seen).toFixed(0)}% of players win${stuck ? ' · STUCK ' + stuck : ''}`);
}
