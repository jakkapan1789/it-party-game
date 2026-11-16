#!/usr/bin/env python3
"""
Generates the lobby artwork: hand-authored layered SVG illustrations rasterized to
transparent WebP with headless Chrome. Sources are written to art/lobby/svg/ for editing;
outputs go to src/lobby/assets/.

    python3 client/art/lobby/build.py            # all assets
    python3 client/art/lobby/build.py sky deck   # only some

Any output can be swapped for painted artwork of the same name and aspect ratio.
"""
import math
import sys

from common import INK, INK_BROWN, GOLD_BEVEL, svg, lin, rad, blur, capsule, rrect, render, rng
from parts import Defs, blossom, bud, leaf, lantern, star, sparkle, tree, pagoda, lantern_string, blossom_defs

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__.replace('_', '-')] = fn
    return fn


# =====================================================================
# Background
# =====================================================================
@asset
def sky():
    W, H = 1080, 1920
    R = rng(11)
    defs = lin('sky', [(0, '#100C4E'), (0.18, '#231F86'), (0.36, '#3F34AE'), (0.5, '#6A4CC6'), (0.6, '#A274DC'),
                       (0.68, '#DCA2EC'), (0.74, '#F6C2E8'), (0.84, '#B98AE0'), (1, '#5A3496')])

    defs += (f'<filter id="nebA" x="0" y="0" width="100%" height="100%">'
             f'<feTurbulence type="fractalNoise" baseFrequency="0.0032" numOctaves="4" seed="3" result="n"/>'
             f'<feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.62  0 0 0 0 0.92  2.4 0 0 0 -1.05"/></filter>'
             f'<filter id="nebB" x="0" y="0" width="100%" height="100%">'
             f'<feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves="4" seed="9" result="n"/>'
             f'<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.6  0 0 0 0 1  2.4 0 0 0 -1.1"/></filter>')
    defs += rad('maskA', [(0, '#fff'), (1, '#000')], cx=.5, cy=.55, r=.6)
    defs += rad('maskB', [(0, '#fff'), (1, '#000')], cx=.2, cy=.2, r=.5)
    defs += f'<mask id="mA"><rect width="{W}" height="{H}" fill="url(#maskA)"/></mask><mask id="mB"><rect width="{W}" height="{H}" fill="url(#maskB)"/></mask>'
    defs += rad('horizon', [(0, '#FFD3EE', .85), (0.5, '#F6A6E0', .35), (1, '#F6A6E0', 0)])
    defs += blur('sb', 2.2)
    body = [f'<rect width="{W}" height="{H}" fill="url(#sky)"/>',
            f'<rect width="{W}" height="{H}" filter="url(#nebA)" mask="url(#mA)" opacity=".55"/>',
            f'<rect width="{W}" height="{H}" filter="url(#nebB)" mask="url(#mB)" opacity=".6"/>',
            f'<ellipse cx="{W / 2}" cy="{H * .72}" rx="{W * .9}" ry="{H * .16}" fill="url(#horizon)"/>']
    for _ in range(320):
        x, y = R.uniform(0, W), R.uniform(0, H * .62) ** 1.0
        r = R.choice([.8, 1, 1.2, 1.5, 1.8])
        body.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="#FFFFFF" opacity="{R.uniform(.35, 1):.2f}"/>')
    for _ in range(26):
        x, y = R.uniform(0, W), R.uniform(0, H * .55)
        body.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="5" fill="#E8DDFF" opacity=".8" filter="url(#sb)"/>')
        body.append(sparkle(x, y, R.uniform(6, 11), '#FFFFFF', .95))
    render('sky', W, H, svg(W, H, ''.join(body), defs), scale=1, quality=82, opaque=True)


