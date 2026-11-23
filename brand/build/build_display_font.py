"""Build SB Display: the lettering of the display wordmark, as a font.

Geist at weight 800 with the cuts of build/cuts.py, the wordmark's tracking built into the advances,
and the mark in its three orientations as glyphs (U+E000 parent, U+E001 Dock, U+E002 Landing;
typed as :sb: :dock: :landing: where ligatures are on).

Run build_logo.py first: this script checks its outlines against the logo files that script writes.
Output: brand/fonts/SBDisplay.ttf, SBDisplay.woff2
Needs: pip install fonttools uharfbuzz skia-pathops brotli numpy
"""
import io, json, math, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.basePen import decomposeQuadraticSegment
from fontTools.svgLib.path import parse_path
from fontTools.otlLib import builder as otl
import numpy as np
import uharfbuzz as hb
import pathops

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cuts import CUTS, GLYPH_CUTS, cut

BRAND = os.path.normpath(os.path.join(HERE, ".."))
FONTS = os.path.join(BRAND, "fonts")
VERSION = "1.000"
WEIGHT = 800
TRACK = -40                       # the wordmark's -0.04 em, built in
MARKS = {"parent": ("sbmark", 0xE000, ":sb:"), "dock": ("sbmark.dock", 0xE001, ":dock:"), "landing": ("sbmark.landing", 0xE002, ":landing:")}
K = 0.5522847498

font = instantiateVariableFont(TTFont(os.path.join(FONTS, "Geist-Variable.woff2")), {"wght": WEIGHT})
font.flavor = None
glyf, hmtx, cmap = font["glyf"], font["hmtx"], font.getBestCmap()
gs = font.getGlyphSet()
CAP = font["OS/2"].sCapHeight
UPM = font["head"].unitsPerEm
SOURCE_VERSION = font["name"].getDebugName(5)

def area(drawable):
    pen = AreaPen(); drawable.draw(pen); return pen.value

def outline(name):
    p = pathops.Path(); gs[name].draw(p.getPen(glyphSet=gs)); return p

OUTER = 1 if area(gs[cmap[ord("l")]]) > 0 else -1     # the direction Geist winds an outer contour

def to_glyph(path):
    """A pathops path as a TrueType glyph, wound the way the source font winds."""
    tt = TTGlyphPen(None)
    pen = Cu2QuPen(tt, max_err=0.25, reverse_direction=(area(path) > 0) != (OUTER > 0))
    path.draw(pen)
    g = tt.glyph()
    g.recalcBounds(glyf)
    return g

# ---------------------------------------------------------------- the cuts
targets = {cmap[ord(ch)]: c for ch, c in CUTS.items()}
targets.update(GLYPH_CUTS)
report = []
for name, cuts in targets.items():
    assert not glyf[name].isComposite(), f"{name} is a composite: cut the glyph it is built from"
    before = pathops.simplify(outline(name), fix_winding=True)      # Geist draws stem and bowl as overlapping contours
    after = cut(before, cuts)
    a0, a1 = abs(area(before)), abs(area(after))
    n0, n1 = len(list(before.contours)), len(list(after.contours))
    assert a0 - a1 > 100 * cuts[0][1], f"{name}: the cut removed almost nothing"
    g = to_glyph(after)
    assert (g.xMin, g.xMax) == (glyf[name].xMin, glyf[name].xMax), f"{name}: the cut changed the glyph's width"
    glyf[name] = g
    report.append((name, n0, n1, round(a0 - a1)))
inherit = sorted(n for n in font.getGlyphOrder() if glyf[n].isComposite() and any(c.glyphName in targets for c in glyf[n].components))

# ---------------------------------------------------------------- tracking
for name in font.getGlyphOrder():
    adv, lsb = hmtx[name]
    if adv > 0:
        hmtx[name] = (adv + TRACK, lsb)

# ---------------------------------------------------------------- the mark
G = json.load(open(os.path.join(BRAND, "logo", "geometry.json"), encoding="utf-8"))
R, (CX, CY) = G["radius"], G["centre"]
DISC = round(1.36 * CAP)          # the lockup's proportion: the disc is 1.36 x the cap height
S = DISC / (2 * R)
LSB = 40
# A space after the mark leaves the lockup's gap of 0.55 x the cap height before the next letter.
RSB = round(0.55 * CAP) - hmtx["space"][0] - hmtx[cmap[ord("S")]][1]
GX, GY = LSB + DISC / 2, CAP / 2

