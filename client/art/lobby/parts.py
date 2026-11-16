"""Illustrated building blocks (return SVG fragments + the defs they need)."""
import math

from common import INK, GOLD_BEVEL, GOLD_SOFT, lin, rad, blur, uid


class Defs:
    """Collects gradient/filter defs once per document."""

    def __init__(self):
        self.items = {}

    def add(self, key, markup):
        self.items.setdefault(key, markup)
        return key

    def __str__(self):
        return ''.join(self.items.values())


# ---------------- flowers & leaves ----------------
def blossom_defs(d: Defs):
    d.add('petal', rad('petal', [(0, '#FFFFFF'), (0.35, '#FFE0EE'), (0.8, '#FF9DC8'), (1, '#F173AE')], cx=0.5, cy=0.95, r=1.0))
    d.add('petal2', rad('petal2', [(0, '#FFFFFF'), (0.45, '#FFEAF3'), (1, '#FFB6D6')], cx=0.5, cy=0.95, r=1.0))
    d.add('leafg', lin('leafg', [(0, '#8ED07A'), (0.55, '#4FA35C'), (1, '#2F7444')], 0, 0, 1, 1))


def blossom(d: Defs, cx, cy, r, rot=0, light=False):
    blossom_defs(d)
    fill = 'url(#petal2)' if light else 'url(#petal)'
    sw = max(0.8, r * 0.07)
    petal = (f'M0 0 C{-r * .62} {-r * .22} {-r * .66} {-r * .98} {-r * .2} {-r * 1.02} '
             f'L0 {-r * .84} L{r * .2} {-r * 1.02} C{r * .66} {-r * .98} {r * .62} {-r * .22} 0 0 Z')
    out = [f'<g transform="translate({cx} {cy}) rotate({rot})">']
    for a in range(0, 360, 72):
        out.append(f'<path d="{petal}" transform="rotate({a})" fill="{fill}" stroke="#9C2F5E" stroke-width="{sw}" stroke-linejoin="round"/>')
        out.append(f'<path d="M0 {-r * .2} L0 {-r * .62}" transform="rotate({a})" stroke="#F06AA7" stroke-width="{sw * .8}" stroke-linecap="round" opacity=".55"/>')
    out.append(f'<circle r="{r * .3}" fill="#FFF3F8"/>')
    for a in range(0, 360, 45):
        x, y = math.cos(math.radians(a)) * r * .34, math.sin(math.radians(a)) * r * .34
        out.append(f'<line x1="0" y1="0" x2="{x:.1f}" y2="{y:.1f}" stroke="#E2558F" stroke-width="{sw * .6}"/>')
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * .07:.2f}" fill="#FFC93C" stroke="#B8761A" stroke-width="{sw * .3}"/>')
    out.append(f'<circle r="{r * .12}" fill="#FFD45C"/>')
    out.append('</g>')
    return ''.join(out)


def bud(cx, cy, r, rot=0):
    return (f'<g transform="translate({cx} {cy}) rotate({rot})">'
            f'<ellipse rx="{r * .7}" ry="{r}" fill="#FF8EC0" stroke="#9C2F5E" stroke-width="{max(.8, r * .12)}"/>'
            f'<ellipse cx="{-r * .2}" cy="{-r * .3}" rx="{r * .22}" ry="{r * .4}" fill="#FFE1EF"/>'
            f'<path d="M{-r * .6} {r * .6} Q0 {r * 1.4} {r * .6} {r * .6}" fill="#5BAE6A" stroke="#2E5E36" stroke-width="{max(.6, r * .1)}"/></g>')


def leaf(d: Defs, cx, cy, length, rot=0):
    blossom_defs(d)
    L, W = length, length * .38
    return (f'<g transform="translate({cx} {cy}) rotate({rot})">'
            f'<path d="M0 0 C{L * .3} {-W} {L * .75} {-W} {L} 0 C{L * .75} {W} {L * .3} {W} 0 0 Z" fill="url(#leafg)" stroke="#1F4A2A" stroke-width="{max(.8, L * .045)}" stroke-linejoin="round"/>'
            f'<path d="M{L * .08} 0 Q{L * .5} {-W * .12} {L * .92} 0" fill="none" stroke="#C8F0B0" stroke-width="{max(.6, L * .03)}" opacity=".8"/>'
            f'<path d="M{L * .2} {-W * .3} Q{L * .45} {-W * .7} {L * .7} {-W * .45}" fill="none" stroke="#FFFFFF" stroke-width="{max(.5, L * .025)}" opacity=".45"/></g>')


