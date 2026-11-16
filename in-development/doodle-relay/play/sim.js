// Headless check of the rules engine with scripted players on a fake clock: node sim.js [games per player count]
// There are no bots in Doodle Relay, so the scripted players just scribble random strokes, sometimes
// try something illegal, and guess the right word about half the time. Fails loudly if a rule breaks.
const D = require('./engine.js');
const G = +process.argv[2] || 500;
const assert = (c, m) => { if (!c) { throw new Error(m); } };

// the answer matcher
const yes = [['cat', 'Cat'], ['cats', 'cat'], ['the moon', 'moon'], ['ice cream', 'icecream'], ['jellyfish', 'jelly fish'], ['butterfly', 'buterfly'], ['hot air balloon', 'hot-air balloon'], ['jack-o-lantern', 'jack o lantern'], ['strawberries', 'strawberry'], ['boxes', 'box'], ['skeleton', 'skeletons'], ['Eiffel Tower', 'eifel tower']];
const no = [['cat', 'car'], ['dog', 'dig'], ['bat', 'hat'], ['moon', 'sun'], ['pie', 'pig'], ['shark', 'snake'], ['', 'cat']];
for (const [a, b] of yes) assert(D.sameWord(a, b), 'should match: ' + a + ' / ' + b);
for (const [a, b] of no) assert(!D.sameWord(a, b), 'should not match: ' + a + ' / ' + b);

// every card is six different words from six different categories
const words = D.BANK.reduce((n, c) => n + c.words.length, 0);
for (let i = 0; i < 2000; i++) {
  const c = D.dealCard('words', new Set());
  assert(c.length === 6 && new Set(c.map((x) => x.cat)).size === 6 && new Set(c.map((x) => D.norm(x.word))).size === 6, 'bad card');
}

