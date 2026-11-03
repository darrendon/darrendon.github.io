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
  // Card back: red sandstone with faint pinstripes, two strata bands across,
  // and the DIGGERS woodtype logo with an 1877 ribbon. Drawn to full bleed; nothing important sits near the trim.
  function back() {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), cx = W / 2, cy = H / 2;
    const INK = "#24180E", CREAM = "#FBF3E2", RED = "#A8452D", OCHRE = "#D9A441";
    g.fillStyle = RED; g.fillRect(0, 0, W, H);
    const sp = g.createRadialGradient(cx, cy, 40, cx, cy, 600); sp.addColorStop(0, "rgba(255,190,140,.22)"); sp.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sp; g.fillRect(0, 0, W, H);
    g.save(); g.strokeStyle = "rgba(255,220,190,.07)"; g.lineWidth = 10; for (let x = -H; x < W + H; x += 46) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H * 0.5, H); g.stroke(); } g.restore();
    const band = (y, col, h) => { g.save(); g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 7; g.beginPath();
      g.moveTo(-10, y - h / 2); for (let x = -10; x <= W + 10; x += 25) g.lineTo(x, y - h / 2 + Math.sin(x / 70) * 5);
      for (let x = W + 10; x >= -10; x -= 25) g.lineTo(x, y + h / 2 + Math.sin(x / 70 + 0.6) * 5); g.closePath(); g.fill(); g.stroke(); g.restore(); };
    band(cy - 175, "#D9A066", 26); band(cy + 175, "#D9A066", 26); band(cy - 215, "#7E3220", 16); band(cy + 215, "#7E3220", 16);
    // the logo: woodtype with a thick ink outline and a hard red shadow
    g.save(); let size = 150; g.font = `${size}px Rye`; while (g.measureText("DIGGERS").width > 560) { size -= 2; g.font = `${size}px Rye`; }
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = size * 0.16; g.strokeStyle = INK;
    const ly = cy - 18; g.fillStyle = RED; g.strokeText("DIGGERS", cx + size * 0.05, ly + size * 0.07); g.fillText("DIGGERS", cx + size * 0.05, ly + size * 0.07);
    g.strokeText("DIGGERS", cx, ly); g.fillStyle = CREAM; g.fillText("DIGGERS", cx, ly); g.restore();
    // the 1877 ribbon
    { g.save(); g.font = "40px Rye"; g.letterSpacing = "3px"; const text = "1877", tw = g.measureText(text).width, w = tw + 70, h = 68;
      g.translate(cx, cy + 92); g.lineJoin = "round"; g.lineWidth = 7; g.strokeStyle = INK;
      const shape = (dx, dy) => { g.beginPath(); g.moveTo(-w / 2 + dx, -h / 2 + dy); g.lineTo(w / 2 + dx, -h / 2 + dy); g.lineTo(w / 2 + dx - 14, dy); g.lineTo(w / 2 + dx, h / 2 + dy); g.lineTo(-w / 2 + dx, h / 2 + dy); g.lineTo(-w / 2 + dx + 14, dy); g.closePath(); };
      g.fillStyle = "#9C6E1E"; shape(5, 7); g.fill(); g.stroke(); g.fillStyle = OCHRE; shape(0, 0); g.fill(); g.stroke();
      g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 3); g.restore(); }
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
