"""The type check, run on every exported template. Rules it enforces:
  EDGE     no text outside the artboard or closer than 10 px to its edge
  OVERLAP  no two pieces of text overlap
  CROSS    nothing drawn crosses any text: the page is rendered again with the text hidden, and the
           ground behind every piece of text must be one flat colour (skipped on textured identity pieces)
  SMALL    no text under 11 px
Text means DOM text, SVG <text>, and drawn lettering marked .plot, .dots or .wm. Mark an element
data-nocheck to leave it out (use for third-party logos only).
"""
import io
import numpy as np
from PIL import Image

COLLECT = """(sel) => {
  const sheet = document.querySelector(sel), sr = sheet.getBoundingClientRect(), out = [];
  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT); let n, id = 0;
  while ((n = walker.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (el.closest('[data-nocheck],script,style,title,desc,[hidden]')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const fs = parseFloat(cs.fontSize) || 12;
    for (const q of r.getClientRects()) if (q.width > 1 && q.height > 1) {
      const svg = !!el.closest('svg'), it = svg ? 0 : q.height * 0.2, ib = svg ? 0 : q.height * 0.14;
      out.push({ id, fs, txt: n.nodeValue.trim().slice(0, 44), x: q.left - sr.left, y: q.top - sr.top + it, w: q.width, h: q.height - it - ib });
    }
    id++;
  }
  for (const el of sheet.querySelectorAll('.plot,.dots,.wm')) {
    if (el.closest('[data-nocheck],[hidden]')) continue;
    const q = el.getBoundingClientRect();
    out.push({ id: id++, fs: q.height, drawn: true, txt: '[' + (el.dataset.t || 'drawn text') + ']', x: q.left - sr.left, y: q.top - sr.top, w: q.width, h: q.height });
  }
  return { rects: out, W: sr.width, H: sr.height };
}"""

def hide_css(sel):
    return (f"{sel}, {sel} * {{ -webkit-text-fill-color: transparent !important; }} "
            f"{sel} svg text {{ fill-opacity: 0 !important; stroke-opacity: 0 !important; }} "
            f"{sel} .plot, {sel} .dots, {sel} .wm {{ visibility: hidden !important; }}")

def type_check(pg, sel, scale, cross=True):
    """Returns (problems, number of text boxes). Leaves the page with its text hidden."""
    info = pg.evaluate(COLLECT, sel)
    R, W, H = info["rects"], info["W"], info["H"]
    problems = []
    bare = None
    if cross:
        pg.add_style_tag(content=hide_css(sel))
        pg.wait_for_timeout(120)
        bare = np.asarray(Image.open(io.BytesIO(pg.locator(sel).screenshot())).convert("RGB")).astype(np.int16)
    for r in R:
        where = f"'{r['txt']}' at ({r['x']:.0f},{r['y']:.0f}) size {r['w']:.0f}x{r['h']:.0f}"
        if r["x"] < 10 or r["y"] < 10 or r["x"] + r["w"] > W - 10 or r["y"] + r["h"] > H - 10:
            problems.append("EDGE    " + where)
        if bare is None:
            continue
        x0, y0 = max(0, int((r["x"] - 1) * scale)), max(0, int((r["y"] - 1) * scale))
        x1, y1 = min(bare.shape[1], int((r["x"] + r["w"] + 1) * scale)), min(bare.shape[0], int((r["y"] + r["h"] + 1) * scale))
        if x1 <= x0 or y1 <= y0:
            continue
        c = bare[y0:y1, x0:x1]
        med = np.median(c.reshape(-1, 3), axis=0)
        bad = int((np.abs(c - med).max(axis=2) > 14).sum())
        if bad > 6 * scale:
            problems.append(f"CROSS   {where}: {bad} px of drawing behind it")
    for i in range(len(R)):
        for j in range(i + 1, len(R)):
            a, c = R[i], R[j]
            if a["id"] == c["id"]:
                continue
            ox = min(a["x"] + a["w"], c["x"] + c["w"]) - max(a["x"], c["x"])
            oy = min(a["y"] + a["h"], c["y"] + c["h"]) - max(a["y"], c["y"])
            if ox > 1 and oy > 1:
                problems.append(f"OVERLAP '{a['txt']}' and '{c['txt']}' by {ox:.0f}x{oy:.0f} at ({max(a['x'], c['x']):.0f},{max(a['y'], c['y']):.0f})")
    small = sorted({round(r["fs"], 1) for r in R if r["fs"] < 11 and not r.get("drawn")})
    if small:
        problems.append(f"SMALL   text under 11 px: sizes {small}")
    return problems, len(R)
