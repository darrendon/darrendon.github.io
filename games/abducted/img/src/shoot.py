#!/usr/bin/env python3
"""Abducted art and stills. Site served on :8123 from the repo root.
  python3 shoot.py art            flat art -> tex/*.jpg (textures) and ../*.webp (site images)
  python3 shoot.py scene NAME ... three.js stills -> ../render-NAME.webp (+ srcset sizes), with the overlap check
  python3 shoot.py check NAME ... overlap check only"""
import sys, os, io, base64
from playwright.sync_api import sync_playwright
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); IMG = os.path.dirname(HERE); TEX = os.path.join(HERE, 'tex')
URL = 'http://localhost:8124/games/abducted/img/src/'
ART = [('face-H%d' % v, 'p=team&t=H&v=%d' % v, 750, 1050) for v in range(4)] + [('face-A%d' % v, 'p=team&t=A&v=%d' % v, 750, 1050) for v in range(4)] + [
  ('back', 'p=back', 750, 1050), ('split-saucer', 'p=split&s=saucer', 750, 1050), ('split-cow', 'p=split&s=cow', 750, 1050),
  ('leader', 'p=leader', 750, 1050), ('score', 'p=score', 750, 1050), ('box-front', 'p=box-front', 780, 1290), ('box-side', 'p=box-side', 300, 1290), ('box-end', 'p=box-end', 780, 300)]
SITE = {'face-H0': [240], 'face-H1': [240], 'face-H2': [240], 'face-H3': [240], 'face-A0': [240], 'face-A1': [240], 'face-A2': [240], 'face-A3': [240],
        'back': [240], 'split-saucer': [240], 'split-cow': [240], 'leader': [240], 'score': [240], 'box-front': [240, 480]}
def save_sizes(im, base, sizes):
    im.save(os.path.join(IMG, base + '.webp'), quality=88)
    for s in sizes: im.resize((s, round(im.height * s / im.width)), Image.LANCZOS).save(os.path.join(IMG, f'{base}-{s}.webp'), quality=86)
def art(b):
    os.makedirs(TEX, exist_ok=True)
    for name, qs, w, h in ART:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto(URL + 'art.html?' + qs); pg.wait_for_function('window.__done === true'); pg.wait_for_timeout(150)
        im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB'); pg.close()
        im.save(os.path.join(TEX, name + '.jpg'), quality=92)
        if name in SITE:
            small = im if name.startswith('box') else im.resize((500, 700), Image.LANCZOS)
            save_sizes(small, name if name != 'box-front' else 'box-front', SITE[name])
        print('art', name)
CHECK = open(os.path.join(os.path.dirname(IMG), '..', 'diggers', 'img', 'src', 'shoot.py')).read().split('CHECK = r"""')[1].split('"""')[0].replace('window.__dig', 'window.__ab')
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
