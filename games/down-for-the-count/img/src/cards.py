"""Down for the Count — comic action-bubble card faces, box front and box sides.
   python3 cards.py         ten card faces and a contact sheet into out/
   python3 cards.py box     the box front into out/
   python3 cards.py site    after the two above: page images, play-build cards and 3D textures into the game folder"""
import math, os, random, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art_helpers as L
from PIL import Image, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
W, H = 750, 1050
WORDS = {1: ['TAP!'], 2: ['BIFF!'], 3: ['BAM!'], 4: ['POW!'], 5: ['WHAP!'], 6: ['THUD!'],
         7: ['WHAM!'], 8: ['CRACK!'], 9: ['SMASH!'], 10: ['BOOM!']}
COL = {n: L.PAL[n]['base'] for n in range(1, 10)}
CRIMSON, CRIMSON_D = (204, 22, 44), (128, 8, 22)
YELLOW = (255, 214, 48)
COL[10] = CRIMSON


def svg_png(svg, tag, width):
    sp, pp = f'{OUT}/_{tag}.svg', f'{OUT}/_{tag}.png'
    open(sp, 'w').write(svg)
    subprocess.run(['node', '-e', f"require('sharp')('{sp}',{{density:144}}).png().toFile('{pp}').then(()=>{{}})"], check=True,
                   env={**os.environ, 'NODE_PATH': '/opt/npm-tools/node_modules'})
    im = Image.open(pp).convert('RGBA')
    return im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)


def burst_pts(cx, cy, rx, ry, spikes, depth, seed, rot=0):
    rnd = random.Random(seed)
    pts = []
    for i in range(spikes * 2):
        a = math.radians(rot + i * 180 / spikes + rnd.uniform(-5, 5))
        if i % 2 == 0:
            k = 1 + rnd.uniform(-0.06, 0.12)
        else:
            k = 1 - depth + rnd.uniform(-0.04, 0.04)
        pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)))
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ' Z'


def bubble_svg(fill, back, spikes, depth, seed, rx=300, ry=250, sw=16):
    """Two stacked bursts (a coloured one behind, the main one in front) with a hard ink drop shadow."""
    big = burst_pts(400, 330, rx * 1.12, ry * 1.14, spikes, depth * 0.9, seed + 1, rot=180 / spikes / 2)
    main = burst_pts(400, 330, rx, ry, spikes, depth, seed)
    ink = L.hexc(L.INK)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 1000 860" width="2000" height="1720">'
            f'<path d="{big}" transform="translate(14 18)" fill="{ink}" stroke="{ink}" stroke-width="{sw}" stroke-linejoin="miter" stroke-miterlimit="10"/>'
            f'<path d="{big}" fill="{back}" stroke="{ink}" stroke-width="{sw}" stroke-linejoin="miter" stroke-miterlimit="10"/>'
            f'<path d="{main}" transform="translate(10 12)" fill="{ink}"/>'
            f'<path d="{main}" fill="{fill}" stroke="{ink}" stroke-width="{sw}" stroke-linejoin="miter" stroke-miterlimit="10"/>'
            f'</svg>')


def fit_size(lines, font, target_w, max_size):
    s = max_size
    while s > 40:
        f = ImageFont.truetype(font, s)
        if max(f.getbbox(t)[2] - f.getbbox(t)[0] for t in lines) <= target_w:
            return s
        s -= 4
    return s


