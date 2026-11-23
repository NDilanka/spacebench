"""All six round-two pieces on one sheet: out/index.jpg."""
import pathlib
from PIL import Image
here = pathlib.Path(__file__).resolve().parent.parent / 'out'
names = ['r2-01-mark', 'r2-02-circle', 'r2-03-contact', 'r2-04-bits', 'r2-05-sixteen', 'r2-06-gate-run']
H, gap, pad = 900, 28, 36
ims = []
for n in names:
    im = Image.open(here / (n + '.png')).convert('RGB')
    ims.append(im.resize((round(im.width * H / im.height), H), Image.LANCZOS))
rows = [ims[:3], ims[3:]]
W = max(sum(i.width for i in r) + gap * (len(r) - 1) for r in rows) + 2 * pad
sheet = Image.new('RGB', (W, 2 * H + gap + 2 * pad), (201, 204, 212))
for k, r in enumerate(rows):
    x = (W - (sum(i.width for i in r) + gap * (len(r) - 1))) // 2
    for i in r:
        sheet.paste(i, (x, pad + k * (H + gap))); x += i.width + gap
sheet.save(here / 'index.jpg', quality=86)
print('index.jpg', sheet.size, (here / 'index.jpg').stat().st_size // 1024, 'KB')
