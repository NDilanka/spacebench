"""Build the SpaceBench logo suite.

Geometry is defined once here. Outputs:
  brand/logo/svg/*.svg      static files with fixed colours, true paths, no masks
  brand/js/sb-logo.js       the same geometry for inline, themeable use on the web
  brand/logo/geometry.json  numbers used by the construction sheet
Needs: pip install fonttools uharfbuzz skia-pathops brotli
"""
import io, json, math, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb
import pathops

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cuts import CUTS, cut
BRAND = os.path.normpath(os.path.join(HERE, ".."))
SVG_DIR = os.path.join(BRAND, "logo", "svg")
os.makedirs(SVG_DIR, exist_ok=True)

# ---------------------------------------------------------------- colours (match tokens)
INK, PAPER, WHITE = "#090C13", "#ECEEF1", "#FFFFFF"
TONE_ON_PAPER, TONE_ON_INK = "#7C8493", "#6B7387"
VIOLET, VIOLET_ON_INK = "#6B3BFF", "#8E6BFF"
ORANGE, ORANGE_ON_INK = "#FF5A0A", "#FF7A33"

# ---------------------------------------------------------------- mark geometry: the cut disc
# A survey disc. One disc; the level line and the broad arrow are both cut into it.
C = 120.0                      # canvas
CX = CY = 60.0
R = 53.0                       # the disc. 7 units of clearance are built into the canvas
M = C / 2 - R
SLOT_Y0, SLOT_Y1 = 25.0, 33.5  # the level line, cut right across
APEX = (CX, SLOT_Y1)           # the three cuts of the broad arrow start on the line
BASE_Y = 100.0
CUT_X = (36.0, 60.0, 84.0)     # where each cut ends
CUT_HALF = 5.0                 # half width of a cut at its end
ROT = {"parent": 0, "dock": 90, "landing": 180}

def chord(y):
    return math.sqrt(R * R - (y - CY) ** 2)

RIM = R - math.hypot(CUT_X[0] - CUT_HALF - CX, BASE_Y - CY)   # metal left between an outer cut and the edge

def n(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s

def mark_d(sim="parent", s=1.0, ox=0.0, oy=0.0):
    a = math.radians(ROT[sim])
    def P(x, y):
        dx, dy = x - CX, y - CY
        return f"{n(ox + (CX + dx * math.cos(a) - dy * math.sin(a)) * s)} {n(oy + (CY + dx * math.sin(a) + dy * math.cos(a)) * s)}"
    r = n(R * s)
    h0, h1 = chord(SLOT_Y0), chord(SLOT_Y1)
    d = f"M{P(CX - h0, SLOT_Y0)}A{r} {r} 0 0 1 {P(CX + h0, SLOT_Y0)}Z"            # the cap above the line
    d += f"M{P(CX + h1, SLOT_Y1)}A{r} {r} 0 1 1 {P(CX - h1, SLOT_Y1)}Z"           # the body below it
    for cx in CUT_X:                                                              # wound the other way: holes
        d += f"M{P(*APEX)}L{P(cx - CUT_HALF, BASE_Y)}L{P(cx + CUT_HALF, BASE_Y)}Z"
    return d

# ---------------------------------------------------------------- wordmark outlines
def load(wght):
    f = TTFont(os.path.join(BRAND, "fonts", "Geist-Variable.woff2"))
    f = instantiateVariableFont(f, {"wght": wght})
    f.flavor = None
    buf = io.BytesIO(); f.save(buf)
    return {"font": f, "data": buf.getvalue(), "gs": f.getGlyphSet(), "order": f.getGlyphOrder()}

FONTS = {700: load(700), 800: load(800)}
UPM = FONTS[700]["font"]["head"].unitsPerEm
CAP = FONTS[700]["font"]["OS/2"].sCapHeight
TRACK = -0.04 * UPM
# The display wordmark, weight 800 only, takes the hand-placed cuts of cuts.py.

def shape(text, F):
    hf = hb.Font(hb.Face(F["data"]))
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hf, buf, {"kern": True, "liga": False})
    x, out = 0.0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((F["order"][info.codepoint], x + pos.x_offset, info.cluster, text[info.cluster]))
        x += pos.x_advance + TRACK
    return out

