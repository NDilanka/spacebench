import pathlib
from PIL import Image
here = pathlib.Path(r'D:\dev\spacebench\brand\proof\out')
names = ['p02-cover', 'p01-mark', 'p03-plate', 'p04-bullseye', 'p06-collision', 'p05-flight', 'p07-sensor', 'p08-objects', 'p09-pilot']
H, gap, pad = 620, 24, 40
ims = []
for n in names:
    im = Image.open(here / f'{n}.png').convert('RGB'); w = round(im.width * H / im.height); ims.append(im.resize((w, H), Image.LANCZOS))
rows = [ims[0:3], ims[3:6], ims[6:9]]
W = max(sum(i.width for i in r) + gap * (len(r) - 1) for r in rows) + pad * 2
sheet = Image.new('RGB', (W, pad * 2 + H * 3 + gap * 2), (70, 74, 84))
y = pad
for r in rows:
    x = (W - (sum(i.width for i in r) + gap * (len(r) - 1))) // 2
    for i in r: sheet.paste(i, (x, y)); x += i.width + gap
    y += H + gap
sheet.save(here / 'index.jpg', quality=88); print('ok', sheet.size)
