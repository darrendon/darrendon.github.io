/* Abducted — rules engine and bots, ported from Darren's own build. Runs in the browser (window.Abducted)
   and in node (module.exports), so bot-only games can be checked headless: node sim.js
   A round: the Town Leader splits the town into two parties (never the same way twice running), everyone else
   votes on which party searches (the leader breaks ties), the searchers secretly play Transmit (Alien) or Jam
   (Human) and the majority scores (a tie flips the deck's top card, and its team scores), then the Lookout sends
   one searcher to check out the light: they look at their card and the deck's top card, mix them and keep one
   without looking. First team to 5 wins; you win if the card in your stand is on that team. */
(function (root) {
  'use strict';
  const RULES = { perTeam: 10, toWin: 5 };   // 10 Human and 10 Alien team cards; the rest after the deal is the deck
  const TEAM = { H: 'Human', A: 'Alien' }, TEAMS = { H: 'Humans', A: 'Aliens' };
  const BOT_NAMES = ['Mabel', 'Otis', 'June', 'Earl', 'Dot', 'Clyde', 'Pearl', 'Hank', 'Ruth', 'Gus', 'Ida', 'Walt'];
  const rnd = Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  class Game {
    constructor(players, opts) {
      opts = opts || {};
      this.toWin = +opts.points || RULES.toWin;
      this.players = players.map((p) => ({ name: p.name, bot: !!p.bot }));
      const n = this.n = players.length;
      let id = 0;
      const pool = shuffle([...Array(RULES.perTeam).fill('H'), ...Array(RULES.perTeam).fill('A')].map((t) => ({ id: id++, t })));
      this.cards = pool.slice(0, n); this.deck = pool.slice(n);
      this.score = { H: 0, A: 0 };
      this.leader = opts.firstLeader != null ? opts.firstLeader : Math.floor(rnd() * n);
      this.lookout = (this.leader + Math.floor(n / 2)) % n;
      this.phase = 'split'; this.round = 1;
      this.split = null; this.prevSplit = null; this.searchers = null; this.party = null; this.votes = null;
      this.acts = {}; this.last = null; this.known = {}; this.notes = {}; this.lastAbduct = null; this.winner = null;
      this.log = ['Round 1. ' + this.nm(this.leader) + ' is the Town Leader, ' + this.nm(this.lookout) + ' is the Lookout.'];
    }
    nm(s) { return this.players[s].name; }
    say(t) { this.log.push(t); if (this.log.length > 60) this.log.shift(); }
    over() { return this.phase === 'over'; }
    // a split is a starting seat: it and the next ceil(n/2)-1 clockwise are Party 1, everyone else Party 2
    parties(start) {
      const n = this.n, k = Math.ceil(n / 2), p1 = [];
      for (let i = 0; i < k; i++) p1.push((start + i) % n);
      return [p1, [...Array(n).keys()].filter((i) => !p1.includes(i))];
    }
    samePartition(a, b) {
      if (a == null || b == null) return false;
      const key = (s) => s.slice().sort((p, q) => p - q).join(',');
      const [x] = this.parties(a), [y1, y2] = this.parties(b);
      return key(x) === key(y1) || key(x) === key(y2);
    }
    required() {
      if (this.phase === 'split' || this.phase === 'tiebreak') return [this.leader];
      if (this.phase === 'vote') return [...Array(this.n).keys()].filter((s) => s !== this.leader);
      if (this.phase === 'signal') return this.searchers.slice();
      if (this.phase === 'abduct') return [this.lookout];
      return [];
    }
    targets() { return (this.searchers || []).filter((s) => s !== this.lookout); }
    valid(s, v) {
      if (this.phase === 'split') return Number.isInteger(v) && v >= 0 && v < this.n && !this.samePartition(v, this.prevSplit);
      if (this.phase === 'vote' || this.phase === 'tiebreak') return v === 1 || v === 2;
      if (this.phase === 'signal') return v === 'T' || v === 'J';
      if (this.phase === 'abduct') return this.targets().includes(v);
      return false;
    }
    act(seat, a) {
      a = a || {};
      if (!this.required().includes(seat)) return { ok: false, error: 'Not your move right now.' };
      if (this.acts[seat] !== undefined) return { ok: false, error: 'You already chose.' };
      const v = a.value;
      if (!this.valid(seat, v)) return { ok: false, error: this.phase === 'split' ? 'You can’t split the town the same way as last round.' : 'Not allowed.' };
      this.acts[seat] = v;
      if (this.required().every((s) => this.acts[s] !== undefined)) { const got = this.acts; this.acts = {}; this.resolve(got); }
      return { ok: true };
    }
    nextRound() {
      const n = this.n;
      this.leader = (this.leader + 1) % n; this.lookout = (this.lookout + 1) % n; this.round += 1;
      this.prevSplit = this.split; this.phase = 'split'; this.split = null; this.searchers = null; this.votes = null; this.party = null;
      this.say('Round ' + this.round + '. ' + this.nm(this.leader) + ' is the Town Leader, ' + this.nm(this.lookout) + ' is the Lookout.');
    }
    resolve(got) {
      if (this.phase === 'split') {
        this.split = got[this.leader]; this.phase = 'vote';
        this.say(this.nm(this.leader) + ' split the town. Party 1 starts with ' + this.nm(this.split) + '.');
      } else if (this.phase === 'vote' || this.phase === 'tiebreak') {
        let pick;
        if (this.phase === 'vote') {
          const c = { 1: 0, 2: 0 }; Object.values(got).forEach((v) => c[v]++); this.votes = c;
          if (c[1] === c[2]) { this.phase = 'tiebreak'; this.say('The vote tied ' + c[1] + '–' + c[2] + '. ' + this.nm(this.leader) + ' breaks the tie.'); return; }
          pick = c[1] > c[2] ? 1 : 2; this.say('Party ' + pick + ' goes out searching (vote ' + c[1] + '–' + c[2] + ').');
        } else { pick = got[this.leader]; this.say(this.nm(this.leader) + ' sent Party ' + pick + '.'); }
        this.party = pick; this.searchers = this.parties(this.split)[pick - 1]; this.phase = 'signal';
      } else if (this.phase === 'signal') {
        let T = 0, J = 0; Object.values(got).forEach((v) => (v === 'T' ? T++ : J++));
        let scored, flip = null;
        if (T > J) scored = 'A'; else if (J > T) scored = 'H';
        else { const c = this.deck.shift(); this.deck.push(c); flip = c.t; scored = flip; }
        this.score[scored] += 1;
        this.last = { round: this.round, party: this.party, T, J, flip, scored };
        this.say(flip ? 'Signal tied ' + T + '–' + J + '. The flipped card was ' + TEAM[flip] + ', so ' + TEAMS[scored] + ' score.' : T + ' Transmit, ' + J + ' Jam: ' + TEAMS[scored] + ' score.');
        if (this.score[scored] >= this.toWin) { this.phase = 'over'; this.winner = scored; this.say(TEAMS[scored] + ' win!'); return; }
        if (!this.targets().length) { this.nextRound(); return; }
        this.phase = 'abduct';
      } else if (this.phase === 'abduct') {
        const t = got[this.lookout], top = this.deck.shift(), mine = this.cards[t], keepMine = rnd() < 0.5;
        this.cards[t] = keepMine ? mine : top; this.deck.push(keepMine ? top : mine);
        this.notes[t] = { round: this.round, saw: [mine.t, top.t] };
        if (mine.t === top.t) this.known[t] = mine.t; else delete this.known[t];
        this.lastAbduct = { round: this.round, target: t, by: this.lookout };
        this.say(this.nm(this.lookout) + ' sent ' + this.nm(t) + ' to check out the light. They came back...');
        this.nextRound();
      }
    }

    view(seat) {
      const over = this.phase === 'over';
      return {
        seat, phase: this.phase, round: this.round, n: this.n, toWin: this.toWin,
        players: this.players.map((p) => ({ name: p.name, bot: p.bot })),
        cards: this.cards.map((c, i) => ({ id: c.id, t: i === seat && !over ? null : c.t })),
        deck: this.deck.length, score: this.score, leader: this.leader, lookout: this.lookout,
        split: this.split, prevSplit: this.prevSplit, half: Math.ceil(this.n / 2),
        parties: this.split != null ? this.parties(this.split) : null,
        blocked: this.phase === 'split' ? [...Array(this.n).keys()].filter((i) => this.samePartition(i, this.prevSplit)) : [],
        searchers: this.searchers, party: this.party, votes: this.votes,
        required: this.required(), acted: Object.keys(this.acts).map(Number), mine: this.acts[seat] !== undefined ? this.acts[seat] : null,
        targets: this.phase === 'abduct' ? this.targets() : [],
        last: this.last, lastAbduct: this.lastAbduct, note: this.notes[seat] || null, winner: this.winner,
        log: this.log.slice(-14),
      };
    }

    /* ---------------- bots (Darren's) */
    belief(s) {   // chance this seat is an Alien, from what it could know
      if (this.known[s]) return this.known[s] === 'A' ? 1 : 0;
      if (this.notes[s]) return 0.5;
      let visA = 0; for (let i = 0; i < this.n; i++) if (i !== s && this.cards[i].t === 'A') visA++;
      return (RULES.perTeam - visA) / (2 * RULES.perTeam - (this.n - 1));
    }
    botTeam(s) { const p = this.belief(s); return p > 0.5 ? 'A' : p < 0.5 ? 'H' : (rnd() < 0.5 ? 'A' : 'H'); }
    partyScore(s, party, T) { const p = this.belief(s), conf = Math.abs(2 * p - 1); return party.reduce((acc, m) => acc + (m === s ? conf : (this.cards[m].t === T ? 1 : -1)), 0); }
    botDecide(s) {
      const T = this.botTeam(s);
      if (this.phase === 'split') {
        let best = [], bestV = -1e9;
        for (let st = 0; st < this.n; st++) {
          if (this.samePartition(st, this.prevSplit)) continue;
          const [a, b] = this.parties(st), v = Math.max(this.partyScore(s, a, T), this.partyScore(s, b, T));
          if (v > bestV + 1e-9) { bestV = v; best = [st]; } else if (Math.abs(v - bestV) < 1e-9) best.push(st);
        }
        return best[Math.floor(rnd() * best.length)];
      }
      if (this.phase === 'vote' || this.phase === 'tiebreak') {
        const [a, b] = this.parties(this.split), va = this.partyScore(s, a, T), vb = this.partyScore(s, b, T);
        return va > vb ? 1 : vb > va ? 2 : (rnd() < 0.5 ? 1 : 2);
      }
      if (this.phase === 'signal') {
        const p = this.belief(s); let v = p > 0.5 ? 'T' : p < 0.5 ? 'J' : (rnd() < 0.5 ? 'T' : 'J');
        if (rnd() < 0.1) v = v === 'T' ? 'J' : 'T';
        return v;
      }
      if (this.phase === 'abduct') {
        const ts = this.targets(), opp = ts.filter((t) => this.cards[t].t !== T), pool = opp.length ? opp : ts;
        return pool[Math.floor(rnd() * pool.length)];
      }
    }
    botDelay() { return this.phase === 'abduct' ? 1600 : this.phase === 'vote' || this.phase === 'signal' ? 500 + rnd() * 500 : 1200; }
    botStep() {
      if (this.over()) return false;
      const s = this.required().find((i) => this.players[i].bot && this.acts[i] === undefined);
      if (s == null) return false;
      this.act(s, { value: this.botDecide(s) });
      return true;
    }
  }

  const api = { RULES, BOT_NAMES, Game, TEAM, TEAMS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Abducted = api;
})(typeof window !== 'undefined' ? window : globalThis);
