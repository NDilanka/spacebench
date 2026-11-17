"""Build the SpaceBench logo suite.

Geometry is defined once here. Outputs:
  brand/logo/svg/*.svg      static files with fixed colours
  brand/js/sb-logo.js       the same geometry for inline, themeable use on the web
  brand/logo/geometry.json  numbers used by the construction sheet
"""
import io, json, math, os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.normpath(os.path.join(HERE, ".."))
SVG_DIR = os.path.join(BRAND, "logo", "svg")
os.makedirs(SVG_DIR, exist_ok=True)

# ---------------------------------------------------------------- colours (match tokens)
INK, PAPER, WHITE = "#121211", "#F3F3F1", "#FFFFFF"
TONE_ON_PAPER, TONE_ON_INK = "#8A8A84", "#7A7A74"
VIOLET, VIOLET_ON_INK = "#6B3BFF", "#8E6BFF"
ORANGE, ORANGE_ON_INK = "#FF5A0A", "#FF7A33"

# ---------------------------------------------------------------- mark geometry
C = 120.0          # canvas: 8 x 8 modules of 15
T = 15.0           # stroke: one module
M = 15.0           # clearance: one module on every side
BAR_Y0, BAR_Y1 = 15.0, 30.0
GAP = 7.5          # contact gap between datum and arrow: half a module
AR_Y0, AR_Y1 = BAR_Y1 + GAP, 105.0
CX = C / 2
AIM = (CX, (BAR_Y0 + BAR_Y1) / 2)   # the outer edges of both legs aim at the centre of the datum

def solve_leg_width():
    """Top width of the arrow. The outer edge of a leg runs from a lower corner of the
    mark to AIM, so the approach corridor converges on the centre of the docking plane."""
    x_top = M + (CX - M) * (AR_Y1 - AR_Y0) / (AR_Y1 - AIM[1])
    return 2 * (CX - x_top)

W = solve_leg_width()
t_notch = (T / 2 + W / 2) / ((C / 2 - M) - W / 2)
NOTCH_Y = AR_Y0 + (AR_Y1 - AR_Y0) * t_notch
LEG_THICKNESS = W * (AR_Y1 - AR_Y0) / math.hypot((C / 2 - M) - W / 2, AR_Y1 - AR_Y0)

BAR = [(M, BAR_Y0), (C - M, BAR_Y0), (C - M, BAR_Y1), (M, BAR_Y1)]
ARROW = [
    (CX - W / 2, AR_Y0), (CX + W / 2, AR_Y0),
    (C - M, AR_Y1), (C - M - W, AR_Y1),
    (CX + T / 2, NOTCH_Y), (CX + T / 2, AR_Y1), (CX - T / 2, AR_Y1), (CX - T / 2, NOTCH_Y),
    (M + W, AR_Y1), (M, AR_Y1),
]
ROT = {"parent": 0, "dock": 90, "landing": 180}

def rot(p, deg):
    a = math.radians(deg)
    x, y = p[0] - CX, p[1] - CX
    return (CX + x * math.cos(a) - y * math.sin(a), CX + x * math.sin(a) + y * math.cos(a))

def n(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s

def poly(points, deg=0, sx=1.0, ox=0.0, oy=0.0):
    pts = [rot(p, deg) for p in points]
    return "M" + "L".join(f"{n(ox + x * sx)} {n(oy + y * sx)}" for x, y in pts) + "Z"

def mark_d(sim="parent", s=1.0, ox=0.0, oy=0.0):
    return poly(BAR, ROT[sim], s, ox, oy) + poly(ARROW, ROT[sim], s, ox, oy)

# ---------------------------------------------------------------- wordmark outlines
def load(path, wght):
    f = TTFont(path)
    f = instantiateVariableFont(f, {"wght": wght})
    f.flavor = None
    buf = io.BytesIO(); f.save(buf)
    return f, buf.getvalue()

FONT, FONT_DATA = load(os.path.join(BRAND, "fonts", "Geist-Variable.woff2"), 600)
UPM = FONT["head"].unitsPerEm
CAP = FONT["OS/2"].sCapHeight
TRACK = -0.045 * UPM
GS = FONT.getGlyphSet()
ORDER = FONT.getGlyphOrder()

def shape(text):
    face = hb.Face(FONT_DATA); hf = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hf, buf, {"kern": True, "liga": False})
    x, out = 0.0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((ORDER[info.codepoint], x + pos.x_offset, info.cluster))
        x += pos.x_advance + TRACK
    return out

def wordmark(text, cap_px, groups):
    """groups: list of (start, end) char ranges. Returns (list of path d, width).
    Local coords: x=0 at ink left, y=0 at baseline, y grows down."""
    glyphs = shape(text)
    s = cap_px / CAP
    bp = BoundsPen(GS)
    for name, x, _ in glyphs:
        GS[name].draw(TransformPen(bp, (1, 0, 0, 1, x, 0)))
    xmin, _, xmax, _ = bp.bounds
    ds = []
    for a, b in groups:
        pen = SVGPathPen(GS, ntos=n)
        for name, x, cl in glyphs:
            if a <= cl < b:
                GS[name].draw(TransformPen(pen, (s, 0, 0, -s, (x - xmin) * s, 0)))
        ds.append(pen.getCommands())
    return ds, (xmax - xmin) * s

