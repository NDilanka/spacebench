"""Build SB Matrix: a 5x7 round-dot matrix display face (digits, caps, symbols).
Output: brand/fonts/SBMatrix.ttf and SBMatrix.woff2
"""
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "fonts")

PITCH = 100
RADIUS = 45
ADV = 600
X0 = 100
Y0 = 50
K = 0.5522847498

G = {}
def g(ch, rows):
    rows = rows.split()
    assert len(rows) == 7 and all(len(r) == 5 for r in rows), (ch, rows)
    G[ch] = rows

g("0", ".###. #...# #..## #.#.# ##..# #...# .###.")
g("1", "..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.")
g("2", ".###. #...# ....# ...#. ..#.. .#... #####")
g("3", ".###. #...# ....# ..##. ....# #...# .###.")
g("4", "...#. ..##. .#.#. #..#. ##### ...#. ...#.")
g("5", "##### #.... ####. ....# ....# #...# .###.")
g("6", "..##. .#... #.... ####. #...# #...# .###.")
g("7", "##### ....# ...#. ..#.. .#... .#... .#...")
g("8", ".###. #...# #...# .###. #...# #...# .###.")
g("9", ".###. #...# #...# .#### ....# ...#. .##..")
g("A", ".###. #...# #...# ##### #...# #...# #...#")
g("B", "####. #...# #...# ####. #...# #...# ####.")
g("C", ".###. #...# #.... #.... #.... #...# .###.")
g("D", "####. #...# #...# #...# #...# #...# ####.")
g("E", "##### #.... #.... ####. #.... #.... #####")
g("F", "##### #.... #.... ####. #.... #.... #....")
g("G", ".###. #...# #.... #.### #...# #...# .####")
g("H", "#...# #...# #...# ##### #...# #...# #...#")
g("I", ".###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.")
g("J", "..### ...#. ...#. ...#. ...#. #..#. .##..")
g("K", "#...# #..#. #.#.. ##... #.#.. #..#. #...#")
g("L", "#.... #.... #.... #.... #.... #.... #####")
g("M", "#...# ##.## #.#.# #.#.# #...# #...# #...#")
g("N", "#...# #...# ##..# #.#.# #..## #...# #...#")
g("O", ".###. #...# #...# #...# #...# #...# .###.")
g("P", "####. #...# #...# ####. #.... #.... #....")
g("Q", ".###. #...# #...# #...# #.#.# #..#. .##.#")
g("R", "####. #...# #...# ####. #.#.. #..#. #...#")
g("S", ".#### #.... #.... .###. ....# ....# ####.")
g("T", "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..")
g("U", "#...# #...# #...# #...# #...# #...# .###.")
g("V", "#...# #...# #...# #...# #...# .#.#. ..#..")
g("W", "#...# #...# #...# #.#.# #.#.# #.#.# .#.#.")
g("X", "#...# #...# .#.#. ..#.. .#.#. #...# #...#")
g("Y", "#...# #...# #...# .#.#. ..#.. ..#.. ..#..")
g("Z", "##### ....# ...#. ..#.. .#... #.... #####")
g(" ", "..... ..... ..... ..... ..... ..... .....")
g(".", "..... ..... ..... ..... ..... ..... ..#..")
g(",", "..... ..... ..... ..... ..... ..#.. .#...")
g(":", "..... ..... ..#.. ..... ..#.. ..... .....")
g(";", "..... ..... ..#.. ..... ..#.. .#... .....")
g("-", "..... ..... ..... ##### ..... ..... .....")
g("+", "..... ..#.. ..#.. ##### ..#.. ..#.. .....")
g("=", "..... ..... ##### ..... ##### ..... .....")
g("/", "..... ....# ...#. ..#.. .#... #.... .....")
g("\\", "..... #.... .#... ..#.. ...#. ....# .....")
g("%", "##... ##..# ...#. ..#.. .#... #..## ...##")
g("\u00b0", "..#.. .#.#. ..#.. ..... ..... ..... .....")
g("\u00b1", "..#.. ..#.. ##### ..#.. ..#.. ..... #####")
g("\u00d7", "..... #...# .#.#. ..#.. .#.#. #...# .....")
g("*", "..... ..#.. #.#.# .###. #.#.# ..#.. .....")
g("#", ".#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.")
g("(", "...#. ..#.. .#... .#... .#... ..#.. ...#.")
g(")", ".#... ..#.. ...#. ...#. ...#. ..#.. .#...")
g("[", ".###. .#... .#... .#... .#... .#... .###.")
g("]", ".###. ...#. ...#. ...#. ...#. ...#. .###.")
g("<", "...#. ..#.. .#... #.... .#... ..#.. ...#.")
g(">", ".#... ..#.. ...#. ....# ...#. ..#.. .#...")
g("_", "..... ..... ..... ..... ..... ..... #####")
g("|", "..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..")
g("!", "..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..")
g("?", ".###. #...# ....# ...#. ..#.. ..... ..#..")
g("'", "..#.. ..#.. ..... ..... ..... ..... .....")
g('"', ".#.#. .#.#. ..... ..... ..... ..... .....")
g("$", "..#.. .#### #.#.. .###. ..#.# ####. ..#..")
g("~", "..... ..... .#... #.#.# ...#. ..... .....")
g("\u00b7", "..... ..... ..... ..#.. ..... ..... .....")
g("\u2192", "..... ..#.. ...#. ##### ...#. ..#.. .....")
g("\u2190", "..... ..#.. .#... ##### .#... ..#.. .....")
g("\u2191", "..#.. .###. #.#.# ..#.. ..#.. ..#.. ..#..")
g("\u2193", "..#.. ..#.. ..#.. ..#.. #.#.# .###. ..#..")
g("\u2588", "##### ##### ##### ##### ##### ##### #####")
g("\u25cf", "..... .###. ##### ##### ##### .###. .....")
g("\u25cb", "..... .###. #...# #...# #...# .###. .....")

