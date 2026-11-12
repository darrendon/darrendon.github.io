#!/usr/bin/env python3
"""Render the In Development box art: python3 shoot.py [game ...]
Needs the site served at http://localhost:8123 (python3 -m http.server 8123 from the repo root).
Writes in-development/<slug>/img/scene.webp (1600x1000) plus -640/-1200, and box-front.webp (900x900) plus -480."""
import sys, os, io
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
GAMES = {'slipstream': 'slipstream', 'jibber': '2-jibber-2-jabble', 'abducted': 'abducted', 'polar': 'polar-bear-market', 'dayone': 'day-one', 'nestegg': 'nest-egg'}
want = sys.argv[1:] or list(GAMES)
with sync_playwright() as p:
    b = p.chromium.launch()
    for g in want:
        out = os.path.join(ROOT, 'in-development', GAMES[g], 'img'); os.makedirs(out, exist_ok=True)
        for view, (w, h), name, sizes in [('scene', (1600, 1000), 'scene', [640, 1200]), ('box', (900, 900), 'box-front', [480])]:
            pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
            pg.goto(f'http://localhost:8123/in-development/img/src/art.html?g={g}&view={view}')
            pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
            im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
            im.save(os.path.join(out, name + '.webp'), quality=88)
            for s in sizes:
                im.resize((s, round(h * s / w)), Image.LANCZOS).save(os.path.join(out, f'{name}-{s}.webp'), quality=86)
            pg.close()
        print('ok', g)
    b.close()
