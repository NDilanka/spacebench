"""Orbital sunrise. A drawn Earth limb at the terminator: one thin lit line, a halo, an airglow layer,
a hot point where the sun is about to clear the horizon. No photograph is used.
usage: limb.py <out> <W> <H> <cx> <cy> <R> <tint: mono|violet|orange> [hot_deg] [seed]"""
import sys, numpy as np
from PIL import Image
out, W, H, cx, cy, R = sys.argv[1], *map(float, sys.argv[2:7])
W, H = int(W), int(H)
tint = sys.argv[7] if len(sys.argv) > 7 else 'mono'
hot = float(sys.argv[8]) if len(sys.argv) > 8 else -90.0
seed = int(sys.argv[9]) if len(sys.argv) > 9 else 7
T = {
    'mono':   dict(bg=(9, 12, 19),  halo=(74, 104, 190), line=(236, 242, 255), earth=(13, 18, 30)),
    'violet': dict(bg=(9, 10, 20),  halo=(107, 59, 255), line=(232, 224, 255), earth=(15, 13, 34)),
    'orange': dict(bg=(14, 10, 9),  halo=(255, 90, 10),  line=(255, 236, 214), earth=(26, 14, 9)),
}[tint]
rs = np.random.RandomState(seed)
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
dx, dy = x - cx, y - cy
dist = np.hypot(dx, dy)
d = dist - R                                   # > 0 in space
ang = np.degrees(np.arctan2(dy, dx))
da = (ang - hot + 180) % 360 - 180             # degrees along the limb from the hot point
arc = da * np.pi / 180 * R                     # the same, in pixels
# brightness along the limb: a sharp core at the hot point and a long tail to one side
A = 0.10 + 0.9 * np.exp(-(arc / 260) ** 2) + 0.45 * np.exp(-np.clip(arc, 0, None) / 900) * (arc > 0) + 0.45 * np.exp(-(arc / 620) ** 2)
A = np.clip(A, 0, 1.6)
space = d >= 0
img = np.zeros((H, W, 3), np.float32)
bg, halo, line, earth = [np.array(T[k], np.float32) / 255 for k in ('bg', 'halo', 'line', 'earth')]
img[:] = bg
# earth body: a little lighter than space, lifted near the limb
inner = np.exp(np.clip(d, None, 0) / 120)
img = np.where(space[..., None], img, earth + (halo * 0.16) * (inner * A)[..., None])
# halo outside
dd = np.clip(d, 0, None)
h_wide = np.exp(-dd / 150) * 0.30 + np.exp(-dd / 38) * 0.55
img += np.where(space[..., None], (halo * (h_wide * A)[..., None]), 0)
# airglow: a faint second line above the limb
img += (halo * 0.5 + line * 0.5) * (np.exp(-((d - 17) / 2.6) ** 2) * 0.16 * A)[..., None]
# the lit line itself
core = np.exp(-(d / 1.7) ** 2) + 0.5 * np.exp(-(np.abs(d) / 5.0))
img += line * (core * np.clip(A, 0, 1.2))[..., None]
# hot point bloom and a short flare along the limb
hx, hy = cx + R * np.cos(np.radians(hot)), cy + R * np.sin(np.radians(hot))
rr = np.hypot(x - hx, y - hy)
img += line * (np.exp(-(rr / 9) ** 2) * 1.3 + np.exp(-rr / 46) * 0.42 + np.exp(-rr / 190) * 0.13)[..., None]
img += halo * (np.exp(-rr / 360) * 0.22)[..., None] * space[..., None]
flare = np.exp(-(np.abs(arc) / 420)) * np.exp(-(d / 3.2) ** 2) * 0.9
img += line * flare[..., None]
# stars: sparse, only in clear space
n = int(W * H / 5200)
sx, sy = rs.randint(0, W, n), rs.randint(0, H, n)
sb = rs.rand(n) ** 5 * 0.9 + 0.06
ok = (d[sy, sx] > 60)
for px, py, b in zip(sx[ok], sy[ok], sb[ok]):
    img[py, px] += b * (1 - np.clip(h_wide[py, px] * A[py, px] * 3, 0, 1))
    if b > 0.55 and 0 < px < W - 1 and 0 < py < H - 1:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)): img[py + oy, px + ox] += b * 0.25
# film grain, stronger in the mid tones
lum = img.mean(-1, keepdims=True)
g = rs.normal(0, 1, (H, W, 1)).astype(np.float32)
img += g * (0.012 + 0.05 * np.sqrt(np.clip(lum, 0, 1)) * (1 - np.clip(lum, 0, 1)))
img = np.clip(img, 0, 1) ** (1 / 1.05)
Image.fromarray((img * 255 + 0.5).astype(np.uint8)).save(out, quality=90)
print('ok', out, f'hot point at ({hx:.1f}, {hy:.1f})')
