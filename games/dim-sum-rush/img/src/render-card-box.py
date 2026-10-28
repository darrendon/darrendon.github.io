# Renders card-box-top/side/end.html to tex/ (the card-version box textures used by the `cards` view of
# /assets/js/dsr-scene.js). Needs the site served at :8765
import io, os
from playwright.sync_api import sync_playwright
from PIL import Image
SIZES = {'card-box-top': (1356, 1000), 'card-box-side': (1200, 346), 'card-box-end': (840, 329)}
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h) in SIZES.items():
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.goto(f'http://localhost:8765/games/dim-sum-rush/img/src/{name}.html', wait_until='networkidle'); pg.wait_for_timeout(400)
        Image.open(io.BytesIO(pg.screenshot())).convert('RGB').save(f'{out_dir}/{name}.webp', 'WEBP', quality=90, method=6)
        print('saved', name)
    b.close()
