// Print composer: 2.5 x 3.5 in poker cards at 300 dpi with 1/8 in bleed (825 x 1125).
const PRINT = (() => {
  const S = 7.5, PAD = 5, W = 825, H = 1125, TRIM = 37.5;
  const NUM = "bold 74px Lora, 'IM Fell English'";
  // corner index: number over the species symbol, on a cream tab
  const TW = 100, TH = 176;
  function tab(c, x, y, s, v, k = 1) {
    c.save(); c.translate(x, y); c.scale(k, k);
    c.font = "96px Rye"; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.lineJoin = "round";
    c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 10; c.shadowOffsetY = 3;
    c.lineWidth = 12; c.strokeStyle = "#20160d"; c.strokeText(String(v), TW / 2, 92);
    if (v === 6 || v === 9) { c.fillStyle = "#20160d"; c.fillRect(TW / 2 - 26, 97, 52, 14); }
    c.shadowColor = "transparent";
    c.fillStyle = "#fbf5e6"; c.fillText(String(v), TW / 2, 92);
    if (v === 6 || v === 9) c.fillRect(TW / 2 - 21, 101, 42, 6);
    c.save(); c.translate(TW / 2 - 36, 116); c.scale(72 / 24, 72 / 24);
    const p = new Path2D(SPECIES[s].sym); c.lineJoin = "round";
    c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 3; c.lineWidth = 3.4; c.strokeStyle = "#20160d"; c.stroke(p); c.shadowColor = "transparent";
    c.lineWidth = 1.8; c.strokeStyle = "#fbf5e6"; c.stroke(p);
    c.fillStyle = SPECIES[s].suit; c.fill(p, "evenodd");
    c.restore();
    c.restore();
  }
  function quad(c, w, h, s, v, inset, k = 1) {
    const tw = TW * k, th = TH * k;
    tab(c, inset, inset, s, v, k); tab(c, w - inset - tw, inset, s, v, k);
    for (const x of [inset, w - inset - tw]) { c.save(); c.translate(w, h); c.rotate(Math.PI); tab(c, x, inset, s, v, k); c.restore(); }
  }
  function face(slabCv, s, v) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    const col = (v - 1) % 3, row = Math.floor((v - 1) / 3);
    c.drawImage(slabCv, col * 100 * S, row * 140 * S, W, H, 0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(15,8,2,.22)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    quad(c, W, H, s, v, TRIM + 24);
    return cv;
  }
  // Card back: a quarry seen from above. Umber strata folded around the centre (an anticline), a surveyor's string grid,
  // a parchment medallion with an ammonite, and DIGGERS burned into a plank at each end. Everything is point-symmetric,
  // so a back looks the same either way up and never gives away how a card sits in a hand.
  function back() {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d"), cx = W / 2, cy = H / 2;
    let seed = 1877; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // strata: band value depends on distance from the centre line plus a fold that is even in x, so the pattern is symmetric both ways
    const img = c.createImageData(W, H), d = img.data;
    const tones = [[58, 36, 24], [69, 43, 28], [47, 29, 19], [80, 50, 32], [62, 38, 25], [52, 32, 21]];
    const waves = [[0.0042, 26, 0.6], [0.011, 9, 1.9], [0.023, 4, 0.3]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = Math.abs(y - cy), vx = x - cx;
      let t = u + 0.00018 * vx * vx * (1 - u / H);
      for (const [f, a, ph] of waves) t += a * Math.cos(vx * f + ph) * Math.cos(u * 0.004);
      const band = Math.floor(t / 38), mix = (t / 38) % 1, A = tones[(band % tones.length + tones.length) % tones.length], B = tones[((band + 1) % tones.length + tones.length) % tones.length];
      const e = mix > 0.88 ? (mix - 0.88) / 0.12 : 0; // soft edge into the next layer
      const k = (y * W + x) * 4;
      d[k] = A[0] + (B[0] - A[0]) * e; d[k + 1] = A[1] + (B[1] - A[1]) * e; d[k + 2] = A[2] + (B[2] - A[2]) * e; d[k + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    // grit, placed in point-symmetric pairs
    for (let i = 0; i < 9000; i++) { const x = r() * W, y = r() * H, sz = 1 + r() * 2.4, light = r() < 0.45;
      c.fillStyle = light ? `rgba(250,226,190,${0.04 + r() * 0.07})` : `rgba(10,5,2,${0.08 + r() * 0.16})`;
      c.fillRect(x, y, sz, sz); c.fillRect(W - x - sz, H - y - sz, sz, sz); }
    // pebbles, in pairs too
    for (let i = 0; i < 22; i++) { const x = TRIM + 60 + r() * (W - 2 * TRIM - 120), y = TRIM + 60 + r() * (H / 2 - TRIM - 60), rx = 4 + r() * 9, ry = rx * (0.6 + r() * 0.3), rot = r() * 3;
      for (const [px, py] of [[x, y], [W - x, H - y]]) { c.save(); c.translate(px, py); c.rotate(rot + (px === x ? 0 : Math.PI));
        c.fillStyle = "rgba(20,10,4,.45)"; c.beginPath(); c.ellipse(1.5, 2, rx, ry, 0, 0, 6.29); c.fill();
        c.fillStyle = ["#7a5a43", "#8d6b50", "#6a4b37", "#9b7c62"][i % 4]; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 6.29); c.fill();
        c.fillStyle = "rgba(255,240,215,.18)"; c.beginPath(); c.ellipse(-rx * 0.3, -ry * 0.3, rx * 0.4, ry * 0.35, 0, 0, 6.29); c.fill(); c.restore(); } }
    // a soft vignette so the edges sit dark at any cut
    const vg = c.createRadialGradient(cx, cy, H * 0.25, cx, cy, H * 0.72); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(12,6,2,.55)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const ink = "#ead9b4";
    // surveyor's strings: a square grid centred on the card, with a stake where strings cross
    const G = 112, x0 = TRIM + 66, x1 = W - TRIM - 66, y0 = TRIM + 66, y1 = H - TRIM - 66;
    c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
    c.strokeStyle = "rgba(234,217,180,.30)"; c.lineWidth = 2;
    for (let k = -4; k <= 4; k++) { const x = cx + k * G; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); }
    for (let k = -5; k <= 5; k++) { const y = cy + k * G; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    for (let i = -4; i <= 4; i++) for (let j = -5; j <= 5; j++) { const x = cx + i * G, y = cy + j * G;
      c.fillStyle = "rgba(12,6,2,.5)"; c.fillRect(x - 4, y - 3, 9, 9); c.fillStyle = "rgba(214,190,150,.75)"; c.fillRect(x - 4.5, y - 4.5, 9, 9); }
    c.restore();
    // frame: a heavy rule, a fine rule and diamonds at the corners
    c.strokeStyle = ink; c.lineWidth = 6; c.strokeRect(TRIM + 30, TRIM + 30, W - 2 * TRIM - 60, H - 2 * TRIM - 60);
    c.lineWidth = 1.8; c.strokeRect(TRIM + 46, TRIM + 46, W - 2 * TRIM - 92, H - 2 * TRIM - 92);
    for (const [x, y] of [[TRIM + 46, TRIM + 46], [W - TRIM - 46, TRIM + 46], [TRIM + 46, H - TRIM - 46], [W - TRIM - 46, H - TRIM - 46]]) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = ink; c.fillRect(-10, -10, 20, 20); c.fillStyle = "#3a2418"; c.fillRect(-4, -4, 8, 8); c.restore(); }
    // a plank with DIGGERS burned in, drawn once and placed at both ends (the lower one turned round)
    const PW = W - 2 * TRIM - 170, PH = 128, pl = document.createElement("canvas"); pl.width = PW; pl.height = PH; const g = pl.getContext("2d");
    const wg = g.createLinearGradient(0, 0, 0, PH); wg.addColorStop(0, "#d2ab72"); wg.addColorStop(0.55, "#c39860"); wg.addColorStop(1, "#ad8250");
    g.fillStyle = wg; g.fillRect(0, 0, PW, PH);
    for (let k = 0; k < 120; k++) { const y = r() * PH, dark = r() < 0.6; g.strokeStyle = dark ? `rgba(110,68,30,${0.08 + r() * 0.2})` : `rgba(240,214,170,${0.06 + r() * 0.14})`; g.lineWidth = 0.8 + r() * 2.4;
      g.beginPath(); for (let x = -8; x <= PW + 8; x += 10) { const yy = y + Math.sin(x / 90 + y) * 2.5; x < 0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
    const ends = g.createLinearGradient(0, 0, PW, 0); ends.addColorStop(0, "rgba(60,32,10,.4)"); ends.addColorStop(0.08, "rgba(60,32,10,0)"); ends.addColorStop(0.92, "rgba(60,32,10,0)"); ends.addColorStop(1, "rgba(60,32,10,.4)");
    g.fillStyle = ends; g.fillRect(0, 0, PW, PH);
    g.strokeStyle = "rgba(40,22,8,.9)"; g.lineWidth = 4; g.strokeRect(2, 2, PW - 4, PH - 4);
    for (const nx of [26, PW - 26]) { const ng = g.createRadialGradient(nx - 3, PH / 2 - 3, 1, nx, PH / 2, 10); ng.addColorStop(0, "#d8d2c4"); ng.addColorStop(0.5, "#7c746a"); ng.addColorStop(1, "#2c2620");
      g.fillStyle = ng; g.beginPath(); g.arc(nx, PH / 2, 9, 0, 6.29); g.fill(); }
    g.fillStyle = "#3b230f"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "92px Rye"; g.letterSpacing = "8px";
    g.shadowColor = "rgba(70,34,10,.6)"; g.shadowBlur = 3; g.fillText("DIGGERS", PW / 2 + 4, PH / 2 + 6); g.shadowColor = "transparent";
    const py = TRIM + 92;
    for (const flip of [false, true]) { c.save(); if (flip) { c.translate(W, H); c.rotate(Math.PI); }
      c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 14; c.shadowOffsetY = 5; c.drawImage(pl, (W - PW) / 2, py); c.restore(); }
    // the medallion: parchment disc, double ring, the motto around it twice (so it reads the same either way up), and an ammonite
    const MR = 205;
    c.save(); c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 22; c.shadowOffsetY = 6;
    c.fillStyle = "#efe2c2"; c.beginPath(); c.arc(cx, cy, MR, 0, 6.29); c.fill(); c.restore();
    const pg = c.createRadialGradient(cx, cy, MR * 0.3, cx, cy, MR); pg.addColorStop(0, "rgba(255,250,235,.0)"); pg.addColorStop(1, "rgba(150,110,60,.28)");
    c.fillStyle = pg; c.beginPath(); c.arc(cx, cy, MR, 0, 6.29); c.fill();
    const dk = "#2a190d";
    c.strokeStyle = dk; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, MR - 10, 0, 6.29); c.stroke();
    c.lineWidth = 1.6; c.beginPath(); c.arc(cx, cy, MR - 62, 0, 6.29); c.stroke();
    c.beginPath(); c.arc(cx, cy, MR - 18, 0, 6.29); c.stroke();
    // motto on the ring
    c.fillStyle = dk; c.font = "29px 'IM Fell English SC'"; c.textAlign = "center"; c.textBaseline = "middle";
    const motto = "The Great Bone Rush · 1877", ringR = MR - 40;
    for (const a of [0, Math.PI]) { c.save(); c.translate(cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR); c.rotate(Math.PI / 4); c.fillRect(-5, -5, 10, 10); c.restore(); }
    for (const start of [-Math.PI / 2, Math.PI / 2]) {
      const widths = [...motto].map(ch => c.measureText(ch).width + 2.2), total = widths.reduce((a, b) => a + b, 0);
      let ang = start - (total / ringR) / 2;
      for (let i = 0; i < motto.length; i++) { const w = widths[i], a = ang + (w / 2) / ringR;
        c.save(); c.translate(cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR); c.rotate(a + Math.PI / 2); c.fillText(motto[i], 0, 0); c.restore(); ang += w / ringR; }
    }
    // ammonite
    c.save(); c.translate(cx - 6, cy + 4);
    const R = 112, T = 4.6 * Math.PI, b = Math.log(1 / 0.06) / T, rad = t => R * Math.exp(b * (t - T));
    c.beginPath(); for (let t = 0; t <= T; t += 0.03) { const q = rad(t); t ? c.lineTo(Math.cos(t) * q, Math.sin(t) * q) : c.moveTo(Math.cos(t) * q, Math.sin(t) * q); }
    c.lineWidth = 5; c.strokeStyle = dk; c.lineCap = "round"; c.stroke();
    for (let t = 2 * Math.PI; t <= T; t += 0.17) { const a = rad(t), dd = rad(t - 2 * Math.PI); c.beginPath(); c.moveTo(Math.cos(t) * a, Math.sin(t) * a); c.quadraticCurveTo(Math.cos(t - 0.2) * (a + dd) / 2, Math.sin(t - 0.2) * (a + dd) / 2, Math.cos(t) * dd, Math.sin(t) * dd); c.lineWidth = 1.9; c.stroke(); }
    c.restore();
    return cv;
  }
  function overview() {
    const s = 2.4, gap = 6, margin = 60, cellW = 100 * s, cellH = 140 * s, slabW = 3 * cellW + 2 * gap, slabH = 3 * cellH + 2 * gap;
    const cols = 3, labelH = 80, W2 = margin * 2 + cols * slabW + (cols - 1) * 50, H2 = margin * 2 + 130 + 2 * (slabH + labelH) + 50;
    const cv = document.createElement("canvas"); cv.width = W2; cv.height = H2; const c = cv.getContext("2d");
    c.fillStyle = "#1d1813"; c.fillRect(0, 0, W2, H2);
    c.fillStyle = "#efe4c8"; c.font = "64px Rye"; c.letterSpacing = "4px"; c.fillText("DIGGERS · THE FIVE SKELETONS", margin, margin + 60);
    c.font = "italic 28px 'IM Fell English'"; c.letterSpacing = "1px"; c.fillStyle = "#b9a983";
    c.fillText("Each number is a bone. Lay a species’ 1–9 in three rows of three and the whole skeleton comes out of the rock.", margin, margin + 104);
    SPECIES.forEach((sp, i) => {
      // a short last row is centred
      const row = Math.floor(i / cols), inRow = Math.min(cols, SPECIES.length - row * cols);
      const sl = FossilArt.slab(i, s), ox = margin + (cols - inRow) * (slabW + 50) / 2 + (i % cols) * (slabW + 50), oy = margin + 130 + Math.floor(i / cols) * (slabH + labelH + 50);
      for (let v = 1; v <= 9; v++) {
        const col = (v - 1) % 3, row = Math.floor((v - 1) / 3), x = ox + col * (cellW + gap), y = oy + row * (cellH + gap);
        c.save(); c.beginPath(); c.roundRect(x, y, cellW, cellH, 10); c.clip();
        c.drawImage(FossilArt.cell(sl, v), x, y, cellW, cellH); c.restore();
        tab(c, x + 8, y + 8, i, v, 0.3);
      }
      c.save(); c.translate(ox, oy + slabH + 18); c.scale(44 / 24, 44 / 24); const sy = new Path2D(sp.sym); c.fillStyle = sp.suit; c.fill(sy, "evenodd"); c.lineWidth = 0.8; c.strokeStyle = "#efe4c8"; c.stroke(sy); c.restore();
      c.fillStyle = "#efe4c8"; c.font = "44px 'IM Fell English'"; c.letterSpacing = "1px"; c.fillText(sp.name, ox + 58, oy + slabH + 54);
      c.fillStyle = "#b9a983"; c.font = "italic 26px 'IM Fell English'"; c.textAlign = "right"; c.fillText(sp.rock, ox + slabW, oy + slabH + 50); c.textAlign = "left";
    });
    return cv;
  }
  return { face, back, overview, S, PAD };
})();