@asset
def mountains():
    W, H = 1080, 560
    R = rng(5)
    d = Defs()
    d.add('m1', lin('m1', [(0, '#B79AF0'), (1, '#C9A6EC')]))
    d.add('m2', lin('m2', [(0, '#8E6CD2'), (1, '#A784DE')]))
    d.add('m3', lin('m3', [(0, '#6C4BB2'), (1, '#8462C6')]))
    d.add('mist', blur('mist', 14))

    def ridge(base, amp, n, seed):
        r = rng(seed)
        pts = [(0, base)]
        for i in range(1, n):
            pts.append((W * i / n, base - r.uniform(.2, 1) * amp))
        pts.append((W, base - r.uniform(.2, .8) * amp))
        p = f'M0 {H} L0 {pts[0][1]:.0f} '
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            p += f'Q{(x0 + x1) / 2:.0f} {min(y0, y1) - amp * .25:.0f} {x1:.0f} {y1:.0f} '
        return p + f'L{W} {H} Z'
    body = [f'<path d="{ridge(260, 130, 7, 1)}" fill="url(#m1)" opacity=".75"/>',
            f'<ellipse cx="300" cy="300" rx="380" ry="40" fill="#FFFFFF" opacity=".35" filter="url(#mist)"/>',
            f'<path d="{ridge(340, 110, 6, 2)}" fill="url(#m2)" opacity=".9"/>']
    # distant pagoda silhouettes with tiny lights
    for cx, base, s in [(180, 330, 1), (430, 318, .8), (700, 326, 1.1), (900, 336, .9)]:
        tiers = [(46 * s, 18 * s), (36 * s, 15 * s), (26 * s, 12 * s)]
        y = base
        for w, h in tiers:
            body.append(f'<rect x="{cx - w / 2}" y="{y - h}" width="{w}" height="{h}" fill="#7558B8"/>')
            for j in range(3):
                body.append(f'<rect x="{cx - w / 2 + 5 + j * (w - 10) / 3:.1f}" y="{y - h * .7:.1f}" width="3" height="{h * .4:.1f}" fill="#FFD27A" opacity=".85"/>')
            ow = w / 2 + 10 * s
            body.append(f'<path d="M{cx - ow} {y - h + 2} Q{cx} {y - h - 14 * s} {cx + ow} {y - h + 2} Z" fill="#5E43A0"/>')
            y = y - h - 9 * s
    body += [f'<ellipse cx="760" cy="380" rx="420" ry="44" fill="#FFFFFF" opacity=".3" filter="url(#mist)"/>',
             f'<path d="{ridge(430, 90, 8, 3)}" fill="url(#m3)"/>',
             f'<ellipse cx="540" cy="470" rx="600" ry="50" fill="#E7D8FF" opacity=".35" filter="url(#mist)"/>']
    render('mountains', W, H, svg(W, H, ''.join(body), str(d)), scale=1, quality=85)


def town(side):
    W, H = 420, 1100
    d = Defs()
    d.add('ground', lin('ground', [(0, '#5C3A8E'), (0.4, '#43276E'), (1, '#24143F')]))
    d.add('haze', lin('haze', [(0, '#C9A6EC', 0), (1, '#C9A6EC', .45)]))
    o = []
    if side == 'left':
        o += [tree(60, 250, 40, 'teal', 1), tree(200, 266, 30, 'teal', 2), tree(390, 236, 42, 'teal', 3)]
        o.append(pagoda(d, 112, 362, [(108, 46), (90, 40), (72, 34), (56, 28)], k=1.5))
        o.append(pagoda(d, 272, 376, [(84, 36), (66, 30), (50, 26)], k=1.3))
        o.append(tree(372, 340, 40, 'pink', 4))
        o.append(lantern_string(168, 300, 236, 318, 18, 3, 1.4))
        o.append(f'<path d="M0 392 Q110 372 220 386 T420 380 V{H} H0 Z" fill="url(#ground)"/>')
        o.append(f'<rect x="0" y="380" width="{W}" height="60" fill="url(#haze)"/>')
        for cx, base, w, h in [(54, 478, 100, 40), (172, 488, 92, 36), (292, 478, 96, 38), (404, 486, 80, 34)]:
            o.append(pagoda(d, cx, base, [(w, h)], k=1.4))
        o.append(tree(232, 452, 24, 'green', 5))
        o.append(tree(12, 572, 40, 'teal', 6))
        o.append(pagoda(d, 94, 690, [(120, 50), (96, 42), (74, 34)], k=1.6))
        o.append(pagoda(d, 262, 668, [(100, 42), (78, 34)], k=1.5))
        o.append(tree(370, 640, 44, 'pink', 7))
        o.append(pagoda(d, 150, 790, [(124, 46)], k=1.6))
        o.append(pagoda(d, 340, 780, [(112, 44)], k=1.6))
        o.append(tree(40, 860, 40, 'green', 8))
        o.append(pagoda(d, 120, 930, [(130, 52), (104, 42)], k=1.7))
        o.append(pagoda(d, 320, 900, [(110, 46), (84, 36)], k=1.6))
        o.append(tree(400, 960, 44, 'pink', 9))
        o.append(pagoda(d, 60, 1060, [(130, 50)], k=1.7))
        o.append(pagoda(d, 250, 1050, [(140, 52)], k=1.7))
    else:
        o += [tree(40, 246, 36, 'teal', 11), tree(360, 214, 46, 'teal', 12), tree(236, 284, 30, 'teal', 13)]
        o.append(pagoda(d, 306, 404, [(150, 58), (126, 50), (104, 42), (84, 36), (64, 30)], k=1.8))
        o.append(pagoda(d, 118, 392, [(90, 38), (70, 30)], k=1.4))
        o.append(tree(34, 372, 34, 'pink', 14))
        o.append(lantern_string(164, 330, 224, 306, 16, 3, 1.4))
        o.append(f'<path d="M0 420 Q120 404 240 414 T420 410 V{H} H0 Z" fill="url(#ground)"/>')
        o.append(f'<rect x="0" y="410" width="{W}" height="60" fill="url(#haze)"/>')
        for cx, base, w, h in [(66, 508, 110, 42), (196, 514, 96, 38), (330, 506, 110, 44)]:
            o.append(pagoda(d, cx, base, [(w, h)], k=1.4))
        o.append(tree(40, 648, 46, 'pink', 15))
        o.append(tree(252, 616, 28, 'green', 16))
        o.append(pagoda(d, 334, 708, [(130, 54), (104, 44), (80, 36)], k=1.7))
        o.append(pagoda(d, 152, 694, [(96, 40), (74, 32)], k=1.4))
        o.append(pagoda(d, 90, 794, [(130, 48)], k=1.6))
        o.append(pagoda(d, 300, 798, [(120, 46)], k=1.6))
        o.append(tree(380, 870, 42, 'green', 17))
        o.append(pagoda(d, 290, 940, [(130, 52), (104, 42)], k=1.7))
        o.append(pagoda(d, 100, 910, [(110, 46), (84, 36)], k=1.6))
        o.append(tree(20, 980, 44, 'pink', 18))
        o.append(pagoda(d, 170, 1060, [(140, 52)], k=1.7))
        o.append(pagoda(d, 370, 1056, [(120, 50)], k=1.7))
    render(f'town-{side}', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=88)


