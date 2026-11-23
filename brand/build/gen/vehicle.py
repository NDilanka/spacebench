"""Read the thruster table and the vehicle constants straight out of crates/core/src/lib.rs
and write data/vehicle.js, so every drawing uses the simulator's own numbers."""
import re, json, pathlib
R = pathlib.Path(__file__).resolve().parents[3]
src = (R / 'crates' / 'core' / 'src' / 'lib.rs').read_text().splitlines()
th = []
for n, l in enumerate(src, 1):
    m = re.match(r'\s*placeholder_thruster\(\[([^\]]+)\], \[([^\]]+)\]\),', l)
    if m: th.append({'pos': [float(x) for x in m.group(1).split(',')], 'dir': [float(x) for x in m.group(2).split(',')], 'line': n})
def const(name):
    for n, l in enumerate(src, 1):
        m = re.match(r'pub const %s: f64 = ([0-9_.]+);' % name, l)
        if m: return float(m.group(1).replace('_', '')), n
    raise SystemExit('missing ' + name)
force, lf = const('THRUSTER_FORCE_N'); mass, lm = const('ESTIMATE_MASS_KG'); dt, ld = const('DT')
i0 = next(n for n, l in enumerate(src) if 'pub const ESTIMATE_INERTIA_KG_M2' in l)
inertia = [[float(x.replace('_', '')) for x in re.findall(r'[0-9_]+\.[0-9]+', src[i0 + 1 + k])] for k in range(3)]
assert len(th) == 16 and all(len(r) == 3 for r in inertia)
out = {'thrusters': th, 'force_n': force, 'mass_kg': mass, 'inertia': inertia, 'dt': dt,
       'source': 'crates/core/src/lib.rs', 'lines': {'thrusters': [th[0]['line'], th[-1]['line']], 'force': lf, 'mass': lm, 'dt': ld, 'inertia': i0 + 1}}
o = R / 'brand' / 'data'; o.mkdir(parents=True, exist_ok=True)
(o / 'vehicle.js').write_text('window.SB_VEHICLE = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print(json.dumps(out)[:900])
