"""Shared drawing helpers for the Down for the Count art: sunbursts, halftone, outlined type, card frames and the card back (card_back()).
The mask faces and poster box in here are from an earlier art pass and are no longer used."""
import os
import math, subprocess, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')  # scratch output, not committed
BLACK = '/usr/share/fonts/opentype/inter/InterDisplay-Black.otf'
BLACK_I = '/usr/share/fonts/opentype/inter/InterDisplay-BlackItalic.otf'
INK = (28, 21, 48)
WHITE = (255, 252, 244)
GOLD = (255, 196, 40)
GOLD_D = (200, 130, 10)

def hexc(c): return '#%02x%02x%02x' % tuple(int(v) for v in c[:3])
def mix(a, b, t): return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))
def tint(c, t): return mix(c, (255, 255, 255), t)
def shade(c, t): return mix(c, (0, 0, 0), t)

# ------------------------------------------------------------------ mask SVG
HEAD = ("M200 30 C 104 30 52 100 52 200 C 52 290 88 360 128 400 C 150 422 172 432 200 434 "
        "C 228 432 250 422 272 400 C 312 360 348 290 348 200 C 348 100 296 30 200 30 Z")
L_SUR = "M197 194 C 192 244 132 262 86 240 C 60 226 46 196 44 146 C 66 168 84 166 104 158 C 142 144 190 150 197 194 Z"
L_EYE = "M86 206 C 100 172 152 168 178 192 C 164 228 108 232 86 206 Z"
MOUTH_SUR = "M200 298 C 238 298 270 312 278 336 C 264 378 228 390 200 390 C 172 390 136 378 122 336 C 130 312 162 298 200 298 Z"
MOUTH = "M150 334 C 172 316 228 316 250 334 C 240 366 160 366 150 334 Z"
CREST = ("M200 44 C 224 68 254 70 268 94 C 280 118 264 146 238 156 L 200 184 L 162 156 "
         "C 136 146 120 118 132 94 C 146 70 176 68 200 44 Z")
COLLAR = "M140 424 L 260 424 L 292 504 L 108 504 Z"

def star_path(cx, cy, ro, ri, n=5, rot=-90):
    pts = []
    for i in range(2 * n):
        a = math.radians(rot + i * 180 / n); r = ro if i % 2 == 0 else ri
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + ' Z'

EMBLEMS = {
    'bar':      "<rect x='188' y='70' width='24' height='88' rx='8'/>",
    'chevrons': "<path d='M166 80 L200 104 L234 80 L234 98 L200 122 L166 98 Z'/><path d='M166 110 L200 134 L234 110 L234 128 L200 152 L166 128 Z'/>",
    'waves':    "<path d='M160 92 Q180 76 200 92 Q220 108 240 92 L240 108 Q220 124 200 108 Q180 92 160 108 Z'/><path d='M160 122 Q180 106 200 122 Q220 138 240 122 L240 138 Q220 154 200 138 Q180 122 160 138 Z'/>",
    'bolt':     "<path d='M214 66 L182 118 L200 118 L186 158 L226 102 L208 102 L224 66 Z'/>",
    'star':     f"<path d='{star_path(200, 112, 40, 16)}'/>",
    'diamond':  "<path d='M200 66 L232 112 L200 158 L168 112 Z'/>",
    'flame':    "<path d='M200 64 C 224 92 238 112 230 136 C 222 156 178 156 170 136 C 162 112 186 98 200 64 Z'/>",
    'moon':     "<path d='M222 72 A 42 42 0 1 0 222 152 A 32 32 0 1 1 222 72 Z'/>",
    'sun':      f"<path d='{star_path(200, 112, 42, 24, 10)}'/>",
    'gem':      "<path d='M200 72 L230 96 L218 150 L182 150 L170 96 Z'/>",
}