@asset
def town_left():
    town('left')


@asset
def town_right():
    town('right')


def cloud(name, seed):
    W, H = 640, 300
    R = rng(seed)
    puffs = []
    x = 50
    while x < 600:
        mid = 1 - abs(x - 320) / 320
        r = R.uniform(46, 64) + mid * R.uniform(30, 52)
        puffs.append((x, 250 - r * .62, r))
        x += r * R.uniform(.7, .95)
    tops = [(px + R.uniform(-20, 20), py - r * .35, r * .62) for px, py, r in puffs if R.random() < .6]
    defs = blur('cs', 1.4) + blur('csh', 6)
    shade = ''.join(f'<circle cx="{x:.0f}" cy="{y + 16:.0f}" r="{r:.0f}"/>' for x, y, r in puffs)
    mid = ''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}"/>' for x, y, r in puffs + tops)
    light = ''.join(f'<circle cx="{x - r * .14:.0f}" cy="{y - r * .18:.0f}" r="{r * .78:.0f}"/>' for x, y, r in puffs + tops)
    hi = ''.join(f'<circle cx="{x - r * .3:.0f}" cy="{y - r * .4:.0f}" r="{r * .3:.0f}"/>' for x, y, r in tops[:6])
    body = (f'<g filter="url(#cs)">'
            f'<g fill="#8F72D2" filter="url(#csh)" opacity=".7">{shade}</g>'
            f'<g fill="#B79CEB">{shade}<rect x="40" y="236" width="560" height="34" rx="17"/></g>'
            f'<g fill="#E3D6FB">{mid}</g>'
            f'<g fill="#F8F4FF">{light}</g>'
            f'<g fill="#FFFFFF" opacity=".95">{hi}</g></g>')
    render(name, W, H, svg(W, H, body, defs), scale=1.5, quality=86)


@asset
def cloud_a():
    cloud('cloud-a', 21)


@asset
def cloud_b():
    cloud('cloud-b', 37)


