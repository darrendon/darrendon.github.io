#!/usr/bin/env python3
"""Sentai art and stills. Site served on :8123 from the repo root.
  python3 shoot.py art            flat art -> tex/*.jpg (textures) and ../*.webp (site images)
  python3 shoot.py scene NAME ... three.js stills -> ../render-NAME.webp (+ srcset sizes), with the overlap check
  python3 shoot.py check NAME ... overlap check only"""
import sys, os, io, base64
from playwright.sync_api import sync_playwright
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); IMG = os.path.dirname(HERE); TEX = os.path.join(HERE, 'tex')
URL = 'http://localhost:8123/games/sentai/img/src/'
HEROES = ['hero-0-7', 'hero-1-4', 'hero-2-5', 'hero-3-6', 'hero-4-9', 'hero-0-2', 'hero-1-11', 'hero-2-12', 'hero-3-3', 'hero-4-1', 'hero-1-7', 'hero-3-7']
BOSSES = ['boss-0', 'boss-2', 'boss-4', 'boss-8', 'boss-11', 'boss-12', 'boss-13', 'boss-17', 'boss-18', 'boss-26', 'boss-35']
CARDS = HEROES + ['hero-back'] + BOSSES + ['boss-back-%d' % i for i in range(6)] + ['power-%d' % c for c in range(5)]
# (name, query, css width, css height, device scale): cards are 292 x 408 css px captured at 750 x 1050; the box is 4 x 5.5 x 1.25 in
ART = [(c, 'p=' + c, 292, 408, 750 / 292) for c in CARDS] + [('box-front', 'p=box-front', 520, 715, 1.5), ('box-side', 'p=box-side', 163, 715, 1.5), ('box-end', 'p=box-end', 520, 163, 1.5)]
SITE = dict({c: [240] for c in CARDS}, **{'box-front': [240, 480]})
def save_sizes(im, base, sizes):
    im.save(os.path.join(IMG, base + '.webp'), quality=88)
    for s in sizes: im.resize((s, round(im.height * s / im.width)), Image.LANCZOS).save(os.path.join(IMG, f'{base}-{s}.webp'), quality=86)
def art(b):
    os.makedirs(TEX, exist_ok=True)
    for name, qs, w, h, dsf in ART:
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dsf)
        pg.goto(URL + 'art.html?' + qs); pg.wait_for_function('window.__done === true'); pg.wait_for_timeout(150)
        im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB'); pg.close()
        if name in CARDS: im = im.resize((750, 1050), Image.LANCZOS)
        im.save(os.path.join(TEX, name + '.jpg'), quality=92)
        if name in SITE: save_sizes(im if name.startswith('box') else im.resize((500, 700), Image.LANCZOS), name, SITE[name])
        print('art', name)
CHECK = open(os.path.join(os.path.dirname(IMG), '..', 'diggers', 'img', 'src', 'shoot.py')).read().split('CHECK = r"""')[1].split('"""')[0].replace('window.__dig', 'window.__sen')
def scene(b, specs, save=True):
    for spec in specs:
        parts = spec.split(':'); sc = parts[0]; w = int(parts[1]) if len(parts) > 1 else 1600; h = int(parts[2]) if len(parts) > 2 else 1000
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto(URL + f'scene.html?scene={sc}&w={w}&h={h}', wait_until='commit'); pg.wait_for_function('window.__done === true', timeout=240000)
        c = pg.evaluate(CHECK, 3)
        print(f"{sc}: {c['objects']} objects | overlap {len(c['overlap'])} | near {len(c['near'])} | cut {len(c['cut'])} | off-screen {len(c['empty'])}")
        for k in ('overlap', 'near'):
            for a, d, n in c[k]: print(f'   {k}: {a} x {d} ({n} px)')
        for x in c['cut'] + c['empty']: print('   ', x)
        if save:
            png = pg.evaluate("document.querySelector('canvas').toDataURL('image/png')")
            im = Image.open(io.BytesIO(base64.b64decode(png.split(',')[1]))).convert('RGB')
            save_sizes(im, 'render-' + sc, [240, 480, 640, 800, 1200])
        pg.close()
if __name__ == '__main__':
    mode, rest = sys.argv[1], sys.argv[2:]
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        if mode == 'art': art(b)
        elif mode == 'scene': scene(b, rest)
        elif mode == 'check': scene(b, rest, False)
        b.close()
