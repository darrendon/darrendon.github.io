/* Mr. Magpie — rules engine and bots. Runs in the browser (window.MrMagpie) and in node
   (module.exports), so bot-only games can be checked headless: node sim.js 3000
   Every number a playtest might tune lives in RULES. */
(function (root) {
  'use strict';
  const RULES = {
    hand: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20], // every critter's starting acorn cards: a wide range, and no making change
    treasures: [                                        // open auctions: the last critter in wins it
      { name: 'Silver Thimble', vp: 5 }, { name: 'Old Key', vp: 5 }, { name: 'Jingle Bell', vp: 6 },
      { name: 'Teaspoon', vp: 6 }, { name: 'Pocket Mirror', vp: 7 }, { name: 'Locket', vp: 8 },
      { name: 'Brass Compass', vp: 9 }, { name: 'Pocket Watch', vp: 11 }, { name: 'Tiara', vp: 13 },
      { name: 'Disco Ball', vp: 15 },
      { name: 'Glass Marble', vp: 6 }, { name: 'Opera Glasses', vp: 8 }, { name: 'Music Box', vp: 10 }, { name: 'Goblet', vp: 12 },
    ],
    frosts: [                                           // sealed offers; the last one drawn is the first snow
      { name: 'Icicle Pendant', vp: 7 }, { name: 'Crystal Brooch', vp: 8 },
      { name: 'Silver Ring', vp: 9 }, { name: 'Frosted Lantern', vp: 10 },
    ],
    baubles: { earring: 13, berry: 13, button: 13, feather: 13, cap: 13, bead: 13 },   // 78 cards, enough that the bag never runs dry at 5
    lostAcorns: [],                                     // no acorn cards in the bauble deck: acorns only come from the acorn deck
    looseAcorns: Array(18).fill(1).concat(Array(12).fill(2), Array(6).fill(3)),   // the acorn deck, face down: pass without offering and draw one
    rowExtra: 2,                                        // the bauble row holds players + this many
    earring: { single: -2, pair: 7 },                   // one alone is useless; each pair scores
    berry: [0, 3, 6, 10, 4, 0],                          // a few are lovely, too many spoil
    button: [0, 2, 5, 9, 14, 20, 27],                   // the bigger the collection, the better
    feather: { each: 2, most: 8, second: 4 },
    bead: [0, 1, -3, 6, 10, 14, 18],                    // one is a trinket, two is a broken string, three or more is a necklace
    cap: { each: 1, fewest: -6 },                       // everyone needs a few: whoever has the fewest loses points (nobody does if all are level)           // ties take the lower place
  };
  const BAUBLE = {
    earring: { name: 'Earring', plural: 'Earrings', rule: 'One alone −2 · each pair +7' },
    berry: { name: 'Berry', plural: 'Berries', rule: '1·2·3·4·5+ → 3·6·10·4·0' },
    button: { name: 'Button', plural: 'Buttons', rule: '1·2·3·4·5·6 → 2·5·9·14·20·27' },
    feather: { name: 'Feather', plural: 'Feathers', rule: '2 each · most +8 · second +4' },
    cap: { name: 'Bottle cap', plural: 'Bottle caps', rule: '1 each · fewest −6' },
    bead: { name: 'Glass bead', plural: 'Glass beads', rule: '1·2·3·4·5·6 → 1·−3·6·10·14·18' },
    acorn: { name: 'Lost acorns', plural: 'Lost acorns', rule: 'Goes into your hand' },
  };
  const CRITTERS = ['mouse', 'chipmunk', 'hedgehog', 'rabbit', 'mole'];
  const BOT_NAMES = ['Hazel', 'Bramble', 'Pip', 'Clover', 'Juniper', 'Moss', 'Fern', 'Thistle', 'Rowan', 'Willow'];
  const STYLES = {   // each bot has its own appetite
    greedy:   { mShow: 1.25, side: 0.6, aggr: 1.15, slack: 0.25, saveW: 1.0 },
    magpie:   { mShow: 0.85, side: 1.4, aggr: 1.0, slack: 0.25, saveW: 1.0 },
    careful:  { mShow: 0.9, side: 1.0, aggr: 0.9, slack: 0.10, saveW: 2.0 },
    steady:   { mShow: 1.0, side: 1.0, aggr: 1.05, slack: 0.20, saveW: 1.2 },
  };
  let rnd = Math.random;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sum = (a) => a.reduce((t, x) => t + x, 0);
  const names = (ts) => ts.map((t) => t.name).join(' and the ');
  let RISK = 0.6;   // how much elimination risk bots take for a rolled-over pot
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* every reachable total in a hand, with the fewest cards and with the most cards that make it */
  function sums(hand) {
    let st = new Map([[0, { few: [], many: [] }]]);
    hand.forEach((v, i) => {
      const nx = new Map(st);
      for (const [s, o] of st) {
        const t = s + v, cur = nx.get(t), few = o.few.concat(i), many = o.many.concat(i);
        if (!cur) nx.set(t, { few, many });
        else nx.set(t, { few: few.length < cur.few.length ? few : cur.few, many: many.length > cur.many.length ? many : cur.many });
      }
      st = nx;
    });
    return st;
  }
  const isAcorn = (b) => typeof b === 'string' && b.startsWith('acorn');
  const acornVal = (b) => +b.slice(5);

  /* places for a most-or-fewest race: ties take the lower place */
  function race(counts, places) {
    const out = counts.map(() => 0), vals = [...new Set(counts.filter((x) => x > 0))].sort((a, b) => b - a);
    let spot = 0;
    for (const v of vals) {
      const tied = counts.map((x, i) => (x === v ? i : -1)).filter((i) => i >= 0), last = spot + tied.length - 1;
      tied.forEach((i) => { out[i] = last < places.length ? places[last] : 0; });
      spot += tied.length; if (spot >= places.length) break;
    }
    return out;
  }
  const KINDS = ['earring', 'berry', 'button', 'feather', 'cap', 'bead'];
  function scoreOf(players, R) {
    const has = (k) => !!(R.baubles[k]), n = (p, k) => p.baubles[k] || 0;
    const tab = (t, k) => t[Math.min(k, t.length - 1)];
    const maj = has('feather') ? race(players.map((p) => n(p, 'feather')), [R.feather.most, R.feather.second]) : players.map(() => 0);
    let capPen = players.map(() => 0);
    if (has('cap')) { const c = players.map((p) => n(p, 'cap')), mn = Math.min(...c); if (Math.max(...c) > mn) capPen = c.map((x) => (x === mn ? R.cap.fewest : 0)); }
    return players.map((p, i) => {
      const o = { treasures: sum(p.treasures.map((t) => t.vp)) };
      o.earring = has('earring') ? R.earring.pair * Math.floor(n(p, 'earring') / 2) + R.earring.single * (n(p, 'earring') % 2) : 0;
      o.berry = has('berry') ? tab(R.berry, n(p, 'berry')) : 0;
      o.button = has('button') ? tab(R.button, n(p, 'button')) : 0;
      o.feather = has('feather') ? R.feather.each * n(p, 'feather') + maj[i] : 0;
      o.cap = has('cap') ? R.cap.each * n(p, 'cap') + capPen[i] : 0;
      o.bead = has('bead') ? tab(R.bead, n(p, 'bead')) : 0;
      o.total = o.treasures + KINDS.reduce((t, k) => t + o[k], 0);
      return o;
    });
  }

  class Game {
    constructor(players, opts) {
      opts = opts || {};
      this.R = RULES; this.N = players.length;
      const crit = shuffle(CRITTERS);
      const styles = Object.keys(STYLES);
      this.players = players.map((p, i) => ({
        name: p.name, bot: !!p.bot, critter: crit[i % crit.length], style: styles[Math.floor(rnd() * styles.length)],
        hand: RULES.hand.slice(), treasures: [], baubles: Object.assign({ acorn: 0 }, ...Object.keys(RULES.baubles).map((k) => ({ [k]: 0 }))),
      }));
      if (opts.styles) opts.styles.forEach((s, i) => { if (s && this.players[i]) this.players[i].style = s; });
      const deck = RULES.treasures.map((t) => Object.assign({ frost: false }, t)).concat(RULES.frosts.map((t) => Object.assign({ frost: true }, t)));
      this.deck = shuffle(deck);
      const side = [];
      for (const [t, c] of Object.entries(RULES.baubles)) for (let k = 0; k < c; k++) side.push(t);
      RULES.lostAcorns.forEach((v) => side.push('acorn' + v));
      this.side = shuffle(side); this.row = [];
      this.rowSize = this.N + RULES.rowExtra;
      this.M = sum(RULES.hand) + sum(RULES.lostAcorns) / this.N * 0.5;   // starting acorns plus a share of the lost ones, for the bots
      this.framesLeft = RULES.frosts.length;
      const n = this.deck.length, k = this.framesLeft;
      this.expLots = k * (n + 1) / (k + 1) - 1;
      const avgVp = (sum(RULES.treasures.map((t) => t.vp)) + sum(RULES.frosts.map((t) => t.vp))) / n;
      this.beta = 0.9 * this.N * this.M / (avgVp * this.expLots + 7 * this.N * 2.5);   // acorns per point, for the bots
      this.start = Math.floor(rnd() * this.N); this.firstStart = this.start;
      this.lotNo = 0; this.log = []; this.phase = 'lotEnd'; this.lot = null; this.picks = []; this.result = null; this.final = null;
      this.stats = { washes: 0, solo: 0, lots: 0, frostLots: 0, rolled: 0, potsWon: 0, potVp: 0, lostAtSnow: 0 };
      this.carry = [];   // treasures nobody opened: they stay out and join the next one
      // the acorn deck: pass without offering and draw one, face down, into your hand
      this.looseDeck = shuffle(Array.isArray(RULES.looseAcorns) ? RULES.looseAcorns : Array(RULES.looseAcorns || 0).fill(1));
      this.nextLot(true);
    }
    say(m) { this.log.push(m); if (this.log.length > 80) this.log.shift(); }
    over() { return this.phase === 'over'; }
    money(i) { return sum(this.players[i].hand); }
    reserve() { return Math.round(this.R.hand.length * 5 / 13 * this.remFrac()); }   // cards a bot keeps back for later
    remFrac() { const n = this.deck.length, k = this.framesLeft; if (k <= 0) return 0; return Math.max(0, Math.min(1, (k * (n + 1) / (k + 1) - 1) / Math.max(1, this.expLots))); }

    refill() { while (this.row.length < this.rowSize && this.side.length) this.row.push(this.side.pop()); }
    nextLot(first) {
      // whoever won the last treasure starts; if nobody won it, the start moves to the left
      if (!first) this.start = this.nextStart != null ? this.nextStart : (this.start + 1) % this.N;
      this.nextStart = null;
      this.refill();
      const t = this.deck.pop();
      if (!t) return this.endGame();
      if (t.frost) {
        this.framesLeft--;
        if (this.framesLeft === 0) {
          this.say('The first snow falls on the ' + t.name + '. Winter is here!' + (this.carry.length ? ' Mr. Magpie keeps the ' + names(this.carry) + '.' : ''));
          this.stats.lostAtSnow += this.carry.length; this.snow = t; return this.endGame();
        }
      }
      this.lotNo++; this.stats.lots++;
      const N = this.N, order = [];
      for (let k = 0; k < N; k++) order.push((this.start + k) % N);
      this.lot = { t, extra: this.carry.slice(), order, bids: Array(N).fill(0), spent: Array.from({ length: N }, () => []), out: [], high: 0, highSeat: -1 };
      const with_ = this.carry.length ? ' with the ' + names(this.carry) + ' (' + this.lotVp() + ' in all)' : '';
      this.result = null;
      if (t.frost) {
        this.stats.frostLots++;
        this.phase = 'frost'; this.lot.offers = Array(N).fill(null);
        this.players.forEach((p, i) => { if (!p.hand.length) this.lot.offers[i] = []; });
        this.say('A frost! Mr. Magpie takes secret offerings for the ' + t.name + ' (' + t.vp + ')' + with_ + '.');
        this.checkFrost();
      } else {
        this.phase = 'bid';
        this.lot.active = order.filter((s) => this.players[s].hand.length);
        this.lot.acted = [];
        this.lot.turn = this.lot.active.length ? this.lot.active[0] : -1;
        this.say('Mr. Magpie shows off the ' + t.name + ' (' + t.vp + ')' + with_ + '. ' + (this.lot.turn >= 0 ? this.players[this.lot.turn].name + ' starts.' : ''));
        if (this.lot.turn < 0) this.finishBid();
      }
    }

    act(seat, a) {
      a = a || {};
      const p = this.players[seat];
      if (this.phase === 'pick') {
        const cur = this.picks[0];
        if (!cur || cur.seat !== seat) return { ok: false, error: cur ? 'Wait for ' + this.players[cur.seat].name + ' to take baubles.' : 'Not now.' };
        if (a.type === 'takeMany') {                    // the whole choice at once, confirmed with a button
          const want = Math.min(cur.n, this.row.length);
          const idx = [...new Set((a.idx || []).map((x) => x | 0))].filter((x) => x >= 0 && x < this.row.length);
          if (idx.length !== want) return { ok: false, error: 'Choose ' + want + ' bauble' + (want > 1 ? 's' : '') + ' from the row.' };
          idx.sort((x, y) => y - x).map((x) => this.row.splice(x, 1)[0]).reverse().forEach((b) => this.give(seat, b));
          cur.n -= want; this.afterTake();
          return { ok: true };
        }
        if (a.type !== 'take') return { ok: false, error: 'Take a bauble from the row.' };
        const i = a.i | 0; if (i < 0 || i >= this.row.length) return { ok: false, error: 'Take a bauble from the row.' };
        this.give(seat, this.row.splice(i, 1)[0]);
        cur.n--; this.afterTake();
        return { ok: true };
      }
      if (this.phase === 'bid') {
        const L = this.lot;
        if (seat !== L.turn) return { ok: false, error: L.turn >= 0 ? 'It’s ' + this.players[L.turn].name + '’s turn.' : 'Not now.' };
        if (a.type === 'pass') { this.pass(seat); return { ok: true }; }
        if (a.type !== 'raise') return { ok: false, error: 'Offer acorns or pass.' };
        const idx = [...new Set((a.cards || []).map((x) => x | 0))].filter((x) => x >= 0 && x < p.hand.length);
        if (!idx.length) return { ok: false, error: 'Put at least one acorn card in your offering.' };
        const add = sum(idx.map((x) => p.hand[x]));
        if (L.bids[seat] + add <= L.high) return { ok: false, error: 'Your offering has to beat ' + L.high + '. That only makes ' + (L.bids[seat] + add) + '.' };
        const cards = idx.map((x) => p.hand[x]);
        p.hand = p.hand.filter((_, x) => !idx.includes(x));
        L.bids[seat] += add; L.spent[seat] = L.spent[seat].concat(cards); L.high = L.bids[seat]; L.highSeat = seat;
        if (!L.acted.includes(seat)) L.acted.push(seat);
        this.say(p.name + ' brings ' + cards.join('+') + (L.bids[seat] !== add ? ' (now ' + L.bids[seat] + ')' : '') + '.');
        this.nextTurn(seat);
        return { ok: true };
      }
      if (this.phase === 'frost') {
        if (a.type !== 'offer') return { ok: false, error: 'Make a secret offering (or bring nothing).' };
        if (this.lot.offers[seat]) return { ok: false, error: this.lot.rebid && !this.lot.rebid.includes(seat) ? 'Only the tied critters offer again.' : 'You already brought your offering.' };
        const idx = [...new Set((a.cards || []).map((x) => x | 0))].filter((x) => x >= 0 && x < p.hand.length);
        this.lot.offers[seat] = idx.map((x) => p.hand[x]);
        p.hand = p.hand.filter((_, x) => !idx.includes(x));
        this.checkFrost();
        return { ok: true };
      }
      if (this.phase === 'lotEnd' && a.type === 'next') { this.nextLot(); return { ok: true }; }
      return { ok: false, error: 'Not now.' };
    }
    give(seat, b) {
      const p = this.players[seat];
      if (isAcorn(b)) { p.hand.push(acornVal(b)); p.hand.sort((x, y) => x - y); p.baubles.acorn++; }
      else p.baubles[b]++;
      (this.lot.got = this.lot.got || []).push({ seat, b });
    }
    afterTake() {
      // if the row runs out, refill it face up so everyone always chooses
      while (this.picks.length) {
        const cur = this.picks[0];
        if (cur.n > 0 && !this.row.length) this.refill();
        if (cur.n > 0 && !this.row.length) cur.n = 0;   // the bag is empty too
        if (cur.n > 0) return;
        this.picks.shift();
      }
      this.phase = this.picksThen; this.picksThen = null;
      if (this.phase === 'bid') { if (this.lot.done) this.finishBid(); }
      else if (this.phase === 'frostDone') this.endFrost();
    }
    queuePicks(list, then) {
      this.picks = list.filter((x) => x.n > 0); this.picksThen = then;
      if (!this.picks.length) { this.phase = then; return false; }
      this.phase = 'pick'; this.afterTake(); return true;   // refills straight away if the row is already empty
    }

    pass(seat) {
      const L = this.lot, p = this.players[seat];
      L.active = L.active.filter((s) => s !== seat); L.out.push(seat);
      if (!L.acted.includes(seat)) L.acted.push(seat);
      const n = L.spent[seat].length;
      const loose = !n && this.drawOne(seat);
      this.say(p.name + (n ? ' drops out and takes ' + n + ' bauble' + (n > 1 ? 's' : '') + '.' : loose ? ' passes and draws an acorn card.' : ' passes.'));
      const ended = this.bidEnded();
      if (!ended) this.nextTurn(seat, true);
      L.done = ended;
      if (n) { if (this.queuePicks([{ seat, n }], 'bid')) return; }
      if (ended) this.finishBid();
    }
    bidEnded() {
      const L = this.lot;
      if (L.high > 0) return L.active.length <= 1;
      return L.active.length === 0;            // everyone has passed without an offer
    }
    nextTurn(seat, passed) {
      const L = this.lot;
      if (this.bidEnded()) { L.done = true; L.turn = -1; if (!passed) this.finishBid(); return; }
      // next active critter clockwise from the seat that just acted
      for (let k = 1; k <= this.N; k++) { const s = (seat + k) % this.N; if (L.active.includes(s)) { L.turn = s; break; } }
      if (L.high > 0 && L.turn === L.highSeat && L.active.length === 1) { L.done = true; this.finishBid(); }
    }
    finishBid() {
      const L = this.lot; if (L.finished) return; L.finished = true; L.turn = -1;
      if (L.high === 0) {
        this.stats.washes++;
        this.rollOver();
      } else {
        const w = L.highSeat, solo = L.bids.filter((b) => b > 0).length === 1;
        if (solo) this.stats.solo++;
        this.award(w);
        this.result = { kind: 'win', t: L.t, extra: L.extra, seat: w, bid: L.high, cards: L.spent[w].length, solo };
        this.say(this.players[w].name + ' wins the ' + names([L.t].concat(L.extra)) + ' for ' + L.high + ' acorns.');
      }
      this.phase = 'lotEnd';
    }
    checkFrost() {
      const L = this.lot;
      if (L.offers.some((o) => o === null)) return;
      if (!L.rebid) {
        L.spent = L.offers.map((o) => o.slice());
        L.order.forEach((s) => { if (!L.spent[s].length) this.drawOne(s); });   // brought nothing: a loose acorn
      } else {
        let added = 0;
        L.rebid.forEach((s) => { added += L.offers[s].length; L.spent[s] = L.spent[s].concat(L.offers[s]); });
        if (!added) return this.frostStandoff();
      }
      const tot = L.spent.map((o) => sum(o)); L.bids = tot;
      const top = Math.max(...tot);
      if (top <= 0) { this.rollOver(); return; }
      const tied = L.order.filter((s) => tot[s] === top);
      if (tied.length > 1) {   // a tie for the biggest offering: those critters offer again, in secret, until it breaks
        if (!tied.some((s) => this.players[s].hand.length)) return this.frostStandoff();
        L.rebid = tied; L.high = top; this.stats.rebids = (this.stats.rebids || 0) + 1;
        L.offers = Array(this.N).fill(0).map(() => []);
        tied.forEach((s) => { if (this.players[s].hand.length) L.offers[s] = null; });
        this.say(tied.map((s) => this.players[s].name).join(' and ') + ' tie at ' + top + ' and offer again in secret.');
        return;
      }
      const w = tied[0];
      this.award(w);
      this.result = { kind: 'win', t: L.t, extra: L.extra, seat: w, bid: tot[w], cards: L.spent[w].length, frost: true, offers: tot };
      this.say(this.players[w].name + ' wins the ' + names([L.t].concat(L.extra)) + ' with ' + tot[w] + '. Offerings: ' + L.order.map((s) => this.players[s].name + ' ' + tot[s]).join(', ') + '.');
      this.frostBaubles(w);
    }
    frostBaubles(w) {   // everyone who offered and didn't win takes baubles, biggest offering first
      const L = this.lot, tot = L.bids;
      const list = L.order.filter((s) => s !== w && tot[s] > 0).sort((a, b) => tot[b] - tot[a] || L.order.indexOf(a) - L.order.indexOf(b)).map((s) => ({ seat: s, n: L.spent[s].length }));
      if (!this.queuePicks(list, 'frostDone')) this.endFrost();
    }
    frostStandoff() {   // still tied and nobody added a card: nobody wins it, and it stays out
      const L = this.lot; L.bids = L.spent.map((o) => sum(o));
      this.rollOver();
      this.say('The tie holds and nobody adds a card, so nobody wins it.');
      this.frostBaubles(-1);
    }
    drawOne(seat) {   // the way back in: pass without offering and take a loose acorn
      if (!this.looseDeck.length) return false;
      const p = this.players[seat]; p.hand.push(this.looseDeck.pop()); p.hand.sort((x, y) => x - y); p.loose = (p.loose || 0) + 1;
      return true;
    }
    endFrost() { this.phase = 'lotEnd'; }
    lotVp() { const L = this.lot; return L ? L.t.vp + sum(L.extra.map((t) => t.vp)) : 0; }
    award(w) {
      const L = this.lot; this.players[w].treasures.push(L.t, ...L.extra); this.nextStart = w;
      if (L.extra.length) { this.stats.potsWon++; this.stats.potVp += this.lotVp(); }
      this.carry = [];
    }
    rollOver() {   // nobody opened: the treasure stays out and joins the next one
      const L = this.lot; this.stats.washes++; this.stats.rolled++;
      this.carry = L.extra.concat([L.t]);
      this.result = { kind: 'wash', t: L.t, extra: L.extra, frost: !!L.t.frost };
      this.say('Nobody brings an offering, so the ' + names(this.carry) + (this.carry.length > 1 ? ' stay' : ' stays') + ' out for the next treasure.');
      this.phase = 'lotEnd';
    }

    endGame() {
      const N = this.N, sc = scoreOf(this.players, this.R), money = this.players.map((_, i) => this.money(i));
      const mn = Math.min(...money);
      let out = money.map((m, i) => (m === mn ? i : -1)).filter((i) => i >= 0);   // everyone tied for fewest is out…
      if (out.length === N) out = [];                                              // …unless that's every critter
      const alive = this.players.map((_, i) => i).filter((i) => !out.includes(i));
      let winners = [];
      if (alive.length) {
        const best = Math.max(...alive.map((i) => sc[i].total * 1000 + money[i]));
        winners = alive.filter((i) => sc[i].total * 1000 + money[i] === best);
      }
      this.final = { scores: sc, money, out, winners };
      this.phase = 'over'; this.lot = null; this.result = null; this.picks = [];
      this.say(out.length ? out.map((i) => this.players[i].name).join(' and ') + (out.length > 1 ? ' run' : ' runs') + ' out of acorns for winter.' : 'Everyone is level on acorns, so everyone makes it through winter.')
      if (winners.length) this.say(winners.map((i) => this.players[i].name).join(' and ') + (winners.length > 1 ? ' share the win!' : ' wins!'));
    }

    /* what one seat may see: everything except other hands (only how many cards) and secret frost offers */
    view(seat) {
      const L = this.lot, sc = scoreOf(this.players, this.R);
      return {
        seat, phase: this.phase, lotNo: this.lotNo, start: this.start, rowSize: this.rowSize,
        treasure: L ? L.t : null, extra: L ? L.extra.slice() : [], lotVp: this.lotVp(), deckLeft: this.deck.length, frostsLeft: this.framesLeft, bagLeft: this.side.length, loose: this.looseDeck.length,
        row: this.row.slice(), result: this.result, final: this.final, snow: this.snow || null,
        lot: L && {
          order: L.order, high: L.high, highSeat: L.highSeat, turn: L.turn, out: L.out.slice(), active: L.active ? L.active.slice() : null,
          bids: L.bids.slice(), spent: (this.phase === 'frost' && !L.rebid) ? L.spent.map((s, i) => (i === seat ? s : [])) : L.spent.map((s) => s.slice()), rebid: L.rebid ? L.rebid.slice() : null,
          offered: L.offers ? L.offers.map((o) => o !== null) : null, frost: !!L.t.frost,
        },
        picking: this.phase === 'pick' && this.picks[0] ? { seat: this.picks[0].seat, n: this.picks[0].n } : null,
        players: this.players.map((p, i) => ({
          name: p.name, bot: p.bot, critter: p.critter, money: (i === seat || this.phase === 'over') ? sum(p.hand) : null, cards: p.hand.length,
          treasures: p.treasures.slice(), baubles: Object.assign({}, p.baubles), score: sc[i],
        })),
        hand: this.players[seat].hand.slice(),
        myOffer: L && L.offers ? L.offers[seat] : null,
        log: this.log.slice(-16),
      };
    }

    /* ---------------- bots */
    botDelay() { return this.phase === 'lotEnd' ? (this.result && this.result.kind === 'wash' ? 1700 : 2600) : this.phase === 'pick' ? 700 : this.phase === 'frost' ? 600 : 1000; }
    botStep() {
      if (this.phase === 'pick') { const cur = this.picks[0]; if (!cur || !this.players[cur.seat].bot) return false; this.act(cur.seat, { type: 'take', i: this.botTake(cur.seat) }); return true; }
      if (this.phase === 'bid') { const s = this.lot.turn; if (s < 0 || !this.players[s].bot) return false; this.act(s, this.botBid(s)); return true; }
      if (this.phase === 'frost') { const s = this.lot.offers.findIndex((o, i) => o === null && this.players[i].bot); if (s < 0) return false; this.act(s, { type: 'offer', cards: this.botFrost(s) }); return true; }
      if (this.phase === 'lotEnd') { this.nextLot(); return true; }
      return false;
    }
    st(s) { return STYLES[this.players[s].style]; }
    // bots count every acorn everyone has offered and taken, like a sharp player would
    danger(s) { const me = this.money(s), others = this.players.map((_, i) => i).filter((i) => i !== s).map((i) => this.money(i)).sort((a, b) => a - b); return me <= others[Math.min(1, others.length - 1)]; }
    allowed(s) {
      const me = this.money(s), opp = Math.min(...this.players.map((_, i) => i).filter((i) => i !== s).map((i) => this.money(i)));
      const L = this.lot, pot = L ? sum(L.extra.map((t) => t.vp)) : 0;   // treasures rolled over from before
      const floor = Math.max(1, opp + 1 - this.st(s).slack * this.M * this.remFrac() - RISK * pot * this.beta * this.st(s).aggr);
      return Math.max(0, me - floor);
    }
    itemVp(s, b) {
      const R = this.R, p = this.players[s], S = this.st(s), rf = this.remFrac();
      if (isAcorn(b)) { const v = acornVal(b), d = this.danger(s) ? 1.5 : 0.6; return (v / this.beta * d * S.saveW + 0.3 * v / this.beta) * S.side; }
      const n = p.baubles[b] || 0;
      if (b === 'feather' || b === 'cap') {   // races: score the change for everyone
        const base = scoreOf(this.players, R)[s][b];
        const sim = this.players.map((q, i) => (i === s ? Object.assign({}, q, { baubles: Object.assign({}, q.baubles, { [b]: (q.baubles[b] || 0) + 1 }) }) : q));
        const after = scoreOf(sim, R)[s][b];
        return ((after - base) + (b === 'feather' ? R.feather.most : -R.cap.fewest / 2) * 0.15 * rf) * S.side;
      }
      const T = b === 'berry' ? R.berry : b === 'button' ? R.button : R.bead;
      const lad = (k) => (b === 'earring' ? R.earring.pair * Math.floor(k / 2) + R.earring.single * (k % 2) : T[Math.min(k, T.length - 1)]);
      const imm = lad(n + 1) - lad(n);
      let best = imm; for (const j of [1, 2]) best = Math.max(best, (lad(n + 1 + j) - lad(n)) / (j + 1));
      return (imm + rf * Math.max(0, best - imm) * 0.6) * S.side;
    }
    deckAvg(s) { const c = {}; this.side.slice(-20).forEach((b) => { c[b] = (c[b] || 0) + 1; }); const tot = sum(Object.values(c)); return tot ? sum(Object.entries(c).map(([b, k]) => this.itemVp(s, b) * k)) / tot : 0; }
    kValue(s, k) { if (k <= 0) return 0; const v = this.row.map((b) => this.itemVp(s, b)).sort((a, b) => b - a); return (sum(v.slice(0, k)) + Math.max(0, k - v.length) * this.deckAvg(s)) * this.beta; }
    botTake(s) { let bi = 0, bv = -1e9; this.row.forEach((b, i) => { const v = this.itemVp(s, b); if (v > bv) { bv = v; bi = i; } }); return bi; }
    botBid(s) {
      const L = this.lot, p = this.players[s], S = this.st(s), need = L.high + 1 - L.bids[s];
      const W = this.lotVp() * this.beta * S.mShow * Math.exp(gauss() * 0.15), cap = W * S.aggr;
      const map = sums(p.hand), keys = [...map.keys()].filter((t) => t >= Math.max(1, need)).sort((a, b) => a - b);
      if (!keys.length) return { type: 'pass' };
      const opts = [{ c: keys[0], sub: map.get(keys[0]).few }];
      keys.slice(0, 4).forEach((t) => opts.push({ c: t, sub: map.get(t).many }));
      const allow = this.allowed(s), resB = this.reserve(), nb = L.spent[s].length;
      const P = L.bids[s] > 0 ? this.kValue(s, nb) : 0;
      let best = null, bs = 0;
      for (const o of opts) {
        if (o.c > allow || p.hand.length - o.sub.length < resB) continue;
        const farm = this.kValue(s, nb + o.sub.length) - P - o.c;
        const chase = L.bids[s] + o.c <= cap ? W - o.c - P : -1e9;
        const sc = Math.max(farm, chase);
        if (sc > bs) { bs = sc; best = o; }
      }
      return best ? { type: 'raise', cards: best.sub } : { type: 'pass' };
    }
    botFrost(s) {
      const p = this.players[s], S = this.st(s); if (!p.hand.length) return [];
      if (this.lot.rebid) {   // tied for the top: add the smallest card if the treasure is still worth it
        const c = Math.min(...p.hand), mine = sum(this.lot.spent[s]);
        return (c <= this.allowed(s) && this.lotVp() * this.beta * S.mShow * S.aggr > mine * 0.5 + c) ? [p.hand.indexOf(c)] : [];
      }
      const allow = this.allowed(s), W = this.lotVp() * this.beta * S.mShow * Math.exp(gauss() * 0.15);
      const big = Math.min(allow, W * (0.25 + rnd() * 0.55) * S.aggr), small = Math.min(...p.hand), resB = this.reserve();
      if (rnd() < 0.35 * S.mShow * S.aggr && big >= small && p.hand.length > resB) {
        const map = sums(p.hand); let t = Math.floor(big); while (t > 0 && !map.has(t)) t--; return t > 0 ? map.get(t).few : [];
      }
      const order = p.hand.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
      let pick = null, bv = 0;
      for (let k = 1; k <= 4 && k <= order.length && p.hand.length - k >= resB; k++) {
        const cheap = order.slice(0, k), c = sum(cheap.map((x) => x.v)); if (c > allow) break;
        const v = this.kValue(s, k) * 0.85 - c; if (v > bv) { bv = v; pick = cheap.map((x) => x.i); }
      }
      return pick || [];
    }
  }

  const api = { RULES, BAUBLE, CRITTERS, BOT_NAMES, STYLES, Game, scoreOf, setRandom: (f) => { rnd = f; }, setRisk: (x) => { RISK = x; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MrMagpie = api;
})(typeof window !== 'undefined' ? window : globalThis);
