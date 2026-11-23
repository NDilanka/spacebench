"""Export everything that is rendered rather than generated:
  exports/*.png           templates at their artboard size (drawing sheets at 2x), each one type-checked
  logo/png/*.png          logos at fixed sizes, transparent
  logo/png/favicon.ico    16, 32, 48
  graphics/*.svg          each graphic device as a standalone SVG, both grounds
  graphics/icons/*.svg    pictograms
Needs: pip install playwright pillow numpy, and Google Chrome installed.
  exports/post-*.png      three post images, made by tools/post-image.html as a person would make them
usage: py build/export.py [templates] [posts] [logos] [graphics] [--only=name,name] [--prune]
  no section named = all four. --only exports just the templates whose export name contains one of the names.
  --prune deletes files in exports/ and graphics/ that this script no longer makes.
"""
import base64, math, pathlib, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from check import type_check

BRAND = HERE.parent
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
WHAT = set(ARGS) or {"templates", "posts", "logos", "graphics"}
ONLY = next((a.split("=", 1)[1].split(",") for a in sys.argv[1:] if a.startswith("--only=")), None)
PRUNE = "--prune" in sys.argv

# file, query, export name, device scale, cross check (False on pieces that sit on the plume field)
SHEETS = ["mark", "circle", "contact", "bits", "sixteen", "gate-run"]
TEMPLATES = [(f"sheet-{s}.html", "", f"sheet-{s}", 2, True) for s in SHEETS] + [
    ("avatar.html", "sim=parent&theme=light", "x-avatar-film", 1, False),
    ("avatar.html", "sim=parent&theme=dark", "x-avatar-ink", 1, False),
    ("avatar.html", "sim=dock&theme=light", "x-avatar-dock-film", 1, False),
    ("avatar.html", "sim=dock&theme=dark", "x-avatar-dock-ink", 1, False),
    ("banner.html", "sim=parent&theme=dark&by=1", "x-banner-ink", 1, False),
    ("banner.html", "sim=parent&theme=light", "x-banner-film", 1, False),
    ("share-card.html", "sim=parent&theme=dark", "og-parent-ink", 1, False),
    ("share-card.html", "sim=parent&theme=light", "og-parent-film", 1, False),
    ("share-card.html", "sim=dock&theme=dark", "og-dock-ink", 1, False),
    ("share-card.html", "sim=dock&theme=light", "og-dock-film", 1, False),
    ("share-card.html", "sim=landing&theme=dark", "og-landing-ink", 1, False),
    ("leaderboard.html", "theme=light", "leaderboard-dock-film", 1, True),
    ("leaderboard.html", "theme=dark", "leaderboard-dock-ink", 1, True),
] + [("tier-poster.html", f"tier={n}&theme={'dark' if n == 6 else 'light'}", f"tier-{n}", 1, True) for n in range(1, 7)]

# export name, query for tools/post-image.html
POSTS = [
    ("post-dock-ink", "sim=dock&ground=plume-ink&size=wide"),
    ("post-parent-film", "sim=parent&ground=plume-film&size=square"),
    ("post-landing-field", "sim=landing&ground=field&size=wide"),
]
EXPORTED = {t[2] + ".png" for t in TEMPLATES} | {p[0] + ".png" for p in POSTS}

LOGO_HEIGHTS = {"mark": [512, 128], "lockup": [240], "stacked": [480], "wordmark": [200]}
ICON_SIZES = [1024, 512, 180]

GROUNDS = {
    "film": {"fg": "#090C13", "muted": "#7C8493", "line": "#A9B0BC", "bg": "#ECEEF1", "surface": "#F6F7F9"},
    "ink": {"fg": "#ECEEF1", "muted": "#6B7387", "line": "#3A435A", "bg": "#090C13", "surface": "#111622"},
}
ACCENTS = {"parent": {"film": "#090C13", "ink": "#ECEEF1"}, "dock": {"film": "#6B3BFF", "ink": "#8E6BFF"}, "landing": {"film": "#FF5A0A", "ink": "#FF7A33"}}
# name: (js expression, simulation whose accent it takes). Devices that show a flight are exported empty: no flight exists.
GRAPHICS = {
    "approach-arcs": ("G.approachArcs({colors:C})", "dock"),
    "orbit": ("G.orbit({colors:C})", "dock"),
    "docking-interface": ("G.dockingRing({colors:C})", "dock"),
    "thruster-set": ("G.thrusters({colors:C})", "dock"),
    "range-scale": ("G.rangeScale({colors:C})", "dock"),
    "error-dial": ("G.dial({limit:4,colors:C})", "dock"),
    "contact-figure": ("G.contactFigure({size:240,colors:C})", "dock"),
    "seed-field": ("G.seedField({colors:C})", "dock"),
}

