"""Down for the Count — the cartoon cast. Bean-bodied wrestlers with rubber-hose limbs, drawn as SVG.

A character is drawn from a pose:
  pose = dict(x, y, rot, face=+1|-1, scale, expr, look=(dx,dy),
              arms={'b': (x, y, bend), 'f': (x, y, bend)}, legs={'b': ..., 'f': ...})
Limb end points are in the body's own frame (origin at the body's centre, +x is the way it faces, +y down, before rotation),
in units of the body height H = 100. 'b' limbs sit behind the body, 'f' limbs in front. bend pushes the limb's midpoint
sideways (positive = bulges toward +x of the limb's own direction)."""
import math

INK = '#1C1530'
WHITE = '#FFFFFF'

CAST = {
    # name: body colour, shade, trunks, boots, body width (H = 100), accessory
    'hal':     dict(body='#3DBE5C', shade='#2A9446', trunks='#1C1530', boots='#1C1530', w=74, acc='mohawk', glove='#FFFFFF'),
    'duchess': dict(body='#8C5BFF', shade='#6B3FE0', trunks='#FFD24A', boots='#FFD24A', w=64, acc='crown', glove='#FFFFFF'),
    'rocket':  dict(body='#FF8A1F', shade='#E06A00', trunks='#2F6BFF', boots='#2F6BFF', w=70, acc='headband', glove='#FFFFFF'),
    'moe':     dict(body='#2F8CFF', shade='#1F6AD6', trunks='#E8303F', boots='#E8303F', w=96, acc='mustache', glove='#FFFFFF'),
    'ref':     dict(body='#FFFFFF', shade='#D9D9E3', trunks='#1C1530', boots='#1C1530', w=68, acc='ref', glove='#FFFFFF'),
}

_uid = [0]
def uid(p='c'):
    _uid[0] += 1
    return f'{p}{_uid[0]}'

def f(v): return f'{v:.1f}'

def limb(p0, p1, bend, width, color, ow=5.5):
    """A rubber-hose limb: a thick round-capped curve with an ink outline."""
    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    c = (mx + nx * bend, my + ny * bend)
    d = f'M{f(p0[0])} {f(p0[1])} Q{f(c[0])} {f(c[1])} {f(p1[0])} {f(p1[1])}'
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{f(width + 2 * ow)}" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{f(width)}" stroke-linecap="round"/>'), c

def jointed(p0, via, p1, width, color, ow=5.5):
    d = f'M{f(p0[0])} {f(p0[1])} L{f(via[0])} {f(via[1])} L{f(p1[0])} {f(p1[1])}'
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{f(width + 2 * ow)}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{f(width)}" stroke-linecap="round" stroke-linejoin="round"/>'), via

def glove(p, r, color, ow=5):
    return f'<circle cx="{f(p[0])}" cy="{f(p[1])}" r="{f(r)}" fill="{color}" stroke="{INK}" stroke-width="{ow}"/>'

def boot(p, ctrl, color, size=15, ow=5):
    """A chunky boot at the end of a leg, its toe pointing on along the leg's last direction, turned forward."""
    dx, dy = p[0] - ctrl[0], p[1] - ctrl[1]
    a = math.degrees(math.atan2(dy, dx))
    return (f'<g transform="translate({f(p[0])} {f(p[1])}) rotate({f(a - 90)})">'
            f'<path d="M{-size*0.8:.1f} {-size*0.5:.1f} Q{-size*0.9:.1f} {size*0.9:.1f} 0 {size*0.95:.1f} L{size*1.5:.1f} {size*0.95:.1f} '
            f'Q{size*1.75:.1f} {size*0.4:.1f} {size*0.9:.1f} {size*0.1:.1f} L{size*0.8:.1f} {-size*0.5:.1f} Z" '
            f'fill="{color}" stroke="{INK}" stroke-width="{ow}" stroke-linejoin="round"/></g>')