@asset
def deck():
    # 2160 wide so wide screens see more railing; on phones the centre ~864px is visible,
    # with the two inner posts landing just beside the panel.
    W, H = 2160, 560
    R = rng(8)
    d = Defs()
    d.add('rail', lin('rail', [(0, '#C98B55'), (0.5, '#A0623A'), (1, '#6E3C22')]))
    d.add('post', lin('post', [(0, '#7A4426'), (0.3, '#B57A48'), (0.7, '#9A5C34'), (1, '#5E321C')], 0, 0, 1, 0))
    d.add('knob', rad('knob', [(0, '#FFF6CC'), (0.4, '#F7C548'), (1, '#9A5E12')], cx=.38, cy=.32, r=.75))
    d.add('floorshade', lin('floorshade', [(0, '#000', 0), (1, '#2A1006', .55)]))
    d.add('pool', rad('pool', [(0, '#FFE2A0', .6), (1, '#FFE2A0', 0)]))
    d.add('grain', '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="3" seed="2"/>'
          '<feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.1  0 0 0 0 0.04  0 0 0 2.2 -0.9"/></filter>')
    d.add('fclip', f'<clipPath id="fclip"><rect x="0" y="200" width="{W}" height="{H - 200}"/></clipPath>')
    blossom_defs(d)
    o = []

    def railing(x0, x1):
        g = []
        for x in range(int(x0) + 40, int(x1) - 20, 34):
            g.append(f'<path d="M{x - 6} 86 H{x + 6} V104 Q{x + 11} 128 {x + 6} 150 V172 H{x - 6} V150 Q{x - 11} 128 {x - 6} 104 Z" fill="url(#post)" stroke="{INK_BROWN}" stroke-width="3"/>')
        g.append(f'<rect x="{x0}" y="60" width="{x1 - x0}" height="26" rx="6" fill="url(#rail)" stroke="{INK_BROWN}" stroke-width="4"/>')
        g.append(f'<rect x="{x0 + 6}" y="64" width="{x1 - x0 - 12}" height="5" rx="2" fill="#E9B07A" opacity=".7"/>')
        g.append(f'<rect x="{x0}" y="168" width="{x1 - x0}" height="20" rx="5" fill="url(#rail)" stroke="{INK_BROWN}" stroke-width="4"/>')
        return ''.join(g)

    def post(x):
        return (f'<rect x="{x - 24}" y="44" width="48" height="190" rx="6" fill="url(#post)" stroke="{INK_BROWN}" stroke-width="4"/>'
                f'<rect x="{x - 28}" y="40" width="56" height="16" rx="5" fill="#8A4E2C" stroke="{INK_BROWN}" stroke-width="4"/>'
                f'<rect x="{x - 26}" y="96" width="52" height="8" fill="url(#knob)" stroke="{INK_BROWN}" stroke-width="2.5"/>'
                f'<circle cx="{x}" cy="24" r="21" fill="url(#knob)" stroke="{INK_BROWN}" stroke-width="4"/>'
                f'<ellipse cx="{x - 7}" cy="16" rx="6" ry="4" fill="#FFFBE6" opacity=".9"/>')
    o.append(railing(-20, 700))
    o.append(railing(1460, 2180))
    # floor planks in perspective
    vx, vy = W / 2, -520
    xs = list(range(-1800, 4000, 92))

    def top_x(xb):
        return vx + (xb - vx) * (200 - vy) / (H - vy)
    planks = []
    for i, (a, b) in enumerate(zip(xs, xs[1:])):
        c = ['#BE8250', '#AE7244', '#B77A49'][i % 3]
        planks.append(f'<polygon points="{top_x(a):.0f},200 {top_x(b):.0f},200 {b},{H} {a},{H}" fill="{c}"/>')
    o.append(f'<g clip-path="url(#fclip)">{"".join(planks)}')
    o.append(f'<rect x="0" y="200" width="{W}" height="{H - 200}" filter="url(#grain)" opacity=".75"/>')
    seams = ''.join(f'<line x1="{top_x(x):.0f}" y1="200" x2="{x}" y2="{H}"/>' for x in xs)
    o.append(f'<g stroke="#4E2612" stroke-width="2.5" opacity=".6">{seams}</g>')
    rows = [232, 270, 318, 380, 456, 548]
    for i, y in enumerate(rows):
        for x in xs[i % 2::2]:
            t = (y - vy) / (H - vy)
            xa = vx + (x - vx) * t
            xb = vx + (x + 92 - vx) * t
            o.append(f'<line x1="{xa:.0f}" y1="{y}" x2="{xb:.0f}" y2="{y}" stroke="#4E2612" stroke-width="2" opacity=".55"/>')
    o.append(f'<ellipse cx="{W / 2}" cy="250" rx="560" ry="170" fill="url(#pool)"/>')
    o.append(f'<rect x="0" y="200" width="{W}" height="{H - 200}" fill="url(#floorshade)"/></g>')
    o.append(f'<rect x="0" y="196" width="{W}" height="10" fill="#7A4426" stroke="{INK_BROWN}" stroke-width="3"/>')
    o.append(f'<rect x="0" y="198" width="{W}" height="3" fill="#E9B07A" opacity=".8"/>')
    for x in (90, 390, 690, 1470, 1770, 2070):
        o.append(post(x))
    # bushes in the corners
    for bx, flip in ((690, 1), (1470, -1), (150, 1), (2010, -1)):
        for i in range(13):
            a = -150 + i * 11 if flip == 1 else -30 - i * 11
            o.append(leaf(d, bx, 560, R.uniform(80, 120), a))
        for j in range(3):
            o.append(blossom(d, bx + flip * R.uniform(10, 90), 470 + R.uniform(-30, 40), R.uniform(16, 22), R.uniform(0, 70), j % 2 == 0))
    for _ in range(26):
        x, y = R.uniform(700, 1460), R.uniform(240, 540)
        o.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{R.uniform(5, 8):.1f}" ry="3.2" fill="#FFB7D5" stroke="#C2588E" stroke-width="1" transform="rotate({R.uniform(0, 180):.0f} {x:.0f} {y:.0f})"/>')
    render('deck', W, H, svg(W, H, ''.join(o), str(d)), scale=1.5, quality=86)


@asset
def branch():
    W, H = 380, 280
    R = rng(4)
    d = Defs()
    d.add('bark', lin('bark', [(0, '#8A5A3E'), (0.5, '#5E3624'), (1, '#3E2216')]))
    o = [f'<path d="M-10 6 C110 18 220 44 384 112 L378 126 C220 70 110 54 -10 52 Z" fill="url(#bark)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>',
         f'<path d="M-4 14 C110 26 220 50 372 112" fill="none" stroke="#B88660" stroke-width="3" opacity=".7"/>',
         f'<path d="M92 34 C86 80 70 120 46 172 L56 176 C84 126 100 86 106 38 Z" fill="url(#bark)" stroke="{INK}" stroke-width="3.5"/>',
         f'<path d="M218 62 C236 90 258 120 300 150 L294 158 C252 130 228 100 208 66 Z" fill="url(#bark)" stroke="{INK}" stroke-width="3"/>',
         f'<path d="M150 46 C166 30 186 22 214 18" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>',
         f'<path d="M150 46 C166 30 186 22 214 18" fill="none" stroke="#6E422C" stroke-width="3" stroke-linecap="round"/>',
         '<ellipse cx="60" cy="30" rx="6" ry="3" fill="#3E2216"/>', '<ellipse cx="250" cy="72" rx="5" ry="2.4" fill="#3E2216"/>']
    for x, y, L, a in [(120, 40, 46, -40), (180, 54, 40, 30), (260, 82, 44, -20), (330, 104, 38, 40), (60, 120, 40, 150), (240, 116, 36, 70)]:
        o.append(leaf(d, x, y, L, a))
    flowers = [(18, 30, 26), (54, 14, 20), (80, 48, 28), (40, 72, 22), (130, 30, 22), (160, 66, 26), (204, 24, 20), (230, 76, 24),
               (276, 98, 22), (320, 118, 20), (356, 108, 16), (62, 128, 22), (48, 168, 18), (288, 150, 20), (110, 92, 16)]
    for i, (x, y, r) in enumerate(flowers):
        o.append(blossom(d, x, y, r, R.uniform(0, 72), i % 3 == 0))
    for x, y, r, a in [(190, 14, 7, 20), (340, 130, 7, -30), (32, 104, 7, 10), (262, 128, 6, 40), (100, 66, 6, -20), (372, 96, 6, 0)]:
        o.append(bud(x, y, r, a))
    render('branch', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=90)


