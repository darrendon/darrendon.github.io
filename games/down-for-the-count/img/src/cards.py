"""Down for the Count — card faces, card back, box and sell-sheet art, in the cartoon-cast style.
   python3 cards.py faces | back | box   render into out/
   python3 cards.py site                 after those: page images, play-build cards and 3D textures into the game folder
   python3 cards.py sheetart             the standalone logo and the pin panel used on the sell sheet"""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art_helpers as L
from PIL import Image, ImageDraw, ImageFilter
import moves
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
SC = OUT + '/'
W, H = 750, 1050
INK = (28, 21, 48)
RANK = {1: (19, 194, 176), 2: (255, 122, 26), 3: (255, 206, 26), 4: (60, 199, 90), 5: (47, 123, 255),
        6: (140, 75, 255), 7: (240, 48, 58), 8: (255, 61, 154), 9: (30, 200, 240), 10: (255, 184, 0)}

def svg_png(svg, tag, width):
    p, o = f'{SC}_{tag}.svg', f'{SC}_{tag}.png'
    open(p, 'w').write(svg)
    subprocess.run(['node', '-e', f"require('sharp')('{p}',{{density:144}}).resize({width}).png().toFile('{o}').then(()=>{{}})"], check=True,
                   env={**os.environ, 'NODE_PATH': '/opt/npm-tools/node_modules'})
    return Image.open(o).convert('RGBA')

def spotlight(w, h, base, cx, cy, r, lift=0.32):
    """A flat colour with a soft round spotlight behind the action."""
    img = Image.new('RGBA', (w, h), (*base, 255))
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).ellipse((cx - r, cy - r * 0.8, cx + r, cy + r * 0.8), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(r * 0.35))
    img.paste(Image.new('RGBA', (w, h), (*L.tint(base, lift), 255)), (0, 0), m)
    return img

