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
  function back() {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    const sp = { base: "#2c221a", bands: ["#33281f", "#271e17", "#3a2e24", "#2f251c"], seed: 7 };
    // reuse slab rock by drawing an empty slab of a neutral rock
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
    const r = (() => { let a = 99; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    c.fillStyle = sp.base; c.fillRect(0, 0, W, H);
    let y = -20; while (y < H + 40) { const yy = y, a = 6 + r() * 18, f = 0.003 + r() * 0.004, ph = r() * 6;
      const h = 20 + r() * 90; c.beginPath(); c.moveTo(0, yy);
      for (let x = 0; x <= W; x += 15) c.lineTo(x, yy + a * Math.sin(x * f + ph)); for (let x = W; x >= 0; x -= 15) c.lineTo(x, yy + h + a * Math.sin(x * f + ph + 0.4));
      c.closePath(); c.fillStyle = sp.bands[Math.floor(r() * sp.bands.length)]; c.fill(); y += h * 0.8; }
    for (let i = 0; i < 26000; i++) { c.fillStyle = r() < 0.5 ? "rgba(255,240,215,.07)" : "rgba(0,0,0,.18)"; c.fillRect(r() * W, r() * H, 2, 2); }
    c.strokeStyle = "rgba(255,240,215,.03)"; c.lineWidth = 2; for (let x = -H; x < W; x += 12) { c.beginPath(); c.moveTo(x, H); c.lineTo(x + H * 0.6, 0); c.stroke(); }
    const ink = "#e9dcbc";
    c.strokeStyle = ink; c.lineWidth = 5; c.strokeRect(TRIM + 34, TRIM + 34, W - 2 * TRIM - 68, H - 2 * TRIM - 68);
    c.lineWidth = 1.6; c.strokeRect(TRIM + 50, TRIM + 50, W - 2 * TRIM - 100, H - 2 * TRIM - 100);
    for (const [x, y] of [[TRIM + 50, TRIM + 50], [W - TRIM - 50, TRIM + 50], [TRIM + 50, H - TRIM - 50], [W - TRIM - 50, H - TRIM - 50]]) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = ink; c.fillRect(-9, -9, 18, 18); c.restore(); }
    // ammonite emblem
    c.save(); c.translate(W / 2 - 40, H / 2 + 20);
    const R = 190, T = 4.6 * Math.PI, b = Math.log(1 / 0.06) / T, rad = t => R * Math.exp(b * (t - T));
        c.beginPath(); for (let t = 0; t <= T; t += 0.03) { const q = rad(t); t ? c.lineTo(Math.cos(t) * q, Math.sin(t) * q) : c.moveTo(Math.cos(t) * q, Math.sin(t) * q); }
    c.lineWidth = 6; c.strokeStyle = ink; c.stroke();
    for (let t = 2 * Math.PI; t <= T; t += 0.17) { const a = rad(t), d = rad(t - 2 * Math.PI); c.beginPath(); c.moveTo(Math.cos(t) * a, Math.sin(t) * a); c.quadraticCurveTo(Math.cos(t - 0.2) * (a + d) / 2, Math.sin(t - 0.2) * (a + d) / 2, Math.cos(t) * d, Math.sin(t) * d); c.lineWidth = 2.2; c.stroke(); }
    c.restore();
    c.fillStyle = ink; c.textAlign = "center";
    c.font = "118px Rye"; c.letterSpacing = "6px"; c.fillText("DIGGERS", W / 2 + 3, TRIM + 236);
    c.font = "italic 34px 'IM Fell English'"; c.letterSpacing = "2px"; c.fillText("Rival excavations in three field seasons", W / 2, TRIM + 290);
    c.font = "30px 'IM Fell English SC'"; c.letterSpacing = "6px"; c.fillText("What’s Good Board Games", W / 2 + 4, H - TRIM - 120);
    return cv;
  }
  function overview() {
    const s = 2.4, gap = 6, margin = 60, cellW = 100 * s, cellH = 140 * s, slabW = 3 * cellW + 2 * gap, slabH = 3 * cellH + 2 * gap;
    const cols = 3, labelH = 80, W2 = margin * 2 + cols * slabW + (cols - 1) * 50, H2 = margin * 2 + 130 + 2 * (slabH + labelH) + 50;
    const cv = document.createElement("canvas"); cv.width = W2; cv.height = H2; const c = cv.getContext("2d");
    c.fillStyle = "#1d1813"; c.fillRect(0, 0, W2, H2);
    c.fillStyle = "#efe4c8"; c.font = "64px Rye"; c.letterSpacing = "4px"; c.fillText("DIGGERS · THE SIX SKELETONS", margin, margin + 60);
    c.font = "italic 28px 'IM Fell English'"; c.letterSpacing = "1px"; c.fillStyle = "#b9a983";
    c.fillText("Each number is a bone. Lay a species’ 1–9 in three rows of three and the whole skeleton comes out of the rock.", margin, margin + 104);
    SPECIES.forEach((sp, i) => {
      const sl = FossilArt.slab(i, s), ox = margin + (i % cols) * (slabW + 50), oy = margin + 130 + Math.floor(i / cols) * (slabH + labelH + 50);
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
