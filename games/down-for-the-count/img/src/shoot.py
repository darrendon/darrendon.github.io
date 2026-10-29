"""Shoot stills from scene.html (needs the site served at http://localhost:8765/).

  python3 shoot.py SCENE OUT.png [W H]      -> PNG of the canvas at W x H (default 1600 x 1000)
  python3 shoot.py --check SCENE [W H]      -> per-object silhouette check (overlaps / too close / cut by frame)
"""
import sys, base64, io, json
from PIL import Image
from playwright.sync_api import sync_playwright

ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
URL = "http://localhost:8765/games/down-for-the-count/img/src/scene.html?scene={s}&w={w}&h={h}{x}"


def main():
    a = sys.argv[1:]
    check = a and a[0] == "--check"
    if check: a = a[1:]
    s = a[0]
    if check: out, rest = None, a[1:]
    else: out, rest = a[1], a[2:]
    w, h = (int(rest[0]), int(rest[1])) if len(rest) >= 2 else (1600, 1000)
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        pg = b.new_page(viewport={"width": 800, "height": 500})
        logs = []
        pg.on("console", lambda m: logs.append(m.text)); pg.on("pageerror", lambda e: logs.append(str(e)))
        pg.goto(URL.format(s=s, w=w, h=h, x="&check=1" if check else ""))
        pg.wait_for_function("window.__done", timeout=600000)
        if check:
            r = pg.evaluate("window.__check")
            print(f"{s}: {r['objects']} objects | overlap {len(r['overlap'])} | too close {len(r['near'])} | cut by frame {len(r['cut'])} | empty {len(r['empty'])}")
            for k in ("overlap", "near"):
                for o1, o2, n in r[k]: print(f"   {k}: {o1}  x  {o2}  ({n} px)")
            for c in r["cut"]: print("   cut:", c)
            for c in r.get("env", []): print("   environment (runs off frame by design, not checked for cut):", c)
            for c in r["empty"]: print("   empty:", c)
        else:
            data = pg.evaluate("document.querySelector('canvas').toDataURL('image/png')")
            Image.open(io.BytesIO(base64.b64decode(data.split(",")[1]))).convert("RGB").save(out)
            print(s, "->", out, logs[:5])
        b.close()


main()
