/* Day One — rules engine and bots. Runs in the browser (window.DayOne) and in node
   (module.exports), so bot-only games can be checked headless: node sim.js
   The rules are the printed 6 × 7 "Day One sea" with the default settings: fill to 2, collect 1,
   one surge per turn, free movement, earth recycles to the supply, offerings land on the receiver's
   island and score 1 favour for the giver. Nothing is hidden, so every seat gets the same view. */
(function (root) {
  'use strict';

  /* ---------------- constants ---------------- */
  const R = 34, S3 = Math.sqrt(3);   // roomy hexes: corner peaks sit where three spaces meet
  const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const ELEM = [
    { name: 'Fire', col: '#d4532b', edge: '#8e2e12', txt: '#ffffff' },
    { name: 'Forest', col: '#3e8e4e', edge: '#22582d', txt: '#ffffff' },
    { name: 'Shore', col: '#e9c66b', edge: '#a9862c', txt: '#1a1a1a' },
    { name: 'Reef', col: '#ec8fa4', edge: '#b0566c', txt: '#1a1a1a' },
    { name: 'Stone', col: '#5d6474', edge: '#2a2d35', txt: '#ffffff' },
  ];
  const PCOL = [
    { name: 'Indigo', col: '#3d55b3', edge: '#1f2d6b' }, { name: 'Crimson', col: '#a8243a', edge: '#5c0f1d' }, { name: 'Violet', col: '#8a54b8', edge: '#4e2a72' },
    { name: 'Ochre', col: '#c8862a', edge: '#7a4d10' }, { name: 'Ink', col: '#263238', edge: '#0b1013' },
  ];
  const ELEM_VAL = 10, MTN_VAL = 3;
  const CORE = 5;          // disc colour of a fallen star
  const NEU = 9;           // owner value of an elder altar
  const NEL = ELEM.length;
  const BOT_NAMES = ['Tide', 'Gale', 'Ash', 'Dawn', 'Ember'];
  const SHRINES = { 2: 7, 3: 6, 4: 5, 5: 4 };
  const TIGHT_SUPPLY = { 2: 7, 3: 8, 4: 10, 5: 10 };   // recycled pool: collected discs go back to it
  const TIGHT = { mountains: [[14, 19, 20], [26, 31, 32], [18, 24, 25], [16, 17, 22], [6, 12, 13], [2, 3, 8], [4, 5, 10], [29, 34, 35], [30, 36, 37], [33, 39, 40]],
    pearls: [3, 4, 10, 12, 16, 17, 19, 20, 22, 24, 28, 35, 36, 41], starts: { 2: [0, 15], 3: [0, 15, 27], 4: [0, 15, 27, 38], 5: [0, 15, 27, 38, 7] }, startNums: [0, 15, 27, 38, 7],
    neutral: { 2: [27, 7], 3: [7], 4: [7], 5: [] },
    zone: [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 30, 31, 32, 33], zoneFor: [2, 3] };   // 2–3 gods play inside the inner zone
  const RULES = { fill: 2, capture: 1, relay: 1, giftPts: true, islandOffer: true, recycle: true };
  const TM = 34;           // width of the sun's-path frame around the map
  const COLS = 'ABCDEFGHIJKLMN';

  /* ---------------- geometry (the printed 6 × 7 board) ---------------- */
  const W = 6, H = 7, cells = [], at = {};
  for (let row = 0; row < H; row++) for (let col = 0; col < W; col++) {
    const q = col - ((row - (row & 1)) >> 1), r = row, i = cells.length;
    cells.push({ i, q, r, col, row, x: R * S3 * (col + 0.5 * (row & 1)) + R * S3 / 2 + 8 + TM, y: R * 1.5 * row + R + 8 + TM });
    at[q + ',' + r] = i;
  }
  const N = cells.length;
  const nb = cells.map((c) => DIRS.map(([dq, dr]) => at[(c.q + dq) + ',' + (c.r + dr)]));
  const nbl = nb.map((a) => a.filter((x) => x !== undefined));
  const VBW = R * S3 * (W + 0.5) + 16 + 2 * TM, VBH = R * 1.5 * (H - 1) + 2 * R + 16 + 2 * TM;
  const coord = (i) => { const c = cells[i]; return COLS[c.col] + (c.row + 1); };

  /* ---------------- rng ---------------- */
  function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------------- context: the board and settings of the game being looked at ---------------- */
  let BOARD = null, CFG = null;
  function bind(board, cfg) { BOARD = board; CFG = cfg; }

  /* ---------------- board ---------------- */
  function makeBoard(P, seed) {   // the printed board: fixed peaks, star spots and start spaces
    const rand = mulberry(seed * 7919 + P * 13 + 3), zoned = TIGHT.zoneFor.includes(P), inZ = new Set(TIGHT.zone);
    const planet = Array(N).fill(0);
    const out = Array(N).fill(false); if (zoned) for (let i = 0; i < N; i++) if (!inZ.has(i)) { planet[i] = 2; out[i] = true; }
    const planetVal = {};
    const mtn = {}; TIGHT.mountains.forEach((t, j) => { if (zoned && !t.every((c) => inZ.has(c))) return; mtn[100 + j] = t.slice(); planetVal[100 + j] = MTN_VAL; });
    const neutral = (TIGHT.neutral[P] || []).slice();   // elder altars sit on the start spaces nobody uses
    const spots = TIGHT.pearls.filter((i) => (!zoned || inZ.has(i)) && !neutral.includes(i)); const vals = shuffle(spots.map((_, k) => 1 + (k % 3)), rand);
    return { seed, zoned, out, planet, planetVal, mtn, starts: TIGHT.starts[P].slice(), neutral, cores: spots.map((c, k) => [c, vals[k]]) };
  }

  /* ---------------- state ---------------- */
  function newState(P, board, cfg) {
    const st = Array.from({ length: N }, () => []);
    board.cores.forEach(([i, v]) => st[i].push({ c: CORE, v }));
    const owner = Array(N).fill(-1); board.starts.forEach((i, q) => { owner[i] = q; }); (board.neutral || []).forEach((i) => { owner[i] = NEU; });
    return { P, st, owner, cat: Array(N).fill(0), supply: Array(NEL).fill(cfg.perElement),
      hangar: Array.from({ length: P }, () => Array(NEL).fill(0)), cores: Array(P).fill(0), caps: Array(P).fill(0), gifted: Array(P).fill(0), planted: Array(P).fill(1),
      sealed: {}, giftPts: Array(P).fill(0), ship: board.starts.slice(0, P), outs: board.starts.slice(0, P).map((i) => [i]), cur: 0, round: 1, turns: 0, over: false, endReason: '', ender: -1 };
  }
  function clone(s) {
    return Object.assign({}, s, { st: s.st.map((a) => a.slice()), owner: s.owner.slice(), cat: s.cat.slice(), supply: s.supply.slice(),
      hangar: s.hangar.map((h) => h.slice()), cores: s.cores.slice(), caps: s.caps.slice(), gifted: s.gifted.slice(), giftPts: (s.giftPts || Array(s.P).fill(0)).slice(), planted: s.planted.slice(), sealed: Object.assign({}, s.sealed), ship: s.ship.slice(), outs: s.outs.map((a) => a.slice()) });
  }

  /* ---------------- rules ---------------- */
  // gather next to your god (it stands on your newest shrine); if it can't travel from there, from any of your shrines
  function launchSectors(s, p) {
    if (s.ship[p] < 0) { const home = BOARD.starts[p]; return s.owner[home] < 0 ? [home] : []; }
    const launchable = (o) => { const k = Math.max(1, CFG.fill - s.st[o].length); return s.supply.some((x) => x >= k) && canFly(o, s.st[o].length + k + 1, new Set([o]), s); };
    if (launchable(s.ship[p])) return [s.ship[p]];
    return s.outs[p].filter(launchable);
  }
  const fillAmount = (s, o) => Math.max(1, CFG.fill - s.st[o].length);
  // every path of cnt steps from `from` that never enters a closed space or the same space twice (sampled when there are many)
  function freePaths(from, cnt, cap, avoid, s, noEnd) {
    const all = [];
    const ok = (x, vis, depth) => !vis.has(x) && !BOARD.planet[x] && (depth < cnt - 1 || (s.owner[x] < 0 && !(noEnd && noEnd.has(x))));
    if (cnt <= 4) {
      const vis = new Set([from, ...avoid]), pth = [];
      const dfs = (c) => { if (pth.length === cnt) { all.push(pth.slice()); return; } for (const x of nbl[c]) { if (!ok(x, vis, pth.length)) continue; vis.add(x); pth.push(x); dfs(x); pth.pop(); vis.delete(x); } };
      dfs(from);
      if (cap && all.length > cap) { shuffle(all, Math.random); all.length = cap; }
      return all;
    }
    const seen = new Set();
    for (let t = 0; t < cap * 4 && all.length < cap; t++) {
      const vis = new Set([from, ...avoid]), pth = []; let budget = 3000;
      const go = (c) => { if (pth.length === cnt) return true; if (--budget < 0) return false; for (const x of shuffle(nbl[c].filter((y) => ok(y, vis, pth.length)), Math.random)) { vis.add(x); pth.push(x); if (go(x)) return true; pth.pop(); vis.delete(x); } return false; };
      if (go(from)) { const k = pth.join('-'); if (!seen.has(k)) { seen.add(k); all.push(pth.slice()); } } else break;
    }
    return all;
  }
  // is there a path of cnt more steps from `from`, avoiding vis and closed spaces, whose last step is an unclaimed space?
  // (searches are capped so a long chain on a crowded board can never stall the page)
  let FLY_BUDGET = 0;
  function canFly(from, cnt, vis, s, noEnd) { FLY_BUDGET = 40000; return canFlyRec(from, cnt, vis, s, noEnd); }
  function canFlyRec(from, cnt, vis, s, noEnd) {
    if (cnt === 0) return true;
    if (--FLY_BUDGET < 0) return false;
    for (const x of nbl[from]) { if (vis.has(x) || BOARD.planet[x] || (cnt === 1 && (s.owner[x] >= 0 || (noEnd && noEnd.has(x))))) continue; vis.add(x); const ok = canFlyRec(x, cnt - 1, vis, s, noEnd); vis.delete(x); if (ok) return true; }
    return false;
  }
  function canLaunch(s, p) {
    return launchSectors(s, p).some((o) => { const k = fillAmount(s, o); return s.supply.some((x) => x >= k) && canFly(o, s.st[o].length + k + 1, new Set([o]), s); });
  }
  // every route for a stack of n items (discs + the god on top) from origin, with surge landings
  function routes(s, origin, n) {
    const out = [];
    const blk = (x) => s.owner[x] >= 0;
    const rec = (from, cnt, Hm, segs, relays, seen, refill, req) => {
      const sigs = new Set(); let made = 0;
      const cands = freePaths(from, cnt, relays ? 12 : 120, seen, s).map((path) => ({ path }));
      for (const b of cands) {
        const sig = b.path.join('-'); if (sigs.has(sig)) continue; sigs.add(sig);
        const H2 = new Map(Hm); H2.set(from, 0);
        b.path.forEach((x, j) => { if (j < b.path.length - 1 && s.owner[x] < 0) H2.set(x, (H2.has(x) ? H2.get(x) : s.st[x].length) + 1); });
        const hg2 = (x) => (H2.has(x) ? H2.get(x) : s.st[x].length);
        const segs2 = segs.concat([{ from, path: b.path }]);
        const last = b.path[b.path.length - 1];
        let req2 = req;
        const inStack = [...new Set(s.st[last].filter((d) => d.c !== CORE).map((d) => d.c))];
        if (relays < CFG.relay && s.owner[last] < 0 && hg2(last) >= 2 && last !== origin && inStack.length) {   // surges only for a land already in the stack
          const left = hg2(last) - 1, k2 = 1;
          const got = rec(last, left + k2 + 1, H2, segs2, relays + 1, new Set([...seen, ...b.path]), refill + k2, req.concat([{ in: inStack }])); made += got; if (got) req2 = req.concat([{ nin: inStack }]);
        }
        if (blk(last)) continue;   // the god must come to rest on an unclaimed space
        const drops = segs2.reduce((a, g) => a + g.path.length, 0);
        out.push({ segs: segs2, final: last, target: last, drops, refill, req: req2 }); made++;
      }
      return made;
    };
    rec(origin, n, new Map(), [], 0, new Set([origin]), 0, []);
    return out;
  }
  const reqOk = (r, c) => !r.req || r.req.every((x) => (x.in ? x.in.includes(c) : x.nin ? !x.nin.includes(c) : x.eq !== undefined ? x.eq === c : x.ne !== c));
  function allMoves(s, p) {
    const out = [];
    for (const o of launchSectors(s, p)) {
      const k = fillAmount(s, o); const cols = ELEM.map((_, c) => c).filter((c) => s.supply[c] >= k); if (!cols.length) continue;
      for (const r of routes(s, o, s.st[o].length + k + 1)) for (const c of cols) if (s.supply[c] >= k + r.refill && reqOk(r, c)) out.push(Object.assign({}, r, { o, k, c }));
    }
    return out;
  }
  function collect(ns, p, d) {   // stars are kept; earth moves your track up 1 and goes back to the supply
    if (d.c === CORE) { ns.cores[p] += d.v; return; }
    if (CFG.recycle) { ns.hangar[p][d.c] = Math.min(25, ns.hangar[p][d.c] + 1); ns.supply[d.c]++; } else ns.hangar[p][d.c]++;   // tracks stop at 25
  }
  function offerDisc(ns, x, d, o) {
    if (o === NEU) { if (d.c !== CORE) ns.st[x].push(d); return true; }   // an elder altar: earth stays on top of it, a star goes back to the box
    if (d.c === CORE) { ns.cores[o] += d.v; return true; }                // a star goes straight to the shrine's owner
    if (!CFG.islandOffer) { ns.hangar[o][d.c]++; return true; }
    ns.st[x].push(d);   // the offering lands on top of the shrine
    if (CFG.recycle) { ns.hangar[o][d.c] = Math.min(25, ns.hangar[o][d.c] + 1); return true; }   // the owner moves their track
    if (ns.supply[d.c] > 0) { ns.supply[d.c]--; ns.hangar[o][d.c]++; return true; }
    return false;
  }
  // walk one segment: the stack's discs drop bottom-first, the god comes to rest on the last space
  function flySeg(ns, p, g, relay, steps, c, captured) {
    if (relay) {   // surge: collect the top disc, add 1 of your land
      const d = ns.st[g.from].pop(); captured.push(d); ns.caps[p]++;
      collect(ns, p, d);
      if (steps) steps.push({ t: 'capture', i: g.from, d });
      const k2 = 1;
      for (let j = 0; j < k2; j++) ns.st[g.from].push({ c }); ns.supply[c] -= k2;
      if (steps) steps.push({ t: 'add', i: g.from, c, k: k2 });
    }
    const hand = ns.st[g.from]; ns.st[g.from] = []; if (ns.owner[g.from] >= 0) ns.cat[g.from] = 0; let gifts = 0;
    if (steps) steps.push({ t: 'lift', i: g.from, relay });
    g.path.forEach((x, j) => {
      if (j === g.path.length - 1) { if (steps) steps.push({ t: 'move', i: x }); return; }
      const d = hand[j], o = ns.owner[x];
      if (o >= 0 && o !== p) { gifts++; if (o !== NEU) ns.gifted[o]++; if (CFG.giftPts) ns.giftPts[p]++; const took = offerDisc(ns, x, d, o); if (steps) steps.push({ t: 'gift', i: x, d, to: o, took }); }
      else { ns.st[x].push(d); if (steps) steps.push({ t: 'drop', i: x, d }); }
    });
    return gifts;
  }
  function applyMove(s, p, m, wantSteps) {
    const ns = clone(s); const steps = wantSteps ? [] : null; let gifts = 0, pulled = null; const seals = [];
    for (let j = 0; j < m.k; j++) ns.st[m.o].push({ c: m.c });
    ns.supply[m.c] -= m.k;
    if (steps) steps.push({ t: 'add', i: m.o, c: m.c, k: m.k });
    const captured = [];
    m.segs.forEach((g, k) => { gifts += flySeg(ns, p, g, k > 0, steps, m.c, captured); });
    if (m.target !== null) {
      const T = m.target;
      for (let n = 0; n < CFG.capture && ns.st[T].length; n++) {
        const d = ns.st[T].pop(); captured.push(d); ns.caps[p]++;
        collect(ns, p, d);
        if (steps) steps.push({ t: 'capture', i: T, d });
      }
      if (CFG.outposts && ns.outs[p].length >= CFG.outposts) {   // out of shrines: move one of yours (its stack stays behind)
        const pull = m.pull !== undefined && m.pull !== null ? m.pull : pickPull(ns, p);
        ns.owner[pull] = -1; ns.outs[p] = ns.outs[p].filter((x) => x !== pull); pulled = pull;
        if (steps) steps.push({ t: 'pull', i: pull, p });
      }
      ns.owner[T] = p; ns.cat[T] = ns.st[T].length; ns.planted[p]++; ns.ship[p] = T; ns.outs[p] = ns.outs[p].concat([T]);
      if (steps) steps.push({ t: 'claim', i: T, p });
      for (const pi of mtnsAt(T)) if (!(pi in ns.sealed) && orbit(pi).every((x) => ns.owner[x] >= 0)) {   // all its spaces hold shrines: named
        const w = orbitLeader(ns, pi); ns.sealed[pi] = w; seals.push({ i: pi, w });
        if (steps) steps.push({ t: 'seal', i: pi, w });
      }
    }
    return { ns, steps, gifts, captured, seals, pulled };
  }
  // quick default for which shrine to move: one not touching an unnamed peak, oldest first
  function pickPull(s, p) {
    const nearOpen = (o) => nbl[o].some((x) => BOARD.planet[x] === 1 && !(x in s.sealed)) || mtnsAt(o).some((k) => !(k in s.sealed));
    const c = s.outs[p].find((o) => !nearOpen(o)); return c !== undefined ? c : s.outs[p][0];
  }
  // a peak's spaces: the three around it. Named the moment all hold shrines.
  const orbit = (i) => (BOARD.mtn && BOARD.mtn[i]) || nbl[i].filter((x) => !BOARD.planet[x]);
  const mtnsAt = (x) => (BOARD.mtn ? Object.keys(BOARD.mtn).map(Number).filter((k) => BOARD.mtn[k].includes(x)) : []);
  const peakKeys = () => Object.keys(BOARD.planetVal).map(Number).filter((k) => (BOARD.mtn && BOARD.mtn[k]) || BOARD.planet[k] === 1);
  const pkName = (k) => (BOARD.mtn && BOARD.mtn[k] ? 'peak at ' + BOARD.mtn[k].map(coord).join('/') : 'peak ' + coord(k));
  function orbitCounts(s, i) { const cnt = Array(s.P).fill(0); orbit(i).forEach((x) => { if (s.owner[x] >= 0 && s.owner[x] < s.P) cnt[s.owner[x]]++; }); return cnt; }
  function orbitLeader(s, i) { const cnt = orbitCounts(s, i), mx = Math.max(...cnt); return mx > 0 && cnt.filter((v) => v === mx).length === 1 ? cnt.indexOf(mx) : -2; }
  function score(s) {
    const P = s.P, el = Array(P).fill(0), pl = Array(P).fill(0), leaders = [];
    for (let k = 0; k < NEL; k++) {
      const v = s.hangar.map((h) => h[k] || 0);
      const vals = [...new Set(v.filter((x) => x > 0))].sort((a, b) => b - a);
      const lead = { first: [], second: [] };
      if (vals.length) {
        const f = v.map((x, q) => (x === vals[0] ? q : -1)).filter((q) => q >= 0);
        if (f.length > 1) { f.forEach((q) => { el[q] += ELEM_VAL / 2; }); lead.second = f; }   // tied for most: 5 each
        else {
          el[f[0]] += ELEM_VAL; lead.first = f;
          if (vals.length > 1) { const sc = v.map((x, q) => (x === vals[1] ? q : -1)).filter((q) => q >= 0); if (sc.length === 1) { el[sc[0]] += ELEM_VAL / 2; lead.second = sc; } }   // clear second place: 5
        }
      }
      leaders.push(lead);
    }
    const planetWinner = {};
    for (const i of peakKeys()) {
      if (i in s.sealed) { const w = s.sealed[i]; if (w >= 0) pl[w] += BOARD.planetVal[i]; planetWinner[i] = { sealed: true, w }; }
      else { const cnt = orbitCounts(s, i), mx = Math.max(...cnt), w = mx === 0 ? -1 : orbitLeader(s, i); planetWinner[i] = { sealed: false, w }; if (w >= 0) pl[w] += BOARD.planetVal[i]; }
    }
    const gp = s.giftPts ? s.giftPts.slice() : Array(P).fill(0);
    const total = el.map((x, q) => x + pl[q] + s.cores[q] + gp[q]);
    return { el, pl, gp, total, leaders, planetWinner };
  }

  /* ---------------- bots (as in the original: one-ply search with a look at the next god's best reply) ---------------- */
  function evalFor(ns, p) {
    const t = score(ns).total.map((v, q) => v + 0.01 * ns.caps[q]);
    let opp = -Infinity; for (let q = 0; q < ns.P; q++) if (q !== p) opp = Math.max(opp, t[q]);
    return t[p] - opp;
  }
  function botChoose(s, p) {
    const ms = allMoves(s, p); if (!ms.length) return null;
    const sc = ms.map((m) => { const ns = applyMove(s, p, m, false).ns; return { m, ns, v: evalFor(ns, p) + Math.random() * 0.01 }; });
    sc.sort((a, b) => b.v - a.v);
    const q = (p + 1) % s.P; let best = sc[0].m, bv = -Infinity;
    for (const c of sc.slice(0, 4)) {
      let rep = allMoves(c.ns, q), t = c.v;
      if (rep.length) {
        if (rep.length > 30) rep = shuffle(rep.slice(), Math.random).slice(0, 30);
        let worst = c.v;
        for (const r of rep) worst = Math.min(worst, evalFor(applyMove(c.ns, q, r, false).ns, p));
        t = 0.4 * c.v + 0.6 * worst;
      }
      if (t > bv) { bv = t; best = c.m; }
    }
    if (CFG.outposts && s.outs[p].length >= CFG.outposts) {   // choose the shrine to move properly for the move actually played
      let pv = -Infinity, pick = null;
      for (const o of s.outs[p]) { const v = evalFor(applyMove(s, p, Object.assign({}, best, { pull: o }), false).ns, p); if (v > pv) { pv = v; pick = o; } }
      best = Object.assign({}, best, { pull: pick });
    }
    return best;
  }

  /* ---------------- a human walk, one tapped space at a time ---------------- */
  // Replays the spaces tapped so far. Returns the walk so far (F): its preview state D, phase
  // ('fly' | 'target' | 'pull' | 'done'), the spaces that can be tapped next, and an error if a tap was not allowed.
  function walk(s, p, o, c, clicks, pull) {
    const k = fillAmount(s, o);
    const D = clone(s); for (let j = 0; j < k; j++) D.st[o].push({ c }); D.supply[c] -= k;
    const F = { D, k, c, origin: o, segs: [], from: o, path: [], hand: D.st[o], cnt: 0, relays: 0, phase: 'fly', target: null, final: null, gifts: 0, drops: 0, opts: [], visited: new Set([o]), refill: 0, bonusCap: null, noEnd: null, pull: undefined, error: null };
    D.st[o] = []; if (D.owner[o] >= 0) D.cat[o] = 0; F.cnt = F.hand.length + 1;
    const blk = (x) => D.owner[x] >= 0;
    for (const x of clicks || []) {
      if (!freeNext(F, s, p).has(x)) { F.error = 'That step is not allowed.'; break; }
      if (F.phase === 'fly') {
        F.path.push(x); F.drops++; F.visited.add(x); const j = F.path.length - 1;
        if (j < F.hand.length) {
          const d = F.hand[j], ow = D.owner[x];
          if (ow >= 0 && ow !== p) { F.gifts++; if (ow !== NEU) D.gifted[ow]++; if (CFG.giftPts) D.giftPts[p]++; offerDisc(D, x, d, ow); }
          else D.st[x].push(d);
        } else {
          F.segs.push({ from: F.from, path: F.path }); F.final = x;
          const k2 = D.st[x].length >= 2 ? 1 : 0;
          if (F.relays < CFG.relay && D.owner[x] < 0 && D.st[x].length >= 2 && D.st[x].some((d) => d.c === c) && x !== o && D.supply[c] >= k2 && canFly(x, D.st[x].length - 1 + k2 + 1, new Set([...F.visited, x]), D)) {
            const d = D.st[x].pop(); F.bonusCap = d; D.caps[p]++; collect(D, p, d);
            for (let j2 = 0; j2 < k2; j2++) D.st[x].push({ c }); D.supply[c] -= k2; F.refill = k2;
            F.relays++; F.noEnd = null; F.visited.add(x); F.from = x; F.hand = D.st[x]; D.st[x] = []; F.cnt = F.hand.length + 1; F.path = [];
          } else if (!blk(x)) { F.target = x; F.phase = 'done'; }
          else { F.opts = nbl[x].filter((y) => !BOARD.planet[y] && !blk(y) && D.st[y].length > 0); F.phase = F.opts.length ? 'target' : 'done'; }
        }
      } else if (F.phase === 'target') { F.target = x; F.phase = 'done'; }
    }
    if (!F.error && F.phase === 'done' && CFG.outposts && s.outs[p].length >= CFG.outposts) {
      if (pull === undefined || pull === null) F.phase = 'pull';
      else if (!s.outs[p].includes(pull)) F.error = 'Pick one of your own shrines to move.';
      else F.pull = pull;
    }
    F.next = F.error ? [] : [...freeNext(F, s, p)];
    return F;
  }
  function freeNext(F, s, p) {
    if (F.phase === 'target') return new Set(F.opts);
    if (F.phase === 'pull') return new Set(s.outs[p]);
    if (F.phase !== 'fly') return new Set();
    const head = F.path.length ? F.path[F.path.length - 1] : F.from;
    const vis = new Set(F.visited), left = F.cnt - F.path.length - 1, out = new Set();
    for (const x of nbl[head]) { if (vis.has(x) || BOARD.planet[x] || (left === 0 && (F.D.owner[x] >= 0 || (F.noEnd && F.noEnd.has(x))))) continue; vis.add(x); if (canFly(x, left, vis, F.D, F.noEnd)) out.add(x); vis.delete(x); }
    return out;
  }
  const walkMove = (F) => ({ o: F.origin, k: F.k, c: F.c, segs: F.segs, final: F.final, target: F.target, drops: F.drops, pull: F.pull });
  // Fallback for the rare spot where the bot's route list comes up empty although a god can still walk
  // (a surge it cannot pay for: the human rules simply skip the surge). Searches the walks a human could
  // tap out and keeps the best one by the same evaluation the bots use.
  function botWalk(s, p) {
    let best = null, bv = -Infinity, leaves = 0;
    const consider = (F) => {
      leaves++;
      let m = walkMove(F);
      if (F.phase === 'pull') {
        let pv = -Infinity, pick = null;
        for (const o of s.outs[p]) { const v = evalFor(applyMove(s, p, Object.assign({}, m, { pull: o }), false).ns, p); if (v > pv) { pv = v; pick = o; } }
        m = Object.assign({}, m, { pull: pick });
      }
      const v = evalFor(applyMove(s, p, m, false).ns, p) + Math.random() * 0.01;
      if (v > bv) { bv = v; best = m; }
    };
    for (const o of pickable(s, p)) {
      const k = fillAmount(s, o);
      for (let c = 0; c < NEL; c++) {
        if (s.supply[c] < k) continue;
        const dfs = (clicks) => {
          if (leaves > 600) return;
          const F = walk(s, p, o, c, clicks, undefined);
          if (F.error) return;
          if (F.phase === 'done' || F.phase === 'pull') { consider(F); return; }
          for (const x of shuffle(F.next.slice(), Math.random)) dfs(clicks.concat([x]));
        };
        dfs([]);
      }
    }
    return best;
  }
  function pickable(s, p) {
    return launchSectors(s, p).filter((o) => { const k = fillAmount(s, o); return s.supply.some((x) => x >= k) && canFly(o, s.st[o].length + k + 1, new Set([o]), s); });
  }
  const discName = (d) => (d.c === CORE ? 'fallen star (' + d.v + ')' : ELEM[d.c].name);
  function finalResult(s) {
    const sc = score(s);
    const key = (q) => sc.total[q] * 1000 + s.caps[q];
    const order = Array.from({ length: s.P }, (_, q) => q).sort((a, b) => key(b) - key(a));
    const best = key(order[0]); const winners = order.filter((q) => key(q) === best);
    const tiebreak = order.length > 1 && sc.total[order[0]] === sc.total[order[1]] && winners.length === 1;
    return { order, winners, tiebreak, el: sc.el, pl: sc.pl, gp: sc.gp, total: sc.total, cores: s.cores.slice(), caps: s.caps.slice() };
  }

  /* ---------------- the game ---------------- */
  class Game {
    constructor(players, opts) {
      opts = opts || {};
      const P = players.length;
      this.players = players.map((p) => ({ name: p.name, bot: !!p.bot }));
      this.seed = +opts.seed || 1000 + Math.floor(Math.random() * 9000);
      this.cfg = Object.assign({}, RULES, { perElement: TIGHT_SUPPLY[P], outposts: SHRINES[P] });
      bind(null, this.cfg);
      this.board = makeBoard(P, this.seed);
      bind(this.board, this.cfg);
      this.s = newState(P, this.board, this.cfg);
      this.log = []; this.last = null; this.seq = 0;
      this.say('Day One begins: ' + P + ' gods, ' + this.cfg.perElement + ' discs of each land, ' + this.cfg.outposts + ' shrines each.');
      this.checkTurn();
    }
    ctx() { bind(this.board, this.cfg); }
    say(t) { this.log.push({ r: this.s ? this.s.round : 1, t }); if (this.log.length > 80) this.log.shift(); }
    over() { return this.s.over; }
    checkTurn() {
      const s = this.s, p = s.cur;
      if (!canLaunch(s, p)) { s.over = true; s.ender = p; s.endReason = 'cant'; this.say(this.players[p].name + ' cannot gather earth. Night falls.'); }
    }
    commit(m) {
      const s = this.s, p = s.cur, nm = this.players[p].name; const res = applyMove(s, p, m, true);
      const desc = nm + ' added ' + m.k + ' ' + ELEM[m.c].name + ' at ' + coord(m.o) + ' and walked ' + m.drops + ' space' + (m.drops === 1 ? '' : 's') +
        (m.segs.length > 1 ? ', surge at ' + coord(m.segs[1].from) : '') +
        (m.target !== null ? ', shrine on ' + coord(m.target) : ', nowhere to raise a shrine') + (res.pulled !== null ? ' (moved from ' + coord(res.pulled) + ')' : '') +
        (res.captured.length ? ', collected ' + res.captured.map(discName).join(' and ') : (m.target !== null ? ', collected nothing' : '')) + (res.gifts ? ', made ' + res.gifts + ' offering' + (res.gifts > 1 ? 's' : '') : '') + '.';
      this.last = { seq: ++this.seq, p, before: clone(s), steps: res.steps };
      this.s = res.ns; this.s.turns++;
      this.say(desc);
      for (const x of res.seals) this.say(x.w >= 0 ? this.players[x.w].name + ' names the ' + pkName(x.i) + ' (' + BOARD.planetVal[x.i] + ').' : 'The ' + pkName(x.i) + ' is ringed in a tie: nobody names it.');
      const ns = this.s; ns.cur = (ns.cur + 1) % ns.P; if (ns.cur === 0) ns.round++;
      this.checkTurn();
    }
    act(seat, a) {
      this.ctx(); a = a || {};
      const s = this.s;
      if (s.over) return { ok: false, error: 'Night has fallen.' };
      if (seat !== s.cur) return { ok: false, error: 'It is not your turn.' };
      if (a.type !== 'move') return { ok: false, error: 'Unknown action.' };
      const o = a.o | 0, c = a.c | 0;
      if (!pickable(s, seat).includes(o)) return { ok: false, error: 'Your god cannot start from there.' };
      if (c < 0 || c >= NEL || s.supply[c] < fillAmount(s, o)) return { ok: false, error: 'Not enough of that land left.' };
      const clicks = Array.isArray(a.clicks) ? a.clicks.map((x) => x | 0) : [];
      const F = walk(s, seat, o, c, clicks, a.pull === undefined || a.pull === null ? undefined : a.pull | 0);
      if (F.error) return { ok: false, error: F.error };
      if (F.phase !== 'done') return { ok: false, error: F.phase === 'pull' ? 'Pick a shrine to move first.' : 'Finish your walk first.' };
      this.commit(walkMove(F));
      return { ok: true };
    }
    botStep() {
      this.ctx();
      const s = this.s; if (s.over) return false;
      const p = s.cur; if (!this.players[p].bot) return false;
      let m = botChoose(s, p);
      if (!m && canLaunch(s, p)) { m = botWalk(s, p); if (m) this.fallbacks = (this.fallbacks || 0) + 1; }
      if (!m) { s.over = true; s.ender = p; s.endReason = 'cant'; this.say(this.players[p].name + ' cannot gather earth. Night falls.'); return true; }
      this.commit(m);
      return true;
    }
    botDelay() { return 650; }
    view(seat) {
      this.ctx();
      const v = { seat, P: this.s.P, players: this.players, cfg: this.cfg, board: this.board, s: this.s, log: this.log.slice(-40), last: this.last, seq: this.seq,
        final: this.s.over ? finalResult(this.s) : null };
      return JSON.parse(JSON.stringify(v));
    }
  }

  const api = {
    Game, BOT_NAMES, ELEM, PCOL, CORE, NEU, NEL, MTN_VAL, ELEM_VAL, TIGHT, RULES, SHRINES, TIGHT_SUPPLY,
    geo: { cells, nb, nbl, N, W, H, R, S3, TM, VBW, VBH, COLS },
    bindView: (v) => bind(v.board, v.cfg),
    coord, clone, walk, walkMove, pickable, fillAmount, applyMove, score, orbit, orbitCounts, mtnsAt, pkName, offerDisc, collect, discName, finalResult,
    // exposed for the headless checks
    _: { allMoves, botChoose, botWalk, canLaunch, launchSectors, makeBoard, newState, bind },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DayOne = api;
})(typeof window !== 'undefined' ? window : this);
