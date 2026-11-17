use crate::support::*;
use spacebench_core::{
    DT, FNV_OFFSET, PLACEHOLDER_THRUSTERS, PLACEHOLDER_VEHICLE, State, hash_state, scripted_run,
    thruster_wrench,
};

struct SplitMix(u64);

impl SplitMix {
    fn draw(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9e37_79b9_7f4a_7c15);
        let mut value = self.0;
        value = (value ^ (value >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
        value = (value ^ (value >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
        value ^ (value >> 31)
    }
}

fn initial(seed: u32) -> (State, SplitMix) {
    let mut generator = SplitMix(u64::from(seed));
    let mut omega = [0.0; 3];
    for component in &mut omega {
        let uniform = (generator.draw() >> 11) as f64 * (1.0 / 9_007_199_254_740_992.0);
        *component = (uniform - 0.5) * 0.1;
    }
    (state([0.0; 3], [0.0; 3], IDENTITY, omega), generator)
}

fn rebuild(seed: u32, ticks: u32) -> Vec<u64> {
    let (mut current, mut generator) = initial(seed);
    let mut hashes = vec![hash_state(FNV_OFFSET, &current)];
    let mut hash = hashes[0];
    let mut mask = 0;
    for _ in 0..ticks {
        if current.tick.is_multiple_of(7) {
            let first = generator.draw();
            let second = generator.draw();
            mask = (first & second & 0xffff) as u32;
        }
        let wrench = thruster_wrench(&PLACEHOLDER_THRUSTERS, mask);
        current = advance(&PLACEHOLDER_VEHICLE, &current, &wrench, DT);
        hash = hash_state(hash, &current);
        hashes.push(hash);
    }
    hashes
}

#[test]
fn scripted_run_equals_independent_splitmix_and_public_api_rebuild() {
    // The contract specifies the exact evaluation and draw order, not a
    // statistical distribution. Integer/hash equality is bit-for-bit.
    for seed in [0, 1, 0x1234_5678, u32::MAX] {
        let hashes = rebuild(seed, 64);
        // Boundaries straddle each side of the seven-tick mask update.
        for ticks in [0, 1, 6, 7, 8, 13, 14, 15, 29, 64] {
            assert_eq!(
                scripted_run(seed, ticks),
                hashes[ticks as usize],
                "seed={seed}, ticks={ticks}"
            );
        }
    }
}

#[test]
fn scripted_run_zero_ticks_hashes_only_the_seeded_initial_state() {
    // Three SplitMix draws set w; no mask draw and no step occur at ticks=0.
    // Independently encoded bytes and FNV also cover the zero-step definition.
    for seed in [0, 1, 42, u32::MAX] {
        let (initial, _) = initial(seed);
        let expected = own_fnv(0xcbf2_9ce4_8422_2325, &canonical_bytes(&initial));
        assert_eq!(scripted_run(seed, 0), expected);
    }
}

#[test]
fn scripted_run_is_repeatable_and_short_runs_are_hash_chain_prefixes() {
    // Prefix means equality of the chained hash through that tick, not a byte
    // prefix of the final u64. A resumed rebuild has the same initial draws
    // and exactly the same held masks; future draws cannot affect its prefix.
    for seed in [0, 0xa5a5_5a5a, u32::MAX] {
        assert_eq!(scripted_run(seed, 35), scripted_run(seed, 35));
        let longer = rebuild(seed, 35);
        for ticks in [0, 1, 7, 8, 14, 20, 28, 34] {
            let shorter = rebuild(seed, ticks);
            assert_eq!(&longer[..=ticks as usize], shorter.as_slice());
            assert_eq!(scripted_run(seed, ticks), longer[ticks as usize]);
        }
    }
}
