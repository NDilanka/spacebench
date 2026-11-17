"""Export everything that is rendered rather than generated:
  exports/*.png           templates at their artboard size
  logo/png/*.png          logos at fixed sizes, transparent
  logo/png/favicon.ico    16, 32, 48
  graphics/*.svg          each graphic device as a standalone SVG, both grounds
  graphics/icons/*.svg    pictograms
Needs: pip install playwright pillow, and Google Chrome installed.
usage: py build/export.py [templates] [logos] [graphics]   (no argument = all)
"""
import math, os, pathlib, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
BRAND = HERE.parent
WHAT = set(sys.argv[1:]) or {"templates", "logos", "graphics"}

TEMPLATES = [
    ("share-card.html", "sim=parent&theme=dark", 1200, 630, "og-parent-ink"),
    ("share-card.html", "sim=parent&theme=light", 1200, 630, "og-parent-paper"),
    ("share-card.html", "sim=dock&theme=light", 1200, 630, "og-dock-paper"),
    ("share-card.html", "sim=dock&theme=dark", 1200, 630, "og-dock-ink"),
    ("share-card.html", "sim=landing&theme=dark", 1200, 630, "og-landing-ink"),
    ("flight-sheet.html", "theme=light", 1200, 1500, "flight-sheet-paper"),
    ("flight-sheet.html", "theme=dark", 1200, 1500, "flight-sheet-ink"),
    ("leaderboard.html", "theme=light", 1600, 1000, "leaderboard-dock"),
    ("leaderboard.html", "theme=dark", 1600, 1000, "leaderboard-dock-ink"),
    ("banner.html", "sim=dock&theme=dark", 1500, 500, "banner-dock"),
    ("banner.html", "sim=parent&theme=dark", 1500, 500, "banner-parent"),
] + [("tier-poster.html", f"tier={n}&theme={'dark' if n == 6 else 'light'}", 1080, 1350, f"tier-{n}") for n in range(1, 7)]

LOGO_HEIGHTS = {"mark": [512, 128], "lockup": [240], "stacked": [480], "wordmark": [200]}
ICON_SIZES = [1024, 512, 180]

GROUNDS = {
    "paper": {"fg": "#121211", "muted": "#8A8A84", "line": "#C2C2BD", "bg": "#F3F3F1", "surface": "#FAFAF8"},
    "ink": {"fg": "#F3F3F1", "muted": "#7A7A74", "line": "#3A3A37", "bg": "#121211", "surface": "#1B1B1A"},
}
ACCENTS = {"parent": {"paper": "#121211", "ink": "#F3F3F1"}, "dock": {"paper": "#6B3BFF", "ink": "#8E6BFF"}, "landing": {"paper": "#FF5A0A", "ink": "#FF7A33"}}
GRAPHICS = {  # name: (js expression, simulation whose accent it takes)
    "flight-signature": ("G.flightSignature(G.specimenFlight(421,3),{width:1200,height:110,colors:C})", "dock"),
    "approach-arcs": ("G.approachArcs({colors:C})", "dock"),
    "approach-chart": ("G.approachChart(G.specimenFlight(421,3),{colors:C})", "dock"),
    "orbit": ("G.orbit({colors:C})", "dock"),
    "docking-interface": ("G.dockingRing({colors:C})", "dock"),
    "thruster-set": ("G.thrusters({stuck:[3],colors:C})", "dock"),
    "range-scale": ("G.rangeScale({colors:C})", "dock"),
    "error-dial": ("G.dial({value:2.4,limit:4,colors:C})", "dock"),
    "dot-mark-parent": ("G.dotMark('parent',{colors:C})", "parent"),
    "dot-mark-dock": ("G.dotMark('dock',{colors:C})", "dock"),
    "dot-mark-landing": ("G.dotMark('landing',{colors:C})", "landing"),
}

def standalone(svg, ground):
    g = GROUNDS[ground]
    svg = svg.replace("var(--sb-bg, #F3F3F1)", g["bg"]).replace("var(--sb-surface, #FAFAF8)", g["surface"])
    svg = re.sub(r"font-family='[^']*'", "font-family=\"'Geist Mono', ui-monospace, monospace\"", svg)
    assert "var(" not in svg, "unresolved custom property in exported SVG"
    return svg.replace("currentColor", g["fg"]) + "\n"

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")

