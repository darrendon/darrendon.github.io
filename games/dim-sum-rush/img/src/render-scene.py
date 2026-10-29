# Renders the teahouse hero still (view 'scene' of /assets/js/dsr-scene.js) to ../render-scene.webp (1600 x 1000,
# shot at 2x and downscaled) plus its responsive sizes. Overlap check first: python3 shoot3d.py check scene:1600:1000
import os, subprocess, sys
from PIL import Image
SP = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(SP)
png = os.path.join(SP, 'out-scene.png')
subprocess.run([sys.executable, os.path.join(SP, 'shoot3d.py'), 'shoot', f'scene:1600:1000:2:{png}'], check=True)
im = Image.open(png).convert('RGB')
im.resize((1600, 1000), Image.LANCZOS).save(os.path.join(OUT, 'render-scene.webp'), 'WEBP', quality=88, method=6)
for w in (240, 480, 640, 800, 1200):
    im.resize((w, w * 10 // 16), Image.LANCZOS).save(os.path.join(OUT, f'render-scene-{w}.webp'), 'WEBP', quality=84, method=6)
print('saved render-scene*.webp')
