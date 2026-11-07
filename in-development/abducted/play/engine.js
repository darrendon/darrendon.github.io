/* Abducted — rules engine and bots. Runs in the browser (window.Abducted) and in node, so
   bot-only games can be checked headless: node sim.js. Every number a playtest might tune is in RULES. */
(function (root) {
  'use strict';
  const RULES = {
    pointsToWin: 5,
    deckPerTeam: (n) => n,          // N Human and N Alien cards: N dealt face out, N face down in the middle
    flipEachTurn: true,              // the chooser flips one middle card face up after picking the half
  };
  const H = 'H', A = 'A', NAME = { H: 'Human', A: 'Alien' };
  const BOT_NAMES = ['Zib', 'Nova', 'Orla', 'Quill', 'Bix', 'Tamsin', 'Glorp', 'Wren', 'Ozzy', 'Pell', 'Juniper', 'Rook'];
  const rnd = Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  class Game {
    constructor(players, opts) {
      opts = opts || {};
      this.target = +opts.points || RULES.pointsToWin;
      this.players = players.map((p) => ({ name: p.name, bot: !!p.bot }));
      const N = this.N = players.length;
      let id = 0;
      const deck = shuffle([...Array(RULES.deckPerTeam(N)).fill(H), ...Array(RULES.deckPerTeam(N)).fill(A)].map((t) => ({ id: id++, t })));
      this.cards = deck.slice(0, N);       // cards[seat] = the card in that seat's stand
      this.middle = deck.slice(N);         // face down
      this.flipped = [];
      this.score = { H: 0, A: 0 };
      this.leader = Math.floor(rnd() * N);
      this.turn = 0; this.log = []; this.talk = [];
      this.startTurn();
    }
    say(m) { this.log.push(m); if (this.log.length > 60) this.log.shift(); }
    chat(seat, text) { this.talk.push({ seat, text, turn: this.turn }); if (this.talk.length > 40) this.talk.shift(); }
    over() { return this.phase === 'over'; }
    get chooser() { return (this.leader + 1) % this.N; }
    sizes() { return [Math.floor(this.N / 2), Math.ceil(this.N / 2)]; }
    startTurn() {
      this.turn++; this.phase = 'possess'; this.half = null; this.chosen = null; this.votes = {}; this.result = null; this.possessed = null;
      this.say('Turn ' + this.turn + ': ' + this.players[this.leader].name + ' leads.');
    }

    act(seat, a) {
      a = a || {};
      const nm = (i) => this.players[i].name;
      if (this.phase === 'possess') {
        if (seat !== this.leader) return { ok: false, error: nm(this.leader) + ' is choosing who to possess.' };
        const t = a.target | 0;
        if (a.type !== 'possess' || t === seat || t < 0 || t >= this.N) return { ok: false, error: 'Possess another player.' };
        if (!this.middle.length) { this.say('The middle is empty, so nobody can be possessed.'); }
        else {
          const k = Math.floor(rnd() * this.middle.length), fresh = this.middle.splice(k, 1)[0], old = this.cards[t];
          this.cards[t] = fresh; this.middle.splice(Math.floor(rnd() * (this.middle.length + 1)), 0, old);
          this.possessed = { seat: t, from: old.t, to: fresh.t };
          this.say(nm(seat) + ' possesses ' + nm(t) + '.');
        }
        this.phase = 'split';
        return { ok: true };
      }
      if (this.phase === 'split') {
        if (seat !== this.leader) return { ok: false, error: nm(this.leader) + ' is splitting the table.' };
        const g = [...new Set((a.group || []).map((x) => x | 0))].filter((x) => x >= 0 && x < this.N);
        if (a.type !== 'split' || !this.sizes().includes(g.length)) return { ok: false, error: 'Split the table as evenly as possible.' };
        this.half = { A: g.sort((x, y) => x - y), B: [...Array(this.N).keys()].filter((x) => !g.includes(x)) };
        this.say(nm(seat) + ' splits the table.');
        this.phase = 'choose';
        return { ok: true };
      }
      if (this.phase === 'choose') {
        if (seat !== this.chooser) return { ok: false, error: nm(this.chooser) + ' is picking which half is beamed up.' };
        if (a.type !== 'choose' || (a.half !== 'A' && a.half !== 'B')) return { ok: false, error: 'Pick a half.' };
        this.chosen = a.half;
        this.say(nm(seat) + ' beams up the ' + (a.half === 'A' ? 'first' : 'second') + ' half: ' + this.half[a.half].map(nm).join(', ') + '.');
        if (RULES.flipEachTurn && this.middle.length) { const c = this.middle.pop(); this.flipped.push(c); this.say('Flipped from the middle: ' + NAME[c.t] + '.'); }
        this.phase = 'vote';
        this.botTalk();
        return { ok: true };
      }
      if (this.phase === 'vote') {
        if (a.type !== 'vote') return { ok: false, error: 'Waiting for votes.' };
        if (!this.half[this.chosen].includes(seat)) return { ok: false, error: 'Only the beamed-up half votes.' };
        if (a.vote !== H && a.vote !== A) return { ok: false, error: 'Thumbs up or down.' };
        this.votes[seat] = a.vote;
        if (this.half[this.chosen].every((s) => this.votes[s])) this.reveal();
        return { ok: true };
      }
      if (this.phase === 'reveal' && a.type === 'next') { this.advance(); return { ok: true }; }
      return { ok: false, error: 'Not now.' };
    }
    reveal() {
      const v = Object.values(this.votes), h = v.filter((x) => x === H).length, al = v.length - h;
      const win = h > al ? H : al > h ? A : null;
      if (win) this.score[win]++;
      this.result = { H: h, A: al, win };
      this.say('Thumbs: ' + h + ' up, ' + al + ' down. ' + (win ? NAME[win] + 's score.' : 'A tie scores nothing.'));
      this.phase = 'reveal';
    }
    advance() {
      if (this.phase !== 'reveal') return;
      const w = this.score.H >= this.target ? H : this.score.A >= this.target ? A : null;
      if (w) { this.phase = 'over'; this.winTeam = w; this.say(NAME[w] + 's win! ' + this.players.filter((p, i) => this.cards[i].t === w).map((p) => p.name).join(', ') + (this.players.filter((p, i) => this.cards[i].t === w).length > 1 ? ' win.' : ' wins.')); return; }
      this.leader = (this.leader + 1) % this.N;
      this.startTurn();
    }

    /* card counting: what seat s can know about its own card */
    belief(s) {
      let known = 0, h = 0;
      this.cards.forEach((c, i) => { if (i !== s) { known++; if (c.t === H) h++; } });
      this.flipped.forEach((c) => { known++; if (c.t === H) h++; });
      const total = RULES.deckPerTeam(this.N) * 2;
      return (RULES.deckPerTeam(this.N) - h) / (total - known);   // chance that my card is Human
    }

    view(seat) {
      const show = this.phase === 'over';
      return {
        seat, phase: this.phase, turn: this.turn, N: this.N, target: this.target,
        leader: this.leader, chooser: this.chooser, sizes: this.sizes(),
        players: this.players.map((p, i) => ({ name: p.name, bot: p.bot })),
        cards: this.cards.map((c, i) => (i === seat && !show ? { id: c.id, t: null } : { id: c.id, t: c.t })),
        middle: this.middle.map((c) => c.id), flipped: this.flipped.map((c) => ({ id: c.id, t: c.t })),
        score: this.score, half: this.half, chosen: this.chosen,
        voted: this.half && this.chosen ? this.half[this.chosen].filter((s) => this.votes[s]) : [],
        myVote: this.votes[seat] || null,
        votes: this.phase === 'reveal' || this.phase === 'over' ? this.votes : null,
        result: this.result, winTeam: this.winTeam || null,
        possessed: this.possessed && { seat: this.possessed.seat, to: this.possessed.seat === seat && !show ? null : this.possessed.to },
        odds: Math.round(this.belief(seat) * 100),
        talk: this.talk.filter((t) => t.turn === this.turn), log: this.log.slice(-14),
      };
    }

    /* ---------------- bots */
    botDelay() { return this.phase === 'reveal' ? 3800 : this.phase === 'vote' ? 1300 : 1500; }
    myTeamGuess(s) { const p = this.belief(s); return Math.abs(p - 0.5) < 0.06 ? (rnd() < 0.5 ? H : A) : p > 0.5 ? H : A; }
    botStep() {
      const P = this.players;
      if (this.phase === 'possess' && P[this.leader].bot) {
        const s = this.leader, mine = this.myTeamGuess(s);
        const opp = [...Array(this.N).keys()].filter((i) => i !== s && this.cards[i].t !== mine);
        const pool = opp.length ? opp : [...Array(this.N).keys()].filter((i) => i !== s);
        this.act(s, { type: 'possess', target: pool[Math.floor(rnd() * pool.length)] }); return true;
      }
      if (this.phase === 'split' && P[this.leader].bot) {
        const seats = shuffle([...Array(this.N).keys()]), k = this.sizes()[Math.floor(rnd() * 2)];
        this.act(this.leader, { type: 'split', group: seats.slice(0, k) }); return true;
      }
      if (this.phase === 'choose' && P[this.chooser].bot) {
        const s = this.chooser, mine = this.myTeamGuess(s);
        const fit = (g) => this.half[g].reduce((t, i) => t + (i === s ? 1 : this.cards[i].t === mine ? 1 : 0), 0) / this.half[g].length + rnd() * 0.15;
        this.act(s, { type: 'choose', half: fit('A') >= fit('B') ? 'A' : 'B' }); return true;
      }
      if (this.phase === 'vote') {
        const s = this.half[this.chosen].find((i) => P[i].bot && !this.votes[i]);
        if (s == null) return false;
        this.act(s, { type: 'vote', vote: this.myTeamGuess(s) }); return true;
      }
      if (this.phase === 'reveal') { this.advance(); return true; }
      return false;
    }
    /* a few bots tell someone in the beamed-up half what they are — true when that suits the bot's own side */
    botTalk() {
      const voters = this.half[this.chosen];
      const bots = shuffle(this.players.map((p, i) => i).filter((i) => this.players[i].bot)).slice(0, Math.min(3, Math.ceil(this.N / 3)));
      for (const b of bots) {
        const targets = voters.filter((i) => i !== b);
        if (!targets.length) continue;
        const humans = targets.filter((i) => !this.players[i].bot);
        const pool = humans.length && rnd() < 0.7 ? humans : targets;
        const t = pool[Math.floor(rnd() * pool.length)], want = this.myTeamGuess(b);
        const lines = want === H
          ? ['{n}, you’re Human. Thumbs up.', '{n}, trust me, you’re one of us. Thumbs up.', 'I can see your card, {n}. Human. Vote up.']
          : ['{n}, you’re an Alien. Thumbs down.', '{n}, sorry to break it to you: Alien. Thumbs down.', 'I can see your card, {n}. Alien. Vote down.'];
        this.chat(b, lines[Math.floor(rnd() * lines.length)].replace('{n}', this.players[t].name.replace(/\s*\(bot\)$/, '')));
      }
    }
  }

  const api = { RULES, BOT_NAMES, Game, NAME };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Abducted = api;
})(typeof window !== 'undefined' ? window : globalThis);
