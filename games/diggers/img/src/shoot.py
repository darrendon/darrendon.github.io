"""Shoot Diggers stills and run a silhouette-overlap check.
usage: shoot.py scene[:w:h] ... [--out DIR]
For each scene: renders scene.html, saves DIR/render-<scene>.png (lossless), and prints the overlap report:
every pair of table objects whose on-screen silhouettes overlap (overlap), or come within R px (near),
plus objects cut by the frame edge."""
import sys, base64, os, json
from playwright.sync_api import sync_playwright

out_dir = '.'
args = sys.argv[1:]
if '--out' in args:
    k = args.index('--out'); out_dir = args[k + 1]; del args[k:k + 2]

CHECK = r"""
(R) => {
  const d = window.__dig, r = d.renderer, gl = r.getContext();
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const objs = d.items, vis = objs.map(o => o.visible);
  const bg = d.scene.background, fog = d.scene.fog;
  d.table.visible = false; d.scene.background = null; d.scene.fog = null;
  d.scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const buf = new Uint8Array(W * H * 4), masks = [];
  for (let i = 0; i < objs.length; i++) {
    objs.forEach((o, j) => o.visible = j === i);
    r.setClearColor(0x000000, 1); r.clear(); r.render(d.scene, d.camera);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const m = new Uint8Array(W * H); let n = 0;
    for (let k = 0; k < W * H; k++) if (buf[k * 4] > 20) { m[k] = 1; n++; }
    masks.push({ name: objs[i].name || ('obj' + i), m, n });
  }
  objs.forEach((o, j) => o.visible = vis[j]); d.table.visible = true; d.scene.background = bg; d.scene.fog = fog; d.scene.overrideMaterial = null;
  r.setClearColor(0x000000, 1); r.render(d.scene, d.camera);
  function dilate(m) {
    const a = new Uint8Array(W * H), b = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let dx = -R; dx <= R && !v; dx++) { const xx = x + dx; if (xx >= 0 && xx < W && m[y * W + xx]) v = 1; } a[y * W + x] = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let dy = -R; dy <= R && !v; dy++) { const yy = y + dy; if (yy >= 0 && yy < H && a[yy * W + x]) v = 1; } b[y * W + x] = v; }
    return b;
  }
  const res = { objects: masks.length, overlap: [], near: [], cut: [], empty: [], minGap: null };
  masks.forEach(o => { if (!o.n) res.empty.push(o.name); });
  const dil = masks.map(o => dilate(o.m));
  for (let i = 0; i < masks.length; i++) for (let j = i + 1; j < masks.length; j++) {
    let ov = 0, nr = 0; const A = masks[i].m, B = masks[j].m, DA = dil[i];
    for (let k = 0; k < W * H; k++) { if (B[k]) { if (A[k]) ov++; else if (DA[k]) nr++; } }
    if (ov) res.overlap.push([masks[i].name, masks[j].name, ov]); else if (nr) res.near.push([masks[i].name, masks[j].name, nr]);
  }
  masks.forEach(o => { const m = o.m; let c = 0;
    for (let x = 0; x < W; x++) { if (m[x]) c++; if (m[(H - 1) * W + x]) c++; }
    for (let y = 0; y < H; y++) { if (m[y * W]) c++; if (m[y * W + W - 1]) c++; }
    if (c) res.cut.push(o.name + ' (' + c + ' px)'); });
  return res;
}
"""

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for spec in args:
        parts = spec.split(':'); sc = parts[0]
        w = int(parts[1]) if len(parts) > 1 else 1600; h = int(parts[2]) if len(parts) > 2 else 1000
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto(f'http://localhost:8765/games/diggers/img/src/scene.html?scene={sc}&w={w}&h={h}', wait_until='commit')
        pg.wait_for_function('window.__done === true', timeout=180000)
        png = pg.evaluate("document.querySelector('canvas').toDataURL('image/png')")
        out = os.path.join(out_dir, f'render-{sc}.png')
        open(out, 'wb').write(base64.b64decode(png.split(',')[1]))
        c = pg.evaluate(CHECK, 3)
        print(f"{sc}: saved {out} | {c['objects']} objects | overlap {len(c['overlap'])} | near(<=3px) {len(c['near'])} | cut {len(c['cut'])} | off-screen {len(c['empty'])}")
        for k in ('overlap', 'near'):
            for a, d, n in c[k]: print(f'   {k}: {a} x {d} ({n} px)')
        for x in c['cut']: print('   cut:', x)
        for x in c['empty']: print('   off-screen:', x)
        pg.close()
    b.close()
