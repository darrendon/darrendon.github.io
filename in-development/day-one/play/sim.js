// Headless bot games: node sim.js [games per player count] [player counts, e.g. 2,3,4,5]
const D = require('./engine.js');

function playOne(n) {
  const game = new D.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })));
  let steps = 0, noMove = false;
  while (!game.over() && steps++ < 2000) {
    const before = game.seq;
    game.ctx();
    const could = D._.canLaunch(game.s, game.s.cur);
    game.botStep();
    if (game.over() && game.seq === before && could) noMove = true;   // night fell although the god could still walk
  }
  const f = game.view(0).final;
  return { total: f.total, el: f.el, pl: f.pl, gp: f.gp, cores: f.cores, caps: f.caps, turns: game.s.turns, round: game.s.round, stuck: steps >= 2000, noMove, fallbacks: game.fallbacks || 0, winners: f.winners };
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) * (x - m)))); };
function summarize(n, res) {
  const sorted = res.map((r) => r.total.slice().sort((a, b) => b - a));
  const win = sorted.map((t) => t[0]), second = sorted.map((t) => t[1]), last = sorted.map((t) => t[t.length - 1]), all = res.flatMap((r) => r.total);
  const seatWins = Array(n).fill(0);
  res.forEach((r) => { const w = r.winners || [r.total.indexOf(Math.max(...r.total))]; w.forEach((q) => { seatWins[q] += 1 / w.length; }); });
  const part = (k) => mean(res.flatMap((r) => r[k]));
  return {
    n, games: res.length, stuck: res.filter((r) => r.stuck).length, noMove: res.filter((r) => r.noMove).length, fallbackGames: res.filter((r) => r.fallbacks).length,
    turns: mean(res.map((r) => r.turns)), rounds: mean(res.map((r) => r.round)),
    score: mean(all), scoreSd: sd(all), winner: mean(win), last: mean(last), margin: mean(win.map((w, i) => w - second[i])), spread: mean(win.map((w, i) => w - last[i])),
    ties: res.filter((r, i) => win[i] === second[i]).length / res.length,
    mastery: part('el'), stars: part('cores'), peaks: part('pl'), favour: part('gp'), collected: part('caps'),
    seatWin: seatWins.map((w) => w / res.length),
  };
}
function line(s) {
  const f = (x) => x.toFixed(1);
  return `${s.n}p ×${s.games}: ${f(s.turns)} turns (${f(s.rounds)} rounds) · score ${f(s.score)} ±${f(s.scoreSd)} · winner ${f(s.winner)} · last ${f(s.last)} · win margin ${f(s.margin)} · 1st–last ${f(s.spread)} · tied top ${(100 * s.ties).toFixed(0)}%` +
    ` · per player: mastery ${f(s.mastery)}, stars ${f(s.stars)}, peaks ${f(s.peaks)}, favour ${f(s.favour)}, collected ${f(s.collected)}` +
    ` · wins by seat ${s.seatWin.map((w) => (100 * w).toFixed(0) + '%').join(' ')}` + ` · stuck ${s.stuck} · ended early with a move left ${s.noMove}` + (s.fallbackGames !== undefined && !isNaN(s.fallbackGames) ? ` · games needing the walk fallback ${s.fallbackGames}` : '');
}

if (require.main === module) {
  const G = +process.argv[2] || 1000;
  const counts = (process.argv[3] || '2,3,4,5').split(',').map(Number);
  for (const n of counts) {
    const t0 = Date.now(), res = [];
    for (let g = 0; g < G; g++) res.push(playOne(n));
    console.log(line(summarize(n, res)) + ` · ${((Date.now() - t0) / G).toFixed(0)} ms/game`);
  }
}
module.exports = { playOne, summarize, line };
