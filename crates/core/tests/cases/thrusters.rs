use spacebench_core::{
    ESTIMATE_INERTIA_KG_M2, ESTIMATE_MASS_KG, MAX_THRUSTERS, PLACEHOLDER_THRUSTERS,
    PLACEHOLDER_VEHICLE, THRUSTER_FORCE_N, Thruster, Wrench, thruster_wrench,
};

const FORCES: [[f64; 3]; 16] = [
    [400.0, 0.0, 0.0],
    [-400.0, 0.0, 0.0],
    [0.0, 0.0, 400.0],
    [0.0, 0.0, -400.0],
    [400.0, 0.0, 0.0],
    [-400.0, 0.0, 0.0],
    [0.0, 0.0, 400.0],
    [0.0, 0.0, -400.0],
    [400.0, 0.0, 0.0],
    [-400.0, 0.0, 0.0],
    [0.0, 400.0, 0.0],
    [0.0, -400.0, 0.0],
    [400.0, 0.0, 0.0],
    [-400.0, 0.0, 0.0],
    [0.0, 400.0, 0.0],
    [0.0, -400.0, 0.0],
];
const TORQUES: [[f64; 3]; 16] = [
    [0.0, 0.0, -800.0],
    [0.0, 0.0, 800.0],
    [800.0, 0.0, 0.0],
    [-800.0, 0.0, 0.0],
    [0.0, 0.0, 800.0],
    [0.0, 0.0, -800.0],
    [-800.0, 0.0, 0.0],
    [800.0, 0.0, 0.0],
    [0.0, 800.0, 0.0],
    [0.0, -800.0, 0.0],
    [-800.0, 0.0, 0.0],
    [800.0, 0.0, 0.0],
    [0.0, -800.0, 0.0],
    [0.0, 800.0, 0.0],
    [800.0, 0.0, 0.0],
    [-800.0, 0.0, 0.0],
];

#[test]
fn placeholder_table_matches_documented_estimates() {
    // Only reads data; can pass while all function bodies are still todo!().
    assert_eq!(THRUSTER_FORCE_N, 400.0);
    assert_eq!(ESTIMATE_MASS_KG, 12_000.0);
    assert_eq!(
        ESTIMATE_INERTIA_KG_M2,
        [
            [28_000.0, 0.0, 0.0],
            [0.0, 55_000.0, 0.0],
            [0.0, 0.0, 55_000.0],
        ]
    );
    assert_eq!(MAX_THRUSTERS, 32);
    assert_eq!(PLACEHOLDER_THRUSTERS.len(), 16);
    assert_eq!(PLACEHOLDER_VEHICLE.mass, ESTIMATE_MASS_KG);
    assert_eq!(PLACEHOLDER_VEHICLE.inertia, ESTIMATE_INERTIA_KG_M2);
    assert_eq!(PLACEHOLDER_VEHICLE.thrusters, &PLACEHOLDER_THRUSTERS);
    for (i, thruster) in PLACEHOLDER_THRUSTERS.iter().enumerate() {
        let positions = [
            [0.0, 2.0, 0.0],
            [0.0, -2.0, 0.0],
            [0.0, 0.0, 2.0],
            [0.0, 0.0, -2.0],
        ];
        assert_eq!(thruster.position, positions[i / 4]);
        assert_eq!(thruster.force, 400.0);
        assert_eq!(thruster.direction.map(|value| value * 400.0), FORCES[i]);
    }
}

#[test]
fn each_placeholder_thruster_has_the_documented_force_and_cross_product_torque() {
    // F=400d; r x F=(ry Fz-rz Fy, rz Fx-rx Fz, rx Fy-ry Fx).
    // r has magnitude 2 perpendicular to F, so each torque is +/-800 Nm.
    // All operations are small integer products/sums: tolerance is exactly zero.
    for i in 0..16 {
        let actual = thruster_wrench(&PLACEHOLDER_THRUSTERS, 1 << i);
        assert_eq!(
            actual,
            Wrench {
                force: FORCES[i],
                torque: TORQUES[i]
            },
            "index {i}"
        );
    }
}

#[test]
fn selected_pairs_give_pure_force_and_pure_couple_in_both_directions() {
    // Opposite positions with equal F cancel r x F and add force (800 N).
    // Opposite positions with opposite F cancel force and add torque (1600 Nm).
    // All products and sums are exactly representable; zero tolerance.
    let force_pairs = [[(0, 4), (1, 5)], [(10, 14), (11, 15)], [(2, 6), (3, 7)]];
    let couple_pairs = [[(2, 7), (3, 6)], [(8, 13), (9, 12)], [(1, 4), (0, 5)]];
    for axis in 0..3 {
        for (direction, sign) in [1.0, -1.0].into_iter().enumerate() {
            let (a, b) = force_pairs[axis][direction];
            let mut force = [0.0; 3];
            force[axis] = sign * 800.0;
            assert_eq!(
                thruster_wrench(&PLACEHOLDER_THRUSTERS, (1 << a) | (1 << b)),
                Wrench {
                    force,
                    torque: [0.0; 3]
                }
            );
            let (a, b) = couple_pairs[axis][direction];
            let mut torque = [0.0; 3];
            torque[axis] = sign * 1600.0;
            assert_eq!(
                thruster_wrench(&PLACEHOLDER_THRUSTERS, (1 << a) | (1 << b)),
                Wrench {
                    force: [0.0; 3],
                    torque
                }
            );
        }
    }
}

#[test]
fn empty_masks_and_out_of_table_bits_are_ignored_including_empty_and_full_tables() {
    let zero = Wrench {
        force: [0.0; 3],
        torque: [0.0; 3],
    };
    assert_eq!(thruster_wrench(&PLACEHOLDER_THRUSTERS, 0), zero);
    for length in [0, 1, 3, 16] {
        let table = &PLACEHOLDER_THRUSTERS[..length];
        let high = u32::MAX << length;
        assert_eq!(thruster_wrench(table, high), zero);
        assert_eq!(
            thruster_wrench(table, u32::MAX),
            thruster_wrench(table, !high)
        );
    }
    let full = [Thruster {
        position: [0.0; 3],
        direction: [1.0, 0.0, 0.0],
        force: 1.0,
    }; 32];
    assert_eq!(
        thruster_wrench(&full, 1 << 31),
        Wrench {
            force: [1.0, 0.0, 0.0],
            torque: [0.0; 3]
        }
    );
}

#[test]
fn wrench_accumulation_is_in_rising_index_order() {
    // (1e16-1e16)+1 = 1, whereas 1e16+(-1e16+1) = 0 in binary64.
    // This distinguishes the specified order without an approximate tolerance.
    let table = [
        Thruster {
            position: [0.0; 3],
            direction: [1.0, 0.0, 0.0],
            force: 1e16,
        },
        Thruster {
            position: [0.0; 3],
            direction: [-1.0, 0.0, 0.0],
            force: 1e16,
        },
        Thruster {
            position: [0.0; 3],
            direction: [1.0, 0.0, 0.0],
            force: 1.0,
        },
    ];
    assert_eq!(thruster_wrench(&table, 7).force, [1.0, 0.0, 0.0]);
}