def main():
    problems = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)

        if "templates" in WHAT:
            out = BRAND / "exports"; out.mkdir(exist_ok=True)
            for f, q, w, h, name in TEMPLATES:
                pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
                pg.on("console", lambda m, n=name: problems.append(f"{n}: [{m.type}] {m.text}") if m.type in ("error", "warning") else None)
                pg.on("pageerror", lambda e, n=name: problems.append(f"{n}: {e}"))
                pg.on("requestfailed", lambda r, n=name: problems.append(f"{n}: failed {r.url}"))
                pg.goto((BRAND / "templates" / f).as_uri() + "?" + q)
                pg.wait_for_load_state("networkidle"); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(120)
                over = pg.evaluate("[document.body.scrollWidth-document.body.clientWidth, document.body.scrollHeight-document.body.clientHeight]")
                if over[0] > 0 or over[1] > 0:
                    problems.append(f"{name}: content overflows the artboard by {over}")
                pg.screenshot(path=str(out / f"{name}.png"))
                pg.close()
            print("templates", len(TEMPLATES))

        if "logos" in WHAT:
            out = BRAND / "logo" / "png"; out.mkdir(exist_ok=True)
            count = 0
            for svg in sorted((BRAND / "logo" / "svg").glob("*.svg")):
                stem = svg.stem
                if stem == "favicon" or stem.endswith("-square"):
                    continue
                m = re.search(r'viewBox="([\d. ]+)"', svg.read_text(encoding="utf-8"))
                _, _, vw, vh = [float(x) for x in m.group(1).split()]
                if "appicon" in stem:
                    heights = ICON_SIZES
                else:
                    kind = next(k for k in LOGO_HEIGHTS if f"-{k}-" in stem)
                    heights = LOGO_HEIGHTS[kind]
                for hpx in heights:
                    scale = hpx / vh
                    ctx = b.new_context(viewport={"width": math.ceil(vw), "height": math.ceil(vh)}, device_scale_factor=scale)
                    pg = ctx.new_page(); pg.goto(svg.as_uri())
                    pg.screenshot(path=str(out / f"{stem}-{hpx}.png"), omit_background=True, clip={"x": 0, "y": 0, "width": vw, "height": vh})
                    ctx.close(); count += 1
            fav = BRAND / "logo" / "svg" / "favicon.svg"
            ctx = b.new_context(viewport={"width": 102, "height": 102}, device_scale_factor=256 / 102, color_scheme="light")
            pg = ctx.new_page(); pg.goto(fav.as_uri())
            tmp = out / "favicon-256.png"
            pg.screenshot(path=str(tmp), omit_background=True); ctx.close()
            Image.open(tmp).resize((256, 256), Image.LANCZOS).save(out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
            print("logo png", count + 1, "+ favicon.ico")

        if "graphics" in WHAT:
            pg = b.new_page()
            pg.goto((BRAND / "templates" / "banner.html").as_uri())
            pg.wait_for_load_state("networkidle")
            out = BRAND / "graphics"; n = 0
            for name, (expr, sim) in GRAPHICS.items():
                for ground, g in GROUNDS.items():
                    colors = {"fg": g["fg"], "muted": g["muted"], "line": g["line"], "accent": ACCENTS[sim][ground]}
                    svg = pg.evaluate("(C) => { const G = SBGraphics; return " + expr + "; }", colors)
                    write(out / f"{name}-on-{ground}.svg", standalone(svg, ground)); n += 1
            svg = pg.evaluate("(C) => SBGraphics.limb({width:1600,height:520,count:5200,seed:421,colors:C})", {"fg": GROUNDS["ink"]["fg"]})
            write(out / "limb-on-ink.svg", standalone(svg, "ink")); n += 1
            for t in range(1, 7):
                svg = pg.evaluate("([t, C]) => SBGraphics.tierDots(t, {colors:C})", [t, {"fg": "#121211", "muted": "#8A8A84"}])
                write(out / f"tier-{t}-dots.svg", standalone(svg, "paper")); n += 1
            icons = pg.evaluate("Object.keys(SBGraphics.ICONS).map(k => [k, SBGraphics.icon(k)])")
            for k, svg in icons:
                write(out / "icons" / f"{k}.svg", svg.replace(' class="sb-icon"', "") + "\n"); n += 1
            print("graphics svg", n)
        b.close()
    for pr in problems:
        print("PROBLEM", pr)
    print("problems", len(problems))
    return 1 if problems else 0

sys.exit(main())
