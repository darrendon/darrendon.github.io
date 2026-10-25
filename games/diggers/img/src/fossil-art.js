// ===================== FOSSIL ART =====================
// Each species is one fossil slab, 3 cards wide by 3 tall. Card v (1-9) is the slab cell in
// reading order: 1 2 3 / 4 5 6 / 7 8 9. Lay a species' nine cards out that way and the skeleton is whole.
const SPECIES = [
  { key: "rex", name: "Tyrannosaurus", rock: "red sandstone", suit: "#d23a2a", base: "#b2523a", bands: ["#c0603f", "#a5482f", "#cc6c48", "#b85a3d", "#a9503a"], seed: 11, sym: "M6.5 2.2C13.5 3.2 18.6 8.6 18.4 15.2C18.3 18.4 17.2 20.6 15.6 22.2L14.2 20.2L12.6 21.6L11.6 19.4L9.8 20.4C10.6 14.6 10 8 6.5 2.2Z" },
  { key: "tri", name: "Triceratops", rock: "orange ironstone", suit: "#e8862a", base: "#c27a35", bands: ["#cf8740", "#b56e2e", "#d9924a", "#c47d38", "#ba7332"], seed: 23, sym: "M2.5 16.5C2.5 9.5 6.8 5 12 5C17.2 5 21.5 9.5 21.5 16.5L17.6 16.5L15 22L9 22L6.4 16.5ZM7.2 12.6L4.2 2.6L10 11ZM16.8 12.6L19.8 2.6L14 11ZM10.6 17.4L12 13.6L13.4 17.4Z" },
  { key: "stego", name: "Stegosaurus", rock: "green mudstone", suit: "#3fa155", base: "#5f9460", bands: ["#6aa16a", "#558a56", "#77ad74", "#5c935d", "#669b64"], seed: 37, sym: "M2 20H22V22.5H2ZM3.2 20C2.6 15.4 4 11.2 6.6 8.2C9.2 11.2 10.4 15.4 9.8 20ZM9.4 20C8.8 13.8 10.2 7.6 12.6 3C15.2 7.6 16.6 13.8 15.8 20ZM15.4 20C14.9 16 16 12.4 18.4 10C20.6 12.4 21.6 16 21 20Z" },
  { key: "bronto", name: "Brontosaurus", rock: "purple shale", suit: "#8a55c4", base: "#8a6aa8", bands: ["#9677b4", "#7e5f9c", "#a283bf", "#8768a5", "#9172ae"], seed: 41, sym: "M1.5 21.5C2 15.5 6.2 12.4 10.8 12.6C12.4 12.7 13.2 11 13.4 8.6C13.6 5.2 15.2 2.8 18.4 2.6L21.4 3.2L22.4 4.6L20.8 5.6L18.6 5.4C16.6 5.8 16.4 8.4 16.6 11.6C16.8 14.6 17.6 17.2 17.4 21.5L14.6 21.5L14.4 18L9.6 18L9.4 21.5L6.6 21.5L6.4 18.2C4.6 18.6 3.6 19.8 3.4 21.5Z" },
  { key: "ankylo", name: "Ankylosaurus", rock: "blue slate", suit: "#3a7fc4", base: "#5a84ad", bands: ["#6690b9", "#4f79a2", "#729cc4", "#5a86af", "#6189b2"], seed: 53, sym: "M1.5 12.6L13 11.2L13 13.4L1.5 14.4ZM12 12.2C12 9 14 7 16.6 7.4C18.4 7.6 19.2 8.8 19.4 9.6C21.4 9.8 22.6 11 22.6 12.4C22.6 13.8 21.4 15 19.4 15.2C19.2 16 18.4 17.2 16.6 17.4C14 17.8 12 15.6 12 12.2Z" },
  { key: "para", name: "Parasaurolophus", rock: "golden limestone", suit: "#e0b52d", base: "#c4a14a", bands: ["#d0ad55", "#b8953f", "#dab863", "#c6a24b", "#bd9b45"], seed: 67, sym: "M2.4 15.6C2.6 12.6 5.4 11.2 8.6 11L12.6 10.4L19.6 2.6C20.4 1.8 21.8 2.6 21.4 3.6L15.8 11.4C17.2 12.6 17.2 15.6 15.2 17C13.8 18 12 18.2 10 18.2L5.4 18.4C3.6 18.4 2.4 17.2 2.4 15.6ZM12.4 13.2A1.3 1.3 0 1 0 12.41 13.2Z" },
];
const BONE_NAMES = ["Jaws", "Skull", "Tail", "Shoulder", "Ribs", "Hips", "Forefoot", "Hind leg", "Hind foot"];
const BONE_OVERRIDES = {
  rex: { 4: "Arm", 7: "Far foot" },
  tri: { 1: "Horns & beak", 2: "Frill" },
  stego: { 1: "Skull", 2: "Neck & plates", 3: "Thagomizer" },
  bronto: { 1: "Skull", 2: "Long neck", 3: "Whip tail" },
  ankylo: { 1: "Skull", 2: "Horns", 3: "Tail club" },
  para: { 1: "Bill", 2: "Crest" },
};
function boneName(sp, v) { const o = BONE_OVERRIDES[SPECIES[sp].key]; return (o && o[v]) || BONE_NAMES[v - 1]; }

