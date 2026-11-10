/* Sentai — rules engine and bots. Runs in the browser (window.Sentai) and in node
   (module.exports), so bot-only games can be checked headless: node sim.js
   Every tunable number lives in RULES. Two Bosses share one engine:
   Emperor Gorvax (a line of monsters, one fight at a time) and Vael, the Hydra
   (two heads out at once, combos that stay put, heads that enrage). */
(function (root) {
  'use strict';
  const RULES = {
    ranks: 12,                          // each color runs 1–12
    colorsFor: (n) => n + 1,            // colors in play = Heroes + 1
    hand: 15,                           // cards dealt to each Hero
    missDiscard: 2,                     // Gorvax: cards each Hero discards when a combo falls short
    strikeDiscard: 2,                   // Vael: cards each Hero discards when an enraged head strikes
    venomDiscard: 3,                    // Vael: ...while a Venom head is out
    maxAdd: 2,                          // cards a Hero may add per turn
    lookahead: 24,                      // imagined deals a bot plays out before each move
    actDraws: { 2: [3, 3, 4], 3: [3, 4, 5], 4: [4, 4, 4] },   // Boss cards drawn for each act
    bosses: {
      gorvax: {
        name: 'Emperor Gorvax',
        // per act: [type, [need with 2, 3, 4 Heroes], name]
        acts: [
          [['run', [2, 2, 3], 'Cog Grunts'], ['run', [2, 2, 2], 'Rust Rats'], ['color', [2, 3, 3], 'Inkbats'],
           ['color', [2, 2, 2], 'Static Swarm'], ['set', [3, 3, 3], 'Gum Golem'], ['set', [2, 2, 2], 'Pin Mites']],
          [['run', [3, 3, 4], 'Tiderazor'], ['run', [3, 3, 4], 'Lanternjaw'], ['color', [2, 3, 4], 'Copper Kraken'],
           ['color', [3, 3, 4], 'Thornbeak'], ['set', [2, 2, 3], 'Voltmoth'], ['set', [2, 2, 3], 'Twin Oni']],
          [['run', [4, 4, 6], 'Megalith Rex'], ['run', [3, 4, 5], 'Ironhorn Titan'], ['color', [3, 5, 5], 'Starmaw'],
           ['color', [3, 4, 5], 'Doom Pagoda'], ['set', [2, 3, 4], 'Eclipse Wyrm'], ['set', [2, 2, 4], 'Emperor Gorvax']],
        ],
      },
      vael: {
        name: 'Vael, the Hydra',
        // per act: [type, [need with 2, 3, 4 Heroes], name, hex]
        acts: [
          [['run', [2, 2, 2], 'Gloomfang', 'thorns'], ['run', [2, 2, 2], 'Mirefang', 'regrow'], ['color', [2, 2, 2], 'Sallowmaw', 'coil'],
           ['color', [2, 2, 2], 'Brineneck', 'hunger'], ['set', [2, 2, 2], 'Hissjaw', 'split'], ['set', [2, 2, 2], 'Ashtongue', 'venom']],
          [['run', [3, 3, 3], 'Thornscale', 'hunger'], ['run', [2, 2, 3], 'Ropeneck', 'split'], ['color', [2, 2, 3], 'Bilefang', 'venom'],
           ['color', [2, 2, 4], 'Coilmaw', 'coil'], ['set', [2, 2, 2], 'Gravejaw', 'thorns'], ['set', [2, 2, 2], 'Smokeneck', 'regrow']],
          [['run', [3, 4, 6], 'Crownfang', 'venom'], ['run', [3, 3, 5], 'Doomcoil', 'coil'], ['color', [2, 4, 4], 'Nightmaw', 'hunger'],
           ['color', [2, 3, 4], 'Wyrmspite', 'split'], ['set', [2, 3, 4], 'Old Fang', 'regrow'], ['set', [2, 2, 4], 'Hexmother', 'thorns']],
        ],
      },
    },
  };
  const HEX = {
    hunger: { name: 'Hunger', text: 'At the end of each round, the Hero with the most cards discards 1.' },
    venom: { name: 'Venom', text: 'A strike costs every Hero 3 cards instead of 2.' },
    coil: { name: 'Coil', text: 'Every Hero adds at most 1 card a turn.' },
    split: { name: 'Split', text: 'No Hero may add to the same head as the Hero just before them.' },
    thorns: { name: 'Thorns', text: 'The lead can’t pass if they can add a card.' },
    regrow: { name: 'Regrow', text: 'When this head is cut, the head that grows here needs 1 more card.' },
  };
  // one Hero card per robot part; index = Hero color
  const POWERS = [
    { key: 'command', name: 'Command', kind: 'Passive', text: 'When you’re the lead, you may add up to 3 cards.' },
    { key: 'riptide', name: 'Riptide', kind: 'Once a game', text: 'When the squad would discard, nobody does.' },
    { key: 'overcharge', name: 'Overcharge', kind: 'Once a game', text: 'One card you add fits the combo, whatever its rank and color.' },
    { key: 'steady', name: 'Steady', kind: 'Passive', text: 'Whenever the squad discards, you discard 1 fewer.' },
    { key: 'beacon', name: 'Beacon', kind: 'Once an act', text: 'On your turn, show one card from your hand to everyone.' },
  ];
  const COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Pink'];
  const TYPE = { run: 'Run', set: 'Set', color: 'Color' };
  const ACTN = ['I', 'II', 'III'];
  const BOT_NAMES = ['Kenji', 'Aiko', 'Rio', 'Sora', 'Hana', 'Jun', 'Mika', 'Taro', 'Yumi', 'Ren'];
  const rnd = Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const cardName = (c) => COLORS[(c.real || c).c] + ' ' + (c.real || c).r;
  const byCard = (a, b) => a.c - b.c || a.r - b.r;

  /* ---------- combos ---------- */
  // a combo: { type, n, rank, color, lo, hi }  (the cards themselves are kept beside it)
  const newCombo = (type) => ({ type, n: 0 });
  const fitsC = (st, c) => !st.n || (st.type === 'set' ? c.r === st.rank : st.type === 'color' ? c.c === st.color : c.r === st.lo - 1 || c.r === st.hi + 1);
  function addC(st, c) {
    if (!st.n) { st.rank = c.r; st.color = c.c; st.lo = st.hi = c.r; }
    else { if (c.r < st.lo) st.lo = c.r; if (c.r > st.hi) st.hi = c.r; }
    st.n++;
  }
  const copyC = (st) => ({ type: st.type, n: st.n, rank: st.rank, color: st.color, lo: st.lo, hi: st.hi });
  // what a wild card becomes on this combo (null if it can't be wild here)
  function wildAs(st, c) {
    if (!st.n) return null;
    if (st.type === 'set') return { r: st.rank, c: c.c };
    if (st.type === 'color') return { r: c.r, c: st.color };
    if (st.hi < RULES.ranks) return { r: st.hi + 1, c: c.c };
    if (st.lo > 1) return { r: st.lo - 1, c: c.c };
    return null;
  }
  // public helper for the page: does card c fit a combo shaped like the view's combo?
  function fits(e, c) { const st = { type: e.type, n: e.cards ? e.cards.length : e.n, rank: e.rank, color: e.color, lo: e.lo, hi: e.hi }; return fitsC(st, c); }

  /* ---------- small card heuristics, shared by every bot ---------- */
  function useful(card, hand) { let u = 0; for (const c of hand) if (c !== card && (c.r === card.r || c.c === card.c || c.r - card.r === 1 || card.r - c.r === 1)) u++; return u; }
  function worst(cards, hand) { let w = cards[0], wu = 1e9; for (const c of cards) { const u = useful(c, hand); if (u < wu) { wu = u; w = c; } } return w; }
  function potential(hand, st, card) { const t = copyC(st); addC(t, card); let k = 0; for (const c of hand) if (c !== card && fitsC(t, c)) k++; return k; }
  /* The simple bot's way to add cards: best-connected card to start, least useful card to extend. */
  function simplePlay(hand, st, want) {
    const out = []; let h = hand;
    while (want-- > 0) {
      let best = null;
      if (!st.n) { let bp = -1; for (const c of h) { const p = potential(h, st, c); if (p > bp) { bp = p; best = c; } } }
      else { const legal = h.filter((c) => fitsC(st, c)); if (!legal.length) break; best = worst(legal, h); }
      if (!best) break;
      addC(st, best); out.push(best); h = h.filter((x) => x !== best);
    }
    return out;
  }
  function simpleDiscard(hand, k) { let h = hand; for (let i = 0; i < k && h.length; i++) { const w = worst(h, h); h = h.filter((x) => x !== w); } return h; }
  const HEXW = { hunger: 6, venom: 5, coil: 4, split: 3, thorns: 2, regrow: -2 };

  /* The simple Hydra policy, on plain data. s: { N, hands, slots, lead, at, lastHead, cmd }
     Returns { head, cards } or null to pass. */
  function hydraPick(s, p, mustAdd) {
    const hand = s.hands[p];
    if (hand.length < 2) return null;
    const coil = s.slots.some((x) => x && x.m.hex === 'coil'), split = s.slots.some((x) => x && x.m.hex === 'split');
    const max = coil ? 1 : (s.cmd === p && p === s.lead ? 3 : RULES.maxAdd);
    const atIdx = (p - s.lead + s.N) % s.N;
    let laterCap = 0; for (let k = atIdx + 1; k < s.N; k++) laterCap += Math.min(coil ? 1 : RULES.maxAdd, Math.max(0, s.hands[(s.lead + k) % s.N].length - 1));
    let best = null, bs = -1e9;
    s.slots.forEach((x, h) => {
      if (!x || x.st.n >= x.m.need || (split && s.lastHead === h)) return;
      if (!hand.some((c) => fitsC(x.st, c))) return;
      const rem = x.m.need - x.st.n, can = Math.min(max, rem, hand.length - 1);
      if (can <= 0) return;
      const nextRound = x.enr ? 0 : s.N * (coil ? 1 : RULES.maxAdd);
      if (!mustAdd && rem > can + laterCap + nextRound) return;      // can't be finished in time: don't feed it
      const sc = (rem <= can ? 100 : 0) + (x.enr ? 40 : 0) + HEXW[x.m.hex] - rem;
      if (sc > bs) { bs = sc; best = { head: h, can }; }
    });
    if (!best) return null;
    const st = copyC(s.slots[best.head].st);
    const cards = simplePlay(hand, st, best.can);
    return cards.length ? { head: best.head, cards } : null;
  }

  class Game {
    constructor(players, opts) {
      opts = opts || {};
      this.R = RULES;
      this.N = players.length;
      this.boss = RULES.bosses[opts.boss] ? opts.boss : 'gorvax';
      this.powers = !!+opts.powers;
      this.simple = !!opts.simple;
      const heroes = this.powers ? shuffle([0, 1, 2, 3, 4]).slice(0, this.N) : players.map((_, i) => i);
      this.players = players.map((p, i) => ({ name: p.name, bot: !!p.bot, hero: heroes[i] }));
      this.used = { riptide: false, overcharge: false }; this.beaconAct = -1;
      this.colors = RULES.colorsFor(this.N);
      let id = 0;
      const deck = [];
      for (let c = 0; c < this.colors; c++) for (let r = 1; r <= RULES.ranks; r++) deck.push({ id: id++, c, r });
      shuffle(deck);
      this.hands = this.players.map((_, i) => deck.slice(i * RULES.hand, (i + 1) * RULES.hand).sort(byCard));
      this.box = deck.slice(this.N * RULES.hand);          // never seen in play
      this.boxed = this.box.length;
      this.known = this.players.map(() => []);             // cards everyone has seen each Hero holding
      const B = RULES.bosses[this.boss], keyBase = this.boss === 'vael' ? 18 : 0;
      this.acts = RULES.actDraws[this.N].map((k, a) =>
        shuffle(B.acts[a].map(([type, need, name, hex], i) => ({ act: a, type, need: need[this.N - 2], name, hex: hex || null, key: keyBase + a * 6 + i }))).slice(0, k));
      this.total = this.acts.reduce((t, x) => t + x.length, 0);
      this.actNo = 0; this.done = 0; this.fights = 0; this.misses = 0; this.hist = [];
      this.lead = Math.floor(rnd() * this.N);
      this.log = []; this.result = null; this.outcome = null; this.enc = null; this.penalty = null;
      this.seen = new Set();
      if (this.boss === 'vael') {
        this.pile = this.acts[0].slice(); this.slots = [null, null]; this.regrow = [false, false];
        this.say('Vael rises. Act I begins.');
        this.grow(); this.startRound();
      } else {
        this.row = this.acts[0].slice();
        this.row.forEach((b) => this.seen.add(b.key));
        this.say('Act I lines up: ' + this.row.map((b) => b.name).join(', ') + '.');
        this.startFight(this.row[0]);
      }
    }
    say(m) { this.log.push(m); if (this.log.length > 80) this.log.shift(); }
    over() { return this.phase === 'over'; }
    heroOf(power) { if (!this.powers) return -1; const i = POWERS.findIndex((p) => p.key === power); return this.players.findIndex((p) => p.hero === i); }
    hexOn(h) { return this.boss === 'vael' && this.slots.some((x) => x && x.boss.hex === h); }
    maxAdd(seat) {
      if (this.hexOn('coil')) return 1;
      return seat === this.lead && seat === this.heroOf('command') ? 3 : RULES.maxAdd;
    }
    canWild(seat) { return seat === this.heroOf('overcharge') && !this.used.overcharge; }
    canBeacon(seat) { return seat === this.heroOf('beacon') && this.beaconAct !== this.actNo && this.phase === 'build' && seat === this.turnSeat(); }
    turnSeat() { return this.phase !== 'build' ? -1 : this.boss === 'vael' ? (this.lead + this.round.at) % this.N : this.enc.order[this.enc.at]; }
    forget(seat, ids) { this.known[seat] = this.known[seat].filter((c) => !ids.includes(c.id)); }

    /* ---------- Gorvax: one monster at a time ---------- */
    startFight(boss) {
      const order = []; for (let k = 0; k < this.N; k++) order.push((this.lead + k) % this.N);
      this.enc = { boss, st: newCombo(boss.type), cards: [], order, at: 0, plays: [] };
      this.phase = 'build'; this.result = null;
      this.say(boss.name + ' attacks: it wants a ' + TYPE[boss.type] + ' of ' + boss.need + '. ' + this.players[this.lead].name + ' leads.');
    }
    need() { return this.enc.boss.need - this.enc.st.n; }

    /* ---------- Vael: two heads, one round at a time ---------- */
    grow() {
      for (let i = 0; i < 2; i++) {
        if (this.slots[i]) continue;
        if (!this.pile.length && this.actNo < this.acts.length - 1) {
          this.actNo++; this.pile = this.acts[this.actNo].slice();
          this.say('Act ' + ACTN[this.actNo] + ' begins.');
        }
        if (!this.pile.length) continue;
        const b = Object.assign({}, this.pile.shift());
        if (this.regrow[i]) { b.need++; b.regrown = true; }
        this.regrow[i] = false;
        this.seen.add(b.key);
        this.slots[i] = { boss: b, st: newCombo(b.type), cards: [], plays: [], enraged: false };
        this.say('A head grows: ' + b.name + ' wants a ' + TYPE[b.type] + ' of ' + b.need + ' (' + HEX[b.hex].name + ').');
      }
    }
    startRound() {
      this.round = { at: 0, lastHead: null, plays: [] };
      this.phase = 'build'; this.result = null;
      this.say('New round. ' + this.players[this.lead].name + ' leads.');
    }
    legalFor(seat, head) {
      if (this.phase !== 'build' || seat !== this.turnSeat() || this.hands[seat].length < 2) return [];
      if (this.boss === 'vael') {
        const x = this.slots[head];
        if (!x || x.st.n >= x.boss.need) return [];
        if (this.hexOn('split') && this.round.lastHead === head) return [];
        return this.hands[seat].filter((c) => fitsC(x.st, c)).map((c) => c.id);
      }
      return this.hands[seat].filter((c) => fitsC(this.enc.st, c)).map((c) => c.id);
    }
    canAddAny(seat) { return this.boss === 'vael' ? [0, 1].some((h) => this.legalFor(seat, h).length) : this.legalFor(seat, 0).length > 0; }

    act(seat, a) {
      a = a || {};
      if (this.phase === 'build') {
        if (seat !== this.turnSeat()) return { ok: false, error: 'Wait for ' + this.players[this.turnSeat()].name + '.' };
        if (a.type === 'beacon') return this.beacon(seat, a.card | 0);
        if (a.type === 'pass') {
          if (this.boss === 'vael' && seat === this.lead && this.hexOn('thorns') && this.canAddAny(seat)) return { ok: false, error: 'Thorns: the lead can’t pass while they can add a card.' };
          this.say(this.players[seat].name + ' passes.');
          if (this.boss === 'vael') { this.round.plays.push({ seat, pass: true }); this.round.lastHead = null; } else this.enc.plays.push({ seat, pass: true, cards: [] });
          this.nextTurn(); return { ok: true };
        }
        if (a.type !== 'add') return { ok: false, error: 'Add cards or pass.' };
        return this.add(seat, a);
      }
      if (this.phase === 'riptide') {
        if (seat !== this.heroOf('riptide')) return { ok: false, error: 'Waiting on Riptide.' };
        if (a.type !== 'riptide') return { ok: false, error: 'Use Riptide or not.' };
        if (a.use) {
          this.used.riptide = true;
          this.say(this.players[seat].name + ' uses Riptide: nobody discards.');
          const done = this.penalty.after; this.penalty = null; done(); return { ok: true };
        }
        this.toDiscard(); return { ok: true };
      }
      if (this.phase === 'discard') {
        if (!this.pendingDiscard.includes(seat)) return { ok: false, error: 'You already discarded.' };
        const k = this.discardCount(seat);
        if (a.type !== 'discard') return { ok: false, error: 'Discard ' + k + ' card' + (k === 1 ? '' : 's') + '.' };
        const ids = [...new Set((a.cards || []).map((x) => x | 0))];
        if (ids.length !== k) return { ok: false, error: 'Discard ' + k + ' card' + (k === 1 ? '' : 's') + '.' };
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

    beacon(seat, id) {
      if (!this.canBeacon(seat)) return { ok: false, error: 'You can’t use Beacon now.' };
      const c = this.hands[seat].find((x) => x.id === id);
      if (!c) return { ok: false, error: 'You don’t have that card.' };
      this.beaconAct = this.actNo;
      if (!this.known[seat].some((x) => x.id === id)) this.known[seat].push(c);
      this.say(this.players[seat].name + ' uses Beacon and shows ' + cardName(c) + '.');
      return { ok: true };
    }

    add(seat, a) {
      const hand = this.hands[seat], vael = this.boss === 'vael';
      const head = vael ? a.head | 0 : 0;
      const tgt = vael ? this.slots[head] : this.enc;
      if (!tgt) return { ok: false, error: 'There’s no head there.' };
      if (vael && this.hexOn('split') && this.round.lastHead === head) return { ok: false, error: 'Split: you can’t add to the head the Hero before you just fed.' };
      const ids = (a.cards || []).map((x) => x | 0);
      const max = this.maxAdd(seat), rem = tgt.boss.need - tgt.st.n;
      if (!ids.length || ids.length > max) return { ok: false, error: 'Add 1' + (max > 1 ? '–' + max : '') + ' card' + (max > 1 ? 's' : '') + '.' };
      if (new Set(ids).size !== ids.length) return { ok: false, error: 'Pick different cards.' };
      if (ids.length > rem) return { ok: false, error: 'That combo only needs ' + rem + ' more.' };
      if (ids.length >= hand.length) return { ok: false, error: 'You have to keep at least one card.' };
      const wild = a.wild == null ? null : a.wild | 0;
      if (wild != null && (!ids.includes(wild) || !this.canWild(seat))) return { ok: false, error: 'You can’t use Overcharge now.' };
      const st = copyC(tgt.st), placed = [];
      for (const id of ids) {
        const c = hand.find((x) => x.id === id);
        if (!c) return { ok: false, error: 'You don’t have that card.' };
        if (id === wild) {
          const v = wildAs(st, c);
          if (!v) return { ok: false, error: 'Overcharge needs a combo already started, with room to grow.' };
          const w = { id: c.id, c: v.c, r: v.r, wild: true, real: c };
          addC(st, w); placed.push(w);
        } else {
          if (!fitsC(st, c)) return { ok: false, error: cardName(c) + ' doesn’t fit that combo.' };
          addC(st, c); placed.push(c);
        }
      }
      if (wild != null) { this.used.overcharge = true; this.say(this.players[seat].name + ' uses Overcharge.'); }
      tgt.st = st; tgt.cards = tgt.cards.concat(placed);
      this.hands[seat] = hand.filter((c) => !ids.includes(c.id));
      this.forget(seat, ids);
      tgt.plays.push({ seat, cards: placed });
      this.say(this.players[seat].name + ' adds ' + placed.map(cardName).join(' and ') + (vael ? ' to ' + tgt.boss.name : '') + '.');
      if (vael) { this.round.plays.push({ seat, head, n: placed.length }); this.round.lastHead = head; this.nextTurn(); return { ok: true }; }
      if (this.need() <= 0) { this.resolve(); return { ok: true }; }
      this.nextTurn(); return { ok: true };
    }
    nextTurn() {
      if (this.boss === 'vael') { this.round.at++; if (this.round.at >= this.N) this.endRound(); return; }
      this.enc.at++;
      if (this.enc.at >= this.N) this.resolve();
    }

    /* Gorvax: check the combo */
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
      for (const p of this.enc.plays) if (p.cards.length) {
        const real = p.cards.map((c) => c.real || c);
        this.hands[p.seat] = this.hands[p.seat].concat(real).sort(byCard);
        this.known[p.seat] = this.known[p.seat].concat(real).sort(byCard);
        this.result.bounced.push({ seat: p.seat, cards: real });
      }
      this.say('The combo falls short. ' + this.enc.boss.name + ' gets away. The cards go back to their Heroes.');
      this.startPenalty(this.players.map(() => RULES.missDiscard), () => { this.phase = 'result'; });
    }

    /* Vael: end of a round */
    endRound() {
      this.fights++;
      const res = { cut: [], struck: [], enraged: [], hunger: [], discards: {} };
      const venom = this.hexOn('venom');
      const counts = this.players.map(() => 0);
      this.slots.forEach((x, i) => {
        if (!x) return;
        if (x.st.n >= x.boss.need) res.cut.push(i);
        else if (x.enraged) res.struck.push(i);
        else res.enraged.push(i);
      });
      const hungry = this.slots.filter((x, i) => x && x.boss.hex === 'hunger' && !res.cut.includes(i) && !res.struck.includes(i)).length;
      for (const i of res.cut) {
        const x = this.slots[i];
        this.done++; this.hist.push({ key: x.boss.key, met: true });
        this.regrow[i] = x.boss.hex === 'regrow';
        this.say(x.boss.name + ' is cut off!');
        res.cutHeads = (res.cutHeads || []).concat(x.boss);
        this.slots[i] = null;
      }
      for (const i of res.struck) {
        const x = this.slots[i];
        this.misses++; this.hist.push({ key: x.boss.key, met: false });
        for (let p = 0; p < this.N; p++) counts[p] += venom ? RULES.venomDiscard : RULES.strikeDiscard;
        this.say(x.boss.name + ' strikes! Its ' + x.cards.length + ' card' + (x.cards.length === 1 ? ' is' : 's are') + ' lost' + (venom ? ' and Venom makes the strike cost 3.' : '.'));
        res.struckHeads = (res.struckHeads || []).concat(x.boss);
        this.slots[i] = null;
      }
      for (const i of res.enraged) { this.slots[i].enraged = true; this.say(this.slots[i].boss.name + ' is enraged.'); }
      for (let k = 0; k < hungry; k++) {
        let t = this.lead, most = -Infinity;
        for (let j = 0; j < this.N; j++) { const p = (this.lead + j) % this.N, n = this.hands[p].length - counts[p]; if (n > most) { most = n; t = p; } }
        counts[t]++; res.hunger.push(t);
        this.say('Hunger: ' + this.players[t].name + ' has the most cards and discards 1.');
      }
      this.result = res;
      this.startPenalty(counts, () => this.finishRound());
    }
    finishRound() {
      this.grow();
      if (!this.slots[0] && !this.slots[1]) {
        this.phase = 'over'; this.outcome = { win: true };
        this.say('The last head falls. The squad wins!');
        return;
      }
      this.phase = 'result';
    }

    /* Discards: Steady and Riptide apply to every kind */
    startPenalty(counts, after) {
      const st = this.heroOf('steady');
      if (st >= 0 && counts[st] > 0) counts[st]--;
      counts = counts.map((k, p) => Math.min(k, this.hands[p].length));
      if (!this.result) this.result = { discards: {} };
      this.result.discards = this.result.discards || {};
      if (!counts.some((k) => k > 0)) { after(); return; }
      this.penalty = { counts, after };
      const rt = this.heroOf('riptide');
      if (rt >= 0 && !this.used.riptide) { this.phase = 'riptide'; return; }
      this.toDiscard();
    }
    toDiscard() {
      this.pendingDiscard = this.players.map((_, i) => i).filter((i) => this.penalty.counts[i] > 0);
      this.phase = 'discard';
    }
    discardCount(seat) { return this.penalty ? this.penalty.counts[seat] : 0; }
    afterDiscards() {
      for (let i = 0; i < this.N; i++) if (this.result.discards[i]) this.say(this.players[i].name + ' discards ' + this.result.discards[i].map(cardName).join(', ') + '.');
      const down = this.hands.findIndex((h) => !h.length);
      const done = this.penalty.after; this.penalty = null;
      if (down >= 0) return this.lose(down, 'discarded their last card');
      done();
    }
    advance() {
      this.lead = (this.lead + 1) % this.N;
      if (this.boss === 'vael') { this.startRound(); return; }
      if (!this.row.length) {
        this.actNo++;
        if (this.actNo >= this.acts.length) {
          this.phase = 'over'; this.outcome = { win: true };
          this.say('The last monster falls. The squad wins!');
          return;
        }
        this.row = this.acts[this.actNo].slice();
        this.row.forEach((b) => this.seen.add(b.key));
        this.say('Act ' + ACTN[this.actNo] + ' lines up: ' + this.row.map((b) => b.name).join(', ') + '.');
      }
      this.startFight(this.row[0]);
    }
    lose(seat, how) {
      this.phase = 'over'; this.outcome = { win: false, seat, how };
      this.say(this.players[seat].name + ' ' + how + '. The Boss wins.');
    }

    /* what one seat may see */
    view(seat) {
      const turn = this.turnSeat(), vael = this.boss === 'vael';
      const combo = (x) => x && ({ boss: x.boss, cards: x.cards.slice(), need: x.boss.need - x.st.n, type: x.st.type, n: x.st.n, rank: x.st.rank, color: x.st.color, lo: x.st.lo, hi: x.st.hi, enraged: !!x.enraged, plays: x.plays.map((p) => ({ seat: p.seat, n: p.cards.length })) });
      return {
        seat, boss: this.boss, bossName: RULES.bosses[this.boss].name, phase: this.phase, colors: this.colors, total: this.total, done: this.done, misses: this.misses, fights: this.fights,
        boxed: this.boxed, maxAdd: this.maxAdd(seat), act: this.actNo, lead: this.lead, powers: this.powers,
        players: this.players.map((p, i) => ({ name: p.name, bot: p.bot, hero: p.hero, count: this.hands[i].length,
          known: this.known[i].slice(),
          power: this.powers ? Object.assign({ used: (POWERS[p.hero].key === 'riptide' && this.used.riptide) || (POWERS[p.hero].key === 'overcharge' && this.used.overcharge) || (POWERS[p.hero].key === 'beacon' && this.beaconAct === this.actNo) }, POWERS[p.hero]) : null,
          needsDiscard: this.phase === 'discard' && this.pendingDiscard.includes(i),
          discardCount: this.phase === 'discard' ? this.discardCount(i) : 0 })),
        hand: this.hands[seat].slice(),
        turn, legal: vael ? [this.legalFor(seat, 0), this.legalFor(seat, 1)] : [this.legalFor(seat, 0)],
        canPass: !(vael && this.phase === 'build' && seat === this.lead && this.hexOn('thorns') && this.canAddAny(seat)),
        canWild: this.phase === 'build' && seat === turn && this.canWild(seat), canBeacon: this.canBeacon(seat),
        riptide: this.phase === 'riptide' ? { seat: this.heroOf('riptide'), counts: this.penalty.counts.slice() } : null,
        row: vael ? [] : this.row.slice(), upcoming: vael ? [] : this.row.filter((b) => !this.enc || b !== this.enc.boss),
        enc: vael ? null : this.enc && Object.assign(combo(this.enc), { order: this.enc.order.slice(), at: this.enc.at,
          plays: this.enc.plays.map((p) => ({ seat: p.seat, pass: !!p.pass, n: p.cards.length })) }),
        heads: vael ? this.slots.map(combo) : null,
        pile: vael ? this.pile.length : 0,
        round: vael ? { at: this.round.at, lastHead: this.round.lastHead, plays: this.round.plays.slice() } : null,
        hexes: vael ? this.slots.filter(Boolean).map((x) => x.boss.hex) : [],
        result: this.result && {
          met: this.result.met, bounced: this.result.bounced || [],
          cut: this.result.cutHeads || [], struck: this.result.struckHeads || [], enraged: (this.result.enraged || []).map((i) => this.slots[i] && this.slots[i].boss.name).filter(Boolean), hunger: this.result.hunger || [],
          discards: Object.keys(this.result.discards || {}).map((k) => ({ seat: +k, cards: this.result.discards[k] })),
        },
        acts: this.acts.map((x, a) => ({ n: x.length })),
        hist: this.hist.slice(),
        outcome: this.outcome, log: this.log.slice(-20),
      };
    }

    /* ---------- bots ---------- */
    botDelay() { return this.phase === 'result' ? 2200 : this.phase === 'discard' || this.phase === 'riptide' ? 800 : 1000; }
    botStep() {
      if (this.phase === 'build') {
        const s = this.turnSeat(); if (!this.players[s].bot) return false;
        if (this.canBeacon(s) && this.hands[s].length > 2) this.beacon(s, this.botBeacon(s).id);
        const w = this.botWild(s);
        if (w) { this.act(s, w); return true; }
        const pick = this.simple ? this.simplePick(s) : chooseBuild(this, s, RULES.lookahead);
        if (pick && pick.cards.length) { const r = this.act(s, { type: 'add', head: pick.head, cards: pick.cards }); if (r.ok) return true; }
        if (!this.act(s, { type: 'pass' }).ok) {           // Thorns: the lead must add something
          const h = [0, 1].find((x) => this.legalFor(s, x).length);
          this.act(s, { type: 'add', head: h, cards: [this.legalFor(s, h)[0]] });
        }
        return true;
      }
      if (this.phase === 'riptide') {
        const s = this.heroOf('riptide'); if (!this.players[s].bot) return false;
        const c = this.penalty.counts;
        const use = this.hands.some((h, p) => h.length - c[p] <= 2) || this.actNo === this.acts.length - 1 || c.reduce((a, b) => a + b, 0) >= 3 * this.N;
        this.act(s, { type: 'riptide', use });
        return true;
      }
      if (this.phase === 'discard') {
        const s = this.pendingDiscard.find((x) => this.players[x].bot);
        if (s == null) return false;
        const k = this.discardCount(s);
        let out;
        if (this.simple || k > 2) { const left = simpleDiscard(this.hands[s], k); out = this.hands[s].filter((c) => !left.includes(c)).map((c) => c.id); }
        else out = chooseDiscard(this, s, RULES.lookahead);
        this.act(s, { type: 'discard', cards: out });
        return true;
      }
      if (this.phase === 'result') { this.advance(); return true; }
      return false;
    }
    fast() {   // the public shape of the table, for policies and rollouts
      return { N: this.N, hands: this.hands, lead: this.lead, cmd: this.heroOf('command'), steady: this.heroOf('steady'),
        at: this.boss === 'vael' ? this.round.at : 0, lastHead: this.boss === 'vael' ? this.round.lastHead : null,
        slots: this.boss === 'vael' ? this.slots.map((x) => x && { m: { type: x.boss.type, need: x.boss.need, hex: x.boss.hex }, st: x.st, enr: x.enraged }) : null };
    }
    simplePick(s) {
      if (this.boss === 'vael') {
        const p = hydraPick(this.fast(), s, false);
        return p && { head: p.head, cards: p.cards.map((c) => c.id) };
      }
      const hand = this.hands[s];
      if (!hand.some((c) => fitsC(this.enc.st, c)) || hand.length < 2) return null;
      const st = copyC(this.enc.st);
      return { head: 0, cards: simplePlay(hand, st, Math.min(this.maxAdd(s), this.need(), hand.length - 1)).map((c) => c.id) };
    }
    /* Overcharge: use it when it finishes a combo this turn. */
    botWild(s) {
      if (!this.canWild(s)) return null;
      const hand = this.hands[s], max = this.maxAdd(s);
      const targets = this.boss === 'vael' ? [0, 1].filter((h) => this.slots[h] && !(this.hexOn('split') && this.round.lastHead === h)).map((h) => ({ h, x: this.slots[h] })) : [{ h: 0, x: this.enc }];
      for (const { h, x } of targets) {
        const rem = x.boss.need - x.st.n;
        if (!x.st.n || rem > max || hand.length <= rem) continue;
        const st = copyC(x.st);
        const pre = simplePlay(hand, st, rem - 1);
        if (pre.length !== rem - 1) continue;
        const left = hand.filter((c) => !pre.includes(c));
        const w = worst(left, left);
        if (!wildAs(st, w)) continue;
        return { type: 'add', head: h, cards: pre.map((c) => c.id).concat(w.id), wild: w.id };
      }
      return null;
    }
    botBeacon(s) { const h = this.hands[s]; let b = h[0], bu = -1; for (const c of h) { const u = useful(c, h); if (u > bu) { bu = u; b = c; } } return b; }
  }

  /* ---------- look-ahead bots ----------
     Before each play or discard, a bot imagines deals of the cards it can't see (it only uses its own hand,
     the face-up Boss cards and cards it has seen), plays each option out to the end with the simple bot, and
     keeps the option that wins most often. One-time powers are left out of the imagined games. */
  function rolloutG(s) {   // Gorvax
    const N = s.N, hands = s.hands, line = s.line;
    let lead = s.lead, st = s.st, at = s.at, plays = s.plays, li = s.li || 0;
    while (li < line.length) {
      const m = line[li];
      if (!st) { st = newCombo(m.type); at = 0; plays = []; }
      while (at < N && st.n < m.need) {
        const p = (lead + at) % N, h = hands[p];
        if (h.length > 1 && h.some((c) => fitsC(st, c))) {
          const max = p === lead && p === s.cmd ? 3 : RULES.maxAdd;
          const cs = simplePlay(h, st, Math.min(max, m.need - st.n, h.length - 1));
          if (cs.length) { hands[p] = h.filter((x) => !cs.includes(x)); plays.push(p, cs); }
        }
        at++;
      }
      if (st.n < m.need) {
        for (let i = 0; i < plays.length; i += 2) hands[plays[i]] = hands[plays[i]].concat(plays[i + 1]);
        for (let i = 0; i < N; i++) { hands[i] = simpleDiscard(hands[i], RULES.missDiscard - (i === s.steady ? 1 : 0)); if (!hands[i].length) return 0; }
      }
      li++; lead = (lead + 1) % N; st = null;
    }
    return 1;
  }
  function rolloutV(s) {   // Vael
    const N = s.N, hands = s.hands, pile = s.pile;
    const slots = s.slots.map((x) => x && { m: x.m, st: copyC(x.st), enr: x.enr }), regrow = s.regrow.slice();
    let lead = s.lead, at = s.at, lastHead = s.lastHead, pi = 0;
    const st = { N, hands, slots, lead, at, lastHead, cmd: s.cmd };
    const growF = () => { for (let i = 0; i < 2; i++) if (!slots[i] && pi < pile.length) { const m = Object.assign({}, pile[pi++]); if (regrow[i]) m.need++; regrow[i] = false; slots[i] = { m, st: newCombo(m.type), enr: false }; } };
    if (s.fresh) growF();
    for (let guard = 0; guard < 80; guard++) {
      if (!slots[0] && !slots[1]) return 1;
      st.lead = lead;
      for (; at < N; at++) {
        const p = (lead + at) % N; st.at = at; st.lastHead = lastHead;
        const thorns = at === 0 && slots.some((x) => x && x.m.hex === 'thorns');
        const pick = hydraPick(st, p, thorns);
        if (pick) { for (const c of pick.cards) addC(slots[pick.head].st, c); hands[p] = hands[p].filter((c) => !pick.cards.includes(c)); lastHead = pick.head; }
        else lastHead = null;
      }
      // end of round
      const venom = slots.some((x) => x && x.m.hex === 'venom');
      const counts = new Array(N).fill(0);
      let hungry = 0;
      for (let i = 0; i < 2; i++) {
        const x = slots[i]; if (!x) continue;
        if (x.st.n >= x.m.need) { regrow[i] = x.m.hex === 'regrow'; slots[i] = null; }
        else if (x.enr) { for (let p = 0; p < N; p++) counts[p] += venom ? RULES.venomDiscard : RULES.strikeDiscard; slots[i] = null; }
        else { x.enr = true; if (x.m.hex === 'hunger') hungry++; }
      }
      for (let k = 0; k < hungry; k++) { let t = 0, most = -1; for (let j = 0; j < N; j++) { const p = (lead + j) % N, n = hands[p].length - counts[p]; if (n > most) { most = n; t = p; } } counts[t]++; }
      if (s.steady >= 0 && counts[s.steady] > 0) counts[s.steady]--;
      for (let p = 0; p < N; p++) if (counts[p]) { hands[p] = simpleDiscard(hands[p], counts[p]); if (!hands[p].length) return 0; }
      growF();
      lead = (lead + 1) % N; at = 0; lastHead = null;
    }
    return 0;
  }
  // A guess at the Boss cards still face down, drawn from what hasn't been seen yet.
  function futureOf(g) {
    const B = RULES.bosses[g.boss], base = g.boss === 'vael' ? 18 : 0;
    const out = [];
    const unseen = (a) => shuffle(B.acts[a].map(([type, need, name, hex], i) => ({ type, need: need[g.N - 2], hex: hex || null, key: base + a * 6 + i })).filter((m) => !g.seen.has(m.key)));
    if (g.boss === 'vael') out.push(...unseen(g.actNo).slice(0, g.pile.length));
    for (let a = g.actNo + 1; a < g.acts.length; a++) out.push(...unseen(a).slice(0, g.acts[a].length));
    return out;
  }
  function determinize(g, seat) {
    const knownIds = new Set(); g.known.forEach((k, i) => { if (i !== seat) k.forEach((c) => knownIds.add(c.id)); });
    const pool = [];
    g.hands.forEach((h, i) => { if (i !== seat) for (const c of h) if (!knownIds.has(c.id)) pool.push(c); });
    for (const c of g.box) pool.push(c);
    shuffle(pool);
    let k = 0;
    return g.hands.map((h, i) => {
      if (i === seat) return h.slice();
      const out = g.known[i].slice();
      while (out.length < h.length) out.push(pool[k++]);
      return out;
    });
  }
  /* Every legal way to add cards (up to the seat's limit) to each target, plus passing. */
  function buildOptions(g, seat) {
    const hand = g.hands[seat], max = g.maxAdd(seat), opts = [];
    const vael = g.boss === 'vael';
    const passOk = !(vael && seat === g.lead && g.hexOn('thorns') && g.canAddAny(seat));
    if (passOk) opts.push({ head: 0, cards: [] });
    const heads = vael ? [0, 1] : [0];
    for (const h of heads) {
      if (!g.legalFor(seat, h).length) continue;
      const x = vael ? g.slots[h] : g.enc, rem = x.boss.need - x.st.n, cap = Math.min(max, rem, hand.length - 1);
      const seen = new Set();
      (function grow(st, picked) {
        if (picked.length) {
          const key = picked.map((c) => c.id).sort((a, b) => a - b).join(':');
          if (!seen.has(key)) { seen.add(key); opts.push({ head: h, cards: picked }); }
        }
        if (picked.length >= cap || opts.length > 90) return;
        for (const c of hand) {
          if (picked.includes(c) || !fitsC(st, c)) continue;
          const t = copyC(st); addC(t, c); grow(t, picked.concat(c));
        }
      })(copyC(x.st), []);
    }
    return opts;
  }
  function stateAfter(g, deal, future, seat, o) {
    const hands = deal.slice();
    if (o.cards.length) hands[seat] = hands[seat].filter((c) => !o.cards.includes(c));
    const base = { N: g.N, hands, lead: g.lead, cmd: g.heroOf('command'), steady: g.heroOf('steady') };
    if (g.boss === 'vael') {
      const slots = g.slots.map((x) => x && { m: { type: x.boss.type, need: x.boss.need, hex: x.boss.hex }, st: copyC(x.st), enr: x.enraged });
      if (o.cards.length) for (const c of o.cards) addC(slots[o.head].st, c);
      return Object.assign(base, { slots, regrow: g.regrow.slice(), pile: future, at: g.round.at + 1, lastHead: o.cards.length ? o.head : null });
    }
    const e = g.enc, st = copyC(e.st), plays = [];
    e.plays.forEach((p) => { if (p.cards.length) plays.push(p.seat, p.cards.map((c) => c.real || c)); });
    if (o.cards.length) { for (const c of o.cards) addC(st, c); plays.push(seat, o.cards); }
    return Object.assign(base, { line: g.row.concat(future), li: 0, st, at: e.at + 1, plays });
  }
  function chooseBuild(g, seat, samples) {
    const opts = buildOptions(g, seat);
    if (!opts.length) return null;
    if (opts.length === 1) return { head: opts[0].head, cards: opts[0].cards.map((c) => c.id) };
    const simple = g.simplePick(seat);
    const skey = simple ? simple.head + '/' + simple.cards.slice().sort((a, b) => a - b).join(',') : '0/';
    const keyOf = (o) => (o.cards.length ? o.head : 0) + '/' + o.cards.map((c) => c.id).sort((a, b) => a - b).join(',');
    const score = new Float64Array(opts.length);
    const run = g.boss === 'vael' ? rolloutV : rolloutG;
    for (let k = 0; k < samples; k++) {
      const deal = determinize(g, seat), future = futureOf(g);
      opts.forEach((o, i) => { score[i] += run(stateAfter(g, deal, future, seat, o)); });
    }
    let best = 0, bs = -1;
    opts.forEach((o, i) => { const s = score[i] + (keyOf(o) === skey ? 0.5 : 0); if (s > bs) { bs = s; best = i; } });
    return { head: opts[best].head, cards: opts[best].cards.map((c) => c.id) };
  }
  /* Discards: compare small sets drawn from the least useful cards. */
  function chooseDiscard(g, seat, samples) {
    const hand = g.hands[seat], k = g.discardCount(seat);
    if (hand.length <= k) return hand.map((c) => c.id);
    const ranked = hand.slice().sort((a, b) => useful(a, hand) - useful(b, hand)).slice(0, 7);
    const opts = [];
    if (k === 1) ranked.forEach((a) => opts.push([a]));
    else for (let i = 0; i < ranked.length; i++) for (let j = i + 1; j < ranked.length; j++) opts.push([ranked[i], ranked[j]]);
    const score = new Float64Array(opts.length);
    for (let s = 0; s < samples; s++) {
      const deal = determinize(g, seat), future = futureOf(g);
      for (const p of g.pendingDiscard) if (p !== seat) deal[p] = simpleDiscard(deal[p], g.discardCount(p));
      opts.forEach((o, i) => {
        const hands = deal.slice();
        hands[seat] = hands[seat].filter((c) => !o.includes(c));
        if (hands.some((h) => !h.length)) return;
        const base = { N: g.N, hands, lead: (g.lead + 1) % g.N, cmd: g.heroOf('command'), steady: g.heroOf('steady') };
        if (g.boss === 'vael') {
          const slots = g.slots.map((x) => x && { m: { type: x.boss.type, need: x.boss.need, hex: x.boss.hex }, st: copyC(x.st), enr: x.enraged });
          score[i] += rolloutV(Object.assign(base, { slots, regrow: g.regrow.slice(), pile: future, at: 0, lastHead: null, fresh: true }));
        } else score[i] += rolloutG(Object.assign(base, { line: g.row.concat(future), li: 0, st: null }));
      });
    }
    let best = 0; opts.forEach((_, i) => { if (score[i] > score[best]) best = i; });
    return opts[best].map((c) => c.id);
  }

  const api = { RULES, COLORS, TYPE, HEX, POWERS, BOT_NAMES, Game, fits, cardName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sentai = api;
})(typeof window !== 'undefined' ? window : globalThis);
