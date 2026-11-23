"""Render proof pages to PNG. usage: build.py <page> [<page> ...]  where page = p01-mark  (optional :scale)"""
import sys, pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
(here / 'out').mkdir(exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    for arg in sys.argv[1:]:
        name, _, sc = arg.partition(':')
        pg = b.new_page(viewport={"width": 1700, "height": 1200}, device_scale_factor=float(sc or 1))
        errs = []
        pg.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        pg.on("requestfailed", lambda r: errs.append(f"[requestfailed] {r.url}"))
        pg.goto((here / f"{name}.html").as_uri())
        pg.wait_for_load_state("networkidle")
        try:
            pg.wait_for_function("document.body.dataset.ready === '1'", timeout=20000)
        except Exception as e:
            errs.append(f"[not ready] {e}")
        pg.wait_for_timeout(250)
        out = here / 'out' / f"{name}.png"
        pg.locator("#sheet").screenshot(path=str(out))
        print("ok", out.name, *errs, sep="\n  " if errs else " ")
        pg.close()
    b.close()