def mask_svg(cfg):
    base = cfg['base']; acc = cfg['accent']; ink = hexc(INK); w = hexc(WHITE); g = hexc(GOLD); gd = hexc(GOLD_D)
    metal = cfg.get('metal', False)
    b_hi, b, b_lo = hexc(tint(base, 0.35)), hexc(base), hexc(shade(base, 0.18))
    a, a_lo = hexc(acc), hexc(shade(acc, 0.25))
    def outlined(d, fill, sw=7, extra=''):
        return f'<path d="{d}" fill="{fill}" stroke="{ink}" stroke-width="{sw}" stroke-linejoin="round" {extra}/>'
    def piped(d, fill):  # white shape with gold piping inside and ink outline
        return (f'<path d="{d}" fill="{fill}" stroke="{ink}" stroke-width="16" stroke-linejoin="round"/>'
                f'<path d="{d}" fill="{fill}" stroke="url(#goldg)" stroke-width="8" stroke-linejoin="round"/>'
                f'<path d="{d}" fill="none" stroke="{ink}" stroke-width="2" stroke-linejoin="round" opacity="0.5"/>')
    mirror = 'transform="translate(400 0) scale(-1 1)"'

    behind = ''
    if cfg.get('behind') == 'horns':
        horn = "M150 80 C 100 70 52 40 42 -2 C 92 6 140 30 176 60 Z"
        behind = (f'<g>{outlined(horn, "url(#accg)", 8)}<path d="M146 72 C 104 62 68 38 58 12" fill="none" stroke="{w}" stroke-width="5" stroke-linecap="round" opacity="0.8"/></g>'
                  f'<g {mirror}>{outlined(horn, "url(#accg)", 8)}<path d="M146 72 C 104 62 68 38 58 12" fill="none" stroke="{w}" stroke-width="5" stroke-linecap="round" opacity="0.8"/></g>')
    elif cfg.get('behind') == 'wings':
        wing = ("M80 120 C 20 96 2 40 30 0 C 44 60 70 92 100 110 Z "
                "M66 190 C 4 182 -16 124 12 88 C 30 146 54 172 84 186 Z "
                "M70 260 C 10 270 -12 222 14 190 C 32 236 52 252 82 258 Z")
        behind = (f'<path d="{wing}" fill="{w}" stroke="{ink}" stroke-width="16" stroke-linejoin="round"/>'
                  f'<path d="{wing}" fill="{w}" stroke="url(#goldg)" stroke-width="7" stroke-linejoin="round"/>'
                  f'<g {mirror}><path d="{wing}" fill="{w}" stroke="{ink}" stroke-width="16" stroke-linejoin="round"/>'
                  f'<path d="{wing}" fill="{w}" stroke="url(#goldg)" stroke-width="7" stroke-linejoin="round"/></g>')
    elif cfg.get('behind') == 'flames':
        fl = ("M70 180 C 20 130 52 80 18 20 C 78 50 104 110 108 150 Z "
              "M96 110 C 56 60 92 20 70 -40 C 130 0 140 60 136 96 Z "
              "M150 70 C 120 20 156 -16 142 -72 C 196 -30 196 26 186 64 Z "
              "M200 60 C 178 10 210 -30 200 -78 C 240 -36 232 16 224 60 Z")
        behind = (f'<g>{outlined(fl, "url(#flameg)", 8)}</g><g {mirror}>{outlined(fl, "url(#flameg)", 8)}</g>')

    cheeks = ''
    ck = cfg.get('cheek')
    if ck == 'swirl':
        sw = "M66 270 C 76 312 122 318 136 292 C 146 272 126 254 110 266 C 100 274 108 288 118 284"
        cheeks = (f'<path d="{sw}" fill="none" stroke="{ink}" stroke-width="16" stroke-linecap="round"/>'
                  f'<path d="{sw}" fill="none" stroke="{w}" stroke-width="8" stroke-linecap="round"/>')
    elif ck == 'stars':
        cheeks = outlined(star_path(96, 290, 26, 11), 'url(#accg)', 6)
    elif ck == 'bolts':
        cheeks = outlined("M108 262 L 82 300 L 98 300 L 86 330 L 120 290 L 104 290 L 116 262 Z", 'url(#accg)', 6)
    elif ck == 'waves':
        cheeks = outlined("M58 274 Q 82 260 106 274 Q 126 286 140 276 L 142 292 Q 126 304 104 290 Q 82 278 60 292 Z", w, 6)
    elif ck == 'diamonds':
        cheeks = outlined("M94 262 L 112 288 L 94 314 L 76 288 Z", 'url(#accg)', 6) + outlined("M128 286 L 140 302 L 128 318 L 116 302 Z", w, 5)
    cheek_svg = f'<g>{cheeks}</g><g {mirror}>{cheeks}</g>' if cheeks else ''

    emblem = EMBLEMS[cfg['emblem']].replace('<path', f'<path fill="url(#accg)" stroke="{ink}" stroke-width="5" stroke-linejoin="round"')\
                                   .replace('<rect', f'<rect fill="url(#accg)" stroke="{ink}" stroke-width="5"')

    studs = ''.join(f'<circle cx="200" cy="{y}" r="7" fill="url(#goldg)" stroke="{ink}" stroke-width="3"/>' for y in (226, 250, 274))
    gems = ''.join(f'<circle cx="{x}" cy="{y}" r="9" fill="{a}" stroke="{ink}" stroke-width="4"/><circle cx="{x-3}" cy="{y-3}" r="3" fill="#fff" opacity="0.85"/>'
                   for (x, y) in ((116, 120), (284, 120), (130, 366), (270, 366)))

    crown = ''
    if cfg.get('top') == 'crown':
        cr = "M120 50 L 112 -40 L 154 6 L 200 -64 L 246 6 L 288 -40 L 280 50 C 248 36 152 36 120 50 Z"
        crown = (outlined(cr, 'url(#goldg)', 9) +
                 ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{hexc((220,30,60))}" stroke="{ink}" stroke-width="4"/><circle cx="{x-3}" cy="{y-3}" r="3" fill="#fff" opacity="0.9"/>'
                         for (x, y, r) in ((200, 4, 13), (152, 26, 9), (248, 26, 9), (112, -40, 8), (288, -40, 8), (200, -64, 9))))

    base_fill = 'url(#metalg)' if metal else 'url(#baseg)'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -80 440 600" width="880" height="1200">