@asset
def lantern_art():
    W, H = 200, 220
    d = Defs()
    body = lantern(d, 100, 0, 1, glow=True, cord=24)
    render('lantern', W, H, svg(W, H, body, str(d)), scale=2, quality=90)


@asset
def sky_lantern():
    W, H = 80, 110
    defs = (rad('kl', [(0, '#FFF7C8'), (0.45, '#FFC060'), (1, '#E0572A')], cx=.5, cy=.85, r=.9) + blur('klg', 8)
            + rad('klh', [(0, '#FFB24A', .8), (1, '#FFB24A', 0)]))
    body = (f'<circle cx="40" cy="58" r="38" fill="url(#klh)"/>'
            f'<path d="M20 24 Q40 4 60 24 L64 82 Q40 94 16 82 Z" fill="url(#kl)" stroke="#8E2E14" stroke-width="2.4" stroke-linejoin="round"/>'
            f'<path d="M30 14 L28 86 M50 14 L52 86" stroke="#C2541E" stroke-width="1.4" opacity=".6"/>'
            f'<ellipse cx="40" cy="84" rx="20" ry="5" fill="#FFF3B0" stroke="#8E2E14" stroke-width="1.6"/>'
            f'<ellipse cx="40" cy="84" rx="5" ry="3" fill="#FFFFFF"/>'
            f'<ellipse cx="32" cy="36" rx="5" ry="12" fill="#FFFBE6" opacity=".55"/>')
    render('sky-lantern', W, H, svg(W, H, body, defs), scale=2, quality=88)


@asset
def blossoms():
    W, H = 220, 160
    d = Defs()
    o = [leaf(d, 110, 90, 70, -160), leaf(d, 120, 96, 66, -20), leaf(d, 90, 100, 52, 150), leaf(d, 140, 70, 48, -60)]
    o += [blossom(d, 60, 96, 28, 20, True), blossom(d, 166, 62, 26, 40), blossom(d, 110, 80, 40, 8)]
    o += [bud(26, 64, 9, -30), bud(198, 108, 9, 30), bud(140, 134, 8, 10)]
    render('blossoms', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=90)


