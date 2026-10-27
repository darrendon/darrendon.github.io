import sys, threading, http.server, functools, json
from playwright.sync_api import sync_playwright
import os
ROOT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    for s in sys.argv[1:]:
        pg = b.new_page(viewport={"width": 800, "height": 500})
        pg.goto(f"http://127.0.0.1:8766/render.html#s={s}&w=1600&h=1000&check=1")
        pg.wait_for_function("window.__done || window.__err", timeout=240000)
        err = pg.evaluate("window.__err")
        if err: print(s, "ERROR", err); continue
        r = pg.evaluate("window.__check")
        print(f"{s}: {r['objects']} objects | overlap {len(r['overlap'])} | too close {len(r['near'])} | cut by frame {len(r['cut'])}")
        for k in ("overlap", "near"):
            for a, c, n in r[k]: print(f"   {k}: {a}  ×  {c}  ({n} px)")
        for c in r["cut"]: print("   cut:", c)
        pg.close()
    b.close()
srv.shutdown()