<defs>
  <linearGradient id="baseg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{b_hi}"/><stop offset="0.45" stop-color="{b}"/><stop offset="1" stop-color="{b_lo}"/></linearGradient>
  <linearGradient id="metalg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FFF3B0"/><stop offset="0.3" stop-color="#FFC628"/><stop offset="0.55" stop-color="#E89A10"/><stop offset="0.75" stop-color="#FFD54A"/><stop offset="1" stop-color="#C77A08"/></linearGradient>
  <linearGradient id="accg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexc(tint(acc, 0.2))}"/><stop offset="1" stop-color="{a_lo}"/></linearGradient>
  <linearGradient id="goldg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE580"/><stop offset="0.5" stop-color="{g}"/><stop offset="1" stop-color="{gd}"/></linearGradient>
  <linearGradient id="flameg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF5A1F"/><stop offset="0.6" stop-color="#FFB020"/><stop offset="1" stop-color="#FFE97A"/></linearGradient>
  <linearGradient id="holeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E0A1C"/><stop offset="1" stop-color="#2E2648"/></linearGradient>
  <radialGradient id="sheen" cx="0.33" cy="0.2" r="0.5"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
  <radialGradient id="edge" cx="0.5" cy="0.45" r="0.6"><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></radialGradient>
  <clipPath id="hc"><path d="{HEAD}"/></clipPath>
</defs>
{behind}
<path d="{COLLAR}" fill="{w}" stroke="{ink}" stroke-width="8" stroke-linejoin="round"/>
<path d="M140 424 L 260 424 L 266 440 L 134 440 Z" fill="{ink}" opacity="0.25"/>
{''.join(f'<circle cx="{x}" cy="{y}" r="5" fill="url(#goldg)" stroke="{ink}" stroke-width="2.5"/>' for x in (178, 222) for y in (452, 474, 496))}
<path d="M178 452 L 222 474 M222 452 L 178 474 M178 474 L 222 496 M222 474 L 178 496" stroke="{b}" stroke-width="5" stroke-linecap="round"/>
<path d="{HEAD}" fill="{base_fill}"/>
<g clip-path="url(#hc)">
  <path d="M200 30 L 200 44" stroke="{w}" stroke-width="4"/>
  {cheek_svg}
  <path d="{HEAD}" fill="url(#sheen)"/>
  <path d="{HEAD}" fill="url(#edge)"/>
