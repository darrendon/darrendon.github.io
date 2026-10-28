/* Too Many Crooks! — rules engine and bots.
   Works in a browser (window.TMC) and in node (module.exports) so it can be tested headless. */
(function (root) {
  'use strict';

  const JOBS = [
    { roll: 8, send: 4, pay: 3, spare: 1 },
    { roll: 7, send: 4, pay: 2, spare: 1 },
    { roll: 6, send: 4, pay: 2, spare: 0 },
  ];
  const BANDS = ['Inside Man', 'Getaway Driver', 'The Muscle'];
  const band = (v) => (v <= 2 ? 0 : v <= 4 ? 1 : 2);
  const d6 = () => 1 + Math.floor(Math.random() * 6);
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  // ----------------------------------------------------------------- bots
  const PERSONAS = ['fair', 'fair', 'loyal', 'shark', 'betrayer'];
  const BOT_NAMES = ['Vic', 'Dot', 'Sal', 'Ruby', 'Moe', 'Lou', 'Pearl', 'Ace'];

  // expected wage for sending die v to kitchen `there` when the host will hand out `pay` cuts
  function ev(v, there, pay, cut) {
    const same = there.filter((x) => band(x.v) === band(v));
    const pCrew = !same.length ? 0.92 : same.every((x) => x.v < v) ? 0.55 : 0.05;
    const better = there.filter((x) => x.v > v && band(x.v) !== band(v)).length + (same.length && same.every((x) => x.v < v) ? 0 : 0);
    const pPaid = better < pay ? 0.9 : 0.25;
    return pCrew * pPaid * cut;
  }

  function botSend(g, seat) {
    const S = g.state, job = JOBS[S.job];
    const hand = S.hands[seat].slice();
    const kitchens = S.kitchens.map((k) => k.slice());
    const trust = S.trust[seat];
    const out = [];
    for (let n = 0; n < job.send; n++) {
      let best = null;
      for (let p = 0; p < hand.length; p++) {
        const d = hand[p];
        for (let j = 0; j < S.N; j++) {
          if (j === seat) continue;
          const there = kitchens[j];
          let val = ev(d.v, there, job.pay, 2.4) * (1 + 0.5 * Math.max(-1, Math.min(1, trust[j])));
          if (there.length >= 2 && !there.some((x) => band(x.v) === band(d.v))) val += 0.4;   // completing a crew buys goodwill
          if (j === S.leader && S.job > 0) val -= 0.6;                                             // don't feed the leader
          val += Math.random() * 0.35;
          if (!best || val > best.val) best = { val, p, j };
        }
      }
      const d = hand.splice(best.p, 1)[0];
      kitchens[best.j].push({ id: d.id, v: d.v, owner: seat });
      out.push({ dieId: d.id, to: best.j });
    }
    return out;
  }

  function botCrew(g, seat) {
    return bestCrew(g.state.kitchens[seat]).map((d) => d.id);
  }

  function bestCrew(kitchen) {
    const used = new Set(), c = [];
    for (const d of kitchen.slice().sort((a, b) => b.v - a.v)) {
      const b = band(d.v);
      if (used.has(b)) continue;
      used.add(b); c.push(d);
    }
    return c;
  }

  function botPay(g, seat) {
    const S = g.state, job = JOBS[S.job];
    const crew = S.crews[seat];
    const kept = S.kept[seat].slice().sort((a, b) => b.v - a.v);
    const n = crew.length ? Math.min(job.pay, kept.length) : 0;
    const assign = {};
    if (!n) return assign;
    const persona = S.players[seat].persona;
    const last = S.job === JOBS.length - 1;
    // who deserves what: default is "biggest cut to the biggest die"
    let order = crew.slice().sort((a, b) => b.v - a.v);
    if (persona === 'loyal') order = crew.slice().sort((a, b) => (S.paidMe[seat][b.owner] - S.paidMe[seat][a.owner]) || (b.v - a.v));
    let dice = kept.slice(0, n);                             // best dice go out
    if (persona === 'betrayer' && last) dice = kept.slice(kept.length - n); // ...except the betrayer on the last job
    if (persona === 'shark') { dice.forEach((d) => { assign[d.id] = order[0].id; }); return assign; } // everything to one person
    dice.forEach((d, i) => { assign[d.id] = order[Math.min(i, order.length - 1)].id; });
    return assign;
  }

  // ----------------------------------------------------------------- winning
  // Rulebook: highest total wins. If players are tied, the one who scored more on job 3 wins;
  // if still tied, they share the win. The same tie-break orders every other place too.
  // totals[i] = final score, job3[i] = points scored on job 3. Returns rows best first:
  // { seat, total, job3, rank (1 = winner; shared ranks repeat), win, tied (total tied with someone), shared (still tied after job 3) }.
  function standings(totals, job3) {
    const rows = totals.map((total, seat) => ({ seat, total, job3: job3[seat] || 0 }));
    rows.sort((a, b) => (b.total - a.total) || (b.job3 - a.job3) || (a.seat - b.seat));
    for (const r of rows) {
      r.rank = 1 + rows.filter((o) => o.total > r.total || (o.total === r.total && o.job3 > r.job3)).length;
      r.win = r.rank === 1;
      r.tied = rows.some((o) => o !== r && o.total === r.total);
      r.shared = rows.some((o) => o !== r && o.total === r.total && o.job3 === r.job3);
    }
    return rows;
  }

  // ----------------------------------------------------------------- game
  class Game {
    constructor(players, opts) {
      opts = opts || {};
      const N = players.length;
      if (N < 3 || N > 6) throw new Error('3 to 6 players');
      let pi = 0;
      this.state = {
        N,
        players: players.map((p, i) => ({ name: p.name, bot: !!p.bot, persona: p.bot ? (p.persona || PERSONAS[(i + Math.floor(Math.random() * 5)) % PERSONAS.length]) : null })),
        job: 0, phase: 'lobby', scores: new Array(N).fill(0),
        hands: [], kitchens: [], kept: [], crews: [], selfCrew: [], pays: [], crewDone: [], payDone: [],
        startSeat: opts.startSeat != null ? opts.startSeat : Math.floor(Math.random() * N),
        turnOrder: [], turnIdx: 0, turnStart: 0, timer: opts.timer || 0,
        trust: Array.from({ length: N }, () => new Array(N).fill(0)),
        paidMe: Array.from({ length: N }, () => new Array(N).fill(0)),
        leader: -1, log: [], chat: [], summary: null, history: [], seq: 0,
      };
      this._dieSeq = 0;
      // optional fixed rolls, used by the tutorial: deal[job][seat] = array of die values. Anything missing is rolled.
      this.deal = Array.isArray(opts.deal) ? opts.deal : null;
    }

    get S() { return this.state; }
    log(msg) { this.S.log.push({ job: this.S.job + 1, msg }); if (this.S.log.length > 200) this.S.log.shift(); }
    touch() { this.S.seq++; }

    start() {
      this.S.job = 0;
      this.beginJob();
    }

    beginJob() {
      const S = this.S, job = JOBS[S.job];
      S.hands = []; S.kitchens = []; S.kept = []; S.crews = []; S.selfCrew = []; S.pays = []; S.crewDone = []; S.payDone = []; S.summary = null;
      for (let i = 0; i < S.N; i++) {
        const h = [];
        const fixed = this.deal && this.deal[S.job] && this.deal[S.job][i];
        for (let k = 0; k < job.roll; k++) {
          const fv = fixed && fixed[k];
          h.push({ id: 'd' + (this._dieSeq++), v: fv >= 1 && fv <= 6 ? fv | 0 : d6(), owner: i });
        }
        h.sort((a, b) => b.v - a.v);
        S.hands.push(h); S.kitchens.push([]); S.kept.push([]); S.crews.push([]); S.pays.push({}); S.crewDone.push(false); S.payDone.push(false);
      }
      S.turnOrder = [];
      for (let k = 0; k < S.N; k++) S.turnOrder.push((S.startSeat + S.job + k) % S.N);
      S.turnIdx = 0;
      S.leader = S.scores.indexOf(Math.max(...S.scores));
      S.phase = 'send';
      S.turnStart = Date.now();
      this.log('Job ' + (S.job + 1) + ' — everyone rolls ' + job.roll + '. ' + S.players[S.turnOrder[0]].name + ' sends first.');
      this.touch();
    }

    currentSender() { const S = this.S; return S.phase === 'send' ? S.turnOrder[S.turnIdx] : -1; }

    // ----- actions
    act(seat, a) {
      const S = this.S;
      try {
        if (!a || typeof a !== 'object') return { ok: false, error: 'Bad action' };
        if (a.type === 'chat') return this.chat(seat, a.text);
        if (S.phase === 'send' && a.type === 'send') return this.doSend(seat, a.assign);
        if (S.phase === 'crew' && a.type === 'crew') return this.doCrew(seat, a.dieIds);
        if (S.phase === 'pay' && a.type === 'pay') return this.doPay(seat, a.assign);
        if (S.phase === 'summary' && a.type === 'next') return this.doNext(seat);
        return { ok: false, error: 'Not now' };
      } catch (e) { return { ok: false, error: e.message || String(e) }; }
    }

    chat(seat, text) {
      text = String(text || '').slice(0, 200).trim();
      if (!text) return { ok: false, error: 'Empty' };
      this.S.chat.push({ seat, text, t: Date.now() });
      if (this.S.chat.length > 120) this.S.chat.shift();
      this.touch();
      return { ok: true };
    }

    doSend(seat, assign) {
      const S = this.S, job = JOBS[S.job];
      if (this.currentSender() !== seat) return { ok: false, error: 'Not your turn to send' };
      if (!Array.isArray(assign) || assign.length !== job.send) return { ok: false, error: 'Send exactly ' + job.send + ' dice' };
      const hand = S.hands[seat];
      const ids = new Set();
      for (const x of assign) {
        if (!x || ids.has(x.dieId)) return { ok: false, error: 'Each die once' };
        ids.add(x.dieId);
        if (!hand.some((d) => d.id === x.dieId)) return { ok: false, error: 'That die is not yours' };
        const to = x.to | 0;
        if (to === seat || to < 0 || to >= S.N) return { ok: false, error: 'Send to a rival' };
      }
      const counts = {};
      for (const x of assign) {
        const idx = hand.findIndex((d) => d.id === x.dieId);
        const d = hand.splice(idx, 1)[0];
        S.kitchens[x.to].push({ id: d.id, v: d.v, owner: seat });
        counts[x.to] = (counts[x.to] || 0) + 1;
      }
      this.log(S.players[seat].name + ' sends ' + Object.keys(counts).map((j) => counts[j] + ' to ' + S.players[j].name).join(', ') + '.');
      S.turnIdx++;
      if (S.turnIdx >= S.N) {
        for (let i = 0; i < S.N; i++) S.kept[i] = S.hands[i].slice();
        S.phase = 'crew';
        // frozen out: nobody sent you anything, so you run the job with your own people —
        // one of each kind from your kept dice, by the usual crew rules. You pay no one; your own cut works as usual.
        for (let i = 0; i < S.N; i++) if (!S.kitchens[i].length) { S.crews[i] = bestCrew(S.kept[i]); S.selfCrew[i] = true; S.crewDone[i] = true; this.log('Nobody showed up for ' + S.players[i].name + ' — they run it with their own people.'); }
        this.log('Everyone picks a crew.');
      }
      S.turnStart = Date.now();
      this.touch();
      return { ok: true };
    }

    doCrew(seat, dieIds) {
      const S = this.S;
      if (S.crewDone[seat]) return { ok: false, error: 'Already chosen' };
      const kitchen = S.kitchens[seat];
      dieIds = Array.isArray(dieIds) ? dieIds : [];
      const chosen = [];
      const seen = new Set();
      for (const id of dieIds) {
        const d = kitchen.find((x) => x.id === id);
        if (!d) return { ok: false, error: 'That die was not sent to you' };
        const b = band(d.v);
        if (seen.has(b)) return { ok: false, error: 'Only one ' + BANDS[b].toLowerCase() };
        seen.add(b); chosen.push(d);
      }
      for (let b = 0; b < 3; b++) if (!seen.has(b) && kitchen.some((d) => band(d.v) === b)) return { ok: false, error: 'You need a ' + BANDS[b].toLowerCase() + ' — one was sent to you' };
      S.crews[seat] = chosen;
      S.crewDone[seat] = true;
      if (S.crewDone.every(Boolean)) {
        S.phase = 'pay';
        for (let i = 0; i < S.N; i++) if (!S.crews[i].length || S.selfCrew[i]) S.payDone[i] = true;
        this.log('Everyone hands out the cuts.');
      }
      S.turnStart = Date.now();
      this.touch();
      return { ok: true };
    }

    handOut(seat) { const S = this.S; return S.crews[seat].length && !S.selfCrew[seat] ? Math.min(JOBS[S.job].pay, S.kept[seat].length) : 0; }

    doPay(seat, assign) {
      const S = this.S;
      if (S.payDone[seat]) return { ok: false, error: 'Already paid' };
      assign = assign && typeof assign === 'object' ? assign : {};
      const kept = S.kept[seat], crew = S.crews[seat];
      const need = this.handOut(seat);
      const keys = Object.keys(assign);
      if (keys.length !== need) return { ok: false, error: 'Hand out exactly ' + need + (need === 1 ? ' die' : ' dice') };
      for (const k of keys) {
        if (!kept.some((d) => d.id === k)) return { ok: false, error: 'That die is not in your hand' };
        if (!crew.some((d) => d.id === assign[k])) return { ok: false, error: 'Cuts go to your crew' };
      }
      S.pays[seat] = Object.assign({}, assign);
      S.payDone[seat] = true;
      if (S.payDone.every(Boolean)) this.resolve();
      this.touch();
      return { ok: true };
    }

    resolve() {
      const S = this.S, job = JOBS[S.job], last = S.job === JOBS.length - 1;
      const summary = [];
      const before = S.scores.slice();
      const paidThis = Array.from({ length: S.N }, () => new Array(S.N).fill(0));
      for (let i = 0; i < S.N; i++) {
        const crew = S.crews[i], kept = S.kept[i], pays = S.pays[i];
        const crewPts = sum(crew.map((d) => d.v)) * (last ? 2 : 1);
        const given = {};
        let paidOut = 0;
        for (const kid of Object.keys(pays)) {
          const kd = kept.find((d) => d.id === kid), cd = crew.find((d) => d.id === pays[kid]);
          given[cd.owner] = (given[cd.owner] || 0) + kd.v;
          paidThis[i][cd.owner] += kd.v;
          paidOut += kd.v;
        }
        const self = !!S.selfCrew[i];
        // frozen-out hosts still take their own cut on jobs 1 and 2: the best kept die their crew didn't use
        const rest = self ? kept.filter((d) => !crew.some((c) => c.id === d.id)).map((d) => d.v) : [];
        const own = self ? (job.spare && rest.length ? Math.max(...rest) : 0) : sum(kept.filter((d) => !(d.id in pays)).map((d) => d.v));
        S.scores[i] += crewPts + own;
        for (const o of Object.keys(given)) S.scores[o] += given[o];
        const stiffed = crew.filter((d) => d.owner !== i && !(d.owner in given)).map((d) => d.owner);
        summary.push({ seat: i, crew: crew.map((d) => ({ v: d.v, owner: d.owner, paid: given[d.owner] || 0 })), crewPts, own, given, stiffed, paidOut, noCrew: !crew.length, selfCrew: self });
        // reputation: compare what each sender got to what they might have
        for (const d of crew) {
          if (d.owner === i) continue;
          const got = given[d.owner] || 0;
          const could = kept.length ? Math.max(...kept.map((x) => x.v)) : 0;
          const delta = got >= could ? 1 : got > 0 ? 0.3 : -1;
          S.trust[d.owner][i] = Math.max(-2, Math.min(2, S.trust[d.owner][i] + delta));
          S.paidMe[d.owner][i] += got;
        }
      }
      const gained = S.scores.map((x, i) => x - before[i]);
      S.summary = { job: S.job + 1, last, hosts: summary, scores: S.scores.slice(), gained };
      if (last) S.summary.standings = standings(S.scores, gained);
      S.history.push(S.summary);
      S.phase = last ? 'over' : 'summary';
      this.log(last ? 'That was the last job.' : 'Job ' + (S.job + 1) + ' is done.');
    }

    doNext(seat) {
      const S = this.S;
      if (S.phase !== 'summary') return { ok: false, error: 'Not now' };
      S.job++;
      this.beginJob();
      return { ok: true };
    }

    // ----- bots: perform whatever the bots can do right now; returns true if anything happened
    botStep() {
      const S = this.S;
      let did = false;
      if (S.phase === 'send') {
        const cur = this.currentSender();
        if (cur >= 0 && S.players[cur].bot) { this.doSend(cur, botSend(this, cur)); did = true; }
      } else if (S.phase === 'crew') {
        for (let i = 0; i < S.N; i++) if (S.players[i].bot && !S.crewDone[i]) { this.doCrew(i, botCrew(this, i)); did = true; }
      } else if (S.phase === 'pay') {
        for (let i = 0; i < S.N; i++) if (S.players[i].bot && !S.payDone[i]) { this.doPay(i, botPay(this, i)); did = true; }
      }
      return did;
    }

    // ----- timer: auto-send for a human whose clock ran out
    forceSend(seat) {
      const S = this.S, job = JOBS[S.job];
      if (this.currentSender() !== seat) return;
      const rivals = [...Array(S.N).keys()].filter((j) => j !== seat);
      const hand = S.hands[seat].slice(0, job.send);
      const assign = hand.map((d, k) => ({ dieId: d.id, to: rivals[k % rivals.length] }));
      this.log(S.players[seat].name + ' ran out of time.');
      this.doSend(seat, assign);
    }

    // ----- what one seat is allowed to see
    view(seat) {
      const S = this.S;
      const pays = S.pays.map((p, i) => (S.phase === 'pay' && i !== seat ? null : p));
      return {
        me: seat, N: S.N, players: S.players.map((p) => ({ name: p.name, bot: p.bot })),
        job: S.job, jobs: JOBS, phase: S.phase, scores: S.scores, hands: S.hands, kitchens: S.kitchens,
        kept: S.kept, crews: S.crews, selfCrew: S.selfCrew, pays, crewDone: S.crewDone, payDone: S.payDone,
        turnOrder: S.turnOrder, turnIdx: S.turnIdx, sender: this.currentSender(), turnStart: S.turnStart, timer: S.timer,
        leader: S.leader, log: S.log.slice(-40), chat: S.chat.slice(-60), summary: S.summary, history: S.history, seq: S.seq,
        handOut: S.phase === 'pay' ? this.handOut(seat) : 0,
      };
    }
  }

  const api = { Game, JOBS, BANDS, band, bestCrew, standings, BOT_NAMES, PERSONAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TMC = api;
})(typeof window !== 'undefined' ? window : globalThis);
