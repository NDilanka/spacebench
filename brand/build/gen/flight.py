"""Build and run the dumper in build/gen/sbdump, then turn its JSON lines into data/flight1.js.
Every number here is simulator output: the core's scripted run for seed 1, replayed through the
core's public API and checked against scripted_run's own hash at ticks 0, 1, 7, 1000 and 200000.
Build output and the raw dump go to .work/sbdump (ignored by git), not into brand/."""
import json, pathlib, subprocess, sys
R = pathlib.Path(__file__).resolve().parents[3]
SRC = pathlib.Path(__file__).resolve().parent / 'sbdump'
D = R / '.work' / 'sbdump'; D.mkdir(parents=True, exist_ok=True)
b = subprocess.run(['cargo', 'build', '--release', '--offline', '--target-dir', str(D / 'target')], cwd=str(SRC), capture_output=True, text=True)
if b.returncode: print(b.stderr[-3000:]); sys.exit(1)
EXE = str(D / 'target' / 'release' / 'sbdump.exe')
d = subprocess.run([EXE, '1', '200000', '40', '1000'], capture_output=True, text=True)
assert d.returncode == 0, d.stderr
(D / 'seed1.jsonl').write_text(d.stdout); (D / 'seed1.err').write_text(d.stderr)
rows = [json.loads(l) for l in (D / 'seed1.jsonl').read_text().splitlines()]
by = {r['t']: r for r in rows}
DT, TICKS = 0.005, 200000
first = [by[t] for t in range(0, 1001)]
slots = [by[7 * k + 1]['m'] for k in range(0, 143)]
longs = [by[t] for t in range(0, TICKS + 1, 40)]
def rnd(a, n): return [round(x, n) for x in a]
# totals over the whole run, from a second dump printed at every slot boundary
p = subprocess.run([EXE, '1', str(TICKS), '7', '0'], capture_output=True, text=True)
assert p.returncode == 0, p.stderr
fire_ticks = [0] * 16; all_slots = 0
for l in p.stdout.splitlines():
    r = json.loads(l)
    if r['t'] == 0: continue
    n = 7 if r['t'] % 7 == 0 else r['t'] % 7
    all_slots += 1
    for i in range(16):
        if r['m'] >> i & 1: fire_ticks[i] += n
assert sum(1 for _ in p.stdout.splitlines()) - 1 == all_slots
out = {
    'seed': 1, 'dt': DT, 'ticks': TICKS, 'seconds': TICKS * DT,
    'first': {'ticks': 1000, 'slots': slots,
              'q': [rnd(r['q'], 6) for r in first], 'w': [rnd(r['w'], 7) for r in first], 'p': [rnd(r['p'], 5) for r in first],
              'h': [r['h'] for r in first]},
    'long': {'every': 40, 'p': [rnd(r['p'], 3) for r in longs], 'q': [rnd(r['q'], 5) for r in longs], 'w': [rnd(r['w'], 6) for r in longs], 'v': [rnd(r['v'], 5) for r in longs]},
    'end': by[TICKS],
    'totals': {'fire_seconds': [round(t * DT, 3) for t in fire_ticks], 'slots': all_slots},
    'checks': [l for l in (D / 'seed1.err').read_text().splitlines() if l.startswith('check')],
}
o = R / 'brand' / 'data'; o.mkdir(parents=True, exist_ok=True)
(o / 'flight1.js').write_text('window.SB_FLIGHT = ' + json.dumps(out, separators=(',', ':')) + ';\n')
h = json.loads((o / 'hashes.json').read_text())
assert h['seeds']['1']['native'] == [r['h'] for r in first[:h['ticks'] + 1]], 'replay hashes differ from the gate tools'
(o / 'hashes.js').write_text('window.SB_HASHES = ' + json.dumps(h, separators=(',', ':')) + ';\n')
print('flight1.js', (o / 'flight1.js').stat().st_size, 'bytes; slots in first 1000 ticks', len(slots), '; all slots', all_slots)
print('fire seconds per thruster', out['totals']['fire_seconds'], 'sum', round(sum(out['totals']['fire_seconds']), 2))
print('replay hashes for ticks 0..%d equal the gate tools: True' % h['ticks'])
import math
e = by[TICKS]; print('end |p| m', round(math.dist(e['p'], [0, 0, 0]), 2), '|v|', round(math.hypot(*e['v']), 4), '|w| deg/s', round(math.degrees(math.hypot(*e['w'])), 3))
print('max |w| deg/s over run', round(max(math.degrees(math.hypot(*r['w'])) for r in longs), 3))