def face(expr, w, look=(1, 0)):
    """Eyes, brows and mouth on the upper body. Body frame: facing +x."""
    ex, ey, sp = 8 + look[0] * 4, -30 + look[1] * 3, w * 0.19
    out = []
    eyeL, eyeR = (ex - sp, ey), (ex + sp, ey)
    def eye(c, rx=9, ry=11):
        return (f'<ellipse cx="{f(c[0])}" cy="{f(c[1])}" rx="{rx}" ry="{ry}" fill="#fff" stroke="{INK}" stroke-width="3.5"/>'
                f'<circle cx="{f(c[0] + look[0] * 3.5)}" cy="{f(c[1] + 1 + look[1] * 3)}" r="4.6" fill="{INK}"/>')
    if expr in ('fierce', 'grin', 'happy', 'shock', 'focus'):
        out += [eye(eyeL), eye(eyeR)]
        if expr in ('fierce', 'grin', 'focus'):  # angry brows slanting down toward the middle
            for c, s in ((eyeL, -1), (eyeR, 1)):
                out.append(f'<path d="M{f(c[0] + s * 12)} {f(c[1] - 17)} L{f(c[0] - s * 3)} {f(c[1] - 10)}" stroke="{INK}" stroke-width="5.5" stroke-linecap="round"/>')
        if expr == 'shock':
            for c in (eyeL, eyeR):
                out.append(f'<path d="M{f(c[0] - 8)} {f(c[1] - 18)} Q{f(c[0])} {f(c[1] - 23)} {f(c[0] + 8)} {f(c[1] - 18)}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    elif expr == 'ouch':  # squeezed > < eyes
        for c, s in ((eyeL, 1), (eyeR, -1)):
            out.append(f'<path d="M{f(c[0] - 7 * s)} {f(c[1] - 7)} L{f(c[0] + 6 * s)} {f(c[1])} L{f(c[0] - 7 * s)} {f(c[1] + 7)}" fill="none" stroke="{INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>')
    elif expr == 'dizzy':  # spiral eyes
        for c in (eyeL, eyeR):
            out.append(f'<circle cx="{f(c[0])}" cy="{f(c[1])}" r="10" fill="#fff" stroke="{INK}" stroke-width="3.5"/>'
                       f'<path d="M{f(c[0])} {f(c[1])} m0 -1 a1.5 1.5 0 1 1 -2 2 a4 4 0 1 1 5 -5 a7 7 0 1 1 -9 9" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>')
    elif expr == 'closed':
        for c in (eyeL, eyeR):
            out.append(f'<path d="M{f(c[0] - 7)} {f(c[1])} Q{f(c[0])} {f(c[1] + 6)} {f(c[0] + 7)} {f(c[1])}" fill="none" stroke="{INK}" stroke-width="4.5" stroke-linecap="round"/>')
    # mouths
    mx, my = ex + 1, ey + 19
    if expr == 'fierce':
        out.append(f'<path d="M{f(mx - 12)} {f(my - 2)} Q{f(mx)} {f(my + 9)} {f(mx + 12)} {f(my - 2)} Z" fill="#fff" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                   f'<path d="M{f(mx - 11)} {f(my + 0.5)} L{f(mx + 11)} {f(my + 0.5)}" stroke="{INK}" stroke-width="2"/>')
    elif expr == 'grin' or expr == 'happy':
        out.append(f'<path d="M{f(mx - 13)} {f(my - 3)} Q{f(mx)} {f(my + 14)} {f(mx + 13)} {f(my - 3)} Z" fill="#7A1B2E" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                   f'<path d="M{f(mx - 10)} {f(my - 1.5)} L{f(mx + 10)} {f(my - 1.5)} L{f(mx + 8)} {f(my + 2.5)} L{f(mx - 8)} {f(my + 2.5)} Z" fill="#fff"/>')
    elif expr in ('shock', 'ouch'):
        out.append(f'<ellipse cx="{f(mx)}" cy="{f(my + 3)}" rx="7" ry="9" fill="#7A1B2E" stroke="{INK}" stroke-width="4"/>')
    elif expr == 'dizzy':
        out.append(f'<path d="M{f(mx - 10)} {f(my + 2)} q5 -6 10 0 t10 0" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    elif expr == 'focus':
        out.append(f'<path d="M{f(mx - 9)} {f(my + 1)} L{f(mx + 9)} {f(my - 1)}" stroke="{INK}" stroke-width="4.5" stroke-linecap="round"/>')
    elif expr == 'closed':
        out.append(f'<path d="M{f(mx - 8)} {f(my)} Q{f(mx)} {f(my + 7)} {f(mx + 8)} {f(my)}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
    return ''.join(out)

def accessory(kind, w, c):
    h = 50
    if kind == 'mohawk':
        return (f'<path d="M-24 {-h + 8} Q-30 {-h - 26} -6 {-h - 30} L-2 {-h - 18} Q8 {-h - 34} 20 {-h - 26} L16 {-h - 14} Q28 {-h - 16} 30 {-h - 4} '
                f'Q16 {-h - 6} 8 {-h + 4} Z" fill="#FF4D6D" stroke="{INK}" stroke-width="4.5" stroke-linejoin="round"/>')
    if kind == 'crown':
        return (f'<path d="M-15 {-h - 2} L-17 {-h - 26} L-8 {-h - 14} L0 {-h - 30} L8 {-h - 14} L17 {-h - 26} L15 {-h - 2} Z" '
                f'fill="#FFD24A" stroke="{INK}" stroke-width="4.5" stroke-linejoin="round" transform="rotate(-10 0 {-h})"/>'
                f'<circle cx="-3" cy="{-h - 18}" r="3.4" fill="#E8303F" stroke="{INK}" stroke-width="2" transform="rotate(-10 0 {-h})"/>')
    if kind == 'headband':
        y0 = -h + 6
        return (f'<path d="M{-w/2 + 9} {y0 + 2} Q0 {y0 - 6} {w/2 - 9} {y0 + 2} L{w/2 - 6} {y0 + 11} Q0 {y0 + 3} {-w/2 + 6} {y0 + 11} Z" fill="#E8303F" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                f'<path d="M{-w/2 + 8} {y0 + 5} q-16 -6 -26 2 M{-w/2 + 8} {y0 + 8} q-14 4 -22 16" fill="none" stroke="{INK}" stroke-width="13" stroke-linecap="round"/>'
                f'<path d="M{-w/2 + 8} {y0 + 5} q-16 -6 -26 2 M{-w/2 + 8} {y0 + 8} q-14 4 -22 16" fill="none" stroke="#E8303F" stroke-width="5.5" stroke-linecap="round"/>')
    if kind == 'mustache':
        return f'<path transform="translate(-2 -8)" d="M-6 -4 Q8 -12 22 -4 Q34 -2 38 -12 Q36 6 20 4 Q8 2 8 2 Q8 2 -4 6 Q-18 8 -20 -10 Q-14 -2 -6 -4 Z" fill="#5A3A1E" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
    return ''

def body_path(w, h=100):
    r = w / 2
    # a bean: a vertical capsule, a touch wider at the hips
    return (f'M{-r} {-h/2 + r} A{r} {r} 0 0 1 {r} {-h/2 + r} L{r + 3} {h/2 - r * 0.7} '
            f'Q{r + 3} {h/2} 0 {h/2} Q{-r - 3} {h/2} {-r - 3} {h/2 - r * 0.7} Z')

def to_local(pose, wx, wy):
    """World point -> the character's own frame (so hands and feet can be placed on world targets)."""
    s = pose.get('scale', 1.0); fc = pose.get('face', 1); r = math.radians(pose.get('rot', 0))
    dx, dy = wx - pose['x'], wy - pose['y']
    lx = math.cos(-r) * dx - math.sin(-r) * dy; ly = math.sin(-r) * dx + math.cos(-r) * dy
    return lx / (s * fc), ly / s

def to_world(pose, lx, ly):
    s = pose.get('scale', 1.0); fc = pose.get('face', 1); r = math.radians(pose.get('rot', 0))
    x, y = lx * s * fc, ly * s
    return pose['x'] + math.cos(r) * x - math.sin(r) * y, pose['y'] + math.sin(r) * x + math.cos(r) * y

def _resolve(pose, spec):
    if spec[0] == 'w':
        lx, ly = to_local(pose, spec[1], spec[2]); return (lx, ly, spec[3]) + tuple(spec[4:])
    return spec

def character(name, pose):
    c = CAST[name]; w = c['w']; H = 100
    s = pose.get('scale', 1.0); fc = pose.get('face', 1); expr = pose.get('expr', 'fierce'); look = pose.get('look', (1, 0))
    arms = {k: _resolve(pose, v) for k, v in pose.get('arms', {}).items()}; legs = {k: _resolve(pose, v) for k, v in pose.get('legs', {}).items()}
    sh = {'b': (-w * 0.46, 8), 'f': (w * 0.46, 10)}        # shoulders, at the body's edges
    hp = {'b': (-w * 0.2, H / 2 - 12), 'f': (w * 0.2, H / 2 - 10)}  # hips
    aw, lw = 15 if w < 90 else 17, 19 if w < 90 else 21
    parts_back, parts_front = [], []
    for side in ('b', 'f'):
        if side in legs:
            ex, ey, bend = legs[side]
            path, ctrl = limb(hp[side], (ex, ey), bend, lw, c['body'] if name != 'ref' else '#1C1530')
            (parts_back if side == 'b' else parts_front).append(path + boot((ex, ey), ctrl, c['boots']))
        if side in arms:
            spec = arms[side]; ex, ey, bend = spec[:3]
            col = c['body'] if name != 'ref' else '#FFFFFF'
            if len(spec) == 5: path, ctrl = jointed(sh[side], (spec[3], spec[4]), (ex, ey), aw, col)
            else: path, ctrl = limb(sh[side], (ex, ey), bend, aw, col)
            (parts_back if side == 'b' else parts_front).append(path + glove((ex, ey), 12.5 if w < 90 else 14, c['glove']))
    cid = uid('clip')
    bp = body_path(w)
    body = [f'<clipPath id="{cid}"><path d="{bp}"/></clipPath>',
            f'<path d="{bp}" fill="{c["body"]}"/>',
            f'<g clip-path="url(#{cid})">']
    if name == 'ref':  # referee stripes and black trousers
        for i in range(-5, 6):
            body.append(f'<rect x="{i * 13 - 3}" y="-60" width="6.5" height="120" fill="{INK}"/>')
        body.append(f'<rect x="-60" y="{H/2 - 26}" width="120" height="40" fill="{INK}"/>')
    else:
        body.append(f'<path d="M-60 {H/2 - 30} Q0 {H/2 - 38} 60 {H/2 - 30} L60 70 L-60 70 Z" fill="{c["trunks"]}"/>')
        body.append(f'<path d="M-60 {H/2 - 30} Q0 {H/2 - 38} 60 {H/2 - 30}" fill="none" stroke="{INK}" stroke-width="3.5"/>')
    body.append(f'<ellipse cx="{-w * 0.62}" cy="6" rx="{w * 0.4}" ry="70" fill="{c["shade"]}" opacity="0.4"/>')
    body.append(f'<ellipse cx="{w * 0.2}" cy="{-H * 0.32}" rx="{w * 0.12}" ry="7" fill="#fff" opacity="0.35"/>')
    body.append('</g>')
    body.append(f'<path d="{bp}" fill="none" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>')
    if c['acc'] == 'ref':
        body.append(f'<path d="M-6 -50 Q0 -60 8 -50" fill="none" stroke="{INK}" stroke-width="0"/>')
    body.append(face(expr, w, look))
    if c['acc'] not in ('ref',):
        body.append(accessory(c['acc'], w, c))
    g = ''.join(parts_back) + ''.join(body) + ''.join(parts_front)
    sx = s * fc
    return f'<g transform="translate({f(pose["x"])} {f(pose["y"])}) rotate({f(pose.get("rot", 0))}) scale({f(sx)} {f(s)})">{g}</g>'

# ---------------------------------------------------------------- effects
def burst(cx, cy, ro, ri, n=10, rot=0, fill='#FFE14D', stroke=INK, sw=5):
    pts = []
    for i in range(2 * n):
        a = math.radians(rot + i * 180 / n); r = ro if i % 2 == 0 else ri
        pts.append(f'{f(cx + r * math.cos(a))} {f(cy + r * math.sin(a))}')
    return f'<path d="M{" L".join(pts)} Z" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'

def lines(pts_list, w=7, color=WHITE):
    """Motion lines: each is a list of points; drawn white with an ink outline."""
    out = []
    for pts in pts_list:
        d = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts)
        out.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 6}" stroke-linecap="round" stroke-linejoin="round"/>'
                   f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    return ''.join(out)

def arc_trail(d, w=7, dash='1 16'):
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 6}" stroke-linecap="round" stroke-dasharray="{dash}"/>'
            f'<path d="{d}" fill="none" stroke="{WHITE}" stroke-width="{w}" stroke-linecap="round" stroke-dasharray="{dash}"/>')

def stars(cx, cy, r=30, n=3, rot=0):
    out = []
    for i in range(n):
        a = math.radians(rot + i * 360 / n)
        out.append(star(cx + r * math.cos(a), cy + r * 0.45 * math.sin(a), 9))
    return ''.join(out)

def star(cx, cy, r):
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36); rr = r if i % 2 == 0 else r * 0.45
        pts.append(f'{f(cx + rr * math.cos(a))} {f(cy + rr * math.sin(a))}')
    return f'<path d="M{" L".join(pts)} Z" fill="#FFE14D" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'

def sweat(x, y, s=1, rot=0):
    return (f'<path transform="translate({f(x)} {f(y)}) rotate({rot}) scale({s})" d="M0 -10 Q8 2 6 7 A6.5 6.5 0 1 1 -6 7 Q-8 2 0 -10 Z" '
            f'fill="#8FD8FF" stroke="{INK}" stroke-width="3"/>')