# ---------------------------------------------------------------- lockups
CAP_H = 72.0                      # cap height in a horizontal lockup; the mark is 1.25 x cap
MARK_GAP = 30.0                   # two modules between mark and wordmark
BASELINE = CX + CAP_H / 2
NAMES = {"parent": None, "dock": "Dock", "landing": "Landing"}

def text_groups(sim):
    name = NAMES[sim]
    if name:
        text = f"SpaceBench {name}"
        return text, [(0, 10), (11, len(text))]
    return "SpaceBench", [(0, 5), (5, 10)]

def lockup_h(sim):
    text, groups = text_groups(sim)
    ds, w = wordmark(text, CAP_H, groups)
    x0 = C - M + MARK_GAP
    return {"viewBox": [0, 0, round(x0 + w + M, 2), C], "mark": mark_d(sim),
            "a": ds[0], "b": ds[1], "tx": round(x0, 2), "ty": BASELINE}

def lockup_v(sim):
    text, groups = text_groups(sim)
    cap = 34.0
    ds, w = wordmark(text, cap, groups)
    width = max(w + 2 * M, C)
    mx = (width - C) / 2
    by = C + 4 + cap
    return {"viewBox": [0, 0, round(width, 2), round(by + M + 6, 2)], "mark": mark_d(sim, 1, mx, 0),
            "a": ds[0], "b": ds[1], "tx": round((width - w) / 2, 2), "ty": by}

def wordmark_only(sim):
    text, groups = text_groups(sim)
    cap = 72.0
    ds, w = wordmark(text, cap, groups)
    return {"viewBox": [0, 0, round(w + 2 * M, 2), cap + 20 + 2 * M], "mark": "",
            "a": ds[0], "b": ds[1], "tx": M, "ty": M + cap + 2}

def svg(lk, c_mark, c_a, c_b, title):
    vb = " ".join(n(v) for v in lk["viewBox"])
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{n(lk["viewBox"][2])}" height="{n(lk["viewBox"][3])}" role="img" aria-label="{title}">',
             f"<title>{title}</title>"]
    if lk["mark"]:
        parts.append(f'<path fill="{c_mark}" d="{lk["mark"]}"/>')
    if lk.get("a"):
        parts.append(f'<g transform="translate({n(lk["tx"])} {n(lk["ty"])})"><path fill="{c_a}" d="{lk["a"]}"/><path fill="{c_b}" d="{lk["b"]}"/></g>')
    parts.append("</svg>")
    return "\n".join(parts) + "\n"

def write(name, content):
    with open(os.path.join(SVG_DIR, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(content)

written = []
def emit(name, lk, cm, ca, cb, title):
    write(name, svg(lk, cm, ca, cb, title)); written.append(name)

TITLES = {"parent": "SpaceBench", "dock": "SpaceBench Dock", "landing": "SpaceBench Landing"}
ACC = {"dock": (VIOLET, VIOLET_ON_INK), "landing": (ORANGE, ORANGE_ON_INK)}
LOCKUPS = {}
for sim in ROT:
    mk = {"viewBox": [0, 0, C, C], "mark": mark_d(sim)}
    lh, lv, wm = lockup_h(sim), lockup_v(sim), wordmark_only(sim)
    LOCKUPS[sim] = {"mark": mk, "horizontal": lh, "stacked": lv, "wordmark": wm}
    slug = "spacebench" if sim == "parent" else f"spacebench-{sim}"
    t = TITLES[sim]
    for kind, lk in (("mark", mk), ("lockup", lh), ("stacked", lv), ("wordmark", wm)):
        if sim == "parent":
            emit(f"{slug}-{kind}-on-paper.svg", lk, INK, INK, TONE_ON_PAPER, t)
            emit(f"{slug}-{kind}-on-ink.svg", lk, PAPER, PAPER, TONE_ON_INK, t)
        else:
            a_p, a_i = ACC[sim]
            emit(f"{slug}-{kind}-on-paper.svg", lk, a_p, INK, a_p, t)
            emit(f"{slug}-{kind}-on-ink.svg", lk, a_i, PAPER, a_i, t)
        emit(f"{slug}-{kind}-mono-ink.svg", lk, INK, INK, INK, t)
        emit(f"{slug}-{kind}-mono-paper.svg", lk, PAPER, PAPER, PAPER, t)

# ---------------------------------------------------------------- app icons and favicon
def app_icon(sim, bg, fg, rounded=True):
    S = 1024.0
    scale = 0.70 * S / C
    off = (S - C * scale) / 2
    r = 230 if rounded else 0
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="{TITLES[sim]} app icon">\n'
            f'<rect width="1024" height="1024" rx="{r}" fill="{bg}"/>\n'
            f'<path fill="{fg}" d="{mark_d(sim, scale, off, off)}"/>\n</svg>\n')

ICONS = {
    "spacebench-appicon-ink": ("parent", INK, PAPER),
    "spacebench-appicon-paper": ("parent", PAPER, INK),
    "spacebench-dock-appicon": ("dock", VIOLET, WHITE),
    "spacebench-landing-appicon": ("landing", ORANGE, INK),
}
for name, (sim, bg, fg) in ICONS.items():
    write(f"{name}.svg", app_icon(sim, bg, fg, True)); written.append(f"{name}.svg")
    write(f"{name}-square.svg", app_icon(sim, bg, fg, False)); written.append(f"{name}-square.svg")

# The favicon crops the built-in clearance so the mark fills a 16 px tab icon.
favicon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="9 9 102 102">\n'
           f'<style>path{{fill:{INK}}}@media (prefers-color-scheme:dark){{path{{fill:{PAPER}}}}}</style>\n'
           f'<path d="{mark_d("parent")}"/>\n</svg>\n')