def mark_path(sim):
    a = math.radians(G["rotation"][sim])
    def P(x, y):
        dx, dy = x - CX, y - CY
        return (GX + (dx * math.cos(a) - dy * math.sin(a)) * S, GY - (dx * math.sin(a) + dy * math.cos(a)) * S)
    def poly(pts):
        p = pathops.Path(); pen = p.getPen()
        pen.moveTo(P(*pts[0]))
        for q in pts[1:]: pen.lineTo(P(*q))
        pen.closePath(); return p
    r = R * S; k = K * r
    disc = pathops.Path(); pen = disc.getPen()
    pen.moveTo((GX, GY + r))
    pen.curveTo((GX + k, GY + r), (GX + r, GY + k), (GX + r, GY))
    pen.curveTo((GX + r, GY - k), (GX + k, GY - r), (GX, GY - r))
    pen.curveTo((GX - k, GY - r), (GX - r, GY - k), (GX - r, GY))
    pen.curveTo((GX - r, GY + k), (GX - k, GY + r), (GX, GY + r))
    pen.closePath()
    y0, y1 = G["slot"]
    holes = [poly([(CX - R - 9, y0), (CX + R + 9, y0), (CX + R + 9, y1), (CX - R - 9, y1)])]
    for cx in G["cutX"]:
        holes.append(poly([tuple(G["apex"]), (cx - G["cutHalf"], G["baseY"]), (cx + G["cutHalf"], G["baseY"])]))
    for h in holes:
        disc = pathops.op(disc, h, pathops.PathOp.DIFFERENCE, fix_winding=True)
    return disc

order = font.getGlyphOrder()
new = [m[0] for m in MARKS.values()]
font.setGlyphOrder(order + new)
font["maxp"].numGlyphs = len(order) + len(new)
for sim, (name, code, _) in MARKS.items():
    g = to_glyph(mark_path(sim))
    glyf[name] = g
    hmtx[name] = (LSB + DISC + RSB, g.xMin)
    for t in font["cmap"].tables:
        if t.isUnicode():
            t.cmap[code] = name
if "GDEF" in font and font["GDEF"].table.GlyphClassDef:
    for name in new:
        font["GDEF"].table.GlyphClassDef.classDefs[name] = 1

gsub = font["GSUB"].table
name_of = lambda ch: cmap[ord(ch)]
ligs = {tuple(name_of(c) for c in typed): name for name, _, typed in MARKS.values()}
gsub.LookupList.Lookup.append(otl.buildLookup([otl.buildLigatureSubstSubtable(ligs)]))
gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
hit = 0
for fr in gsub.FeatureList.FeatureRecord:
    if fr.FeatureTag == "liga":
        fr.Feature.LookupListIndex.append(gsub.LookupList.LookupCount - 1)
        fr.Feature.LookupCount = len(fr.Feature.LookupListIndex); hit += 1
assert hit, "the source font has no liga feature to hang the mark on"

# ---------------------------------------------------------------- hinting, names
# The source instructions describe outlines that no longer exist. This face is for 48 px and up; it ships unhinted.
for t in ("fpgm", "prep", "cvt ", "hdmx", "VDMX", "LTSH", "DSIG", "STAT", "meta"):
    if t in font: del font[t]
for name in font.getGlyphOrder():
    if glyf[name].numberOfContours:
        glyf[name].removeHinting()

nm = font["name"]
src = {i: nm.getDebugName(i) for i in (0, 9, 11, 12, 13, 14)}
nm.names = []
records = {
    0: f"{src[0]}. Cut letters and mark glyphs: Copyright 2026 SpaceBench.",
    1: "SB Display", 2: "Regular", 3: f"{VERSION};SPBN;SBDisplay-Regular", 4: "SB Display",
    5: f"Version {VERSION}; derived from Geist ({SOURCE_VERSION}) at weight {WEIGHT}",
    6: "SBDisplay-Regular", 8: "SpaceBench", 9: f"{src[9] or 'The Geist Project Authors'}; cuts and mark by SpaceBench",
    10: "The lettering of the SpaceBench display wordmark. Geist at weight 800, cut where a bowl leaves its stem, with the SpaceBench mark at U+E000 to U+E002. A Modified Version of Geist under the SIL Open Font License. For sizes of 68 px and up.",
    13: src[13] or "This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: https://openfontlicense.org",
    14: src[14] or "https://openfontlicense.org",
}
for i, v in records.items():
    if v: nm.setName(v, i, 3, 1, 0x409)
os2 = font["OS/2"]
os2.usWeightClass = WEIGHT; os2.achVendID = "SPBN"; os2.fsType = 0
os2.fsSelection = (os2.fsSelection & ~0b100001) | 0b1000000        # regular: not bold, not italic
font["head"].macStyle = 0
font["head"].fontRevision = float(VERSION)

ttf = os.path.join(FONTS, "SBDisplay.ttf")
font.save(ttf)
font.flavor = "woff2"; font.save(os.path.join(FONTS, "SBDisplay.woff2"))

# ---------------------------------------------------------------- checks, on the file as written
# Two outlines are equal when no point of either lies more than TOL font units from the other.
# The font rounds to whole units and the logo files to 0.1, so a true match is well under one unit.
# A missing cut puts its edges 12 units from anything; a cut one unit out of place fails.
TOL = 0.75
F = TTFont(ttf); fgs = F.getGlyphSet(); forder = F.getGlyphOrder()
hf = hb.Font(hb.Face(open(ttf, "rb").read()))

def shaped(text):
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties(); hb.shape(hf, buf)
    x, out = 0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((forder[info.codepoint], x + pos.x_offset)); x += pos.x_advance
    return out