# =====================================================================
# Header
# =====================================================================
@asset
def header_plaque():
    W, H = 640, 150
    d = Defs()
    d.add('g', lin('g', GOLD_BEVEL))
    d.add('g2', lin('g2', [(0, '#B87410'), (0.5, '#FFE48A'), (1, '#C88518')]))
    d.add('woodc', lin('woodc', [(0, '#A85A40'), (0.45, '#86392A'), (1, '#5A1E16')]))
    d.add('wood', '<filter id="wood" x="0" y="0" width="100%" height="100%">'
          '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.16" numOctaves="3" seed="6" result="n"/>'
          '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 2.6 -1.05" result="gr"/>'
          '<feComposite in="gr" in2="SourceGraphic" operator="in" result="g2"/>'
          '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g2"/></feMerge></filter>')
    d.add('shadow', blur('shadow', 6))
    d.add('inner', f'<clipPath id="inner">{rrect(53, 37, 534, 70, 19)}/></clipPath>')
    o = [rrect(40, 32, 560, 104, 34) + ' fill="#14060C" opacity=".55" filter="url(#shadow)"/>',
         rrect(34, 18, 572, 108, 38) + f' fill="{INK}"/>',
         rrect(37, 21, 566, 102, 35) + ' fill="url(#g)"/>',
         rrect(41, 25, 558, 94, 31) + ' fill="none" stroke="#FFF2C0" stroke-width="1.6" opacity=".8"/>',
         rrect(45, 29, 550, 86, 27) + f' fill="{INK}"/>',
         rrect(47, 31, 546, 82, 25) + ' fill="url(#g2)"/>',
         rrect(51, 35, 538, 74, 21) + f' fill="{INK}"/>',
         rrect(53, 37, 534, 70, 19) + ' fill="url(#woodc)" filter="url(#wood)"/>',
         '<g clip-path="url(#inner)">',
         '<rect x="53" y="37" width="534" height="20" fill="#FFFFFF" opacity=".14"/>',
         '<rect x="53" y="92" width="534" height="15" fill="#2A0804" opacity=".3"/>',
         '<rect x="53" y="37" width="534" height="3" fill="#2A0804" opacity=".45"/>',
         '</g>']
    # corner brackets with rivets
    for cx, cy, sx, sy in [(62, 46, 1, 1), (578, 46, -1, 1), (62, 98, 1, -1), (578, 98, -1, -1)]:
        o.append(f'<path d="M{cx} {cy + sy * 16} V{cy} H{cx + sx * 16}" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
                 f'<path d="M{cx} {cy + sy * 16} V{cy} H{cx + sx * 16}" fill="none" stroke="url(#g)" stroke-width="3.6" stroke-linecap="round"/>'
                 f'<circle cx="{cx}" cy="{cy}" r="3.6" fill="#FFF0B0" stroke="{INK}" stroke-width="1.6"/>')
    # studs along the gold frame
    for x in range(110, 540, 60):
        for y in (25, 119):
            o.append(f'<circle cx="{x}" cy="{y}" r="2.6" fill="#FFF6D0" stroke="#8A5208" stroke-width="1"/>')
    # end scroll ornaments
    for sx in (1, -1):
        t = f'translate({W} 0) scale(-1 1)' if sx == -1 else ''
        o.append(f'<g transform="{t}">'
                 f'<path d="M36 72 C14 72 8 52 18 44 C28 36 40 46 32 54" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>'
                 f'<path d="M36 72 C14 72 8 52 18 44 C28 36 40 46 32 54" fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round"/>'
                 f'<path d="M36 72 C14 72 8 92 18 100 C28 108 40 98 32 90" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>'
                 f'<path d="M36 72 C14 72 8 92 18 100 C28 108 40 98 32 90" fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round"/>'
                 f'<circle cx="10" cy="72" r="7" fill="url(#g)" stroke="{INK}" stroke-width="2.4"/></g>')
    render('header-plaque', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=90)


@asset
def header_medallion():
    W, H = 200, 200
    d = Defs()
    d.add('g', lin('g', GOLD_BEVEL, 0, 0, 1, 1))
    d.add('disk', rad('disk', [(0, '#FFF0B0'), (0.35, '#FFB14A'), (0.7, '#E2512A'), (1, '#8E2416')]))
    d.add('sh', blur('sh', 5))
    o = ['<circle cx="100" cy="106" r="92" fill="#14060C" opacity=".5" filter="url(#sh)"/>',
         f'<circle cx="100" cy="100" r="92" fill="{INK}"/>',
         '<circle cx="100" cy="100" r="88" fill="url(#g)"/>',
         '<circle cx="100" cy="100" r="84" fill="none" stroke="#FFF4C8" stroke-width="1.8" opacity=".8"/>']
    for i in range(16):
        a = math.radians(i * 22.5)
        o.append(f'<circle cx="{100 + math.cos(a) * 78:.1f}" cy="{100 + math.sin(a) * 78:.1f}" r="3.4" fill="#FFF6D0" stroke="#8A5208" stroke-width="1.2"/>')
    o += [f'<circle cx="100" cy="100" r="70" fill="{INK}"/>', '<circle cx="100" cy="100" r="67" fill="url(#disk)"/>']
    for i in range(18):
        a = math.radians(i * 20)
        x1, y1 = 100 + math.cos(a) * 16, 100 + math.sin(a) * 16
        x2, y2 = 100 + math.cos(a - .09) * 66, 100 + math.sin(a - .09) * 66
        x3, y3 = 100 + math.cos(a + .09) * 66, 100 + math.sin(a + .09) * 66
        o.append(f'<polygon points="{x1:.1f},{y1:.1f} {x2:.1f},{y2:.1f} {x3:.1f},{y3:.1f}" fill="#FFE9A0" opacity=".22"/>')
    o += ['<path d="M48 70 A60 60 0 0 1 132 42" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity=".45"/>',
          '<path d="M60 152 A60 60 0 0 0 152 128" fill="none" stroke="#5A0E08" stroke-width="7" stroke-linecap="round" opacity=".35"/>']
    render('header-medallion', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=90)


@asset
def btn_sound():
    W, H = 96, 100
    d = Defs()
    d.add('g', lin('g', GOLD_BEVEL))
    d.add('p', lin('p', [(0, '#C9AFFA'), (0.5, '#8E6CDA'), (1, '#6446AE')]))
    d.add('sh', blur('sh', 3))
    o = [rrect(6, 16, 84, 82, 22) + ' fill="#14060C" opacity=".45" filter="url(#sh)"/>',
         rrect(4, 10, 88, 86, 22) + f' fill="{INK}"/>', rrect(8, 14, 80, 78, 18) + ' fill="#3E2478"/>',
         rrect(4, 2, 88, 86, 22) + f' fill="{INK}"/>', rrect(7, 5, 82, 80, 19) + ' fill="url(#g)"/>',
         rrect(12, 10, 72, 70, 15) + f' fill="{INK}"/>', rrect(14, 12, 68, 66, 13) + ' fill="url(#p)"/>',
         rrect(18, 15, 60, 24, 11) + ' fill="#FFFFFF" opacity=".35"/>']
    render('btn-sound', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=90)


