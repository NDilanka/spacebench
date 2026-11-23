"""Render round two pages and check them. usage: build.py <page> [<page> ...] [--scale=2]
For each page: screenshot #sheet to out/<page>.png, then run the type check:
  1. no text outside the sheet or closer than 10 px to its edge
  2. no two pieces of text overlap
  3. nothing drawn crosses any text: the page is rendered again with the text hidden, and the
     ground behind every piece of text must be one flat colour."""
import sys, pathlib, io
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
(here / 'out').mkdir(exist_ok=True)
scale = 2.0
pages = []
for a in sys.argv[1:]:
    if a.startswith('--scale='): scale = float(a.split('=')[1])
    else: pages.append(a)
COLLECT = """() => {
  const sheet = document.getElementById('sheet'), sr = sheet.getBoundingClientRect(), out = [];
  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT); let n, id = 0;
  while ((n = walker.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (el.closest('[data-nocheck],script,style,title,desc')) continue;
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
    if (el.closest('[data-nocheck]')) continue;
    const q = el.getBoundingClientRect();
    out.push({ id: id++, fs: q.height, txt: '[' + (el.dataset.t || 'drawn text') + ']', x: q.left - sr.left, y: q.top - sr.top, w: q.width, h: q.height });
  }
  return { rects: out, W: sr.width, H: sr.height };
}"""
HIDE = "#sheet, #sheet * { -webkit-text-fill-color: transparent !important; } #sheet svg text { fill-opacity: 0 !important; stroke-opacity: 0 !important; } #sheet .plot, #sheet .dots, #sheet .wm { visibility: hidden !important; }"
total = 0
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    for name in pages:
        pg = b.new_page(viewport={"width": 1700, "height": 1200}, device_scale_factor=scale)
        errs = []
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        pg.on("requestfailed", lambda r: errs.append(f"[requestfailed] {r.url}"))
        pg.goto((here / f"{name}.html").as_uri())
        pg.wait_for_load_state("networkidle")
        try: pg.wait_for_function("document.body.dataset.ready === '1'", timeout=30000)
        except Exception as e: errs.append(f"[not ready] {e}")
        pg.wait_for_timeout(250)
        out = here / 'out' / f"{name}.png"
        pg.locator("#sheet").screenshot(path=str(out))
        info = pg.evaluate(COLLECT)
        pg.add_style_tag(content=HIDE)
        pg.wait_for_timeout(120)
        bare = np.asarray(Image.open(io.BytesIO(pg.locator("#sheet").screenshot())).convert('RGB')).astype(np.int16)
        problems = []
        R = info['rects']; W, H = info['W'], info['H']
        for r in R:
            if r['x'] < 10 or r['y'] < 10 or r['x'] + r['w'] > W - 10 or r['y'] + r['h'] > H - 10:
                problems.append(f"EDGE   '{r['txt']}' at ({r['x']:.0f},{r['y']:.0f}) size {r['w']:.0f}x{r['h']:.0f}")
            x0, y0 = max(0, int((r['x'] - 1) * scale)), max(0, int((r['y'] - 1) * scale))
            x1, y1 = min(bare.shape[1], int((r['x'] + r['w'] + 1) * scale)), min(bare.shape[0], int((r['y'] + r['h'] + 1) * scale))
            if x1 <= x0 or y1 <= y0: continue
            c = bare[y0:y1, x0:x1]
            med = np.median(c.reshape(-1, 3), axis=0)
            bad = int((np.abs(c - med).max(axis=2) > 14).sum())
            if bad > 6 * scale:
                problems.append(f"CROSS  '{r['txt']}' at ({r['x']:.0f},{r['y']:.0f}) size {r['w']:.0f}x{r['h']:.0f}: {bad} px of drawing behind it")
        for i in range(len(R)):
            for j in range(i + 1, len(R)):
                a, c = R[i], R[j]
                if a['id'] == c['id']: continue
                ox = min(a['x'] + a['w'], c['x'] + c['w']) - max(a['x'], c['x']); oy = min(a['y'] + a['h'], c['y'] + c['h']) - max(a['y'], c['y'])
                if ox > 1 and oy > 1: problems.append(f"OVERLAP '{a['txt']}' and '{c['txt']}' by {ox:.0f}x{oy:.0f} at ({max(a['x'], c['x']):.0f},{max(a['y'], c['y']):.0f})")
        small = sorted({round(r['fs'], 1) for r in R if r['fs'] < 11 and not r['txt'].startswith('[')})
        if small: problems.append(f"SMALL  text under 11 px: sizes {small}")
        total += len(problems) + len(errs)
        im = Image.open(out)
        print(f"{name}: {im.size[0]}x{im.size[1]} px, {out.stat().st_size // 1024} KB, {len(R)} text boxes checked, {len(problems)} problems, {len(errs)} page errors")
        for e in errs: print("  " + e)
        for q in problems[:40]: print("  " + q)
        pg.close()
    b.close()
print("TOTAL PROBLEMS", total)
