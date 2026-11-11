/* Un, Deux, Trois, Cat! — the 3D table of the playable build (three.js r128).

   The game itself (index.html) still lays the table out and moves every piece as flat DOM elements: seat labels,
   hand piles, flipped cards, the six toy buttons, flying cards, the Cat Paw swipes. This file draws that same table
   as a real one — a felt table with a wooden rim, the six felt toys as 3D models (the same ones as the mockups in
   img/src/scene.html), real card faces and stacks, soft shadows — seen from above your seat, and hides the flat
   drawings (.board.gl in the page's CSS). Every frame it reads where each flat piece is and puts its 3D piece
   there, so all of the game's rules, timing and motion stay in one place.

   Flat board pixels map to the table top (inches, 2.5 in = one card width). Because the camera is tilted, a point
   on the table is not at its flat pixel on screen, so the seat labels and the toy buttons (the things you read and
   click) are shifted onto their projected spots with the CSS `translate` property; data-gx / data-gy hold that shift
   so the page's own measuring (inBoard) can take it off again.

   No WebGL, or ?flat in the address: this file does nothing and the flat table shows as before. */
(function () {
"use strict";
const board = document.getElementById("board");
if (!board || /[?&]flat\b/.test(location.search)) return;
const REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const IMG = "/games/un-deux-trois-cat/img/";
const VENDOR = "/assets/vendor/three.r128.min.js";

if (window.THREE) boot();
else { const s = document.createElement("script"); s.src = VENDOR; s.onload = boot; document.head.appendChild(s); }

function boot() {
  const THREE = window.THREE;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: /[?&]film\b/.test(location.search) }); } catch (e) { return; }
  if (!renderer.getContext()) return;
  const cv = renderer.domElement; cv.id = "gl"; cv.setAttribute("aria-hidden", "true");
  board.insertBefore(cv, board.firstChild);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const C = (h) => new THREE.Color(h).convertSRGBToLinear();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 400);
  const hemi = new THREE.HemisphereLight(0xfff0e2, 0x5e4260, 0.78); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1dc, 0.78); key.position.set(-7, 19, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0005; scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xf2e6ff, 0.2); fill.position.set(9, 8, 10); scene.add(fill);
  let dirty = true;

  /* ---------- materials ---------- */
  let fs = 3; const fr = () => (fs = (fs * 9301 + 49297) % 233280) / 233280;
  function fibres(g, w, h, n) {
    for (let i = 0; i < n; i++) {
      const x = fr() * w, y = fr() * h, a = fr() * Math.PI, L = 3 + fr() * 9;
      g.strokeStyle = fr() < .5 ? "rgba(255,255,255," + (0.05 + fr() * 0.09) + ")" : "rgba(0,0,0," + (0.05 + fr() * 0.08) + ")";
      g.lineWidth = 0.8 + fr(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
  }
  function canvasTex(w, h, paint, nofibre) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    paint(g, w, h); if (!nofibre) fibres(g, w, h, Math.round(w * h / 90));
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  const felt = (hex) => new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, (g, w, h) => { g.fillStyle = hex; g.fillRect(0, 0, w, h); }), roughness: 1 });
  const bead = (hex, rough) => new THREE.MeshStandardMaterial({ color: C(hex), roughness: rough === undefined ? 0.35 : rough });
  const P = { blue: { b: "#3a72b8", d: "#22497e" }, pink: { b: "#e57fa5", d: "#b04f75" }, orange: { b: "#e9802e", d: "#a95314" }, yellow: { b: "#e9bb2f", d: "#a3790f" }, green: { b: "#4ca055", d: "#2c6a35" } };
  const CREAM = "#f4ebd8", INK = "#2a2421", BROWN = "#6e4a2e";

  /* ---------- the toys (as in img/src/scene.html; inches, sitting on y = 0) ---------- */
  function lathe(len, rfn, n) {
    n = n || 32; const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2(Math.max(0.0001, rfn(t)), (t - 0.5) * len)); }
    const g = new THREE.LatheGeometry(pts, 36); g.rotateZ(-Math.PI / 2); return g;
  }
  const sph = (r, mat, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat); m.scale.set(sx || 1, sy || 1, sz || 1); return m; };
  function eye(r, x, y, z) { const g = new THREE.Group(); g.add(sph(r, bead(CREAM, .5))); const p = sph(r * .55, bead(INK, .2)); p.position.set(0, 0, r * .62); g.add(p); g.position.set(x, y, z); return g; }
  function ball() {
    const t = canvasTex(512, 256, (g, w, h) => { g.fillStyle = P.blue.b; g.fillRect(0, 0, w, h); g.fillStyle = CREAM; g.fillRect(0, h * .44, w, h * .12); g.fillStyle = "rgba(34,73,126,.35)"; g.fillRect(0, h * .435, w, h * .01); g.fillRect(0, h * .555, w, h * .01); });
    const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ map: t, roughness: .95 }));
    b.rotation.z = 0.32; b.rotation.x = 0.2; b.position.y = 1; g.add(b); return g;
  }
  function mouse() {
    const t = canvasTex(512, 256, (g, w, h) => { g.fillStyle = P.pink.b; g.fillRect(0, 0, w, h); g.fillStyle = P.pink.d;
      let s = 5; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 46; i++) { g.beginPath(); g.ellipse(r() * w, h * .12 + r() * h * .76, 6 + r() * 5, 9 + r() * 6, 0, 0, Math.PI * 2); g.fill(); } });
    const len = 3.0, rmax = 0.82;
    const body = new THREE.Mesh(lathe(len, (t) => rmax * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.02)), 0.62) * (1.08 - 0.42 * t)), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
    body.scale.set(1, .86, 1); body.position.y = rmax * .8; const g = new THREE.Group(); g.add(body);
    const pm = felt(P.pink.b), pd = felt(P.pink.d);
    for (const z of [-.42, .42]) { const e = sph(.36, pm, 1, 1, .32); e.position.set(.62, 1.32, z); e.rotation.y = z > 0 ? -.5 : .5; g.add(e); const ei = sph(.22, pd, 1, 1, .3); ei.position.set(.66, 1.32, z + (z > 0 ? .07 : -.07)); ei.rotation.y = e.rotation.y; g.add(ei); }
    for (const z of [-.26, .26]) { const e = sph(.075, bead(INK, .2)); e.position.set(1.05, .9, z); g.add(e); }
    const nose = sph(.07, bead(INK, .3)); nose.position.set(1.5, .6, 0); g.add(nose);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.45, .55, 0), new THREE.Vector3(-1.9, .12, -.15), new THREE.Vector3(-2.35, .06, -.75), new THREE.Vector3(-2.2, .06, -1.35), new THREE.Vector3(-1.7, .06, -1.6)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .038, 8, false), bead(INK, .6)));
    return g;
  }
  function fish() {
    const t = canvasTex(512, 256, (g, w, h) => { g.fillStyle = P.green.b; g.fillRect(0, 0, w, h); g.fillStyle = P.green.d;
      for (let y = 10; y < h; y += 15) for (let x = (y / 15) % 2 ? 8 : 0; x < w; x += 16) { g.save(); g.translate(x, y); g.rotate(.6); g.fillRect(-3, -3, 6, 6); g.restore(); } });
    const len = 3.2, rmax = 1.05;
    const body = new THREE.Mesh(lathe(len, (t) => rmax * Math.pow(Math.sin(Math.PI * (0.08 + 0.9 * t)), 0.75) * (0.55 + 0.5 * t)), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
    body.scale.set(1, .42, 1); body.position.y = rmax * .42; const g = new THREE.Group(); g.add(body);
    const dm = felt(P.green.d);
    for (let i = 0; i < 9; i++) {
      const a = (i - 4) * 0.2, L = 1.0 + ((i * 37) % 5) * .07, lift = ((i * 53) % 7 - 3) * 0.07;
      const x0 = -len / 2 + .1, end = new THREE.Vector3(x0 - Math.cos(a) * L, .34 + lift, Math.sin(a) * L);
      const mid = new THREE.Vector3(x0 - Math.cos(a) * L * .5, .4 + lift * .6, Math.sin(a) * L * .5);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x0, .36, 0), mid, end]), 12, .045, 6, false), dm)); }
    for (const z of [-.95, .95]) { const f = sph(.42, dm, 1, .22, .55); f.position.set(.05, .3, z * .98); f.rotation.y = z > 0 ? .5 : -.5; g.add(f); }
    const top = sph(.42, dm, 1.1, .24, .5); top.position.set(-.1, .78, 0); g.add(top);
    const e = eye(.2, .95, .66, .34); e.rotation.x = -1.1; g.add(e);
    return g;
  }
  function bird() {
    const t = canvasTex(512, 256, (g, w, h) => { g.fillStyle = P.yellow.b; g.fillRect(0, 0, w, h); g.strokeStyle = P.yellow.d; g.lineWidth = 2.6; g.lineCap = "round";
      let s = 9; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 150; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x - 6, y - 4); g.lineTo(x, y + 3); g.lineTo(x + 6, y - 4); g.stroke(); } });
    const ym = new THREE.MeshStandardMaterial({ map: t, roughness: 1 });
    const g = new THREE.Group();
    const body = sph(1, ym, 1.3, .92, .95); body.position.set(.2, .95, 0); g.add(body);
    const head = sph(.66, ym); head.position.set(-.85, 1.78, 0); g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.2, .55, 16), felt(BROWN)); beak.rotation.z = Math.PI / 2; beak.position.set(-1.68, 1.76, 0); g.add(beak);
    for (const z of [-.86, .86]) { const wgt = sph(.62, felt(P.yellow.d), 1.15, .62, .2); wgt.position.set(.4, 1.0, z * .97); wgt.rotation.z = -.25; g.add(wgt); }
    const tailG = new THREE.Mesh(new THREE.BoxGeometry(.9, .1, .62), felt(CREAM)); tailG.position.set(1.7, 1.25, 0); tailG.rotation.z = .65; g.add(tailG);
    for (const z of [-.5, .5]) { const e = eye(.13, -.98, 1.92, z); e.rotation.y = z > 0 ? -.35 : .35 + Math.PI; g.add(e); }
    return g;
  }
  function parsePath(d, sx) {
    const shapes = []; let sh = null; const tok = d.match(/[MCLZ]|-?\d+(\.\d+)?/g); let i = 0; const n = () => parseFloat(tok[i++]);
    while (i < tok.length) { const c = tok[i++];
      if (c === "M") { sh = new THREE.Shape(); shapes.push(sh); sh.moveTo(sx * n(), -n()); }
      else if (c === "C") { const a = [sx * n(), -n(), sx * n(), -n(), sx * n(), -n()]; sh.bezierCurveTo.apply(sh, a); }
      else if (c === "L") sh.lineTo(sx * n(), -n());
    }
    return shapes;
  }
  function butterfly() {
    const half = "M-3 -4 C-18 -42 -58 -48 -57 -18 C-56 0 -32 6 -3 1 Z M-3 5 C-28 8 -48 22 -40 40 C-32 55 -10 42 -3 15 Z";
    const S = 0.032;
    const cvs = document.createElement("canvas"); cvs.width = cvs.height = 512; const g = cvs.getContext("2d");
    g.setTransform(512 / 120, 0, 0, 512 / 120, 256, 256);
    const mirror = (d) => d.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (m, x, _a, y) => `${-parseFloat(x)} ${y}`);
    const wings = new Path2D(half + " " + mirror(half));
    g.fillStyle = P.orange.b; g.fill(wings); g.save(); g.clip(wings);
    g.strokeStyle = P.orange.d; g.lineWidth = 1.6; g.globalAlpha = .75;
    for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) { const a = (-150 + k * 28) * Math.PI / 180, L = 46; g.beginPath(); g.moveTo(0, 2); g.lineTo(sx * Math.abs(L * Math.cos(a)), 2 + L * Math.sin(a)); g.stroke(); }
    g.globalAlpha = 1; g.lineWidth = 7; g.stroke(wings); g.fillStyle = CREAM;
    for (const [x, y, r] of [[-44, -24, 4.5], [-34, -34, 3.5], [-30, 34, 4], [-44, -8, 3]]) for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * x, y, r, 0, Math.PI * 2); g.fill(); }
    g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); fibres(g, 512, 512, 2600);
    const wt = new THREE.CanvasTexture(cvs); wt.encoding = THREE.sRGBEncoding; wt.anisotropy = 4;
    const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 1 }), edge = felt(P.orange.d);
    const grp = new THREE.Group();
    for (const sx of [-1, 1]) {
      const geo = new THREE.ExtrudeGeometry(parsePath(half, sx), { depth: 4, bevelEnabled: true, bevelThickness: 1, bevelSize: .8, bevelSegments: 2, curveSegments: 16 });
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let k = 0; k < p.count; k++) uv.setXY(k, (p.getX(k) + 60) / 120, (p.getY(k) + 60) / 120);
      const m = new THREE.Mesh(geo, [wm, edge]); m.scale.set(S, S, S); m.rotation.x = -Math.PI / 2;
      const hinge = new THREE.Group(); hinge.add(m); hinge.rotation.z = sx * 0.14; hinge.position.y = .1; grp.add(hinge);
    }
    const bm = felt(BROWN);
    const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 1.5, 16), bm); bodyM.rotation.x = Math.PI / 2; bodyM.position.set(0, .3, .1); grp.add(bodyM);
    for (const z of [-.65, .85]) { const c = sph(.16, bm); c.position.set(0, .3, z); grp.add(c); }
    const head = sph(.22, bm); head.position.set(0, .34, -.86); grp.add(head);
    for (const sx of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * .06, .45, -.95), new THREE.Vector3(sx * .2, .75, -1.3), new THREE.Vector3(sx * .52, .9, -1.62)]);
      grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, .025, 6, false), bead(INK, .5)));
      const tip = sph(.065, bead(INK, .3)); tip.position.set(sx * .52, .9, -1.62); grp.add(tip);
    }
    return grp;
  }
  function cat() {
    const t = canvasTex(512, 256, (g, w, h) => { g.fillStyle = "#5d5652"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3a3431"; g.lineWidth = 2.4; g.lineCap = "round";
      let s = 4; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + 5, x, y + 10); g.stroke(); } });
    const gm = new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), dark = felt("#3a3431"), light = felt("#8a827c");
    const g = new THREE.Group();
    const body = sph(1, gm, 1.08, 1.3, .98); body.position.y = 1.28; g.add(body);
    const belly = sph(.6, light, .95, 1.25, .4); belly.position.set(0, 1.08, .78); g.add(belly);
    for (const x of [-.42, .42]) { const pw = sph(.3, gm, 1, .7, 1.2); pw.position.set(x, .2, .72); g.add(pw); }
    const head = sph(.86, gm, 1.05, .95, .95); head.position.y = 2.95; g.add(head);
    for (const x of [-.5, .5]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.32, .66, 20), gm); ear.position.set(x, 3.75, 0); ear.rotation.z = -x * .45; g.add(ear);
      const ein = new THREE.Mesh(new THREE.ConeGeometry(.17, .38, 16), dark); ein.position.set(x * .98, 3.7, .17); ein.rotation.z = -x * .45; g.add(ein);
      const e = sph(.17, bead(CREAM, .4), 1, 1.2, .5); e.position.set(x * .66, 3.05, .78); g.add(e);
      const p = sph(.075, bead(INK, .2), 1, 2, .6); p.position.set(x * .66, 3.05, .86); g.add(p);
    }
    const nose = sph(.08, dark, 1.3, .8, .7); nose.position.set(0, 2.78, .9); g.add(nose);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(.7, .4, -.6), new THREE.Vector3(1.35, .25, -.1), new THREE.Vector3(1.3, .2, .65), new THREE.Vector3(.85, .2, 1.05)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, .2, 10, false), gm));
    return g;
  }
  // the Cat Paw edition's paw on a stick: toes at the origin, the stick running back along −x, lying flat
  const PAWLEN = 8.6;
  function paw() {
    const g = new THREE.Group();
    const plush = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (c, w, h) => { c.fillStyle = "#F4CCD6"; c.fillRect(0, 0, w, h); }), roughness: 1 });
    const silver = new THREE.MeshStandardMaterial({ color: C("#A7A4AA"), roughness: 0.45, metalness: 0.35 });
    const silverIn = new THREE.MeshStandardMaterial({ color: C("#D3CFD3"), roughness: 0.7 });
    const circles = [[-0.12, 0, 1.06], [1.06, 0.4, 0.42], [1.06, -0.4, 0.42], [0.66, 1.0, 0.38], [0.66, -1.0, 0.38]];
    const sh = new THREE.Shape();
    for (let i = 0; i <= 120; i++) {
      const a = i / 120 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let best = 0;
      for (const [cx, cy, r] of circles) { const dc = dx * cx + dy * cy, disc = r * r - (cx * cx + cy * cy) + dc * dc; if (disc >= 0) best = Math.max(best, dc + Math.sqrt(disc)); }
      if (i === 0) sh.moveTo(dx * best, dy * best); else sh.lineTo(dx * best, dy * best);
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.27, bevelSize: 0.2, bevelSegments: 5, curveSegments: 10 });
    const pp = geo.attributes.position, puv = geo.attributes.uv; for (let k = 0; k < pp.count; k++) puv.setXY(k, (pp.getX(k) + 1.5) / 3, (pp.getY(k) + 1.5) / 3);
    const cushion = new THREE.Mesh(geo, plush); cushion.rotation.x = -Math.PI / 2;
    const pawG = new THREE.Group(); pawG.add(cushion);
    const top = 0.22 + 0.27;
    const thread = (pts) => {
      const v3 = pts.map(([x, z]) => new THREE.Vector3(x, top + .02, z));
      pawG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v3, true), 80, .034, 5, true), silver));
      const fsh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const fm = new THREE.Mesh(new THREE.ShapeGeometry(fsh, 12), silverIn); fm.rotation.x = -Math.PI / 2; fm.position.y = top + .008; pawG.add(fm);
    };
    const heart = []; for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2;
      heart.push([-0.32 + .034 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)), .034 * 16 * Math.pow(Math.sin(t), 3)]); }
    thread(heart);
    for (const [x, z] of [[1.0, .38], [1.0, -.38], [0.62, .93], [0.62, -.93]]) {
      const e = []; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; e.push([x + .2 * Math.cos(t), z + .16 * Math.sin(t)]); } thread(e);
    }
    const PS = 1.12, pawX = -1.5 * PS; pawG.scale.setScalar(PS); pawG.position.set(pawX, 0.27 * PS + .01, 0); g.add(pawG);
    const bark = new THREE.MeshStandardMaterial({ map: canvasTex(256, 32, (c, w, h) => { c.fillStyle = "#6E4630"; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 50; i++) { c.fillStyle = fr() < .5 ? "rgba(40,22,12,.35)" : "rgba(160,120,90,.22)"; c.fillRect(fr() * w, fr() * h, 10 + fr() * 40, 1 + fr() * 2); } }, true), roughness: 0.92 });
    const x0 = pawX - 0.2, x1 = -PAWLEN;
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, .2, 0), new THREE.Vector3(x0 - 2.2, .2, .06), new THREE.Vector3(x0 - 4.6, .2, -.05), new THREE.Vector3(x1, .2, .08)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 40, .2, 12, false), bark));
    return g;
  }
  const BUILD = { ball, mouse, fish, bird, fly: butterfly, cat };
  // how each toy sits in its slot: turn, size relative to the others, and the height of its middle (for the click target)
  const TOY = { bird: { yaw: -0.5, s: 1, mid: 1.0 }, fish: { yaw: 0.3, s: 1, mid: 0.3 }, ball: { yaw: 0, s: 1.3, mid: 1.0 },
    mouse: { yaw: 2.8, s: 1, mid: 0.5 }, fly: { yaw: 0.15, s: 1.02, mid: 0.2 }, cat: { yaw: 0, s: 1.15, mid: 1.9 } };
  const SPAN = 3.85;   // the longest toy (the fish, nose to tail tuft), in inches: it fills one toy slot
  const shadowed = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  /* ---------- cards ---------- */
  const CW = 2.5, CH = 3.5, CR = 0.13, CT = 0.022;   // CT: one card's thickness in a stack, a little thicker than life so piles read
  function rr(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function capGeo(w, h, r, flipU) { const g = new THREE.ShapeGeometry(rr(w, h, r), 6); const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + w / 2) / w; uv.setXY(i, flipU ? 1 - u : u, (p.getY(i) + h / 2) / h); } return g; }
  const capUp = capGeo(CW, CH, CR), capDown = capGeo(CW, CH, CR, true);
  capUp.rotateX(-Math.PI / 2); capDown.rotateX(Math.PI / 2);
  const stackGeo = new THREE.ExtrudeGeometry(rr(CW, CH, CR), { depth: 1, bevelEnabled: false, curveSegments: 6 }); stackGeo.rotateX(-Math.PI / 2);
  const glowGeo = new THREE.ShapeGeometry(rr(CW + 0.34, CH + 0.34, CR + 0.17), 6); glowGeo.rotateX(-Math.PI / 2);
  const loader = new THREE.TextureLoader(), texCache = {};
  function tex(name) {
    if (!texCache[name]) { const t = texCache[name] = loader.load(IMG + name, () => { dirty = true; }); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; }
    return texCache[name];
  }
  const matCache = {};
  const cardMat = (name) => matCache[name] || (matCache[name] = new THREE.MeshStandardMaterial({ map: tex(name), roughness: 0.74 }));
  const edgeMat = new THREE.MeshStandardMaterial({ color: C("#EAE2D6"), roughness: 0.85 });
  const BACK = "card-back-240.webp";
  // fetch every card face now, so a flipped card never lands blank
  [BACK].concat(["bird", "fish", "ball", "mouse", "fly"].flatMap((o) => Object.keys(P).map((c) => "card-" + o + "-" + c + "-240.webp"))).forEach(tex);
  const faceName = (el) => { const im = el.querySelector("img"), m = im && /([a-z]+-[a-z]+)\.webp/.exec(im.getAttribute("src") || ""); return m ? "card-" + m[1] + "-240.webp" : null; };
  // one card: face up at flip 0, face down at flip π (it turns about its long axis)
  function makeCard(face, own) {
    const g = new THREE.Group(), turn = new THREE.Group(); g.add(turn);
    const fm = face ? cardMat(face) : cardMat(BACK), bm = cardMat(BACK);
    const up = new THREE.Mesh(capUp, own ? fm.clone() : fm), down = new THREE.Mesh(capDown, own ? bm.clone() : bm);
    up.position.y = 0.006; down.position.y = -0.006; up.castShadow = down.castShadow = true; up.receiveShadow = true; down.receiveShadow = true;
    turn.add(up); turn.add(down); g.userData = { turn, up, down, own: !!own };
    return g;
  }
  function makeStack() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(stackGeo, edgeMat), top = new THREE.Mesh(capUp, cardMat(BACK));
    body.castShadow = top.castShadow = true; body.receiveShadow = top.receiveShadow = true;
    g.add(body); g.add(top); g.userData = { body, top, n: -1, h: 0 };
    return g;
  }
  function setStack(g, n) {
    if (g.userData.n === n) return; g.userData.n = n;
    const h = Math.max(1, n) * CT; g.userData.h = h; g.userData.body.scale.y = h; g.userData.top.position.y = h + 0.004; dirty = true;
  }

  /* ---------- the table ---------- */
  const feltTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    let ws = 11; const wr = () => (ws = (ws * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 9000; i++) { const x = wr() * w, y = wr() * h, a = wr() * Math.PI, L = 2 + wr() * 7;
      g.strokeStyle = wr() < .5 ? "rgba(255,255,255," + (0.05 + wr() * 0.08) + ")" : "rgba(0,0,0," + (0.03 + wr() * 0.05) + ")";
      g.lineWidth = 0.7 + wr() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } }, true);
  feltTex.repeat.set(1 / 7, 1 / 7);
  const woodTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = "#7a5236"; g.fillRect(0, 0, w, h);
    let ws = 5; const wr = () => (ws = (ws * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 160; i++) { g.fillStyle = wr() < .5 ? "rgba(50,28,14,.22)" : "rgba(190,140,100,.16)"; g.fillRect(wr() * w, wr() * h, 30 + wr() * 160, 1 + wr() * 2); } }, true);
  woodTex.repeat.set(1 / 9, 1 / 9);
  const feltMat = new THREE.MeshStandardMaterial({ map: feltTex, roughness: 1, color: C("#5a3f66") });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6, color: C("#c9a585") });
  const tableG = new THREE.Group(); scene.add(tableG);
  let tableSig = "";
  function outline(hw, hh, r, grow) {
    const s = new THREE.Shape(); hw += grow; hh += grow;
    if (r < 0) { s.absellipse(0, 0, hw, hh, 0, Math.PI * 2, false, 0); return s; }
    r = Math.min(r + grow, hw, hh); const x = -hw, y = -hh, w = 2 * hw, h = 2 * hh;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false); return s;
  }
  function buildTable(cx, cz, hw, hh, r) {
    while (tableG.children.length) { const m = tableG.children.pop(); m.geometry.dispose(); }
    const top = new THREE.Mesh(new THREE.ShapeGeometry(outline(hw, hh, r, 0.02), 48), feltMat); top.rotation.x = -Math.PI / 2; top.receiveShadow = true; tableG.add(top);
    const RIM = 0.46, ring = outline(hw, hh, r, RIM); ring.holes.push(new THREE.Path(outline(hw, hh, r, 0).getPoints(48)));
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 48 }), woodMat);
    rim.rotation.x = -Math.PI / 2; rim.position.y = -0.92; rim.castShadow = true; rim.receiveShadow = true; tableG.add(rim);
    tableG.position.set(cx, 0, cz); dirty = true;
  }

  /* ---------- pieces ---------- */
  const toys = {};
  const RING = { legal: C("#79e2a8"), won: C("#ffc94a"), miss: C("#ff7a7a"), pend: C("#f8f3ea"), spot: C("#ffc94a") };
  const ringGeo = new THREE.RingGeometry(0.86, 1.0, 56); ringGeo.rotateX(-Math.PI / 2);
  function getToy(name) {
    if (toys[name]) return toys[name];
    const holder = new THREE.Group(), model = shadowed(BUILD[name]()); model.rotation.y = TOY[name].yaw; holder.add(model);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); ring.position.y = 0.012;
    scene.add(holder); scene.add(ring);
    return (toys[name] = { holder, model, ring, lift: 0, px: null, pz: null });
  }
  const stacks = [];                       // by seat
  const cards = new Map();                 // flipped-card element -> { g, born, ... }
  const flies = new Map();                 // flying-card element -> { g, ... }
  const paws = new Map();                  // .pawswipe element -> group
  const glows = new Map();
  const glowMat = new THREE.MeshBasicMaterial({ color: C("#79e2a8"), transparent: true, opacity: 0.9, depthWrite: false });

  /* ---------- flat board <-> table ---------- */
  let W = 0, H = 0, k = 30, BR = null, dpr = 0, fitSig = "", feltBox = null;
  const wx = (fx) => (fx - W / 2) / k, wz = (fy) => (fy - H / 2) / k;
  const v3 = new THREE.Vector3();
  function project(x, y, z) { v3.set(x, y, z).project(camera); return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H }; }
  function flat(el) {
    const r = el.getBoundingClientRect(); let x = r.left + r.width / 2 - BR.left, y = r.top + r.height / 2 - BR.top;
    const a = el.closest("[data-gx]"); if (a) { x -= +a.dataset.gx; y -= +a.dataset.gy; }
    return { x, y, w: r.width, h: r.height };
  }
  function shift(el, tx, ty, c) {           // move el so its flat centre c lands on screen point (tx, ty)
    const dx = Math.round((tx - c.x) * 2) / 2, dy = Math.round((ty - c.y) * 2) / 2;
    if (el.dataset.gx === String(dx) && el.dataset.gy === String(dy)) return;
    el.dataset.gx = dx; el.dataset.gy = dy; el.style.translate = dx + "px " + dy + "px";
  }
  // frame the table as large as the board allows: the wooden rim and every seat label (a fixed size on screen) stay inside
  function fit(F) {
    const long = W / H < 0.95, el = (long ? 66 : 61) * Math.PI / 180, hw = W / 2 / k, hh = H / 2 / k;
    camera.aspect = W / H; camera.fov = 26;
    const pts = [];
    if (F.felt) { const f = F.felt, g = 0.56;
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        if (f.r < 0) pts.push([f.x + (f.hw + g) * c, f.z + (f.hh + g) * s]);
        else { const m = Math.max(Math.abs(c) / (f.hw + g), Math.abs(s) / (f.hh + g)); pts.push([f.x + c / m, f.z + s / m]); } } }
    else pts.push([-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]);
    const box = (dist) => {
      camera.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      const take = (x, y, ex, ey) => { x0 = Math.min(x0, x - ex); x1 = Math.max(x1, x + ex); y0 = Math.min(y0, y - ey); y1 = Math.max(y1, y + ey); };
      for (const [x, z] of pts) { v3.set(x, 0, z).project(camera); take(v3.x, v3.y, 0, 0); }
      for (const L of F.labels) { v3.set(wx(L.x), 0, wz(L.y)).project(camera); take(v3.x, v3.y, L.w / W, L.h / H); }
      return [x0, x1, y0, y1];
    };
    let lo = 2, hi = 2000;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2, b = box(mid); if (b[1] - b[0] > 1.985 || b[3] - b[2] > 1.985) lo = mid; else hi = mid; }
    const b = box(hi);
    camera.near = Math.max(1, hi * 0.2); camera.far = hi * 3; camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] += (b[0] + b[1]) / 2;      // lens shift: centre the table in the frame
    camera.projectionMatrix.elements[9] += (b[2] + b[3]) / 2;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const R = Math.max(hw, hh) + 3; Object.assign(key.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 80 });
    key.shadow.camera.updateProjectionMatrix();
    dirty = true;
  }

  /* ---------- which way each player's cards face ----------
     In life a card faces the player who flipped it. The page lays the table out with each seat's cards and pile at
     the nearest quarter turn (side seats sideways, far seats upside down); here they are turned exactly toward
     their seat when that still leaves them clear of everything else on the table. Angles are flat, clockwise. */
  const corners = (o) => { const c = Math.cos(o.a), s = Math.sin(o.a), hw = o.w / 2, hh = o.h / 2;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [o.x + x * c - y * s, o.y + x * s + y * c]); };
  function polyHit(A, B) {
    for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], nx = b[1] - a[1], ny = a[0] - b[0];
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const p of A) { const d = p[0] * nx + p[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
      for (const p of B) { const d = p[0] * nx + p[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
      if (a1 < b0 || b1 < a0) return false;
    }
    return true;
  }
  function circHit(P, cx, cy, r) {
    let inside = true;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1];
      if ((cx - a[0]) * dy - (cy - a[1]) * dx > 0) inside = false;
      const t = Math.max(0, Math.min(1, ((cx - a[0]) * dx + (cy - a[1]) * dy) / (dx * dx + dy * dy)));
      if (Math.hypot(cx - a[0] - t * dx, cy - a[1] - t * dy) < r) return true;
    }
    return inside;
  }
  let yawSig = "", yaws = [];
  function seatYaws(seats, toyC, tr) {
    // seats: [{label: {x,y,w,h}, face: {x,y,w,h}|null, pile: {x,y,w,h}|null}], toyC: [[x, y]], tr: toy radius
    const M = 4, grow = (o, a) => ({ x: o.x, y: o.y, w: o.w + M, h: o.h + M, a });
    const out = seats.map(() => 0), done = seats.map(() => true);
    const clear = (i, a) => {
      const mine = [seats[i].face, seats[i].pile].filter(Boolean).map((o) => corners(grow(o, a)));
      if (mine.length === 2 && polyHit(mine[0], mine[1])) return false;
      for (const P of mine) {
        for (const p of P) if (p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H) return false;
        for (const [x, y] of toyC) if (circHit(P, x, y, tr + 2)) return false;
        for (let j = 0; j < seats.length; j++) {
          if (polyHit(P, corners({ x: seats[j].label.x, y: seats[j].label.y, w: seats[j].label.w, h: seats[j].label.h, a: 0 }))) return false;
          if (j !== i) for (const o of [seats[j].face, seats[j].pile]) if (o && polyHit(P, corners(grow(o, done[j] ? out[j] : 0)))) return false;
        }
      }
      return true;
    };
    seats.forEach((s, i) => {
      const q = s.face || s.pile; if (!q) return;
      const mx = ((s.face ? s.face.x : q.x) + (s.pile ? s.pile.x : q.x)) / 2, my = ((s.face ? s.face.y : q.y) + (s.pile ? s.pile.y : q.y)) / 2;
      const th = Math.atan2(mx - s.label.x, -(my - s.label.y));
      const q4 = s.el.dataset.q !== undefined && s.el.dataset.q !== "" ? +s.el.dataset.q * Math.PI / 180 : Math.round(th / (Math.PI / 2)) * Math.PI / 2;
      out[i] = q4; if (!s.el.dataset.qfix) s.th = Math.abs(th - q4) > Math.PI ? th - Math.sign(th - q4) * 2 * Math.PI : th;   // the page laid the table out for quarter turns (place())
    });
    seats.forEach((s, i) => { if (s.th !== undefined && Math.abs(s.th - out[i]) > 0.02 && clear(i, s.th)) out[i] = s.th; });
    return out;
  }

  /* ---------- every frame: read the flat table, pose the 3D one ---------- */
  const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const num = (el, p) => parseFloat(el.style.getPropertyValue(p)) || 0;
  const $ = (id) => document.getElementById(id);
  let last = 0, hash = 0, lastHash = -1, on = false;
  const mix = (v) => { hash = (hash * 31 + Math.round(v * 200)) | 0; };
  function setPose(o, x, y, z) { o.position.set(x, y, z); mix(x); mix(y); mix(z); }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !board.offsetParent) return;
    BR = board.getBoundingClientRect();
    const w = Math.round(BR.width), h = Math.round(BR.height);
    if (w < 40 || h < 40) return;
    const cw = num(board, "--cw"), t = num(board, "--t");
    if (!cw || !t) return;
    if (!on) { on = true; board.classList.add("gl"); window.dispatchEvent(new Event("udtc3d")); return; }
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016; last = now;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    if (w !== W || h !== H || pr !== dpr) { W = w; H = h; dpr = pr; renderer.setPixelRatio(pr); renderer.setSize(W, H, false); fitSig = ""; }
    k = cw / CW;
    hash = 7;

    // seats: labels, piles and flipped-card rows, measured flat
    const labels = [...document.querySelectorAll("#seats .seat")], seats = [];
    const pileEls = {}, faceEls = {};
    document.querySelectorAll("#table .pile").forEach((el) => { pileEls[+el.dataset.seat] = el; });
    document.querySelectorAll("#table .faces").forEach((el) => { faceEls[+el.dataset.seat] = el; });
    labels.forEach((el, i) => {
      const L = flat(el), pe = pileEls[i], fe2 = faceEls[i];
      const n = fe2 ? fe2.children.length : 0;
      seats.push({ el, label: L, pile: pe ? Object.assign(flat(pe), { w: cw, h: cw * 1.4 }) : null,
        face: fe2 && n ? Object.assign(flat(fe2), { w: n * cw + (n - 1) * 6, h: cw * 1.4 }) : null, pe, fe: fe2, n });
    });
    const toyEls = {}; document.querySelectorAll("#grab .toy").forEach((el) => { toyEls[el.dataset.t] = el; });
    const homes = Object.keys(toyEls).filter((o) => toyEls[o].style.left).map((o) => [parseFloat(toyEls[o].style.left), parseFloat(toyEls[o].style.top)]);
    const ys = seats.map((s) => [s.label, s.pile, s.face].map((o) => o ? [o.x, o.y, o.w].map((v) => v.toFixed(0)).join(",") : "-").join(";")).join("/") + "|" + homes.join(";") + "|" + t.toFixed(0) + "|" + W + "x" + H;
    if (ys !== yawSig) { yawSig = ys; yaws = seatYaws(seats, homes, t / 2); }

    // the table top follows the page's felt shape, grown where needed so that every card and pile lies on it
    const fe = $("felt");
    if (fe && fe.style.width) {
      const fw = parseFloat(fe.style.width), fh = parseFloat(fe.style.height), fl = parseFloat(fe.style.left), ft = parseFloat(fe.style.top);
      const oval = /%/.test(fe.style.borderRadius), fcx = fl + fw / 2, fcy = ft + fh / 2, PAD = 0.22 * k;
      let hw = fw / 2, hh = fh / 2, g = 1;
      seats.forEach((sq, i) => [sq.face, sq.pile].forEach((o) => { if (!o) return;
        for (const [x, y] of corners({ x: o.x, y: o.y, w: o.w + 2 * PAD, h: o.h + 2 * PAD, a: yaws[i] || 0 })) {
          if (oval) g = Math.max(g, Math.hypot((x - fcx) / hw, (y - fcy) / hh)); else { hw = Math.max(hw, Math.abs(x - fcx)); hh = Math.max(hh, Math.abs(y - fcy)); } } }));
      hw *= g; hh *= g;
      const sig = [fcx, fcy, Math.ceil(hw / 4) * 4, Math.ceil(hh / 4) * 4, oval, k.toFixed(3), W, H].join("|");
      if (sig !== tableSig) {
        tableSig = sig; hw = Math.ceil(hw / 4) * 4; hh = Math.ceil(hh / 4) * 4;
        feltBox = { x: wx(fcx), z: wz(fcy), hw: hw / k, hh: hh / k, r: oval ? -1 : Math.min(0.9, Math.min(hw, hh) / k) };
        buildTable(feltBox.x, feltBox.z, feltBox.hw, feltBox.hh, feltBox.r);
      }
    }
    // (label sizes are rounded up so a score going from 9 to 10 doesn't nudge the camera)
    const q12 = (v) => Math.ceil(v / 12) * 12;
    const fs2 = tableSig + "#" + seats.map((s) => [Math.round(s.label.x), Math.round(s.label.y), q12(s.label.w), q12(s.label.h)].join(",")).join(";");
    if (fs2 !== fitSig) { fitSig = fs2; fit({ felt: feltBox, labels: seats.map((s) => ({ x: s.label.x, y: s.label.y, w: q12(s.label.w), h: q12(s.label.h) })) }); }
    // labels sit at the projected rim, kept inside the board
    // (far seats are drawn smaller but their labels are not, so a label is nudged outward until it clears its own cards)
    seats.forEach((s, i) => {
      const p = project(wx(s.label.x), 0, wz(s.label.y)), hw = s.label.w / 2 + 3, hh = s.label.h / 2 + 3;
      const boxes = [s.face, s.pile].filter(Boolean).map((o) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const [x, y] of corners({ x: o.x, y: o.y, w: o.w, h: o.h, a: yaws[i] || 0 })) { const q = project(wx(x), 0.05, wz(y)); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        return [x0, x1, y0, y1]; });
      if (boxes.length) {
        const cx = boxes.reduce((a2, b) => a2 + (b[0] + b[1]) / 2, 0) / boxes.length, cy = boxes.reduce((a2, b) => a2 + (b[2] + b[3]) / 2, 0) / boxes.length;
        const L = Math.hypot(p.x - cx, p.y - cy) || 1, ux = (p.x - cx) / L, uy = (p.y - cy) / L;
        for (let n = 0; n < 16 && boxes.some((b) => p.x + hw > b[0] && p.x - hw < b[1] && p.y + hh > b[2] && p.y - hh < b[3]); n++) { p.x += ux * 2; p.y += uy * 2; }
      }
      shift(s.el, Math.max(s.label.w / 2, Math.min(W - s.label.w / 2, p.x)), Math.max(s.label.h / 2 - 16, Math.min(H - s.label.h / 2 + 16, p.y)), s.label);
    });
    const chant = $("chant");
    if (chant) { const p = project(0, 0, 0); shift(chant, p.x, p.y, { x: W / 2, y: H / 2 }); }

    // hand piles
    seats.forEach((s, i) => {
      let g = stacks[i];
      const empty = !s.pe || s.pe.classList.contains("empty");
      if (empty) { if (g && g.visible) { g.visible = false; dirty = true; } return; }
      if (!g) { g = stacks[i] = makeStack(); scene.add(g); }
      if (!g.visible) { g.visible = true; dirty = true; }
      const m = /(\d+) cards/.exec(s.pe.getAttribute("aria-label") || ""); setStack(g, m ? +m[1] : 8);
      setPose(g, wx(s.pile.x), 0, wz(s.pile.y)); g.rotation.y = -(yaws[i] || 0); mix(g.rotation.y);
    });
    for (let i = seats.length; i < stacks.length; i++) if (stacks[i] && stacks[i].visible) { stacks[i].visible = false; dirty = true; }

    // flipped cards: each one leaves its hand pile, turns over in the air and lands in front of its player
    const seen = new Set(), glowSeen = new Set();
    seats.forEach((s, i) => {
      if (!s.fe) return;
      [...s.fe.children].forEach((el, j) => {
        if (!el.classList.contains("flip")) return;
        seen.add(el);
        let c = cards.get(el);
        if (!c) { c = { g: makeCard(faceName(el)), born: now + (REDUCED ? -1e6 : j * 80) }; cards.set(el, c); scene.add(c.g); dirty = true; }
        const a = yaws[i] || 0, off = (j - (s.n - 1) / 2) * (cw + 6);
        const fx = s.face.x + off * Math.cos(a), fy = s.face.y + off * Math.sin(a);
        const u = (now - c.born) / 460, e = ease(u), st = stacks[i], sh = st && st.visible ? st.userData.h : 0;
        const x = wx(s.pile.x + (fx - s.pile.x) * e), z = wz(s.pile.y + (fy - s.pile.y) * e);
        const y = u >= 1 ? 0.012 : sh * (1 - e) + 0.012 + Math.sin(Math.PI * Math.max(0, Math.min(1, u))) * 1.25;
        setPose(c.g, x, y, z); c.g.rotation.y = -a; c.g.userData.turn.rotation.z = u >= 1 ? 0 : Math.PI * (1 - ease(u * 1.15)); mix(c.g.userData.turn.rotation.z);
        const vis = el.style.visibility !== "hidden" && u > 0;
        if (c.g.visible !== vis) { c.g.visible = vis; dirty = true; }
        if (el.classList.contains("hint") && vis) {
          glowSeen.add(el); let gl = glows.get(el);
          if (!gl) { gl = new THREE.Mesh(glowGeo, glowMat); glows.set(el, gl); scene.add(gl); dirty = true; }
          gl.position.set(x, 0.006, z); gl.rotation.y = -a;
        }
      });
    });
    cards.forEach((c, el) => { if (!seen.has(el)) { scene.remove(c.g); cards.delete(el); dirty = true; } });
    glows.forEach((g, el) => { if (!glowSeen.has(el)) { scene.remove(g); glows.delete(el); dirty = true; } });

    // cards in the air: into a point pile, out of one, or swept to the discard
    const flying = new Set();
    board.querySelectorAll(":scope > .card.fly").forEach((el) => {
      flying.add(el);
      const cs = getComputedStyle(el), c0 = flat(el), back = el.querySelector(".back");
      let f = flies.get(el);
      const down = !!back && parseFloat(getComputedStyle(back).opacity) > 0.5;
      if (!f) {
        let yaw = (Math.random() - 0.5) * 0.5, best = 20;
        cards.forEach((c) => { const p = project(c.g.position.x, 0, c.g.position.z), q = project(wx(c0.x), 0, wz(c0.y)), d = Math.hypot(p.x - q.x, p.y - q.y); if (d < best) { best = d; yaw = c.g.rotation.y; } });
        f = { g: makeCard(faceName(el), true), flip: down ? Math.PI : 0, lift: 0, x: c0.x, y: c0.y, yaw };
        for (const m of [f.g.userData.up, f.g.userData.down]) m.material.transparent = true;
        flies.set(el, f); scene.add(f.g); dirty = true;
      }
      const target = down ? Math.PI : 0, step = Math.PI * dt / 0.2;
      f.flip += Math.max(-step, Math.min(step, target - f.flip));
      const speed = Math.hypot(c0.x - f.x, c0.y - f.y) / k / dt; f.x = c0.x; f.y = c0.y;
      f.lift += (Math.min(1.3, speed * 0.07) - f.lift) * Math.min(1, dt * 9);
      let sc = 1; const tf = cs.transform;
      if (tf && tf !== "none") { const m = new DOMMatrix(tf); sc = Math.max(0.05, Math.hypot(m.c, m.d)); }
      sc *= (parseFloat(el.style.height) || cw * 1.4) / (cw * 1.4);
      const rem = Math.abs(target - f.flip) / Math.PI, room = rem > 0.003 ? Math.sin((1 - rem) * Math.PI) * 1.3 * sc : 0;   // a turning card needs room under it
      setPose(f.g, wx(c0.x), 0.03 + Math.max(f.lift, room), wz(c0.y));
      f.g.rotation.y = f.yaw; f.g.userData.turn.rotation.z = f.flip; f.g.scale.setScalar(sc); mix(f.flip); mix(sc);
      const op = parseFloat(cs.opacity); f.g.userData.up.material.opacity = f.g.userData.down.material.opacity = op; mix(op);
      f.g.visible = op > 0.02;
    });
    flies.forEach((f, el) => { if (!flying.has(el)) { f.g.userData.up.material.dispose(); f.g.userData.down.material.dispose(); scene.remove(f.g); flies.delete(el); dirty = true; } });

    // the toys
    const spot = $("grab") && $("grab").classList.contains("spot");
    const G = (t / k) / SPAN;
    for (const name in toyEls) {
      const el = toyEls[name], co = el.querySelector(".coaster"); if (!co || !el.style.left) continue;
      const T3 = getToy(name), c0 = flat(co), sc = Math.max(0.2, c0.w / t) * G * TOY[name].s;
      const x = wx(c0.x), z = wz(c0.y);
      const speed = T3.px === null ? 0 : Math.hypot(x - T3.px, z - T3.pz) / dt; T3.px = x; T3.pz = z;
      // resting on a hand pile it sits on top of the cards; moving, it's in a hand above the table
      let rest = 0;
      if (el.classList.contains("held")) stacks.forEach((g) => { if (g && g.visible && Math.hypot(g.position.x - x, g.position.z - z) < CH * 0.6) rest = Math.max(rest, g.userData.h); });
      const hover = !el.disabled && el.matches(":hover") ? 0.22 : 0;
      const want = rest + hover + Math.min(1.4, speed * 0.06) + (el.classList.contains("won") && !el.classList.contains("held") ? 0.3 : 0);
      T3.lift += (want - T3.lift) * Math.min(1, dt * (want > T3.lift ? 14 : 8));
      if (Math.abs(want - T3.lift) < 0.002) T3.lift = want;
      setPose(T3.holder, x, T3.lift, z); T3.holder.scale.setScalar(sc); mix(sc);
      // the click target and its labels follow the toy on screen
      const p = project(x, T3.lift + TOY[name].mid * sc, z), b0 = flat(el);
      shift(el, p.x, p.y, b0);
      const cl = el.classList, st = cl.contains("miss") ? "miss" : cl.contains("won") ? "won" : cl.contains("pend") ? "pend" : cl.contains("legal") ? "legal" : spot ? "spot" : "";
      const ring = T3.ring, rs = (c0.w / t) * (t / k) / 2;
      let op = st ? (st === "pend" ? 0.55 : 0.95) : 0;
      if (st === "spot") { op = 0.45 + 0.4 * Math.sin(now / 220); }
      if (st) ring.material.color.copy(RING[st]);
      ring.material.opacity = op; ring.visible = op > 0.01; ring.position.set(x, rest + 0.012, z); ring.scale.setScalar(rs); mix(op); mix(rs);
    }

    // the Cat Paw edition's paw on a stick
    const pawSeen = new Set();
    board.querySelectorAll(":scope > .pawswipe").forEach((el) => {
      const q = el._paw; if (!q) return;
      pawSeen.add(el);
      let g = paws.get(el);
      if (!g) { g = shadowed(paw()); paws.set(el, g); scene.add(g); dirty = true; }
      const cs = getComputedStyle(el), tf = cs.transform, a = q.ang * Math.PI / 180;
      let along = 0; if (tf && tf !== "none") { const m = new DOMMatrix(tf); along = m.e * Math.cos(a) + m.f * Math.sin(a); }
      const tipX = q.sx + Math.cos(a) * (q.len + along), tipY = q.sy + Math.sin(a) * (q.len + along);
      const sc = Math.max(0.5, (q.h / k) / 2.75);
      setPose(g, wx(tipX), 0.28, wz(tipY)); g.rotation.y = -a; g.scale.setScalar(sc);
      const vis = parseFloat(cs.opacity) > 0.12; if (g.visible !== vis) { g.visible = vis; dirty = true; }
    });
    paws.forEach((g, el) => { if (!pawSeen.has(el)) { scene.remove(g); g.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); paws.delete(el); dirty = true; } });

    if (dirty || hash !== lastHash) { lastHash = hash; dirty = false; renderer.render(scene, camera); window.__gl3dFrames = (window.__gl3dFrames || 0) + 1; }
  }
  window.UDTC_3D = { project: (fx, fy) => project(wx(fx), 0, wz(fy)), ready: () => on, build: BUILD };   // build: the toy models, for video/src/toys.html
  requestAnimationFrame(frame);
}
})();