write("favicon.svg", favicon); written.append("favicon.svg")

# ---------------------------------------------------------------- data for the web
geom = {
    "canvas": C, "stroke": T, "margin": M, "gap": GAP, "legWidth": round(W, 4), "legThickness": round(LEG_THICKNESS, 4),
    "notchY": round(NOTCH_Y, 4), "aim": list(AIM),
    "bar": BAR, "arrow": [[round(x, 4), round(y, 4)] for x, y in ARROW],
    "rotation": ROT, "capHeight": CAP_H, "markGap": MARK_GAP, "baseline": BASELINE,
    "font": {"family": "Geist", "weight": 600, "tracking": -0.045, "unitsPerEm": UPM, "capHeightUnits": CAP},
}
with open(os.path.join(BRAND, "logo", "geometry.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(geom, f, indent=2); f.write("\n")

js = "/* Generated by brand/build/build_logo.py. Do not edit by hand. */\n(function (root) {\n"
js += "var DATA = " + json.dumps({"geometry": geom, "lockups": LOCKUPS}, separators=(",", ":")) + ";\n"
js += r"""
function svg(sim, kind, opts) {
  opts = opts || {};
  var lk = DATA.lockups[sim || 'parent'][kind || 'horizontal'];
  var vb = lk.viewBox.join(' ');
  var size = opts.height ? ' height="' + opts.height + '"' : '';
  var cls = 'sb-logo sb-logo--' + (sim || 'parent') + (opts.mono ? ' sb-logo--mono' : '') + (opts.className ? ' ' + opts.className : '');
  var out = '<svg xmlns="http://www.w3.org/2000/svg" class="' + cls + '" data-sim="' + (sim || 'parent') + '" viewBox="' + vb + '"' + size + ' role="img" aria-label="' + (opts.label || 'SpaceBench') + '">';
  if (lk.mark) out += '<path class="sb-logo__mark" d="' + lk.mark + '"/>';
  if (lk.a) out += '<g transform="translate(' + lk.tx + ' ' + lk.ty + ')"><path class="sb-logo__a" d="' + lk.a + '"/><path class="sb-logo__b" d="' + lk.b + '"/></g>';
  return out + '</svg>';
}
var api = {
  data: DATA,
  mark: function (sim, opts) { return svg(sim, 'mark', opts); },
  lockup: function (sim, opts) { return svg(sim, 'horizontal', opts); },
  stacked: function (sim, opts) { return svg(sim, 'stacked', opts); },
  wordmark: function (sim, opts) { return svg(sim, 'wordmark', opts); },
  /* Replace every <span data-sb-logo="lockup" data-sim="dock" data-height="32"> placeholder. */
  mount: function (scope) {
    (scope || document).querySelectorAll('[data-sb-logo]').forEach(function (el) {
      var kind = el.getAttribute('data-sb-logo') || 'lockup';
      var fn = api[kind] || api.lockup;
      el.innerHTML = fn(el.getAttribute('data-sim') || 'parent', {
        height: el.getAttribute('data-height') || undefined,
        mono: el.hasAttribute('data-mono')
      });
    });
  }
};
root.SBLogo = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
"""
os.makedirs(os.path.join(BRAND, "js"), exist_ok=True)
with open(os.path.join(BRAND, "js", "sb-logo.js"), "w", encoding="utf-8", newline="\n") as f:
    f.write(js)

print("leg top width", round(W, 3), "leg thickness", round(LEG_THICKNESS, 3), "notch y", round(NOTCH_Y, 3))
print("svg files", len(written))
for sim in LOCKUPS:
    print(sim, "horizontal", LOCKUPS[sim]["horizontal"]["viewBox"], "stacked", LOCKUPS[sim]["stacked"]["viewBox"])
