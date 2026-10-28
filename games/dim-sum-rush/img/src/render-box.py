# Renders box-top/side/end.html to the textures in /assets/img/tex/ (needs the site served at :8765)
import sys
from playwright.sync_api import sync_playwright
from PIL import Image
SIZES = {'box-top': (1430, 1000), 'box-side': (1200, 280), 'box-end': (840, 280)}
out_dir = sys.argv[1] if len(sys.argv) > 1 else '/root/site/assets/img/tex'
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h) in SIZES.items():
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto(f'http://localhost:8765/games/dim-sum-rush/img/src/{name}.html', wait_until='networkidle'); pg.wait_for_timeout(400)
        import io
        Image.open(io.BytesIO(pg.screenshot())).convert('RGB').save(f'{out_dir}/{name}.webp', 'WEBP', quality=90, method=6)
        print('saved', name)
    b.close()
