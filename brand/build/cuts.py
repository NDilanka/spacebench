"""The cuts of the display lettering, defined once.
Used by build_logo.py (the display wordmark) and build_display_font.py (SB Display), so the two cannot drift apart.

Units are Geist's at weight 800, 1000 to the em. A cut is (x, width) for a slit through the whole glyph,
or (x, width, y0, y1) for a slit that stops.

The rule: a cut goes where a bowl leaves its stem. A round with no stem is cut on its centre line.
Letters with no closed bowl (S, c, e, n, h, k) are never cut.
"""
import pathops

SLIT = 24

# by character
CUTS = {
    "a": [(398, SLIT)], "b": [(236, SLIT)], "d": [(386, SLIT)], "g": [(386, SLIT)],
    "p": [(236, SLIT)], "q": [(386, SLIT)], "o": [(304, SLIT)],
    "B": [(248, SLIT)], "D": [(248, SLIT)], "P": [(248, SLIT)], "R": [(248, SLIT)],
    # The Q's tail starts inside the counter. The slit passes through the ring above and below and leaves the tail whole.
    "O": [(382, SLIT)], "Q": [(378, SLIT, 400, 800), (378, SLIT, -100, 150)],
    "0": [(340, SLIT)], "6": [(312, SLIT)], "8": [(330, SLIT)], "9": [(304, SLIT)],
    "\u00fe": [(236, SLIT)], "\u00de": [(248, SLIT)],
}
# by glyph name, for glyphs no character reaches directly
GLYPH_CUTS = {"zero.tf": [(312, SLIT)]}

def cut(path, cuts):
    for c in cuts:
        x, w = c[0], c[1]
        y0, y1 = (c[2], c[3]) if len(c) == 4 else (-500, 1300)
        slit = pathops.Path(); pen = slit.getPen()
        pen.moveTo((x, y0)); pen.lineTo((x + w, y0)); pen.lineTo((x + w, y1)); pen.lineTo((x, y1)); pen.closePath()
        path = pathops.op(path, slit, pathops.PathOp.DIFFERENCE, fix_winding=True)
    return path
