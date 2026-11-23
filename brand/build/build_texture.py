"""The plume field: the brand's one texture, made from simulator output.

Source: the core's scripted gate run, seed 1, 200,000 ticks (28,572 thruster slots of 0.035 s).
The picture is the sky around the capsule. Every time a thruster fired, the patch of sky its
exhaust pointed at is darkened a little, using the attitude the capsule had at that moment. The
whole run is one long exposure, drawn on an equal-area map of the sky and blurred. The fibre grain
is random, seeded with the run's final hash. It is a picture of the run, not a measurement, and
no physical plume model is used.

Writes brand/textures/*.jpg and textures/textures.json.
Needs: numpy, scipy, pillow, cargo (builds build/gen/sbdump into .work/sbdump).
usage: py build/build_texture.py [preview]
"""
import json, pathlib, subprocess, sys
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

BRAND = pathlib.Path(__file__).resolve().parent.parent
REPO = BRAND.parent
OUT = BRAND / "textures"; OUT.mkdir(exist_ok=True)
SCRATCH = REPO / ".work" / "sbdump"; SCRATCH.mkdir(parents=True, exist_ok=True)
SEED, TICKS = 1, 200000

def run_dump():
    b = subprocess.run(["cargo", "build", "--release", "--offline", "--target-dir", str(SCRATCH / "target")],
                       cwd=str(BRAND / "build" / "gen" / "sbdump"), capture_output=True, text=True)
    if b.returncode: sys.exit(b.stderr[-3000:])
    d = subprocess.run([str(SCRATCH / "target" / "release" / "sbdump.exe"), str(SEED), str(TICKS), "7", "0"], capture_output=True, text=True)
    if d.returncode: sys.exit(d.stderr)
    checks = [l for l in d.stderr.splitlines() if l.startswith("check")]
    assert len(checks) == 5 and all(l.endswith("MATCH") for l in checks), checks
    rows = [json.loads(l) for l in d.stdout.splitlines()][1:]          # row 0 is the state before any step
    return rows, checks

rows, checks = run_dump()
P = np.array([r["p"] for r in rows]); Q = np.array([r["q"] for r in rows]); MASK = np.array([r["m"] for r in rows], dtype=np.int64)
FINAL_HASH = rows[-1]["h"]
veh = json.loads((BRAND / "data" / "vehicle.js").read_text().split("=", 1)[1].rstrip().rstrip(";"))
TH = veh["thrusters"]
print("slots", len(rows), "final hash", FINAL_HASH, "firings", int(sum(bin(m).count("1") for m in MASK)))

# body to inertial rotation for every slot (Hamilton, scalar first)
w, x, y, z = Q.T
ROT = np.stack([np.stack([1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)], 1),
                np.stack([2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], 1),
                np.stack([2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)], 1)], 1)

# picture choices, not physics
PUFFS = 14          # points laid per firing
SPREAD = (0.02, 0.12)   # angular spread of a point about the exhaust direction, radians, smallest and largest
rng = np.random.default_rng(int(FINAL_HASH, 16))
dirs = []
for i, t in enumerate(TH):
    sel = (MASK >> i) & 1 == 1
    e = -(ROT[sel] @ np.array(t["dir"]))                     # exhaust direction in the inertial frame
    for _ in range(PUFFS):
        sg = SPREAD[0] + (SPREAD[1] - SPREAD[0]) * rng.random(len(e))[:, None] ** 2
        d = e + rng.normal(0, 1, e.shape) * sg
        dirs.append(d / np.linalg.norm(d, axis=1, keepdims=True))
dirs = np.concatenate(dirs)
# Lambert equal-area map of the whole sky, centred on the direction the nose pointed at tick 0. The sky is a disc of radius 2.
kk = np.sqrt(2.0 / np.maximum(1e-9, 1.0 + dirs[:, 0]))
uv = np.stack([kk * dirs[:, 1], kk * dirs[:, 2]], 1)
print("points", len(uv), "turned through", round(float(np.degrees(np.sum(np.linalg.norm(np.array([r["w"] for r in rows]), axis=1)) * 7 * 0.005)), 0), "deg in all")

FILM, INK = np.array([0xA4, 0xAA, 0xB3], float), np.array([0x0B, 0x0E, 0x16], float)

