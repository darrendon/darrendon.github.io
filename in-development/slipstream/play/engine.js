/* Slipstream — rules engine and bots. Runs in the browser (window.Slipstream) and in node
   (module.exports), so bot-only races can be checked headless: node sim.js
   Every number a playtest might tune lives in RULES. */
(function (root) {
  'use strict';
  const RULES = {
    edge: 16,                 // the last safe space; anything past it is over the cliff
    picks: 3,                 // cards each rider picks in secret before a race
    winsNeeded: 2,            // first to this many race wins takes the game
    cards: [                  // everyone holds the same six; safe is never 1, so it always beats being caught
      { name: 'Nudge', risky: 3, safe: 2 },
      { name: 'Cruise', risky: 4, safe: 2 },
      { name: 'Push', risky: 5, safe: 3 },
      { name: 'Gun It', risky: 6, safe: 3 },
      { name: 'Floor It', risky: 7, safe: 4 },
      { name: 'Nitro', risky: 8, safe: 2 },
    ],
    caught: 1,
    spaces: { 4: 'boost', 7: 'pothole', 10: 'boost', 13: 'pothole' },   // land exactly on one: boost +1, pothole back 2 (and no slipstream)                // a risky play beaten by a later risky play of the same card moves this far
    laneCap: (n) => (n >= 5 ? 2 : 1),   // riders per space: one at 3–4, the road is two lanes wide at 5–6
  };
  const BOT_NAMES = ['Dash', 'Skid', 'Pip', 'Rex', 'Zola', 'Moxie', 'Bolt', 'Juno', 'Turbo', 'Fern'];
  const rnd = Math.random;

  function subsets(n, k) { const out = []; const go = (s, a) => { if (a.length === k) { out.push(a.slice()); return; } for (let i = s; i < n; i++) { a.push(i); go(i + 1, a); a.pop(); } }; go(0, []); return out; }

  class Game {
    constructor(players, opts) {
      opts = opts || {};
      this.R = Object.assign({}, RULES, opts.winsNeeded ? { winsNeeded: +opts.winsNeeded } : {});
      this.players = players.map((p) => ({ name: p.name, bot: !!p.bot, wins: 0 }));
      this.N = players.length; this.cap = RULES.laneCap(this.N);
      this.race = 0; this.log = []; this.tick = 0; this.firstSeat = Math.floor(rnd() * this.N);
      this.winner = null;
      this.newRace();
    }
    newRace() {
      this.race++;
      // staggered start: the rider at the back leads first, and the back seat rotates each race
      const back = (this.firstSeat + this.race - 1) % this.N;
      this.riders = this.players.map((p, i) => {
        const k = (i - back + this.N) % this.N;
        return { pos: k, crashed: false, at: 0, picks: null, hand: [], played: [] };
      });
      this.phase = 'pick'; this.leader = back; this.trick = null; this.lastTrick = null; this.raceResult = null;
      this.say('Race ' + this.race + '. Everyone picks ' + this.R.picks + ' cards in secret.');
    }
    say(msg) { this.log.push(msg); if (this.log.length > 60) this.log.shift(); }
    over() { return this.phase === 'over'; }
    occupants(pos, except) { return this.riders.filter((r, i) => i !== except && !r.crashed && r.pos === pos).length; }

    act(seat, a) {
      a = a || {};
      const r = this.riders[seat];
      if (this.phase === 'pick') {
        if (a.type !== 'pick') return { ok: false, error: 'Pick your cards first.' };
        if (r.picks) return { ok: false, error: 'You already picked.' };
        const ids = [...new Set((a.cards || []).map((x) => x | 0))].filter((x) => x >= 0 && x < this.R.cards.length);
        if (ids.length !== this.R.picks) return { ok: false, error: 'Pick exactly ' + this.R.picks + ' cards.' };
        r.picks = ids.slice().sort((x, y) => x - y); r.hand = r.picks.slice();
        if (this.riders.every((x) => x.picks)) { this.phase = 'lead'; this.say('Everyone has picked. ' + this.players[this.leader].name + ' leads.'); this.skipEmptyLeader(); }
        return { ok: true };
      }
      if (this.phase === 'lead') {
        if (seat !== this.leader) return { ok: false, error: 'Wait for ' + this.players[this.leader].name + ' to lead.' };
        if (a.type !== 'lead') return { ok: false, error: 'Lead one of your cards.' };
        const c = a.card | 0; if (!r.hand.includes(c)) return { ok: false, error: 'You don’t have that card.' };
        this.trick = { card: c, plays: [{ seat, risky: !!a.risky }], order: [] };
        r.hand.splice(r.hand.indexOf(c), 1);
        for (let k = 1; k < this.N; k++) { const s = (seat + k) % this.N; if (this.riders[s].hand.includes(c)) this.trick.order.push(s); }
        this.say(this.players[seat].name + ' leads ' + this.R.cards[c].name + (a.risky ? ' risky.' : ' safe.'));
        this.phase = 'follow';
        if (!this.trick.order.length) this.resolve();
        return { ok: true };
      }
      if (this.phase === 'follow') {
        const next = this.trick.order[0];
        if (seat !== next) return { ok: false, error: 'Waiting for ' + this.players[next].name + '.' };
        if (a.type !== 'follow') return { ok: false, error: 'Play ' + this.R.cards[this.trick.card].name + ' risky or safe.' };
        this.trick.order.shift();
        r.hand.splice(r.hand.indexOf(this.trick.card), 1);
        this.trick.plays.push({ seat, risky: !!a.risky });
        this.say(this.players[seat].name + ' follows ' + (a.risky ? 'risky.' : 'safe.'));
        if (!this.trick.order.length) this.resolve();
        return { ok: true };
      }
      if (this.phase === 'raceEnd' || this.phase === 'trickEnd') {
        if (a.type === 'next') { this.advance(); return { ok: true }; }
      }
      return { ok: false, error: 'Not now.' };
    }
    resolve() {
      const t = this.trick, card = this.R.cards[t.card];
      let last = -1; t.plays.forEach((p, i) => { if (p.risky) last = i; });
      t.results = [];
      for (let i = 0; i < t.plays.length; i++) {
        const p = t.plays[i];
        const move = !p.risky ? card.safe : i === last ? card.risky : this.R.caught;
        const res = this.moveRider(p.seat, move);
        res.kind = !p.risky ? 'safe' : i === last ? 'risky' : 'caught';
        t.results.push(res);
        this.say(this.players[p.seat].name + ' ' + (res.kind === 'caught' ? 'is caught and moves 1' : 'moves ' + move) + (res.boost ? ', hits a boost (+1)' : '') + (res.pothole ? ', hits a pothole and drops back 2' : '') + (res.slip ? ', slipstreams to ' + res.slip : '') + (res.crash ? ' and goes over the edge!' : '.'));
      }
      this.lastTrick = t; this.trick = null;
      this.phase = 'trickEnd';
    }
    moveRider(seat, move) {
      const r = this.riders[seat], from = r.pos, res = { seat, from, move };
      if (r.crashed) return res;
      let to = from + move;
      const settle = (p) => { while (p > 0 && this.occupants(p, seat) >= this.cap) p--; return p; };
      if (to > this.R.edge) { r.crashed = true; r.pos = this.R.edge + 1; res.crash = true; return res; }
      to = settle(to);
      const sp = this.R.spaces[to];
      if (sp === 'pothole') { to = settle(Math.max(0, to - 2)); res.pothole = true; r.pos = to; r.at = ++this.tick; res.to = to; return res; }
      if (sp === 'boost') { res.boost = true; to += 1; if (to > this.R.edge) { r.crashed = true; r.pos = this.R.edge + 1; res.crash = true; return res; } to = settle(to); }
      // slipstream: finishing right behind someone pulls you past them to the next open space
      if (this.occupants(to + 1, seat) > 0) {
        let s = to + 1; while (this.occupants(s, seat) >= this.cap || (s === to + 1)) { s++; if (s > this.R.edge + 1) break; }
        if (s > this.R.edge) { r.crashed = true; r.pos = this.R.edge + 1; res.slip = 'the edge'; res.crash = true; return res; }
        to = s; res.slip = 'space ' + s;
      }
      r.pos = to; r.at = ++this.tick; res.to = to;
      return res;
    }
    advance() {
      if (this.phase === 'trickEnd') {
        if (this.riders.every((r) => !r.hand.length)) return this.endRace();
        this.leader = (this.leader + 1) % this.N; this.phase = 'lead'; this.skipEmptyLeader();
        return;
      }
      if (this.phase === 'raceEnd') {
        const champ = this.players.findIndex((p) => p.wins >= this.R.winsNeeded);
        if (champ >= 0) { this.phase = 'over'; this.winner = champ; this.say(this.players[champ].name + ' wins the game!'); return; }
        this.newRace();
      }
    }
    skipEmptyLeader() { let k = 0; while (!this.riders[this.leader].hand.length && k++ < this.N) this.leader = (this.leader + 1) % this.N; }
    endRace() {
      const alive = this.riders.map((r, i) => ({ r, i })).filter((x) => !x.r.crashed);
      let win = null;
      if (alive.length) { alive.sort((a, b) => b.r.pos - a.r.pos || a.r.at - b.r.at); win = alive[0].i; this.players[win].wins++; }
      this.raceResult = { winner: win, picks: this.riders.map((r) => r.picks) };
      this.say(win == null ? 'Everyone went over the edge. Nobody wins the race.' : this.players[win].name + ' stops ' + (this.R.edge - this.riders[win].pos === 0 ? 'right at the edge' : (this.R.edge - this.riders[win].pos) + ' from the edge') + ' and wins race ' + this.race + '.');
      this.phase = 'raceEnd';
    }

    /* what one seat may see */
    view(seat) {
      const me = this.riders[seat];
      return {
        seat, phase: this.phase, race: this.race, edge: this.R.edge, spaces: this.R.spaces, picksN: this.R.picks, winsNeeded: this.R.winsNeeded, cap: this.cap,
        cards: this.R.cards, leader: this.leader, winner: this.winner,
        players: this.players.map((p, i) => {
          const r = this.riders[i];
          return { name: p.name, bot: p.bot, wins: p.wins, pos: r.pos, crashed: r.crashed, left: r.picks ? r.hand.length : null, picked: !!r.picks,
            picks: (i === seat || this.phase === 'raceEnd' || this.phase === 'over') ? r.picks : null };
        }),
        hand: me.hand.slice(), myPicks: me.picks,
        trick: this.trick && { card: this.trick.card, plays: this.trick.plays, next: this.trick.order[0], waiting: this.trick.order.slice() },
        lastTrick: this.lastTrick && { card: this.lastTrick.card, plays: this.lastTrick.plays, results: this.lastTrick.results },
        raceResult: this.raceResult, log: this.log.slice(-14),
      };
    }

    /* ---------------- bots */
    botDelay() { return this.phase === 'trickEnd' ? 1900 : this.phase === 'raceEnd' ? 4200 : this.phase === 'pick' ? 500 : 950; }
    botStep() {
      if (this.phase === 'pick') { const s = this.riders.findIndex((r, i) => !r.picks && this.players[i].bot); if (s < 0) return false; this.act(s, { type: 'pick', cards: this.botPick(s) }); return true; }
      if (this.phase === 'lead') { if (!this.players[this.leader].bot) return false; const m = this.botLead(this.leader); this.act(this.leader, Object.assign({ type: 'lead' }, m)); return true; }
      if (this.phase === 'follow') { const s = this.trick.order[0]; if (!this.players[s].bot) return false; this.act(s, { type: 'follow', risky: this.botRisky(s, this.trick.card, true) }); return true; }
      if (this.phase === 'trickEnd' || this.phase === 'raceEnd') {
        // any human can move things on; bots wait a beat so people see what happened
        this.advance(); return true;
      }
      return false;
    }
    botPick(s) {
      // try each set of picks against random outcomes (risky lands, caught, or safe) and keep the one
      // that tends to stop closest to the edge without going over; a dash of noise keeps bots readable but not identical
      const C = this.R.cards, D = this.R.edge - this.riders[s].pos, pc = Math.min(0.45, 0.12 * (this.N - 1));
      let best = null, bs = -1e9;
      for (const sub of subsets(C.length, this.R.picks)) {
        let u = 0;
        for (let k = 0; k < 40; k++) {
          let d = 0;
          for (const c of sub) { const x = rnd(); d += x < 0.5 - pc / 2 ? C[c].risky : x < 0.5 + pc / 2 ? this.R.caught : C[c].safe; }
          u += d > D ? -7 : -(D - d);
        }
        const sc = u / 40 + rnd() * 1.6;
        if (sc > bs) { bs = sc; best = sub; }
      }
      return best;
    }
    botRisky(s, c, following) {
      const r = this.riders[s], C = this.R.cards, card = C[c];
      const rest = r.hand.filter((x) => x !== c);
      const restMin = rest.reduce((t, x) => t + Math.min(C[x].safe, this.R.caught), 0);
      const restSafe = rest.reduce((t, x) => t + C[x].safe, 0);
      const room = this.R.edge - r.pos;
      const caughtBefore = following && this.trick.plays.some((p) => p.risky);
      const later = following ? this.trick.order.length - 1 : this.N - 1;   // riders still to act on this card might catch me
      if (card.risky + restSafe <= room) return rnd() < (caughtBefore ? 0.9 : later > 0 ? 0.75 : 0.95);
      if (card.risky + restMin <= room) return rnd() < (caughtBefore ? 0.6 : 0.4);
      return rnd() < 0.06;   // the occasional dare
    }
    botLead(s) {
      const r = this.riders[s], C = this.R.cards;
      const opts = r.hand.map((c) => ({ c, risky: this.botRisky(s, c, false), w: C[c].risky + rnd() * 3 }));
      opts.sort((a, b) => b.w - a.w);
      return { card: opts[0].c, risky: opts[0].risky };
    }
  }

  const api = { RULES, BOT_NAMES, Game };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Slipstream = api;
})(typeof window !== 'undefined' ? window : globalThis);