def glyph_path(F, name, ch, cut_it):
    p = pathops.Path()
    F["gs"][name].draw(p.getPen(glyphSet=F["gs"]))
    return cut(p, CUTS[ch]) if cut_it and ch in CUTS else p

def wordmark(text, cap_px, groups, weight=700, cut=False):
    """groups: list of (start, end) char ranges. Returns (list of path d, width).
    Local coords: x=0 at ink left, y=0 at baseline, y grows down."""
    F = FONTS[weight]
    glyphs = shape(text, F)
    s = cap_px / CAP
    bp = BoundsPen(F["gs"])
    for name, x, _, _ in glyphs:
        F["gs"][name].draw(TransformPen(bp, (1, 0, 0, 1, x, 0)))
    xmin, _, xmax, _ = bp.bounds
    ds = []
    for a, b in groups:
        pen = SVGPathPen(None, ntos=n)
        for name, x, cl, ch in glyphs:
            if a <= cl < b:
                glyph_path(F, name, ch, cut).draw(TransformPen(pen, (s, 0, 0, -s, (x - xmin) * s, 0)))
        ds.append(pen.getCommands())
    return ds, (xmax - xmin) * s

# ---------------------------------------------------------------- lockups
CAP_H = 78.0                      # cap height beside the 120 canvas: the disc is 1.36 x the cap height
MARK_GAP = 43.0                   # disc edge to wordmark: 0.55 x cap height
BASELINE = CY + CAP_H / 2
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
    by = C + 10 + cap
    return {"viewBox": [0, 0, round(width, 2), round(by + M + 12, 2)], "mark": mark_d(sim, 1, mx, 0),
            "a": ds[0], "b": ds[1], "tx": round((width - w) / 2, 2), "ty": by}

def wordmark_only(sim):
    """The display wordmark: weight 800 with the hand cuts. For 48 px cap height and up."""
    text, groups = text_groups(sim)
    cap, pad = 72.0, 15.0
    ds, w = wordmark(text, cap, groups, 800, True)
    return {"viewBox": [0, 0, round(w + 2 * pad, 2), cap + 22 + 2 * pad], "mark": "",
            "a": ds[0], "b": ds[1], "tx": pad, "ty": pad + cap + 2}

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
    scale = 0.74 * S / C
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

# The favicon crops the built-in clearance so the disc fills a 16 px tab icon.
favicon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{n(M)} {n(M)} {n(2 * R)} {n(2 * R)}">\n'
           f'<style>path{{fill:{INK}}}@media (prefers-color-scheme:dark){{path{{fill:{PAPER}}}}}</style>\n'
           f'<path d="{mark_d("parent")}"/>\n</svg>\n')
write("favicon.svg", favicon); written.append("favicon.svg")

# ---------------------------------------------------------------- data for the web
geom = {
    "canvas": C, "centre": [CX, CY], "radius": R, "clearance": M,
    "slot": [SLOT_Y0, SLOT_Y1], "apex": list(APEX), "baseY": BASE_Y, "cutX": list(CUT_X), "cutHalf": CUT_HALF,
    "rim": round(RIM, 3), "rotation": ROT, "capHeight": CAP_H, "markGap": MARK_GAP, "baseline": BASELINE,
    "font": {"family": "Geist", "weight": 700, "displayWeight": 800, "tracking": -0.04, "unitsPerEm": UPM, "capHeightUnits": CAP,
             "cuts": {k: [list(c) for c in v] for k, v in CUTS.items()}},
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
  /* The display wordmark, with the hand cuts. Use it at 48 px cap height and up; below that use the lockup. */
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

print("disc radius", R, "rim left beside an outer cut", round(RIM, 3), "cap height units", CAP)
print("svg files", len(written))
for sim in LOCKUPS:
    print(sim, "horizontal", LOCKUPS[sim]["horizontal"]["viewBox"], "stacked", LOCKUPS[sim]["stacked"]["viewBox"], "wordmark", LOCKUPS[sim]["wordmark"]["viewBox"])
