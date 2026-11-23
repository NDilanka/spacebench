"""Convert a Hershey .jhf font to stroke data for the page. Roman Simplex, one line per stroke,
as a pen plotter draws it."""
import json, pathlib, sys
R = pathlib.Path(r'D:\dev\spacebench')
name = sys.argv[1] if len(sys.argv) > 1 else 'futural'
raw = (R / '.work' / 'hershey' / (name + '.jhf')).read_text().split('\n')
glyphs, i = [], 0
while i < len(raw):
    l = raw[i]; i += 1
    if len(l) < 8: continue
    n = int(l[5:8]); body = l[8:]
    while len(body) < n * 2 and i < len(raw): body += raw[i]; i += 1
    left, right = ord(body[0]) - 82, ord(body[1]) - 82
    strokes, cur = [], []
    for k in range(1, n):
        a, b = body[2 * k], body[2 * k + 1]
        if a == ' ' and b == 'R':
            if cur: strokes.append(cur); cur = []
        else: cur.append([ord(a) - 82 - left, ord(b) - 82])
    if cur: strokes.append(cur)
    glyphs.append({'w': right - left, 's': strokes})
assert len(glyphs) >= 95, len(glyphs)
out = {chr(32 + k): g for k, g in enumerate(glyphs[:95])}
o = R / 'brand' / 'proof2' / 'data'; o.mkdir(parents=True, exist_ok=True)
(o / 'hershey.js').write_text('/* Hershey Roman Simplex stroke data (%s.jhf). See fonts/Hershey-ACKNOWLEDGEMENT.txt. */\nwindow.SB_HERSHEY = ' % name + json.dumps(out, separators=(',', ':')) + ';\n')
ys = [p[1] for g in out.values() for s in g['s'] for p in s]
print(name, len(out), 'glyphs; y range', min(ys), max(ys), '; A:', out['A'], '; cap y range', min(p[1] for s in out['H']['s'] for p in s), max(p[1] for s in out['H']['s'] for p in s))
