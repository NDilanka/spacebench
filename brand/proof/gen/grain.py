import numpy as np, pathlib
from PIL import Image
from fontTools.ttLib import TTFont
out = pathlib.Path(r'D:\dev\spacebench\brand\proof\img'); out.mkdir(parents=True, exist_ok=True)
rs = np.random.RandomState(20261118)
n = rs.normal(128, 34, (512, 512)).clip(0, 255).astype(np.uint8)
Image.fromarray(n, 'L').save(out / 'grain.png', optimize=True)
for name in ('ReenieBeanie.ttf', 'NothingYouCouldDo.ttf', 'Caveat.ttf'):
    t = TTFont(str(pathlib.Path(r'D:\dev\spacebench\brand\proof\fonts') / name))
    print(name, t['name'].getDebugName(1), 'glyphs', len(t.getGlyphOrder()), '|', (t['name'].getDebugName(13) or '')[:70])
print('grain ok', (out / 'grain.png').stat().st_size)
