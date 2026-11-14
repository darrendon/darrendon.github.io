/* Sentai — rules engine and bots. Runs in the browser (window.Sentai) and in node
   (module.exports), so bot-only games can be checked headless: node sim.js
   Every tunable number lives in RULES. Two Bosses share one engine:
   Emperor Gorvax (a line of monsters, one fight at a time) and Vael, the Hydra
   (two or three heads out at once, combos that stay put, heads that enrage). */
(function (root) {
  'use strict';
  const RULES = {
    ranks: 12,                          // each color runs 1–12
    colorsFor: (n) => Math.min(5, n + 1),   // colors in play = Heroes + 1, up to all five
    hand: 15,                           // cards dealt to each Hero (a Boss may say otherwise)
    hand5: 11,                          // with 5 Heroes: 11 each, so 5 cards stay buried
    energyStart: 1,                     // Energy tokens the squad starts with
    energyMax: 4,                       // most Energy the squad can hold
    passCharge: true,                   // when you pass, the squad gains 1 Energy (if there's room)
    weakShow: true,                     // a finishing blow on a monster's weak spot: the Hero who landed it shows one card from their hand
    weakEnergy: 0,                      // Energy for a finishing blow on a weak spot (tried at 1; now the reward is showing a card)
    mirrorSelf: 0,                      // Kagami: with this many Heroes or fewer, the lock binds only the Hero who landed the finishing blow
    botWeak: 0.4,                       // how much the look-ahead bots want a weak-spot finish (in rollout wins out of `lookahead`)
    weakFinish: true,                   // the weak-spot card has to be the last card added (false: anywhere in the combo)
    missDiscard: 1,                     // Gorvax: cards each Hero discards when a combo falls short
    strikeDiscard: 2,                   // Vael: cards each Hero discards when an enraged head strikes (Venom: +1)
    maxAdd: 2,                          // cards a Hero may add per turn
    replay: true,                       // Gorvax: a missed monster stays and is fought again
    heads: 0,                           // Vael: heads out at once (0 = what the Boss says for this squad size)
    enragedAny: false,                  // Vael: an enraged head takes any card (tried; too easy)
    rageRounds: 1,                      // Vael: rounds a head can stay enraged before it strikes
    starveStrike: false,                // Vael: an enraged head strikes only after a round in which nobody fed it
    lookahead: 24,                      // imagined deals a bot plays out before each move
    actDraws: { 2: [3, 3, 4], 3: [3, 4, 5], 4: [4, 4, 4], 5: [4, 4, 4] },   // Boss cards drawn for each act
    bosses: {
      gorvax: {
        name: 'Emperor Gorvax',
        // per act: [type, [need with 2, 3, 4, 5 Heroes], name]
        acts: [
          [['run', [2, 2, 3, 2], 'Cog Grunts'], ['run', [2, 2, 3, 2], 'Rust Rats'], ['color', [2, 3, 3, 3], 'Inkbats'],
           ['combine', [2, 2, 3, 2], 'Static Swarm'], ['set', [3, 3, 3, 3], 'Gum Golem'], ['set', [2, 2, 3, 2], 'Pin Mites']],
          [['run', [3, 3, 5, 4], 'Tiderazor'], ['run', [3, 4, 5, 5], 'Lanternjaw'], ['color', [3, 3, 4, 4], 'Copper Kraken'],
           ['combine', [3, 4, 5, 5], 'Thornbeak'], ['set', [2, 2, 3, 3], 'Voltmoth'], ['set', [2, 3, 3, 3], 'Twin Oni']],
          [['run', [3, 4, 6, 5], 'Megalith Rex'], ['run', [4, 5, 6, 6], 'Ironhorn Titan'], ['color', [3, 4, 5, 5], 'Starmaw'],
           ['combine', [3, 4, 5, 5], 'Doom Pagoda'], ['set', [2, 3, 4, 4], 'Eclipse Wyrm'], ['set', [2, 2, 4, 3], 'Emperor Gorvax']],
        ],
      },
      vael: {
        name: 'Vael, the Hydra',
        hand: 14,
        heads: { 2: 2, 3: 3, 4: 3, 5: 3 },
        // per act: [type, [need with 2, 3, 4, 5 Heroes], name, hex]
        acts: [
          [['run', [2, 2, 3, 3], 'Gloomfang', 'brood'], ['run', [2, 2, 3, 3], 'Mirefang', 'spite'], ['color', [2, 2, 3, 3], 'Sallowmaw', 'coil'],
           ['combine', [2, 2, 3, 3], 'Brineneck', 'hunger'], ['set', [2, 2, 3, 3], 'Hissjaw', 'split'], ['set', [2, 2, 3, 3], 'Ashtongue', 'venom']],
          [['run', [2, 3, 4, 4], 'Thornscale', 'hunger'], ['run', [2, 2, 3, 3], 'Ropeneck', 'split'], ['color', [3, 3, 3, 3], 'Bilefang', 'venom'],
           ['combine', [2, 3, 3, 3], 'Coilmaw', 'coil'], ['set', [2, 3, 4, 3], 'Gravejaw', 'brood'], ['set', [2, 3, 3, 3], 'Smokeneck', 'spite']],
          [['run', [3, 3, 4, 4], 'Crownfang', 'venom'], ['run', [3, 3, 4, 4], 'Doomcoil', 'coil'], ['color', [3, 3, 4, 4], 'Nightmaw', 'hunger'],
           ['combine', [3, 3, 4, 4], 'Wyrmspite', 'split'], ['set', [2, 3, 4, 4], 'Old Fang', 'spite'], ['set', [2, 3, 4, 4], 'Hexmother', 'brood']],
        ],
      },
    },
  };
  /* Shogun Kagami, the mirror: one monster at a time, like Gorvax, and all 4 monsters of each season come out.
     The color of the card that finishes a monster is locked: nobody can play that color against the next monster. */
  RULES.bosses.kagami = {
    name: 'Shogun Kagami',
    mirror: true,
    draws: [4, 4, 4],
    // per act: [type, [need with 2, 3, 4, 5 Heroes], name]
    acts: [
      [['run', [2, 3, 3, 3], 'Glint Imp'], ['set', [2, 2, 3, 3], 'Shardling'], ['color', [2, 3, 3, 3], 'Prism Moth'], ['combine', [2, 2, 3, 3], 'Glass Crab']],
      [['run', [3, 4, 5, 5], 'Silverback'], ['set', [2, 3, 3, 3], 'Twin Reflections'], ['color', [3, 3, 4, 4], 'Glare Hound'], ['combine', [2, 3, 4, 4], 'Kaleido Serpent']],
      [['set', [3, 3, 4, 4], 'Mirror Knight'], ['color', [3, 4, 5, 5], 'Shatterjaw'], ['combine', [2, 3, 4, 4], 'Halo Oni'], ['run', [4, 5, 6, 6], 'Shogun Kagami']],
    ],
  };
  const KEYBASE = { gorvax: 0, vael: 18, kagami: 36 };
  const HEX = {
    hunger: { name: 'Hunger', text: 'At the end of each round this head is out, the Hero with the most cards discards 1.' },
    venom: { name: 'Venom', text: 'If this head strikes, every Hero discards 1 more.' },
    coil: { name: 'Coil', text: 'No Hero may add more than 1 card a turn to this head.' },
    split: { name: 'Split', text: 'You can’t feed this head if the Hero just before you fed it.' },
    brood: { name: 'Brood', text: 'When this head is enraged, it needs 1 more card.' },
    spite: { name: 'Spite', text: 'When this head is cut, the Hero who added its last card discards 1.' },
  };
  // one Hero card per robot part; index = Hero color
  const POWERS = [
    { key: 'command', name: 'Command', kind: 'Passive', text: 'When you’re the lead, you may add up to 3 cards.' },
    { key: 'riptide', name: 'Riptide', kind: 'Once a game', text: 'When the squad would discard, nobody does.' },
    { key: 'overcharge', name: 'Overcharge', kind: 'Once a game', text: 'One card you add fits the combo, whatever its rank and color.' },
    { key: 'steady', name: 'Steady', kind: 'Passive', text: 'Whenever the squad discards, you discard 1 fewer.' },
    { key: 'beacon', name: 'Beacon', kind: 'Once a season', text: 'On your turn, show one card from your hand to everyone.' },
  ];
  /* Weak spots: every monster is weak on the side its combo ignores. Runs and Sets are weak to a color (one of the
     three colors that are always in play); Flushes and Rainbows are weak to a band of ranks. */
  const BANDS = { low: { name: '1–4', ok: (r) => r <= 4 }, mid: { name: '5–8', ok: (r) => r >= 5 && r <= 8 }, high: { name: '9–12', ok: (r) => r >= 9 },
    odd: { name: 'odd', ok: (r) => r % 2 === 1 }, even: { name: 'even', ok: (r) => r % 2 === 0 } };
  const BAND_KEYS = ['low', 'high', 'odd', 'mid', 'even'];
  const weakOf = (type, a, i) => (type === 'run' || type === 'set') ? { kind: 'color', v: (a + i) % 3 } : { kind: 'band', v: BAND_KEYS[(a * 2 + i) % 5] };
  const isWeak = (w, c) => !!w && (w.kind === 'color' ? c.c === w.v : BANDS[w.v].ok(c.r));
  const weakName = (w) => w.kind === 'color' ? COLORS[w.v] : BANDS[w.v].name;
  const COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Pink'];
  const TYPE = { run: 'Run', set: 'Set', color: 'Flush', combine: 'Rainbow' };   // color = one color; combine = all different colors
  const ACTN = ['Season 1', 'Season 2', 'The Finale'];   // the three acts, as the players see them
  const BOT_NAMES = ['Kenji', 'Aiko', 'Rio', 'Sora', 'Hana', 'Jun', 'Mika', 'Taro', 'Yumi', 'Ren'];
  const rnd = Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const cardName = (c) => COLORS[(c.real || c).c] + ' ' + (c.real || c).r;
  const byCard = (a, b) => a.c - b.c || a.r - b.r;

  /* ---------- combos ---------- */
  // a combo: { type, n, rank, color, lo, hi }  (the cards themselves are kept beside it)
  const newCombo = (type, need) => ({ type, need, n: 0 });
  const fitsC = (st, c) => !st.n || (st.type === 'set' ? c.r === st.rank : st.type === 'color' ? c.c === st.color : st.type === 'combine' ? !(st.mask & (1 << c.c))
    : !(st.rmask & (1 << c.r)) && Math.max(st.hi, c.r) - Math.min(st.lo, c.r) < st.need);   // a Run: new rank, and it all still fits in a row of `need`
  function addC(st, c) {
    if (!st.n) { st.rank = c.r; st.color = c.c; st.lo = st.hi = c.r; st.mask = 0; st.rmask = 0; }
    else { if (c.r < st.lo) st.lo = c.r; if (c.r > st.hi) st.hi = c.r; }
    st.mask |= 1 << c.c; st.rmask |= 1 << c.r;
    st.n++;
  }
  const copyC = (st) => ({ type: st.type, need: st.need, n: st.n, rank: st.rank, color: st.color, lo: st.lo, hi: st.hi, mask: st.mask, rmask: st.rmask });
  // what a wild card becomes on this combo (null if it can't be wild here)
  function wildAs(st, c) {
    if (!st.n) return null;
    if (st.type === 'set') return { r: st.rank, c: c.c };
    if (st.type === 'color') return { r: c.r, c: st.color };
    if (st.type === 'combine') { for (const k of [c.c, 0, 1, 2, 3, 4, 5, 6, 7]) if (!(st.mask & (1 << k))) return { r: c.r, c: k }; return null; }
    for (let r = st.lo + 1; r < st.hi; r++) if (!(st.rmask & (1 << r))) return { r, c: c.c };     // fill a gap first
    if (st.hi - st.lo + 1 < st.need && st.hi < RULES.ranks) return { r: st.hi + 1, c: c.c };
    if (st.hi - st.lo + 1 < st.need && st.lo > 1) return { r: st.lo - 1, c: c.c };
    return null;
  }
  // public helper for the page: does card c fit a combo shaped like the view's combo?
  function fits(e, c) { const st = { type: e.type, need: e.total, n: e.cards ? e.cards.length : e.n, rank: e.rank, color: e.color, lo: e.lo, hi: e.hi, mask: 0, rmask: 0 }; if (e.cards) for (const x of e.cards) { st.mask |= 1 << x.c; st.rmask |= 1 << x.r; } return fitsC(st, c); }

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
  const HEXW = { hunger: 6, venom: 5, coil: 2, split: 2, brood: 4, spite: -1 };

  /* The simple Hydra policy, on plain data. s: { N, hands, slots, lead, at, lastHeads, cmd }
     Returns { parts: [{ head, cards }] } — up to 2 cards on one head, or 1 card on each — or null to pass. */
  function hydraPick(s, p) {
    const hand = s.hands[p];
    if (hand.length < 2) return null;
    const base = s.cmd === p && p === s.lead ? 3 : RULES.maxAdd;
    const atIdx = (p - s.lead + s.N) % s.N;
    const opts = [];
    s.slots.forEach((x, h) => {
      if (!x || x.st.n >= x.m.need || (x.m.hex === 'split' && s.lastHeads.includes(h))) return;
      const anyCard = x.enr && RULES.enragedAny;
      if (!anyCard && !hand.some((c) => fitsC(x.st, c))) return;
      const per = x.m.hex === 'coil' ? 1 : RULES.maxAdd;
      let laterCap = 0; for (let k = atIdx + 1; k < s.N; k++) laterCap += Math.min(per, Math.max(0, s.hands[(s.lead + k) % s.N].length - 1));
      const rem = x.m.need - x.st.n, can = Math.min(x.m.hex === 'coil' ? 1 : base, rem, hand.length - 1);
      if (can <= 0) return;
      const roundsLeft = x.enr ? RULES.rageRounds - (x.rage || 0) : RULES.rageRounds;
      const nextRound = RULES.starveStrike && x.enr ? 99 : roundsLeft * s.N * per;
      if (rem > can + laterCap + nextRound) return;      // can't be finished in time: don't feed it
      const urgency = (x.enr ? (RULES.starveStrike && x.fed ? 5 : 40) : 0) + HEXW[x.m.hex] - rem;
      opts.push({ h, x, can, anyCard, rem, urgency, full: (rem <= can ? 100 : 0) + urgency, one: (rem <= 1 ? 100 : 0) + urgency });
    });
    if (!opts.length) return null;
    const pickCards = (o, k, from) => o.anyCard ? from.slice().sort((a, b) => useful(a, from) - useful(b, from)).slice(0, k) : simplePlay(from, copyC(o.x.st), k);
    let best = opts.reduce((a, b) => (b.full > a.full ? b : a));
    // one card to each head, when that does more: finishing one head and helping the other, or both enraged
    if (opts.length >= 2 && hand.length >= 3) {
      let a = null, b = null, split = -Infinity;
      for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) if (opts[i].one + opts[j].one > split) { a = opts[i]; b = opts[j]; split = a.one + b.one; }
      if (split > best.full + 20) {
        const ca = pickCards(a, 1, hand), cb = ca.length ? pickCards(b, 1, hand.filter((c) => c !== ca[0])) : [];
        if (ca.length && cb.length) return { parts: [{ head: a.h, cards: ca }, { head: b.h, cards: cb }] };
      }
    }
    const cards = pickCards(best, best.can, hand);
    return cards.length ? { parts: [{ head: best.h, cards }] } : null;
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
      for (let k = 0; k < (RULES.copies || 1); k++) for (let c = 0; c < this.colors; c++) for (let r = 1; r <= RULES.ranks; r++) deck.push({ id: id++, c, r });
      shuffle(deck);
      const B = RULES.bosses[this.boss], keyBase = KEYBASE[this.boss];
      this.mirror = !!B.mirror; this.lock = -1; this.lockSeat = -1; this.lockSelf = this.N <= RULES.mirrorSelf;       // Kagami: the locked color (-1: none)
      this.defs = B.acts;
      const handN = this.handSize = this.N === 5 ? RULES.hand5 : B.hand || RULES.hand;
      this.energy = RULES.energyStart; this.showQueue = []; this.turnUsed = {}; this.stat = { tweak: 0, handoff: 0, charge: 0, reveal: 0, weak: 0 };
      this.hands = this.players.map((_, i) => deck.slice(i * handN, (i + 1) * handN).sort(byCard));
      this.box = deck.slice(this.N * handN);          // never seen in play
      this.boxed = this.box.length;
      this.known = this.players.map(() => []);             // cards everyone has seen each Hero holding
      this.acts = (B.draws || RULES.actDraws[this.N]).map((k, a) =>
        shuffle(this.defs[a].map(([type, need, name, hex], i) => ({ act: a, type, need: need[Math.min(this.N - 2, need.length - 1)], needs: need.slice(), name, hex: hex || null, key: keyBase + a * 6 + i, weak: weakOf(type, a, i) }))).slice(0, k));
      this.total = this.acts.reduce((t, x) => t + x.length, 0);
      this.actNo = 0; this.done = 0; this.fights = 0; this.misses = 0; this.hist = []; this.trash = [];   // trash: face-up discard pile, {c, seat}
      this.lead = opts.firstLead != null ? opts.firstLead % this.N : Math.floor(rnd() * this.N);
      this.log = []; this.result = null; this.outcome = null; this.enc = null; this.penalty = null;
      this.seen = new Set();
      if (this.boss === 'vael') {
        this.pile = this.acts[0].slice(); this.slots = new Array(RULES.heads || RULES.bosses.vael.heads[this.N] || 2).fill(null);
        this.say('Vael rises. Season 1 begins.');
        this.grow(); this.startRound();
      } else {
        this.row = this.acts[0].slice();
        this.row.forEach((b) => this.seen.add(b.key));
        this.say('Season 1 lines up: ' + this.row.map((b) => b.name).join(', ') + '.');
        this.startFight(this.row[0]);
      }
    }
    say(m) { this.log.push(m); if (this.log.length > 80) this.log.shift(); }
    over() { return this.phase === 'over'; }
    heroOf(power) { if (!this.powers) return -1; const i = POWERS.findIndex((p) => p.key === power); return this.players.findIndex((p) => p.hero === i); }
    maxAdd(seat, head) {
      if (this.boss === 'vael' && head != null && this.slots[head] && this.slots[head].boss.hex === 'coil') return 1;
      return seat === this.lead && seat === this.heroOf('command') ? 3 : RULES.maxAdd;
    }
    splitBlocked(head) { return this.boss === 'vael' && this.slots[head] && this.slots[head].boss.hex === 'split' && this.round.lastHeads.includes(head); }
    canWild(seat) { return seat === this.heroOf('overcharge') && !this.used.overcharge; }
    canBeacon(seat) { return seat === this.heroOf('beacon') && this.beaconAct !== this.actNo && this.phase === 'build' && seat === this.turnSeat(); }
    turnSeat() { return this.phase !== 'build' ? -1 : this.boss === 'vael' ? (this.lead + this.round.at) % this.N : this.enc.order[this.enc.at]; }
    forget(seat, ids) { this.known[seat] = this.known[seat].filter((c) => !ids.includes(c.id)); }

    /* ---------- Gorvax: one monster at a time ---------- */
    startFight(boss) {
      const order = []; for (let k = 0; k < this.N; k++) order.push((this.lead + k) % this.N);
      this.enc = { boss, st: newCombo(boss.type, boss.need), cards: [], order, at: 0, plays: [] };
      this.phase = 'build'; this.result = null;
      this.say(boss.name + ' attacks: it wants a ' + TYPE[boss.type] + ' of ' + boss.need + '. ' + this.players[this.lead].name + ' leads.');
    }
    need() { return this.enc.boss.need - this.enc.st.n; }

    /* ---------- Vael: two heads, one round at a time ---------- */
    grow() {
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i]) continue;
        if (!this.pile.length && this.actNo < this.acts.length - 1) {
          this.actNo++; this.pile = this.acts[this.actNo].slice();
          this.say(ACTN[this.actNo] + ' begins.');
        }
        if (!this.pile.length) continue;
        const b = Object.assign({}, this.pile.shift());
        this.seen.add(b.key);
        this.slots[i] = { boss: b, st: newCombo(b.type, b.need), cards: [], plays: [], enraged: false };
        this.say('A head grows: ' + b.name + ' wants a ' + TYPE[b.type] + ' of ' + b.need + ' (' + HEX[b.hex].name + ').');
      }
    }
    startRound() {
      this.round = { at: 0, lastHeads: [], plays: [] };
      this.phase = 'build'; this.result = null;
      this.say('New round. ' + this.players[this.lead].name + ' leads.');
    }
    legalFor(seat, head) {
      if (this.phase !== 'build' || seat !== this.turnSeat() || this.hands[seat].length < 2) return [];
      if (this.boss === 'vael') {
        const x = this.slots[head];
        if (!x || x.st.n >= x.boss.need) return [];
        if (this.splitBlocked(head)) return [];
        if (x.enraged && RULES.enragedAny) return this.hands[seat].map((c) => c.id);
        return this.hands[seat].filter((c) => fitsC(x.st, c)).map((c) => c.id);
      }
      return this.open(seat).filter((c) => fitsC(this.enc.st, c)).map((c) => c.id);
    }
    /* the cards a Hero may play right now: everything, minus Kagami's locked color */
    locked(seat) { return this.lock >= 0 && (!this.lockSelf || seat === this.lockSeat); }
    open(seat) { return !this.locked(seat) ? this.hands[seat] : this.hands[seat].filter((c) => c.c !== this.lock); }
    canAddAny(seat) { return this.boss === 'vael' ? this.slots.some((_, h) => this.legalFor(seat, h).length) : this.legalFor(seat, 0).length > 0; }

    act(seat, a) {
      a = a || {};
      if (this.phase === 'build') {
        if (seat !== this.turnSeat()) return { ok: false, error: 'Wait for ' + this.players[this.turnSeat()].name + '.' };
        if (a.type === 'beacon') return this.beacon(seat, a.card | 0);
        if (a.type === 'handoff') return this.handoff(seat, a.card | 0, a.to | 0);
        if (a.type === 'pass') {
          let extra = '';
          if (RULES.passCharge && this.energy < RULES.energyMax) { this.energy++; this.stat.charge++; extra = ' and charges 1 Energy'; }
          this.say(this.players[seat].name + ' passes' + extra + '.');
          if (this.boss === 'vael') { this.round.plays.push({ seat, pass: true }); this.round.lastHeads = []; } else this.enc.plays.push({ seat, pass: true, cards: [] });
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
        for (const c of cs) this.trash.push({ c, seat });
        if (!this.pendingDiscard.length) this.afterDiscards();
        return { ok: true };
      }
      if (this.phase === 'show') {
        if (seat !== this.showQueue[0]) return { ok: false, error: 'Waiting for ' + this.players[this.showQueue[0]].name + ' to show a card.' };
        const c = this.hands[seat].find((x) => x.id === (a.card | 0));
        if (a.type !== 'show' || !c) return { ok: false, error: 'Show one card from your hand.' };
        if (!this.known[seat].some((x) => x.id === c.id)) this.known[seat].push(c);
        this.stat.reveal++; this.say(this.players[seat].name + ' shows ' + cardName(c) + '.');
        this.showQueue.shift();
        if (!this.nextShow()) this.phase = 'result';
        return { ok: true };
      }
      if (this.phase === 'result' && a.type === 'next') { this.advance(); return { ok: true }; }
      return { ok: false, error: 'Not now.' };
    }

    /* Energy: pass one card face down to another Hero. Once a turn, before you add or pass. */
    handoff(seat, id, to) {
      if (this.energy < 1) return { ok: false, error: 'The squad has no Energy.' };
      if (this.turnUsed.handoff) return { ok: false, error: 'One Hand-off a turn.' };
      if (to === seat || !this.players[to]) return { ok: false, error: 'Pick another Hero.' };
      const hand = this.hands[seat], c = hand.find((x) => x.id === id);
      if (!c) return { ok: false, error: 'You don’t have that card.' };
      if (hand.length < 2) return { ok: false, error: 'You have to keep at least one card.' };
      this.energy--; this.turnUsed.handoff = true; this.stat.handoff++;
      this.hands[seat] = hand.filter((x) => x !== c); this.forget(seat, [id]);
      this.hands[to] = this.hands[to].concat(c).sort(byCard);
      this.lastHandoff = { from: seat, to, id };
      this.say(this.players[seat].name + ' spends 1 Energy to hand a card to ' + this.players[to].name + '.');
      return { ok: true };
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

    /* a: { type:'add', head, cards, wild } or, on the Hydra, { type:'add', parts:[{ head, cards }, ...], wild }
       — 1 or 2 cards to one head, or 1 card to each head. */
    add(seat, a) {
      const hand = this.hands[seat], vael = this.boss === 'vael';
      const parts = (vael && Array.isArray(a.parts) ? a.parts : [{ head: vael ? a.head | 0 : 0, cards: a.cards }])
        .map((p) => ({ head: p.head | 0, ids: (p.cards || []).map((x) => x | 0) })).filter((p) => p.ids.length);
      if (!parts.length) return { ok: false, error: 'Pick a card to add.' };
      if (parts.length > (vael ? 2 : 1)) return { ok: false, error: 'Too many targets.' };
      if (parts.length === 2 && (parts[0].head === parts[1].head || parts.some((p) => p.ids.length !== 1))) return { ok: false, error: 'To feed two heads, add 1 card to each.' };
      const ids = parts.flatMap((p) => p.ids);
      if (new Set(ids).size !== ids.length) return { ok: false, error: 'Pick different cards.' };
      if (ids.length >= hand.length) return { ok: false, error: 'You have to keep at least one card.' };
      const tweak = a.tweak && a.tweak.id != null ? { id: a.tweak.id | 0, d: a.tweak.d > 0 ? 1 : -1 } : null;
      if (tweak && (!ids.includes(tweak.id) || this.energy < 1)) return { ok: false, error: 'The squad has no Energy for a Tweak.' };
      const wild = a.wild == null ? null : a.wild | 0;
      if (wild != null && (!ids.includes(wild) || !this.canWild(seat))) return { ok: false, error: 'You can’t use Overcharge now.' };
      const plan = [];
      for (const p of parts) {
        const tgt = vael ? this.slots[p.head] : this.enc;
        if (!tgt) return { ok: false, error: 'There’s no head there.' };
        if (vael && this.splitBlocked(p.head)) return { ok: false, error: 'Split: you can’t feed ' + tgt.boss.name + ' right after the Hero before you did.' };
        const max = this.maxAdd(seat, vael ? p.head : null), rem = tgt.boss.need - tgt.st.n;
        if (p.ids.length > max) return { ok: false, error: 'Add at most ' + max + ' card' + (max > 1 ? 's' : '') + ' to ' + (vael ? tgt.boss.name : 'the combo') + '.' };
        if (p.ids.length > rem) return { ok: false, error: 'That combo only needs ' + rem + ' more.' };
        const st = copyC(tgt.st), placed = [];
        for (const id of p.ids) {
          const c = hand.find((x) => x.id === id);
          if (c && this.locked(seat) && c.c === this.lock) return { ok: false, error: COLORS[this.lock] + ' is locked by the mirror for this fight.' };
          if (!c) return { ok: false, error: 'You don’t have that card.' };
          if (id === wild) {
            const v = wildAs(st, c);
            if (!v) return { ok: false, error: 'Overcharge needs a combo already started, with room to grow.' };
            const w = { id: c.id, c: v.c, r: v.r, wild: true, real: c };
            addC(st, w); placed.push(w);
          } else if (tweak && id === tweak.id) {
            const r = c.r + tweak.d;
            if (r < 1 || r > RULES.ranks) return { ok: false, error: 'A Tweak can’t go past 1 or ' + RULES.ranks + '.' };
            const w = { id: c.id, c: c.c, r, tweaked: tweak.d, real: c };
            if (!fitsC(st, w)) return { ok: false, error: cardName(c) + ' as a ' + r + ' doesn’t fit that combo.' };
            addC(st, w); placed.push(w);
          } else {
            if (!(vael && tgt.enraged && RULES.enragedAny) && !fitsC(st, c)) return { ok: false, error: cardName(c) + ' doesn’t fit that combo.' };
            addC(st, c); placed.push(c);
          }
        }
        plan.push({ p, tgt, st, placed });
      }
      if (tweak) { this.energy--; this.stat.tweak++; this.say(this.players[seat].name + ' spends 1 Energy on a Tweak.'); }
      if (wild != null) { this.used.overcharge = true; this.say(this.players[seat].name + ' uses Overcharge.'); }
      for (const { tgt, st, placed } of plan) {
        tgt.st = st; tgt.cards = tgt.cards.concat(placed);
        tgt.plays.push({ seat, cards: placed }); tgt.fed = true;
        this.say(this.players[seat].name + ' adds ' + placed.map(cardName).join(' and ') + (vael ? ' to ' + tgt.boss.name : '') + '.');
      }
      this.hands[seat] = hand.filter((c) => !ids.includes(c.id));
      this.forget(seat, ids);
      if (vael) {
        this.round.plays.push({ seat, parts: plan.map(({ p, placed }) => ({ head: p.head, n: placed.length })) });
        this.round.lastHeads = plan.map(({ p }) => p.head);
        this.nextTurn(); return { ok: true };
      }
      if (this.need() <= 0) { this.resolve(); return { ok: true }; }
      this.nextTurn(); return { ok: true };
    }
    nextTurn() {
      this.turnUsed = {};
      if (this.boss === 'vael') { this.round.at++; if (this.round.at >= this.N) this.endRound(); return; }
      this.enc.at++;
      if (this.enc.at >= this.N) this.resolve();
    }

    /* Gorvax: check the combo */
    resolve() {
      const met = this.need() <= 0;
      this.fights++; this.hist.push({ key: this.enc.boss.key, met });
      this.result = { met, discards: {}, bounced: [] };
      if (met || !RULES.replay) this.row = this.row.filter((b) => b !== this.enc.boss);   // beaten (or, without replay, missed): the monster leaves
      if (met) {
        this.done++;
        this.say('Combo complete! ' + this.enc.boss.name + ' is defeated.');
        if (this.mirror) { const fc = this.enc.cards[this.enc.cards.length - 1]; this.lock = (fc.real || fc).c; this.lockSeat = this.enc.plays.filter((p) => p.cards && p.cards.length).pop().seat; this.say('The mirror locks ' + COLORS[this.lock] + ': ' + (this.lockSelf ? this.players[this.lockSeat].name : 'nobody') + ' can' + (this.lockSelf ? '’t' : '') + ' play ' + COLORS[this.lock] + ' against the next monster.'); }
        this.weakHit(this.enc, this.result);
        if (!this.nextShow()) this.phase = 'result';
        return;
      }
      this.misses++;
      for (const p of this.enc.plays) if (p.cards.length) {
        const real = p.cards.map((c) => c.real || c);
        this.hands[p.seat] = this.hands[p.seat].concat(real).sort(byCard);
        this.known[p.seat] = this.known[p.seat].concat(real).sort(byCard);
        this.result.bounced.push({ seat: p.seat, cards: real });
      }
      this.say('The combo falls short. ' + (RULES.replay ? this.enc.boss.name + ' stands its ground and must be fought again.' : this.enc.boss.name + ' gets away.') + ' The cards go back to their Heroes.');
      this.startPenalty(this.players.map(() => RULES.missDiscard), () => { this.phase = 'result'; });
    }

    weakHit(x, res) {
      const hit = RULES.weakFinish ? isWeak(x.boss.weak, x.cards[x.cards.length - 1]) : x.cards.some((c) => isWeak(x.boss.weak, c));
      if (!hit) return;
      res.weak = (res.weak || 0) + 1; this.stat.weak++;
      const seat = x.plays.filter((p) => p.cards && p.cards.length).pop().seat;
      let msg = 'A finishing blow on ' + x.boss.name + '’s weak spot (' + weakName(x.boss.weak) + ')';
      if (RULES.weakEnergy) { const got = Math.min(RULES.weakEnergy, RULES.energyMax - this.energy); this.energy += got; msg += got ? ': the squad gains ' + got + ' Energy' : ''; }
      this.say(msg + '.');
      if (RULES.weakShow) this.showQueue.push(seat);
    }
    /* after a weak-spot hit, the Hero who landed it shows a card before play goes on */
    nextShow() {
      while (this.showQueue.length) {
        const s = this.showQueue[0];
        if (this.hands[s].some((c) => !this.known[s].some((k) => k.id === c.id))) { this.phase = 'show'; return true; }
        this.showQueue.shift();       // everything they hold is already known
      }
      return false;
    }
    /* Vael: end of a round */
    endRound() {
      this.fights++;
      const res = { cut: [], struck: [], enraged: [], hunger: [], spite: [], discards: {} };
      const counts = this.players.map(() => 0);
      this.slots.forEach((x, i) => {
        if (!x) return;
        if (x.st.n >= x.boss.need) res.cut.push(i);
        else if (x.enraged && (x.rage || 0) >= RULES.rageRounds) { if (!RULES.starveStrike || !x.fed) res.struck.push(i); }
        else if (x.enraged) x.rage = (x.rage || 0) + 1;
        else res.enraged.push(i);
      });
      this.slots.forEach((x) => { if (x) x.fed = false; });
      const hungry = this.slots.filter((x, i) => x && x.boss.hex === 'hunger' && !res.cut.includes(i) && !res.struck.includes(i)).length;
      for (const i of res.cut) {
        const x = this.slots[i];
        this.done++; this.hist.push({ key: x.boss.key, met: true });
        this.say(x.boss.name + ' is cut off!');
        this.weakHit(x, res);
        if (x.boss.hex === 'spite') { const last = x.plays[x.plays.length - 1].seat; counts[last]++; res.spite.push(last); this.say('Spite: ' + this.players[last].name + ' added the last card and discards 1.'); }
        res.cutHeads = (res.cutHeads || []).concat(x.boss);
        for (const p of x.plays) for (const c of p.cards) this.trash.push({ c: c.real || c, seat: p.seat, spent: true });
        this.slots[i] = null;
      }
      for (const i of res.struck) {
        const x = this.slots[i];
        this.misses++; this.hist.push({ key: x.boss.key, met: false });
        const cost = RULES.strikeDiscard + (x.boss.hex === 'venom' ? 1 : 0);
        for (let p = 0; p < this.N; p++) counts[p] += cost;
        this.say(x.boss.name + ' strikes! Its ' + x.cards.length + ' card' + (x.cards.length === 1 ? ' is' : 's are') + ' lost and every Hero discards ' + cost + '.');
        res.struckHeads = (res.struckHeads || []).concat(x.boss);
        for (const p of x.plays) for (const c of p.cards) this.trash.push({ c: c.real || c, seat: p.seat, spent: true });
        this.slots[i] = null;
      }
      for (const i of res.enraged) {
        const x = this.slots[i]; x.enraged = true; x.rage = 1;
        if (x.boss.hex === 'brood') { x.boss.need++; x.st.need++; x.boss.brooded = true; x.boss.needs = x.boss.needs.map((n) => n + 1); this.say(x.boss.name + ' is enraged and Brood makes it need ' + x.boss.need + '.'); }
        else this.say(x.boss.name + ' is enraged.');
      }
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
      if (this.slots.every((x) => !x)) {
        this.phase = 'over'; this.outcome = { win: true };
        this.say('The last head falls. The squad wins!');
        return;
      }
      if (!this.nextShow()) this.phase = 'result';
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
      if (this.enc && this.result && this.result.met) for (const p of this.enc.plays) for (const c of p.cards) this.trash.push({ c: c.real || c, seat: p.seat, spent: true });
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
        this.say(ACTN[this.actNo] + ' lines up: ' + this.row.map((b) => b.name).join(', ') + '.');
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
      const combo = (x) => x && ({ boss: x.boss, cards: x.cards.slice(), need: x.boss.need - x.st.n, total: x.boss.need, type: x.st.type, n: x.st.n, rank: x.st.rank, color: x.st.color, lo: x.st.lo, hi: x.st.hi, mask: x.st.mask || 0, enraged: !!x.enraged, plays: x.plays.map((p) => ({ seat: p.seat, n: p.cards.length })), who: Object.fromEntries(x.plays.flatMap((p) => p.cards.map((c) => [c.id, p.seat]))) });
      return {
        seat, lock: this.lock, lockSeat: this.lockSelf ? this.lockSeat : -1, lockedMe: this.locked(seat), mirror: this.mirror, boss: this.boss, bossName: RULES.bosses[this.boss].name, phase: this.phase, colors: this.colors, total: this.total, done: this.done, misses: this.misses, fights: this.fights,
        energy: this.energy, energyMax: RULES.energyMax, showSeat: this.phase === 'show' ? this.showQueue[0] : -1, canHandoff: this.phase === 'build' && seat === turn && this.energy > 0 && !this.turnUsed.handoff && this.hands[seat].length > 1,
        boxed: this.boxed, maxAdd: this.maxAdd(seat), maxAddHead: vael ? this.slots.map((_, h) => this.maxAdd(seat, h)) : null, act: this.actNo, lead: this.lead, powers: this.powers,
        players: this.players.map((p, i) => ({ name: p.name, bot: p.bot, hero: p.hero, count: this.hands[i].length,
          known: this.known[i].slice(),
          power: this.powers ? Object.assign({ used: (POWERS[p.hero].key === 'riptide' && this.used.riptide) || (POWERS[p.hero].key === 'overcharge' && this.used.overcharge) || (POWERS[p.hero].key === 'beacon' && this.beaconAct === this.actNo) }, POWERS[p.hero]) : null,
          needsDiscard: this.phase === 'discard' && this.pendingDiscard.includes(i),
          discardCount: this.phase === 'discard' ? this.discardCount(i) : 0 })),
        hand: this.hands[seat].slice(),
        turn, legal: vael ? this.slots.map((_, h) => this.legalFor(seat, h)) : [this.legalFor(seat, 0)],
        canPass: true,
        canWild: this.phase === 'build' && seat === turn && this.canWild(seat), canBeacon: this.canBeacon(seat),
        riptide: this.phase === 'riptide' ? { seat: this.heroOf('riptide'), counts: this.penalty.counts.slice() } : null,
        row: vael ? [] : this.row.slice(), upcoming: vael ? [] : this.row.filter((b) => !this.enc || b !== this.enc.boss),
        enc: vael ? null : this.enc && Object.assign(combo(this.enc), { order: this.enc.order.slice(), at: this.enc.at,
          plays: this.enc.plays.map((p) => ({ seat: p.seat, pass: !!p.pass, n: p.cards.length })) }),
        heads: vael ? this.slots.map(combo) : null,
        pile: vael ? this.pile.length : 0,
        round: vael ? { at: this.round.at, lastHeads: this.round.lastHeads.slice(), plays: this.round.plays.slice() } : null,
        result: this.result && {
          met: this.result.met, weak: this.result.weak || 0, bounced: this.result.bounced || [],
          cut: this.result.cutHeads || [], struck: this.result.struckHeads || [], enraged: (this.result.enraged || []).map((i) => this.slots[i] && this.slots[i].boss.name).filter(Boolean), hunger: this.result.hunger || [], spite: this.result.spite || [],
          discards: Object.keys(this.result.discards || {}).map((k) => ({ seat: +k, cards: this.result.discards[k] })),
        },
        acts: this.acts.map((x, a) => ({ n: x.length })),
        hist: this.hist.slice(),
        trash: this.trash.slice(-12), trashN: this.trash.length,
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
        this.botHandoff(s);
        const pick = this.simple ? this.simplePick(s) : chooseBuild(this, s, RULES.lookahead);
        if (pick && pick.parts.some((x) => x.cards.length)) { const r = this.act(s, { type: 'add', parts: pick.parts, head: pick.parts[0].head, cards: pick.parts[0].cards, tweak: pick.tweak }); if (r.ok) return true; }
        this.act(s, { type: 'pass' });
        return true;
      }
      if (this.phase === 'show') {
        const s = this.showQueue[0]; if (!this.players[s].bot) return false;
        this.act(s, { type: 'show', card: this.botBeacon(s, this.hands[s].filter((c) => !this.known[s].some((k) => k.id === c.id))).id });
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
        at: this.boss === 'vael' ? this.round.at : 0, lastHeads: this.boss === 'vael' ? this.round.lastHeads : [],
        slots: this.boss === 'vael' ? this.slots.map((x) => x && { m: { type: x.boss.type, need: x.boss.need, hex: x.boss.hex }, st: x.st, enr: x.enraged, rage: x.rage || 0 }) : null };
    }
    simplePick(s) {
      if (this.boss === 'vael') {
        const p = hydraPick(this.fast(), s);
        return p && { parts: p.parts.map((x) => ({ head: x.head, cards: x.cards.map((c) => c.id) })) };
      }
      const hand = this.open(s), full = this.hands[s].length;
      if (!hand.some((c) => fitsC(this.enc.st, c)) || full < 2) return null;
      const st = copyC(this.enc.st);
      return { parts: [{ head: 0, cards: simplePlay(hand, st, Math.min(this.maxAdd(s), this.need(), full - 1)).map((c) => c.id) }] };
    }
    /* Overcharge: use it when it finishes a combo this turn. */
    botWild(s) {
      if (!this.canWild(s)) return null;
      const hand = this.hands[s];
      const targets = this.boss === 'vael' ? this.slots.map((_, h) => h).filter((h) => this.slots[h] && !this.splitBlocked(h)).map((h) => ({ h, x: this.slots[h] })) : [{ h: 0, x: this.enc }];
      for (const { h, x } of targets) {
        const rem = x.boss.need - x.st.n, max = this.maxAdd(s, this.boss === 'vael' ? h : null);
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
    botBeacon(s, from) { const h = this.hands[s]; let b = (from || h)[0], bu = -1; for (const c of from || h) { const u = useful(c, h); if (u > bu) { bu = u; b = c; } } return b; }
    /* Hand-off: when a teammate is nearly out of cards and this Hero has plenty, pass over the least useful card. */
    botHandoff(s) {
      if (this.energy < 1 || this.turnUsed.handoff) return;
      const mine = this.hands[s].length; let low = -1, n = 1e9;
      this.hands.forEach((h, p) => { if (p !== s && h.length < n) { n = h.length; low = p; } });
      if (low < 0 || n > 2 || mine < n + 3) return;
      this.act(s, { type: 'handoff', card: worst(this.hands[s], this.hands[s]).id, to: low });
    }
  }

  /* ---------- look-ahead bots ----------
     Before each play or discard, a bot imagines deals of the cards it can't see (it only uses its own hand,
     the face-up Boss cards and cards it has seen), plays each option out to the end with the simple bot, and
     keeps the option that wins most often. One-time powers are left out of the imagined games. */
  function rolloutG(s) {   // Gorvax
    const N = s.N, hands = s.hands, line = s.line;
    let lead = s.lead, st = s.st, at = s.at, plays = s.plays, li = s.li || 0, lock = s.lock == null ? -1 : s.lock, lockSeat = s.lockSeat == null ? -1 : s.lockSeat, lastC = s.lastC || null, lastP = -1;
    while (li < line.length) {
      const m = line[li];
      if (!st) { st = newCombo(m.type, m.need); at = 0; plays = []; }
      while (at < N && st.n < m.need) {
        const p = (lead + at) % N, h = hands[p], ho = lock < 0 || (s.lockSelf && p !== lockSeat) ? h : h.filter((c) => c.c !== lock);
        if (h.length > 1 && ho.some((c) => fitsC(st, c))) {
          const max = p === lead && p === s.cmd ? 3 : RULES.maxAdd;
          const cs = simplePlay(ho, st, Math.min(max, m.need - st.n, h.length - 1));
          if (cs.length) { hands[p] = h.filter((x) => !cs.includes(x)); plays.push(p, cs); lastC = cs[cs.length - 1]; lastP = p; }
        }
        at++;
      }
      if (st.n < m.need) {
        for (let i = 0; i < plays.length; i += 2) hands[plays[i]] = hands[plays[i]].concat(plays[i + 1]);
        for (let i = 0; i < N; i++) { hands[i] = simpleDiscard(hands[i], RULES.missDiscard - (i === s.steady ? 1 : 0)); if (!hands[i].length) return 0; }
      }
      if (st.n >= m.need && s.mirror && lastC) { lock = lastC.c; if (lastP >= 0) lockSeat = lastP; }
      if (st.n >= m.need || !RULES.replay) li++;
      lead = (lead + 1) % N; st = null;
    }
    return 1;
  }
  function rolloutV(s) {   // Vael
    const N = s.N, hands = s.hands, pile = s.pile;
    const slots = s.slots.map((x) => x && { m: Object.assign({}, x.m), st: copyC(x.st), enr: x.enr, rage: x.rage || 0, fed: x.fed, last: x.last });
    let lead = s.lead, at = s.at, lastHeads = s.lastHeads || [], pi = 0;
    const st = { N, hands, slots, lead, at, lastHeads, cmd: s.cmd };
    const growF = () => { for (let i = 0; i < slots.length; i++) if (!slots[i] && pi < pile.length) { const m = Object.assign({}, pile[pi++]); slots[i] = { m, st: newCombo(m.type, m.need), enr: false, last: -1 }; } };
    if (s.fresh) growF();
    for (let guard = 0; guard < 80; guard++) {
      if (slots.every((x) => !x)) return 1;
      st.lead = lead;
      for (; at < N; at++) {
        const p = (lead + at) % N; st.at = at; st.lastHeads = lastHeads;
        const pick = hydraPick(st, p);
        if (pick) {
          lastHeads = [];
          for (const part of pick.parts) { const x = slots[part.head]; for (const c of part.cards) addC(x.st, c); x.last = p; x.fed = true; hands[p] = hands[p].filter((c) => !part.cards.includes(c)); lastHeads.push(part.head); }
        } else lastHeads = [];
      }
      // end of round
      const counts = new Array(N).fill(0);
      let hungry = 0;
      for (let i = 0; i < slots.length; i++) {
        const x = slots[i]; if (!x) continue;
        if (x.st.n >= x.m.need) { if (x.m.hex === 'spite' && x.last >= 0) counts[x.last]++; slots[i] = null; continue; }
        if (x.enr && x.rage < RULES.rageRounds) { x.rage++; }
        else if (x.enr) { if (!RULES.starveStrike || !x.fed) { const cost = RULES.strikeDiscard + (x.m.hex === 'venom' ? 1 : 0); for (let p = 0; p < N; p++) counts[p] += cost; slots[i] = null; continue; } }
        else { x.enr = true; x.rage = 1; if (x.m.hex === 'brood') { x.m.need++; x.st.need++; } }
        if (x.m.hex === 'hunger') hungry++;
      }
      for (const x of slots) if (x) x.fed = false;
      for (let k = 0; k < hungry; k++) { let t = 0, most = -Infinity; for (let j = 0; j < N; j++) { const p = (lead + j) % N, n = hands[p].length - counts[p]; if (n > most) { most = n; t = p; } } counts[t]++; }
      if (s.steady >= 0 && counts[s.steady] > 0) counts[s.steady]--;
      for (let p = 0; p < N; p++) if (counts[p]) { hands[p] = simpleDiscard(hands[p], counts[p]); if (!hands[p].length) return 0; }
      growF();
      lead = (lead + 1) % N; at = 0; lastHeads = [];
    }
    return 0;
  }
  // A guess at the Boss cards still face down, drawn from what hasn't been seen yet.
  function futureOf(g) {
    const B = RULES.bosses[g.boss], base = KEYBASE[g.boss];
    const out = [];
    const unseen = (a) => shuffle(g.defs[a].map(([type, need, name, hex], i) => ({ type, need: need[Math.min(g.N - 2, need.length - 1)], hex: hex || null, key: base + a * 6 + i })).filter((m) => !g.seen.has(m.key)));
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
    const hand = g.open(seat), full = g.hands[seat].length, opts = [{ parts: [] }];
    const vael = g.boss === 'vael';
    const singles = {};
    for (const h of vael ? g.slots.map((_, i) => i) : [0]) {
      if (!g.legalFor(seat, h).length) continue;
      const x = vael ? g.slots[h] : g.enc, rem = x.boss.need - x.st.n, cap = Math.min(g.maxAdd(seat, vael ? h : null), rem, full - 1);
      const seen = new Set();
      if (vael && x.enraged && RULES.enragedAny) {
        const pool = hand.slice().sort((a, b) => useful(a, hand) - useful(b, hand)).slice(0, 6);
        singles[h] = pool.slice(0, 4);
        (function pickAny(start, picked) {
          if (picked.length) opts.push({ parts: [{ head: h, cards: picked }] });
          if (picked.length >= cap) return;
          for (let i = start; i < pool.length; i++) pickAny(i + 1, picked.concat(pool[i]));
        })(0, []);
        continue;
      }
      singles[h] = hand.filter((c) => fitsC(x.st, c));
      (function grow(st, picked) {
        if (picked.length) {
          const key = g.mirror ? picked.map((c) => c.id).join(':') : picked.map((c) => c.id).sort((a, b) => a - b).join(':');   // against the mirror, which card goes last matters
          if (!seen.has(key)) { seen.add(key); opts.push({ parts: [{ head: h, cards: picked }] }); }
        }
        if (picked.length >= cap || opts.length > 90) return;
        for (const c of hand) {
          if (picked.includes(c) || !fitsC(st, c)) continue;
          const t = copyC(st); addC(t, c); grow(t, picked.concat(c));
        }
      })(copyC(x.st), []);
    }
    // one card to each head (the least useful few that fit each)
    if (vael && hand.length >= 3) {
      const top = (cs) => cs.slice().sort((a, b) => useful(a, hand) - useful(b, hand)).slice(0, g.slots.length > 2 ? 3 : 4);
      const hs = Object.keys(singles).map(Number);
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++)
        for (const a of top(singles[hs[i]])) for (const b of top(singles[hs[j]])) if (a !== b) opts.push({ parts: [{ head: hs[i], cards: [a] }, { head: hs[j], cards: [b] }] });
    }
    return opts;
  }
  /* With Energy to spend, also try each card one rank up or down: alone, or beside one plain card. */
  function tweakOptions(g, seat, opts) {
    if (g.energy < 1) return;
    const hand = g.open(seat), vael = g.boss === 'vael';
    for (const h of vael ? g.slots.map((_, i) => i) : [0]) {
      const x = vael ? g.slots[h] : g.enc;
      if (!x || x.st.n >= x.boss.need || !x.st.n || g.hands[seat].length < 2 || (vael && g.splitBlocked(h))) continue;
      const rem = x.boss.need - x.st.n, cap = Math.min(g.maxAdd(seat, vael ? h : null), rem, g.hands[seat].length - 1);
      if (cap < 1) continue;
      for (const c of hand) for (const d of [-1, 1]) {
        const r = c.r + d; if (r < 1 || r > RULES.ranks) continue;
        const v = { id: c.id, c: c.c, r, tweaked: d, real: c };
        if (fitsC(x.st, c) || !fitsC(x.st, v)) continue;        // only worth it when the plain card doesn't fit
        opts.push({ parts: [{ head: h, cards: [v] }], tweak: { id: c.id, d } });
        if (cap >= 2) { const t = copyC(x.st); addC(t, v); for (const c2 of hand) if (c2 !== c && fitsC(t, c2)) { opts.push({ parts: [{ head: h, cards: [v, c2] }], tweak: { id: c.id, d } }); break; } }
      }
    }
  }
  const optCards = (o) => o.parts.flatMap((p) => p.cards);
  function stateAfter(g, deal, future, seat, o) {
    const hands = deal.slice(), used = optCards(o), gone = used.map((c) => c.real || c);
    if (used.length) hands[seat] = hands[seat].filter((c) => !gone.includes(c));
    const base = { N: g.N, hands, lead: g.lead, cmd: g.heroOf('command'), steady: g.heroOf('steady') };
    if (g.boss === 'vael') {
      const slots = g.slots.map((x) => x && { m: { type: x.boss.type, need: x.boss.need, hex: x.boss.hex }, st: copyC(x.st), enr: x.enraged, rage: x.rage || 0, fed: !!x.fed, last: x.plays.length ? x.plays[x.plays.length - 1].seat : -1 });
      for (const p of o.parts) { for (const c of p.cards) addC(slots[p.head].st, c); slots[p.head].last = seat; slots[p.head].fed = true; }
      return Object.assign(base, { slots, pile: future, at: g.round.at + 1, lastHeads: o.parts.map((p) => p.head) });
    }
    const e = g.enc, st = copyC(e.st), plays = [];
    e.plays.forEach((p) => { if (p.cards.length) plays.push(p.seat, p.cards.map((c) => c.real || c)); });
    if (used.length) { for (const c of used) addC(st, c); plays.push(seat, gone); }
    const lastC = used.length ? gone[gone.length - 1] : e.cards.length ? (e.cards[e.cards.length - 1].real || e.cards[e.cards.length - 1]) : null;
    return Object.assign(base, { line: g.row.concat(future), li: 0, st, at: e.at + 1, plays, lock: g.lock, mirror: g.mirror, lastC, lockSeat: used.length ? seat : g.lockSeat, lockSelf: g.lockSelf });
  }
  function chooseBuild(g, seat, samples) {
    const opts = buildOptions(g, seat);
    tweakOptions(g, seat, opts);
    const out = (o) => ({ parts: o.parts.map((p) => ({ head: p.head, cards: p.cards.map((c) => c.id) })), tweak: o.tweak || null });
    // Weak spots. A finishing add puts a weak-spot card last when it has one; and a bot will leave the last slot open
    // for a teammate still to play this lap who is known to hold a weak-spot card that fits.
    const tgtOf = (p) => g.boss === 'vael' ? g.slots[p.head] : g.enc;
    const later = []; if (g.boss === 'vael') { for (let i = g.round.at + 1; i < g.N; i++) later.push((g.lead + i) % g.N); } else later.push(...g.enc.order.slice(g.enc.at + 1));
    if (!g.mirror) for (const o of opts) for (const p of o.parts) { const x = tgtOf(p); if (p.cards.length === x.boss.need - x.st.n) { const k = p.cards.findIndex((c) => isWeak(x.boss.weak, c)); if (k >= 0) p.cards.push(p.cards.splice(k, 1)[0]); } }
    const weakBonus = (o) => {
      if (!RULES.weakShow && !RULES.weakEnergy) return 0;
      let b = 0;
      for (const p of o.parts) {
        const x = tgtOf(p), rem = x.boss.need - x.st.n;
        if (p.cards.length === rem) { if (isWeak(x.boss.weak, p.cards[p.cards.length - 1])) b += RULES.botWeak; }
        else if (p.cards.length === rem - 1 && RULES.botWeak > 1) {
          const st = copyC(x.st); for (const c of p.cards) addC(st, c);
          if (later.some((t) => g.known[t].some((c) => isWeak(x.boss.weak, c) && fitsC(st, c)))) b += RULES.botWeak * 0.6;
        }
      }
      return b;
    };
    if (opts.length === 1) return out(opts[0]);
    const keyOf = (parts) => parts.map((p) => p.head + ':' + p.cards.map((c) => (typeof c === 'number' ? c : c.id)).sort((a, b) => a - b).join(',')).sort().join('|');
    const simple = g.simplePick(seat), skey = simple ? keyOf(simple.parts) : '';
    const score = new Float64Array(opts.length);
    const run = g.boss === 'vael' ? rolloutV : rolloutG;
    for (let k = 0; k < samples; k++) {
      const deal = determinize(g, seat), future = futureOf(g);
      opts.forEach((o, i) => { score[i] += run(stateAfter(g, deal, future, seat, o)); });
    }
    let best = 0, bs = -1;
    opts.forEach((o, i) => { const sc = score[i] + (keyOf(o.parts) === skey && !o.tweak ? 0.5 : 0) + weakBonus(o) - (o.tweak ? 1 : 0); if (sc > bs) { bs = sc; best = i; } });
    return out(opts[best]);
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
          const slots = g.slots.map((x) => x && { m: { type: x.boss.type, need: x.boss.need, hex: x.boss.hex }, st: copyC(x.st), enr: x.enraged, rage: x.rage || 0, fed: !!x.fed, last: x.plays.length ? x.plays[x.plays.length - 1].seat : -1 });
          score[i] += rolloutV(Object.assign(base, { slots, pile: future, at: 0, lastHeads: [], fresh: true }));
        } else score[i] += rolloutG(Object.assign(base, { line: g.row.concat(future), li: 0, st: null, lock: g.lock, mirror: g.mirror, lockSeat: g.lockSeat, lockSelf: g.lockSelf }));
      });
    }
    let best = 0; opts.forEach((_, i) => { if (score[i] > score[best]) best = i; });
    return opts[best].map((c) => c.id);
  }

  const api = { RULES, COLORS, TYPE, HEX, POWERS, BOT_NAMES, BANDS, Game, fits, cardName, isWeak, weakName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sentai = api;
})(typeof window !== 'undefined' ? window : globalThis);
