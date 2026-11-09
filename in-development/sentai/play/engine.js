/* Sentai — rules engine and bots. Runs in the browser (window.Sentai) and in node
   (module.exports), so bot-only games can be checked headless: node sim.js
   Every tunable number lives in RULES. */
(function (root) {
  'use strict';
  const RULES = {
    ranks: 12,                          // each color runs 1–12
    colorsFor: (n) => n + 1,            // colors in play = Heroes + 1
    hand: 15,                           // cards dealt to each Hero
    missDiscard: 2,                     // cards each Hero discards when a combo falls short
    order: 'line',                      // 'line': every monster face up in a fixed order · 'pick': the lead picks from the act
    maxAdd: 2,                          // cards a Hero may add per turn
    lookahead: 24,                      // imagined deals a bot plays out before each move
    actDraws: { 2: [3, 3, 4], 3: [3, 4, 5], 4: [4, 4, 4] },   // Boss cards dealt face up for each act
    // Boss deck: per act, [type, [need with 2, 3, 4 Heroes], name]
    boss: [
      [['run', [2, 2, 3], 'Cog Grunts'], ['run', [2, 2, 2], 'Rust Rats'], ['color', [2, 3, 3], 'Inkbats'],
       ['color', [2, 2, 2], 'Static Swarm'], ['set', [3, 3, 3], 'Gum Golem'], ['set', [2, 2, 2], 'Pin Mites']],
      [['run', [3, 3, 4], 'Tiderazor'], ['run', [3, 3, 4], 'Lanternjaw'], ['color', [2, 3, 4], 'Copper Kraken'],
       ['color', [3, 3, 4], 'Thornbeak'], ['set', [2, 2, 3], 'Voltmoth'], ['set', [2, 2, 3], 'Twin Oni']],
      [['run', [4, 4, 6], 'Megalith Rex'], ['run', [3, 4, 5], 'Ironhorn Titan'], ['color', [3, 5, 5], 'Starmaw'],
       ['color', [3, 4, 5], 'Doom Pagoda'], ['set', [2, 3, 4], 'Eclipse Wyrm'], ['set', [2, 2, 4], 'Emperor Gorvax']],
    ],
  };
  const COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Pink'];
  const TYPE = { run: 'Run', set: 'Set', color: 'Color' };
  const BOT_NAMES = ['Kenji', 'Aiko', 'Rio', 'Sora', 'Hana', 'Jun', 'Mika', 'Taro', 'Yumi', 'Ren'];
  const rnd = Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cardName = (c) => COLORS[c.c] + ' ' + c.r;
  const byCard = (a, b) => a.c - b.c || a.r - b.r;

  /* ---------- combo rules ---------- */
  function fits(st, c) {
    if (!st.cards.length) return true;
    if (st.type === 'set') return c.r === st.rank;
    if (st.type === 'color') return c.c === st.color;
    return (c.r === st.lo - 1 || c.r === st.hi + 1);
  }
  function add(st, c) {
    if (!st.cards.length) { st.rank = c.r; st.color = c.c; st.lo = st.hi = c.r; }
    else { st.lo = Math.min(st.lo, c.r); st.hi = Math.max(st.hi, c.r); }
    st.cards.push(c);
  }
  const copyState = (st) => Object.assign({}, st, { cards: st.cards.slice() });
  function usefulness(card, hand) {
    let u = 0;
    for (const c of hand) if (c !== card && (c.r === card.r || c.c === card.c || Math.abs(c.r - card.r) === 1)) u++;
    return u;
  }
  function potential(hand, st, card) {
    const t = copyState(st); add(t, card);
    let k = 0; for (const c of hand) if (c !== card && fits(t, c)) k++;
    return k;
  }

  function coverage(cards, type) { // the biggest combo of this type these cards could make
    const m = {};
    if (type === 'run') { const rs = new Set(cards.map((c) => c.r)); let best = 0, run = 0; for (let r = 1; r <= RULES.ranks; r++) { run = rs.has(r) ? run + 1 : 0; best = Math.max(best, run); } return best; }
    for (const c of cards) { const k = type === 'set' ? c.r : c.c; m[k] = (m[k] || 0) + 1; }
    return Math.max(0, ...Object.values(m));
  }

  class Game {
    constructor(players, opts) {
      this.R = RULES;
      this.N = players.length;
      this.players = players.map((p, i) => ({ name: p.name, bot: !!p.bot, hero: i }));
      this.colors = RULES.colorsFor(this.N);
      let id = 0;
      const deck = [];
      for (let c = 0; c < this.colors; c++) for (let r = 1; r <= RULES.ranks; r++) deck.push({ id: id++, c, r });
      shuffle(deck);
      this.hands = this.players.map((_, i) => deck.slice(i * RULES.hand, (i + 1) * RULES.hand).sort(byCard));
      this.boxed = deck.length - this.N * RULES.hand;
      this.box = deck.slice(this.N * RULES.hand);   // never seen in play
      this.known = this.players.map(() => []);      // cards everyone saw bounce back to each Hero
      // each act: its Boss cards are drawn, then dealt face up when the act begins
      this.acts = RULES.actDraws[this.N].map((k, a) =>
        shuffle(RULES.boss[a].map(([type, need, name], i) => ({ act: a, type, need: need[this.N - 2], name, key: a * 6 + i }))).slice(0, k));
      this.total = this.acts.reduce((t, x) => t + x.length, 0);
      this.actNo = 0; this.row = this.acts[0].slice();
      this.done = 0; this.fights = 0; this.misses = 0; this.hist = [];
      this.lead = Math.floor(rnd() * this.N);
      this.log = []; this.result = null; this.outcome = null; this.enc = null;
      this.mode = (opts && opts.order) || RULES.order;
      this.simple = !!(opts && opts.simple);           // true: the old one-step bots
      if (this.mode === 'line') { this.say('The monsters line up: ' + this.acts.flat().map((b) => b.name).join(', ') + '.'); this.startFight(this.row[0]); }
      else { this.say('Act I begins: ' + this.row.map((b) => b.name).join(', ') + '.'); this.phase = 'pick'; }
    }
    upcoming() { return this.row.filter((b) => !this.enc || b !== this.enc.boss).concat(...this.acts.slice(this.actNo + 1)); }
    say(m) { this.log.push(m); if (this.log.length > 80) this.log.shift(); }
    over() { return this.phase === 'over'; }

    startFight(boss) {
      const order = []; for (let k = 0; k < this.N; k++) order.push((this.lead + k) % this.N);
      this.enc = { boss, st: { type: boss.type, cards: [] }, order, at: 0, plays: [] };
      this.phase = 'build'; this.result = null;
      this.say(this.mode === 'line' ? boss.name + ' attacks: it wants a ' + TYPE[boss.type] + ' of ' + boss.need + '. ' + this.players[this.lead].name + ' leads.'
        : this.players[this.lead].name + ' picks ' + boss.name + ': a ' + TYPE[boss.type] + ' of ' + boss.need + '.');
    }
    turnSeat() { return this.phase === 'build' ? this.enc.order[this.enc.at] : this.phase === 'pick' ? this.lead : -1; }
    need() { return this.enc.boss.need - this.enc.st.cards.length; }
    legalIds(seat) {
      if (this.phase !== 'build' || seat !== this.turnSeat()) return [];
      return this.hands[seat].filter((c) => fits(this.enc.st, c)).map((c) => c.id);
    }
    forget(seat, ids) { this.known[seat] = this.known[seat].filter((c) => !ids.includes(c.id)); }

    act(seat, a) {
      a = a || {};
      if (this.phase === 'pick') {
        if (seat !== this.lead) return { ok: false, error: this.players[this.lead].name + ' picks the next monster.' };
        const boss = this.row.find((b) => b.key === (a.key | 0));
        if (a.type !== 'pick' || !boss) return { ok: false, error: 'Pick a monster from the row.' };
        this.startFight(boss); return { ok: true };
      }
      if (this.phase === 'build') {
        if (seat !== this.turnSeat()) return { ok: false, error: 'Wait for ' + this.players[this.turnSeat()].name + '.' };
        const hand = this.hands[seat];
        if (a.type === 'pass') {
          this.enc.plays.push({ seat, pass: true, cards: [] });
          this.say(this.players[seat].name + ' passes.');
          this.nextTurn(); return { ok: true };
        }
        if (a.type !== 'add') return { ok: false, error: 'Add cards or pass.' };
        const ids = (a.cards || []).map((x) => x | 0);
        if (!ids.length || ids.length > RULES.maxAdd) return { ok: false, error: 'Add 1 or 2 cards.' };
        if (new Set(ids).size !== ids.length) return { ok: false, error: 'Pick different cards.' };
        if (ids.length > this.need()) return { ok: false, error: 'The combo only needs ' + this.need() + ' more.' };
        const st = copyState(this.enc.st), picked = [];
        for (const id of ids) {
          const c = hand.find((x) => x.id === id);
          if (!c) return { ok: false, error: 'You don’t have that card.' };
          if (!fits(st, c)) return { ok: false, error: cardName(c) + ' doesn’t fit the combo.' };
          add(st, c); picked.push(c);
        }
        this.enc.st = st;
        this.hands[seat] = hand.filter((c) => !ids.includes(c.id));
        this.forget(seat, ids);
        this.enc.plays.push({ seat, cards: picked });
        this.say(this.players[seat].name + ' adds ' + picked.map(cardName).join(' and ') + '.');
        if (this.need() <= 0) {
          if (!this.hands[seat].length) return this.lose(seat, 'played their last card'), { ok: true };
          this.resolve(); return { ok: true };
        }
        this.nextTurn(); return { ok: true };
      }
      if (this.phase === 'discard') {
        if (!this.pendingDiscard.includes(seat)) return { ok: false, error: 'You already discarded.' };
        if (a.type !== 'discard') return { ok: false, error: 'Discard ' + this.discardCount(seat) + ' cards.' };
        const ids = [...new Set((a.cards || []).map((x) => x | 0))];
        if (ids.length !== this.discardCount(seat)) return { ok: false, error: 'Discard ' + this.discardCount(seat) + ' card' + (this.discardCount(seat) === 1 ? '' : 's') + '.' };
        const cs = ids.map((id) => this.hands[seat].find((x) => x.id === id));
        if (cs.some((c) => !c)) return { ok: false, error: 'You don’t have that card.' };
        this.hands[seat] = this.hands[seat].filter((x) => !ids.includes(x.id));
        this.forget(seat, ids);
        this.pendingDiscard = this.pendingDiscard.filter((s) => s !== seat);
        this.result.discards[seat] = cs;
        if (!this.pendingDiscard.length) this.afterDiscards();
        return { ok: true };
      }
      if (this.phase === 'result' && a.type === 'next') { this.advance(); return { ok: true }; }
      return { ok: false, error: 'Not now.' };
    }
    discardCount(seat) { return Math.min(RULES.missDiscard, this.hands[seat].length); }
    nextTurn() {
      this.enc.at++;
      if (this.enc.at >= this.N) this.resolve();
    }
    resolve() {
      const met = this.need() <= 0;
      this.fights++; this.hist.push({ key: this.enc.boss.key, met });
      this.result = { met, discards: {}, bounced: [] };
      this.row = this.row.filter((b) => b !== this.enc.boss);   // beaten or not, the monster leaves
      if (met) {
        this.done++;
        this.say('Combo complete! ' + this.enc.boss.name + ' is defeated.');
        this.phase = 'result';
        return;
      }
      this.misses++;
      // the combo falls apart: every card goes back to the Hero who played it, face up for all to see
      for (const p of this.enc.plays) if (p.cards.length) {
        this.hands[p.seat] = this.hands[p.seat].concat(p.cards).sort(byCard);
        this.known[p.seat] = this.known[p.seat].concat(p.cards).sort(byCard);
        this.result.bounced.push({ seat: p.seat, cards: p.cards });
      }
      this.enc.st = { type: this.enc.st.type, cards: [] };
      this.say('The combo falls short. ' + this.enc.boss.name + ' gets away. The cards go back to their Heroes, and every Hero discards ' + RULES.missDiscard + '.');
      this.pendingDiscard = this.players.map((_, i) => i);
      this.phase = 'discard';
    }
    afterDiscards() {
      for (let i = 0; i < this.N; i++) if (this.result.discards[i]) this.say(this.players[i].name + ' discards ' + this.result.discards[i].map(cardName).join(' and ') + '.');
      const down = this.hands.findIndex((h) => !h.length);
      if (down >= 0) return this.lose(down, 'discarded their last card');
      this.phase = 'result';
    }
    advance() {
      this.lead = (this.lead + 1) % this.N;
      if (!this.row.length) {
        this.actNo++;
        if (this.actNo >= this.acts.length) {
          this.phase = 'over'; this.outcome = { win: true };
          this.say('The last monster falls. The squad wins!');
          return;
        }
        this.row = this.acts[this.actNo].slice();
        this.say('Act ' + ['I', 'II', 'III'][this.actNo] + ' begins.');
      }
      this.enc = null; this.result = null;
      if (this.mode === 'line') this.startFight(this.row[0]); else this.phase = 'pick';
    }
    lose(seat, how) {
      this.phase = 'over'; this.outcome = { win: false, seat, how };
      this.say(this.players[seat].name + ' ' + how + '. The Boss wins.');
    }

    /* what one seat may see */
    view(seat) {
      const turn = this.turnSeat();
      const e = this.enc;
      return {
        seat, phase: this.phase, colors: this.colors, total: this.total, done: this.done, misses: this.misses, fights: this.fights,
        boxed: this.boxed, maxAdd: RULES.maxAdd, missDiscard: RULES.missDiscard, act: this.actNo, lead: this.lead,
        players: this.players.map((p, i) => ({ name: p.name, bot: p.bot, hero: p.hero, count: this.hands[i].length,
          known: this.known[i].slice(), needsDiscard: this.phase === 'discard' && this.pendingDiscard.includes(i),
          discardCount: this.phase === 'discard' ? this.discardCount(i) : 0 })),
        hand: this.hands[seat].slice(),
        turn, legal: this.legalIds(seat),
        row: this.row.slice(), upcoming: this.upcoming(), mode: this.mode,
        enc: e && {
          boss: e.boss, cards: e.st.cards.slice(), need: this.need(), order: e.order.slice(), at: e.at,
          plays: e.plays.map((p) => ({ seat: p.seat, pass: !!p.pass, n: p.cards.length })),
          type: e.st.type, rank: e.st.rank, color: e.st.color, lo: e.st.lo, hi: e.st.hi,
        },
        result: this.result && {
          met: this.result.met, bounced: this.result.bounced,
          discards: Object.keys(this.result.discards).map((k) => ({ seat: +k, cards: this.result.discards[k] })),
        },
        acts: this.acts.map((x, a) => ({ n: x.length, cleared: a < this.actNo ? x.length : a === this.actNo ? x.length - this.row.length : 0 })),
        hist: this.hist.slice(),
        outcome: this.outcome, log: this.log.slice(-18),
      };
    }

    /* ---------- bots ---------- */
    botDelay() { return this.phase === 'result' ? 2200 : this.phase === 'discard' ? 700 : this.phase === 'pick' ? 1300 : 1000; }
    botStep() {
      if (this.phase === 'pick') {
        if (!this.players[this.lead].bot) return false;
        this.act(this.lead, { type: 'pick', key: this.botPick(this.lead).key });
        return true;
      }
      if (this.phase === 'build') {
        const s = this.turnSeat(); if (!this.players[s].bot) return false;
        const ids = this.simple ? this.botPlay(s) : chooseBuild(this, s, RULES.lookahead);
        this.act(s, ids.length ? { type: 'add', cards: ids } : { type: 'pass' });
        return true;
      }
      if (this.phase === 'discard') {
        const s = this.pendingDiscard.find((x) => this.players[x].bot);
        if (s == null) return false;
        let out;
        if (this.simple) { let h = this.hands[s].slice(); out = []; for (let k = 0; k < this.discardCount(s); k++) { const w = Game.worst(h); out.push(w.id); h = h.filter((x) => x !== w); } }
        else out = chooseDiscard(this, s, RULES.lookahead);
        this.act(s, { type: 'discard', cards: out });
        return true;
      }
      if (this.phase === 'result') { this.advance(); return true; }
      return false;
    }
    static worst(hand) { let w = hand[0], wu = 1e9; for (const c of hand) { const u = usefulness(c, hand); if (u < wu) { wu = u; w = c; } } return w; }
    /* Bot lead: fight the monster its own hand (plus cards it knows teammates hold) covers best, smaller first. */
    botPick(s) {
      const seen = this.hands[s].concat(...this.known.filter((_, i) => i !== s));
      let best = this.row[0], bs = -1e9;
      for (const b of this.row) {
        const sc = Math.min(coverage(this.hands[s], b.type), 2) + 0.25 * Math.min(coverage(seen, b.type), b.need) - 0.5 * b.need;
        if (sc > bs) { bs = sc; best = b; }
      }
      return best;
    }
    /* Bot: cards that don't complete the combo come back, so add as many as fit (up to 2),
       always keeping one card in hand. */
    botPlay(s) {
      const hand = this.hands[s], st = this.enc.st, need = this.need();
      if (!hand.some((c) => fits(st, c))) return [];
      const want = Math.min(RULES.maxAdd, need, hand.length - 1);
      const out = [], t = copyState(st); let h = hand.slice();
      for (let k = 0; k < want; k++) {
        let legal = h.filter((c) => fits(t, c));
        if (!legal.length) break;
        let c;
        if (!t.cards.length) {
          const best = Math.max(...legal.map((x) => potential(h, t, x)));
          legal = legal.filter((x) => potential(h, t, x) === best);
          c = legal[Math.floor(rnd() * legal.length)];
        } else c = Game.worst(legal);
        add(t, c); out.push(c.id); h = h.filter((x) => x !== c);
      }
      return out;
    }
  }


  /* ---------- look-ahead bots ----------
     Before each play or discard, a bot imagines deals of the cards it can't see (its own hand, the monster line
     and cards it saw come back are all it uses), plays each option out to the end with the simple bot, and keeps
     the option that wins most often. */
  /* ---------- fast combo helpers (same rules as the engine) ---------- */
  function fAdd(st, c) {
    if (!st.n) { st.rank = c.r; st.color = c.c; st.lo = st.hi = c.r; }
    else { if (c.r < st.lo) st.lo = c.r; if (c.r > st.hi) st.hi = c.r; }
    st.n++;
  }
  const fOk = (st, c) => !st.n || (st.type === 'set' ? c.r === st.rank : st.type === 'color' ? c.c === st.color : c.r === st.lo - 1 || c.r === st.hi + 1);
  function fUseful(card, hand) { let u = 0; for (const c of hand) if (c !== card && (c.r === card.r || c.c === card.c || c.r - card.r === 1 || card.r - c.r === 1)) u++; return u; }
  function fWorst(cards, hand) { let w = cards[0], wu = 1e9; for (const c of cards) { const u = fUseful(c, hand); if (u < wu) { wu = u; w = c; } } return w; }
  function fPotential(hand, st, card) {
    const t = { type: st.type, n: st.n, rank: st.rank, color: st.color, lo: st.lo, hi: st.hi }; fAdd(t, card);
    let k = 0; for (const c of hand) if (c !== card && fOk(t, c)) k++; return k;
  }

  /* The simple bot, as a rollout policy: add as many fitting cards as allowed, least useful first. */
  function simplePlay(hand, st, need) {
    let want = Math.min(2, need, hand.length - 1);
    const out = [];
    let h = hand;
    while (want-- > 0) {
      let best = null;
      if (!st.n) { let bp = -1; for (const c of h) { const p = fPotential(h, st, c); if (p > bp) { bp = p; best = c; } } }
      else { const legal = h.filter((c) => fOk(st, c)); if (!legal.length) break; best = fWorst(legal, h); }
      if (!best) break;
      fAdd(st, best); out.push(best); h = h.filter((x) => x !== best);
    }
    return out;
  }
  function simpleDiscard(hand, k) { let h = hand; for (let i = 0; i < k && h.length; i++) { const w = fWorst(h, h); h = h.filter((x) => x !== w); } return h; }

  /* Play a determinized state out to the end. s = { N, hands, line, lead, st, at, plays } where line[0] is
     the monster being fought (st/at/plays describe that fight so far). Returns 1 for a squad win. */
  function rollout(s) {
    const N = s.N, hands = s.hands, line = s.line;
    let lead = s.lead, st = s.st, at = s.at, plays = s.plays, li = s.li || 0;
    while (li < line.length) {
      const m = line[li];
      if (!st) { st = { type: m.type, n: 0 }; at = 0; plays = []; }
      while (at < N && st.n < m.need) {
        const p = (lead + at) % N;
        const h = hands[p];
        if (h.length > 1 && h.some((c) => fOk(st, c))) {
          const cs = simplePlay(h, st, m.need - st.n);
          if (cs.length) { hands[p] = h.filter((x) => !cs.includes(x)); plays.push(p, cs); }
        }
        at++;
      }
      if (st.n >= m.need) {
        for (let i = 0; i < N; i++) if (!hands[i].length) return 0;
      } else {
        for (let i = 0; i < plays.length; i += 2) hands[plays[i]] = hands[plays[i]].concat(plays[i + 1]);
        for (let i = 0; i < N; i++) { hands[i] = simpleDiscard(hands[i], 2); if (!hands[i].length) return 0; }
      }
      li++; lead = (lead + 1) % N; st = null;
    }
    return 1;
  }

  /* A possible deal of the cards this seat can't see, consistent with what it knows. */
  function determinize(g, seat) {
    const knownIds = new Set(); g.known.forEach((k, i) => { if (i !== seat) k.forEach((c) => knownIds.add(c.id)); });
    const pool = [];
    g.hands.forEach((h, i) => { if (i !== seat) for (const c of h) if (!knownIds.has(c.id)) pool.push(c); });
    for (const c of g.box) pool.push(c);
    shuffle(pool);
    let k = 0;
    return g.hands.map((h, i) => {
      if (i === seat) return h.slice();
      const kn = g.known[i].filter((c) => h.some((x) => x.id === c.id));
      const out = kn.slice();
      while (out.length < h.length) out.push(pool[k++]);
      return out;
    });
  }
  const lineOf = (g) => g.row.concat(...g.acts.slice(g.actNo + 1));
  function stOf(e) { const st = { type: e.st.type, n: 0 }; for (const c of e.st.cards) fAdd(st, c); return st; }

  /* Every legal way to add 1 or 2 cards, plus passing. */
  function buildOptions(g, seat) {
    const hand = g.hands[seat], need = g.need(), st = stOf(g.enc), opts = [[]], seen = new Set();
    for (const a of hand) {
      if (!fOk(st, a) || hand.length < 2) continue;
      opts.push([a]);
      if (need < 2 || hand.length < 3) continue;
      const t = Object.assign({}, st); fAdd(t, a);
      for (const b of hand) {
        if (b === a || !fOk(t, b)) continue;
        const key = Math.min(a.id, b.id) + ':' + Math.max(a.id, b.id);
        if (seen.has(key)) continue; seen.add(key); opts.push([a, b]);
      }
    }
    return opts;
  }

  /* Score each option over the same imagined deals; ties go to the simple bot's choice. */
  function chooseBuild(g, seat, samples) {
    const opts = buildOptions(g, seat);
    if (opts.length === 1) return [];
    const simple = g.botPlay(seat);
    const skey = simple.slice().sort().join(',');
    const score = new Float64Array(opts.length);
    const e = g.enc, line = lineOf(g);
    for (let k = 0; k < samples; k++) {
      const deal = determinize(g, seat);
      opts.forEach((o, i) => {
        const hands = deal.slice();
        const st = stOf(e);
        const plays = [];
        e.plays.forEach((p) => { if (p.cards.length) plays.push(p.seat, p.cards); });
        if (o.length) { hands[seat] = hands[seat].filter((c) => !o.includes(c)); for (const c of o) fAdd(st, c); plays.push(seat, o); }
        score[i] += rollout({ N: g.N, hands, line, li: 0, lead: g.lead, st, at: e.at + 1, plays });
      });
    }
    let best = 0;
    opts.forEach((o, i) => {
      const isSimple = o.map((c) => c.id).sort().join(',') === skey;
      const s = score[i] + (isSimple ? 0.5 : 0);
      const b = score[best] + (opts[best].map((c) => c.id).sort().join(',') === skey ? 0.5 : 0);
      if (s > b) best = i;
    });
    return opts[best].map((c) => c.id);
  }

  /* Discards: compare pairs drawn from the least useful cards. */
  function chooseDiscard(g, seat, samples) {
    const hand = g.hands[seat], k = g.discardCount(seat);
    if (hand.length <= k) return hand.map((c) => c.id);
    const ranked = hand.slice().sort((a, b) => fUseful(a, hand) - fUseful(b, hand)).slice(0, 7);
    const opts = [];
    if (k === 1) ranked.forEach((a) => opts.push([a]));
    else for (let i = 0; i < ranked.length; i++) for (let j = i + 1; j < ranked.length; j++) opts.push([ranked[i], ranked[j]]);
    const score = new Float64Array(opts.length);
    const line = lineOf(g);
    for (let s = 0; s < samples; s++) {
      const deal = determinize(g, seat);
      // teammates still to discard do so the simple way
      for (const p of g.pendingDiscard) if (p !== seat) deal[p] = simpleDiscard(deal[p], g.discardCount(p));
      opts.forEach((o, i) => {
        const hands = deal.slice();
        hands[seat] = hands[seat].filter((c) => !o.includes(c));
        if (hands.some((h) => !h.length)) return;
        score[i] += rollout({ N: g.N, hands, line, li: 0, lead: (g.lead + 1) % g.N, st: null });
      });
    }
    let best = 0; opts.forEach((_, i) => { if (score[i] > score[best]) best = i; });
    return opts[best].map((c) => c.id);
  }


  const api = { RULES, COLORS, TYPE, BOT_NAMES, Game, fits, cardName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sentai = api;
})(typeof window !== 'undefined' ? window : globalThis);
