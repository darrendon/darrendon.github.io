/* Down for the Count — rules engine and bots (rules draft v3).
   Runs in the browser (window.DFTC) and in node (module.exports), so bot-only matches can be checked headless.

   A card is just its rank (1–10). A move is { cards:[sorted ranks], type:'set'|'run', size, top }.
   Turn order runs clockwise by seat index. Seat 0 is the human in the browser build. */
(function (root) {
  'use strict';

  const SETUP = { // players: [top rank, hand, stamina cards]
    2: [8, 15, 3], 3: [9, 15, 3], 4: [10, 12, 3], 5: [10, 9, 3]
  };

  // ------------------------------------------------------------------ moves
  function classify(cards) {
    const c = cards.slice().sort((a, b) => a - b), n = c.length;
    if (n < 1 || n > 4) return null;
    if (c.every((r) => r === c[0])) return { cards: c, type: 'set', size: n, top: c[0] };
    if (n >= 2 && c.every((r, i) => i === 0 || r === c[i - 1] + 1)) return { cards: c, type: 'run', size: n, top: c[n - 1] };
    return null;
  }
  function beats(a, b) {
    if (!b) return true;
    if (a.size !== b.size) return a.size > b.size;
    if (a.type !== b.type) return a.type === 'set';
    return a.top > b.top;
  }
  const NUM = ['', 'single', 'pair', 'three', 'four'];
  function describe(m) {
    if (!m) return 'nothing';
    if (m.type === 'set') {
      if (m.size === 1) return 'a ' + m.top;
      if (m.size === 2) return 'a pair of ' + m.top + 's';
      return (m.size === 3 ? 'three ' : 'four ') + m.top + 's';
    }
    return m.cards.join('-');
  }
  function beatHint(m, top) {
    top = top || 10;
    if (!m) return 'Open with any set or run of 1 to 4 cards.';
    const k = m.size, opts = [];
    if (m.type === 'set') {
      if (m.top < top) opts.push(k === 1 ? 'a higher single' : k === 2 ? 'a higher pair' : (k === 3 ? 'three' : 'four') + ' of a higher rank');
    } else {
      opts.push(k === 2 ? 'any pair' : k === 3 ? 'any three of a kind' : 'any four of a kind');
      if (m.top < top) opts.push('a ' + k + '-card run topping out above ' + m.top);
    }
    if (k < 4) opts.push('any move of ' + (k + 1) + '+ cards');
    if (!opts.length) return 'Nothing beats ' + describe(m) + '. Reverse it or kick out.';
    return 'To beat ' + describe(m) + ': ' + opts.join(', or ') + '.';
  }

  function countsOf(hand) { const c = {}; for (const r of hand) c[r] = (c[r] || 0) + 1; return c; }
  function legalPlays(hand, cur, top) {
    const c = countsOf(hand), out = [];
    for (let r = 1; r <= top; r++) for (let k = 1; k <= Math.min(c[r] || 0, 4); k++) out.push(classify(Array(k).fill(r)));
    for (let s = 1; s <= top; s++) for (let len = 2; len <= 4; len++) {
      if (s + len - 1 > top) break;
      let ok = true; for (let r = s; r < s + len; r++) if (!c[r]) { ok = false; break; }
      if (ok) out.push(classify(Array.from({ length: len }, (_, i) => s + i)));
    }
    return out.filter((m) => beats(m, cur));
  }
  // cards that may be taken off a move (reversal or takeback): any card of a set, an end card of a run
  function takeOptions(m) {
    if (!m) return [];
    if (m.type === 'set') return [m.top];
    return m.size === 1 ? [m.top] : [m.cards[0], m.cards[m.size - 1]];
  }
  function without(m, rank) {
    const c = m.cards.slice(); c.splice(c.indexOf(rank), 1);
    return c.length ? classify(c) : null;
  }
  function removeCards(hand, cards) { for (const r of cards) hand.splice(hand.indexOf(r), 1); }

  // ------------------------------------------------------------------ rng
  function rngFrom(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ------------------------------------------------------------------ match
  function newMatch(names, opts) {
    opts = opts || {};
    const n = names.length;
    const g = {
      n, names: names.slice(), bots: opts.bots || names.map((_, i) => i !== 0), rnd: rngFrom(opts.seed || Date.now()),
      top: SETUP[n][0], handSize: SETUP[n][1], countSize: SETUP[n][2],
      rounds: opts.rounds || 3, round: 0, scores: Array(n).fill(0), history: [],
      opener: opts.opener != null ? opts.opener : Math.floor(rngFrom(opts.seed || Date.now())() * n),
      log: [], over: false, you: opts.you != null ? opts.you : -1,
      deal: opts.deal || null // optional fixed first-round deal { hands, counts, aside } (the browser tutorial uses this)
    };
    startRound(g);
    return g;
  }
  function startRound(g) {
    g.round++;
    if (g.deal && g.round === 1) {
      // stamina cards are taken from the end of each counts array
      g.hands = g.deal.hands.map((h) => h.slice().sort((a, b) => a - b));
      g.counts = g.deal.counts.map((c) => c.slice());
      g.aside = g.deal.aside || 0;
    } else {
      const deck = [];
      for (let r = 1; r <= g.top; r++) for (let k = 0; k < 6; k++) deck.push(r);
      shuffle(deck, g.rnd);
      g.hands = []; g.counts = [];
      for (let p = 0; p < g.n; p++) { g.hands.push(deck.splice(0, g.handSize).sort((a, b) => a - b)); g.counts.push(deck.splice(0, g.countSize)); }
      g.aside = deck.length;
    }
    g.status = Array(g.n).fill('in'); g.out = [];
    g.cur = null; g.owner = null; g.touched = false; g.lap = null;
    g.turn = g.opener; g.roundOver = false; g.played = {}; g.lastAction = null;
    // public information: cards face up on the table or in the discard, cards known to be in a hand, face-down discards
    g.seen = {}; g.known = Array.from({ length: g.n }, () => ({})); g.fdDiscard = 0;
    say(g, 'Round ' + g.round + ' of ' + g.rounds + '. ' + V(g, g.opener, 'opens', 'open') + '.', 'round');
    beginTurn(g);
  }
  function say(g, text, kind, who) { if (g.quiet) return; g.log.push({ text, kind: kind || 'info', who: who == null ? null : who, round: g.round }); }
  function active(g) { const a = []; for (let p = 0; p < g.n; p++) if (g.status[p] === 'in') a.push(p); return a; }
  function nextActive(g, p) { for (let k = 1; k <= g.n; k++) { const q = (p + k) % g.n; if (g.status[q] === 'in') return q; } return p; }

  // What the player whose turn it is must do now: 'open' | 'answer' | 'takeback'.
  function beginTurn(g) {
    if (g.roundOver) return;
    const p = g.turn;
    // an orphaned move (its player is out) that has gone all the way round clears
    if (g.cur && g.owner === -1 && g.lap === 0) {
      say(g, 'Nobody answered ' + describe(g.cur) + '. The table clears.', 'info');
      clearTable(g);
    }
    if (g.cur && g.owner === p && !g.touched) { g.phase = 'takeback'; return; }
    g.phase = g.cur ? 'answer' : 'open';
    // no way out: can't beat it and no stamina left
    if (g.phase === 'answer' && !g.counts[p].length && !legalPlays(g.hands[p], g.cur, g.top).length) {
      eliminate(g, p, 'pinned');
      say(g, g.names[p] + ' can’t answer ' + describe(g.cur) + ' with no stamina left: 1, 2, 3, pinned!', 'out', p);
      advance(g, p);
    }
  }
  function clearTable(g) { g.cur = null; g.owner = null; g.touched = false; g.lap = null; }

  function options(g) {
    const p = g.turn, o = { plays: [], reverse: [], kickOut: false, takeback: [] };
    if (g.roundOver || g.over) return o;
    if (g.phase === 'takeback') { o.takeback = takeOptions(g.cur); return o; }
    o.plays = legalPlays(g.hands[p], g.cur, g.top);
    if (g.phase === 'answer' && g.counts[p].length) {
      o.reverse = takeOptions(g.cur);
      o.kickOut = g.n > 2;
    }
    return o;
  }

  // action: {type:'play', cards:[...]} | {type:'reverse', rank} | {type:'kickout'} | {type:'takeback', rank}
  function act(g, a) {
    const p = g.turn, o = options(g), name = g.names[p];
    g.lastAction = { p, a };
    if (a.type === 'takeback') {
      if (!o.takeback.includes(a.rank)) throw new Error('illegal takeback');
      g.hands[p].push(a.rank); g.hands[p].sort((x, y) => x - y); fromTable(g, p, a.rank);
      const rest = without(g.cur, a.rank);
      say(g, 'Nobody touched it, so ' + (g.you === p ? 'you take' : name + ' takes') + ' the ' + a.rank + ' back' + (rest ? '; ' + describe(rest) + ' stays up.' : ' and the table clears.'), 'takeback', p);
      if (rest) { g.cur = rest; g.touched = true; } else clearTable(g);
      return advance(g, p);
    }
    if (a.type === 'play') {
      const m = classify(a.cards);
      if (!m || !o.plays.some((x) => x.type === m.type && x.size === m.size && x.top === m.top)) throw new Error('illegal play');
      removeCards(g.hands[p], m.cards);
      for (const r of m.cards) {
        g.played[r] = (g.played[r] || 0) + 1; g.seen[r] = (g.seen[r] || 0) + 1;
        if (g.known[p][r]) g.known[p][r]--;
      }
      say(g, V(g, p, g.cur ? 'answers with' : 'opens with', g.cur ? 'answer with' : 'open with') + ' ' + describe(m) + '.', 'play', p);
      g.cur = m; g.owner = p; g.touched = false; g.lap = null;
      if (!g.hands[p].length) {
        eliminate(g, p, 'tapped');
        say(g, g.you === p ? 'You played your last card and tap out!' : name + ' played their last card and taps out!', 'out', p);
      }
      return advance(g, p);
    }
    if (a.type === 'reverse') {
      if (!o.reverse.includes(a.rank)) throw new Error('illegal reversal');
      g.counts[p].pop(); g.fdDiscard++;
      g.hands[p].push(a.rank); g.hands[p].sort((x, y) => x - y); fromTable(g, p, a.rank);
      const rest = without(g.cur, a.rank);
      say(g, V(g, p, 'reverses', 'reverse') + ', taking the ' + a.rank + (rest ? '' : ' and clearing the table') + '. ' + countText(g.counts[p].length), 'reverse', p);
      if (rest) { g.cur = rest; g.touched = true; } else clearTable(g);
      if (g.cur && g.owner === -1) g.lap--;
      return advance(g, p);
    }
    if (a.type === 'kickout') {
      if (!o.kickOut) throw new Error('illegal kick out');
      const c = g.counts[p].pop();
      g.hands[p].push(c); g.hands[p].sort((x, y) => x - y);
      say(g, V(g, p, 'kicks out', 'kick out') + '. ' + countText(g.counts[p].length), 'kickout', p);
      if (g.owner === -1) g.lap--;
      return advance(g, p);
    }
    throw new Error('unknown action');
  }
  function fromTable(g, p, r) { g.seen[r]--; g.known[p][r] = (g.known[p][r] || 0) + 1; }
  function V(g, p, third, second) { return g.names[p] + ' ' + (g.you === p ? second : third); }
  function countText(k) { return k === 0 ? 'No stamina left!' : k + ' stamina left.'; }

  function eliminate(g, p, how) {
    g.status[p] = how; g.out.push(p);
    if (g.owner === p && g.cur) { g.owner = -1; g.lap = active(g).length; }
  }
  function advance(g, p) {
    const left = active(g);
    if (left.length <= 1) return endRound(g, left[0]);
    g.turn = nextActive(g, p);
    beginTurn(g);
  }
  function endRound(g, winner) {
    g.roundOver = true;
    if (winner != null) g.out.push(winner);
    const pts = Array(g.n).fill(0);
    g.out.forEach((p, i) => { pts[p] = i + 1; });
    for (let p = 0; p < g.n; p++) g.scores[p] += pts[p];
    g.history.push({ order: g.out.slice(), pts, how: g.status.slice() });
    g.winner = winner;
    say(g, V(g, winner, 'is the last one standing and wins', 'are the last one standing and win') + ' round ' + g.round + '!', 'win', winner);
    g.opener = winner;
    if (g.round >= g.rounds) {
      g.over = true;
      const best = Math.max(...g.scores);
      g.champions = g.scores.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
      say(g, (g.champions.length > 1 ? 'Shared win: ' + g.champions.map((i) => g.names[i]).join(' & ') : V(g, g.champions[0], 'wins', 'win') + ' the match') + ' with ' + best + ' points.', 'win');
    }
  }
  function nextRound(g) { if (!g.over && g.roundOver) startRound(g); }

  // ------------------------------------------------------------------ bots
  // Bots only look at their own hand, the table, and what everyone can see (hand sizes, counts, cards played).
  function cost(m, hand) {
    const c = countsOf(hand); let pen = 0;
    if (m.type === 'set') pen += (c[m.top] - m.size) > 0 ? 2.5 : 0;           // splitting a set
    else for (const r of m.cards) if (c[r] >= 2) pen += 1.5;                  // pulling a card out of a pair
    return m.size * 10 + m.top * (m.type === 'run' ? 0.8 : 1) + pen;
  }
  function cheapest(list, hand) { let b = null, bc = 1e9; for (const m of list) { const k = cost(m, hand); if (k < bc) { bc = k; b = m; } } return b; }
  function botAction(g) {
    const p = g.turn, o = options(g), hand = g.hands[p], rnd = g.rnd;
    if (g.phase === 'takeback') {
      const c = countsOf(hand);
      const pick = o.takeback.slice().sort((a, b) => ((c[b] || 0) + (c[b - 1] || c[b + 1] ? 0.5 : 0) + b / 100) - ((c[a] || 0) + (c[a - 1] || c[a + 1] ? 0.5 : 0) + a / 100))[0];
      return { type: 'takeback', rank: pick };
    }
    const nx = nextActive(g, p), nxCount = g.counts[nx].length, nxHand = g.hands[nx].length;
    const safe = o.plays.filter((m) => m.size < hand.length);
    if (g.phase === 'open') {
      const pool = safe.length ? safe : o.plays;
      // finisher: someone on the ropes is next, so open with something hard to answer
      if (nxCount === 0) {
        const big = pool.filter((m) => m.size >= 3 || (m.size === 2 && m.type === 'set' && m.top >= 8));
        if (big.length && rnd() < 0.75) return { type: 'play', cards: cheapest(big, hand).cards };
      }
      return { type: 'play', cards: cheapest(pool, hand).cards };
    }
    const myCount = g.counts[p].length;
    if (safe.length) {
      const best = cheapest(safe, hand);
      if (nxCount === 0) {
        const big = safe.filter((m) => m.size >= 3);
        if (big.length && rnd() < 0.6) return { type: 'play', cards: cheapest(big, hand).cards };
      }
      // don't burn a big combination on a small move while stamina is healthy
      const escalation = best.size - g.cur.size;
      if (myCount >= 2 && escalation >= 2 && hand.length >= 6 && rnd() < 0.6) return strike(g, o, hand, nxCount);
      if (myCount >= 2 && best.top >= 9 && best.size === g.cur.size && g.cur.size >= 2 && rnd() < 0.35) return strike(g, o, hand, nxCount);
      return { type: 'play', cards: best.cards };
    }
    if (myCount) return strike(g, o, hand, nxCount);
    return { type: 'play', cards: cheapest(o.plays, hand).cards }; // only a hand-emptying play is left: take it
  }
  function strike(g, o, hand, nxCount) {
    if (!o.reverse.length) return { type: 'kickout' };
    const c = countsOf(hand);
    let best = o.reverse[0], val = -1;
    for (const r of o.reverse) { const v = (c[r] ? 1 : (c[r - 1] || c[r + 1]) ? 0.5 : 0.1) + r / 100; if (v > val) { val = v; best = r; } }
    if (!o.kickOut) return { type: 'reverse', rank: best };
    // keep a scary move scary for the next wrestler if they're nearly counted out
    if (g.cur.size >= 2 && nxCount <= 1 && val < 1) return { type: 'kickout' };
    if (val >= 0.5) return { type: 'reverse', rank: best };
    return g.rnd() < 0.5 ? { type: 'reverse', rank: best } : { type: 'kickout' };
  }


  // ------------------------------------------------------------------ the look-ahead bot
  // Before each decision it deals out the cards it can't see in many different ways, consistent with everything that has
  // happened in public (cards played, cards taken back into a hand, hand sizes, counts), plays the rest of the round out
  // with the quick heuristic bots for each candidate move, and picks the move that finishes highest on average.
  // It never looks at hidden cards: other hands, every stamina pile (its own too), face-down discards and the set-aside cards.
  function hiddenPool(g, me) {
    const left = {};
    for (let r = 1; r <= g.top; r++) left[r] = 6;
    const take = (r, k) => { left[r] -= k; };
    for (const r of g.hands[me]) take(r, 1);
    for (const r in g.seen) take(+r, g.seen[r]);
    for (let q = 0; q < g.n; q++) if (q !== me) for (const r in g.known[q]) take(+r, g.known[q][r]);
    const pool = [];
    for (let r = 1; r <= g.top; r++) for (let k = 0; k < left[r]; k++) pool.push(r);
    return pool;
  }
  function determinize(g, me, rnd) {
    const pool = shuffle(hiddenPool(g, me), rnd);
    const h = {
      n: g.n, names: g.names, bots: g.bots, top: g.top, handSize: g.handSize, countSize: g.countSize, rounds: 1, round: 1,
      scores: Array(g.n).fill(0), history: [], opener: g.opener, log: [], quiet: true, over: false, you: -1,
      status: g.status.slice(), out: g.out.slice(), cur: g.cur, owner: g.owner, touched: g.touched, lap: g.lap,
      turn: g.turn, phase: g.phase, roundOver: false, played: {}, seen: {}, known: g.known.map(() => ({})), fdDiscard: 0, aside: g.aside,
      rnd, lastAction: null
    };
    h.hands = g.hands.map((hand, q) => {
      if (q === me) return hand.slice();
      const out = [];
      for (const r in g.known[q]) for (let k = 0; k < g.known[q][r]; k++) out.push(+r);
      while (out.length < hand.length && pool.length) out.push(pool.pop());
      return out.sort((a, b) => a - b);
    });
    h.counts = g.counts.map((c) => c.map(() => pool.length ? pool.pop() : 1));
    return h;
  }
  function cloneSim(h) {
    return Object.assign({}, h, { hands: h.hands.map((x) => x.slice()), counts: h.counts.map((x) => x.slice()), status: h.status.slice(), out: h.out.slice(),
      scores: h.scores.slice(), history: [], known: h.known, seen: {}, played: {}, rnd: rngFrom((h.rnd() * 4294967296) >>> 0) });
  }
  function finish(h, me) { // points `me` scores this round: first out 1 ... last standing n
    let guard = 0;
    while (!h.roundOver && h.status[me] === 'in' && guard++ < 4000) act(h, botAction(h));
    if (h.status[me] !== 'in') return h.out.indexOf(me) + 1;
    return h.n;
  }
  function candidates(g) {
    const o = options(g), hand = g.hands[g.turn], out = [];
    if (g.phase === 'takeback') return o.takeback.map((r) => ({ type: 'takeback', rank: r }));
    const groups = {};
    for (const m of o.plays) { const k = m.type + m.size; (groups[k] = groups[k] || []).push(m); }
    for (const k in groups) groups[k].sort((a, b) => cost(a, hand) - cost(b, hand)).slice(0, 2).forEach((m) => out.push({ type: 'play', cards: m.cards }));
    for (const r of o.reverse) out.push({ type: 'reverse', rank: r });
    if (o.kickOut) out.push({ type: 'kickout' });
    return out;
  }
  function smartAction(g, opts) {
    opts = opts || {};
    const me = g.turn, cands = candidates(g);
    if (cands.length <= 1) return cands[0] || botAction(g);
    const rnd = rngFrom((g.rnd() * 4294967296) >>> 0);
    const total = cands.map(() => 0);
    const samples = opts.samples || 48, deadline = opts.ms ? Date.now() + opts.ms : Infinity;
    let done = 0;
    for (let s = 0; s < samples; s++) {
      const base = determinize(g, me, rnd);
      cands.forEach((a, i) => { const h = cloneSim(base); act(h, a); total[i] += h.roundOver || h.status[me] !== 'in' ? (h.status[me] === 'in' ? h.n : h.out.indexOf(me) + 1) : finish(h, me); });
      done++;
      if (Date.now() > deadline && done >= 12) break;
    }
    let best = 0;
    for (let i = 1; i < cands.length; i++) if (total[i] > total[best]) best = i;
    return cands[best];
  }

  const API = { smartAction, hiddenPool, SETUP, classify, beats, describe, beatHint, legalPlays, takeOptions, newMatch, options, act, botAction, nextRound, active, nextActive };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.DFTC = API;
})(typeof window !== 'undefined' ? window : this);
