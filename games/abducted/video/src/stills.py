"""Render the two video-only stills (vtitle, vkit) at 1920x1080 from the mockup scene."""
import base64, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for sc in ('vtitle', 'vkit'):
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        pg.goto(f'http://localhost:8124/games/abducted/img/src/scene.html?scene={sc}&w=1920&h=1080', wait_until='commit'); pg.wait_for_function('window.__done === true', timeout=240000)
        png = pg.evaluate("document.querySelector('canvas').toDataURL('image/png')")
        Image.open(io.BytesIO(base64.b64decode(png.split(',')[1]))).convert('RGB').save(os.path.join(HERE, sc + '.jpg'), quality=92); pg.close(); print(sc)
    b.close()
