/* Darren Don — Tabletop: the shared "it's a real table" layer for every playable.

   The builds should feel like board games, not video games: you pick a card up, carry it to a
   spot on the table and put it down. Nothing lights up to say what's legal. If a move breaks the
   rules, the game stops you the way an old video game does: the piece springs back, the table
   buzzes and a box says why.

   Tabletop.drag(root, {
     pieces: '.card',              // what can be picked up (inside root)
     zones: '[data-zone]',         // spots on the table pieces can be put down on
     key: (el) => el.dataset.id,   // identity of a piece across re-renders (default: data-k or data-id)
     drop(piece, zone) -> true | false | 'reason' | {ok, reason}
                                   // piece: {el, data (its dataset at pickup), key}; zone: the element
     tap(piece)                    // optional: called for a tap when the game wants its own tap rule
     canLift(el) -> bool           // optional: may this piece be picked up right now (e.g. not your turn)
     home(piece) -> zone el | null // optional: where a tapped piece goes when there's one obvious spot for it.
                                   // A tap then plays it there in one go (the same drop() rule decides);
                                   // null means "no obvious spot", and the piece lifts as usual.
   })
     Drag a piece onto a zone, or tap a piece (it goes home, or lifts and then you tap a zone). A drop that the game
     refuses springs back and calls Tabletop.nope(reason). Install once per root: listeners are
     delegated, so the game can redraw the root with innerHTML as often as it likes.

   Tabletop.nope(reason, opts)     the referee: buzz, shake, and a box that says what's wrong
   Tabletop.say(text, opts)        the same box, friendly (no buzz)
   Tabletop.sound(name)            pick | place | slide | flip | deal | nope | dice | chip | shuffle | win
   Tabletop.fan(el)                lays a hand out as a fanned, overlapping arc that fits its width
   Tabletop.launch(key, rect)      the next time a piece with this key appears, it flies in from rect
   Tabletop.takeLaunch(key)        (for a game's own FLIP code) the rect a piece was dropped at, once
   Tabletop.reveal(el)             flips a card face up in 3D
   Tabletop.land(el)               a small squash as something lands
   Tabletop.soundButton(cls)       HTML for a speaker toggle (any [data-tt-sound] element toggles)
*/
(function (root) {
  'use strict';
  const doc = root.document;
  const reduce = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------------------------------------------------------------- sound: all synthesized, no files */
  let ctx = null, master = null, noiseBuf = null, soundOn = store.get('dd-sound', '1') !== '0';
  function audio() {
    if (!soundOn) return null;
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function noise(t, dur, type, freq, q, gain, f2) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.008, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function tone(t, dur, type, f1, f2, gain) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  let lastSound = {};
  function sound(name) {
    const now = Date.now(); if (lastSound[name] && now - lastSound[name] < 45) return; lastSound[name] = now;   // many cards landing at once sound like a few, not a buzz
    const c = audio(); if (!c) return;
    const t = c.currentTime + 0.005;
    switch (name) {
      case 'pick': noise(t, 0.05, 'highpass', 2600, 0.7, 0.12); break;
      case 'place': noise(t, 0.07, 'bandpass', 1500, 0.9, 0.35); tone(t, 0.09, 'sine', 140, 60, 0.22); break;
      case 'slide': noise(t, 0.18, 'bandpass', 700, 1.2, 0.13, 2600); break;
      case 'deal': noise(t, 0.09, 'bandpass', 1200, 1, 0.16, 3200); break;
      case 'flip': noise(t, 0.035, 'highpass', 2200, 0.8, 0.16); noise(t + 0.05, 0.05, 'bandpass', 1400, 1, 0.22); break;
      case 'chip': tone(t, 0.05, 'triangle', 2100, 1700, 0.08); noise(t, 0.03, 'highpass', 4000, 1, 0.1); break;
      case 'dice': for (let i = 0; i < 6; i++) { const u = t + i * 0.045 + Math.random() * 0.02; noise(u, 0.03, 'bandpass', 2500 + Math.random() * 1800, 2, 0.16); } tone(t + 0.27, 0.07, 'sine', 180, 90, 0.14); break;
      case 'shuffle': for (let i = 0; i < 7; i++) noise(t + i * 0.05, 0.06, 'bandpass', 1500 + i * 120, 1.4, 0.09, 3000); break;
      case 'nope': tone(t, 0.11, 'square', 233, 220, 0.06); tone(t + 0.13, 0.24, 'square', 175, 147, 0.07); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.09, 0.18, 'triangle', f, f, 0.08)); break;
    }
  }
  function setSound(on) {
    soundOn = !!on; store.set('dd-sound', soundOn ? '1' : '0');
    doc.querySelectorAll('[data-tt-sound]').forEach((b) => { b.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); b.title = soundOn ? 'Sound on' : 'Sound off'; b.classList.toggle('tt-muted', !soundOn); });
    if (soundOn) sound('chip');
  }
  const SPK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="tt-w" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="tt-x" d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const soundButton = (cls) => '<button type="button" class="tt-snd ' + (cls || '') + (soundOn ? '' : ' tt-muted') + '" data-tt-sound aria-pressed="' + soundOn + '" title="' + (soundOn ? 'Sound on' : 'Sound off') + '" aria-label="Sound">' + SPK + '</button>';
  doc.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-tt-sound]'); if (b) { e.preventDefault(); setSound(!soundOn); } });

  /* ---------------------------------------------------------------- the referee */
  let box = null, boxT = null;
  const NOPE_HEADS = ['Not allowed!', 'Can’t do that!', 'Illegal move!'];
  let headN = 0;
  function popup(text, opts, bad) {
    opts = opts || {};
    if (!box) {
      box = doc.createElement('div'); box.className = 'tt-ref'; box.setAttribute('role', 'alert');
      box.addEventListener('click', () => hide());
      doc.body.appendChild(box);
    }
    const head = opts.head || (bad ? NOPE_HEADS[headN++ % NOPE_HEADS.length] : '');
    box.className = 'tt-ref' + (bad ? ' bad' : ' ok') + (opts.cls ? ' ' + opts.cls : '');
    box.innerHTML = (bad ? '<i aria-hidden="true">✕</i>' : '') + '<div>' + (head ? '<b>' + esc(head) + '</b>' : '') + (text ? '<span>' + esc(text) + '</span>' : '') + '</div>';
    // sit near where it happened, kept on screen; otherwise low in the middle, above the hand
    const vw = root.innerWidth, vh = root.innerHeight;
    box.style.visibility = 'hidden'; box.style.left = '0px'; box.style.top = '0px'; box.classList.add('on');
    const bw = box.offsetWidth, bh = box.offsetHeight;
    let x = vw / 2, y = vh * 0.42;
    const at = opts.at && (opts.at.getBoundingClientRect ? opts.at.getBoundingClientRect() : opts.at);
    if (at && at.width != null) { x = at.left + at.width / 2; y = at.top - 14 - bh / 2; if (y - bh / 2 < 60) y = at.top + at.height + 14 + bh / 2; }
    else if (at && at.x != null) { x = at.x; y = at.y - 30 - bh / 2; }
    x = Math.max(bw / 2 + 10, Math.min(vw - bw / 2 - 10, x)); y = Math.max(bh / 2 + 10, Math.min(vh - bh / 2 - 10, y));
    box.style.left = (x - bw / 2) + 'px'; box.style.top = (y - bh / 2) + 'px'; box.style.visibility = '';
    if (!reduce()) box.animate(bad ? [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .45 }, { transform: 'scale(1) translateX(-7px)', offset: .62 }, { transform: 'translateX(6px)', offset: .76 }, { transform: 'translateX(-3px)', offset: .88 }, { transform: 'none' }]
      : [{ transform: 'translateY(8px) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: bad ? 420 : 240, easing: 'ease-out' });
    clearTimeout(boxT); boxT = setTimeout(hide, opts.ms || (bad ? Math.max(2400, 1400 + (text || '').length * 38) : 2200));
  }
  function hide() { if (box) box.classList.remove('on'); }
  function nope(reason, opts) {
    opts = opts || {};
    sound('nope');
    try { if (root.navigator && navigator.vibrate) navigator.vibrate([40, 40, 60]); } catch (e) {}
    if (opts.shake && !reduce()) shake(opts.shake);
    popup(reason || 'That move isn’t allowed.', opts, true);
  }
  function say(text, opts) { popup(text, opts, false); }
  function shake(el) {
    (Array.isArray(el) ? el : [el]).forEach((n) => n && n.animate && n.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px) rotate(-2deg)' }, { transform: 'translateX(7px) rotate(2deg)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 380, easing: 'ease-out' }));
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------------------------------------------------------- launches: a dropped piece lands from where it was let go */
  const launches = new Map();
  function launch(k, rect) { if (k == null || !rect) return; launches.set(String(k), { r: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, t: Date.now() }); }
  function takeLaunch(k) { const v = launches.get(String(k)); if (!v) return null; launches.delete(String(k)); return Date.now() - v.t < 4000 ? v.r : null; }

  /* ---------------------------------------------------------------- drag and drop, or tap-lift-tap */
  const keyOf = (el, opts) => { if (!el) return null; if (opts.key) return opts.key(el); const d = el.dataset; return d.k != null ? d.k : d.id != null ? d.id : null; };
  function drag(rootEl, opts) {
    if (rootEl.__tt) { rootEl.__tt.opts = opts; return rootEl.__tt; }
    const st = { opts, lifted: null, src: null };
    rootEl.__tt = st;
    const find = (key) => { if (key == null) return null; for (const n of rootEl.querySelectorAll(st.opts.pieces)) if (String(keyOf(n, st.opts)) === String(key)) return n; return null; };
    const mark = () => {
      rootEl.querySelectorAll('.tt-lifted').forEach((n) => { if (!st.lifted || String(keyOf(n, st.opts)) !== String(st.lifted)) n.classList.remove('tt-lifted'); });
      rootEl.querySelectorAll('.tt-src').forEach((n) => { if (!st.src || String(keyOf(n, st.opts)) !== String(st.src)) n.classList.remove('tt-src'); });
      if (st.lifted != null) { const n = find(st.lifted); if (n) n.classList.add('tt-lifted'); else st.lifted = null; }
      if (st.src != null) { const n = find(st.src); if (n) n.classList.add('tt-src'); }
      rootEl.querySelectorAll(st.opts.pieces).forEach((n) => { if (!n.classList.contains('tt-piece')) n.classList.add('tt-piece'); });
      rootEl.classList.toggle('tt-holding', st.lifted != null);
    };
    // redraws replace the elements; put the lifted / in-hand marks back on whichever node is that piece now
    const mo = new MutationObserver(() => { mo.disconnect(); mark(); if (st.afterDraw) { const f = st.afterDraw; st.afterDraw = null; f(); } mo.observe(rootEl, { childList: true, subtree: true }); });
    mo.observe(rootEl, { childList: true, subtree: true });

    const zoneAt = (x, y) => { const els = doc.elementsFromPoint(x, y); for (const e of els) { const z = e.closest && e.closest(st.opts.zones); if (z && rootEl.contains(z)) return z; } return null; };
    const pieceInfo = (el) => ({ el, data: Object.assign({}, el.dataset), key: keyOf(el, st.opts) });
    function result(r) { if (r === undefined || r === true || r === null) return { ok: true }; if (r === false) return { ok: false }; if (typeof r === 'string') return { ok: false, reason: r }; return { ok: !!r.ok, reason: r.reason || r.error, quiet: r.quiet }; }

    function attempt(info, zone, ghost, at) {
      let r;
      try { r = result(st.opts.drop(info, zone)); } catch (e) { r = { ok: false, reason: e.message }; }
      if (r.ok) { sound('place'); return true; }
      if (r.reason) nope(r.reason, { at: zone || at, shake: zone && zone.closest('[data-zone]') ? null : null });
      else if (!r.quiet) sound('slide');
      return false;
    }

    let d = null;   // the drag in progress
    rootEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const el = e.target.closest(st.opts.pieces);
      if (!el || !rootEl.contains(el)) return;
      if (st.opts.canLift && !st.opts.canLift(el)) return;
      // no text selection or native image drag fighting the pick-up
      if (e.pointerType === 'mouse') e.preventDefault();
      try { const sel = root.getSelection && root.getSelection(); if (sel && !sel.isCollapsed) sel.removeAllRanges(); } catch (x) {}
      d = { el, info: pieceInfo(el), x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, rect: el.getBoundingClientRect(), vx: 0, lastX: e.clientX, t: performance.now() };
    });
    root.addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id) return;
      d.x = e.clientX; d.y = e.clientY;
      if (!d.moved) {
        if (Math.hypot(d.x - d.x0, d.y - d.y0) < 7) return;
        d.moved = true; startGhost();
      }
      e.preventDefault();
      const now = performance.now(), dt = Math.max(1, now - d.t);
      d.vx = d.vx * 0.7 + ((d.x - d.lastX) / dt) * 0.3; d.lastX = d.x; d.t = now;
      moveGhost();
      autoScroll();
      const z = zoneAt(d.x, d.y);
      if (z !== d.over) { if (d.over) d.over.classList.remove('tt-over'); d.over = z; if (z) z.classList.add('tt-over'); }
    }, { passive: false });
    // carrying a piece to the top or bottom edge of the screen scrolls the page, the way you'd lean over a big table
    let scrollRaf = 0;
    function autoScroll() {
      if (scrollRaf || !d) return;
      const step = () => {
        scrollRaf = 0; if (!d || !d.moved) return;
        const vh = root.innerHeight, edge = Math.min(90, vh * 0.12);
        const dy = d.y < edge ? -(edge - d.y) / edge : d.y > vh - edge ? (d.y - (vh - edge)) / edge : 0;
        if (!dy) return;
        root.scrollBy(0, Math.round(dy * 18));
        const z = zoneAt(d.x, d.y); if (z !== d.over) { if (d.over) d.over.classList.remove('tt-over'); d.over = z; if (z) z.classList.add('tt-over'); }
        scrollRaf = requestAnimationFrame(step);
      };
      scrollRaf = requestAnimationFrame(step);
    }
    function startGhost() {
      const r = d.rect, g = d.el.cloneNode(true);
      g.classList.remove('tt-lifted'); g.classList.add('tt-ghost'); g.removeAttribute('id');
      g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      // keep the look: copy the size and the custom properties that size the card
      const cs = getComputedStyle(d.el);
      Object.assign(g.style, { width: r.width + 'px', height: r.height + 'px', left: '0px', top: '0px', margin: '0' });
      // sizes often come from where the piece sits (".hand .card{--w:…}"); pin them so the copy looks the same off the table
      const VARS = ['--w', '--mw', '--cw', '--tw', '--s'];
      const pin = (src, dst) => { const c = getComputedStyle(src); VARS.forEach((p) => { const v = c.getPropertyValue(p); if (v) dst.style.setProperty(p, v.trim()); }); };
      pin(d.el, g);
      const a = d.el.querySelectorAll('*'), b = g.querySelectorAll('*');
      for (let i = 0; i < Math.min(a.length, b.length, 60); i++) if (a[i] instanceof Element && b[i].style) pin(a[i], b[i]);
      g.style.color = cs.color; g.style.fontSize = cs.fontSize;
      doc.body.appendChild(g);
      d.ghost = g; d.offX = d.x0 - r.left; d.offY = d.y0 - r.top;
      st.src = d.info.key; st.lifted = null; mark();
      rootEl.classList.add('tt-dragging');
      sound('pick');
      moveGhost();
    }
    function moveGhost() {
      const tilt = Math.max(-14, Math.min(14, d.vx * 9));
      d.ghost.style.transform = 'translate(' + (d.x - d.offX) + 'px,' + (d.y - d.offY) + 'px) rotate(' + tilt.toFixed(1) + 'deg) scale(1.07)';
    }
    function endDrag(e, cancel) {
      if (!d || (e && e.pointerId !== d.id)) return;
      const dd = d; d = null;
      rootEl.classList.remove('tt-dragging');
      if (dd.over) dd.over.classList.remove('tt-over');
      if (!dd.moved) { if (!cancel) tapPiece(dd.el, dd.info); return; }
      const g = dd.ghost, gr = g.getBoundingClientRect();
      const zone = cancel ? null : zoneAt(dd.x, dd.y);
      const ok = zone ? attempt(dd.info, zone, g, { x: dd.x, y: dd.y }) : false;
      if (ok) {
        launch(dd.info.key, gr);
        st.src = null;
        // the game redraws: the piece's new home takes over from the ghost
        let gone = false;
        const drop = () => { if (gone) return; gone = true; g.remove(); };
        st.afterDraw = () => requestAnimationFrame(drop);
        setTimeout(() => { if (!gone) { drop(); mark(); } }, 1600);
        if (!zone) drop();
        return;
      }
      // spring back to wherever that piece sits now
      st.src = dd.info.key; mark();
      const home = find(dd.info.key), hr = home ? home.getBoundingClientRect() : dd.rect;
      const done = () => { g.remove(); st.src = null; mark(); };
      if (reduce()) { done(); return; }
      const a = g.animate([{ transform: g.style.transform }, { transform: 'translate(' + hr.left + 'px,' + hr.top + 'px) rotate(0deg) scale(1)' }], { duration: 300, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      a.onfinish = done; setTimeout(done, 600);
    }
    root.addEventListener('pointerup', (e) => endDrag(e, false));
    root.addEventListener('pointercancel', (e) => endDrag(e, true));
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (d) endDrag({ pointerId: d.id }, true); if (st.lifted != null) { st.lifted = null; mark(); } } });

    // taps: a piece lifts; a zone puts the lifted piece down there
    function tapPiece(el, info) {
      // holding one piece and tapping another that sits on a different spot means "put it there"
      if (st.lifted != null && String(st.lifted) !== String(info.key)) {
        const z = el.closest(st.opts.zones), held = find(st.lifted);
        if (z && held && !z.contains(held)) { putOn(z); return; }
      }
      if (st.opts.tap && st.opts.tap(info) === true) return;          // the game handled it
      if (st.lifted != null && String(st.lifted) === String(info.key)) { st.lifted = null; sound('slide'); mark(); return; }
      // one obvious place for it: a tap plays it straight there
      const home = st.opts.home && st.opts.home(info);
      if (home && rootEl.contains(home)) { st.lifted = info.key; putOn(home); return; }
      st.lifted = info.key; sound('pick'); mark();
    }
    rootEl.addEventListener('click', (e) => {
      if (e.target.closest(st.opts.pieces)) return;                    // handled on pointerup
      const z = e.target.closest(st.opts.zones);
      if (st.lifted == null) return;
      const el = find(st.lifted);
      if (!z || !el) { if (!e.target.closest('button,a,input,select,[data-tt-keep]')) { st.lifted = null; mark(); } return; }
      e.preventDefault(); e.stopPropagation();
      putOn(z);
    }, true);
    function putOn(z) {
      const el = find(st.lifted); if (!el) return;
      const info = pieceInfo(el), from = el.getBoundingClientRect();
      st.lifted = null; mark();
      if (attempt(info, z, null, z)) launch(info.key, from);
      else if (!reduce()) shake(find(info.key));
    }
    // keyboard: Enter / Space on a focused piece lifts it, then on a zone puts it down
    rootEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const p = e.target.closest(st.opts.pieces), z = e.target.closest(st.opts.zones);
      if (p && rootEl.contains(p)) { e.preventDefault(); if (!st.opts.canLift || st.opts.canLift(p)) tapPiece(p, pieceInfo(p)); }
      else if (z && st.lifted != null) { e.preventDefault(); z.click(); }
    });
    st.drop = () => { st.lifted = null; st.src = null; mark(); };
    st.lift = (k) => { st.lifted = k; mark(); };
    st.holding = () => st.lifted;
    return st;
  }

  /* ---------------------------------------------------------------- a hand of cards, fanned */
  function fan(el, o) {
    if (!el) return;
    o = o || {};
    const kids = Array.from(el.children).filter((n) => !n.classList.contains('tt-ghost'));
    el.classList.add('tt-fan');
    const n = kids.length; if (!n) return;
    const W = el.clientWidth - (o.pad || 8), w = kids[0].offsetWidth;
    if (!w || W <= 0) return;                                    // not laid out yet; the resize observer fans it once it is
    const gap = o.gap != null ? o.gap : 6;
    // a held hand always overlaps a little; a big hand squeezes in until it fits the table
    let step = o.flat ? w + gap : Math.min(w * (o.show != null ? o.show : 0.74), w + gap);
    if (n > 1 && step * (n - 1) + w > W) step = Math.max(w * 0.22, (W - w) / (n - 1));
    const overlap = !o.flat && step < w + gap;
    const spread = Math.min(o.maxDeg != null ? o.maxDeg : 16, n * 1.6);
    kids.forEach((k, i) => {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      const rot = overlap ? t * spread : 0, y = overlap ? Math.abs(t) * Math.abs(t) * (o.arc != null ? o.arc : 22) : 0;
      k.style.setProperty('--fr', rot.toFixed(2) + 'deg'); k.style.setProperty('--fy', y.toFixed(1) + 'px');
      k.style.marginLeft = i ? (step - w) + 'px' : '0px';
      k.style.zIndex = String(i + 1);
    });
    el.style.justifyContent = 'center';
  }
  // fans re-fit when the window changes size
  let fanT = null;
  root.addEventListener('resize', () => { clearTimeout(fanT); fanT = setTimeout(() => doc.querySelectorAll('.tt-fan').forEach((f) => fan(f, f.__ttFan)), 120); });
  // and whenever the hand itself changes size (it may be drawn while hidden, then shown)
  const ro = root.ResizeObserver ? new ResizeObserver((es) => es.forEach((e) => { const t = e.target; if (!t.isConnected) ro.unobserve(t); else if (t.clientWidth) fan(t, t.__ttFan); })) : null;
  function fanWith(el, o) { if (el) { el.__ttFan = o; fan(el, o); if (ro && !el.__ttRO) { el.__ttRO = 1; ro.observe(el); } } }

  /* ---------------------------------------------------------------- little motions */
  function reveal(el, ms) {
    if (!el || reduce()) return;
    sound('flip');
    el.animate([{ transform: 'perspective(600px) rotateY(90deg)', filter: 'brightness(.7)' }, { transform: 'perspective(600px) rotateY(0deg)', filter: 'none' }], { duration: ms || 320, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }
  function land(el) {
    if (!el || reduce()) return;
    el.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(.97,1.03)', offset: .5 }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
  }

  root.Tabletop = { drag, nope, say, hide, sound, setSound, soundOn: () => soundOn, soundButton, fan: fanWith, launch, takeLaunch, reveal, land, shake, esc };
})(window);