# ---------------- lanterns ----------------
def lantern(d: Defs, cx, top, scale=1.0, glow=True, cord=20):
    """Red paper lantern: cord, gold cap, ribbed glowing body, gold base, tassel. ~(100 x 200)*scale."""
    d.add('lan-body', rad('lan-body', [(0, '#FFF6B8'), (0.25, '#FFC75A'), (0.6, '#F25A2C'), (0.88, '#C0301F'), (1, '#8E1E16')], cx=.45, cy=.42, r=.62))
    d.add('lan-gold', lin('lan-gold', GOLD_BEVEL))
    d.add('lan-halo', rad('lan-halo', [(0, '#FFC46A', .75), (0.5, '#FF9A3C', .3), (1, '#FF7A30', 0)]))
    d.add('lan-tassel', lin('lan-tassel', [(0, '#F04A4A'), (1, '#9C1F2A')]))
    s = scale
    o = [f'<g transform="translate({cx} {top}) scale({s})">']
    if glow:
        o.append(f'<circle cx="0" cy="{cord + 70}" r="95" fill="url(#lan-halo)"/>')
    if cord:
        o.append(f'<line x1="0" y1="0" x2="0" y2="{cord + 6}" stroke="{INK}" stroke-width="3"/>')
    y = cord
    o.append(f'<circle cx="0" cy="{y - 2}" r="6" fill="none" stroke="#C98A12" stroke-width="3"/>')
    # top cap
    o.append(f'<path d="M-24 {y + 4} H24 L30 {y + 18} H-30 Z" fill="url(#lan-gold)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    o.append(f'<rect x="-30" y="{y + 16}" width="60" height="6" rx="2" fill="#B8761A" stroke="{INK}" stroke-width="2"/>')
    # body
    by, ry = y + 70, 50
    o.append(f'<ellipse cx="0" cy="{by}" rx="48" ry="{ry}" fill="url(#lan-body)" stroke="{INK}" stroke-width="3.5"/>')
    for k in (-0.62, -0.3, 0.3, 0.62):
        o.append(f'<path d="M{48 * k * .55} {by - ry + 3} Q{48 * k * 1.25} {by} {48 * k * .55} {by + ry - 3}" fill="none" stroke="#B82E1C" stroke-width="2" opacity=".75"/>')
    o.append(f'<path d="M0 {by - ry + 2} V{by + ry - 2}" stroke="#B82E1C" stroke-width="2" opacity=".7"/>')
    o.append(f'<path d="M-44 {by - 18} Q0 {by - 26} 44 {by - 18} M-44 {by + 18} Q0 {by + 10} 44 {by + 18}" fill="none" stroke="#FFD27A" stroke-width="2" opacity=".55"/>')
    o.append(f'<ellipse cx="-20" cy="{by - 20}" rx="9" ry="20" fill="#FFFBE6" opacity=".55"/>')
    o.append(f'<ellipse cx="22" cy="{by + 22}" rx="16" ry="18" fill="#7A1410" opacity=".22"/>')
    # bottom cap + tassel
    yb = by + ry - 4
    o.append(f'<path d="M-30 {yb} H30 L24 {yb + 14} H-24 Z" fill="url(#lan-gold)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    o.append(f'<line x1="0" y1="{yb + 14}" x2="0" y2="{yb + 24}" stroke="{INK}" stroke-width="3"/>')
    o.append(f'<circle cx="0" cy="{yb + 26}" r="6" fill="#F7C548" stroke="{INK}" stroke-width="2.5"/>')
    o.append(f'<path d="M-9 {yb + 31} H9 L13 {yb + 66} H-13 Z" fill="url(#lan-tassel)" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
    for x in (-7, -2.5, 2.5, 7):
        o.append(f'<line x1="{x * .8}" y1="{yb + 35}" x2="{x}" y2="{yb + 63}" stroke="#6E1018" stroke-width="1.4"/>')
    o.append('</g>')
    return ''.join(o)


def mini_lantern(cx, cy, r, glow_id=None):
    """Tiny eave lantern for buildings."""
    g = f'<circle cx="{cx}" cy="{cy}" r="{r * 2.6}" fill="#FFB24A" opacity=".45" filter="url(#{glow_id})"/>' if glow_id else ''
    return (g + f'<line x1="{cx}" y1="{cy - r * 1.8}" x2="{cx}" y2="{cy - r}" stroke="{INK}" stroke-width="{r * .3}"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{r * .85}" ry="{r}" fill="#F0453A" stroke="{INK}" stroke-width="{r * .28}"/>'
            f'<ellipse cx="{cx - r * .25}" cy="{cy - r * .2}" rx="{r * .22}" ry="{r * .45}" fill="#FFD27A" opacity=".8"/>'
            f'<rect x="{cx - r * .5}" y="{cy - r * 1.1}" width="{r}" height="{r * .3}" fill="#F7C548"/>'
            f'<rect x="{cx - r * .5}" y="{cy + r * .8}" width="{r}" height="{r * .3}" fill="#F7C548"/>')


# ---------------- star ----------------
def star(cx, cy, R, outline=INK, sw=3.5):
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        rr = R if i % 2 == 0 else R * .45
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    poly = ' '.join(f'{x:.2f},{y:.2f}' for x, y in pts)
    o = [f'<polygon points="{poly}" fill="#F5B21A" stroke="{outline}" stroke-width="{sw}" stroke-linejoin="round"/>']
    for i in range(10):
        a, b = pts[i], pts[(i + 1) % 10]
        light = '#FFF07A' if i % 2 == 0 else '#F7C232'
        if i in (5, 6, 7, 8):
            light = '#F0A515' if i % 2 else '#FFD84A'
        o.append(f'<polygon points="{cx},{cy} {a[0]:.2f},{a[1]:.2f} {b[0]:.2f},{b[1]:.2f}" fill="{light}"/>')
    o.append(f'<polygon points="{poly}" fill="none" stroke="{outline}" stroke-width="{sw}" stroke-linejoin="round"/>')
    o.append(f'<ellipse cx="{cx - R * .22}" cy="{cy - R * .38}" rx="{R * .1}" ry="{R * .2}" fill="#FFFFFF" opacity=".85" transform="rotate(-30 {cx - R * .22} {cy - R * .38})"/>')
    return ''.join(o)


def sparkle(cx, cy, r, color='#FFFFFF', op=1):
    return (f'<path d="M{cx} {cy - r} Q{cx + r * .18} {cy - r * .18} {cx + r} {cy} Q{cx + r * .18} {cy + r * .18} {cx} {cy + r} '
            f'Q{cx - r * .18} {cy + r * .18} {cx - r} {cy} Q{cx - r * .18} {cy - r * .18} {cx} {cy - r} Z" fill="{color}" opacity="{op}"/>')


# ---------------- trees ----------------
TREE_PALETTES = {
    'teal': ('#1E2F55', '#2D4A7C', '#4C72A8', '#7FA3D4'),
    'green': ('#1F4535', '#2E6A4E', '#4E9A6C', '#8ACB93'),
    'pink': ('#9E3D72', '#DD70AC', '#F7A6CF', '#FFE0EF'),
}


def tree(cx, cy, r, palette='teal', seed=1, trunk=True):
    import random
    R = random.Random(seed)
    dark, mid, light, hi = TREE_PALETTES[palette]
    blobs = [(cx, cy, r)]
    for _ in range(6):
        a = R.uniform(0, math.tau)
        d = R.uniform(.45, .85) * r
        blobs.append((cx + math.cos(a) * d, cy + math.sin(a) * d * .7, r * R.uniform(.5, .72)))
    o = []
    if trunk:
        o.append(f'<path d="M{cx - r * .12} {cy + r * 1.3} L{cx - r * .08} {cy + r * .3} L{cx + r * .08} {cy + r * .3} L{cx + r * .14} {cy + r * 1.3} Z" fill="#4A2A1E" stroke="{INK}" stroke-width="{r * .06}"/>')
    sw = max(1.2, r * .08)
    o += [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr + sw / 2:.1f}" fill="{INK}"/>' for x, y, rr in blobs]
    o += [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rr:.1f}" fill="{dark}"/>' for x, y, rr in blobs]
    o += [f'<circle cx="{x - rr * .12:.1f}" cy="{y - rr * .16:.1f}" r="{rr * .82:.1f}" fill="{mid}"/>' for x, y, rr in blobs]
    o += [f'<circle cx="{x - rr * .3:.1f}" cy="{y - rr * .36:.1f}" r="{rr * .42:.1f}" fill="{light}"/>' for x, y, rr in blobs[:5]]
    for x, y, rr in blobs[:4]:
        o.append(f'<circle cx="{x - rr * .42:.1f}" cy="{y - rr * .5:.1f}" r="{rr * .14:.1f}" fill="{hi}" opacity=".9"/>')
    if palette == 'pink':
        for _ in range(int(r * .9)):
            a = R.uniform(0, math.tau); dd = R.uniform(0, r * 1.1)
            o.append(f'<circle cx="{cx + math.cos(a) * dd:.1f}" cy="{cy + math.sin(a) * dd * .75:.1f}" r="{R.uniform(.9, 1.8):.1f}" fill="#FFFFFF" opacity=".85"/>')
    return ''.join(o)


# ---------------- buildings ----------------
def building_defs(d: Defs):
    d.add('wall', lin('wall', [(0, '#9A6696'), (0.5, '#7A4A82'), (1, '#55316A')]))
    d.add('wall-side', lin('wall-side', [(0, '#000000', 0), (1, '#1A0628', .45)], 0, 0, 1, 0))
    d.add('roof', lin('roof', [(0, '#5654A6'), (0.45, '#3B3887'), (1, '#211E58')]))
    d.add('roof-under', lin('roof-under', [(0, '#160F33'), (1, '#2C1F4E')]))
    d.add('win', lin('win', [(0, '#FFF8CC'), (0.5, '#FFD067'), (1, '#FF9E2E')]))
    d.add('gold', lin('gold', GOLD_SOFT))
    d.add('wglow', blur('wglow', 3))
    d.add('lglow', blur('lglow', 2.2))


def _roof(d, cx, rb, w, h, k):
    """Upturned tiled roof whose eave sits at y=rb. k = stroke scale."""
    ow = w / 2 + w * .22 + 4 * k
    rh = max(8 * k, h * .62)
    lift = rh * .55
    cid = uid('rc')
    path = (f'M{cx - ow} {rb - lift} Q{cx - ow + ow * .12} {rb + 3 * k} {cx - ow * .72} {rb + 3 * k} L{cx + ow * .72} {rb + 3 * k} '
            f'Q{cx + ow - ow * .12} {rb + 3 * k} {cx + ow} {rb - lift} Q{cx + ow * .55} {rb - rh * .3} {cx + w * .22} {rb - rh} '
            f'L{cx - w * .22} {rb - rh} Q{cx - ow * .55} {rb - rh * .3} {cx - ow} {rb - lift} Z')
    o = [f'<clipPath id="{cid}"><path d="{path}"/></clipPath>']
    # underside shadow strip
    o.append(f'<path d="M{cx - ow * .7} {rb + 2 * k} H{cx + ow * .7} L{cx + ow * .62} {rb + 7 * k} H{cx - ow * .62} Z" fill="url(#roof-under)"/>')
    o.append(f'<path d="{path}" fill="url(#roof)"/>')
    # tiles
    tiles = []
    n = max(6, int(ow / (3.4 * k)))
    for i in range(n + 1):
        t = i / n
        xb = cx - ow * .78 + t * ow * 1.56
        xt = cx - w * .22 + t * w * .44
        tiles.append(f'M{xt:.1f} {rb - rh} Q{(xt + xb) / 2:.1f} {rb - rh * .35} {xb:.1f} {rb + 2 * k}')
    o.append(f'<g clip-path="url(#{cid})"><path d="{" ".join(tiles)}" fill="none" stroke="#17134A" stroke-width="{.9 * k}" opacity=".7"/>'
             f'<path d="M{cx - ow} {rb - rh * .55} H{cx + ow}" stroke="#7C7AD0" stroke-width="{1.4 * k}" opacity=".35"/>'
             f'<rect x="{cx - ow}" y="{rb - rh * .15}" width="{ow * 2}" height="{rh * .3}" fill="#0E0A30" opacity=".25"/></g>')
    o.append(f'<path d="{path}" fill="none" stroke="{INK}" stroke-width="{1.4 * k}" stroke-linejoin="round"/>')
    # gold eave trim + ridge
    o.append(f'<path d="M{cx - ow + 1.5 * k} {rb - lift + 1.5 * k} Q{cx - ow + ow * .12} {rb + 1.5 * k} {cx - ow * .72} {rb + 1.5 * k} L{cx + ow * .72} {rb + 1.5 * k} Q{cx + ow - ow * .12} {rb + 1.5 * k} {cx + ow - 1.5 * k} {rb - lift + 1.5 * k}" fill="none" stroke="url(#gold)" stroke-width="{2 * k}" stroke-linecap="round"/>')
    o.append(f'<rect x="{cx - w * .24}" y="{rb - rh - 2 * k}" width="{w * .48}" height="{3.2 * k}" rx="{1.4 * k}" fill="url(#gold)" stroke="{INK}" stroke-width="{.8 * k}"/>')
    # tip curls
    for sx in (-1, 1):
        tx = cx + sx * ow
        o.append(f'<circle cx="{tx}" cy="{rb - lift - 1.5 * k}" r="{2.2 * k}" fill="url(#gold)" stroke="{INK}" stroke-width="{.8 * k}"/>')
    tips = [(cx - ow + 2 * k, rb - lift + 6 * k), (cx + ow - 2 * k, rb - lift + 6 * k)]
    return ''.join(o), rh, tips


def pagoda(d: Defs, cx, base, tiers, k=1.0, lanterns=True):
    """tiers: list of (w, h) bottom-up, in local units; k scales strokes/details."""
    building_defs(d)
    o = []
    y = base
    for i, (w, h) in enumerate(tiers):
        top = y - h
        x0 = cx - w / 2
        o.append(f'<rect x="{x0}" y="{top}" width="{w}" height="{h}" fill="url(#wall)"/>')
        o.append(f'<rect x="{cx + w * .18}" y="{top}" width="{w * .32}" height="{h}" fill="url(#wall-side)"/>')
        o.append(f'<rect x="{x0}" y="{top}" width="{w * .1}" height="{h}" fill="#FFFFFF" opacity=".08"/>')
        # beams with gold studs
        o.append(f'<rect x="{x0}" y="{top}" width="{w}" height="{h * .14}" fill="#3A1F3E"/>')
        o.append(f'<rect x="{x0}" y="{y - h * .1}" width="{w}" height="{h * .1}" fill="#3A1F3E"/>')
        for sx in range(int(w / (9 * k)) + 1):
            o.append(f'<circle cx="{x0 + 3 * k + sx * 9 * k}" cy="{top + h * .07}" r="{.9 * k}" fill="#F7C548"/>')
        # pillars
        o.append(f'<rect x="{x0}" y="{top}" width="{3.2 * k}" height="{h}" fill="#5A2238"/>')
        o.append(f'<rect x="{x0 + w - 3.2 * k}" y="{top}" width="{3.2 * k}" height="{h}" fill="#3E1628"/>')
        # lattice windows with glow
        n = max(2, round(w / (15 * k)))
        ww = w / (n * 2)
        wy, wh = top + h * .26, h * .52
        for j in range(n):
            wx = x0 + (j + .5) * w / n - ww / 2
            o.append(f'<rect x="{wx - 2 * k}" y="{wy - 2 * k}" width="{ww + 4 * k}" height="{wh + 4 * k}" fill="#FFB547" opacity=".75" filter="url(#wglow)"/>')
            o.append(f'<rect x="{wx}" y="{wy}" width="{ww}" height="{wh}" rx="{1.2 * k}" fill="url(#win)" stroke="#5A2A10" stroke-width="{.9 * k}"/>')
            o.append(f'<path d="M{wx + ww / 2} {wy} V{wy + wh} M{wx} {wy + wh * .45} H{wx + ww}" stroke="#A0521A" stroke-width="{.7 * k}"/>')
        o.append(f'<rect x="{x0}" y="{top}" width="{w}" height="{h}" fill="none" stroke="{INK}" stroke-width="{1.2 * k}"/>')
        roof, rh, tips = _roof(d, cx, top, w, h, k)
        o.append(roof)
        if lanterns:
            for tx, ty in tips:
                o.append(mini_lantern(tx, ty, 2.6 * k, 'lglow'))
        y = top - rh + 1.5 * k
    # finial
    o.append(f'<rect x="{cx - 1.4 * k}" y="{y - 16 * k}" width="{2.8 * k}" height="{16 * k}" fill="url(#gold)" stroke="{INK}" stroke-width="{.7 * k}"/>')
    for j in range(3):
        o.append(f'<ellipse cx="{cx}" cy="{y - 4 * k - j * 4 * k}" rx="{3.2 * k - j * .6 * k}" ry="{1.1 * k}" fill="#F7C548" stroke="{INK}" stroke-width="{.5 * k}"/>')
    o.append(f'<circle cx="{cx}" cy="{y - 18 * k}" r="{3 * k}" fill="url(#gold)" stroke="{INK}" stroke-width="{.7 * k}"/>')
    o.append(f'<circle cx="{cx - k}" cy="{y - 19 * k}" r="{k}" fill="#FFFBE0"/>')
    return ''.join(o)


def lantern_string(x1, y1, x2, y2, sag, n, k=1.0):
    """Festive string of glowing lanterns between two points."""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2 + sag
    o = [f'<path d="M{x1} {y1} Q{mx} {my} {x2} {y2}" fill="none" stroke="{INK}" stroke-width="{1.1 * k}"/>']
    for i in range(1, n + 1):
        t = i / (n + 1)
        x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2
        y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2
        o.append(mini_lantern(x, y + 4 * k, 2.4 * k, 'lglow'))
    return ''.join(o)
