"""The ten move illustrations. Each returns SVG content for a 600 x 600 box; the mat is at y = GY."""
from toon import *

GY = 540
S = 1.5
NAMES = {1: 'CHOP', 2: 'DROPKICK', 3: 'CLOTHESLINE', 4: 'SUPLEX', 5: 'BODY SLAM', 6: 'SPEAR',
         7: 'SUPERKICK', 8: 'MOONSAULT', 9: 'FLYING ELBOW', 10: 'FROG SPLASH'}

def stand_y(s=S): return GY - 104 * s

def ring(post=False, light='#FFFFFF'):
    out = []
    for i, y in enumerate((236, 306, 376)):
        d = f'M-20 {y} Q300 {y + 10} 620 {y}'
        out.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="15" stroke-linecap="round" opacity="0.9"/>'
                   f'<path d="{d}" fill="none" stroke="{light}" stroke-width="8" stroke-linecap="round"/>')
    if post:
        out.append(f'<rect x="18" y="200" width="34" height="345" rx="8" fill="#C9CBD6" stroke="{INK}" stroke-width="6"/>')
        for y in (236, 306, 376):
            out.append(f'<rect x="8" y="{y - 22}" width="54" height="44" rx="12" fill="#E8303F" stroke="{INK}" stroke-width="6"/>')
    return ''.join(out)

def shadow(cx, w, op=0.22):
    return f'<ellipse cx="{cx}" cy="{GY + 6}" rx="{w}" ry="{w * 0.12:.1f}" fill="{INK}" opacity="{op}"/>'

def lying(name, cx, expr='dizzy', s=S, head='right'):
    w = CAST[name]['w']
    p = dict(x=cx, y=GY - w / 2 * s - 2, rot=90 if head == 'right' else -90, face=-1 if head == 'right' else 1, scale=s, expr=expr, look=(0, -1),
             arms={'b': (-30, 40, 14), 'f': (52, 26, -10)}, legs={'b': (-10, 96, 4), 'f': (20, 98, -4)})
    return p