def face(n):
    base = L.tint(RANK[n], 0.42)
    bg = spotlight(W, H, base, W / 2, 470, 360, 0.4)
    AW = 830                                           # the action is drawn a little larger than the card is wide
    art = svg_png(moves.svg(n), f'face{n}', AW)
    gy = 80 + int(moves.GY / 600 * 750)                # where the mat meets the apron
    top = gy - int(moves.GY / 600 * AW)
    d = ImageDraw.Draw(bg)
    d.rectangle((0, gy, W, H), fill=(*L.tint(RANK[n], 0.85), 255))          # the mat, seen edge-on
    d.rectangle((0, gy + 26, W, H), fill=(*RANK[n], 255))                    # the ring apron
    d.line((0, gy + 26, W, gy + 26), fill=INK, width=6)
    d.line((0, gy, W, gy), fill=INK, width=5)
    bg.alpha_composite(art, ((W - AW) // 2, top))
    name = moves.NAMES[n]
    t = L.text_layer(84, name, L.BLACK_I, L.WHITE, L.INK, 9, extrude=L.shade(RANK[n], 0.55), extrude_n=6, shadow=False)
    if t.width > 520: t = t.resize((520, int(t.height * 520 / t.width)), Image.LANCZOS)
    L.paste_center(bg, t, W / 2, gy + 26 + (H - gy - 26) / 2 - 6)
    num = L.text_layer(150 if n < 10 else 124, str(n), L.BLACK, L.WHITE, L.INK, 12, extrude=L.shade(RANK[n], 0.45), extrude_n=8, shadow=False)
    bg.alpha_composite(num, (20, 6))
    small = L.text_layer(150 if n < 10 else 124, str(n), L.BLACK, L.WHITE, L.INK, 12, extrude=L.shade(RANK[n], 0.45), extrude_n=8, shadow=False)
    small = small.resize((small.width * 4 // 10, small.height * 4 // 10), Image.LANCZOS).rotate(180)
    bg.alpha_composite(small, (W - small.width - 22, H - small.height - 18))
    return L.framed(bg)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    what = sys.argv[1] if len(sys.argv) > 1 else 'faces'
    if what in ('faces', 'all'):
        cards = {}
        for n in range(1, 11):
            cards[n] = face(n); cards[n].save(f'{OUT}/card{n:02d}.png')
        tw, th = 300, 420
        sheet = Image.new('RGB', (tw * 5 + 72, th * 2 + 36), (40, 40, 46))
        for i, n in enumerate(range(1, 11)):
            sheet.paste(cards[n].convert('RGB').resize((tw, th), Image.LANCZOS), (12 + (i % 5) * (tw + 12), 12 + (i // 5) * (th + 12)))
        sheet.save(f'{OUT}/cardsheet.png')

# ---------------------------------------------------------------- logo, card back, box
ROYAL, ROYAL_D, RED, GOLD = (36, 92, 232), (18, 46, 150), (232, 48, 63), (255, 204, 40)

def logo(width):
    """The wordmark: DOWN / FOR THE / COUNT, white with red extrusion, FOR THE on a gold ribbon."""
    big = 300
    a = L.text_layer(big, 'DOWN', L.BLACK_I, L.WHITE, L.INK, 22, extrude=RED, extrude_n=16, shadow=False)
    c = L.text_layer(big, 'COUNT', L.BLACK_I, L.WHITE, L.INK, 22, extrude=RED, extrude_n=16, shadow=False)
    mid = L.text_layer(120, 'FOR THE', L.BLACK_I, L.INK, L.INK, 0, shadow=False, spacing=8)
    rw, rh = int(mid.width + 160), int(mid.height + 34)
    rib = Image.new('RGBA', (rw + 40, rh + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(rib)
    pts = [(20, 20), (rw + 20, 20), (rw - 10, rh / 2 + 20), (rw + 20, rh + 20), (20, rh + 20), (50, rh / 2 + 20)]
    d.polygon([(x + 10, y + 12) for x, y in pts], fill=L.INK)
    d.polygon(pts, fill=GOLD, outline=L.INK); d.line(pts + [pts[0]], fill=L.INK, width=12, joint='curve')
    L.paste_center(rib, mid, rw / 2 + 20, rh / 2 + 20)
    Wd = max(a.width, c.width) + 40
    out = Image.new('RGBA', (Wd, a.height + c.height + rib.height - 150), (0, 0, 0, 0))
    out.alpha_composite(a, ((Wd - a.width) // 2, 0))
    out.alpha_composite(c, ((Wd - c.width) // 2, out.height - c.height))
    out.alpha_composite(rib, ((Wd - rib.width) // 2, a.height - 95))
    out = out.rotate(5, resample=Image.BICUBIC, expand=True)
    return out.resize((width, int(out.height * width / out.width)), Image.LANCZOS)

def ropes_layer(w, h, ys, colors=('#E8303F', '#FFFFFF', '#2F6BFF'), sag=12, sw=22):
    parts = []
    for y, col in zip(ys, colors):
        d = f'M-40 {y} Q{w/2} {y + sag} {w + 40} {y}'
        parts.append(f'<path d="{d}" fill="none" stroke="#1C1530" stroke-width="{sw + 12}" stroke-linecap="round"/><path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round"/>')
    return svg_png(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{"".join(parts)}</svg>', f'ropes{w}x{h}', w)

def card_back():
    bg = spotlight(W, H, ROYAL, W / 2, H / 2, 420, 0.22)
    d = ImageDraw.Draw(bg)
    for i in range(-20, 40):                           # faint diagonal pinstripes
        x = i * 46
        d.line((x, 0, x + H * 0.5, H), fill=(*L.tint(ROYAL, 0.12), 255), width=10)
    bg.alpha_composite(ropes_layer(W, H, (H / 2 - 150, H / 2, H / 2 + 150)))
    lg = logo(560)
    L.paste_center(bg, L.drop_shadow(lg, blur=10, offset=(0, 10), alpha=90), W / 2, H / 2); L.paste_center(bg, lg, W / 2, H / 2)
    return L.framed(bg)

def box_front(BW=1200, BH=1500):
    import toon, moves as M
    bg = spotlight(BW, BH, ROYAL, BW / 2, BH * 0.55, 700, 0.28)
    d = ImageDraw.Draw(bg)
    for i in range(-30, 60):
        x = i * 60
        d.line((x, 0, x + BH * 0.5, BH), fill=(*L.tint(ROYAL, 0.1), 255), width=14)
    # the ring: ropes behind, canvas, apron
    mat_y = 1230
    bg.alpha_composite(ropes_layer(BW, BH, (760, 900, 1040), sag=18, sw=20))
    d.rectangle((0, mat_y, BW, BH), fill=(244, 240, 232, 255))
    d.rectangle((0, mat_y + 40, BW, BH), fill=(*RED, 255))
    d.line((0, mat_y, BW, mat_y), fill=L.INK, width=8); d.line((0, mat_y + 40, BW, mat_y + 40), fill=L.INK, width=8)
    # the scene, drawn in a 1200 x 1500 frame with the mat at y = mat_y
    S2 = 2.2; gy = mat_y
    rk = dict(x=640, y=gy - CAST_W('rocket') / 2 * S2 - 2, rot=90, face=-1, scale=S2, expr='dizzy', look=(0, -1),
              arms={'b': (-20, 40, 14), 'f': (40, -40, -10)}, legs={'b': (-6, 98, 4), 'f': (16, 100, -4)})
    moe = dict(x=450, y=gy - CAST_W('rocket') * S2 - CAST_W('moe') / 2 * S2 + 40, rot=86, face=1, scale=S2, expr='grin', look=(1, -1),
               arms={'b': (-10, -60, -10), 'f': (100, -10, -14)}, legs={'b': (-24, 98, 10), 'f': (14, 100, 4)})
    ref = dict(x=960, y=gy - 168, rot=12, face=-1, scale=S2, expr='shock', look=(-1, 0),
               arms={'b': (-52, 34, 8), 'f': (66, -84, -14)}, legs={'b': ('w', 1015, gy - 14, -16), 'f': ('w', 900, gy - 20, 20)})
    duch = dict(x=150, y=566, rot=-8, face=1, scale=1.7, expr='grin', look=(1, 1),
                arms={'b': (-62, -50, 10), 'f': (60, -60, -10)}, legs={'b': (-26, 92, 6), 'f': (26, 92, -6)})
    post = f'<rect x="120" y="640" width="60" height="{gy - 640}" rx="12" fill="#C9CBD6" stroke="#1C1530" stroke-width="9"/>' + ''.join(
        f'<rect x="104" y="{y - 34}" width="92" height="68" rx="18" fill="#E8303F" stroke="#1C1530" stroke-width="9"/>' for y in (760, 900, 1040))
    bubbles = []
    for (x, y, word, r, rot) in ((730, 740, '1!', 76, -10), (900, 650, '2!', 88, 6), (1080, 735, '3!', 98, -6)):
        bubbles.append(toon.burst(x, y, r, r * 0.72, 12, rot, fill='#FFFFFF', sw=10))
    scene = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BW} {BH}" width="{BW}" height="{BH}">{post}'
             f'<ellipse cx="560" cy="{gy + 8}" rx="300" ry="26" fill="#1C1530" opacity="0.22"/>'
             f'{toon.character("duchess", duch)}{toon.character("rocket", rk)}{toon.character("moe", moe)}{toon.character("ref", ref)}'
             f'{"".join(bubbles)}'
             '</svg>')
    bg.alpha_composite(svg_png(scene, 'boxscene', BW))
    for (x, y, word, size, rot) in ((730, 740, '1!', 90, -10), (900, 650, '2!', 102, 6), (1080, 735, '3!', 114, -6)):
        t = L.text_layer(size, word, L.BLACK_I, RED, L.INK, 9, extrude=L.shade(RED, 0.4), extrude_n=6, shadow=False).rotate(-rot, resample=Image.BICUBIC, expand=True)
        L.paste_center(bg, t, x, y + 4)
    lg = logo(800)
    L.paste_center(bg, L.drop_shadow(lg, blur=14, offset=(0, 14), alpha=100), BW / 2, 292); L.paste_center(bg, lg, BW / 2, 292)
    # bottom strip on the apron
    t1 = L.text_layer(54, 'A WRESTLING CARD GAME', L.BLACK_I, L.WHITE, L.INK, 6, shadow=False, spacing=2)
    L.paste_center(bg, t1, BW / 2, mat_y + 40 + 72)
    t2 = L.text_layer(36, '2–5 PLAYERS  ·  15 MINUTES', L.BLACK, (255, 236, 170), L.INK, 0, shadow=False, spacing=2)
    L.paste_center(bg, t2, BW / 2, mat_y + 40 + 140)
    by = L.text_layer(40, 'BY DARREN DON', L.BLACK_I, L.WHITE, L.INK, 6, shadow=False, spacing=4)
    L.paste_center(bg, by, BW / 2, 596)
    return L.framed(bg, radius=40, border=14)

def CAST_W(name):
    import toon
    return toon.CAST[name]['w']

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] in ('back', 'box', 'all'):
    if sys.argv[1] in ('back', 'all'): card_back().save(f'{OUT}/back.png')
    if sys.argv[1] in ('box', 'all'):
        b = box_front(); b.save(f'{OUT}/box.png'); b.resize((600, 750), Image.LANCZOS).save(f'{OUT}/box_small.png')

def box_side(w, h, byline):
    bg = spotlight(w, h, ROYAL, w / 2, h / 2, w * 0.6, 0.2)
    d = ImageDraw.Draw(bg)
    for i in range(-10, 40): d.line((i * 40, 0, i * 40 + h * 0.5, h), fill=(*L.tint(ROYAL, 0.1), 255), width=10)
    d.rectangle((0, h - 34, w, h), fill=(*RED, 255)); d.line((0, h - 34, w, h - 34), fill=L.INK, width=5)
    t = L.text_layer(96 if byline else 82, 'DOWN FOR THE COUNT', L.BLACK_I, L.WHITE, L.INK, 9, extrude=RED, extrude_n=7, shadow=False)
    if t.width > w - 60: t = t.resize((w - 60, int(t.height * (w - 60) / t.width)), Image.LANCZOS)
    L.paste_center(bg, t, w / 2, h / 2 - (26 if byline else 14))
    if byline:
        b = L.text_layer(30, 'BY DARREN DON', L.BLACK_I, GOLD, L.INK, 4, shadow=False, spacing=3)
        L.paste_center(bg, b, w / 2, h / 2 + 52)
    return bg.convert('RGB')

def site_assets(site=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))):
    for dd in ('img', 'img/play', 'img/src/tex'): os.makedirs(f'{site}/{dd}', exist_ok=True)
    flat = lambda im: (lambda bgc: (bgc.paste(im, (0, 0), im), bgc)[1])(Image.new('RGB', im.size, L.INK))
    for n in range(1, 11):
        fc = Image.open(f'{OUT}/card{n:02d}.png').convert('RGBA')
        fc.resize((500, 700), Image.LANCZOS).save(f'{site}/img/card-{n}.webp', quality=88)
        fc.resize((240, 336), Image.LANCZOS).save(f'{site}/img/play/card-{n}.webp', quality=90)
        flat(fc).save(f'{site}/img/src/tex/face-{n}.jpg', quality=92)
    bk = Image.open(f'{OUT}/back.png').convert('RGBA')
    bk.resize((500, 700), Image.LANCZOS).save(f'{site}/img/card-back.webp', quality=88)
    bk.resize((240, 336), Image.LANCZOS).save(f'{site}/img/play/back.webp', quality=90)
    flat(bk).save(f'{site}/img/src/tex/back.jpg', quality=92)
    bx = Image.open(f'{OUT}/box.png').convert('RGBA')
    flat(bx).resize((1000, 1250), Image.LANCZOS).save(f'{site}/img/src/tex/box-top.jpg', quality=92)
    bx.resize((600, 750), Image.LANCZOS).save(f'{site}/img/box-front.webp', quality=90)
    box_side(1000, 250, True).save(f'{site}/img/src/tex/box-side.jpg', quality=92)
    box_side(800, 250, False).save(f'{site}/img/src/tex/box-end.jpg', quality=92)

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'site':
    site_assets()

def sheet_art(site=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))):
    """Extra art for the sell sheet: the wordmark on its own and a small '1, 2, 3' pin panel."""
    import toon
    lg = logo(1100); lg.save(f'{site}/img/logo.webp', quality=92)
    gy = 420
    ref = dict(x=462, y=gy - 118, rot=10, face=-1, scale=1.5, expr='shock', look=(-1, 1),
               arms={'b': (-44, 36, 6), 'f': (66, -84, -14)}, legs={'b': ('w', 500, gy - 10, -16), 'f': ('w', 420, gy - 14, 20)})
    hal = dict(x=220, y=gy - toon.CAST['hal']['w'] / 2 * 1.5 - 2, rot=90, face=-1, scale=1.5, expr='dizzy', look=(0, -1),
               arms={'b': (-20, 40, 14), 'f': (40, -40, -10)}, legs={'b': (-6, 98, 4), 'f': (16, 100, -4)})
    bub = toon.burst(300, 110, 70, 50, 12, -6, fill='#FFFFFF', sw=8)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 460" width="1120" height="920">'
           f'<rect x="0" y="{gy}" width="560" height="40" fill="#F4F0E8"/><path d="M0 {gy} H560" stroke="#1C1530" stroke-width="6"/>'
           f'<ellipse cx="250" cy="{gy + 6}" rx="130" ry="14" fill="#1C1530" opacity="0.2"/>'
           f'{toon.character("hal", hal)}{toon.character("ref", ref)}{toon.stars(272, gy - 112, 44, 3, 10)}{bub}</svg>')
    im = svg_png(svg, 'pinpanel', 1120)
    t = L.text_layer(150, '3!', L.BLACK_I, RED, L.INK, 12, extrude=L.shade(RED, 0.4), extrude_n=8, shadow=False).rotate(6, resample=Image.BICUBIC, expand=True)
    L.paste_center(im, t, 300 * 2, 110 * 2 + 6)
    im.save(f'{site}/img/panel-pin.webp', quality=90)

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'sheetart':
    sheet_art()