ALIASES = {"\u2212": "-", "\u2013": "-", "\u2014": "-", "\u2022": "\u00b7", "\u00a0": " "}

def glyph_name(ch):
    return "space" if ch == " " else f"uni{ord(ch):04X}"

def circle(pen, cx, cy, r):
    k = K * r
    pen.moveTo((cx, cy + r))
    pen.curveTo((cx + k, cy + r), (cx + r, cy + k), (cx + r, cy))
    pen.curveTo((cx + r, cy - k), (cx + k, cy - r), (cx, cy - r))
    pen.curveTo((cx - k, cy - r), (cx - r, cy - k), (cx - r, cy))
    pen.curveTo((cx - r, cy + k), (cx - k, cy + r), (cx, cy + r))
    pen.closePath()

# Punctuation sits in a cell only as wide as its lit columns, so "0.08" reads as one number.
NARROW = set(".,:;'!|\u00b7")
SPACE_ADV = 300

def columns(rows):
    lit = [ci for row in rows for ci, c in enumerate(row) if c == "#"]
    return (min(lit), max(lit)) if lit else (0, 4)

def advance(ch):
    if ch == " ":
        return SPACE_ADV
    if ch in NARROW:
        c0, c1 = columns(G[ch])
        return 2 * X0 + (c1 - c0) * PITCH
    return ADV

def draw(rows, narrow=False):
    tt = TTGlyphPen(None)
    pen = Cu2QuPen(tt, max_err=0.5)
    c0 = columns(rows)[0] if narrow else 0
    for ri, row in enumerate(rows):
        for ci, c in enumerate(row):
            if c == "#":
                circle(pen, X0 + (ci - c0) * PITCH, Y0 + (6 - ri) * PITCH, RADIUS)
    return tt.glyph()

order = [".notdef"] + [glyph_name(c) for c in G]
glyphs = {".notdef": draw(G["\u25cb"])}
cmap = {}
for ch, rows in G.items():
    n = glyph_name(ch)
    glyphs[n] = draw(rows, ch in NARROW)
    cmap[ord(ch)] = n
    if ch.isalpha() and ch.isupper():
        cmap[ord(ch.lower())] = n
for a, b in ALIASES.items():
    cmap[ord(a)] = glyph_name(b)

fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(order)
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs)
metrics = {".notdef": (ADV, 60)}
for ch in G:
    metrics[glyph_name(ch)] = (advance(ch), 0 if ch == " " else 60)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupNameTable({
    "familyName": "SB Matrix",
    "styleName": "Regular",
    "uniqueFontIdentifier": "SpaceBench: SB Matrix Regular 1.000",
    "fullName": "SB Matrix Regular",
    "psName": "SBMatrix-Regular",
    "version": "Version 1.000",
    "designer": "SpaceBench",
    "copyright": "Copyright 2026 SpaceBench. Drawn for SpaceBench telemetry and score readouts.",
})
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, sTypoLineGap=0, usWinAscent=800, usWinDescent=200,
            sCapHeight=700, sxHeight=700, achVendID="SPBN", fsType=0)
fb.setupPost(isFixedPitch=0)
font = fb.font
os.makedirs(OUT, exist_ok=True)
font.save(os.path.join(OUT, "SBMatrix.ttf"))
font.flavor = "woff2"
font.save(os.path.join(OUT, "SBMatrix.woff2"))
print("glyphs", len(order), "cmap", len(cmap))
for f in ("SBMatrix.ttf", "SBMatrix.woff2"):
    print(f, os.path.getsize(os.path.join(OUT, f)))
