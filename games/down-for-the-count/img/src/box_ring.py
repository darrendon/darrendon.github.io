"""Down for the Count box front: the logo inside a wrestling ring seen from above, with navy box sides.
   python3 box_ring.py install   writes img/box-front.webp and the 3D textures tex/box-top.jpg, box-side.jpg, box-end.jpg;
   then re-shoot the stills with shoot.py (hero, table, kit, home, themed; og.jpg is themed at 1200 x 630)."""
import os, sys, math
SRC = '/root/site/games/down-for-the-count/img/src'
sys.path.insert(0, SRC)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE + '/out'; os.makedirs(OUT, exist_ok=True)
import cards as C, art_helpers as L, toon
from PIL import Image, ImageDraw
C.SC = OUT + '/'
INKH = '#1C1530'
ROYAL, RED, GOLD = C.ROYAL, C.RED, C.GOLD
NAVY = (16, 26, 74)

def rgb(c): return '#%02x%02x%02x' % c

def svg(w, h, body, tag):
    return C.svg_png(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>', tag, w)

def put_logo(bg, width, cx, cy, rot=None):
    lg = C.logo(width)
    L.paste_center(bg, L.drop_shadow(lg, blur=14, offset=(0, 14), alpha=100), cx, cy); L.paste_center(bg, lg, cx, cy)

def text(bg, size, s, cx, cy, fill=L.WHITE, font=L.BLACK_I, stroke=L.INK, sw=6, spacing=2):
    L.paste_center(bg, L.text_layer(size, s, font, fill, stroke, sw, shadow=False, spacing=spacing), cx, cy)

def stand(name, x, mat, s, **kw):
    return dict(x=x, y=mat - 104 * s, scale=s, **kw)

BW, BH = 1200, 1500

def info(bg, y, fill_main=L.WHITE):
    text(bg, 54, 'A WRESTLING CARD GAME', BW / 2, y, fill=fill_main)
    text(bg, 36, '2–5 PLAYERS  ·  15 MINUTES', BW / 2, y + 64, fill=(255, 236, 170), font=L.BLACK, sw=0)

def box_min_ring():
    bg = Image.new('RGBA', (BW, BH), (*NAVY, 255))
    m = 90; x0, y0 = m, 118; x1, y1 = BW - m, 118 + BW - 2 * m
    parts = [f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="#F4F0E8" stroke="{INKH}" stroke-width="14"/>']
    for k, col in enumerate(('#E8303F', '#FFFFFF', '#2F6BFF')):
        i = 34 + k * 34
        parts.append(f'<rect x="{x0+i}" y="{y0+i}" width="{x1-x0-2*i}" height="{y1-y0-2*i}" rx="14" fill="none" stroke="{INKH}" stroke-width="24"/>'
                     f'<rect x="{x0+i}" y="{y0+i}" width="{x1-x0-2*i}" height="{y1-y0-2*i}" rx="14" fill="none" stroke="{col}" stroke-width="12"/>')
    for (cx, cy), col in zip(((x0 + 34, y0 + 34), (x1 - 34, y0 + 34), (x1 - 34, y1 - 34), (x0 + 34, y1 - 34)), ('#E8303F', '#2F6BFF', '#E8303F', '#2F6BFF')):
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="52" fill="{col}" stroke="{INKH}" stroke-width="12"/>')
    bg.alpha_composite(svg(BW, BH, ''.join(parts), 'min_ring'))
    cy = (y0 + y1) / 2
    put_logo(bg, 700, BW / 2, cy)
    info(bg, y1 + 100)
    text(bg, 40, 'BY DARREN DON', BW / 2, BH - 90, fill=GOLD, sw=0, spacing=6)
    return L.framed(bg, radius=40, border=14)

def install():
    """Put the ring cover on the site: box front, the 3D box lid, and navy box sides to match."""
    site = '/root/site/games/down-for-the-count'
    bx = box_min_ring()
    bx.resize((600, 750), Image.LANCZOS).save(f'{site}/img/box-front.webp', quality=90)
    flat = Image.new('RGB', bx.size, L.INK); flat.paste(bx, (0, 0), bx)
    flat.resize((1000, 1250), Image.LANCZOS).save(f'{site}/img/src/tex/box-top.jpg', quality=92)
    C.ROYAL = NAVY
    C.box_side(1000, 250, True).save(f'{site}/img/src/tex/box-side.jpg', quality=92)
    C.box_side(800, 250, False).save(f'{site}/img/src/tex/box-end.jpg', quality=92)

if __name__ == '__main__' and 'install' in sys.argv:
    install(); print('installed')
