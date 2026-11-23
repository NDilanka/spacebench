"""The matched board: a human pilot seen from behind, at the same display the models read.
Drawn from simple shapes, then put through an ordered dither. No photograph is used."""
import numpy as np, pathlib, math
from PIL import Image, ImageDraw, ImageFilter
out = pathlib.Path(r'D:\dev\spacebench\brand\proof\img\pilot.png')
W, H, C = 1600, 1000, 3
def blur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255
def layer(): im = Image.new('L', (W, H), 0); return im, ImageDraw.Draw(im)
# display
im, d = layer()
dx0, dy0, dx1, dy1 = 330, 70, 1270, 650
cx, cy = 800, 350
d.rounded_rectangle((dx0, dy0, dx1, dy1), 18, fill=38)
for r, w in ((255, 3), (170, 3), (85, 3)): d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=235, width=w)
for k in range(-270, 271, 22):
    d.line((cx + k, cy, cx + k + 10, cy), fill=150, width=2); d.line((cx, cy + k, cx, cy + k + 10), fill=150, width=2)
pts, th = [], 0.6
for i in range(140):
    u = i / 139; rr = 250 * (1 - u) ** 1.35 + 14 * u; th += 0.085 + 0.05 * math.sin(i * 0.4)
    pts.append((cx + rr * math.cos(th) * 1.0, cy + rr * math.sin(th)))
d.line(pts, fill=255, width=5, joint='curve')
for p in pts[::6]: d.ellipse((p[0] - 7, p[1] - 7, p[0] + 7, p[1] + 7), fill=255)
for col, x in ((0, dx0 + 34), (1, dx1 - 214)):          # readout columns
    for j in range(9):
        y = dy0 + 44 + j * 58
        d.rectangle((x, y, x + 70, y + 8), fill=120); d.rectangle((x, y + 18, x + 100 + (j * 37 + col * 53) % 80, y + 40), fill=230)
disp = np.asarray(im, np.float32) / 255
core, d2 = layer(); d2.ellipse((cx - 85, cy - 85, cx + 85, cy + 85), fill=255)
core = np.asarray(core, np.float32) / 255
# room: glow from the display, a console edge
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
room = 0.004 + 0.20 * blur(disp * 2.2, 70) + 0.05 * blur(disp * 2.2, 200)
side = np.clip((x - 330) / 60, 0, 1) * np.clip((1270 - x) / 60, 0, 1) * np.clip((y - 40) / 40, 0, 1) * np.clip((945 - y) / 40, 0, 1)
room *= 0.03 + 0.97 * side
con, d3 = layer()
d3.polygon(((120, 800), (1480, 800), (1600, 900), (1600, 1000), (0, 1000), (0, 900)), fill=70)
d3.line((120, 800, 1480, 800), fill=255, width=4)
for i in range(22):
    d3.rounded_rectangle((180 + i * 58, 832, 180 + i * 58 + 36, 850), 4, fill=200 if i in (3, 4, 11, 17) else 110)
con = np.asarray(con, np.float32) / 255
img = np.maximum(room, disp * 0.92 + room * 0.3)
img = np.where(con > 0, con * (0.2 + 0.5 * np.clip(1 - (y - 800) / 200, 0, 1)) * (0.25 + 0.75 * side), img)
# pilot
pm, d4 = layer()
d4.rounded_rectangle((585, 700, 1015, 1040), 60, fill=255)                              # seat back
d4.polygon(((500, 1000), (540, 800), (600, 705), (700, 660), (900, 660), (1000, 705), (1060, 800), (1100, 1000)), fill=255)  # shoulders
d4.rounded_rectangle((752, 590, 848, 690), 30, fill=255)                                # neck
d4.ellipse((720, 420, 880, 618), fill=255)                                              # head
d4.arc((704, 398, 896, 640), 180, 360, fill=255, width=16)                              # headset band
d4.rounded_rectangle((694, 494, 728, 572), 12, fill=255); d4.rounded_rectangle((872, 494, 906, 572), 12, fill=255)
d4.polygon(((1060, 800), (1168, 772), (1206, 812), (1330, 1000), (1100, 1000)), fill=255)   # forearm
d4.ellipse((1150, 742, 1232, 818), fill=255)                                            # hand
d4.rounded_rectangle((1180, 690, 1200, 770), 8, fill=255); d4.ellipse((1170, 672, 1210, 708), fill=255)   # hand controller
pm = pm.transform((W, H), Image.AFFINE, (0.8, 0, 160, 0, 0.8, -40), Image.BILINEAR)
M = np.asarray(pm.filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
rim = np.clip((1 - blur(M, 15)) * 2.6, 0, 1) * M
lit = blur(disp * 2.0, 140)                                                              # rim is stronger where the display is near
body = 0.0 + rim * (0.6 + 2.6 * lit)
img = img * (1 - M) + body * M
img = np.clip(img, 0, 1) ** 0.8
img *= np.clip((950 - y) / 50, 0, 1)
# ordered dither on a 3 px cell
S = 3
small = np.asarray(Image.fromarray((img * 255).astype(np.uint8)).resize((W // S + 1, H // S + 1), Image.LANCZOS), np.float32) / 255
csmall = np.asarray(Image.fromarray((core * (1 - M) * 255).astype(np.uint8)).resize((W // S + 1, H // S + 1), Image.LANCZOS), np.float32) / 255
B = np.array([[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
              [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]], np.float32)
h, w = small.shape
thr = (np.tile(B, (h // 8 + 1, w // 8 + 1))[:h, :w] + 0.5) / 64
on = small > thr
rgb = np.zeros((h, w, 3), np.uint8); rgb[:] = (9, 12, 19)
rgb[on] = (238, 240, 244)
rgb[on & (csmall > 0.5)] = (142, 107, 255)
rgb[(~on) & (csmall > 0.5)] = (45, 19, 122)
Image.fromarray(rgb).resize((w * S, h * S), Image.NEAREST).crop((0, 0, W, H)).save(out, optimize=True)
print('ok', out, out.stat().st_size)
