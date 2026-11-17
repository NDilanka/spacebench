use crate::support::*;
use spacebench_core::{FNV_OFFSET, FNV_PRIME, fnv1a64, hash_state};

#[test]
fn fnv1a64_published_vectors_and_chaining() {
    // FNV reference test_fnv.c, fnv1a_64 vectors (isthe.com/chongo/src/fnv/).
    // Integer wrapping arithmetic is exact: no numerical tolerance.
    let vectors: &[(&[u8], u64)] = &[
        (b"", 0xcbf2_9ce4_8422_2325),
        (b"a", 0xaf63_dc4c_8601_ec8c),
        (b"b", 0xaf63_df4c_8601_f1a5),
        (b"foobar", 0x8594_4171_f739_67e8),
        (b"hello", 0xa430_d846_80aa_bd0b),
        (b"\0", 0xaf63_bd4c_8601_b7df),
    ];
    assert_eq!(FNV_OFFSET, 0xcbf2_9ce4_8422_2325);
    assert_eq!(FNV_PRIME, 0x0000_0100_0000_01b3);
    for &(bytes, expected) in vectors {
        assert_eq!(own_fnv(FNV_OFFSET, bytes), expected);
    }
    for &(bytes, expected) in vectors {
        assert_eq!(fnv1a64(FNV_OFFSET, bytes), expected);
        for split in 0..=bytes.len() {
            let prefix = fnv1a64(FNV_OFFSET, &bytes[..split]);
            assert_eq!(fnv1a64(prefix, &bytes[split..]), expected);
        }
    }
    let start = 0x0123_4567_89ab_cdef;
    assert_eq!(
        fnv1a64(start, b"arbitrary chain"),
        own_fnv(start, b"arbitrary chain")
    );
}

#[test]
fn hash_state_matches_independent_112_byte_layout_and_preserves_input() {
    // The oracle encodes tick LE then 13 float bit patterns LE. FNV operates
    // exactly on integers, so equality is bit-for-bit, not within a tolerance.
    let mut input = state(
        [-0.0, 1.25, -2.5],
        [3.75, -4.0, -0.0],
        [-0.5, 0.5, -0.5, 0.5],
        [0.125, -0.25, 0.5],
    );
    input.tick = 0x0123_4567_89ab_cdef;
    let before = raw_bytes(&input);
    let bytes = canonical_bytes(&input);
    assert_eq!(&bytes[..8], &input.tick.to_le_bytes());
    assert_eq!(&bytes[8..16], &0.0_f64.to_bits().to_le_bytes());
    assert_eq!(&bytes[56..64], &0.5_f64.to_bits().to_le_bytes());
    for start in [FNV_OFFSET, 0, 0xffff_ffff_ffff_ffff] {
        assert_eq!(hash_state(start, &input), own_fnv(start, &bytes));
        assert_eq!(raw_bytes(&input), before);
    }
}

#[test]
fn hash_state_identifies_quaternion_sign_with_leading_zero_components() {
    // The first component unequal to zero fixes the double-cover sign;
    // test every possible pivot, including signed zeros before the pivot.
    for pivot in 0..4 {
        let mut quaternion = [-0.0; 4];
        quaternion[pivot] = -1.0;
        let input = state([1.0; 3], [2.0; 3], quaternion, [3.0; 3]);
        let mut opposite = input;
        opposite.attitude = quaternion.map(|component| -component);
        assert_eq!(
            hash_state(FNV_OFFSET, &input),
            hash_state(FNV_OFFSET, &opposite)
        );
        assert_eq!(
            hash_state(FNV_OFFSET, &input),
            own_fnv(FNV_OFFSET, &canonical_bytes(&input))
        );
    }
}

#[test]
fn hash_state_identifies_negative_zero_in_every_float_slot() {
    // q=[1,0,0,0] remains unit when a zero's sign changes.
    let input = state([0.0; 3], [0.0; 3], IDENTITY, [0.0; 3]);
    let baseline = hash_state(FNV_OFFSET, &input);
    for index in 0..13 {
        if index == 6 {
            continue;
        }
        let mut changed = input;
        let field = match index {
            0..=2 => &mut changed.position[index],
            3..=5 => &mut changed.velocity[index - 3],
            6..=9 => &mut changed.attitude[index - 6],
            _ => &mut changed.angular_velocity[index - 10],
        };
        *field = -0.0;
        assert_eq!(hash_state(FNV_OFFSET, &changed), baseline, "slot {index}");
    }
    // A unit quaternion whose scalar is zero exercises that slot as well.
    let mut input = state([0.0; 3], [0.0; 3], [0.0, 1.0, 0.0, 0.0], [0.0; 3]);
    let baseline = hash_state(FNV_OFFSET, &input);
    input.attitude[0] = -0.0;
    assert_eq!(hash_state(FNV_OFFSET, &input), baseline);
}

#[test]
fn hash_state_includes_tick_and_every_scalar_field() {
    let input = state(
        [1.0, 2.0, 3.0],
        [-4.0, 5.0, -6.0],
        [0.5, -0.5, 0.5, -0.5],
        [0.125, 0.25, -0.5],
    );
    let baseline = hash_state(FNV_OFFSET, &input);
    for index in 0..14 {
        let mut changed = input;
        match index {
            0 => changed.tick += 1,
            1..=3 => changed.position[index - 1] += 0.25,
            4..=6 => changed.velocity[index - 4] += 0.25,
            // Flipping one nonzero component preserves unit norm but changes
            // the rotation, unlike negating all four components.
            7..=10 => changed.attitude[index - 7] = -changed.attitude[index - 7],
            _ => changed.angular_velocity[index - 11] += 0.25,
        }
        let expected = own_fnv(FNV_OFFSET, &canonical_bytes(&changed));
        assert_ne!(expected, own_fnv(FNV_OFFSET, &canonical_bytes(&input)));
        assert_eq!(hash_state(FNV_OFFSET, &changed), expected, "field {index}");
        assert_ne!(hash_state(FNV_OFFSET, &changed), baseline, "field {index}");
    }
}
