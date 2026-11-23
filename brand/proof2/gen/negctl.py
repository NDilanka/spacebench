"""Rerun of the lead's negative control (ORDERS.md, 2026-11-17) in a scratch copy under .work.
The copy of the core differs in exactly what the lead changed: `extern crate std;` and, in `expq`,
libm::sin(half) -> f64::sin(half) and libm::cos(half) -> f64::cos(half). Native only.
Prints the chained hash per tick, and checks the result against what ORDERS.md records."""
import pathlib, subprocess, json, sys
R = pathlib.Path(r'D:\dev\spacebench')
N = R / '.work' / 'negctl'
(N / 'core' / 'src').mkdir(parents=True, exist_ok=True); (N / 'run' / 'src').mkdir(parents=True, exist_ok=True)
src = (R / 'crates' / 'core' / 'src' / 'lib.rs').read_text()
a = '#![no_std]\n#![forbid(unsafe_code)]\n'
s1, c1 = '        libm::sin(half) / theta', '    [libm::cos(half), s * p[0], s * p[1], s * p[2]]'
assert src.count(a) == 1 and src.count(s1) == 1 and src.count(c1) == 1
src = src.replace(a, a + '\nextern crate std;\n').replace(s1, s1.replace('libm::sin', 'f64::sin')).replace(c1, c1.replace('libm::cos', 'f64::cos'))
(N / 'core' / 'src' / 'lib.rs').write_text(src)
(N / 'core' / 'Cargo.toml').write_text('[package]\nname = "spacebench-core"\nversion = "0.0.0"\nedition = "2024"\npublish = false\n\n[dependencies]\nlibm = { version = "=0.2.16", default-features = false }\n')
(N / 'run' / 'Cargo.toml').write_text('[package]\nname = "negrun"\nversion = "0.0.0"\nedition = "2024"\npublish = false\n\n[workspace]\n\n[dependencies]\nspacebench-core = { path = "../core" }\n')
(N / 'run' / 'src' / 'main.rs').write_text('''fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    let seed: u32 = a[0].parse().expect("seed");
    for t in a[1..].iter() {
        if let Some((lo, hi)) = t.split_once("..") {
            for k in lo.parse::<u32>().expect("lo")..=hi.parse::<u32>().expect("hi") { println!("{} {:016x}", k, spacebench_core::scripted_run(seed, k)); }
        } else { let k: u32 = t.parse().expect("ticks"); println!("{} {:016x}", k, spacebench_core::scripted_run(seed, k)); }
    }
}
''')
p = subprocess.run(['cargo', 'build', '--release', '--offline'], cwd=str(N / 'run'), capture_output=True, text=True)
if p.returncode: print(p.stderr[-3000:]); sys.exit(1)
exe = str(N / 'run' / 'target' / 'release' / 'negrun.exe')
good = json.loads((R / 'brand' / 'proof2' / 'data' / 'hashes.json').read_text())
out, ok = {}, True
recorded_first = {'1': 44, '2': 23, '3735928559': 1}
recorded_1000 = {'1': '96a468dab4f3aa8d', '2': '6d77bf68e7fe402d'}
for s in ('1', '2', '3735928559'):
    q = subprocess.run([exe, s, '0..160', '1000', '200000'], capture_output=True, text=True); assert q.returncode == 0, q.stderr
    rows = dict(l.split() for l in q.stdout.splitlines())
    broken = [rows[str(t)] for t in range(161)]
    ref = good['seeds'][s]['wasm']
    first = next((t for t in range(161) if broken[t] != ref[t]), None)
    stays = all(broken[t] != ref[t] for t in range(first, 161)) if first is not None else None
    out[s] = {'native_std': broken, 'first_differing_tick': first, 't1000': rows['1000'], 't200000': rows['200000']}
    line = f"seed {s}: first differing tick {first} (ORDERS.md records {recorded_first[s]}); differs at every later tick: {stays}; tick 1000 native {rows['1000']}"
    if s in recorded_1000: line += f" (ORDERS.md records {recorded_1000[s]})"; ok &= rows['1000'] == recorded_1000[s]
    ok &= first == recorded_first[s]
    print(line)
print('REPRODUCES ORDERS.md' if ok else 'DOES NOT REPRODUCE')
if ok:
    d = R / 'brand' / 'proof2' / 'data'
    (d / 'negctl.js').write_text('window.SB_NEGCTL = ' + json.dumps({'seeds': out, 'change': 'expq: libm::sin, libm::cos -> f64::sin, f64::cos. Native build only.', 'run': '2026-11-18, scratch copy in .work/negctl'}, separators=(',', ':')) + ';\n')
sys.exit(0 if ok else 1)
