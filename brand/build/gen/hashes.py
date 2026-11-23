"""Collect chained hashes per tick from the two existing gate tools (no repo change):
native_hash.exe and scripts/wasm_hash.mjs. Writes brand/data/hashes.json."""
import subprocess, json, pathlib, sys
from concurrent.futures import ThreadPoolExecutor
R = pathlib.Path(__file__).resolve().parents[3]
NAT = str(R / 'target' / 'release' / 'native_hash.exe')
WASM = str(R / 'target' / 'wasm32-unknown-unknown' / 'release' / 'spacebench_wasm.wasm')
MJS = str(R / 'scripts' / 'wasm_hash.mjs')
N = int(sys.argv[1]) if len(sys.argv) > 1 else 160
seeds = [1, 2, 3735928559]
def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    out = p.stdout.strip()
    assert p.returncode == 0 and len(out) == 16, (cmd, p.returncode, out, p.stderr)
    return out
def nat(a): return run([NAT, str(a[0]), str(a[1])])
def wasm(a): return run(['node', MJS, WASM, str(a[0]), str(a[1])])
res = {}
with ThreadPoolExecutor(8) as ex:
    for s in seeds:
        jobs = [(s, t) for t in range(N + 1)]
        n = list(ex.map(nat, jobs)); w = list(ex.map(wasm, jobs))
        res[str(s)] = {'native': n, 'wasm': w, 'equal_ticks': sum(a == b for a, b in zip(n, w))}
        print('seed', s, 'ticks 0..%d' % N, 'equal', res[str(s)]['equal_ticks'], 'of', N + 1, 'tick0', n[0], 'tick1', n[1], 'tick7', n[7])
# the gate's own tick counts
gate = {}
for s in seeds:
    gate[str(s)] = {str(t): {'native': nat((s, t)), 'wasm': wasm((s, t))} for t in (0, 1, 7, 1000, 200000)}
    print('gate seed', s, gate[str(s)])
out = R / 'brand' / 'data'; out.mkdir(parents=True, exist_ok=True)
(out / 'hashes.json').write_text(json.dumps({'ticks': N, 'seeds': res, 'gate': gate,
    'source': 'target/release/native_hash.exe and scripts/wasm_hash.mjs on target/wasm32-unknown-unknown/release/spacebench_wasm.wasm, run 2026-11-18'}))
print('written')
