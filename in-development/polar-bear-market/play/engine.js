/* Polar Bear Market — rules engine and bots. Runs in the browser (window.PolarBearMarket) and in
   node (module.exports), so bot-only games can be checked headless: node sim.js
   Rules and bot behaviour follow the original build with its default rules switched on:
   pitch cards, reach, outbids return tiles, one-number tiles. */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------ constants */
  const REGIONS = [
    { id: 0, name: 'Frostview Heights', short: 'Frostview', color: '#1D9E75' },
    { id: 1, name: 'Slippery Pines Waterfront', short: 'Slippery Pines', color: '#BA7517' },
    { id: 2, name: 'Greater Tundra Estates', short: 'Greater Tundra', color: '#534AB7' },
    { id: 3, name: "Harbour's End", short: "Harbour's End", color: '#993556' },
    { id: 4, name: 'Old Crag', short: 'Old Crag', color: '#7A6A50' },
    { id: 5, name: 'Midfloe', short: 'Midfloe', color: '#2A7A3A' },
    { id: 6, name: 'Glacier Point', short: 'Glacier Point', color: '#3A7FA8' },
  ];
  const MIDFLOE = 5;
  // hexes in each region (axial q,r offsets, used for layout; the count is what matters to the rules)
  const SHAPES = [
    [[-3, 0], [-4, 0], [-3, -1], [-4, -1]],
    [[-1, -3], [0, -3], [0, -4]],
    [[3, 0], [4, 0], [3, -1], [4, -1]],
    [[1, 2], [2, 2], [1, 3]],
    [[-2, 2], [-3, 2], [-2, 3]],
    [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
  ];
  // water channels: outer straits join neighbouring outer regions, channels join Midfloe to each
  const WATER = [
    { id: 'wFvSp', regions: [0, 1], label: 'NW Strait' },
    { id: 'wSpGt', regions: [1, 2], label: 'N Strait' },
    { id: 'wGtHe', regions: [2, 3], label: 'NE Strait' },
    { id: 'wHeGp', regions: [3, 6], label: 'E Strait' },
    { id: 'wGpOc', regions: [6, 4], label: 'S Strait' },
    { id: 'wOcFv', regions: [4, 0], label: 'W Strait' },
    { id: 'wMfFv', regions: [5, 0], label: 'W Channel' },
    { id: 'wMfSp', regions: [5, 1], label: 'N Channel' },
    { id: 'wMfGt', regions: [5, 2], label: 'NE Channel' },
    { id: 'wMfHe', regions: [5, 3], label: 'SE Channel' },
    { id: 'wMfGp', regions: [5, 6], label: 'S Channel' },
    { id: 'wMfOc', regions: [5, 4], label: 'SW Channel' },
  ];
  const VP_POOL = [2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 12, 13];
  const COLORS = ['#1E86C4', '#E0592A', '#C79300', '#5A9A2C', '#8E5BB5'];
  const BOT_NAMES = ['Bear-o', 'Pawsworth', 'Grizzlington', 'Snowpaw', 'Floella', 'Mittens', 'Tundrine', 'Krill Bill'];
  const SEASONS = 3, ROUNDS = 5, HAND = 5;
  const SEASON_NAMES = ['Spring', 'Summer', 'Autumn'];
  const PITCH = [1, 2, 3, 4, 5];
  const PITCH_BONUS = [4, 3, 2, 1, 0];          // pitch 1 draws 4 extra tiles at the start of your turn … pitch 5 draws none
  const pitchBonus = (c) => PITCH_BONUS[c - 1] ?? 0;
  const REFRESH_COST = 2;
  const TIERS = ['tier1', 'tier2', 'tier3'];
  const TIER_NAMES = { tier1: 'Junior Agents', tier2: 'Senior Agents', tier3: 'Partner Agents' };
  const MARKET_SLOTS = [2, 3, 4];               // face-up hires per tier in each season

  const T = (name, v, extra) => Object.assign({ name, v, action: null }, extra || {});
  const TEXT = {
    founder: 'Place this tile on any empty hex.',
    transfer: 'Move 1 of your own tiles to any hex. Pay the outbid cost if needed.',
    restructurer: 'Put your hand and discard pile into your bag and draw 5.',
    headhunter: 'Take the best tile from your discard pile into your hand.',
    consultant: 'Place on a water channel. Counts for both regions it touches. Returns to you at season end.',
    poacher: "Replace an opponent's tile with this tile. Their tile goes to their discard pile.",
    relocator: 'Swap the tiles on any two land hexes.',
    localExpert: 'Score every region worth 4 VP or less this season, now.',
    closer: 'Score 1 region now.',
    negotiator: 'Place a tile from your hand on any hex. Pay the outbid cost if needed.',
    luxuryExpert: 'Score every region worth more than 4 VP this season, now.',
  };
  const START = [
    T('Associate', 1), T('Associate', 1), T('Associate', 1), T('Associate', 1), T('Associate', 1), T('Associate', 1),
    T('Agent', 2), T('Agent', 2), T('Agent', 2), T('Agent', 2), T('Agent', 2),
    T('The Founder', 2, { action: 'founder' }),
  ];
  const MARKET = [
    T('Junior Agent', 3, { label: 'JA', cost: 4, tier: 1 }),
    T('Junior Agent', 3, { label: 'JA', cost: 4, tier: 1 }),
    T('Junior Agent+', 4, { label: 'JA', cost: 6, tier: 1 }),
    T('The Transfer', 2, { label: 'TR', cost: 4, tier: 1, action: 'transfer' }),
    T('The Restructurer', 2, { label: 'RE', cost: 4, tier: 1, action: 'restructurer' }),
    T('The Headhunter', 2, { label: 'HH', cost: 4, tier: 1, action: 'headhunter' }),
    T('Junior Consultant', 2, { label: 'JC', cost: 4, tier: 1, action: 'consultant' }),
    T('Senior Agent', 5, { label: 'SA', cost: 7, tier: 2 }),
    T('Senior Agent', 5, { label: 'SA', cost: 7, tier: 2 }),
    T('Senior Agent+', 6, { label: 'SA', cost: 9, tier: 2 }),
    T('The Poacher', 1, { label: 'PO', cost: 7, tier: 2, action: 'poacher' }),
    T('The Relocator', 4, { label: 'RL', cost: 8, tier: 2, action: 'relocator' }),
    T('The Local Expert', 4, { label: 'LC', cost: 8, tier: 2, action: 'localExpert' }),
    T('Senior Consultant', 3, { label: 'SC', cost: 7, tier: 2, action: 'consultant' }),
    T('Partner Agent', 7, { label: 'PA', cost: 11, tier: 3 }),
    T('Partner Agent', 7, { label: 'PA', cost: 11, tier: 3 }),
    T('Partner Agent+', 8, { label: 'PA', cost: 13, tier: 3 }),
    T('Senior Partner', 9, { label: 'PA', cost: 15, tier: 3 }),
    T('The Closer', 5, { label: 'CL', cost: 11, tier: 3, action: 'closer' }),
    T('The Negotiator', 6, { label: 'NG', cost: 12, tier: 3, action: 'negotiator' }),
    T('The Luxury Expert', 5, { label: 'LX', cost: 12, tier: 3, action: 'luxuryExpert' }),
  ];
  const COPIES = 4;
  const labelOf = (t) => t.label || (t.action === 'founder' ? 'FO' : t.name === 'Associate' ? 'AS' : t.name === 'Agent' ? 'AG' : 'ST');

  const rnd = Math.random;
  function shuffle(a) { const e = a.slice(); for (let l = e.length - 1; l > 0; l--) { const n = Math.floor(rnd() * (l + 1)); [e[l], e[n]] = [e[n], e[l]]; } return e; }
  const sumV = (arr) => arr.reduce((s, t) => s + t.v, 0);
  const isSpecial = (t) => !!t.action && t.action !== 'consultant';

  /* Pay `cost` seals from a hand the way the original bots do: biggest tiles that fit first, then the
     smallest single tile that covers what is left. Returns null when the hand can't cover it. */
  function payGreedy(hand, cost) {
    const n = hand.slice().sort((a, b) => a.v - b.v), removed = [];
    let i = cost;
    for (let u = n.length - 1; u >= 0 && i > 0; u--) if (n[u].v <= i) { i -= n[u].v; removed.push(n.splice(u, 1)[0]); }
    if (i > 0) {
      const u = n.findIndex((c) => c.v >= i);
      if (u === -1) { if (!n.length) return null; i -= n[n.length - 1].v; removed.push(n.splice(n.length - 1, 1)[0]); }
      else { i -= n[u].v; removed.push(n.splice(u, 1)[0]); }
    }
    return i > 0 ? null : { newHand: n, removed };
  }

  /* ------------------------------------------------------------ game */
  class Game {
    constructor(players, opts) {
      opts = opts || {};
      this.N = players.length;
      this.nid = 0;
      const vp = shuffle(VP_POOL);
      this.regionVP = REGIONS.map((r, l) => vp.slice(l * 3, l * 3 + 3).sort((a, b) => a - b));
      const pool = [];
      MARKET.forEach((m) => { for (let k = 0; k < COPIES; k++) pool.push(this.mk(m, null)); });
      const all = shuffle(pool);
      this.market = {};
      TIERS.forEach((tk, ti) => { const ts = all.filter((m) => m.tier === ti + 1); this.market[tk] = { slots: [ts[0] || null, ts[1] || null], deck: ts.slice(2) }; });
      this.hexes = [];
      SHAPES.forEach((sh, region) => sh.forEach(() => this.hexes.push({ id: 'h' + this.hexes.length, region, tile: null })));
      this.water = WATER.map((w) => ({ id: w.id, regions: w.regions.slice(), tile: null }));
      this.players = players.map((p, i) => {
        const bag = shuffle(START.map((t) => this.mk(t, i)));
        const hand = bag.splice(0, HAND);
        return { name: p.name, bot: !!p.bot, color: COLORS[i % COLORS.length], bag, hand, discard: [], vp: 0, saves5: rnd() < 0.55 };
      });
      this.season = 0; this.round = 0; this.turn = 0; this.seasonStart = 0;
      this.actionsLeft = 2; this.actionsUsed = [];
      this.phase = 'pitch';
      this.pitch = { hands: this.players.map(() => PITCH.slice()), played: this.players.map(() => null) };
      this.turnOrder = []; this.orderIdx = 0;
      this.log = []; this.seq = 0; this.lastMove = null; this.lastScoring = null; this.result = null;
      this.stats = { outbids: 0, hires: 0, activations: 0, placements: 0, refreshes: 0, turns: 0, passes: 0 };
      this.say('Welcome to Polar Bear Market. Spring, round 1.');
      this.startRound();
    }
    mk(t, owner) { return Object.assign({}, t, { id: 't' + (++this.nid), owner }); }
    say(m) { this.log.push(m); if (this.log.length > 80) this.log.shift(); }
    over() { return this.phase === 'over'; }
    isClosing() { return this.round === ROUNDS - 1; }
    move(seat, hexes, text) { this.seq++; this.lastMove = { seq: this.seq, seat, hexes: hexes || [], text: text || '' }; }

    /* ---------- board helpers */
    hex(id) { return this.hexes.find((h) => h.id === id); }
    /* influence of a player in a region: their tiles on its hexes plus their consultants on channels touching it */
    inf(region, p) {
      let n = 0;
      this.hexes.forEach((h) => { if (h.region === region && h.tile && h.tile.owner === p) n += h.tile.v; });
      this.water.forEach((w) => { if (w.tile && w.regions.includes(region) && w.tile.owner === p) n += w.tile.v; });
      return n;
    }
    ranks(region) { return Array.from({ length: this.N }, (_, p) => ({ player: p, score: this.inf(region, p) })).sort((a, b) => b.score - a.score); }
    /* Reach: open new offices only in regions where you hold a tile, regions one outer strait from those, and Midfloe.
       Holding Midfloe reaches nowhere new. With nothing on the board, everywhere is in reach. */
    reach(p) {
      const all = new Set(REGIONS.map((r) => r.id));
      const held = new Set();
      this.hexes.forEach((h) => { if (h.tile && h.tile.owner === p) held.add(h.region); });
      if (!held.size) return all;
      const out = new Set(held); out.add(MIDFLOE);
      WATER.forEach((w) => { const [u, c] = w.regions; if (u === MIDFLOE || c === MIDFLOE) return; if (held.has(u)) out.add(c); if (held.has(c)) out.add(u); });
      return out;
    }
    channelInReach(p, w) { const r = this.reach(p); return w.regions.some((x) => r.has(x)); }
    /* Put a tile on a land hex; whatever was there goes back to its owner's discard (a Poacher leaves the game). */
    cover(h, tile, by) {
      if (h.tile) {
        const old = h.tile;
        if (old.action === 'poacher') this.say(this.players[old.owner].name + "'s Poacher leaves the game.");
        else { this.players[old.owner].discard.push(old); if (old.owner !== tile.owner) this.say(this.players[old.owner].name + "'s " + old.name + ' (' + old.v + ') goes back to their discard.'); }
        if (old.owner !== tile.owner) this.stats.outbids++;
      }
      h.tile = tile;
    }
    /* season payout for one region: 1st gets this season's value, 2nd last season's, 3rd the one before.
       Ties add up the places they cover and split it evenly, rounded down. Nobody scores with 0. */
    payout(region, season) {
      const ranks = this.ranks(region), places = season + 1, vals = this.regionVP[region];
      const out = Array(this.N).fill(0);
      let s = 0, h = 0;
      while (h < places && s < ranks.length && ranks[s].score !== 0) {
        const sc = ranks[s].score, grp = []; let m = s;
        while (m < ranks.length && ranks[m].score === sc) { grp.push(ranks[m]); m++; }
        const take = Math.min(grp.length, places - h); let pot = 0;
        for (let k = 0; k < take; k++) pot += vals[season - h - k] || 0;
        const each = grp.length ? Math.floor(pot / grp.length) : 0;
        grp.forEach((g) => { out[g.player] += each; });
        h += take; s += grp.length;
      }
      return out;
    }
    scoreRegion(region) { const pay = this.payout(region, this.season); this.players.forEach((p, i) => { p.vp += pay[i]; }); return pay; }
    drawTo(p, n) { // draw until n in hand, reshuffling the discard into the bag when it runs out
      while (p.hand.length < n) {
        if (!p.bag.length) { if (!p.discard.length) break; p.bag = shuffle(p.discard); p.discard = []; }
        p.hand.push(p.bag.pop());
      }
    }
    drawExtra(p, k) {
      let d = 0;
      for (let i = 0; i < k; i++) { if (!p.bag.length) { if (!p.discard.length) break; p.bag = shuffle(p.discard); p.discard = []; } p.hand.push(p.bag.pop()); d++; }
      return d;
    }

    /* ---------- round flow */
    startRound() {
      this.actionsLeft = 2; this.actionsUsed = [];
      this.phase = 'pitch';
      this.pitch.played = this.players.map(() => null);
      this.players.forEach((p, i) => {
        const hand = this.pitch.hands[i];
        if (p.bot || hand.length === 1) this.pitch.played[i] = p.bot ? this.botPitch(i) : hand[0];
      });
      if (this.pitch.played.every((c) => c !== null)) this.reveal();
    }
    reveal() {
      const closing = this.isClosing();
      this.players.forEach((p, i) => { const c = this.pitch.played[i]; this.pitch.hands[i] = this.pitch.hands[i].filter((x) => x !== c); });
      const order = Array.from({ length: this.N }, (_, i) => i).sort((a, b) => {
        const ca = this.pitch.played[a], cb = this.pitch.played[b];
        if (ca !== cb) return closing ? ca - cb : cb - ca;
        const va = this.players[a].vp, vb = this.players[b].vp;
        return va !== vb ? (closing ? vb - va : va - vb) : a - b;
      });
      this.turnOrder = order; this.orderIdx = 0; this.turn = order[0]; this.phase = 'play';
      this.say((closing ? 'Closing round, lowest pitch first: ' : 'Round ' + (this.round + 1) + ' pitches: ') + order.map((i) => this.players[i].name + ' ' + this.pitch.played[i]).join(', '));
      this.move(null, [], 'pitch');
      this.startTurn();
    }
    startTurn() {
      this.actionsLeft = 2; this.actionsUsed = [];
      const p = this.players[this.turn], c = this.pitch.played[this.turn], n = pitchBonus(c);
      if (n > 0) { const d = this.drawExtra(p, n); if (d > 0) this.say(p.name + ' pitched ' + c + ' and draws ' + d + ' bonus tile' + (d !== 1 ? 's' : '') + '.'); }
    }
    /* end of a turn: bots trim to 5 by value; then everyone draws back up to 5 */
    endTurn() {
      const p = this.players[this.turn];
      if (p.hand.length > HAND) {
        const w = (t) => t.v + t.v * 0.8 + (isSpecial(t) ? 3 : 0) + (t.action === 'consultant' ? 1.5 : 0);
        const s = p.hand.slice().sort((a, b) => w(b) - w(a));
        p.hand = s.slice(0, HAND); p.discard.push(...s.slice(HAND));
        this.say(p.name + ' discards ' + (s.length - HAND) + ' down to ' + HAND + '.');
      }
      this.drawTo(p, HAND);
      this.stats.turns++;
      this.orderIdx++;
      if (this.orderIdx < this.turnOrder.length) { this.turn = this.turnOrder[this.orderIdx]; this.startTurn(); return; }
      this.round++;
      if (this.round >= ROUNDS) this.endSeason(); else this.startRound();
    }
    endSeason() {
      const N = this.N, season = this.season;
      const totals = Array(N).fill(0), regions = [];
      REGIONS.forEach((r) => { const pay = this.payout(r.id, season); regions.push({ region: r.id, pay }); pay.forEach((v, i) => { totals[i] += v; }); });
      this.say('— ' + SEASON_NAMES[season] + ' scoring —');
      this.players.forEach((p, i) => { p.vp += totals[i]; this.say(p.name + ' +' + totals[i] + ' VP (' + p.vp + ').'); });
      this.lastScoring = { season, regions, totals };
      if (season < SEASONS - 1) this.water.forEach((w) => { if (w.tile) { this.players[w.tile.owner].discard.push(w.tile); w.tile = null; } });
      this.season++; this.round = 0; this.actionsLeft = 2; this.actionsUsed = [];
      if (this.season < SEASONS) {
        const k = MARKET_SLOTS[this.season];
        TIERS.forEach((tk) => { const m = this.market[tk]; while (m.slots.length < k) m.slots.push(m.deck.length ? m.deck.shift() : null); });
        this.say('The market grows to ' + k + ' hires per tier.');
      }
      this.move(null, [], 'season');
      if (this.season >= SEASONS) {
        this.phase = 'over'; this.turn = -1;
        const board = Array.from({ length: N }, (_, p) => this.hexes.reduce((s, h) => s + (h.tile && h.tile.owner === p ? h.tile.v : 0), 0));
        const best = Math.max(...this.players.map((p) => p.vp));
        let win = this.players.map((p, i) => i).filter((i) => this.players[i].vp === best);
        if (win.length > 1) { const b = Math.max(...win.map((i) => board[i])); win = win.filter((i) => board[i] === b); }
        this.result = { winners: win, board };
        this.say(win.length === 1 ? this.players[win[0]].name + ' wins with ' + best + ' VP!' : 'Tie! ' + win.map((i) => this.players[i].name).join(' and ') + ' share the win with ' + best + ' VP.');
        return;
      }
      // (without pitch cards the player with fewest VP would start; with them, the pitch decides)
      const onBoard = Array.from({ length: N }, (_, g) => this.hexes.filter((h) => h.tile && h.tile.owner === g).length);
      const lo = Math.min(...this.players.map((p) => p.vp));
      let c = this.players.map((p, i) => i).filter((i) => this.players[i].vp === lo);
      if (c.length > 1) { const m = Math.min(...c.map((i) => onBoard[i])); c = c.filter((i) => onBoard[i] === m); }
      if (c.length > 1) { const s0 = this.seasonStart; c.sort((a, b) => ((a - s0 + N) % N) - ((b - s0 + N) % N)); }
      this.seasonStart = c[0];
      this.pitch.hands = this.players.map(() => PITCH.slice());
      this.say(SEASON_NAMES[this.season] + ' begins. Everyone takes back pitch cards 1–5.');
      this.startRound();
    }

    /* ---------- human actions */
    act(seat, a) {
      a = a || {};
      if (this.phase === 'over') return { ok: false, error: 'The game is over.' };
      if (this.phase === 'pitch') {
        if (a.type !== 'pitch') return { ok: false, error: 'Choose a pitch card first.' };
        if (this.pitch.played[seat] !== null) return { ok: false, error: 'You already pitched.' };
        const c = a.card | 0;
        if (!this.pitch.hands[seat].includes(c)) return { ok: false, error: 'You have already used that card this season.' };
        this.pitch.played[seat] = c;
        if (this.pitch.played.every((x) => x !== null)) this.reveal();
        return { ok: true };
      }
      if (seat !== this.turn) return { ok: false, error: 'Wait for ' + this.players[this.turn].name + '.' };
      const p = this.players[seat];
      const handTile = (id) => p.hand.find((t) => t.id === id);
      const used = (k) => this.actionsUsed.includes(k);
      const payFrom = (ids, cost, exclude) => {        // checks a chosen payment; returns the tiles or an error string
        ids = [...new Set(ids || [])];
        const tiles = ids.map(handTile);
        if (tiles.some((t) => !t) || ids.some((id) => (exclude || []).includes(id))) return 'Pay with tiles from your hand.';
        const got = sumV(tiles);
        if (got < cost) return 'You need ' + cost + ' seals; you picked ' + got + '.';
        return tiles;
      };
      const spend = (tiles) => { tiles.forEach((t) => { p.hand.splice(p.hand.indexOf(t), 1); p.discard.push(t); }); };
      const take = (t) => { p.hand.splice(p.hand.indexOf(t), 1); return t; };
      const name = (h) => REGIONS[h.region].short;

      if (a.type === 'end') {
        const marks = [...new Set(a.discard || [])].map(handTile);
        if (marks.some((t) => !t)) return { ok: false, error: 'Discard tiles from your hand.' };
        if (p.hand.length - marks.length > HAND) return { ok: false, error: 'Discard down to ' + HAND + ' first (' + (p.hand.length - marks.length - HAND) + ' more).' };
        if (marks.length) { marks.forEach((t) => { p.hand.splice(p.hand.indexOf(t), 1); p.discard.push(t); }); this.say(p.name + ' discards ' + marks.length + ' tile' + (marks.length !== 1 ? 's' : '') + '.'); }
        this.say(p.name + ' ends their turn.');
        this.move(seat, [], 'end');
        this.endTurn();
        return { ok: true };
      }
      if (this.actionsLeft <= 0) return { ok: false, error: 'No actions left. End your turn.' };

      if (a.type === 'place') {
        if (used('place')) return { ok: false, error: 'You already placed this turn.' };
        const t = handTile(a.tile), h = this.hex(a.hex);
        if (!t || !h) return { ok: false, error: 'Choose a tile and a hex.' };
        if (t.action === 'consultant') return { ok: false, error: 'Consultants go on water channels.' };
        if (!h.tile) {
          if (!this.reach(seat).has(h.region)) return { ok: false, error: REGIONS[h.region].short + ' is out of reach for a new office.' };
          take(t); t.owner = seat; h.tile = t;
          this.say(p.name + ' places ' + t.name + ' (' + t.v + ') in ' + name(h) + '.');
        } else {
          if (t.v <= h.tile.v) return { ok: false, error: 'Your tile (' + t.v + ') must beat the ' + h.tile.v + ' there.' };
          const cost = t.v - h.tile.v, pay = payFrom(a.pay, cost, [t.id]);
          if (typeof pay === 'string') return { ok: false, error: pay };
          take(t); spend(pay); t.owner = seat;
          this.say(p.name + ' outbids in ' + name(h) + ' (' + t.v + ' over ' + h.tile.v + ', paid ' + sumV(pay) + ').');
          this.cover(h, t);
        }
        this.stats.placements++;
        this.actionsUsed.push('place'); this.actionsLeft--; this.move(seat, [h.id], 'place');
        return { ok: true };
      }
      if (a.type === 'water') {
        if (used('place')) return { ok: false, error: 'You already placed this turn.' };
        const t = handTile(a.tile), w = this.water.find((x) => x.id === a.channel);
        if (!t || !w) return { ok: false, error: 'Choose a Consultant and a channel.' };
        if (t.action !== 'consultant') return { ok: false, error: 'Only Consultants go on water channels.' };
        if (w.tile) return { ok: false, error: 'That channel is taken.' };
        if (!this.channelInReach(seat, w)) return { ok: false, error: 'That channel must touch a region in your reach.' };
        take(t); t.owner = seat; w.tile = t;
        this.say(p.name + ' places ' + t.name + ' on the channel between ' + w.regions.map((r) => REGIONS[r].short).join(' and ') + '.');
        this.actionsUsed.push('place'); this.actionsLeft--; this.move(seat, [w.id], 'water');
        return { ok: true };
      }
      if (a.type === 'hire' || a.type === 'refresh') {
        if (used('hire')) return { ok: false, error: 'You already hired this turn.' };
        if (a.type === 'refresh') {
          const pay = payFrom(a.pay, REFRESH_COST);
          if (typeof pay === 'string') return { ok: false, error: pay };
          spend(pay);
          TIERS.forEach((tk) => { const m = this.market[tk]; m.slots = m.slots.map((s) => { if (s) m.deck.push(s); return m.deck.length ? m.deck.shift() : null; }); });
          this.say(p.name + ' refreshes the market (paid ' + sumV(pay) + ').');
          this.stats.refreshes++;
        } else {
          const m = this.market[a.tier], s = m && m.slots[a.slot | 0];
          if (!s) return { ok: false, error: 'Nothing to hire there.' };
          const pay = payFrom(a.pay, s.cost);
          if (typeof pay === 'string') return { ok: false, error: pay };
          spend(pay);
          s.owner = seat; p.discard.push(s);
          m.slots[a.slot | 0] = m.deck.length ? m.deck.shift() : null;
          this.say(p.name + ' hires ' + s.name + ' (' + s.v + ', cost ' + s.cost + ', paid ' + sumV(pay) + ').');
          this.stats.hires++;
        }
        this.actionsUsed.push('hire'); this.actionsLeft--; this.move(seat, [], a.type);
        return { ok: true };
      }
      if (a.type === 'activate') {
        if (used('action')) return { ok: false, error: 'You already activated a specialist this turn.' };
        const t = handTile(a.tile);
        if (!t || !isSpecial(t)) return { ok: false, error: 'Choose a specialist to activate.' };
        const r = this.humanSpecial(seat, t, a);
        if (r) return { ok: false, error: r };
        this.stats.activations++;
        this.actionsUsed.push('action'); this.actionsLeft--;
        return { ok: true };
      }
      return { ok: false, error: 'Not allowed.' };
    }
    /* specialists chosen by a person: every target is picked; returns an error string or null */
    humanSpecial(seat, t, a) {
      const p = this.players[seat], hand = p.hand;
      const other = (id) => hand.find((x) => x.id === id && x.id !== t.id);
      const sh = (h) => REGIONS[h.region].short;
      const payCheck = (ids, cost, exclude) => {
        ids = [...new Set(ids || [])];
        const tiles = ids.map(other);
        if (tiles.some((x) => !x) || ids.some((id) => exclude.includes(id))) return 'Pay with tiles from your hand.';
        if (sumV(tiles) < cost) return 'You need ' + cost + ' seals; you picked ' + sumV(tiles) + '.';
        return tiles;
      };
      const spend = (tiles) => tiles.forEach((x) => { hand.splice(hand.indexOf(x), 1); p.discard.push(x); });
      const consume = () => hand.splice(hand.indexOf(t), 1);   // a used specialist leaves the game unless it becomes a board piece
      switch (t.action) {
        case 'founder': {
          const h = this.hex(a.hex);
          if (!h || h.tile) return 'The Founder goes on an empty hex.';
          consume(); t.owner = seat; h.tile = t;
          this.say(p.name + ' places The Founder in ' + sh(h) + '.'); this.move(seat, [h.id], 'founder');
          return null;
        }
        case 'restructurer': {
          consume();
          p.bag = shuffle([...p.bag, ...hand, ...p.discard]); p.hand = []; p.discard = [];
          this.drawTo(p, HAND);
          this.say(p.name + ' restructures and draws a fresh hand.'); this.move(seat, [], 'restructure');
          return null;
        }
        case 'headhunter': {
          consume();
          if (p.discard.length) {
            const best = p.discard.reduce((b, x) => (x.v + x.v > b.v + b.v ? x : b), p.discard[0]);
            p.discard = p.discard.filter((x) => x.id !== best.id); hand.push(best);
            this.say(p.name + ' headhunts ' + best.name + ' (' + best.v + ') from their discard.');
          } else this.say(p.name + ' headhunts, but their discard pile is empty.');
          this.move(seat, [], 'headhunt');
          return null;
        }
        case 'closer': {
          const r = a.region | 0;
          if (!REGIONS[r]) return 'Choose a region to score.';
          consume(); const pay = this.scoreRegion(r);
          this.say(p.name + ' (Closer) scores ' + REGIONS[r].short + ': ' + this.payText(pay) + '.');
          this.move(seat, this.hexes.filter((h) => h.region === r).map((h) => h.id), 'closer');
          return null;
        }
        case 'localExpert': case 'luxuryExpert': {
          consume();
          const lo = t.action === 'localExpert';
          const pays = Array(this.N).fill(0), hit = [];
          REGIONS.filter((r) => (lo ? this.regionVP[r.id][this.season] <= 4 : this.regionVP[r.id][this.season] > 4)).forEach((r) => { hit.push(r.id); this.scoreRegion(r.id).forEach((v, i) => { pays[i] += v; }); });
          this.say(p.name + ' (' + (lo ? 'Local' : 'Luxury') + ' Expert) scores ' + (lo ? 'the 4-VP-or-less' : 'the over-4-VP') + ' regions: ' + this.payText(pays) + '.');
          this.move(seat, this.hexes.filter((h) => hit.includes(h.region)).map((h) => h.id), 'expert');
          return null;
        }
        case 'poacher': {
          const h = this.hex(a.hex);
          if (!h || !h.tile) return 'Choose an occupied hex.';
          if (h.tile.owner === seat) return "You can't poach your own tile.";
          const old = h.tile; this.players[old.owner].discard.push(old);
          this.say(this.players[old.owner].name + "'s " + old.name + ' (' + old.v + ') goes back to their discard.');
          consume(); t.owner = seat; h.tile = t; this.stats.outbids++;
          this.say(p.name + ' (Poacher) takes a hex in ' + sh(h) + '.'); this.move(seat, [h.id], 'poach');
          return null;
        }
        case 'relocator': {
          const x = this.hex(a.from), y = this.hex(a.to);
          if (!x || !y || x === y || !x.tile || !y.tile) return 'Choose two different hexes with tiles on them.';
          consume(); const tmp = x.tile; x.tile = y.tile; y.tile = tmp;
          this.say(p.name + ' (Relocator) swaps the tiles in ' + sh(x) + ' and ' + sh(y) + '.'); this.move(seat, [x.id, y.id], 'relocate');
          return null;
        }
        case 'transfer': {
          const x = this.hex(a.from), y = this.hex(a.to);
          if (!x || !x.tile || x.tile.owner !== seat) return 'Choose one of your own tiles to move.';
          if (!y || y === x) return 'Choose where it goes.';
          let pay = [];
          if (y.tile) {
            if (x.tile.v <= y.tile.v) return 'The moving tile (' + x.tile.v + ') must beat the ' + y.tile.v + ' there.';
            pay = payCheck(a.pay, x.tile.v - y.tile.v, []);
            if (typeof pay === 'string') return pay;
          }
          consume(); spend(pay);
          const mv = x.tile; x.tile = null; this.cover(y, mv);
          this.say(p.name + ' (Transfer) moves a ' + mv.v + ' to ' + sh(y) + (pay.length ? ' (paid ' + sumV(pay) + ')' : '') + '.'); this.move(seat, [x.id, y.id], 'transfer');
          return null;
        }
        case 'negotiator': {
          const u = other(a.use), h = this.hex(a.hex);
          if (!u || !h) return 'Choose a tile from your hand and a hex.';
          if (u.action === 'consultant') return 'Consultants go on water channels.';
          let pay = [];
          if (h.tile) {
            if (h.tile.owner === seat) return "That's already your tile.";
            if (u.v <= h.tile.v) return 'Your tile (' + u.v + ') must beat the ' + h.tile.v + ' there.';
            pay = payCheck(a.pay, u.v - h.tile.v, [u.id]);
            if (typeof pay === 'string') return pay;
          }
          consume(); hand.splice(hand.indexOf(u), 1); spend(pay);
          u.owner = seat; this.cover(h, u); this.stats.placements++;
          this.say(p.name + ' (Negotiator) places ' + u.name + ' (' + u.v + ') in ' + sh(h) + (pay.length ? ', paid ' + sumV(pay) : '') + '.'); this.move(seat, [h.id], 'negotiate');
          return null;
        }
      }
      return 'That specialist has no action.';
    }
    payText(pay) { return pay.map((v, i) => (v ? this.players[i].name + ' +' + v : null)).filter(Boolean).join(', ') || 'nobody scores'; }

    /* ------------------------------------------------------------ bots */
    botDelay() { return this.phase === 'play' && this.players[this.turn] && this.players[this.turn].bot ? 1000 : 600; }
    botStep() {
      if (this.phase !== 'play') return false;
      const e = this.turn, p = this.players[e];
      if (!p || !p.bot) return false;
      if (this.actionsLeft <= 0) { this.endTurn(); return true; }
      const before = JSON.stringify([this.actionsLeft, this.actionsUsed]);
      const choice = this.botChoose(e);
      this.botApply(e, choice);
      if (this.actionsLeft <= 0 || choice.type === 'pass' || JSON.stringify([this.actionsLeft, this.actionsUsed]) === before) { this.say(p.name + ' ends their turn.'); this.endTurn(); }
      return true;
    }
    /* bot pitch: weigh acting early (open hexes, close races) against drawing more (buying power) */
    botPitch(e) {
      const l = this.pitch.hands[e];
      if (l.length === 1) return l[0];
      const n = this.players[e];
      let a = l.slice();
      if (n.saves5 && a.includes(5) && a.length > 1) a = a.filter((d) => d !== 5);
      const i = this.N, u = this.season, c = this.reach(e);
      const o = this.hexes.filter((d) => !d.tile && c.has(d.region));
      const s = o.reduce((d, v) => d + this.regionVP[v.region][u], 0) / Math.max(1, o.length);
      let h = 0;
      REGIONS.forEach((d) => {
        const v = this.ranks(d.id), x = this.inf(d.id, e), Y = (v.find((W) => W.player !== e) || {}).score || 0;
        if (x > 0 && Math.abs(x - Y) <= 3) h += this.regionVP[d.id][u] / 4;
      });
      const g = Math.min(o.length, 6) * 0.35 + s * 0.08 + h * 0.6;
      const r = sumV(n.hand);
      const b = TIERS.flatMap((d) => this.market[d].slots.filter(Boolean)).filter((d) => d.cost > r && d.cost <= r + 6).length;
      const H = (u === 0 ? 1.2 : u === 1 ? 0.8 : 0.4) + b * 0.35 + (r < 5 ? 0.8 : 0);
      let q = a[0], best = -1e9;
      a.forEach((d) => { const v = d * g + (5 - d) * H + rnd() * 1.5; if (v > best) { best = v; q = d; } });
      return q;
    }
    /* bot action choice: score every place / outbid / channel / hire / activate option, then pick among the best
       (top 3 early, top 2 in the last season, the very best in the last 3 rounds) */
    botChoose(e) {
      const l = this.players[e], n = l.hand, a = this.season, i = this.regionVP, c = this.N, o = [];
      const used = (k) => this.actionsUsed.includes(k);
      const s = sumV(n);
      const g = (SEASONS - a) * ROUNDS - this.round - 1, r = g <= ROUNDS, m = g <= 3, b = a === 0;
      const H = REGIONS.map((R) => i[R.id].reduce((x, y) => x + y, 0));
      const p = REGIONS.map((R) => {
        const M = this.ranks(R.id), z = this.inf(R.id, e), w = M.filter((q) => q.player !== e);
        const N = (w[0] && w[0].score) || 0, L = z - N;
        return { regionId: R.id, myInf: z, bestOpp: N, lead: L, vpNow: i[R.id][a], vpTotal: H[R.id], marginUrgency: Math.abs(L) <= 1 ? 2 : Math.abs(L) <= 3 ? 1.4 : 1 };
      });
      const d = p.filter((R) => R.lead > 0);
      const x = p.filter((R) => R.lead < 0 && R.lead >= -4 && R.bestOpp > 0);
      const Q = TIERS.flatMap((R) => this.market[R].slots.filter((M) => M && M.tier === 3)).sort((R, M) => M.v - R.v)[0];
      const F = (Q && Q.cost) || 999;
      const J = [...l.bag, ...l.discard, ...n];
      const bt = sumV(J), ct = Math.min(HAND, J.length), dc = J.length > 0 ? (bt / J.length) * ct : s;
      const Gl = Q && s < F && dc >= F && !r && g >= 3 && !used('hire');
      const hn = J.length, yc = hn > 0 ? bt / hn : 0, pc = yc < 2;
      const Ti = this.reach(e);
      if (!used('place')) {
        this.hexes.forEach((R) => {
          if (!R.tile && !Ti.has(R.region)) return;
          const M = p[R.region], z = M.vpNow, w = M.vpTotal;
          n.forEach((N) => {
            if (N.action === 'consultant') return;
            if (!R.tile) {
              if (N.v === 0) return;
              let _ = w * 0.4 + z * 1.2;
              if (M.myInf === 0) _ += z * 1.5;
              if (M.myInf === 0 && w >= 15) _ += 4;
              if (M.myInf === 0 && M.bestOpp > 0) _ += z;
              if (M.lead > 0) _ += z * 0.4;
              _ += N.v * 0.6;
              if (this.hexes.filter((X) => X.region === R.region && X.tile && X.tile.owner === e).length >= 2) _ *= 0.7;
              if (M.myInf === 0) _ += R.region === MIDFLOE ? 2.5 : 1;
              if (!used('hire')) _ -= N.v * 0.35;
              o.push({ type: 'place', hexId: R.id, tile: N, score: _ });
            } else {
              const top = R.tile;
              if (N.v <= top.v) return;
              const L = N.v - top.v;
              if (sumV(n.filter((y) => y.id !== N.id)) < L) return;
              const et = top.owner === e;
              const sa = M.myInf - (et ? top.v : 0) + N.v > M.bestOpp;
              const fa = M.lead <= 0 && sa, xi = M.lead > 0 && sa, zi = !sa && !et;
              let Me = 0;
              if (fa) { Me = z * 3 + w * 0.5; if (m) Me += z * 2; }
              else if (xi) { Me = z * 1.5 + w * 0.2; if (M.lead > 4) Me *= 0.6; }
              else if (zi) Me = z * 1 + M.marginUrgency * 2;
              else if (et && M.lead <= 1) Me = z * 2;
              Me -= L * 0.8;
              if (!used('hire')) Me -= N.v * 0.35;
              if (Me > 0) o.push({ type: 'stack', hexId: R.id, tile: N, cost: L, score: Me });
            }
          });
        });
        this.water.forEach((R) => {
          if (R.tile || !R.regions.some((M) => Ti.has(M))) return;
          n.forEach((M) => {
            if (M.action !== 'consultant') return;
            const z = p[R.regions[0]], w = p[R.regions[1]];
            const L = [z, w].reduce((X, et) => (et.lead >= 0 && et.lead <= 2 ? X + et.vpNow * 1.5 : et.lead < 0 && et.lead >= -2 ? X + et.vpNow * 1.2 : et.lead > 2 ? X + et.vpNow * 0.5 : X + et.vpNow * 0.3), 0) + M.v * 0.4 - (r ? 1 : 0);
            o.push({ type: 'place_water', whId: R.id, tile: M, score: L });
          });
        });
      }
      if (!used('hire')) {
        TIERS.forEach((M) => {
          this.market[M].slots.forEach((z, w) => {
            if (!z || z.cost > s) return;
            if (Gl && z.tier < 3) { o.push({ type: 'hire', tk: M, si: w, tile: z, score: -5 }); return; }
            let N = 0;
            if (z.action === 'consultant') {
              const _ = p.filter((L) => Math.abs(L.lead) <= 2).length;
              N = r ? 0.3 : _ >= 3 ? 3 : _ >= 2 ? 2 : 1;
            } else if (z.action) {
              switch (z.action) {
                case 'closer': { const _ = d.reduce((L, X) => Math.max(L, X.vpNow), 0); N = _ >= 5 ? _ * 0.6 + 4 : _ > 0 ? _ * 0.4 + 2 : 0.5; break; }
                case 'localExpert': { const _ = d.filter((X) => X.vpNow <= 4), L = _.reduce((X, et) => X + et.vpNow, 0); N = L > 0 ? L * 0.5 + _.length * 1.5 : 0.3; break; }
                case 'luxuryExpert': { const _ = d.filter((X) => X.vpNow > 4), L = _.reduce((X, et) => X + et.vpNow, 0); N = L > 0 ? L * 0.6 + _.length * 2 : 0.3; break; }
                case 'poacher': N = p.filter((L) => L.lead < -4 && L.vpNow >= 5).length >= 1 ? 5 : x.filter((L) => L.lead < -3).length > 0 ? 4 : a >= 1 ? 2.5 : 1; break;
                case 'negotiator': N = n.filter((L) => L.v >= 4 && !L.action).length > 0 && a >= 1 ? 4.5 : a >= 1 ? 2.5 : 1.5; break;
                case 'relocator': N = p.some((L) => L.lead > 2 && L.vpNow <= 3) && p.some((L) => L.lead < 0 && L.vpNow >= 6) ? 4 : a >= 1 ? 2 : 0.8; break;
                case 'transfer': {
                  const _ = this.hexes.some((X) => X.tile && X.tile.owner === e && p[X.region].lead < 0), L = x.some((X) => X.lead >= -3);
                  N = _ && L ? 3.5 : _ ? 2 : 1; break;
                }
                case 'headhunter': {
                  const _ = l.discard.reduce((L, X) => (X.v * 1.5 > (L ? L.v * 1.5 : 0) ? X : L), null);
                  N = _ && _.v >= 5 ? 4 : l.discard.length >= 3 ? 2.5 : 0.8; break;
                }
                case 'restructurer': N = 0.5; break;   // (only scores higher with zero-value tiles, which the one-number set doesn't have)
                default: N = 1.5;
              }
              N += z.v * 0.5;
            } else {
              const _ = b ? 0.8 : a === 1 ? 1.4 : 2, L = b ? 1.2 : a === 1 ? 0.8 : 0.5;
              const X = { 1: b ? 0.5 : 0, 2: a >= 1 ? 3 : a === 0 ? 0.8 : 0, 3: a >= 2 ? 5 : a >= 1 ? 3.5 : 1 }[z.tier] || 0;
              N = z.v * _ + z.v * L + X;
              if (pc && z.tier === 1 && z.v <= 2 && a >= 1) N -= 2;
            }
            N -= z.cost * 0.15;
            if (z.cost >= s && !used('place')) N -= 2;
            if (N > 0) o.push({ type: 'hire', tk: M, si: w, tile: z, score: N });
          });
        });
      }
      if (!used('action')) {
        n.forEach((R) => {
          if (!isSpecial(R)) return;
          let M = 0;
          switch (R.action) {
            case 'founder': {
              const empty = this.hexes.filter((N) => !N.tile);
              const w = empty.reduce((N, _) => (i[_.region][a] > (N ? i[N.region][a] : 0) ? _ : N), null);
              M = empty.length ? (w ? i[w.region][a] * 0.6 + 2 : 2) : 0.3; break;
            }
            case 'negotiator': {
              const z = n.filter((N) => N.id !== R.id && !N.action && N.v >= 4).sort((N, _) => _.v - N.v)[0];
              if (!z) { M = 0.5; break; }
              const w = x.find((N) => z.v >= N.bestOpp - N.myInf + 1);
              M = w ? w.vpNow * 1.5 + 3 : z.v >= 5 ? 2.5 : 1; break;
            }
            case 'closer': {
              const z = d.reduce((N, _) => (_.vpNow > N.vpNow ? _ : N), d[0] || null);
              if (!z) { M = 0.3; break; }
              const w = z.vpNow;
              M = w >= 7 ? w * 0.5 + 3 : w >= 5 ? w * 0.4 + 2 : w > 0 ? w * 0.25 + 0.5 : 0.2; break;
            }
            case 'localExpert': case 'luxuryExpert': {
              const lo = R.action === 'localExpert';
              const z = REGIONS.filter((N) => (lo ? i[N.id][a] <= 4 : i[N.id][a] > 4) && this.inf(N.id, e) > 0 && this.inf(N.id, e) > this.ranks(N.id).find((_) => _.player !== e).score);
              const w = z.reduce((N, _) => N + i[_.id][a], 0);
              M = lo ? (w >= 6 ? w * 0.5 + z.length : w > 0 ? w * 0.3 + 0.5 : 0.1) : (w >= 8 ? w * 0.6 + z.length * 1.5 : w > 0 ? w * 0.4 + 1 : 0.1); break;
            }
            case 'poacher': {
              const z = p.filter((w) => w.lead < -4 && w.vpNow >= 5).sort((w, N) => N.vpNow - w.vpNow)[0];
              M = z ? z.vpNow * 0.6 + 3 : x.filter((w) => w.lead < -3).length > 0 ? 3 : 0.8; break;
            }
            case 'relocator': {
              const z = p.filter((N) => N.lead > 2 && N.vpNow <= 4), w = p.filter((N) => N.lead < 0 && N.lead >= -3 && N.vpNow >= 6);
              M = z.length > 0 && w.length > 0 ? w[0].vpNow * 0.5 + 3 : 0.5; break;
            }
            case 'transfer': {
              const z = this.hexes.filter((N) => N.tile && N.tile.owner === e && p[N.region].lead < -3), w = x.filter((N) => N.lead >= -3 && N.vpNow >= 5);
              M = z.length > 0 && w.length > 0 ? w[0].vpNow * 0.5 + 3 : z.length > 0 ? 1.5 : 0.5; break;
            }
            case 'headhunter': {
              if (!l.discard.length) { M = 0; break; }
              const z = l.discard.reduce((w, N) => (N.v * 2 > w.v * 2 ? N : w), l.discard[0]);
              M = z.v >= 6 ? 4.5 : z.v >= 4 ? 3 : z.v >= 4 ? 2.5 : 1; break;
            }
            case 'restructurer': M = 0.2; break;   // (higher only with zero-value tiles)
            default: M = 1;
          }
          o.push({ type: 'action', tile: R, score: M });
        });
      }
      if (!o.length) return { type: 'pass' };
      o.sort((R, M) => M.score - R.score);
      const de = Math.min(m ? 1 : r ? 2 : 3, o.length);
      const W = de === 2 ? [4, 1] : de === 3 ? [5, 2, 1] : [1];
      let Ll = rnd() * W.reduce((x2, y) => x2 + y, 0);
      for (let k = 0; k < de; k++) { Ll -= W[k]; if (Ll <= 0) return o[k]; }
      return o[0];
    }
    /* carry out a bot's choice; specialists pick their own targets the way the original bots do */
    botApply(e, l) {
      const a = this.players[e], u = this.N, S = this.season;
      const vpNow = (rg) => this.regionVP[rg][S];
      const sh = (h) => REGIONS[h.region].short;
      if (l.type === 'pass') { this.say(a.name + ' passes.'); this.stats.passes++; this.actionsLeft = 0; return; }
      if (l.type === 'place' || l.type === 'stack') {
        const c = this.hex(l.hexId), o = a.hand.findIndex((h) => h.id === l.tile.id);
        if (o === -1) return;
        const t = a.hand.splice(o, 1)[0];
        if (l.type === 'stack') {
          const h = payGreedy(a.hand, l.cost);
          if (!h) { a.hand.push(t); this.actionsUsed.push('place'); return; }
          a.hand = h.newHand; a.discard.push(...h.removed);
          this.say(a.name + ' outbids in ' + sh(c) + ' (' + t.v + ' over ' + (c.tile && c.tile.v) + ', paid ' + l.cost + ').');
        } else this.say(a.name + ' places ' + t.name + ' (' + t.v + ') in ' + sh(c) + '.');
        t.owner = e; this.cover(c, t); this.stats.placements++;
        this.actionsUsed.push('place'); this.actionsLeft--; this.move(e, [c.id], 'place');
        return;
      }
      if (l.type === 'place_water') {
        const c = this.water.find((h) => h.id === l.whId), o = a.hand.findIndex((h) => h.id === l.tile.id);
        if (o === -1 || c.tile) return;
        const t = a.hand.splice(o, 1)[0];
        t.owner = e; c.tile = t;
        this.say(a.name + ' places ' + t.name + ' on the channel between ' + c.regions.map((r) => REGIONS[r].short).join(' and ') + '.');
        this.actionsUsed.push('place'); this.actionsLeft--; this.move(e, [c.id], 'water');
        return;
      }
      if (l.type === 'hire') {
        const c = this.market[l.tk], o = c.slots[l.si];
        if (!o) return;
        const s = payGreedy(a.hand, o.cost);
        if (s) {
          a.hand = s.newHand; a.discard.push(...s.removed);
          o.owner = e; a.discard.push(o);
          c.slots[l.si] = c.deck.length ? c.deck.shift() : null;
          this.say(a.name + ' hires ' + o.name + ' (' + o.v + ', cost ' + o.cost + ').');
          this.stats.hires++;
          this.actionsUsed.push('hire'); this.actionsLeft--; this.move(e, [], 'hire');
        }
        return;
      }
      if (l.type === 'action') {
        const c = l.tile, o = a.hand.findIndex((s) => s.id === c.id);
        if (o === -1) return;
        a.hand.splice(o, 1); this.stats.activations++;
        let hexes = [];
        switch (c.action) {
          case 'restructurer': {
            a.bag = shuffle([...a.bag, ...a.hand, ...a.discard]); a.hand = []; a.discard = [];
            this.drawTo(a, HAND); this.say(a.name + ' restructures and draws a fresh hand.'); break;
          }
          case 'headhunter': {
            if (a.discard.length) {
              const s = a.discard.reduce((h, g) => (g.v + g.v > h.v + h.v ? g : h), a.discard[0]);
              a.discard = a.discard.filter((h) => h.id !== s.id); a.hand.push(s);
              this.say(a.name + ' headhunts ' + s.name + ' (' + s.v + ').');
            } else this.say(a.name + ' headhunts an empty discard pile.');
            break;
          }
          case 'closer': {
            let s = 0, h = -1;
            REGIONS.forEach((r) => {
              const m = this.inf(r.id, e), b = (this.ranks(r.id).find((x) => x.player !== e) || {}).score || 0;
              if (m > b) { const v = vpNow(r.id) * (m - b); if (v > h) { h = v; s = r.id; } }
            });
            const g = this.scoreRegion(s);
            this.say(a.name + ' (Closer) scores ' + REGIONS[s].short + ': ' + this.payText(g) + '.');
            hexes = this.hexes.filter((x) => x.region === s).map((x) => x.id); break;
          }
          case 'localExpert': case 'luxuryExpert': {
            const lo = c.action === 'localExpert', pays = Array(u).fill(0);
            REGIONS.filter((s) => (lo ? vpNow(s.id) <= 4 : vpNow(s.id) > 4)).forEach((s) => { hexes.push(...this.hexes.filter((x) => x.region === s.id).map((x) => x.id)); this.scoreRegion(s.id).forEach((v, i) => { pays[i] += v; }); });
            this.say(a.name + ' (' + (lo ? 'Local' : 'Luxury') + ' Expert) scores ' + (lo ? 'the 4-VP-or-less' : 'the over-4-VP') + ' regions: ' + this.payText(pays) + '.');
            break;
          }
          case 'poacher': {
            let s = null, h = -1;
            this.hexes.forEach((g) => {
              if (!g.tile || g.tile.owner === e) return;
              const m = vpNow(g.region), H = this.inf(g.region, e) - g.tile.v, q = m * (H < 0 ? 2 : 0.5);
              if (q > h) { h = q; s = g; }
            });
            if (s) {
              const g = s.tile; this.players[g.owner].discard.push(g);
              c.owner = e; s.tile = c; this.stats.outbids++;
              this.say(a.name + " (Poacher) replaces " + this.players[g.owner].name + "'s " + g.v + ' in ' + sh(s) + '; it goes back to their discard.');
              hexes = [s.id];
            }
            break;
          }
          case 'relocator': {
            let s = null, h = -1;
            this.hexes.forEach((g) => {
              if (!g.tile || g.tile.owner !== e) return;
              const r = g.tile, m = vpNow(g.region);
              this.hexes.forEach((b) => {
                if (b.id === g.id || !b.tile) return;
                const q = vpNow(b.region), pp = this.inf(b.region, e), dd = (this.ranks(b.region).find((x) => x.player !== e) || {}).score || 0;
                const v = (q - m) * 1.5 + (pp + r.v > dd ? q : 0);
                if (v > h) { h = v; s = { from: g, to: b }; }
              });
            });
            if (s) {
              const g = s.from.tile; s.from.tile = s.to.tile; s.to.tile = g;
              this.say(a.name + ' (Relocator) swaps tiles between ' + sh(s.from) + ' and ' + sh(s.to) + '.');
              hexes = [s.from.id, s.to.id];
            }
            break;
          }
          case 'transfer': {
            let s = null, h = null, g = 0;
            this.hexes.forEach((r) => {
              if (!r.tile || r.tile.owner !== e) return;
              const m = r.tile, b = vpNow(r.region);
              this.hexes.forEach((H) => {
                if (H.id === r.id) return;
                const q = vpNow(H.region);
                if (H.tile) { if (m.v <= H.tile.v) return; if (sumV(a.hand) < m.v - H.tile.v) return; }
                if (q - b > g) { g = q - b; s = r; h = H; }
              });
            });
            if (s && h) {
              const r = s.tile; s.tile = null;
              if (h.tile) { const pay = payGreedy(a.hand, r.v - h.tile.v); if (pay) { a.hand = pay.newHand; a.discard.push(...pay.removed); } }
              this.cover(h, r);
              this.say(a.name + ' (Transfer) moves a ' + r.v + ' to ' + sh(h) + '.');
              hexes = [s.id, h.id];
            }
            break;
          }
          case 'negotiator': {
            const cand = a.hand.filter((r) => r.action !== 'consultant' && r.v > 0).sort((r, m) => m.v - r.v);
            let h = null, g = -1;
            cand.forEach((r) => {
              this.hexes.forEach((m) => {
                const bt = m.tile, H = vpNow(m.region);
                if (!bt) { const v = H + r.v * 0.2; if (v > g) { g = v; h = { t: r, h: m, cost: 0 }; } return; }
                if (bt.owner === e || r.v <= bt.v) return;
                const q = r.v - bt.v;
                if (sumV(a.hand.filter((v) => v.id !== r.id)) < q) return;
                const dd = H * 1.3 - q * 0.5;
                if (dd > g) { g = dd; h = { t: r, h: m, cost: q }; }
              });
            });
            if (h) {
              const ri = a.hand.findIndex((b) => b.id === h.t.id), t = a.hand.splice(ri, 1)[0];
              if (h.cost > 0) {
                const pay = payGreedy(a.hand, h.cost);
                if (!pay) { a.hand.push(t); break; }
                a.hand = pay.newHand; a.discard.push(...pay.removed);
              }
              t.owner = e; this.cover(h.h, t); this.stats.placements++;
              this.say(a.name + ' (Negotiator) places a ' + t.v + ' in ' + sh(h.h) + '.');
              hexes = [h.h.id];
            }
            break;
          }
          case 'founder': {
            const empty = this.hexes.filter((h) => !h.tile);
            if (empty.length) {
              const h = empty.reduce((g, r) => (vpNow(r.region) > vpNow(g.region) ? r : g), empty[0]);
              c.owner = e; h.tile = c;
              this.say(a.name + ' (Founder) places in ' + sh(h) + '.');
              hexes = [h.id];
            }
            break;
          }
        }
        this.actionsUsed.push('action'); this.actionsLeft--; this.move(e, hexes, 'action');
      }
    }

    /* ------------------------------------------------------------ views */
    view(seat) {
      const pub = (t) => (t ? { id: t.id, name: t.name, label: labelOf(t), v: t.v, action: t.action || null, owner: t.owner, cost: t.cost, tier: t.tier } : null);
      const sortT = (arr) => arr.slice().sort((x, y) => y.v - x.v || (x.name < y.name ? -1 : x.name > y.name ? 1 : 0) || (x.id < y.id ? -1 : 1)).map(pub);
      const me = this.players[seat];
      const revealed = this.phase !== 'pitch';
      const players = this.players.map((p, i) => {
        const books = i === seat ? sortT(p.bag) : sortT([...p.bag, ...p.hand]);
        const top = [...p.bag, ...p.hand].filter((t) => t.action !== 'consultant').reduce((m, t) => Math.max(m, t.v), 0);
        return {
          name: p.name, bot: p.bot, color: p.color, vp: p.vp, handCount: p.hand.length, bagCount: p.bag.length,
          books, discard: sortT(p.discard), topBid: top,
          pitchLeft: this.pitch.hands[i].slice(),
          pitched: revealed || i === seat ? this.pitch.played[i] : null,
          ready: this.pitch.played[i] !== null,
          onBoard: this.hexes.filter((h) => h.tile && h.tile.owner === i).length + this.water.filter((w) => w.tile && w.tile.owner === i).length,
        };
      });
      const v = {
        seat, N: this.N, phase: this.phase, season: this.season, round: this.round, closing: this.isClosing(),
        turn: this.turn, turnOrder: this.phase === 'play' ? this.turnOrder.slice() : [], orderIdx: this.orderIdx,
        actionsLeft: this.actionsLeft, actionsUsed: this.actionsUsed.slice(),
        regionVP: this.regionVP.map((x) => x.slice()),
        hexes: this.hexes.map((h) => ({ id: h.id, region: h.region, tile: pub(h.tile) })),
        water: this.water.map((w) => ({ id: w.id, regions: w.regions.slice(), tile: pub(w.tile) })),
        market: {}, players,
        hand: me ? me.hand.map(pub) : [],
        reach: me ? [...this.reach(seat)] : [],
        log: this.log.slice(-40), lastMove: this.lastMove, lastScoring: this.lastScoring,
        standings: REGIONS.map((r) => this.ranks(r.id).filter((x) => x.score > 0).map((x) => [x.player, x.score])),
        result: this.result,
      };
      TIERS.forEach((tk) => { v.market[tk] = { slots: this.market[tk].slots.map(pub), left: this.market[tk].deck.length }; });
      return v;
    }
  }

  const API = { Game, REGIONS, SHAPES, WATER, MIDFLOE, TEXT, SEASONS, ROUNDS, HAND, SEASON_NAMES, PITCH, PITCH_BONUS, pitchBonus, REFRESH_COST, TIERS, TIER_NAMES, BOT_NAMES, COLORS, payGreedy, isSpecial };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.PolarBearMarket = API;
})(typeof window !== 'undefined' ? window : this);
