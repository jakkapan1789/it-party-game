"""Shared helpers for the lobby artwork generator: SVG assembly, palette, and Chrome rasterizing."""
import os
import random
import subprocess
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.join(HERE, 'svg')
OUT_DIR = os.path.normpath(os.path.join(HERE, '..', '..', 'src', 'lobby', 'assets'))
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

# ---- palette (one art direction for every asset) ----
INK = '#3A1A2A'          # main outline: dark plum-brown
INK_BROWN = '#3B2416'    # outlines on wood / inputs
GOLD_DARK = '#8A5208'
GOLD_LINE = '#9A5A10'

_uid = [0]


def uid(prefix='i'):
    _uid[0] += 1
    return f'{prefix}{_uid[0]}'


def rng(seed):
    return random.Random(seed)


def svg(w, h, body, defs=''):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        f'<defs>{defs}</defs>{body}</svg>'
    )


# ---- reusable defs ----
def lin(id_, stops, x1=0, y1=0, x2=0, y2=1):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"{"" if a is None else f" stop-opacity=\"{a}\""}/>' for o, c, a in _norm(stops))
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def rad(id_, stops, cx=0.5, cy=0.5, r=0.5, fx=None, fy=None):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"{"" if a is None else f" stop-opacity=\"{a}\""}/>' for o, c, a in _norm(stops))
    f = '' if fx is None else f' fx="{fx}" fy="{fy}"'
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}"{f}>{s}</radialGradient>'


def _norm(stops):
    for st in stops:
        if len(st) == 2:
            yield st[0], st[1], None
        else:
            yield st


def blur(id_, sd):
    return f'<filter id="{id_}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{sd}"/></filter>'


GOLD_BEVEL = [(0, '#FFF6CC'), (0.22, '#FFD95E'), (0.48, '#D9951E'), (0.62, '#F6C54C'), (0.82, '#C2801A'), (1, '#8A5208')]
GOLD_SOFT = [(0, '#FFF0B0'), (0.5, '#F5BE3E'), (1, '#B87410')]


def capsule(x, y, w, h):
    r = h / 2
    return f'M{x + r} {y} H{x + w - r} A{r} {r} 0 0 1 {x + w - r} {y + h} H{x + r} A{r} {r} 0 0 1 {x + r} {y} Z'


def rrect(x, y, w, h, r):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" ry="{r}"'


# ---- rasterizing ----
def render(name, w, h, markup, fmt='webp', scale=2, quality=90, opaque=False):
    """Write the SVG source, screenshot it with headless Chrome at `scale`x, save PNG/WebP."""
    os.makedirs(SVG_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(SVG_DIR, f'{name}.svg'), 'w') as f:
        f.write(markup)
    bg = '' if opaque else 'background:transparent;'
    html = f'<!doctype html><html><head><style>html,body{{margin:0;{bg}overflow:hidden}}svg{{display:block}}</style></head><body>{markup}</body></html>'
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, 'p.html')
        png = os.path.join(tmp, 'p.png')
        with open(page, 'w') as f:
            f.write(html)
        subprocess.run(
            [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--force-device-scale-factor={scale}',
             '--default-background-color=00000000', f'--window-size={w},{h}', f'--screenshot={png}', f'file://{page}'],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        im = Image.open(png).convert('RGB' if opaque else 'RGBA')
        out = os.path.join(OUT_DIR, f'{name}.{fmt}')
        if fmt == 'webp':
            im.save(out, 'WEBP', quality=quality, method=6)
        else:
            im.save(out, 'PNG', optimize=True)
    print(f'  {name}.{fmt}  {im.size[0]}x{im.size[1]}  {os.path.getsize(out) // 1024} KB')