def move(n):
    out = []
    if n == 1:  # CHOP: Big Moe slaps a chop across Rocket's chest
        V = dict(x=420, y=stand_y() + 6, rot=14, face=-1, scale=S, expr='ouch', look=(-1, 0),
                 arms={'b': (-58, -34, 10), 'f': (50, -48, -12)})
        V['legs'] = {'b': ('w', 470, GY - 14, -4), 'f': ('w', 392, GY - 14, 6)}
        cx, cy = to_world(V, 36, 16)
        A = dict(x=205, y=stand_y() + 4, rot=10, face=1, scale=S, expr='fierce', look=(1, 0),
                 arms={'b': (-74, -46, 14), 'f': ('w', cx - 6, cy, -14)}, legs={'b': (-46, 90, 8), 'f': (40, 92, -6)})
        out += [ring(), shadow(205, 90), shadow(425, 70), character('rocket', V), character('moe', A),
                burst(cx + 4, cy + 4, 36, 17, 10, fill='#FFFFFF'), lines([[(cx - 40, cy - 70), (cx - 10, cy - 58)], [(cx - 48, cy - 44), (cx - 16, cy - 36)]]),
                sweat(V['x'] + 34, V['y'] - 92, 1.3, 20)]
    elif n == 2:  # DROPKICK: the Duchess flies in feet first at Hal
        V = dict(x=440, y=stand_y() + 8, rot=18, face=-1, scale=S, expr='shock', look=(-1, 0),
                 arms={'b': (-48, -60, 10), 'f': (60, -54, -10)})
        V['legs'] = {'b': ('w', 490, GY - 14, -4), 'f': ('w', 410, GY - 14, 6)}
        hx, hy = to_world(V, 34, -6)
        A = dict(x=262, y=262, rot=-84, face=1, scale=S, expr='fierce', look=(0, -1),
                 arms={'b': (-30, -66, -16), 'f': (36, -70, 16)})
        A['legs'] = {'b': ('w', hx - 8, hy - 16, 0), 'f': ('w', hx - 4, hy + 14, 0)}
        out += [ring(), shadow(220, 80, 0.14), shadow(445, 70), character('hal', V), character('duchess', A),
                burst(hx + 6, hy, 48, 22, 11, fill='#FFFFFF'),
                lines([[(70, 214), (130, 214)], [(56, 256), (128, 256)], [(74, 298), (130, 298)]])]
    elif n == 3:  # CLOTHESLINE: Hal runs an arm through the Duchess, who flips feet over head
        A = dict(x=200, y=stand_y() + 6, rot=12, face=1, scale=S, expr='fierce', look=(1, 0),
                 arms={'b': (-66, 30, 12)}, legs={'b': (-52, 78, 10), 'f': (34, 94, -6)})
        ax, ay = to_world(A, CAST['hal']['w'] * 0.46, 10)
        V = dict(x=410, y=ay + 26, rot=104, face=-1, scale=S, expr='shock', look=(1, 0),
                 arms={'b': (-40, -58, 12), 'f': (40, -62, -12)}, legs={'b': (-16, 96, 18), 'f': (24, 94, -12)})
        nx, ny = to_world(V, 10, -40)
        A['arms']['f'] = ('w', nx - 4, ny, -4)
        out += [ring(), shadow(205, 80), shadow(410, 90, 0.12), character('duchess', V), character('hal', A),
                burst(nx - 2, ny + 2, 44, 20, 11, fill='#FFFFFF'),
                lines([[(40, 330), (92, 330)], [(30, 372), (90, 372)]]),
                f'<g transform="translate({nx + 70} {ny - 120}) rotate(28) scale(1.3)">{accessory("crown", 64, None)}</g>']
    elif n == 4:  # SUPLEX: Big Moe hoists Rocket straight up, upside down, about to fall back
        A = dict(x=330, y=stand_y() + 6, rot=-12, face=1, scale=S, expr='grin', look=(-1, -1),
                 legs={'b': (-40, 92, 8), 'f': (40, 92, -8)})
        V = dict(x=306, y=186, rot=186, face=1, scale=S, expr='shock', look=(0, 1),
                 arms={'b': (-58, 26, 10), 'f': (60, 22, -10)}, legs={'b': (-22, 94, 10), 'f': (22, 94, -10)})
        g1 = to_world(V, -38, -18); g2 = to_world(V, 38, -14)
        A['arms'] = {'b': ('w', g2[0], g2[1], 10), 'f': ('w', g1[0], g1[1], -10)}
        out += [ring(), shadow(330, 100), arc_trail('M380 60 Q560 80 540 330', dash='1 18'),
                character('moe', A), character('rocket', V)]
    elif n == 5:  # BODY SLAM: Hal lifts the Duchess overhead
        V = dict(x=300, y=150, rot=-90, face=1, scale=S, expr='shock', look=(0, 1),
                 arms={'b': (-50, -30, 10), 'f': (56, -40, -12)}, legs={'b': (-14, 96, 10), 'f': (26, 94, -12)})
        A = dict(x=300, y=stand_y() + 2, rot=0, face=1, scale=S, expr='fierce', look=(0, -1))
        h1 = to_world(V, -40, -16); h2 = to_world(V, -40, 50)
        A['arms'] = {'b': ('w', h1[0], h1[1] + 6, -8), 'f': ('w', h2[0], h2[1] + 6, 8)}
        A['legs'] = {'b': (-46, 92, 8), 'f': (46, 92, -8)}
        out += [ring(), shadow(300, 110), character('hal', A), character('duchess', V),
                lines([[(120, 120), (120, 190)], [(480, 120), (480, 190)], [(100, 220), (100, 260)], [(500, 220), (500, 260)]]),
                sweat(A['x'] + 70, A['y'] - 70, 1.2, -20)]
    elif n == 6:  # SPEAR: Rocket drives a shoulder into Big Moe's middle
        V = dict(x=430, y=stand_y() + 6, rot=-10, face=-1, scale=S, expr='ouch', look=(1, 1),
                 arms={'b': (-60, -50, 12), 'f': (54, -60, -12)})
        V['legs'] = {'b': ('w', 500, GY - 30, -8), 'f': ('w', 420, GY - 40, 8)}
        bx, by = to_world(V, 44, 20)
        A = dict(x=bx - 98, y=by + 6, rot=80, face=1, scale=S, expr='fierce', look=(1, 0))
        A['arms'] = {'f': ('w', bx + 10, by - 30, -20), 'b': ('w', bx + 8, by + 40, 20)}
        A['legs'] = {'b': (-30, 96, 10), 'f': (20, 98, -6)}
        out += [ring(), shadow(380, 120), character('moe', V), character('rocket', A),
                burst(bx + 4, by - 2, 50, 24, 11, fill='#FFFFFF'),
                lines([[(30, by - 40), (120, by - 40)], [(20, by + 4), (110, by + 4)], [(36, by + 48), (116, by + 48)]])]
    elif n == 7:  # SUPERKICK: the Duchess kicks Hal square on the chin
        V = dict(x=440, y=stand_y() + 8, rot=24, face=-1, scale=S, expr='dizzy', look=(0, -1),
                 arms={'b': (-56, -20, 10), 'f': (56, -12, -10)})
        V['legs'] = {'b': ('w', 492, GY - 14, -4), 'f': ('w', 410, GY - 14, 6)}
        cx, cy = to_world(V, 22, -46)
        A = dict(x=215, y=stand_y() + 12, rot=-26, face=1, scale=S, expr='focus', look=(1, -1),
                 arms={'b': (-66, -10, -14), 'f': (40, 56, 12)})
        A['legs'] = {'b': ('w', 214, GY - 14, 4), 'f': ('w', cx - 10, cy + 4, 8)}
        out += [ring(), shadow(220, 70), shadow(445, 70), arc_trail('M120 470 Q150 250 330 210', dash='1 16'),
                character('hal', V), character('duchess', A),
                burst(cx - 2, cy - 4, 40, 18, 11, fill='#FFFFFF'), stars(V['x'] + 34, V['y'] - 116, 46, 3, 20)]
    elif n == 8:  # MOONSAULT: Rocket backflips off the top rope onto Big Moe
        V = lying('moe', 380, 'dizzy')
        A = dict(x=300, y=150, rot=150, face=-1, scale=S, expr='fierce', look=(0, 1),
                 arms={'b': (-70, -30, 16), 'f': (62, -52, -16)}, legs={'b': (-40, 86, 16), 'f': (16, 98, -12)})
        out += [ring(post=True), shadow(380, 120), arc_trail('M60 190 Q120 20 290 70', dash='1 16'),
                character('moe', V), character('rocket', A), stars(430, 440, 40, 3, 0)]
    elif n == 9:  # FLYING ELBOW: Hal drops an elbow on the Duchess
        V = lying('duchess', 330, 'shock')
        A = dict(x=330, y=230, rot=90, face=1, scale=S, expr='fierce', look=(1, 1),
                 arms={'b': (-40, 60, -10), 'f': (34, -44, 0, 86, 22)}, legs={'b': (-20, 96, 16), 'f': (18, 98, 6)})
        out += [ring(), shadow(330, 140, 0.3), character('duchess', V), character('hal', A),
                lines([[(250, 60), (250, 130)], [(320, 40), (320, 110)], [(390, 60), (390, 130)]]),
                f'<path d="M{330 + 60} {GY - 80} l16 -16 M{330 + 72} {GY - 64} l22 -4 M{330 + 48} {GY - 88} l4 -22" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>']
    elif n == 10:  # FROG SPLASH: Big Moe flies off the top rope, spread-eagle, at Hal
        V = lying('hal', 380, 'shock')
        A = dict(x=330, y=200, rot=90, face=1, scale=S, expr='grin', look=(1, 1),
                 arms={'b': (-30, -76, -10), 'f': (40, -80, 10)}, legs={'b': (-50, 96, 10), 'f': (44, 98, -10)})
        out += [ring(post=True), shadow(360, 170, 0.32), arc_trail('M60 190 Q120 60 230 140', dash='1 16'),
                character('hal', V), character('moe', A),
                lines([[(200, 60), (240, 110)], [(300, 30), (300, 90)], [(420, 50), (390, 110)]])]
    return ''.join(out)

def svg(n, bg=None):
    rect = f'<rect width="600" height="600" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="1200" height="1200">{rect}{move(n)}</svg>'
