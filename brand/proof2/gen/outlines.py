"""Extract Geist outlines at fixed weights as SVG path data, so the wordmark is true vector
and its cuts can be placed by hand. Writes data/geist-outlines.js."""
import json, pathlib, sys, io
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
R = pathlib.Path(r'D:\dev\spacebench')
chars = sorted(set('SpaceBench Dock Landing SPACEBENCH DOCK LANDING 0123456789.lIbhn'))
out = {}
for wght in (600, 700, 800):
    f = TTFont(str(R / 'brand' / 'fonts' / 'Geist-Variable.woff2'))
    f = instantiateVariableFont(f, {'wght': wght})
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
    g = {}
    for ch in chars:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs); gs[name].draw(pen)
        bp = BoundsPen(gs); gs[name].draw(bp)
        g[ch] = {'adv': hmtx[name][0], 'd': pen.getCommands(), 'box': [round(v) for v in bp.bounds] if bp.bounds else None}
    kern = {}
    try:
        import uharfbuzz as hb
        buf = io.BytesIO(); f.save(buf)
        face = hb.Face(buf.getvalue()); font = hb.Font(face)
        for word in ('SpaceBench', 'Dock', 'Landing', 'SPACEBENCH', 'DOCK', 'LANDING'):
            b = hb.Buffer(); b.add_str(word); b.guess_segment_properties(); hb.shape(font, b, {'kern': True, 'liga': False})
            kern[word] = [p.x_advance for p in b.glyph_positions]
    except Exception as e:
        kern = {'error': str(e)}
    out[str(wght)] = {'glyphs': g, 'shaped': kern}
    os2 = f['OS/2']
    out['metrics'] = {'upm': f['head'].unitsPerEm, 'cap': os2.sCapHeight, 'x': os2.sxHeight, 'asc': f['hhea'].ascent, 'desc': f['hhea'].descent}
o = R / 'brand' / 'proof2' / 'data'
(o / 'geist-outlines.js').write_text('window.SB_GEIST = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print(out['metrics'], 'shaped 800:', out['800']['shaped'])
for ch in 'pcaeBlIDdgknoi':
    print(ch, out['800']['glyphs'][ch]['adv'], out['800']['glyphs'][ch]['box'])
print((o / 'geist-outlines.js').stat().st_size, 'bytes')
