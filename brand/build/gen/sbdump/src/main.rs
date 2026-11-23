//! Throwaway brand tool, to be replaced by a trace from the core itself (see brand/proof2/order-draft.md). Replays the core's scripted run through the core's public API
//! (`step`, `thruster_wrench`, `hash_state`) and prints every state as JSON lines.
//! The driver below restates the contract in the doc comment of `spacebench_core::scripted_run`.
//! It proves it replayed the same flight by comparing its chained hash with `scripted_run`.

use spacebench_core::{
    hash_state, scripted_run, step, thruster_wrench, State, DT, FNV_OFFSET, PLACEHOLDER_THRUSTERS,
    PLACEHOLDER_VEHICLE,
};

fn splitmix_next(s: &mut u64) -> u64 {
    *s = s.wrapping_add(0x9E37_79B9_7F4A_7C15);
    let mut z = *s;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let seed: u32 = args[0].parse().expect("seed");
    let ticks: u32 = args[1].parse().expect("ticks");
    let every: u64 = args[2].parse().expect("sample interval in ticks");
    let full_until: u64 = args[3].parse().expect("ticks to print in full");
    let checks: [u32; 5] = [0, 1, 7, 1000, 200_000];

    let mut rng = u64::from(seed);
    let mut w = [0.0_f64; 3];
    for c in &mut w {
        let z = splitmix_next(&mut rng);
        let u = (z >> 11) as f64 * (1.0 / 9_007_199_254_740_992.0);
        *c = (u - 0.5) * 0.1;
    }
    let mut state = State { tick: 0, position: [0.0; 3], velocity: [0.0; 3], attitude: [1.0, 0.0, 0.0, 0.0], angular_velocity: w };
    let mut hash = hash_state(FNV_OFFSET, &state);
    let mut mask = 0_u32;
    let print = |s: &State, h: u64, m: u32| {
        println!(
            "{{\"t\":{},\"p\":[{:e},{:e},{:e}],\"v\":[{:e},{:e},{:e}],\"q\":[{:e},{:e},{:e},{:e}],\"w\":[{:e},{:e},{:e}],\"h\":\"{:016x}\",\"m\":{}}}",
            s.tick, s.position[0], s.position[1], s.position[2], s.velocity[0], s.velocity[1], s.velocity[2],
            s.attitude[0], s.attitude[1], s.attitude[2], s.attitude[3],
            s.angular_velocity[0], s.angular_velocity[1], s.angular_velocity[2], h, m
        );
    };
    print(&state, hash, mask);
    let mut ok = true;
    {
        let want = scripted_run(seed, 0);
        eprintln!("check seed={} ticks=0 replay={:016x} scripted_run={:016x} {}", seed, hash, want, if hash == want { "MATCH" } else { "DIFFER" });
        if hash != want { ok = false; }
    }
    for _ in 0..ticks {
        if state.tick % 7 == 0 {
            let z1 = splitmix_next(&mut rng);
            let z2 = splitmix_next(&mut rng);
            mask = (z1 & z2 & 0xFFFF) as u32;
        }
        let wrench = thruster_wrench(&PLACEHOLDER_THRUSTERS, mask);
        state = step(&PLACEHOLDER_VEHICLE, &state, &wrench, DT);
        hash = hash_state(hash, &state);
        if state.tick <= full_until || state.tick % every == 0 || state.tick == u64::from(ticks) {
            print(&state, hash, mask);
        }
        if let Ok(t) = u32::try_from(state.tick) {
            if checks.contains(&t) {
                let want = scripted_run(seed, t);
                eprintln!("check seed={} ticks={} replay={:016x} scripted_run={:016x} {}", seed, t, hash, want, if hash == want { "MATCH" } else { "DIFFER" });
                if hash != want { ok = false; }
            }
        }
    }
    if !ok { eprintln!("REPLAY DOES NOT MATCH"); std::process::exit(1); }
}