def word_block(lines, size, fill, extrude):
    layers = [L.text_layer(size, t, L.BLACK_I, fill, L.INK, 11, extrude=extrude, extrude_n=10, shadow=False) for t in lines]
    gap = -int(size * 0.18)
    w = max(l.width for l in layers); h = sum(l.height for l in layers) + gap * (len(layers) - 1)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); y = 0
    for i, l in enumerate(layers):
        out.alpha_composite(l, ((w - l.width) // 2 + (i * 30 if len(layers) > 1 else 0) - (15 if len(layers) > 1 else 0), y))
        y += l.height + gap
    return out


def face(n, big=False):
    c = COL[n]
    if n == 10:
        bg = L.sunburst(W, H, [CRIMSON, CRIMSON_D], (W / 2, H * 0.5), rays=32, rot=4)
        bg = L.halftone(bg, YELLOW, alpha=80)
        fill, back, word_fill, extrude = L.hexc(YELLOW), L.hexc(L.WHITE), L.WHITE, CRIMSON
    else:
        bg = L.sunburst(W, H, [c, L.tint(c, 0.22)], (W / 2, H * 0.5), rays=28, rot=n * 7)
        bg = L.halftone(bg, L.shade(c, 0.25), alpha=70)
        fill, back, word_fill, extrude = L.hexc(L.WHITE), L.hexc(YELLOW if n not in (3,) else L.tint(c, 0.0)), c, L.shade(c, 0.35)
        if n == 3:
            back = L.hexc((255, 122, 26))
    spikes = 9 + n            # the bubble gets spikier as the rank climbs
    depth = 0.16 + n * 0.017
    bub = svg_png(bubble_svg(fill, back, spikes, depth, seed=n * 13), f'b{n}', 1038)
    bub = bub.rotate(-4 if n % 2 else 4, resample=Image.BICUBIC, expand=True)
    L.paste_center(bg, bub, W / 2 + 6, H / 2 + 4)
    lines = WORDS[n]
    size = fit_size(lines, L.BLACK_I, 470, 230)
    wb = word_block(lines, size, word_fill, extrude)
    wb = wb.rotate(-7 if n % 2 else 6, resample=Image.BICUBIC, expand=True)
    L.paste_center(bg, wb, W / 2 + 4, H / 2 - 6)
    num = L.text_layer((104 if n < 10 else 92) if not big else (190 if n < 10 else 150), str(n), L.BLACK, L.WHITE, L.INK, 9 if not big else 14,
                       extrude=L.shade(c, 0.35), extrude_n=7, shadow=False)
    bg.alpha_composite(num, (12, 0))
    bg.alpha_composite(num.rotate(180), (W - num.width - 12, H - num.height))
    return L.framed(bg)


def box(BW=1200, BH=1500):
    bg = L.sunburst(BW, BH, [CRIMSON, CRIMSON_D], (BW / 2, BH * 0.46), rays=40, rot=2)
    bg = L.halftone(bg, YELLOW, alpha=80)
    # small satellite bubbles first so the title burst sits on top of them
    for (x, y, word, col, rot, sd) in [(205, 1100, 'POW!', (47, 123, 255), -10, 3), (995, 1100, 'WHAM!', (60, 199, 90), 9, 7),
                                        (205, 175, 'BAM!', (255, 122, 26), 8, 11), (995, 175, 'SLAM!', (140, 75, 255), -8, 5)]:
        b = svg_png(bubble_svg(L.hexc(L.WHITE), L.hexc(YELLOW), 13, 0.24, seed=sd, rx=250, ry=200), f'sat{sd}', 475)
        b = b.rotate(rot, resample=Image.BICUBIC, expand=True)
        L.paste_center(bg, b, x, y)
        t = L.text_layer(fit_size([word], L.BLACK_I, 170, 100), word, L.BLACK_I, col, L.INK, 8,
                         extrude=L.shade(col, 0.35), extrude_n=7, shadow=False).rotate(rot, resample=Image.BICUBIC, expand=True)
        L.paste_center(bg, t, x, y - 4)
    big = svg_png(bubble_svg(L.hexc(YELLOW), L.hexc(L.WHITE), 22, 0.2, seed=99, rx=340, ry=300, sw=12), 'boxbub', 1250)
    big = big.rotate(-3, resample=Image.BICUBIC, expand=True)
    L.paste_center(bg, big, BW / 2 + 6, 640)
    for txt, y, fill, size in [('DOWN', 465, L.WHITE, 170), ('FOR THE', 595, CRIMSON, 100), ('COUNT', 725, L.WHITE, 170)]:
        t = L.text_layer(size, txt, L.BLACK_I, fill, L.INK, 13, extrude=CRIMSON_D if fill == L.WHITE else L.shade(CRIMSON, 0.45),
                         extrude_n=12, shadow=False).rotate(-5, resample=Image.BICUBIC, expand=True)
        L.paste_center(bg, t, BW / 2 + 8, y)
    by = L.text_layer(44, 'BY DARREN DON', L.BLACK_I, L.INK, L.INK, 0, shadow=False, spacing=4).rotate(-5, resample=Image.BICUBIC, expand=True)
    L.paste_center(bg, by, BW / 2 + 4, 862)
    # banner
    from PIL import ImageDraw
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((110, 1290, BW - 110, 1450), 26, fill=L.INK, outline=YELLOW, width=8)
    t1 = L.text_layer(64, 'A WRESTLING CARD GAME', L.BLACK_I, YELLOW, L.INK, 0, shadow=False)
    t2 = L.text_layer(38, '2–6 PLAYERS  ·  15 MINUTES', L.BLACK, L.WHITE, L.INK, 0, shadow=False)
    L.paste_center(bg, t1, BW / 2, 1345); L.paste_center(bg, t2, BW / 2, 1408)
    return L.framed(bg, radius=40, border=14)


def site_assets(site=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))):
    """Card images for the page and the play build, plus 3D textures for the mockups."""
    from PIL import ImageDraw
    for d in ('img', 'img/play', 'img/src/tex'):
        os.makedirs(f'{site}/{d}', exist_ok=True)
    if not os.path.exists(f'{OUT}/back.png'):
        L.card_back().save(f'{OUT}/back.png')
    back = Image.open(f'{OUT}/back.png').convert('RGBA')
    def flat(im):
        bg = Image.new('RGB', im.size, L.INK); bg.paste(im, (0, 0), im); return bg
    for n in range(1, 11):
        f = face(n)
        f.resize((500, 700), Image.LANCZOS).save(f'{site}/img/card-{n}.webp', quality=88)
        flat(f).save(f'{site}/img/src/tex/face-{n}.jpg', quality=92)
        face(n, big=True).resize((240, 336), Image.LANCZOS).save(f'{site}/img/play/card-{n}.webp', quality=90)
    back.resize((240, 336), Image.LANCZOS).save(f'{site}/img/play/back.webp', quality=90)
    back.resize((500, 700), Image.LANCZOS).save(f'{site}/img/card-back.webp', quality=88)
    flat(back).save(f'{site}/img/src/tex/back.jpg', quality=92)
    bx = Image.open(f'{OUT}/box.png').convert('RGBA')
    flat(bx).resize((1000, 1250), Image.LANCZOS).save(f'{site}/img/src/tex/box-top.jpg', quality=92)
    bx.resize((600, 750), Image.LANCZOS).save(f'{site}/img/box-front.webp', quality=90)
    # sides of a 4 x 5 x 1.25 in box: long side 5 x 1.25, end 4 x 1.25 (200 px per inch)
    for name, w, by in (('box-side', 1000, True), ('box-end', 800, False)):
        h = 250
        im = L.sunburst(w, h, [CRIMSON, CRIMSON_D], (w / 2, h / 2), rays=24, rot=3)
        im = L.halftone(im, YELLOW, alpha=70, step=12)
        d = ImageDraw.Draw(im)
        d.rectangle((10, 10, w - 11, h - 11), outline=YELLOW, width=6)
        t = L.text_layer(92 if by else 78, 'DOWN FOR THE COUNT', L.BLACK_I, L.WHITE, L.INK, 8, extrude=CRIMSON_D, extrude_n=7, shadow=False)
        if t.width > w - 70:
            t = t.resize((w - 70, int(t.height * (w - 70) / t.width)), Image.LANCZOS)
        if by:
            L.paste_center(im, t, w / 2, h / 2 - 22)
            b = L.text_layer(34, 'BY DARREN DON', L.BLACK_I, YELLOW, L.INK, 4, shadow=False, spacing=3)
            L.paste_center(im, b, w / 2, h / 2 + 66)
        else:
            L.paste_center(im, t, w / 2, h / 2)
        im.convert('RGB').save(f'{site}/img/src/tex/{name}.jpg', quality=92)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'site':
        site_assets(); sys.exit()
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == 'box':
        im = box(); im.save(f'{OUT}/box.png')
        im.resize((600, 750), Image.LANCZOS).save(f'{OUT}/box_small.png')
    else:
        ns = [int(a) for a in sys.argv[1:]] or list(range(1, 11))
        cards = {}
        for n in ns:
            im = face(n); im.save(f'{OUT}/card{n:02d}.png'); cards[n] = im
        if len(ns) == 10:
            tw, th = 300, 420
            sheet = Image.new('RGB', (tw * 5 + 60, th * 2 + 36), (40, 40, 46))
            for i, n in enumerate(ns):
                sheet.paste(cards[n].convert('RGB').resize((tw, th), Image.LANCZOS), (12 + (i % 5) * (tw + 12), 12 + (i // 5) * (th + 12)))
            sheet.save(f'{OUT}/cardsheet.png')
