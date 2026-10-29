# Too Many Crooks! stills: python3 shoot.py <hero|table|kit|themed> out.png [w h] [check]  (needs the site served on :8765)
import sys, base64, json
from playwright.sync_api import sync_playwright
# usage: shoot.py scene out.png [w h] [check]
scene, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
h = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
check = len(sys.argv) > 5 and sys.argv[5] == 'check'
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 800, "height": 500})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == 'error' else None)
    url = f"http://localhost:8765/games/too-many-crooks/img/src/scene.html?scene={scene}&w={w}&h={h}" + ("&check=1" if check else "")
    pg.goto(url)
    try:
        pg.wait_for_function("window.__done", timeout=600000)
    except Exception as e:
        print("TIMEOUT", errs); raise
    if errs: print("ERRS", errs)
    if check:
        r = pg.evaluate("window.__check")
        print(f"{scene}: {r['objects']} objects ({', '.join(r['names'])}) | overlap {len(r['overlap'])} | too close {len(r['near'])} | cut by frame {len(r['cut'])} | empty {len(r['empty'])}")
        for k in ("overlap", "near"):
            for a, c, n in r[k]: print(f"   {k}: {a} x {c} ({n} px)")
        for c in r["cut"]: print("   cut:", c)
        print("   min gap px:", json.dumps(r.get('gaps', {})))
    else:
        d = pg.evaluate("document.querySelector('canvas').toDataURL('image/png')")
        open(out, 'wb').write(base64.b64decode(d.split(',')[1]))
    b.close()