def polylines(draw, steps=24):
    rec = DecomposingRecordingPen(fgs); draw(rec)
    polys, cur = [], None
    for op, args in rec.value:
        if op == "moveTo":
            cur = [args[0]]; polys.append(cur)
        elif op == "lineTo":
            cur.append(args[0])
        elif op == "qCurveTo":
            assert args[-1] is not None, "contour with no on-curve point"
            for c, p in decomposeQuadraticSegment(args):
                a = cur[-1]
                for i in range(1, steps + 1):
                    t = i / steps; u = 1 - t
                    cur.append((u * u * a[0] + 2 * u * t * c[0] + t * t * p[0], u * u * a[1] + 2 * u * t * c[1] + t * t * p[1]))
        elif op == "curveTo":
            a, c1, c2, p = cur[-1], *args
            for i in range(1, steps + 1):
                t = i / steps; u = 1 - t
                cur.append(tuple(u ** 3 * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t ** 3 * p[k] for k in (0, 1)))
        elif op in ("closePath", "endPath"):
            cur.append(cur[0])
    return polys

def reach(a, b):
    """The largest distance from a vertex of outline a to outline b."""
    P = np.array([p for poly in a for p in poly], dtype=float)
    A = np.array([p for poly in b for p in poly[:-1]], dtype=float)
    B = np.array([p for poly in b for p in poly[1:]], dtype=float)
    AB = B - A; L2 = np.maximum((AB * AB).sum(1), 1e-12)
    worst = 0.0
    for i in range(0, len(P), 256):
        Q = P[i:i + 256, None, :]
        t = np.clip(((Q - A) * AB).sum(2) / L2, 0, 1)
        D = Q - (A + t[..., None] * AB)
        worst = max(worst, float(np.sqrt((D * D).sum(2).min(1).max())))
    return worst

def compare(mine, ref):
    d = max(reach(mine, ref), reach(ref, mine))
    return d, f"the outlines are never more than {d:.2f} units apart ({d / UPM * 100:.3f}% of the em)"

def svg_paths(file):
    return re.findall(r' d="([^"]+)"', open(os.path.join(BRAND, "logo", "svg", file), encoding="utf-8").read())

problems = []
def check(label, ok, detail):
    print(("ok   " if ok else "FAIL ") + label + ": " + detail)
    if not ok: problems.append(label)

# 1. Typing a name in the font gives the logo's display wordmark.
for slug, text in (("spacebench", "SpaceBench"), ("spacebench-dock", "SpaceBench Dock"), ("spacebench-landing", "SpaceBench Landing")):
    glyphs = shaped(text)
    mine = polylines(lambda pen: [fgs[n].draw(TransformPen(pen, (1, 0, 0, 1, x, 0))) for n, x in glyphs])
    xmin = min(p[0] for poly in mine for p in poly)
    s = 72.0 / CAP                                    # build_logo.wordmark_only sets a 72 unit cap height
    ds = svg_paths(f"{slug}-wordmark-mono-ink.svg")
    ref = polylines(lambda pen: [parse_path(d, TransformPen(pen, (1 / s, 0, 0, -1 / s, xmin, 0))) for d in ds])
    worst, detail = compare(mine, ref)
    check(f'"{text}" equals the logo wordmark', worst <= TOL, detail)

# 2. The mark glyphs equal the logo's mark.
for sim, (name, code, typed) in MARKS.items():
    slug = "spacebench" if sim == "parent" else f"spacebench-{sim}"
    d = svg_paths(f"{slug}-mark-mono-ink.svg")[0]
    ref = polylines(lambda pen: parse_path(d, TransformPen(pen, (S, 0, 0, -S, GX - CX * S, GY + CY * S))), 96)
    mine = polylines(lambda pen: fgs[name].draw(pen))
    worst, detail = compare(mine, ref)
    check(f"{name} equals the logo mark", worst <= TOL, detail)
    a, b = [n for n, _ in shaped(typed + " S")], [n for n, _ in shaped(chr(code))]
    check(f"{typed} and U+{code:04X} give {name}", a[0] == name and b == [name], f"{typed} S -> {a}, U+{code:04X} -> {b}")

# 3. The gap after the mark is the lockup's.
gap = RSB + hmtx["space"][0] + hmtx[cmap[ord("S")]][1]
check("gap after the mark", abs(gap - 0.55 * CAP) <= 1, f"{gap} units, the lockup asks for {0.55 * CAP:.1f}")

print()
print("cut glyphs (name, contours before > after, area removed):")
for name, n0, n1, da in report:
    print(f"  {name:10s} {n0} > {n1}   {da}")
print("accented and tabular forms that inherit a cut:", len(inherit))
print("  " + " ".join(inherit))
print("glyphs", len(forder), "| cap height", CAP, "| disc", DISC, "| mark advance", LSB + DISC + RSB, "| tables", " ".join(sorted(F.keys())))
for f in ("SBDisplay.ttf", "SBDisplay.woff2"):
    print(f, os.path.getsize(os.path.join(FONTS, f)), "bytes")
print("problems", len(problems))
sys.exit(1 if problems else 0)