# =====================================================================
# Panel
# =====================================================================
@asset
def panel_frame():
    """9-slice frame: corners are the outer 100 units; edges stretch; centre transparent."""
    W = H = 400
    d = Defs()
    d.add('band', lin('band', [(0, '#A985EA'), (0.5, '#6E46B6'), (1, '#4A2888')]))
    d.add('g', lin('g', GOLD_BEVEL))
    d.add('gd', lin('gd', GOLD_BEVEL, 0, 0, 1, 1))
    d.add('gem', rad('gem', [(0, '#F4D8FF'), (0.45, '#B064F0'), (1, '#4A1A8C')], cx=.35, cy=.3, r=.8))
    d.add('isb', blur('isb', 6))
    d.add('hole', f'<mask id="hole"><rect width="{W}" height="{H}" fill="#fff"/>{rrect(31, 31, 338, 338, 25)} fill="#000"/></mask>')
    d.add('holeclip', f'<clipPath id="holeclip">{rrect(31, 31, 338, 338, 25)}/></clipPath>')
    o = ['<g mask="url(#hole)">',
         rrect(3, 3, 394, 394, 52) + f' fill="{INK}"/>',
         rrect(6, 6, 388, 388, 49) + ' fill="url(#band)"/>',
         rrect(8, 8, 384, 384, 47) + ' fill="none" stroke="#D9C4FF" stroke-width="2" opacity=".55"/>',
         rrect(13, 13, 374, 374, 42) + ' fill="none" stroke="url(#g)" stroke-width="3"/>',
         rrect(21, 21, 358, 358, 34) + f' fill="{INK}"/>',
         rrect(23, 23, 354, 354, 32) + ' fill="url(#g)"/>',
         rrect(25, 25, 350, 350, 30) + ' fill="none" stroke="#FFF4C8" stroke-width="1.4" opacity=".8"/>',
         rrect(28, 28, 344, 344, 27) + f' fill="{INK}"/>',
         '</g>',
         # inner shadow cast onto the parchment
         f'<g clip-path="url(#holeclip)">{rrect(31, 31, 338, 338, 25)} fill="none" stroke="#3A1A08" stroke-width="16" opacity=".35" filter="url(#isb)"/></g>']
    corner = (f'<path d="M12 84 C8 44 34 14 84 12" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
              f'<path d="M12 84 C8 44 34 14 84 12" fill="none" stroke="url(#gd)" stroke-width="4.6" stroke-linecap="round"/>'
              f'<path d="M30 70 C26 50 40 36 56 40 C68 44 64 58 54 56" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
              f'<path d="M30 70 C26 50 40 36 56 40 C68 44 64 58 54 56" fill="none" stroke="url(#gd)" stroke-width="3.4" stroke-linecap="round"/>'
              f'<path d="M70 30 C50 26 36 40 40 56" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
              f'<path d="M70 30 C50 26 36 40 40 56" fill="none" stroke="url(#gd)" stroke-width="3.4" stroke-linecap="round"/>'
              f'<circle cx="84" cy="12" r="5" fill="url(#gd)" stroke="{INK}" stroke-width="2"/>'
              f'<circle cx="12" cy="84" r="5" fill="url(#gd)" stroke="{INK}" stroke-width="2"/>'
              f'<g transform="translate(20 20) rotate(45)"><rect x="-13" y="-13" width="26" height="26" rx="5" fill="url(#gd)" stroke="{INK}" stroke-width="2.6"/>'
              f'<rect x="-8" y="-8" width="16" height="16" rx="3" fill="url(#gem)" stroke="{INK}" stroke-width="1.6"/>'
              f'<rect x="-5" y="-6" width="4" height="6" rx="1.5" fill="#FFFFFF" opacity=".8"/></g>')
    for t in ('', f'translate({W} 0) scale(-1 1)', f'translate(0 {H}) scale(1 -1)', f'translate({W} {H}) scale(-1 -1)'):
        o.append(f'<g transform="{t}">{corner}</g>')
    render('panel-frame', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=92)


@asset
def panel_parchment():
    W = H = 512
    defs = (rad('pc', [(0, '#FFFBF0'), (0.6, '#FCEED6'), (1, '#F0D6AE')], cx=.5, cy=.42, r=.75)
            + '<filter id="blot" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="12"/>'
              '<feColorMatrix type="matrix" values="0 0 0 0 0.72  0 0 0 0 0.52  0 0 0 0 0.3  0 0 0 1.6 -0.72"/></filter>'
            + '<filter id="fiber" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.025" numOctaves="2" seed="4"/>'
              '<feColorMatrix type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.45  0 0 0 0 0.28  0 0 0 2 -1.2"/></filter>')
    body = (f'<rect width="{W}" height="{H}" fill="url(#pc)"/>'
            f'<rect width="{W}" height="{H}" filter="url(#blot)" opacity=".35"/>'
            f'<rect width="{W}" height="{H}" filter="url(#fiber)" opacity=".25"/>')
    render('panel-parchment', W, H, svg(W, H, body, defs), scale=1, quality=86, opaque=True)


