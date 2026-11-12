/* Darren Don — shared table for the In Development playables.
   One file gives every game the same three ways to play: against bots, hosting an online table,
   or joining one with a five-letter code. Online tables use the same public MQTT relays as
   Too Many Crooks! and Dim Sum Rush: the host's browser runs the game and sends each seat
   only what that seat may see.

   A game supplies a definition:
     DevTable.mount(document.getElementById('app'), {
       id: 'slipstream', title: 'Slipstream', blurb: '3–6 players · 15–20 minutes',
       minPlayers: 3, maxPlayers: 6, defaultPlayers: 4, botNames: [...],
       chat: true,                                  // show table talk (always on for online tables)
       options: [{ key: 'races', label: 'Race to', values: [[2,'2 wins'],[3,'3 wins']], def: 2 }],
       create(players, opts) -> game,               // players: [{name, bot}]
       render(el, view, api),                       // api.act(action), api.seat, api.toast(msg)
       rules: '<p>…</p>'                            // how-it-plays HTML for the home screen
     });
   game: view(seat) -> plain object; act(seat, a) -> {ok, error}; botStep() -> true if a bot acted;
         over() -> bool; optional botDelay(view) -> ms before the next bot step. */
(function (root) {
  'use strict';
  const BROKERS = [
    { key: 'E', url: 'wss://broker.emqx.io:8084/mqtt', name: 'EMQX' },
    { key: 'H', url: 'wss://broker.hivemq.com:8884/mqtt', name: 'HiveMQ' },
    { key: 'M', url: 'wss://test.mosquitto.org:8081', name: 'Mosquitto' },
  ];
  const LIB_SOURCES = [
    'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js',
    'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mqtt/5.10.1/mqtt.min.js',
  ];
  const SANDBOXED = /claude|anthropic/i.test(location.hostname);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const parse = (p) => { try { return JSON.parse(p.toString()); } catch (e) { return null; } };
  const cleanId = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const makeCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return c; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const token = () => { let t = store.get('dd-table-token'); if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('dd-table-token', t); } return t; };

  let libLoad = null;
  function loadLib() {
    if (root.mqtt) return Promise.resolve(root.mqtt);
    if (libLoad) return libLoad;
    libLoad = new Promise((resolve, reject) => {
      let i = 0;
      const next = () => {
        if (i >= LIB_SOURCES.length) { libLoad = null; reject(new Error('Could not load the networking library. Check your connection or ad blocker.')); return; }
        const s = document.createElement('script'); s.src = LIB_SOURCES[i++]; let done = false;
        const t = setTimeout(() => { if (!done) { done = true; s.remove(); next(); } }, 9000);
        s.onload = () => { if (done) return; done = true; clearTimeout(t); if (root.mqtt) resolve(root.mqtt); else { s.remove(); next(); } };
        s.onerror = () => { if (done) return; done = true; clearTimeout(t); s.remove(); next(); };
        document.head.appendChild(s);
      };
      next();
    });
    return libLoad;
  }
  function connectBroker(mqtt, broker, opts) {
    return new Promise((resolve, reject) => {
      let done = false;
      const client = mqtt.connect(broker.url, Object.assign({ clean: true, connectTimeout: 7000, reconnectPeriod: 2000, keepalive: 30, clientId: 'dd_' + Math.random().toString(16).slice(2, 12) }, opts || {}));
      const to = setTimeout(() => { if (!done) { done = true; try { client.end(true); } catch (e) {} reject(new Error('timeout')); } }, 8000);
      client.once('connect', () => { if (!done) { done = true; clearTimeout(to); resolve(client); } });
      const fail = (e) => { if (!done) { done = true; clearTimeout(to); try { client.end(true); } catch (e2) {} reject(e || new Error('connection closed')); } };
      client.on('error', fail); client.on('close', () => fail(new Error('connection refused'))); client.on('offline', () => fail(new Error('offline')));
    });
  }
  async function connectAny(mqtt, list, optsFor) {
    let last = null;
    for (const b of list) { try { return { client: await connectBroker(mqtt, b, optsFor ? optsFor(b) : null), broker: b }; } catch (e) { last = e; } }
    throw new Error('Could not reach any relay server' + (last ? ' (' + (last.message || last) + ')' : '') + (SANDBOXED ? '. This page is running inside a preview that blocks outside connections; open it on darrendon.com for online play.' : '. Try again, or try a different network.'));
  }

  /* Runs the game and steps the bots on a timer so people can follow along. */
  class Runner {
    constructor(def) { this.def = def; this.game = null; this.cb = null; this.t = null; }
    onUpdate(cb) { this.cb = cb; }
    start(players, opts) { this.game = this.def.create(players, opts || {}); this.cb && this.cb(); this.schedule(700); }
    view(seat) { return this.game ? this.game.view(seat) : null; }
    act(seat, a) { if (!this.game) return { ok: false, error: 'No game' }; const r = this.game.act(seat, a) || { ok: false, error: 'Not allowed' }; if (r.ok) { this.cb && this.cb(); this.schedule(this.delay()); } return r; }
    delay() { const g = this.game; return g && g.botDelay ? g.botDelay() : 900; }
    schedule(ms) { clearTimeout(this.t); this.t = setTimeout(() => this.tick(), ms); }
    tick() {
      const g = this.game; if (!g) return;
      if (root.__ddBusy && root.__ddBusy()) { this.schedule(150); return; }   // let animations land first
      if (g.over && g.over()) return;
      if (g.botStep()) { this.cb && this.cb(); this.schedule(this.delay()); } else this.schedule(600);
    }
    stop() { clearTimeout(this.t); this.game = null; }
  }

  class LocalSession {
    constructor(def, N, name, opts) { this.def = def; this.kind = 'local'; this.seat = 0; this.N = N; this.name = name; this.opts = opts; this.runner = new Runner(def); this.chat = []; }
    onUpdate(cb) { this.runner.onUpdate(cb); }
    start() {
      const names = shuffle(this.def.botNames || ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kit', 'Lou']);
      const players = [{ name: this.name || 'You', bot: false }];
      for (let i = 1; i < this.N; i++) players.push({ name: names[(i - 1) % names.length], bot: true });
      this.runner.start(players, this.opts);
    }
    view() { return this.runner.view(this.seat); }
    act(a) { return this.runner.act(this.seat, a); }
    say() {}
    isHost() { return true; }
    leave() { this.runner.stop(); }
  }

  class HostSession {
    constructor(def, N, name, opts) {
      this.def = def; this.kind = 'host'; this.N = N; this.name = name || 'Host'; this.opts = opts; this.seat = 0; this.chat = [];
      this.topicRoot = 'whatsgood/' + def.id + '/v1/';
      this.seats = [{ name: this.name, bot: false, token: 'host', connected: true, last: 0 }];
      for (let i = 1; i < N; i++) this.seats.push({ name: null, bot: true, token: null, connected: false, last: 0 });
      this.runner = new Runner(def); this.started = false;
      this.runner.onUpdate(() => { this.broadcastViews(); this.cb && this.cb(); });
    }
    onUpdate(cb) { this.cb = cb; }
    onLobby(cb) { this.lobbyCb = cb; }
    async open() {
      const mqtt = await loadLib();
      const { client, broker } = await connectAny(mqtt, shuffle(BROKERS));
      this.client = client; this.broker = broker;
      this.code = broker.key + makeCode(); this.topic = this.topicRoot + this.code;
      await new Promise((res, rej) => client.subscribe(this.topic + '/h', { qos: 1 }, (e) => (e ? rej(e) : res())));
      client.on('message', (t, p) => { if (t === this.topic + '/h') this.onMessage(parse(p)); });
      client.on('connect', () => { this.pushLobby(); if (this.started) this.broadcastViews(); });
      this.presence = setInterval(() => this.checkPresence(), 10000);
      return this.code;
    }
    hostSeat() { return this.seats.findIndex((s) => s.token === 'host'); }
    sendTo(i, m) { const s = this.seats[i]; if (!s || !s.token || s.bot || s.token === 'host') return; this.raw(s.token, m); }
    raw(tok, m) { try { this.client.publish(this.topic + '/g/' + tok, JSON.stringify(m), { qos: 1 }); } catch (e) {} }
    checkPresence() { const now = Date.now(); let ch = false; for (const s of this.seats) if (!s.bot && s.token !== 'host' && s.connected && now - s.last > 45000) { s.connected = false; ch = true; } if (ch) this.pushLobby(); }
    onMessage(m) {
      if (!m || !m.from) return;
      const tok = cleanId(m.from);
      let seat = this.seats.findIndex((s) => s.token === tok);
      if (m.t === 'hello') {
        const name = String(m.name || 'Guest').slice(0, 16) || 'Guest';
        if (seat < 0) {
          if (this.started) { this.raw(tok, { t: 'rejected', reason: 'The game has already started.' }); return; }
          seat = this.seats.findIndex((s) => s.bot);
          if (seat < 0) { this.raw(tok, { t: 'rejected', reason: 'The table is full.' }); return; }
          this.seats[seat] = { name, bot: false, token: tok, connected: true, last: Date.now() };
        } else Object.assign(this.seats[seat], { connected: true, last: Date.now(), name });
        this.sendTo(seat, { t: 'welcome', seat, code: this.code });
        this.pushLobby();
        if (this.started) { this.sendTo(seat, { t: 'view', view: this.runner.view(seat) }); this.sendTo(seat, { t: 'chat', chat: this.chat }); }
        return;
      }
      if (seat < 0) return;
      this.seats[seat].last = Date.now();
      if (!this.seats[seat].connected) { this.seats[seat].connected = true; this.pushLobby(); }
      if (m.t === 'ping') { if (this.started && m.needView) this.sendTo(seat, { t: 'view', view: this.runner.view(seat) }); return; }
      if (m.t === 'bye') { this.seats[seat].connected = false; this.pushLobby(); return; }
      if (m.t === 'sit') { const to = m.seat | 0; if (!this.started && this.seats[to] && this.seats[to].bot) { const a = this.seats[seat]; this.seats[seat] = this.seats[to]; this.seats[to] = a; this.pushLobby(); } return; }
      if (m.t === 'chat') { this.addChat(seat, m.text); return; }
      if (m.t === 'act') { const r = this.runner.act(seat, m.a || {}); if (!r.ok) this.sendTo(seat, { t: 'err', msg: r.error }); }
    }
    addChat(seat, text) {
      text = String(text || '').slice(0, 200).trim(); if (!text) return;
      this.chat.push({ seat, name: this.started ? null : this.seats[seat].name, text }); if (this.chat.length > 80) this.chat.shift();
      this.seats.forEach((s, i) => this.sendTo(i, { t: 'chat', chat: this.chat }));
      this.cb && this.cb();
    }
    say(text) { this.addChat(this.hostSeat(), text); }
    lobbyState() { return { code: this.code, N: this.N, started: this.started, relay: this.broker && this.broker.name, seats: this.seats.map((s) => ({ name: s.bot ? null : s.name, bot: s.bot, connected: s.connected })) }; }
    pushLobby() { const st = this.lobbyState(); this.seats.forEach((s, i) => this.sendTo(i, { t: 'lobby', state: st, seat: i })); this.lobbyCb && this.lobbyCb(st); }
    startGame() {
      if (this.started) return; this.started = true;
      const names = shuffle(this.def.botNames || ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kit', 'Lou']); let bi = 0;
      const players = this.seats.map((s) => (s.bot ? { name: names[bi++ % names.length] + ' (bot)', bot: true } : { name: s.name, bot: false }));
      this.seat = this.hostSeat();
      this.pushLobby();
      this.runner.start(players, this.opts);
    }
    broadcastViews() { this.seats.forEach((s, i) => this.sendTo(i, { t: 'view', view: this.runner.view(i) })); }
    view() { return this.runner.view(this.seat); }
    act(a) { return this.runner.act(this.seat, a); }
    isHost() { return true; }
    leave() { this.runner.stop(); clearInterval(this.presence); try { this.seats.forEach((s, i) => this.sendTo(i, { t: 'closed' })); this.client && this.client.end(); } catch (e) {} }
  }

  class GuestSession {
    constructor(def, code, name) { this.def = def; this.kind = 'guest'; this.code = String(code).toUpperCase().replace(/[^A-Z]/g, ''); this.name = name || 'Guest'; this.seat = null; this._view = null; this.chat = []; this.topicRoot = 'whatsgood/' + def.id + '/v1/'; }
    onUpdate(cb) { this.cb = cb; }
    onLobby(cb) { this.lobbyCb = cb; }
    onError(cb) { this.errCb = cb; }
    async connect() {
      const broker = BROKERS.find((b) => b.key === this.code[0]);
      if (!broker || this.code.length !== 5) throw new Error('That does not look like a table code (5 letters).');
      const mqtt = await loadLib();
      this.token = cleanId(token() + '-' + this.name.toLowerCase());
      this.topic = this.topicRoot + this.code;
      const my = this.topic + '/g/' + this.token;
      const { client } = await connectAny(mqtt, [broker], () => ({ will: { topic: this.topic + '/h', payload: JSON.stringify({ t: 'bye', from: this.token }), qos: 1 } }));
      this.client = client;
      await new Promise((res, rej) => client.subscribe(my, { qos: 1 }, (e) => (e ? rej(e) : res())));
      const hello = () => this.pub({ t: 'hello', name: this.name });
      await new Promise((resolve, reject) => {
        let settled = false;
        const to = setTimeout(() => { if (!settled) { settled = true; reject(new Error('No table found with that code. Check it, and that the host still has the page open.')); } }, 12000);
        client.on('message', (t, p) => {
          if (t !== my) return; const m = parse(p); if (!m) return;
          if (m.t === 'welcome') { this.seat = m.seat; if (!settled) { settled = true; clearTimeout(to); resolve(); } }
          else if (m.t === 'rejected') { if (!settled) { settled = true; clearTimeout(to); reject(new Error(m.reason)); } else this.lobbyCb && this.lobbyCb({ error: m.reason }); }
          else if (m.t === 'lobby') { this.lobby = m.state; this.seat = m.seat; this.lobbyCb && this.lobbyCb(m.state); }
          else if (m.t === 'view') { this._view = m.view; this.cb && this.cb(); }
          else if (m.t === 'chat') { this.chat = m.chat || []; this.cb && this.cb(); }
          else if (m.t === 'err') { this.errCb && this.errCb(m.msg); }
          else if (m.t === 'closed') { this.lobbyCb && this.lobbyCb({ error: 'The host closed the table.' }); }
        });
        hello();
      });
      client.on('connect', hello);
      this.ping = setInterval(() => this.pub({ t: 'ping', needView: !this._view }, 0), 15000);
    }
    pub(m, qos) { try { m.from = this.token; this.client.publish(this.topic + '/h', JSON.stringify(m), { qos: qos == null ? 1 : qos }); return true; } catch (e) { return false; } }
    sit(seat) { this.pub({ t: 'sit', seat }); }
    say(text) { this.pub({ t: 'chat', text }); }
    view() { return this._view; }
    act(a) { return this.pub({ t: 'act', a }) ? { ok: true, pending: true } : { ok: false, error: 'Not connected' }; }
    isHost() { return false; }
    leave() { clearInterval(this.ping); this.pub({ t: 'bye' }); try { this.client.end(); } catch (e) {} }
  }

  /* ---------------------------------------------------------------- UI */
  function mount(el, def) {
    const opt = (def.options || []).map((o) => '<label>' + esc(o.label) + ' <select data-opt="' + esc(o.key) + '">' + o.values.map(([v, t]) => '<option value="' + esc(v) + '"' + (v === o.def ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label>').join('');
    const counts = (sel) => { let h = ''; for (let n = def.minPlayers; n <= def.maxPlayers; n++) h += '<option' + (n === (def.defaultPlayers || def.minPlayers) ? ' selected' : '') + '>' + n + '</option>'; return '<select id="' + sel + '">' + h + '</select>'; };
    el.innerHTML =
      '<div class="dt-home" id="dt-home">' +
        '<header class="dt-mast">' + (def.mast || '<h1>' + esc(def.title) + '</h1>') + '<p class="dt-sub"><b>Play online</b> ' + esc(def.blurb || '') + '</p></header>' +
        '<section class="dt-card">' +
          '<label class="dt-name">Your name <input id="dt-name" maxlength="16" placeholder="Your name" autocomplete="nickname"></label>' +
          '<div class="dt-tabs" role="tablist"><button data-tab="local" class="on" role="tab">Play vs bots</button><button data-tab="host" role="tab">Host a table</button><button data-tab="join" role="tab">Join a table</button></div>' +
          '<div data-pane="local"><div class="dt-row"><label>Players ' + counts('dt-l-n') + '</label>' + opt + '<button class="dt-btn go" id="dt-l-start">Deal me in</button></div>' +
            '<p class="dt-muted">Bots take the other seats.' + (def.botNote ? ' ' + esc(def.botNote) : '') + '</p></div>' +
          '<div data-pane="host" hidden><div class="dt-row"><label>Seats ' + counts('dt-h-n') + '</label>' + opt + '<button class="dt-btn go" id="dt-h-open">Open a table</button></div>' +
            '<p class="dt-muted">Share the five-letter code or the invite link. Bots fill any empty seats. Keep this tab open while you host.</p>' +
            '<div id="dt-h-lobby" hidden><div class="dt-code" id="dt-h-code"></div><div class="dt-row tight"><button class="dt-btn ghost sm" id="dt-h-copy">Copy invite link</button><span class="dt-muted" id="dt-h-relay"></span></div><div class="dt-seats" id="dt-h-seats"></div>' +
            '<div class="dt-row"><button class="dt-btn go" id="dt-h-start">Start the game</button><button class="dt-btn ghost" id="dt-h-close">Close table</button></div></div></div>' +
          '<div data-pane="join" hidden><div class="dt-row"><label>Table code <input id="dt-j-code" class="dt-codein" maxlength="5" placeholder="ABCDE" autocapitalize="characters"></label><button class="dt-btn go" id="dt-j-go">Join</button></div>' +
            '<div id="dt-j-lobby" hidden><p class="dt-muted" id="dt-j-status"></p><div class="dt-seats" id="dt-j-seats"></div><p class="dt-muted">Waiting for the host to start. Tap an empty seat to move there.</p></div></div>' +
          '<p class="dt-msg" id="dt-msg" role="status"></p>' +
        '</section>' +
        (def.rules ? '<section class="dt-card dt-rules"><h2>How it plays</h2>' + def.rules + '</section>' : '') +
        '<p class="dt-muted dt-credit">' + esc(def.title) + ' by Darren Don</p>' +
      '</div>' +
      '<div class="dt-game" id="dt-game" hidden>' +
        '<div class="dt-top"><b class="dt-title">' + esc(def.title) + '</b><span class="dt-status" id="dt-status"></span><span class="dt-tcode" id="dt-tcode"></span><button class="dt-btn ghost sm" id="dt-talk-btn" hidden>Talk</button>' + (root.Tabletop ? root.Tabletop.soundButton('dt-snd') : '') + '<button class="dt-btn ghost sm" id="dt-leave">Leave</button></div>' +
        '<div class="dt-body"><div class="dt-board" id="dt-board"></div>' +
        '<aside class="dt-talk" id="dt-talk" hidden><div class="dt-talk-h">Table talk <button class="dt-x" id="dt-talk-x" aria-label="Close table talk">×</button></div><div class="dt-feed" id="dt-feed"></div><form class="dt-say" id="dt-say"><input id="dt-say-in" maxlength="200" placeholder="Say something…" autocomplete="off"><button class="dt-btn sm">Say</button></form></aside></div>' +
      '</div>' +
      '<div class="dt-toast" id="dt-toast" role="status"></div>';

    const $ = (id) => el.querySelector('#' + id);
    const nameIn = $('dt-name'); nameIn.value = store.get('dd-table-name', '');
    nameIn.addEventListener('change', () => store.set('dd-table-name', nameIn.value.trim()));
    const myName = (d) => (nameIn.value.trim() || d).slice(0, 16);
    const msg = (t, bad) => { const m = $('dt-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); };
    let toastT = null;
    const toast = (t) => { const x = $('dt-toast'); x.textContent = t; x.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => x.classList.remove('on'), 2600); };
    const readOpts = (pane) => { const o = {}; el.querySelectorAll('[data-pane="' + pane + '"] [data-opt]').forEach((s) => { const v = s.value; o[s.dataset.opt] = isNaN(+v) ? v : +v; }); return o; };

    el.querySelectorAll('.dt-tabs button').forEach((b) => b.addEventListener('click', () => {
      el.querySelectorAll('.dt-tabs button').forEach((x) => x.classList.toggle('on', x === b));
      el.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
      msg('');
    }));

    let session = null, lastSig = '';
    // a refused move gets the referee (the piece springs back, a buzz, and why), not a quiet toast
    const refuse = (why, at) => { if (root.Tabletop) root.Tabletop.nope(why || 'That move isn’t allowed.', { at }); else toast(why || 'Not allowed'); };
    const api = {
      get seat() { return session ? session.seat : 0; },
      act(a, at) { if (!session) return; const r = session.act(a); if (r && !r.ok) refuse(r.error, at); return r; },
      nope: refuse,
      toast,
      status(t) { $('dt-status').textContent = t || ''; },
      get online() { return session && session.kind !== 'local'; },
    };

    function showGame() {
      $('dt-home').hidden = true; $('dt-game').hidden = false;
      $('dt-tcode').textContent = session.code ? 'Table ' + session.code : '';
      const online = session.kind !== 'local';
      const talk = online || def.chat;
      $('dt-talk-btn').hidden = !talk;
      el.classList.toggle('dt-has-talk', !!talk);
      $('dt-talk').hidden = !talk || matchMedia('(max-width: 899px)').matches;
      draw();
    }
    function draw() {
      if (!session) return;
      const v = session.view(); if (!v) return;
      const sig = JSON.stringify(v);
      if (sig !== lastSig) { lastSig = sig; def.render($('dt-board'), v, api); }
      drawChat();
    }
    let chatN = 0;
    function drawChat() {
      const c = session.chat || [], f = $('dt-feed');
      const v = session.view && session.view();
      const nm = (m) => m.name || (v && v.players && v.players[m.seat] ? v.players[m.seat].name : 'Seat ' + (m.seat + 1));
      f.innerHTML = c.length ? c.map((m) => '<p><b class="s' + m.seat + '">' + esc(nm(m)) + '</b> ' + esc(m.text) + '</p>').join('') : '<p class="dt-muted">No messages yet.</p>';
      f.scrollTop = f.scrollHeight;
      if (c.length > chatN && $('dt-talk').hidden && chatN) $('dt-talk-btn').classList.add('ping');
      chatN = c.length;
    }
    function home(text, bad) {
      if (session) { try { session.leave(); } catch (e) {} }
      session = null; lastSig = '';
      $('dt-game').hidden = true; $('dt-home').hidden = false; $('dt-h-lobby').hidden = true; $('dt-j-lobby').hidden = true;
      el.querySelectorAll('.dt-btn.go').forEach((b) => { b.disabled = false; });
      msg(text, bad);
    }
    root.addEventListener('beforeunload', () => { if (session) try { session.leave(); } catch (e) {} });

    $('dt-l-start').addEventListener('click', () => {
      session = new LocalSession(def, +$('dt-l-n').value, myName('You'), readOpts('local'));
      session.onUpdate(draw); session.start(); showGame();
    });
    function seatsHTML(st, mine, canSit) {
      return st.seats.map((s, i) => '<div class="dt-seat' + (i === mine ? ' me' : '') + (s.bot ? ' bot' : '') + (canSit && s.bot ? ' sit' : '') + '" data-seat="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + (s.bot ? 'Bot (open seat)' : esc(s.name) + (i === mine ? ' (you)' : '')) + '</span>' + (!s.bot && !s.connected ? '<i>away</i>' : '') + '</div>').join('');
    }
    $('dt-h-open').addEventListener('click', async () => {
      const b = $('dt-h-open'); b.disabled = true; msg('Opening a table…');
      const s = new HostSession(def, +$('dt-h-n').value, myName('Host'), readOpts('host'));
      try {
        const code = await s.open(); session = s; msg('');
        $('dt-h-lobby').hidden = false; $('dt-h-code').textContent = code; $('dt-h-relay').textContent = 'Relay: ' + s.broker.name;
        s.onLobby((st) => { $('dt-h-seats').innerHTML = seatsHTML(st, s.hostSeat(), false); });
        s.onUpdate(draw); s.pushLobby();
      } catch (e) { b.disabled = false; msg(e.message || String(e), true); }
    });
    $('dt-h-copy').addEventListener('click', () => {
      const url = location.origin + location.pathname + '?join=' + (session && session.code);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Invite link copied'), () => toast(url));
    });
    $('dt-h-start').addEventListener('click', () => { if (session && session.kind === 'host') { session.startGame(); showGame(); } });
    $('dt-h-close').addEventListener('click', () => home('Table closed.'));
    $('dt-j-go').addEventListener('click', async () => {
      const code = $('dt-j-code').value.trim(); const b = $('dt-j-go'); b.disabled = true; msg('Looking for the table…');
      const s = new GuestSession(def, code, myName('Guest'));
      s.onLobby((st) => {
        if (st.error) { home(st.error, true); return; }
        $('dt-j-lobby').hidden = false; $('dt-j-status').textContent = 'Table ' + st.code + ' · ' + st.seats.filter((x) => !x.bot).length + ' of ' + st.N + ' seats taken';
        $('dt-j-seats').innerHTML = seatsHTML(st, s.seat, !st.started);
        if (st.started && $('dt-game').hidden) showGame();
      });
      s.onUpdate(() => { if ($('dt-game').hidden && s._view) showGame(); else draw(); });
      s.onError((m) => refuse(m));
      try { await s.connect(); session = s; msg(''); } catch (e) { b.disabled = false; msg(e.message || String(e), true); }
    });
    $('dt-j-seats').addEventListener('click', (e) => { const d = e.target.closest('.dt-seat.sit'); if (d && session && session.sit) session.sit(+d.dataset.seat); });
    $('dt-leave').addEventListener('click', () => home(session && session.kind === 'host' ? 'You closed the table.' : ''));
    const toggleTalk = (open) => { const t = $('dt-talk'); t.hidden = open == null ? !t.hidden : !open; $('dt-talk-btn').classList.remove('ping'); if (!t.hidden) { drawChat(); } };
    $('dt-talk-btn').addEventListener('click', () => toggleTalk());
    $('dt-talk-x').addEventListener('click', () => toggleTalk(false));
    $('dt-say').addEventListener('submit', (e) => { e.preventDefault(); const i = $('dt-say-in'); if (session && i.value.trim()) { session.say(i.value.trim()); i.value = ''; } });

    const q = new URLSearchParams(location.search);
    if (q.get('join')) { el.querySelector('[data-tab="join"]').click(); $('dt-j-code').value = q.get('join').toUpperCase().slice(0, 5); }
    return api;
  }

  /* Pieces physically move: anything with data-k keeps its identity across re-renders,
     so after draw() it slides from where it was to where it is now. */
  let busyUntil = 0;
  root.__ddBusy = () => Date.now() < busyUntil;
  function flip(container, draw, ms) {
    ms = ms || 520;
    const before = new Map();
    container.querySelectorAll('[data-k]').forEach((n) => before.set(n.dataset.k, n.getBoundingClientRect()));
    draw();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let moved = false;
    const T = root.Tabletop; let landed = 0;
    container.querySelectorAll('[data-k]').forEach((n) => {
      const dropped = T && T.takeLaunch(n.dataset.k);              // a piece you just put down lands from where you let go of it
      const a = dropped || before.get(n.dataset.k), b = n.getBoundingClientRect();
      if (!a) { if (n.dataset.enter != null) { n.animate([{ opacity: 0, transform: 'translateY(-14px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: ms * 0.8, easing: 'cubic-bezier(.2,.8,.2,1)' }); moved = true; } return; }
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      moved = true; if (!dropped) landed++;
      // pieces travel in a low arc and settle, like a hand put them there
      const lift = Math.min(40, Math.hypot(dx, dy) * 0.12), rot = ((dx > 0 ? -1 : 1) * Math.min(8, Math.abs(dx) * 0.02));
      n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: `translate(${dx * 0.45}px,${dy * 0.45 - lift}px) rotate(${rot}deg) scale(1.04)`, offset: 0.5 }, { transform: 'none' }], { duration: dropped ? ms * 0.55 : ms, easing: 'cubic-bezier(.3,.7,.2,1)' });
    });
    if (moved) busyUntil = Date.now() + ms;
    if (landed && T) setTimeout(() => T.sound(landed > 2 ? 'deal' : 'place'), ms * 0.85);
  }

  root.DevTable = { mount, shuffle, esc, flip, LocalSession, HostSession, GuestSession, Runner, SANDBOXED };
})(window);