def standalone(svg, ground):
    g = GROUNDS[ground]
    svg = re.sub(r"var\(--sb-bg, #[0-9A-Fa-f]{6}\)", g["bg"], svg)
    svg = re.sub(r"var\(--sb-surface, #[0-9A-Fa-f]{6}\)", g["surface"], svg)
    svg = re.sub(r"font-family='[^']*'", "font-family=\"'Geist Mono', ui-monospace, monospace\"", svg)
    assert "var(" not in svg, "unresolved custom property in exported SVG"
    return svg.replace("currentColor", g["fg"]) + "\n"

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")

def prune(folder, keep, pattern):
    stale = sorted(p for p in folder.glob(pattern) if p.name not in keep)
    for p in stale:
        if PRUNE:
            p.unlink()
        print("  stale," + (" deleted:" if PRUNE else " kept (run with --prune to delete):"), p.name)

def main():
    problems = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)

        if "templates" in WHAT:
            out = BRAND / "exports"; out.mkdir(exist_ok=True)
            jobs = [t for t in TEMPLATES if not ONLY or any(o in t[2] for o in ONLY)]
            for f, q, name, scale, cross in jobs:
                pg = b.new_page(viewport={"width": 1700, "height": 1200}, device_scale_factor=scale)
                errs = []
                pg.on("console", lambda m, e=errs: e.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
                pg.on("pageerror", lambda x, e=errs: e.append(f"[pageerror] {x}"))
                pg.on("requestfailed", lambda r, e=errs: e.append(f"[requestfailed] {r.url}"))
                pg.goto((BRAND / "templates" / f).as_uri() + ("?" + q if q else ""))
                pg.wait_for_load_state("networkidle")
                try:
                    pg.wait_for_function("document.body.dataset.ready === '1'", timeout=30000)
                except Exception as e:
                    errs.append(f"[not ready] {str(e).splitlines()[0]}")
                sel = "#sheet" if pg.locator("#sheet").count() else "body"
                box = pg.locator(sel).bounding_box()
                pg.set_viewport_size({"width": max(200, math.ceil(box["width"])), "height": max(200, math.ceil(box["height"]))})
                pg.wait_for_timeout(250)
                over = pg.evaluate("(s) => { const e = document.querySelector(s); return [e.scrollWidth - e.clientWidth, e.scrollHeight - e.clientHeight]; }", sel)
                if over[0] > 0 or over[1] > 0:
                    errs.append(f"[overflow] content overflows the artboard by {over}")
                pg.locator(sel).screenshot(path=str(out / f"{name}.png"))
                found, boxes = type_check(pg, sel, scale, cross)
                im = Image.open(out / f"{name}.png")
                print(f"{name}: {im.size[0]}x{im.size[1]} px, {(out / (name + '.png')).stat().st_size // 1024} KB, {boxes} text boxes, {len(found)} type problems{'' if cross else ' (cross check off: plume ground)'}, {len(errs)} page errors")
                for e in errs + found[:40]:
                    print("  " + e)
                problems += [f"{name}: {x}" for x in errs + found]
                pg.close()
            print("templates", len(jobs))
            if not ONLY:
                prune(out, EXPORTED, "*.png")

        if "posts" in WHAT:
            out = BRAND / "exports"; out.mkdir(exist_ok=True)
            jobs = [p for p in POSTS if not ONLY or any(o in p[0] for o in ONLY)]
            for name, q in jobs:
                pg = b.new_page(viewport={"width": 1500, "height": 1100})
                errs = []
                pg.on("console", lambda m, e=errs: e.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
                pg.on("pageerror", lambda x, e=errs: e.append(f"[pageerror] {x}"))
                pg.on("requestfailed", lambda r, e=errs: e.append(f"[requestfailed] {r.url[:120]}"))
                pg.goto((BRAND / "tools" / "post-image.html").as_uri() + "?" + q)
                try:
                    pg.wait_for_function("document.body.dataset.ready === '1'", timeout=30000)
                    st = pg.evaluate("SBPost.status()")
                    if not st["fits"]:
                        errs.append("[post] the line does not fit")
                    if st["cap"] < 48:
                        errs.append(f"[post] cap height {st['cap']} px is under 48 px")
                    if st["captionPx"] < 11:
                        errs.append(f"[post] small line is {st['captionPx']} px, under 11 px")
                    data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
                    (out / f"{name}.png").write_bytes(base64.b64decode(data.split(",", 1)[1]))
                    im = Image.open(out / f"{name}.png")
                    print(f"{name}: {im.size[0]}x{im.size[1]} px, {(out / (name + '.png')).stat().st_size // 1024} KB, set at {st['size']} px on {st['lines']} lines, cap height {st['cap']} px, {len(errs)} problems")
                except Exception as e:
                    errs.append(f"[not ready] {str(e).splitlines()[0]}")
                    print(f"{name}: failed")
                # the tool is a page of the kit too: its own type obeys the floor
                found, boxes = type_check(pg, "main", 1, True)
                print(f"  tool page: {boxes} text boxes, {len(found)} type problems")
                for e in errs + found[:40]:
                    print("  " + e)
                problems += [f"{name}: {x}" for x in errs + found]
                pg.close()
            print("posts", len(jobs))

        if "logos" in WHAT:
            out = BRAND / "logo" / "png"; out.mkdir(exist_ok=True)
            made = set()
            for svg in sorted((BRAND / "logo" / "svg").glob("*.svg")):
                stem = svg.stem
                if stem == "favicon" or stem.endswith("-square"):
                    continue
                m = re.search(r'viewBox="([-\d. ]+)"', svg.read_text(encoding="utf-8"))
                vx, vy, vw, vh = [float(x) for x in m.group(1).split()]
                assert vx == 0 and vy == 0, f"{stem}: viewBox must start at 0 0"
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
                    ctx.close(); made.add(f"{stem}-{hpx}.png")
            fav = BRAND / "logo" / "svg" / "favicon.svg"
            ctx = b.new_context(viewport={"width": 256, "height": 256}, device_scale_factor=1, color_scheme="light")
            pg = ctx.new_page()
            pg.set_content(f'<body style="margin:0"><img src="{fav.as_uri()}" width="256" height="256" style="display:block">')
            pg.wait_for_load_state("networkidle")
            tmp = out / "favicon-256.png"
            pg.screenshot(path=str(tmp), omit_background=True); ctx.close()
            Image.open(tmp).save(out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
            made |= {"favicon-256.png", "favicon.ico"}
            print("logo png", len(made) - 1, "+ favicon.ico")
            prune(out, made, "*.*")

        if "graphics" in WHAT:
            pg = b.new_page()
            pg.goto((BRAND / "templates" / "leaderboard.html").as_uri())
            pg.wait_for_load_state("networkidle")
            out = BRAND / "graphics"; made = set()
            for name, (expr, sim) in GRAPHICS.items():
                for ground, g in GROUNDS.items():
                    colors = {"fg": g["fg"], "muted": g["muted"], "line": g["line"], "accent": ACCENTS[sim][ground]}
                    svg = pg.evaluate("(C) => { const G = SBGraphics; return " + expr + "; }", colors)
                    write(out / f"{name}-on-{ground}.svg", standalone(svg, ground)); made.add(f"{name}-on-{ground}.svg")
            for t in range(1, 7):
                svg = pg.evaluate("([t, C]) => SBGraphics.tierDots(t, {colors:C})", [t, {"fg": GROUNDS["film"]["fg"], "muted": GROUNDS["film"]["muted"]}])
                write(out / f"tier-{t}-dots.svg", standalone(svg, "film")); made.add(f"tier-{t}-dots.svg")
            icons = pg.evaluate("Object.keys(SBGraphics.ICONS).map(k => [k, SBGraphics.icon(k)])")
            for k, svg in icons:
                write(out / "icons" / f"{k}.svg", svg.replace(' class="sb-icon"', "") + "\n")
            print("graphics svg", len(made) + len(icons))
            prune(out, made, "*.svg")
        b.close()
    print("problems", len(problems))
    return 1 if problems else 0

sys.exit(main())