@asset
def panel_crest():
    W, H = 120, 56
    d = Defs()
    d.add('g', lin('g', GOLD_BEVEL))
    d.add('gem', rad('gem', [(0, '#F4D8FF'), (0.45, '#B064F0'), (1, '#4A1A8C')], cx=.35, cy=.3, r=.8))
    wing = 'M60 40 C44 40 30 30 14 34 C24 22 40 18 52 26 C46 16 52 8 60 6'
    o = []
    for t in ('', f'translate({W} 0) scale(-1 1)'):
        o.append(f'<g transform="{t}"><path d="{wing}" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
                 f'<path d="{wing} Z" fill="url(#g)" stroke="none" opacity=".0"/>'
                 f'<path d="{wing}" fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
                 f'<circle cx="14" cy="34" r="4.5" fill="url(#g)" stroke="{INK}" stroke-width="2"/></g>')
    o.append(f'<g transform="translate(60 30) rotate(45)"><rect x="-15" y="-15" width="30" height="30" rx="6" fill="url(#g)" stroke="{INK}" stroke-width="3"/>'
             f'<rect x="-9" y="-9" width="18" height="18" rx="3" fill="url(#gem)" stroke="{INK}" stroke-width="2"/>'
             f'<rect x="-6" y="-7" width="5" height="7" rx="2" fill="#FFFFFF" opacity=".8"/></g>')
    render('panel-crest', W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=90)


def input_art(name, outline, rim):
    W, H = 360, 66
    d = Defs()
    d.add('s', lin('s', [(0, '#FFFFFF'), (0.45, '#F6F1FD'), (1, '#E2D7F2')]))
    d.add('gl', lin('gl', [(0, '#FFFFFF', .95), (1, '#FFFFFF', .2)]))
    o = [f'<path d="{capsule(2, 9, 356, 54)}" fill="{INK_BROWN}" opacity=".3"/>',
         f'<path d="{capsule(1, 2, 358, 56)}" fill="{outline}"/>',
         f'<path d="{capsule(4.5, 5.5, 351, 49)}" fill="{rim}"/>',
         f'<path d="{capsule(6.5, 7.5, 347, 45)}" fill="url(#s)"/>',
         f'<path d="{capsule(22, 10, 316, 15)}" fill="url(#gl)"/>',
         f'<path d="M30 49 H330" stroke="#B9A6D8" stroke-width="2" stroke-linecap="round" opacity=".55"/>']
    render(name, W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=92)


@asset
def input_idle():
    input_art('input', INK_BROWN, '#FFFFFF')


@asset
def input_focus():
    input_art('input-focus', '#A9620A', '#FFE08A')


@asset
def input_error():
    input_art('input-error', '#9C1F18', '#F7B3AC')


def button_art(name, pressed):
    W, H = 400, 104
    dy = 7 if pressed else 0
    d = Defs()
    d.add('g', lin('g', GOLD_BEVEL))
    d.add('b', lin('b', [(0, '#FFEE8E'), (0.38, '#FFCB3C'), (0.72, '#F8A21A'), (1, '#E5800F')]))
    d.add('gl', lin('gl', [(0, '#FFFFFF', .9), (1, '#FFFFFF', .12)]))
    d.add('sh', blur('sh', 4))
    o = [f'<path d="{capsule(8, 22, 384, 80)}" fill="#2A0E04" opacity=".45" filter="url(#sh)"/>',
         f'<path d="{capsule(2, 12, 396, 88)}" fill="#4A1E08"/>',
         f'<path d="{capsule(6, 16, 388, 80)}" fill="#A0521A"/>',
         f'<g transform="translate(0 {dy})">',
         f'<path d="{capsule(2, 2, 396, 86)}" fill="#4A1E08"/>',
         f'<path d="{capsule(6, 6, 388, 78)}" fill="url(#g)"/>',
         f'<path d="{capsule(10, 10, 380, 70)}" fill="#9A5A10"/>',
         f'<path d="{capsule(12, 12, 376, 66)}" fill="url(#b)"/>',
         f'<path d="M40 66 H360" stroke="#FFD97A" stroke-width="3" stroke-linecap="round" opacity=".7"/>',
         f'<path d="{capsule(28, 15, 344, 27)}" fill="url(#gl)"/>',
         sparkle(338, 24, 7, '#FFFFFF', .95), sparkle(356, 34, 4, '#FFFFFF', .8),
         '</g>']
    render(name, W, H, svg(W, H, ''.join(o), str(d)), scale=2, quality=92)


@asset
def button_gold():
    button_art('button-gold', False)


@asset
def button_gold_pressed():
    button_art('button-gold-pressed', True)


@asset
def star_icon():
    W = H = 64
    render('star', W, H, svg(W, H, star(32, 34, 28, INK, 3.6)), scale=2, quality=92)


if __name__ == '__main__':
    want = sys.argv[1:] or list(ASSETS)
    for name in want:
        print(f'- {name}')
        ASSETS[name]()