let totalBoards = 0, totalOk = 0, rejected = 0, strokes = 0, maxView = 0;
for (let n = D.RULES.minPlayers; n <= D.RULES.maxPlayers; n++) {
  for (let g = 0; g < G; g++) {
    let clock = 1e6;
    const mode = g % 2 ? 'categories' : 'words', drawers = g % 5 === 0 ? 'all' : 3;
    const game = new D.Game(Array.from({ length: n }, (_, i) => ({ name: 'P' + i })), { mode, drawSecs: [5, 10, 15][g % 3], rounds: 1 + (g % 3), drawers }, { now: () => clock });
    const L = drawers === 'all' ? n : Math.min(n, 3);
    assert(game.L === Math.max(2, L), 'drawers per board');
    let steps = 0, lastRound = 0;
    while (game.phase !== 'end') {
      assert(steps++ < 200000, 'stuck in ' + game.phase);
      if (game.round !== lastRound) {
        lastRound = game.round;
        if (mode === 'words') game.players.forEach((_, s) => { if (Math.random() < 0.8) assert(game.act(s, { t: 'ready' }).ok, 'ready'); });
        else game.players.forEach((_, s) => { if (Math.random() < 0.8) assert(game.act(s, { t: 'ready', word: 'thing ' + s }).ok, 'ready word'); });
        if (game.phase === 'card') { assert(!game.act(0, { t: 'answer', text: 'x' }).ok, 'answered during card'); clock += D.RULES.cardMs[mode] + 1; game.botStep(); }
        assert(game.phase === 'draw', 'should be drawing');
        game.boards.forEach((b) => assert(b.word && b.word.length, 'board without a word'));
      }
      if (game.phase === 'draw') {
        // too early: refused
        if (game.stage === 'look') { assert(!game.act(0, { t: 'stroke', leg: game.leg, p: [1, 2, 3, 4] }).ok || clock >= game.drawStart - 400, 'stroke during look'); clock = game.drawStart; game.botStep(); }
        assert(game.stage === 'draw', 'draw stage');
        for (let s = 0; s < n; s++) {
          const k = 1 + Math.floor(Math.random() * 4);
          for (let i = 0; i < k; i++) { const p = Array.from({ length: 2 + 2 * Math.floor(Math.random() * 30) }, () => Math.floor(Math.random() * 1001)); assert(game.act(s, { t: 'stroke', leg: game.leg, p }).ok, 'stroke refused'); strokes++; }
          if (!game.act(s, { t: 'stroke', leg: game.leg + 1, p: [5, 5] }).ok) rejected++; else assert(false, 'stroke for a future pass accepted');
          if (!game.act(s, { t: 'stroke', leg: game.leg, p: [5] }).ok) rejected++; else assert(false, 'odd stroke accepted');
        }
        const leg = game.leg;
        clock = game.drawEnd + 200; game.botStep();
        assert(game.act(0, { t: 'stroke', leg, p: [7, 7] }).ok, 'stroke in grace refused');
        clock = game.drawEnd + D.RULES.graceMs + 1; game.botStep();
        if (!game.act(0, { t: 'stroke', leg, p: [8, 8] }).ok) rejected++; else assert(false, 'late stroke accepted');
        continue;
      }
      if (game.phase === 'guess') {
        if (game.gi === 0 && game.order.length === n && !game.answer) {
          // check the boards once guessing starts
          game.boards.forEach((b) => {
            assert(b.legs.length === game.L, 'legs per board');
            assert(b.legs[0].seat === b.starter, 'starter draws first');
            assert(new Set(b.legs.map((l) => l.seat)).size === game.L, 'someone drew twice on a board');
          });
          for (let leg = 0; leg < game.L; leg++) assert(new Set(game.boards.map((b) => b.legs[leg].seat)).size === n, 'two boards with one player in a pass');
        }
        const b = game.curBoard();
        assert(!game.act(b.starter, { t: 'answer', text: 'nope' }).ok, 'starter answered');
        const v = game.view((b.starter + 1) % n);
        assert(v.board.word === null, 'guessers can see the word');
        maxView = Math.max(maxView, JSON.stringify(v).length);
        assert(game.view(b.starter).board.word === b.word, 'starter cannot see own word');
        const right = Math.random() < 0.5;
        const g1 = (b.starter + 1) % n;
        game.act(g1, { t: 'answer', text: right ? b.word.toUpperCase() : 'zzqx' });
        let s = (b.starter + 2) % n, guard = 0;
        while (game.phase === 'guess') { if (s !== b.starter && !game.agrees.includes(s)) game.act(s, { t: 'agree' }); s = (s + 1) % n; assert(guard++ < 50, 'never locked'); }
        assert(game.agrees.length === game.need(), 'locked at the wrong count');
        continue;
      }
      if (game.phase === 'reveal') {
        assert(!game.act(0, { t: 'next' }).ok, 'next too soon');
        const b = game.curBoard();
        assert(game.verdict === D.sameWord(game.answer.text, b.word), 'verdict');
        if (Math.random() < 0.1) { assert(!game.act((b.starter + 1) % n, { t: 'judge', ok: true }).ok, 'non-starter judged'); assert(game.act(b.starter, { t: 'judge', ok: !game.verdict }).ok, 'judge'); }
        clock += D.RULES.revealMinMs; assert(game.act((b.starter + 1) % n, { t: 'next' }).ok, 'next');
      }
    }
    assert(game.history.length === n * game.rounds, 'boards guessed');
    assert(game.score === game.history.filter((h) => h.ok).length, 'score');
    if (mode === 'words') assert(new Set(game.history.map((h) => D.norm(h.word))).size === game.history.length, 'a word came up twice');
    totalBoards += game.history.length; totalOk += game.score;
    assert(game.act(1, { t: 'again' }).ok && game.phase === 'card' && game.round === 1 && game.score === 0, 'play again');
  }
}
console.log(`ok · ${G} games at each of 3–8 players · ${totalBoards} boards · ${totalOk} guessed · ${strokes} strokes · ${rejected} bad strokes refused · ${D.BANK.length} categories, ${words} words · biggest guess view ${(maxView / 1024).toFixed(1)} KB`);
