import sys, base64, io, threading, http.server, functools, time
from PIL import Image
from playwright.sync_api import sync_playwright
import os
ROOT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
scenes = sys.argv[1:] or ["dusk", "midnight", "frames", "tokens"]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    for s in scenes:
        w, h = (3200, 2000)
        pg = b.new_page(viewport={"width": 800, "height": 500})
        logs = []; pg.on("console", lambda m: logs.append(m.text)); pg.on("pageerror", lambda e: logs.append(str(e)))
        t0 = time.time()
        pg.goto(f"http://127.0.0.1:8765/render.html#s={s}&w={w}&h={h}")
        pg.wait_for_function("window.__done || window.__err", timeout=240000)
        err = pg.evaluate("window.__err")
        if err: print(s, "ERROR", err, logs); pg.close(); continue
        data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
        im = Image.open(io.BytesIO(base64.b64decode(data.split(",")[1]))).convert("RGB")
        im = im.resize((w // 2, h // 2), Image.LANCZOS)
        import numpy as np
        a = np.asarray(im).astype(np.float32) / 255.0
        yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        d = np.hypot((xx / a.shape[1] - 0.5) * 1.0, (yy / a.shape[0] - 0.5) * 0.85) * 1.3
        v = np.clip((1.15 - d) / 0.9, 0, 1); v = v * v * (3 - 2 * v); v = 1 - 0.85 * (1 - v)
        Image.fromarray((a * v[..., None] * 255).clip(0, 255).astype("uint8")).save(f"{ROOT}/out/render_{s}.png")
        print(s, "ok", round(time.time() - t0, 1), "s", logs[:3])
        pg.close()
    b.close()
srv.shutdown()
