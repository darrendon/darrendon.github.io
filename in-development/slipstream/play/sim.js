// Headless bot races: node sim.js [games per player count]
const S = require('./engine.js');
const G = +process.argv[2] || 2000;
for (let n = 3; n <= 6; n++) {
  let races = 0, crashes = 0, riders = 0, empty = 0, slips = 0, caught = 0, plays = 0, startWins = Array(n).fill(0), raceWins = 0, dist = 0;
  for (let g = 0; g < G; g++) {
    const game = new S.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })));
    let steps = 0, lastRace = 0, starts = null;
    while (!game.over() && steps++ < 5000) {
      if (game.race !== lastRace) { lastRace = game.race; starts = game.riders.map((r) => r.pos); }
      const ph = game.phase;
      game.botStep();
      if (ph === 'trickEnd' && false) {}
      if (game.phase === 'trickEnd' && game.lastTrick && !game.lastTrick._c) { game.lastTrick._c = 1; for (const r of game.lastTrick.results) { plays++; if (r.slip) slips++; if (r.kind === 'caught') caught++; } }
      if (game.phase === 'raceEnd' && !game.raceResult._c) {
        game.raceResult._c = 1; races++;
        game.riders.forEach((r) => { riders++; if (r.crashed) crashes++; else dist += game.R.edge - r.pos; });
        if (game.raceResult.winner == null) empty++; else { raceWins++; startWins[starts[game.raceResult.winner]]++; }
      }
    }
    if (steps >= 5000) console.log('stuck', n);
  }
  console.log(`${n}p: ${(races / G).toFixed(2)} races/game · crash ${(100 * crashes / riders).toFixed(0)}% · no-winner races ${(100 * empty / races).toFixed(1)}% · slipstream on ${(100 * slips / plays).toFixed(0)}% of moves · caught ${(100 * caught / plays).toFixed(0)}% · avg gap ${(dist / (riders - crashes)).toFixed(1)} · race wins by start space ${startWins.map((w) => (100 * w / raceWins).toFixed(0) + '%').join(' ')}`);
}
