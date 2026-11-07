// Headless bot games: node sim.js [games per player count]
// Checks that every game finishes and reports length, win rate by seat and score spreads.
const P = require('./engine.js');
const G = +process.argv[2] || 2000;
const pct = (x) => (100 * x).toFixed(1) + '%';
const avg = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
for (let n = 2; n <= 5; n++) {
  let stuck = 0, ties = 0, errors = 0;
  const steps = [], turns = [], winVP = [], allVP = [], margin = [], spread = [], seatWins = Array(n).fill(0), seatVP = Array(n).fill(0);
  const firstWins = [0, 0], st = { outbids: 0, hires: 0, activations: 0, placements: 0, passes: 0 };
  const pitchSeen = Array(6).fill(0);
  for (let g = 0; g < G; g++) {
    let game;
    try {
      game = new P.Game(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true })));
      let k = 0;
      while (!game.over() && k++ < 20000) {
        if (!game.botStep()) { stuck++; break; }   // a bot table must never wait
        JSON.stringify(game.view(k % n));          // views must always serialise
      }
      if (!game.over()) { if (k >= 20000) stuck++; continue; }
      steps.push(k); turns.push(game.stats.turns);
    } catch (e) { errors++; if (errors < 4) console.error(e); continue; }
    const vps = game.players.map((p) => p.vp), sorted = vps.slice().sort((a, b) => b - a);
    const w = game.result.winners;
    if (w.length > 1) ties++;
    w.forEach((i) => { seatWins[i] += 1 / w.length; });
    vps.forEach((v, i) => { seatVP[i] += v; allVP.push(v); });
    winVP.push(sorted[0]); margin.push(sorted[0] - sorted[1]); spread.push(sorted[0] - sorted[n - 1]);
    for (const k of Object.keys(st)) st[k] += game.stats[k];
  }
  const done = steps.length;
  console.log(`\n${n} players · ${G} games · finished ${done} · stalls ${stuck} · errors ${errors}`);
  console.log(`  length: ${avg(turns).toFixed(1)} player turns (${(avg(turns) / n).toFixed(1)} each), ${avg(steps).toFixed(0)} bot steps`);
  console.log(`  winning score avg ${avg(winVP).toFixed(1)} (10th–90th pct ${q(winVP, 0.1)}–${q(winVP, 0.9)}) · all scores avg ${avg(allVP).toFixed(1)} (min ${Math.min(...allVP)}, max ${Math.max(...allVP)})`);
  console.log(`  1st−2nd margin avg ${avg(margin).toFixed(1)} (median ${q(margin, 0.5)}) · 1st−last spread avg ${avg(spread).toFixed(1)} · shared wins ${pct(ties / done)}`);
  console.log(`  wins by seat: ${seatWins.map((x, i) => 'seat ' + (i + 1) + ' ' + pct(x / done)).join(' · ')}`);
  console.log(`  avg VP by seat: ${seatVP.map((x) => (x / done).toFixed(1)).join(' · ')}`);
  console.log(`  per game: ${(st.placements / done).toFixed(1)} placements, ${(st.outbids / done).toFixed(1)} outbids/poaches, ${(st.hires / done).toFixed(1)} hires, ${(st.activations / done).toFixed(1)} activations, ${(st.passes / done).toFixed(1)} passes`);
}