def render(name, cx, cy, width, W, H, ground="film", quality=88):
    """A window of the sky map. cx, cy and width are in map units (the whole sky is 4 wide), output W x H px."""
    ppu = W / width; pad = int(0.2 * ppu) + 8
    gx = (uv[:, 0] - cx) * ppu + W / 2 + pad; gy = (uv[:, 1] - cy) * ppu + H / 2 + pad
    hist, _, _ = np.histogram2d(gy, gx, bins=[H + 2 * pad, W + 2 * pad], range=[[0, H + 2 * pad], [0, W + 2 * pad]])
    hist *= ppu * ppu / 1e6                                             # points per map unit squared, in millions
    s = sum(wt * ndi.gaussian_filter(hist, sm * ppu) for sm, wt in ((0.015, 0.16), (0.05, 0.40), (0.14, 0.44)))
    # drift: push the picture sideways by a smooth random field, so edges turn wispy
    g = np.random.default_rng(int(FINAL_HASH, 16) ^ (W * 7919 + H))
    dx, dy = (ndi.gaussian_filter(g.normal(0, 1, s.shape), 0.06 * ppu) for _ in range(2))
    dx *= 0.035 * ppu / dx.std(); dy *= 0.035 * ppu / dy.std()
    yy, xx = np.mgrid[0:s.shape[0], 0:s.shape[1]].astype(np.float32)
    s = ndi.map_coordinates(s, [yy + dy, xx + dx], order=1, mode="nearest")[pad:pad + H, pad:pad + W]
    t = np.clip((s - LO) / (HI - LO), 0, 1)
    smoke = t ** 1.15
    # fibre grain: short vertical strokes, strongest inside the smoke
    fib = ndi.gaussian_filter(g.normal(0, 1, (H, W)), (0.004 * H + 2.0, 0.5)); fib /= fib.std()
    fine = g.normal(0, 1, (H, W))
    k = np.clip(smoke * 0.92 + fib * (0.018 + 0.17 * smoke ** 0.6) + fine * 0.012, 0, 1)
    a, b = (FILM, INK) if ground == "film" else (INK, np.array([0x8E, 0x95, 0xA2], float))
    img = a + (b - a) * k[:, :, None]
    Image.fromarray(np.clip(img + 0.5, 0, 255).astype(np.uint8)).save(OUT / f"{name}.jpg", quality=quality, optimize=True)
    return {"file": f"{name}.jpg", "px": [W, H], "window": [round(width, 2), round(width * H / W, 2)], "centre": [cx, cy], "ground": ground,
            "dark_share": round(float((smoke > 0.5).mean()), 3)}

# one pair of levels for every picture, so darkness means the same thing in each: taken from a coarse map of the whole sky
coarse, _, _ = np.histogram2d(uv[:, 1], uv[:, 0], bins=[400, 400], range=[[-2, 2], [-2, 2]])
coarse = ndi.gaussian_filter(coarse * 1e4 / 1e6, 3.0)
inside = np.hypot(*np.mgrid[-2:2:400j, -2:2:400j]) < 1.9
LO, HI = (float(np.percentile(coarse[inside], q)) for q in (40, 98.6))
print("levels", round(LO, 4), round(HI, 4))
preview = len(sys.argv) > 1 and sys.argv[1] == "preview"
k = 0.4 if preview else 1.0
JOBS = [  # name, centre x, centre y, width in map units, px, ground
    ("plume-banner-film", -0.75, 0.15, 3.0, 3000, 1000, "film"),
    ("plume-banner-ink", -0.75, 0.15, 3.0, 3000, 1000, "ink"),
    ("plume-square-film", 0.30, 0.72, 1.3, 1600, 1600, "film"),
    ("plume-square-ink", 0.30, 0.72, 1.3, 1600, 1600, "ink"),
    ("plume-sheet-film", -0.75, -0.35, 2.1, 2400, 1600, "film"),
    ("plume-sheet-ink", -0.75, -0.35, 2.1, 2400, 1600, "ink"),
]
meta = [render(n if not preview else "_preview-" + n, cx, cy, wm, int(W * k), int(H * k), gr) for n, cx, cy, wm, W, H, gr in JOBS]
for m in meta: print(m, (OUT / m["file"]).stat().st_size // 1024, "KB")
if not preview:
    (OUT / "textures.json").write_text(json.dumps({
        "source": "crates/core scripted_run, seed 1, 200000 ticks, replayed by build/gen/sbdump", "checks": checks,
        "slots": len(rows), "final_hash": FINAL_HASH, "points": int(len(uv)),
        "picture_choices": {"points_per_firing": PUFFS, "spread_rad": SPREAD, "levels": [LO, HI], "map": "Lambert equal-area, centred on the nose direction at tick 0", "grain_seed": "final hash"},
        "note": "A picture of the run, not a measurement. No physical plume model.", "files": meta}, indent=2) + "\n")
