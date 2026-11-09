/* Sentai — rules engine and bots. Runs in the browser (window.Sentai) and in node
   (module.exports), so bot-only games can be checked headless: node sim.js
   Every tunable number lives in RULES. */
(function (root) {
  'use strict';
  const RULES = {
    ranks: 12,                          // each color runs 1–12
    colorsFor: (n) => n + 1,            // colors in play = Heroes + 1
    hand: 14,                           // cards dealt to each Hero
    maxAdd: 2,                          // cards a Hero may add per turn
    actDraws: { 2: [3, 3, 4], 3: [3, 4, 5], 4: [4, 4, 4] },   // Boss cards drawn from each act
    // Boss deck: per act, [type, [need with 2, 3, 4 Heroes], name]
    boss: [
      [['run', [2, 2, 3], 'Cog Grunts'], ['run', [2, 2, 2], 'Rust Rats'], ['color', [2, 2, 3], 'Inkbats'],
       ['color', [2, 2, 2], 'Static Swarm'], ['set', [2, 2, 3], 'Gum Golem'], ['set', [2, 2, 2], 'Pin Mites']],
      [['run', [3, 3, 4], 'Tiderazor'], ['run', [3, 3, 4], 'Lanternjaw'], ['color', [2, 3, 4], 'Copper Kraken'],
       ['color', [3, 3, 4], 'Thornbeak'], ['set', [2, 2, 3], 'Voltmoth'], ['set', [2, 2, 3], 'Twin Oni']],
      [['run', [4, 4, 6], 'Megalith Rex'], ['run', [3, 4, 5], 'Ironhorn Titan'], ['color', [3, 5, 6], 'Starmaw'],
       ['color', [3, 4, 5], 'Doom Pagoda'], ['set', [3, 3, 4], 'Eclipse Wyrm'], ['set', [2, 2, 3], 'Emperor Gorvax']],
    ],
  };
  const COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Pink'];
  const TYPE = { run: 'Run', set: 'Set', color: 'Color' };
  const BOT_NAMES = ['Kenji', 'Aiko', 'Rio', 'Sora', 'Hana', 'Jun', 'Mika', 'Taro', 'Yumi', 'Ren'];
  const rnd = Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cardName = (c) => COLORS[c.c] + ' ' + c.r;

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
      this.hands = this.players.map((_, i) => deck.slice(i * RULES.hand, (i + 1) * RULES.hand).sort((a, b) => a.c - b.c || a.r - b.r));
      this.boxed = deck.length - this.N * RULES.hand;
      // rising Boss stack: Act I on top
      this.stack = [];
      RULES.actDraws[this.N].forEach((k, a) => {
        const pool = RULES.boss[a].map(([type, need, name], i) => ({ act: a, type, need: need[this.N - 2], name, key: a * 6 + i }));
        shuffle(pool).slice(0, k).forEach((b) => this.stack.push(b));
      });
      this.total = this.stack.length;
      this.done = 0; this.misses = 0; this.first = Math.floor(rnd() * this.N);
      this.log = []; this.hist = []; this.result = null; this.lastEnc = null; this.outcome = null;
      this.startEncounter();
    }
    say(m) { this.log.push(m); if (this.log.length > 80) this.log.shift(); }
    over() { return this.phase === 'over'; }

    startEncounter() {
      const boss = this.stack[this.done];
      const order = []; for (let k = 0; k < this.N; k++) order.push((this.first + this.done + k) % this.N);
      this.enc = { boss, st: { type: boss.type, cards: [] }, order, at: 0, plays: [] };
      this.phase = 'build';
      this.say('Act ' + ['I', 'II', 'III'][boss.act] + ': ' + boss.name + ' appears. It wants a ' + TYPE[boss.type] + ' of ' + boss.need + '.');
    }
    turnSeat() { return this.phase === 'build' ? this.enc.order[this.enc.at] : -1; }
    need() { return this.enc.boss.need - this.enc.st.cards.length; }
    legalIds(seat) {
      if (this.phase !== 'build' || seat !== this.turnSeat()) return [];
      return this.hands[seat].filter((c) => fits(this.enc.st, c)).map((c) => c.id);
    }

    act(seat, a) {
      a = a || {};
      if (this.phase === 'build') {
        if (seat !== this.turnSeat()) return { ok: false, error: 'Wait for ' + this.players[this.turnSeat()].name + '.' };
        const hand = this.hands[seat];
        if (a.type === 'pass') {
          this.enc.plays.push({ seat, pass: true });
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
        this.enc.plays.push({ seat, cards: picked });
        this.say(this.players[seat].name + ' adds ' + picked.map(cardName).join(' and ') + '.');
        if (!this.hands[seat].length) return this.lose(seat, 'played their last card'), { ok: true };
        if (this.need() <= 0) { this.resolve(); return { ok: true }; }
        this.nextTurn(); return { ok: true };
      }
      if (this.phase === 'discard') {
        if (!this.pendingDiscard.includes(seat)) return { ok: false, error: 'You already discarded.' };
        if (a.type !== 'discard') return { ok: false, error: 'Discard a card.' };
        const c = this.hands[seat].find((x) => x.id === (a.card | 0));
        if (!c) return { ok: false, error: 'You don’t have that card.' };
        this.hands[seat] = this.hands[seat].filter((x) => x !== c);
        this.pendingDiscard = this.pendingDiscard.filter((s) => s !== seat);
        this.result.discards[seat] = c;
        if (!this.pendingDiscard.length) this.afterDiscards();
        return { ok: true };
      }
      if (this.phase === 'result' && a.type === 'next') { this.advance(); return { ok: true }; }
      return { ok: false, error: 'Not now.' };
    }
    nextTurn() {
      this.enc.at++;
      if (this.enc.at >= this.N) this.resolve();
    }
    resolve() {
      const met = this.need() <= 0;
      this.lastEnc = { boss: this.enc.boss, cards: this.enc.st.cards.slice(), plays: this.enc.plays.slice(), met };
      this.result = { met, discards: {} };
      this.hist.push(met);
      if (met) {
        this.say('Combo complete! ' + this.enc.boss.name + ' is defeated.');
        this.phase = 'result';
        return;
      }
      this.misses++;
      this.say('The combo falls short. Every Hero discards a card.');
      this.pendingDiscard = this.players.map((_, i) => i);
      this.phase = 'discard';
    }
    afterDiscards() {
      const down = this.hands.findIndex((h) => !h.length);
      if (down >= 0) return this.lose(down, 'discarded their last card');
      this.phase = 'result';
    }
    advance() {
      this.done++;
      if (this.done >= this.total) {
        this.phase = 'over'; this.outcome = { win: true };
        this.say('The last monster falls. The squad wins!');
        return;
      }
      this.startEncounter();
    }
    lose(seat, how) {
      if (this.enc && this.enc.st.cards.length && !this.lastEnc) this.lastEnc = { boss: this.enc.boss, cards: this.enc.st.cards.slice(), plays: this.enc.plays.slice(), met: false };
      this.phase = 'over'; this.outcome = { win: false, seat, how };
      this.say(this.players[seat].name + ' ' + how + '. The Boss wins.');
    }

    /* what one seat may see */
    view(seat) {
      const turn = this.turnSeat();
      return {
        seat, phase: this.phase, colors: this.colors, total: this.total, done: this.done, misses: this.misses,
        boxed: this.boxed, maxAdd: RULES.maxAdd,
        players: this.players.map((p, i) => ({ name: p.name, bot: p.bot, hero: p.hero, count: this.hands[i].length,
          needsDiscard: this.phase === 'discard' && this.pendingDiscard.includes(i) })),
        hand: this.hands[seat].slice(),
        turn, legal: this.legalIds(seat),
        enc: this.phase === 'over' && !this.enc ? null : this.enc && {
          boss: this.enc.boss, cards: this.enc.st.cards.slice(), need: this.need(), order: this.enc.order.slice(), at: this.enc.at,
          plays: this.enc.plays.map((p) => ({ seat: p.seat, pass: !!p.pass, n: p.cards ? p.cards.length : 0 })),
          type: this.enc.st.type, rank: this.enc.st.rank, color: this.enc.st.color, lo: this.enc.st.lo, hi: this.enc.st.hi,
        },
        result: this.result && (this.phase === 'result' || this.phase === 'discard' || this.phase === 'over') ? {
          met: this.result.met,
          discarded: Object.keys(this.result.discards).map(Number),
          myDiscard: this.result.discards[seat] || null,
        } : null,
        hist: this.hist.slice(), upcoming: this.stack.slice(this.done + 1).map((b) => b.act),
        acts: RULES.actDraws[this.N],
        outcome: this.outcome, log: this.log.slice(-16),
      };
    }

    /* ---------- bots ---------- */
    botDelay() { return this.phase === 'result' ? 2200 : this.phase === 'discard' ? 700 : 1000; }
    botStep() {
      if (this.phase === 'build') {
        const s = this.turnSeat(); if (!this.players[s].bot) return false;
        const ids = this.botPlay(s);
        this.act(s, ids.length ? { type: 'add', cards: ids } : { type: 'pass' });
        return true;
      }
      if (this.phase === 'discard') {
        const s = this.pendingDiscard.find((x) => this.players[x].bot);
        if (s == null) return false;
        this.act(s, { type: 'discard', card: Game.worst(this.hands[s]).id });
        return true;
      }
      if (this.phase === 'result') { this.advance(); return true; }
      return false;
    }
    static worst(hand) { let w = hand[0], wu = 1e9; for (const c of hand) { const u = usefulness(c, hand); if (u < wu) { wu = u; w = c; } } return w; }
    /* Bot: pass when the combo can't be finished or when teammates can cover and I can't spare cards;
       otherwise add the cheapest cards that fit. */
    botPlay(s) {
      const hand = this.hands[s], st = this.enc.st, need = this.need();
      if (!hand.some((c) => fits(st, c))) return [];
      const later = this.enc.order.slice(this.enc.at + 1);
      const laterCap = later.reduce((t, q) => t + Math.min(RULES.maxAdd, Math.max(0, this.hands[q].length - 1)), 0);
      const myCap = Math.min(RULES.maxAdd, hand.length - 1);
      if (myCap <= 0 || need > myCap + laterCap) return [];
      const left = this.total - this.done;
      let want = Math.min(RULES.maxAdd, need);
      if (hand.length - want < left && laterCap >= need - 1) want = 1;
      want = Math.min(want, myCap);
      const out = [], t = copyState(st); let h = hand.slice();
      for (let k = 0; k < want; k++) {
        let legal = h.filter((c) => fits(t, c));
        if (!legal.length) break;
        let c;
        if (!t.cards.length) {
          const best = Math.max(...legal.map((x) => potential(h, t, x)));
          legal = legal.filter((x) => potential(h, t, x) === best);
          c = legal[Math.floor(rnd() * legal.length)];
        } else c = Game.worst(legal.length > 1 ? legal : legal);
        add(t, c); out.push(c.id); h = h.filter((x) => x !== c);
      }
      return out;
    }
  }

  const api = { RULES, COLORS, TYPE, BOT_NAMES, Game, fits, cardName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sentai = api;
})(typeof window !== 'undefined' ? window : globalThis);
