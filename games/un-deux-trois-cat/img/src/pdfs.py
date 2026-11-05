"""Un, Deux, Trois, Cat! — print the sell sheet, the print-and-play kit and the retail rulebook (rulebook.html) to PDF,
and save the page previews. Run from anywhere: python3 pdfs.py [sheet] [pnp] [rules] (no arguments: all three)"""
import os, io, sys, threading, http.server, functools, pikepdf
from playwright.sync_api import sync_playwright
from pypdf import PdfReader
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, "../../../.."))
GAME = os.path.abspath(os.path.join(HERE, "../.."))
IMG = os.path.join(GAME, "img")


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8773), functools.partial(Q, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:8773/games/un-deux-trois-cat/"


def sizes(im, stem, widths):
    im.save(os.path.join(IMG, stem + ".webp"), quality=88, method=6)
    for w in widths:
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(os.path.join(IMG, f"{stem}-{w}.webp"), quality=86, method=6)


DO = set(sys.argv[1:]) or {"sheet", "pnp", "rules"}

with sync_playwright() as p:
    b = p.chromium.launch()
    # sell sheet
    if "sheet" in DO:
        pg = b.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=1.5)
        pg.goto(BASE + "sell-sheet.html"); pg.wait_for_function("window.__done", timeout=60000); pg.wait_for_timeout(300)
        sizes(Image.open(io.BytesIO(pg.locator(".sheet").screenshot())).convert("RGB"), "sell-sheet", [240, 480, 800, 1200])
        pg.emulate_media(media="print")
        pg.pdf(path=os.path.join(GAME, "un-deux-trois-cat-sell-sheet.pdf"), width="11in", height="8.5in", print_background=True, prefer_css_page_size=True)
        pg.close()
    # print and play
    if "pnp" in DO:
        pg = b.new_page(viewport={"width": 900, "height": 1200}, device_scale_factor=1)
        pg.goto(BASE + "print-and-play.html"); pg.wait_for_function("window.__done", timeout=60000); pg.wait_for_timeout(300)
        pages = pg.locator(".page")
        shots = [Image.open(io.BytesIO(pages.nth(i).screenshot())).convert("RGB") for i in (0, 1, 2)]
        h = 880; ws = [round(s.width * h / s.height) for s in shots]; gap = 24
        strip = Image.new("RGB", (sum(ws) + gap * 2, h), (232, 225, 216))
        x = 0
        for s, w in zip(shots, ws):
            strip.paste(s.resize((w, h), Image.LANCZOS), (x, 0)); x += w + gap
        sizes(strip, "pnp-preview", [240, 480, 800, 1200])
        pg.emulate_media(media="print")
        pnp = os.path.join(GAME, "un-deux-trois-cat-print-and-play.pdf")
        pg.pdf(path=pnp, width="8.5in", height="11in", print_background=True, prefer_css_page_size=True)
    # retail rulebook
    if "rules" in DO:
        pg = b.new_page(viewport={"width": 900, "height": 1200})
        pg.goto(BASE + "rulebook.html"); pg.wait_for_function("window.__done", timeout=60000); pg.wait_for_timeout(300)
        pg.emulate_media(media="print")
        rules = os.path.join(GAME, "un-deux-trois-cat-rules.pdf")
        pg.pdf(path=rules, width="8.5in", height="11in", print_background=True, prefer_css_page_size=True)
        pg.close()
    b.close()
srv.shutdown()

titles = {"sheet": ("un-deux-trois-cat-sell-sheet.pdf", "Sell Sheet"), "pnp": ("un-deux-trois-cat-print-and-play.pdf", "Print and Play"),
          "rules": ("un-deux-trois-cat-rules.pdf", "Rules")}
for k in DO:
    f, t = titles[k]
    q = pikepdf.open(os.path.join(GAME, f), allow_overwriting_input=True)
    q.docinfo["/Title"] = f"Un, Deux, Trois, Cat! — {t}"; q.docinfo["/Author"] = "Darren Don"; q.save(os.path.join(GAME, f))
    print(f, "pages:", len(q.pages))
