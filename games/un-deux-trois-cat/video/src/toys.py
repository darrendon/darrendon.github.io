#!/usr/bin/env python3
"""Renders toy-mouse.png and toy-cat.png (the playable's 3D toys, cut out with their shadows) from toys.html for the
video's explainer board. Site on :8124."""
from playwright.sync_api import sync_playwright
from PIL import Image
import io, os
HERE = os.path.dirname(os.path.abspath(__file__))
GL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
with sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    for toy, extra in (("mouse", "&yaw=-0.5&el=36"), ("cat", "&yaw=0.25&el=24")):
        pg = b.new_page(viewport={"width": 900, "height": 700}, device_scale_factor=2)
        pg.goto("http://127.0.0.1:8124/games/un-deux-trois-cat/video/src/toys.html?toy=" + toy + extra)
        pg.wait_for_function("window.__done", timeout=60000); pg.wait_for_timeout(300)
        im = Image.open(io.BytesIO(pg.locator("canvas:not(#gl)").screenshot(omit_background=True)))
        im = im.crop(im.getbbox()); im.save(os.path.join(HERE, f"toy-{toy}.png")); print(toy, im.size, im.mode)
    b.close()