const FossilArt = (() => {
  const WW = 300, WH = 420; // world units: 3 x 3 cells of 100 x 140
  const BONE = "#ece2c6", BONE_LO = "#b9a476", BONE_HI = "#faf3e1", OUTL = "#24190f", HOLE = "#2a1d12";

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function spline(pts, n = 10) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function resample(pts, step) {
    const out = [pts[0]]; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      let [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
      let d = Math.hypot(x1 - x0, y1 - y0);
      while (acc + d >= step) { const r = (step - acc) / d; x0 = x0 + (x1 - x0) * r; y0 = y0 + (y1 - y0) * r; out.push([x0, y0]); d = Math.hypot(x1 - x0, y1 - y0); acc = 0; }
      acc += d;
    }
    return out;
  }
  function yAt(path, x) { let best = path[0]; for (const p of path) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return best[1]; }
  function closedSmooth(ctx, pts) {
    const n = pts.length;
    ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  }

  // A pen draws the same geometry in passes: outline, fill, shade, detail.
  const NEAR = { b: "#f7f0dc", lo: "#cbb68b", hi: "#fffcf3" }, FAR = { b: "#c9b893", lo: "#a08b63", hi: "#ddcfae" };
  function pen(ctx, mode, far = false) {
    const OW = 1.8;
    const P = { ctx, mode };
    const BONE = far ? FAR.b : NEAR.b, BONE_LO = far ? FAR.lo : NEAR.lo, BONE_HI = far ? FAR.hi : NEAR.hi;
    P.line = (pts, w) => {
      const build = (dx = 0, dy = 0) => { ctx.beginPath(); ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + dx, pts[i][1] + dy); };
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (mode === "out") { build(); ctx.strokeStyle = OUTL; ctx.lineWidth = w + OW; ctx.stroke(); }
      else if (mode === "fill") { build(); ctx.strokeStyle = BONE; ctx.lineWidth = w; ctx.stroke(); }
      else if (mode === "shade" && w >= 2) {
        build(w * 0.16, w * 0.2); ctx.strokeStyle = BONE_LO; ctx.lineWidth = w * 0.42; ctx.stroke();
        build(-w * 0.14, -w * 0.18); ctx.strokeStyle = BONE_HI; ctx.lineWidth = w * 0.22; ctx.stroke();
      }
    };
    const shape = (build, opts = {}) => {
      if (mode === "out") { ctx.beginPath(); build(); ctx.fillStyle = OUTL; ctx.fill(); ctx.strokeStyle = OUTL; ctx.lineWidth = OW; ctx.lineJoin = "round"; ctx.stroke(); }
      else if (mode === "fill") { ctx.beginPath(); build(); ctx.fillStyle = BONE; ctx.fill(); }
      else if (mode === "shade") {
        ctx.save(); ctx.beginPath(); build(); ctx.clip();
        ctx.translate(-1.4, -1.8); ctx.beginPath(); build(); ctx.strokeStyle = BONE_LO; ctx.lineWidth = opts.shadeW || 3.4; ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.beginPath(); build(); ctx.clip();
        ctx.translate(1.1, 1.4); ctx.beginPath(); build(); ctx.strokeStyle = BONE_HI; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.restore();
      }
    };
    P.poly = (pts, smooth = true, opts) => shape(() => { if (smooth) closedSmooth(ctx, pts); else { ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); } }, opts);
    P.ell = (x, y, rx, ry, rot = 0, opts) => shape(() => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2), opts || { shadeW: Math.min(rx, ry) * 0.7 });
    P.knob = (x, y, r) => P.ell(x, y, r, r * 0.9, 0, { shadeW: r * 0.6 });
    P.holeEll = (x, y, rx, ry, rot = 0) => { if (mode !== "detail") return; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = HOLE; ctx.fill(); };
    P.holePoly = (pts) => { if (mode !== "detail") return; ctx.beginPath(); closedSmooth(ctx, pts); ctx.fillStyle = HOLE; ctx.fill(); };
    P.detail = fn => { if (mode === "detail") fn(ctx); };
    P.far = far ? P : pen(ctx, mode, true);
    P.place = (o, fn) => { ctx.save(); ctx.translate(...o.at); ctx.rotate(o.rot || 0); ctx.scale(o.flip ? -o.k : o.k, o.k); ctx.translate(-o.anchor[0], -o.anchor[1]); fn(); ctx.restore(); };
    P.xf = (tx, ty, k, fn) => { ctx.save(); ctx.translate(tx, ty); ctx.scale(k, k); fn(); ctx.restore(); };
    return P;
  }

  // ---------- shared anatomy ----------
  function vert(P, pts, o) {
    const path = resample(spline(pts, 12), o.step);
    const L = path.length;
    path.forEach((p, i) => {
      const t = L > 1 ? i / (L - 1) : 0, s = o.size(t);
      const q = path[Math.min(i + 1, L - 1)], r = path[Math.max(i - 1, 0)];
      const a = Math.atan2(q[1] - r[1], q[0] - r[0]);
      const nx = Math.sin(a), ny = -Math.cos(a), tx = Math.cos(a), ty = Math.sin(a);
      const sp = o.spine ? o.spine(t) : 0;
      if (sp > 0.5) P.line([[p[0], p[1]], [p[0] + nx * sp - tx * sp * 0.3, p[1] + ny * sp - ty * sp * 0.3]], Math.max(1.4, s * 0.32));
      const ch = o.chevron ? o.chevron(t) : 0;
      if (ch > 0.5) P.line([[p[0], p[1]], [p[0] - nx * ch - tx * ch * 0.45, p[1] - ny * ch - ty * ch * 0.45]], Math.max(1.2, s * 0.24));
      const cr = o.cervical ? o.cervical(t) : 0;
      if (cr > 0.5) P.line([[p[0] - nx * s * 0.3, p[1] - ny * s * 0.3], [p[0] - nx * s * 0.6 + tx * cr, p[1] - ny * s * 0.6 + ty * cr]], 1.3);
      P.ell(p[0], p[1], s * 0.62, s * 0.44, a, { shadeW: s * 0.35 });
    });
    return path;
  }
  function ribs(P, path, x0, x1, n, len, lean = 0.3, w = 4.2) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), x = x0 + (x1 - x0) * t, y = yAt(path, x), L = len(t);
      P.line(spline([[x, y + 2], [x + L * lean, y + L * 0.42], [x + L * lean * 0.78, y + L * 0.78], [x + L * lean * 0.4, y + L]], 6), w * (1 - 0.3 * Math.abs(t - 0.4)));
    }
  }

  function gastralia(P, x0, x1, y, n) {
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * i / (n - 1); P.line([[x - 7, y - 3], [x, y + 3], [x + 7, y - 3]], 1.8); }
  }
  function limb(P, pts, ws) {
    for (let i = 0; i < pts.length - 1; i++) P.line([pts[i], pts[i + 1]], ws[i]);
    for (let i = 0; i < pts.length - 1; i++) if (ws[i] >= 4.5) { P.knob(pts[i][0], pts[i][1], ws[i] * 0.62); P.knob(pts[i + 1][0], pts[i + 1][1], ws[i] * 0.55); }
  }
  function toes(P, x, y, dirs, len, w) { for (const d of dirs) { const ex = x + Math.cos(d) * len, ey = y + Math.sin(d) * len; P.line([[x, y], [(x + ex) / 2 + Math.sin(d) * 1.2, (y + ey) / 2 - Math.cos(d) * 1.2], [ex, ey]], w); } }
  const DOWN = Math.PI / 2, LEFT = Math.PI;

  // ---------- skulls (drawn in their own local units, then placed with xf) ----------
  const SKULL = {
    rex(P) {
      P.poly([[16, 63], [50, 67], [86, 65], [98, 61], [96, 72], [80, 79], [48, 81], [22, 75]]);
      P.poly([[9, 51], [15, 40], [33, 33], [58, 29], [82, 30], [96, 37], [101, 48], [97, 58], [86, 63], [60, 65], [34, 65], [15, 61]]);
      P.detail(c => { c.beginPath(); c.moveTo(18, 62); c.quadraticCurveTo(55, 66, 92, 61); c.lineTo(92, 64); c.quadraticCurveTo(55, 69, 18, 65); c.closePath(); c.fillStyle = HOLE; c.fill();
        c.fillStyle = BONE; for (let x = 22; x < 86; x += 6.2) { c.beginPath(); c.moveTo(x, 62.5); c.lineTo(x + 3.4, 62.5); c.lineTo(x + 1.6, 67.6); c.closePath(); c.fill(); } });
      P.holeEll(75, 42, 5.2, 4.8); P.holePoly([[38, 41], [58, 37], [65, 47], [57, 56], [41, 54]]); P.holeEll(20, 46, 3.2, 2.4, -0.3); P.holeEll(89, 50, 3.6, 6, 0.2); P.holeEll(72, 73, 7, 2.2, 0.05);
    },
    tri(P) {
      P.poly([[60, 50], [62, 31], [70, 15], [82, 6], [94, 7], [100, 20], [99, 44], [93, 63], [80, 74], [68, 66]]);
      P.detail(c => { c.fillStyle = BONE; c.strokeStyle = OUTL; c.lineWidth = 0.8; for (const [x, y] of [[64, 24], [72, 13], [83, 6], [94, 9], [100, 22], [100, 37], [97, 52]]) { c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill(); c.stroke(); } });
      P.poly([[10, 79], [30, 87], [60, 87], [74, 81], [72, 91], [50, 96], [26, 93], [12, 85]]);
      P.poly([[5, 74], [11, 64], [22, 58], [34, 56], [48, 50], [60, 45], [70, 44], [77, 50], [79, 62], [75, 73], [64, 82], [46, 86], [28, 86], [14, 81]]);
      P.poly([[49, 50], [58, 47], [32, 24], [21, 15]], true); P.poly([[57, 52], [64, 48], [44, 27], [34, 19]], true);
      P.poly([[13, 63], [22, 59], [13, 49]], false);
      P.holeEll(57, 59, 4.4, 4); P.holeEll(18, 67, 3, 4, 0.3); P.holeEll(68, 68, 3, 4.5, 0.2);
      P.detail(c => { c.strokeStyle = "rgba(110,90,60,.55)"; c.lineWidth = 0.7; for (const [x, y, r] of [[80, 26, 9], [88, 46, 8], [78, 52, 5]]) { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.stroke(); } });
    },
    stego(P) {
      P.poly([[12, 110], [40, 114], [70, 112], [80, 108], [77, 118], [50, 121], [24, 118]]);
      P.poly([[7, 104], [15, 98], [34, 94], [54, 92], [70, 92], [82, 96], [85, 104], [75, 110], [50, 112], [26, 112], [11, 110]]);
      P.holeEll(66, 99, 3.6, 3.4); P.holeEll(16, 103, 2.6, 2); P.holeEll(44, 103, 8, 3, -0.05); P.holeEll(78, 104, 2.2, 3);
    },
    bronto(P) {
      P.poly([[8, 25], [26, 29], [38, 26], [35, 32], [18, 33]]);
      P.poly([[5, 20], [11, 13], [24, 8], [37, 9], [43, 16], [41, 24], [30, 28], [16, 28], [8, 25]]);
      P.detail(c => { c.fillStyle = BONE; for (let x = 10; x < 30; x += 3.2) c.fillRect(x, 26.5, 1.2, 3.2); });
      P.holeEll(33, 15, 2.8, 2.6); P.holeEll(25, 11, 2.4, 1.6); P.holeEll(17, 20, 4.2, 2.4);
    },
    ankylo(P) {
      P.poly([[14, 108], [40, 116], [72, 116], [84, 112], [80, 121], [50, 125], [22, 121]]);
      P.poly([[88, 82], [97, 79], [114, 66]], false); P.poly([[92, 108], [100, 103], [114, 118]], false); P.poly([[66, 112], [78, 110], [76, 126]], false);
      P.poly([[6, 98], [12, 88], [28, 81], [52, 77], [74, 77], [90, 81], [100, 88], [104, 97], [99, 106], [85, 112], [60, 114], [34, 113], [15, 108]]);
      P.detail(c => { c.strokeStyle = "rgba(110,90,60,.6)"; c.lineWidth = 0.7; for (const [x, y, r] of [[34, 87, 4.5], [48, 84, 5], [62, 84, 5], [76, 86, 4.5], [88, 92, 4], [42, 96, 4], [56, 102, 4], [82, 102, 3.6]]) { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.stroke(); } });
      P.holeEll(68, 94, 3.8, 3.4); P.holeEll(16, 95, 3, 2.4);
    },
    para(P) {
      P.poly([[12, 62], [40, 66], [66, 64], [74, 62], [70, 70], [44, 72], [18, 68]]);
      P.poly([[57, 42], [65, 34], [79, 22], [93, 8], [99, 10], [97, 16], [83, 30], [71, 42]], true, { shadeW: 2.4 });
      P.poly([[5, 58], [10, 50], [22, 46], [38, 44], [54, 40], [66, 38], [76, 42], [80, 50], [76, 60], [62, 64], [40, 64], [20, 64], [8, 62]]);
      P.detail(c => { c.strokeStyle = HOLE; c.lineWidth = 0.9; c.beginPath(); c.moveTo(66, 38); c.quadraticCurveTo(82, 24, 95, 11); c.stroke(); });
      P.holeEll(64, 48, 3.6, 3.4); P.holeEll(27, 52, 7, 2.2, -0.1); P.holeEll(72, 56, 2.8, 4.2, 0.2);
    },
  };

  // ---------- poses: each returns layers, back to front ----------
  function standard(P, k) {
    const bp = resample(spline(k.back, 12), 3);
    const L = [];
    if (k.behind) L.push(...k.behind(bp));
    for (const f of k.far || []) L.push(() => { limb(P.far, f.pts, f.w); if (f.toes) toes(P.far, ...f.toes); });
    L.push(() => ribs(P, bp, k.rib[0], k.rib[1], k.rib[2], k.ribLen, k.ribLean || 0.3));
    if (k.gast) L.push(() => gastralia(P, ...k.gast));
    L.push(() => { const p = k.pelvis; P.ell(...p.ilium); P.line(p.pubis, p.pw); if (p.boot) P.ell(...p.boot); P.line(p.ischium, p.iw); });
    L.push(() => { vert(P, k.tail, k.tailO); vert(P, k.back, k.backO); });
    L.push(() => vert(P, k.neck, k.neckO));
    L.push(() => { limb(P, k.fore.pts, k.fore.w); if (k.fore.toes) toes(P, ...k.fore.toes); });
    L.push(() => { limb(P, k.hind.pts, k.hind.w); toes(P, ...k.hind.toes); });
    L.push(() => P.place(k.skull, () => SKULL[k.key](P)));
    if (k.front) L.push(...k.front(bp));
    return L;
  }
  const ribLen = (peak, base = 50) => t => Math.max(16, base + peak * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.9)) - 34 * t);
  const FOOT_L = [LEFT - 0.55, LEFT - 0.2, LEFT - 0.9];
  const FOOT_R = [0.15, -0.2, 0.45];
  // torso shared by most species: shoulders left, hips right, head thrown back over the shoulders
  const BACK = [[84, 206], [118, 192], [170, 188], [222, 212]];
  const TAIL = [[222, 212], [252, 214], [278, 198], [292, 164], [292, 124], [280, 88], [262, 62], [240, 48], [222, 54]];
  const NECK = [[150, 92], [140, 128], [114, 162], [84, 206]];
  const PELVIS = { ilium: [220, 206, 34, 13, 0.05], pubis: [[210, 218], [190, 262]], pw: 7, ischium: [[232, 220], [252, 262]], iw: 6 };
  const FORE = (w = 1) => ({ pts: [[92, 200], [70, 236], [48, 288], [52, 346], [34, 370]], w: [9, 13, 11, 7].map(x => x * w), toes: [34, 370, FOOT_L, 14, 4.6 * w] });
  const HIND = (w = 1) => ({ pts: [[226, 222], [184, 300], [222, 358], [250, 380]], w: [16, 13, 8.5].map(x => x * w), toes: [250, 380, FOOT_R, 20, 5 * w] });
  const FAR_FORE = (w = 1) => ({ pts: [[106, 210], [98, 268], [104, 326], [88, 352]], w: [12, 10, 7].map(x => x * w), toes: [88, 352, FOOT_L, 12, 4.2 * w] });
  const FAR_HIND = (w = 1) => ({ pts: [[214, 222], [158, 290], [162, 352], [140, 374]], w: [14, 11, 7.5].map(x => x * w), toes: [140, 374, FOOT_L, 15, 4.6 * w] });

  const POSE = {
    rex: P => standard(P, {
      key: "rex", skull: { at: [152, 92], anchor: [97, 60], k: 1.4, rot: 0.1 },
      neck: NECK, neckO: { step: 7, size: () => 15, spine: () => 8, cervical: () => 9 },
      back: BACK, backO: { step: 8, size: () => 15, spine: () => 16 },
      tail: TAIL, tailO: { step: 8, size: t => 15 - 7 * t, spine: t => 12 * (1 - t * .7), chevron: t => 12 * (1 - t * .7) },
      rib: [94, 206, 11], ribLen: ribLen(78),
      pelvis: { ...PELVIS, pubis: [[210, 218], [188, 268]], pw: 8, boot: [186, 273, 17, 7, 0.1] },
      fore: { pts: [[94, 202], [82, 228], [74, 250], [70, 266]], w: [8, 6.5, 5.5], toes: [70, 266, [DOWN + 0.7, DOWN + 0.2], 12, 3] },
      hind: HIND(1.3),
      far: [{ pts: [[214, 222], [150, 288], [94, 330], [62, 360]], w: [17, 14, 9], toes: [62, 360, FOOT_L, 22, 4.6] }],
    }),
    tri: P => standard(P, {
      key: "tri", skull: { at: [156, 104], anchor: [80, 74], k: 1.32, rot: 0.08 },
      neck: [[154, 104], [140, 134], [114, 164], [84, 206]], neckO: { step: 8, size: () => 16, spine: () => 6 },
      back: BACK, backO: { step: 8, size: () => 15.5, spine: () => 13 },
      tail: [[222, 212], [252, 214], [278, 198], [292, 164], [290, 128], [276, 100]], tailO: { step: 8, size: t => 15 - 7 * t, spine: t => 10 * (1 - t * .7), chevron: t => 10 * (1 - t * .7) },
      rib: [94, 208, 11], ribLen: ribLen(84),
      pelvis: PELVIS,
      fore: FORE(1.4), hind: HIND(1.35), far: [FAR_FORE(1.35), FAR_HIND(1.3)],
    }),
    stego: P => standard(P, {
      key: "stego", skull: { at: [142, 96], anchor: [84, 104], k: 1.4, rot: 0.12 },
      neck: [[140, 98], [134, 128], [112, 166], [84, 210]], neckO: { step: 7, size: t => 10 + 4 * t, spine: () => 4, cervical: () => 7 },
      back: [[84, 210], [118, 186], [170, 176], [222, 204]], backO: { step: 8, size: () => 15, spine: () => 9 },
      tail: [[222, 204], [252, 210], [278, 196], [292, 162], [292, 120], [280, 84], [264, 60]], tailO: { step: 8, size: t => 14.5 - 6 * t, spine: t => 8 * (1 - t * .7), chevron: t => 10 * (1 - t * .7) },
      rib: [94, 208, 11], ribLen: ribLen(86),
      pelvis: { ...PELVIS, ilium: [218, 198, 34, 12, 0.15] },
      fore: FORE(1.25), hind: HIND(1.3), far: [FAR_FORE(1.2), FAR_HIND(1.25)],
      behind: bp => {
        const plate = (x, y, w, h, lean) => P.poly([[x - w / 2, y + 3], [x - w * 0.5, y - h * 0.38], [x - w * 0.1 + lean, y - h], [x + w * 0.42 + lean * 0.5, y - h * 0.58], [x + w / 2, y + 3]], true, { shadeW: 5 });
        const plates = []; const xs = [128, 142, 156, 170, 184, 198, 212, 226];
        xs.forEach((x, i) => { const y = yAt(bp, x) - 4; const h = 30 + 50 * Math.sin(Math.PI * (0.2 + 0.7 * i / (xs.length - 1))); plates.push([x + (i % 2 ? 4 : 0), y, 22 + h * 0.24, h, 5]); });
        return [() => {
          for (const p of plates) plate(...p);
          P.detail(c => { c.strokeStyle = "rgba(110,90,60,.5)"; c.lineWidth = 0.7; for (const [x, y, w, h] of plates) for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * w * 0.12, y); c.lineTo(x + k * w * 0.18 + 2, y - h * 0.78); c.stroke(); } });
        }];
      },
      front: () => [() => { for (const [x, y, dx, dy] of [[266, 64, 30, -14], [270, 72, 32, 0], [260, 58, -4, -30], [268, 62, 8, -32]]) P.poly([[x - 4.5, y + 2], [x + 4.5, y - 2], [x + dx, y + dy]], false); }],
    }),
    bronto: P => standard(P, {
      key: "bronto", skull: { at: [76, 44], anchor: [42, 20], k: 1.8, rot: 0.15 },
      neck: [[76, 42], [104, 26], [138, 30], [162, 58], [166, 102], [150, 150], [120, 184], [84, 206]], neckO: { step: 7.5, size: t => 9 + 8 * t, spine: t => 4 + 5 * t, cervical: t => 10 + 7 * t },
      back: BACK, backO: { step: 8.5, size: () => 16.5, spine: () => 15 },
      tail: [[222, 212], [252, 214], [280, 196], [294, 160], [294, 118], [282, 82], [260, 58], [234, 52], [216, 64], [212, 88], [226, 102], [244, 98], [248, 84]],
      tailO: { step: 7.5, size: t => 16 - 11.5 * Math.pow(t, 0.7), spine: t => 12 * Math.max(0, 1 - t * 1.4), chevron: t => t < 0.7 ? 11 * (1 - t) : 0 },
      rib: [96, 208, 11], ribLen: ribLen(84),
      pelvis: { ...PELVIS, ilium: [220, 206, 34, 15, 0.05], pw: 8, iw: 7.5 },
      fore: { ...FORE(1.5), toes: [34, 370, [LEFT - 0.4, LEFT - 0.8], 9, 6] }, hind: { ...HIND(1.45), toes: [250, 380, [0.1, -0.25], 13, 6] },
      far: [{ ...FAR_FORE(1.45), toes: [88, 352, [LEFT - 0.4, LEFT - 0.8], 8, 5.4] }, { ...FAR_HIND(1.4), toes: [140, 374, [LEFT - 0.3, LEFT - 0.7], 11, 5.6] }],
    }),
    ankylo: P => {
      const neck = [[150, 104], [140, 136], [116, 168], [86, 212]];
      const back = [[86, 212], [118, 200], [170, 196], [222, 214]];
      const tail = [[222, 214], [252, 216], [278, 200], [292, 166], [290, 128], [276, 100], [258, 84]];
      return standard(P, {
        key: "ankylo", skull: { at: [154, 104], anchor: [98, 100], k: 1.3, rot: 0.06 },
        neck, neckO: { step: 8, size: () => 13.5, spine: () => 3 },
        back, backO: { step: 8, size: () => 15, spine: () => 6 },
        tail, tailO: { step: 8, size: t => 14 - 5 * t, spine: t => 5 * (1 - t), chevron: t => 7 * (1 - t) },
        rib: [96, 208, 11], ribLen: ribLen(70, 44), ribLean: 0.36,
        pelvis: { ...PELVIS, ilium: [220, 208, 38, 15, 0], pw: 7.5, iw: 7 },
        fore: FORE(1.45), hind: HIND(1.4), far: [FAR_FORE(1.4), FAR_HIND(1.35)],
        front: bp => {
          const nk = resample(spline(neck, 12), 3), tl = resample(spline(tail, 12), 3);
          const along = (path, every, fn) => { for (let i = 2; i < path.length - 2; i += every) { const q = path[i + 1], r = path[i - 1]; const a = Math.atan2(q[1] - r[1], q[0] - r[0]); fn(path[i], Math.sin(a), -Math.cos(a), a); } };
          return [() => {
            along(bp, 5, (p, nx, ny, a) => { P.ell(p[0] + nx * 13, p[1] + ny * 13, 7.5, 5.4, a, { shadeW: 3.4 }); });
            along(bp, 10, (p, nx, ny) => { P.poly([[p[0] + nx * 17 - 5, p[1] + ny * 17], [p[0] + nx * 17 + 5, p[1] + ny * 17], [p[0] + nx * 31 + 7, p[1] + ny * 31]], false); });
            along(tl, 6, (p, nx, ny, a) => { P.ell(p[0] + nx * 11, p[1] + ny * 11, 6, 4.4, a, { shadeW: 3 }); });
            along(nk.slice(8), 14, (p, nx, ny) => { P.line([[p[0] - nx * 12, p[1] - ny * 12], [p[0] + nx * 12, p[1] + ny * 12]], 7.5); });
            P.ell(248, 70, 19, 12, -0.9); P.ell(262, 84, 18, 11, -0.9); P.ell(252, 82, 13, 13);
          }];
        },
      });
    },
    para: P => {
      return standard(P, {
        key: "para", skull: { at: [140, 98], anchor: [76, 58], k: 1.35, rot: 0.1 },
        neck: [[138, 98], [134, 130], [112, 164], [84, 206]], neckO: { step: 7, size: () => 13.5, spine: () => 7, cervical: () => 7 },
        back: BACK, backO: { step: 7.5, size: () => 14, spine: () => 17 },
        tail: TAIL, tailO: { step: 7.5, size: t => 14 - 7 * t, spine: t => 16 * (1 - t * .7), chevron: t => 14 * (1 - t * .7) },
        rib: [94, 206, 11], ribLen: ribLen(78),
        pelvis: { ...PELVIS, pubis: [[208, 218], [176, 250]], pw: 6, boot: [174, 252, 10, 6, 0.4], iw: 5.5 },
        fore: { ...FORE(0.85), toes: [34, 370, FOOT_L, 13, 3.8] }, hind: HIND(1.15), far: [{ ...FAR_FORE(0.8) }, FAR_HIND(1.05)],
        front: bp => {
          const tail = resample(spline(TAIL, 12), 3);
          return [() => P.detail(c => {
            c.strokeStyle = "rgba(240,230,205,.8)"; c.lineWidth = 0.7;
            const path = [...bp.filter(p => p[0] > 150), ...tail.slice(0, Math.floor(tail.length * 0.75))];
            for (let i = 0; i < path.length - 8; i += 3) {
              const p = path[i], q = path[i + 8];
              const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), nx = Math.sin(ang), ny = -Math.cos(ang);
              c.beginPath(); c.moveTo(p[0] + nx * 14, p[1] + ny * 14); c.lineTo(q[0] + nx * 5, q[1] + ny * 5); c.stroke();
              c.beginPath(); c.moveTo(p[0] + nx * 5, p[1] + ny * 5); c.lineTo(q[0] + nx * 14, q[1] + ny * 14); c.stroke();
            }
          })];
        },
      });
    },
  };

  // ---------- rock ----------
  function rock(ctx, sp, W, H, s) {
    const r = rng(sp.seed);
    ctx.fillStyle = sp.base; ctx.fillRect(0, 0, W, H);
    const edges = [];
    let y = -10 * s; while (y < H + 20 * s) { const ph = r() * 6.28, ph2 = r() * 6.28, a = (2 + r() * 6) * s, a2 = (1 + r() * 3) * s, f = (0.006 + r() * 0.008) / s; const yy = y; edges.push(x => yy + a * Math.sin(x * f + ph) + a2 * Math.sin(x * f * 3.1 + ph2)); y += (6 + r() * 24) * s; }
    const step = 4 * s;
    for (let i = 0; i < edges.length - 1; i++) {
      ctx.beginPath(); ctx.moveTo(0, edges[i](0));
      for (let x = 0; x <= W + step; x += step) ctx.lineTo(x, edges[i](x));
      for (let x = W + step; x >= 0; x -= step) ctx.lineTo(x, edges[i + 1](x));
      ctx.closePath(); ctx.fillStyle = sp.bands[Math.floor(r() * sp.bands.length)]; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); for (let x = 0; x <= W + step; x += step) (x ? ctx.lineTo(x, edges[i](x)) : ctx.moveTo(x, edges[i](x)));
      ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 0.5 * s; ctx.stroke();
    }
    const n = 9000;
    for (let i = 0; i < n; i++) {
      const x = r() * W, yy = r() * H, light = r() < 0.5, d = (0.5 + r() * 0.8) * s;
      ctx.fillStyle = light ? "rgba(255,245,225,.16)" : "rgba(30,18,8,.13)";
      ctx.fillRect(x, yy, d, d);
    }
    ctx.strokeStyle = "rgba(25,15,5,.08)"; ctx.lineWidth = 0.4 * s;
    for (let x = -H; x < W; x += 3.5 * s) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H * 0.6, 0); ctx.stroke(); }
  }

  // small fossil traces pressed into the rock, kept clear of the skeleton
  function traces(ctx, sp, mask, s, Wu = WW, Hu = WH) {
    const r = rng(sp.seed + 99);
    const md = mask.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, mask.width, mask.height).data;
    const mark = (x, y, rad) => { const R = rad * s, cx = x * s, cy = y * s;
      for (let py = Math.max(0, Math.floor(cy - R)); py < Math.min(mask.height, Math.ceil(cy + R)); py++) for (let px = Math.max(0, Math.floor(cx - R)); px < Math.min(mask.width, Math.ceil(cx + R)); px++) if ((px - cx) ** 2 + (py - cy) ** 2 <= R * R) md[(py * mask.width + px) * 4 + 3] = 255; };
    const clear = (x, y, rad) => {
      for (let a = 0; a < 16; a++) for (const f of [0.35, 0.7, 1]) {
        const px = Math.round((x + Math.cos(a / 16 * 6.283) * rad * f) * s), py = Math.round((y + Math.sin(a / 16 * 6.283) * rad * f) * s);
        if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return false;
        if (md[(py * mask.width + px) * 4 + 3] > 10) return false;
      }
      return true;
    };
    const ink = "rgba(28,16,6,.36)", lit = "rgba(255,245,225,.32)";
    ctx.save(); ctx.scale(s, s); ctx.lineCap = "round";
    const ammonite = (x, y, R) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6.28);
      const T = 4.4 * Math.PI, b = Math.log(1 / 0.07) / T, rad = t => R * Math.exp(b * (t - T));
      ctx.beginPath(); for (let t = 0; t <= T; t += 0.08) { const q = rad(t); t ? ctx.lineTo(Math.cos(t) * q, Math.sin(t) * q) : ctx.moveTo(Math.cos(t) * q, Math.sin(t) * q); }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.stroke();
      for (let t = 2 * Math.PI; t <= T; t += 0.26) { const a = rad(t), c2 = rad(t - 2 * Math.PI); ctx.beginPath(); ctx.moveTo(Math.cos(t) * a, Math.sin(t) * a); ctx.lineTo(Math.cos(t) * c2, Math.sin(t) * c2); ctx.lineWidth = 0.5; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, R * 0.96, Math.PI * 1.1, Math.PI * 1.7); ctx.strokeStyle = lit; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.restore();
    };
    const shell = (x, y, R) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6.28);
      ctx.beginPath(); ctx.moveTo(0, R * 0.5); ctx.bezierCurveTo(-R * 1.1, -R * 0.1, -R * 0.6, -R, 0, -R); ctx.bezierCurveTo(R * 0.6, -R, R * 1.1, -R * 0.1, 0, R * 0.5);
      ctx.strokeStyle = ink; ctx.lineWidth = 0.9; ctx.stroke();
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(0, R * 0.45); ctx.lineTo(k * R * 0.22, -R * 0.88 + Math.abs(k) * R * 0.08); ctx.lineWidth = 0.45; ctx.stroke(); }
      ctx.restore();
    };
    const fern = (x, y, R) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6.28);
      ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(R * 0.25, 0, 0, R); ctx.strokeStyle = ink; ctx.lineWidth = 0.9; ctx.stroke();
      for (let t = -0.85; t <= 0.85; t += 0.16) { const yy = t * R, xx = R * 0.25 * (1 - t * t) * 0.5, L = R * 0.42 * (1 - Math.abs(t)) + 2;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + L * 0.6, yy - L * 0.1, xx + L, yy - L * 0.45); ctx.lineWidth = 0.6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx - L * 0.6, yy - L * 0.1, xx - L, yy - L * 0.45); ctx.stroke(); }
      ctx.restore();
    };
    const pebble = (x, y, R) => {
      ctx.beginPath(); ctx.ellipse(x, y, R, R * (0.55 + r() * 0.3), r() * 3, 0, 6.283);
      ctx.fillStyle = "rgba(30,18,8,.18)"; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x - R * 0.25, y - R * 0.25, R * 0.4, R * 0.2, -0.6, 0, 6.283); ctx.fillStyle = lit; ctx.fill();
    };
    const area = Wu * Hu / (WW * WH);
    const kinds = [[ammonite, 7, 12, 4], [fern, 14, 22, 4], [shell, 5, 8, 6], [pebble, 2, 4.5, 22]].map(k => [k[0], k[1], k[2], Math.round(k[3] * area)]);
    for (const [fn, r0, r1, want] of kinds) {
      let got = 0;
      for (let tries = 0; tries < 400 && got < want; tries++) {
        const R = r0 + r() * (r1 - r0), x = R + 4 + r() * (Wu - 2 * R - 8), y = R + 4 + r() * (Hu - 2 * R - 8);
        if (!clear(x, y, R + 6)) continue;
        fn(x, y, R); got++; mark(x, y, R + 3);
      }
    }
    ctx.restore();
  }

  function slab(spIdx, s, pad = 0) {
    const sp = SPECIES[spIdx];
    const Wu = WW + 2 * pad, Hu = WH + 2 * pad;
    const W = Math.round(Wu * s), H = Math.round(Hu * s);
    const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
    // bones on their own layer
    const bones = mk(), bc = bones.getContext("2d");
    bc.save(); bc.scale(s, s); bc.translate(pad, pad);
    const n = POSE[sp.key](pen(bc, "out")).length;
    for (let g = 0; g < n; g++) for (const mode of ["out", "fill", "shade", "detail"]) POSE[sp.key](pen(bc, mode))[g]();
    bc.restore();
    // age the bone: speckle, stains, fine hatching, kept on the bone only
    const r = rng(sp.seed + 3);
    bc.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, R = (6 + r() * 22) * s; const g = bc.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, "rgba(120,86,40,.16)"); g.addColorStop(1, "rgba(120,86,40,0)"); bc.fillStyle = g; bc.fillRect(x - R, y - R, 2 * R, 2 * R); }
    for (let i = 0; i < 7000; i++) { bc.fillStyle = r() < 0.6 ? "rgba(60,40,20,.22)" : "rgba(255,250,235,.35)"; const d = (0.3 + r() * 0.5) * s; bc.fillRect(r() * W, r() * H, d, d); }
    bc.strokeStyle = "rgba(70,50,25,.07)"; bc.lineWidth = 0.35 * s;
    for (let x = -H; x < W; x += 1.6 * s) { bc.beginPath(); bc.moveTo(x, 0); bc.lineTo(x + H * 0.5, H); bc.stroke(); }
    bc.globalCompositeOperation = "source-over";
    // mask for keeping traces off the skeleton
    const mask = mk(), mc = mask.getContext("2d"); mc.drawImage(bones, 0, 0);
    // compose
    const out = mk(), ctx = out.getContext("2d");
    rock(ctx, sp, W, H, s);
    traces(ctx, sp, mask, s, Wu, Hu);
    ctx.save(); ctx.shadowColor = "rgba(255,236,200,.18)"; ctx.shadowBlur = 0; ctx.shadowOffsetX = -0.8 * s; ctx.shadowOffsetY = -0.8 * s; ctx.drawImage(bones, 0, 0); ctx.restore();
    ctx.save(); ctx.shadowColor = "rgba(12,6,1,.6)"; ctx.shadowBlur = 5 * s; ctx.shadowOffsetX = 1.2 * s; ctx.shadowOffsetY = 1.6 * s; ctx.drawImage(bones, 0, 0); ctx.restore();
    return out;
  }

  function cell(slabCv, v, frame = true) {
    const cw = slabCv.width / 3, ch = slabCv.height / 3;
    const cv = document.createElement("canvas"); cv.width = Math.round(cw); cv.height = Math.round(ch);
    const c = cv.getContext("2d");
    const col = (v - 1) % 3, row = Math.floor((v - 1) / 3);
    c.drawImage(slabCv, col * cw, row * ch, cw, ch, 0, 0, cv.width, cv.height);
    if (frame) {
      const g = c.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.3, cv.width / 2, cv.height / 2, cv.height * 0.78);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(15,8,2,.26)");
      c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
    }
    return cv;
  }

  // in-page faces: 54 small jpegs keyed by card id (species * 10 + value)
  let cache = null;
  function build(scale = 2) {
    if (cache) return cache;
    cache = {};
    SPECIES.forEach((_, s) => { const sl = slab(s, scale); for (let v = 1; v <= 9; v++) cache[s * 10 + v] = cell(sl, v).toDataURL("image/jpeg", 0.85); });
    return cache;
  }
  return { build, slab, cell, WW, WH };
})();