</g>
<path d="{HEAD}" fill="none" stroke="{ink}" stroke-width="9" stroke-linejoin="round"/>
{piped(CREST, w)}
{emblem}
<g>{piped(L_SUR, w)}</g><g {mirror}>{piped(L_SUR, w)}</g>
{piped(MOUTH_SUR, w)}
<path d="{L_EYE}" fill="url(#holeg)" stroke="{ink}" stroke-width="5"/>
<path d="{L_EYE}" fill="url(#holeg)" stroke="{ink}" stroke-width="5" {mirror}/>
<path d="{MOUTH}" fill="url(#holeg)" stroke="{ink}" stroke-width="5"/>
{studs}
{gems}
{crown}
</svg>"""

def render_mask(cfg, width, tag):
    svgp = f'{OUT}/_mask_{tag}.svg'; pngp = f'{OUT}/_mask_{tag}.png'
    open(svgp, 'w').write(mask_svg(cfg))
    subprocess.run(['node', '-e', f"require('sharp')('{svgp}',{{density:144}}).png().toFile('{pngp}').then(()=>{{}})"],
                   check=True, env={**os.environ, 'NODE_PATH': '/opt/npm-tools/node_modules'})
    im = Image.open(pngp).convert('RGBA')
    h = int(im.height * width / im.width)
    return im.resize((width, h), Image.LANCZOS)

# ------------------------------------------------------------------ backgrounds & type
def sunburst(w, h, colors, center, rays=28, rot=0.0):
    yy, xx = np.mgrid[0:h, 0:w]
    ang = (np.degrees(np.arctan2(yy - center[1], xx - center[0])) + rot) % 360
    idx = (ang // (360 / rays)).astype(int) % len(colors)
    pal = np.array(colors, float)
    img = pal[idx]
    # gentle radial lightening toward the centre
    d = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2) / max(w, h)
    img = img * (1 - 0.10 * np.clip(d, 0, 1))[..., None] + 255 * (0.10 * np.clip(1 - d * 2.2, 0, 1))[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')

def halftone(img, color, alpha=40, step=14, rmax=3.2, region='edges'):
    w, h = img.size
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for y in range(0, h, step):
        for x in range((y // step) % 2 * step // 2, w, step):
            t = math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2))
            r = rmax * max(0, min(1, (t - 0.55) * 1.6))
            if r > 0.4:
                d.ellipse([x - r, y - r, x + r, y + r], fill=(*color, alpha))
    return Image.alpha_composite(img, ov)

def text_layer(size, text, font, fill, stroke, stroke_w, extrude=None, extrude_n=0, shadow=True, spacing=0, skew=0.0):
    f = ImageFont.truetype(font, size)
    tmp = ImageDraw.Draw(Image.new('L', (10, 10)))
    widths = [tmp.textlength(ch, font=f) for ch in text]
    tw = sum(widths) + spacing * (len(text) - 1)
    bbox = tmp.textbbox((0, 0), 'HÀgy', font=f)
    th = bbox[3] - bbox[1]
    pad = stroke_w + extrude_n + 40
    W, H = int(tw + 2 * pad + abs(skew) * th), int(th + 2 * pad)
    m = Image.new('L', (W, H), 0); dm = ImageDraw.Draw(m)
    x = pad
    for ch, wch in zip(text, widths):
        dm.text((x, pad - bbox[1]), ch, font=f, fill=255); x += wch + spacing
    if skew:
        m = m.transform(m.size, Image.AFFINE, (1, skew, -skew * H / 2, 0, 1, 0), Image.BICUBIC)
    arr = np.array(m) > 127
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    outline = ndimage.binary_dilation(arr, iterations=stroke_w) if stroke_w > 0 else arr.copy()
    if shadow:
        sh = ndimage.gaussian_filter(ndimage.shift(outline.astype(float), (extrude_n + 10, extrude_n + 6), order=0), 6)
        out = Image.alpha_composite(out, Image.fromarray(np.dstack([np.zeros_like(sh)] * 3 + [sh * 120]).astype(np.uint8), 'RGBA'))
    if extrude and extrude_n:
        for k in range(extrude_n, 0, -1):
            e = ndimage.shift(outline.astype(float), (k, k), order=0) > 0.5
            col = extrude if k < extrude_n else INK
            lay = np.zeros((H, W, 4), np.uint8); lay[e] = (*col, 255)
            out = Image.alpha_composite(out, Image.fromarray(lay, 'RGBA'))
        lay = np.zeros((H, W, 4), np.uint8)
        e = ndimage.shift(outline.astype(float), (extrude_n, extrude_n), order=0) > 0.5
        e = e & ~ndimage.binary_erosion(e, iterations=3)
        lay[e] = (*INK, 255); out = Image.alpha_composite(out, Image.fromarray(lay, 'RGBA'))
    lay = np.zeros((H, W, 4), np.uint8); lay[outline] = (*stroke, 255); lay[arr] = (*fill, 255)
    out = Image.alpha_composite(out, Image.fromarray(lay, 'RGBA'))
    return out

def paste_center(base, layer, cx, cy):
    base.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))

def drop_shadow(layer, blur=16, offset=(10, 18), alpha=110):
    a = layer.split()[3].point(lambda v: int(v * alpha / 255))
    sh = Image.new('RGBA', (layer.width + 120, layer.height + 120), (0, 0, 0, 0))
    blk = Image.new('RGBA', layer.size, (*INK, 255)); blk.putalpha(a)
    sh.alpha_composite(blk, (60 + offset[0], 60 + offset[1]))
    return sh.filter(ImageFilter.GaussianBlur(blur))

def framed(img, radius=36, border=12):
    w, h = img.size
    frame = Image.new('RGBA', (w, h), (*INK, 255))
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([border, border, w - border, h - border], radius=radius - 6, fill=255)
    frame.paste(img, (0, 0), m)
    full = Image.new('L', (w, h), 0); ImageDraw.Draw(full).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); out.paste(frame, (0, 0), full)
    return out

# ------------------------------------------------------------------ the set
PAL = {
    1:  dict(base=(19, 194, 176),  accent=(255, 64, 150),  emblem='bar',      cheek='swirl'),
    2:  dict(base=(255, 122, 26),  accent=(47, 123, 255),  emblem='chevrons', cheek='diamonds'),
    3:  dict(base=(255, 206, 26),  accent=(140, 75, 255),  emblem='waves',    cheek='waves'),
    4:  dict(base=(60, 199, 90),   accent=(255, 70, 70),   emblem='bolt',     cheek='bolts'),
    5:  dict(base=(47, 123, 255),  accent=(255, 206, 26),  emblem='star',     cheek='stars'),
    6:  dict(base=(140, 75, 255),  accent=(255, 196, 40),  emblem='diamond',  cheek='swirl',   behind='horns'),
    7:  dict(base=(240, 48, 58),   accent=(255, 196, 40),  emblem='flame',    cheek='swirl',   behind='flames'),
    8:  dict(base=(255, 61, 154),  accent=(30, 200, 240),  emblem='moon',     cheek='stars'),
    9:  dict(base=(30, 200, 240),  accent=(255, 61, 154),  emblem='sun',      cheek='swirl',   behind='wings'),
    10: dict(base=(255, 196, 40),  accent=(220, 30, 60),   emblem='star',      cheek='swirl',   top='crown', metal=True),
}
W, H = 750, 1050

def card_face(n):
    cfg = PAL[n]
    if n == 10:
        bg = sunburst(W, H, [(176, 16, 32), (128, 8, 22)], (W / 2, H * 0.47), rays=32, rot=3)
    else:
        bg = sunburst(W, H, [tint(cfg['base'], 0.55), tint(cfg['base'], 0.72)], (W / 2, H * 0.47), rays=28, rot=n * 7)
    bg = halftone(bg, shade(cfg['base'], 0.2) if n != 10 else (255, 196, 40), alpha=60 if n != 10 else 90)
    # small white sparkles
    d = ImageDraw.Draw(bg); r = np.random.default_rng(n)
    for _ in range(10):
        x, y = r.integers(60, W - 60), r.integers(60, H - 60)
        if abs(x - W / 2) < 260 and 140 < y < 920: continue
        s = r.integers(8, 16)
        d.polygon([(x, y - s), (x + s * 0.28, y - s * 0.28), (x + s, y), (x + s * 0.28, y + s * 0.28), (x, y + s), (x - s * 0.28, y + s * 0.28), (x - s, y), (x - s * 0.28, y - s * 0.28)], fill=(*WHITE, 230))
    m = render_mask(cfg, 700 if cfg.get('behind') or cfg.get('top') else 660, f'face{n}')
    sh = drop_shadow(m)
    cy = H * 0.505 + (20 if cfg.get('top') else 0)
    bg.alpha_composite(sh, (int(W / 2 - m.width / 2 - 60), int(cy - m.height / 2 - 60)))
    paste_center(bg, m, W / 2, cy)
    numcol = cfg['base'] if n != 10 else (255, 196, 40)
    num = text_layer(104 if n < 10 else 92, str(n), BLACK, WHITE, INK, 9, extrude=shade(numcol, 0.1), extrude_n=7, shadow=False)
    bg.alpha_composite(num, (8, -4))
    bg.alpha_composite(num.rotate(180), (W - num.width - 8, H - num.height + 4))
    return framed(bg)

def card_back():
    # arena floor: magenta with a diamond lattice, rotationally symmetric
    floor = sunburst(W, H, [(22, 26, 64), (16, 18, 48)], (W / 2, H / 2), rays=32); d = ImageDraw.Draw(floor)
    step = 70
    for y in range(-step, H + step, step):
        for x in range(-step, W + step, step):
            ox = (y // step) % 2 * step // 2
            cx, cy = x + ox, y
            s5 = [(cx + 9 * math.cos(math.radians(-90 + i * 36)) * (1 if i % 2 == 0 else 0.42),
                   cy + 9 * math.sin(math.radians(-90 + i * 36)) * (1 if i % 2 == 0 else 0.42)) for i in range(10)]
            d.polygon(s5, fill=(255, 196, 40, 150))
    # ring from directly above
    S = 600; x0, y0 = (W - S) // 2, (H - S) // 2
    d.rectangle([x0 - 34, y0 - 34, x0 + S + 34, y0 + S + 34], fill=(*INK, 255))                     # apron edge
    d.rectangle([x0 - 26, y0 - 26, x0 + S + 26, y0 + S + 26], fill=(196, 18, 36, 255))           # apron
    for i in range(0, S + 52, 26):                                                                 # apron stripes
        pass
    d.rectangle([x0, y0, x0 + S, y0 + S], fill=(*WHITE, 255))                                      # canvas
    # canvas tint and centre logo ring
    cv = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dc = ImageDraw.Draw(cv)
    dc.ellipse([S / 2 - 210, S / 2 - 210, S / 2 + 210, S / 2 + 210], fill=(255, 206, 26, 255), outline=(*INK, 255), width=8)
    dc.ellipse([S / 2 - 186, S / 2 - 186, S / 2 + 186, S / 2 + 186], outline=(*WHITE, 255), width=6)
    floor.alpha_composite(cv, (x0, y0))
    # ropes: three nested squares in red / white / blue, with ink edges
    rope_cols = [(240, 48, 58), (255, 252, 244), (47, 123, 255)]
    for i, col in enumerate(rope_cols):
        inset = 10 + i * 16
        d.rectangle([x0 + inset - 5, y0 + inset - 5, x0 + S - inset + 5, y0 + S - inset + 5], outline=(*INK, 255), width=11)
        d.rectangle([x0 + inset - 3, y0 + inset - 3, x0 + S - inset + 3, y0 + S - inset + 3], outline=(*col, 255), width=7)
    # turnbuckle posts at the corners
    for (px, py) in ((x0, y0), (x0 + S, y0), (x0, y0 + S), (x0 + S, y0 + S)):
        d.ellipse([px - 26, py - 26, px + 26, py + 26], fill=(*INK, 255))
        d.ellipse([px - 19, py - 19, px + 19, py + 19], fill=(255, 196, 40, 255))
        d.ellipse([px - 9, py - 9, px + 9, py + 9], fill=(*INK, 255))
    # title on the mat
    t1 = text_layer(70, 'DOWN', BLACK, WHITE, INK, 8, extrude=(196, 18, 36), extrude_n=6, shadow=False)
    t2 = text_layer(34, 'FOR THE', BLACK, INK, WHITE, 0, shadow=False, spacing=6)
    t3 = text_layer(70, 'COUNT', BLACK, WHITE, INK, 8, extrude=(196, 18, 36), extrude_n=6, shadow=False)
    cy = H / 2
    paste_center(floor, t1, W / 2, cy - 66); paste_center(floor, t2, W / 2, cy + 4); paste_center(floor, t3, W / 2, cy + 70)
    return framed(floor)

def box_front(BW=1200, BH=1500):
    bg = sunburst(BW, BH, [(190, 18, 34), (120, 8, 20)], (BW / 2, BH * 0.60), rays=32, rot=2)
    bg = halftone(bg, (255, 196, 40), alpha=80, step=18, rmax=4.5)
    # three masks, non-overlapping: 7 left, 10 centre (larger), 5 right
    mL = render_mask(PAL[9], 380, 'boxL'); mC = render_mask(PAL[10], 580, 'boxC'); mR = render_mask(PAL[6], 380, 'boxR')
    mL = mL.rotate(8, resample=Image.BICUBIC, expand=True); mR = mR.rotate(-8, resample=Image.BICUBIC, expand=True)
    for m, cx, cy in ((mL, 222, 980), (mR, BW - 222, 980), (mC, BW / 2, 900)):
        sh = drop_shadow(m, blur=20, offset=(14, 24))
        bg.alpha_composite(sh, (int(cx - m.width / 2 - 60), int(cy - m.height / 2 - 60)))
        paste_center(bg, m, cx, cy)
    # title
    t1 = text_layer(210, 'DOWN', BLACK_I, WHITE, INK, 14, extrude=(255, 196, 40), extrude_n=16, skew=0)
    t2 = text_layer(84, 'FOR THE', BLACK_I, (255, 196, 40), INK, 8, shadow=False, spacing=4)
    t3 = text_layer(210, 'COUNT', BLACK_I, WHITE, INK, 14, extrude=(255, 196, 40), extrude_n=16)
    paste_center(bg, t1, BW / 2, 170); paste_center(bg, t2, BW / 2, 318); paste_center(bg, t3, BW / 2, 450)
    # bottom banner
    d = ImageDraw.Draw(bg)
    d.polygon([(40, 1330), (BW - 40, 1330), (BW - 80, 1395), (BW - 40, 1460), (40, 1460), (80, 1395)], fill=(*INK, 255))
    d.polygon([(52, 1340), (BW - 52, 1340), (BW - 90, 1395), (BW - 52, 1450), (52, 1450), (90, 1395)], outline=(255, 196, 40, 255), width=5)
    b = text_layer(52, 'A WRESTLING CARD GAME', BLACK, WHITE, INK, 0, shadow=False, spacing=4)
    paste_center(bg, b, BW / 2, 1372)
    b2 = text_layer(34, '2–6 PLAYERS  ·  15 MINUTES  ·  LAST ONE STANDING', BLACK, (255, 196, 40), INK, 0, shadow=False, spacing=2)
    paste_center(bg, b2, BW / 2, 1422)
    return framed(bg, radius=28, border=14)

if __name__ == '__main__':
    import sys
    args = sys.argv[1:] or ['faces', 'back', 'box']
    if 'faces' in args or any(a.isdigit() for a in args):
        nums = [int(a) for a in args if a.isdigit()] or list(range(1, 11))
        for n in nums:
            card_face(n).save(f'{OUT}/card{n:02d}.png')
    if 'back' in args: card_back().save(f'{OUT}/back.png')
    if 'box' in args: box_front().save(f'{OUT}/box.png')
    print('ok')
