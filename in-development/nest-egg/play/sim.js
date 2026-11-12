// Headless bot games: node sim.js [games per player count]
const E = require('./engine.js');
const G = +process.argv[2] || 2000;
for (let n = 3; n <= 5; n++) {
  const A = { lots: 0, washes: 0, solo: 0, items: 0, leaderOut: 0, outCount: 0, broke: 0, steps: 0, treasureShare: 0 };
  const seat = Array(n).fill(0), style = {}, styleN = {};
  for (let g = 0; g < G; g++) {
    const game = new E.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })));
    let steps = 0;
    while (!game.over() && steps++ < 20000) game.botStep();
    if (steps >= 20000) { console.log('stuck', n, game.phase); continue; }
    const f = game.final, sc = f.scores, top = Math.max(...sc.map((s) => s.total));
    A.lots += game.stats.lots; A.washes += game.stats.washes; A.solo += game.stats.solo; A.steps += steps;
    A.items += game.players.reduce((t, p) => t + Object.values(p.baubles).reduce((a, b) => a + b, 0), 0) / n;
    A.leaderOut += f.out.some((i) => sc[i].total === top) ? 1 : 0; A.outCount += f.out.length;
    A.broke += f.money.some((m) => m === 0) ? 1 : 0;
    const tt = sc.reduce((t, s) => t + Math.max(0, s.total), 0); A.treasureShare += tt ? sc.reduce((t, s) => t + s.treasures, 0) / tt : 0;
    f.winners.forEach((w) => { seat[(w - game.firstStart + n) % n] += 1 / f.winners.length; const st = game.players[w].style; style[st] = (style[st] || 0) + 1 / f.winners.length; });
    game.players.forEach((p) => { styleN[p.style] = (styleN[p.style] || 0) + 1; });
  }
  const r = (x) => (x / G).toFixed(2);
  console.log(`${n}p: lots ${r(A.lots)} · skipped ${r(A.washes)} · lone wins ${r(A.solo)} · baubles/critter ${r(A.items)} · leader out ${(100 * A.leaderOut / G).toFixed(0)}% · ` +
    `someone broke ${(100 * A.broke / G).toFixed(0)}% · treasure share ${(100 * A.treasureShare / G).toFixed(0)}% · seats ${seat.map((s) => (s / G * n).toFixed(2)).join(' ')} · ` +
    `styles ${Object.keys(styleN).sort().map((k) => k + ' ' + ((style[k] || 0) / styleN[k] * n).toFixed(2)).join(' ')}`);
}
