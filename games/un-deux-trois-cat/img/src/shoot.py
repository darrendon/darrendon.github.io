"""Un, Deux, Trois, Cat! — render the art and the mockups from the site root.

python3 shoot.py art          card faces, card back, box lid/side/end -> tex/ (jpg) and ../ (webp for the page)
python3 shoot.py scene NAME   a three.js still from scene.html (hero|table|kit|home|og|cozy) -> ../render-NAME.webp + sizes (cozy -> render-scene)
python3 shoot.py check NAMES  draws each object's silhouette on its own and reports overlaps, near misses and frame cuts
python3 shoot.py page URL OUT [W H]   screenshot any page on the local site (used for previews)
"""
import sys, os, io, threading, http.server, functools
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "../../../.."))
IMG = os.path.abspath(os.path.join(HERE, ".."))
TEX = os.path.join(HERE, "tex")
os.makedirs(TEX, exist_ok=True)


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8771), functools.partial(Q, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:8771"
GL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


def save_sizes(im, stem, widths, q=86):
    im.save(os.path.join(IMG, stem + ".webp"), quality=88, method=6)
    for w in widths:
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(os.path.join(IMG, f"{stem}-{w}.webp"), quality=q, method=6)


def art(p):
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1800, "height": 1200}, device_scale_factor=3)
    pg.goto(BASE + "/games/un-deux-trois-cat/img/src/art.html")
    pg.wait_for_function("window.__done", timeout=60000)
    pg.wait_for_timeout(400)
    ids = pg.evaluate("[...document.querySelectorAll('.face,.back,.lid,.side,.cat-hero')].map(e=>e.id)")
    for i in ids:
        if i == "cat-hero":
            pg.evaluate("document.body.style.background = 'transparent'")
        png = pg.locator("#" + i).screenshot(omit_background=(i == "cat-hero"))
        im = Image.open(io.BytesIO(png))
        if i.startswith("face-") or i == "back":
            im.convert("RGB").save(os.path.join(TEX, i + ".jpg"), quality=92)            # 750 x 1050, 300 dpi
            small = im.convert("RGB").resize((500, 700), Image.LANCZOS)
            small.save(os.path.join(IMG, ("card-" + i[5:] if i != "back" else "card-back") + ".webp"), quality=88, method=6)
            small.resize((240, 336), Image.LANCZOS).save(os.path.join(IMG, ("card-" + i[5:] if i != "back" else "card-back") + "-240.webp"), quality=86, method=6)
        elif i == "cat-hero":
            im.resize((600, 600), Image.LANCZOS).save(os.path.join(IMG, "cat-hero.webp"), quality=90, method=6, exact=True)
            im.save(os.path.join(TEX, "cat-hero.png"))
        else:
            im.convert("RGB").resize((im.width * 2 // 3, im.height * 2 // 3), Image.LANCZOS).save(os.path.join(TEX, i + ".jpg"), quality=92)
            if i == "box-top":
                im.convert("RGB").resize((800, 800), Image.LANCZOS).save(os.path.join(IMG, "box-front.webp"), quality=88, method=6)
        print("saved", i)
    b.close()


def scene(p, name, w=1600, h=1000):
    b = p.chromium.launch(args=GL)
    pg = b.new_page(viewport={"width": w, "height": h})
    pg.goto(f"{BASE}/games/un-deux-trois-cat/img/src/scene.html?scene={name}&w={w}&h={h}")
    pg.wait_for_function("window.__done || window.__err", timeout=300000)
    err = pg.evaluate("window.__err")
    if err:
        print(name, "ERROR", err); b.close(); return
    png = pg.locator("canvas").screenshot()
    b.close()
    im = Image.open(io.BytesIO(png)).convert("RGB")
    if name == "og":
        im.save(os.path.join(IMG, "og.jpg"), quality=88)
    elif name == "home":
        save_sizes(im, "render-home", [640, 1200])
    elif name == "cozy":  # the themed still: plum felt cloth, one overhead pool of light -> render-scene (homepage card and first image on the page)
        save_sizes(im, "render-scene", [240, 480, 640, 800, 1200], q=84)
    else:
        save_sizes(im, "render-" + name, [240, 480, 800, 640])
    print("saved render", name)


def check(p, names):
    b = p.chromium.launch(args=GL)
    for n in names:
        cw, ch = (800, 420) if n == "og" else (800, 500)
        pg = b.new_page(viewport={"width": cw, "height": ch})
        pg.goto(f"{BASE}/games/un-deux-trois-cat/img/src/scene.html?scene={n}&w={cw}&h={ch}&check=1")
        pg.wait_for_function("window.__done || window.__err", timeout=300000)
        err = pg.evaluate("window.__err")
        if err:
            print(n, "ERROR", err); continue
        r = pg.evaluate("window.__check")
        print(f"{n}: {r['objects']} objects | overlap {len(r['overlap'])} | too close {len(r['near'])} | cut by frame {len(r['cut'])}")
        for k in ("overlap", "near"):
            for a, c, m in r[k]:
                print(f"   {k}: {a}  x  {c}  ({m} px)")
        for c in r["cut"]:
            print("   cut:", c)
        pg.close()
    b.close()


def page(p, url, out, w=1280, h=900):
    b = p.chromium.launch(args=GL)
    pg = b.new_page(viewport={"width": int(w), "height": int(h)})
    pg.goto(BASE + url)
    pg.wait_for_timeout(2500)
    pg.screenshot(path=out, full_page=True)
    b.close()


with sync_playwright() as p:
    cmd = sys.argv[1]
    if cmd == "art":
        art(p)
    elif cmd == "scene":
        for n in sys.argv[2:]:
            scene(p, n, 1200 if n == "og" else 1600, 630 if n == "og" else 1000)
    elif cmd == "check":
        check(p, sys.argv[2:])
    elif cmd == "page":
        page(p, *sys.argv[2:])
srv.shutdown()
