//! SpaceBench simulation core: a rigid-body step for one vehicle.
//!
//! # Conventions
//!
//! - Units are SI: metres, kilograms, seconds, newtons, radians.
//! - The inertial frame does not rotate and does not accelerate.
//! - The body frame is right-handed with its origin at the centre of mass.
//!   Body x is the long axis of the vehicle (the roll axis).
//! - Attitude is a Hamilton quaternion `[w, x, y, z]`, scalar first, that
//!   rotates body-frame vectors into the inertial frame:
//!   `v_inertial = q * v_body * conj(q)`.
//! - Angular velocity is the rate of the body relative to the inertial frame,
//!   written in body-frame components.
//! - Matrices are row-major: `m[row][column]`.
//! - Time is the integer tick count. For a run that uses one `dt` throughout,
//!   seconds are `tick * dt`, computed by multiplying and never by adding up.
//!
//! # Determinism
//!
//! The crate is `no_std`, so it cannot reach a wall clock, OS random numbers
//! or the `std` float math methods. Every sine, cosine and square root goes
//! through `libm`. No `mul_add`. No NaN may enter a [`State`].

#![no_std]
#![forbid(unsafe_code)]

/// Three components `[x, y, z]`.
pub type Vec3 = [f64; 3];

/// Hamilton quaternion `[w, x, y, z]`, scalar first, body to inertial.
pub type Quat = [f64; 4];

/// Row-major 3 by 3 matrix: `m[row][column]`.
pub type Mat3 = [[f64; 3]; 3];

/// Seconds per tick used by [`scripted_run`] and by every gate.
///
/// 0.035 s, the minimum pulse in `DESIGN.md`, is exactly 7 ticks.
pub const DT: f64 = 0.005;

/// The firing mask is a `u32`, so a thruster table holds at most 32 entries.
pub const MAX_THRUSTERS: usize = 32;

/// FNV-1a 64-bit offset basis.
pub const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;

/// FNV-1a 64-bit prime.
pub const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

/// One thruster, fixed to the hull.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Thruster {
    /// Where the force acts, in the body frame, in metres from the centre of mass.
    pub position: Vec3,
    /// Unit direction of the force on the vehicle, in the body frame.
    /// This is the push on the hull, not the direction of the exhaust.
    pub direction: Vec3,
    /// Force in newtons while firing.
    pub force: f64,
}

/// The vehicle's fixed properties.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Vehicle<'a> {
    /// Mass in kilograms. Must be finite and greater than zero.
    pub mass: f64,
    /// Inertia tensor about the centre of mass in the body frame, in kg m^2.
    /// Must be symmetric, positive definite, and well-conditioned in binary64
    /// with finite non-zero determinant. Products of inertia are allowed.
    pub inertia: Mat3,
    /// Thruster table. At most [`MAX_THRUSTERS`] entries.
    pub thrusters: &'a [Thruster],
}

/// A force and a torque about the centre of mass, both in the body frame.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Wrench {
    /// Force in newtons, body frame.
    pub force: Vec3,
    /// Torque about the centre of mass in newton metres, body frame.
    pub torque: Vec3,
}

/// The whole simulated state of one vehicle at one tick.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct State {
    /// Number of steps taken since the start of the run.
    pub tick: u64,
    /// Position of the centre of mass, inertial frame, metres.
    pub position: Vec3,
    /// Velocity of the centre of mass, inertial frame, metres per second.
    pub velocity: Vec3,
    /// Attitude, body to inertial, unit length.
    pub attitude: Quat,
    /// Angular velocity, body frame, radians per second.
    pub angular_velocity: Vec3,
}

/// Thrust of one thruster in newtons (NASA-hosted SpaceX CRS-6 press kit, per `DESIGN.md`).
pub const THRUSTER_FORCE_N: f64 = 400.0;

/// ESTIMATE. Vehicle mass inside the docking standard's 10 to 15 tonne design
/// envelope. Not a published Dragon value.
pub const ESTIMATE_MASS_KG: f64 = 12_000.0;

/// ESTIMATE. Inertia inside the docking standard's design envelope
/// (Ixx 17,000 to 41,000 and Iyy = Izz 42,000 to 71,000 kg m^2).
/// Not a published Dragon value.
pub const ESTIMATE_INERTIA_KG_M2: Mat3 = [
    [28_000.0, 0.0, 0.0],
    [0.0, 55_000.0, 0.0],
    [0.0, 0.0, 55_000.0],
];

const fn placeholder_thruster(position: Vec3, direction: Vec3) -> Thruster {
    Thruster {
        position,
        direction,
        force: THRUSTER_FORCE_N,
    }
}

/// PLACEHOLDER. Not Dragon's layout, which is unverified (`DESIGN.md` section 9).
///
/// Sixteen thrusters in four pods at radius 2 m, in the plane of the centre
/// of mass. Each pod has two axial thrusters (+x, -x) and two tangential ones.
///
/// | Index    | Pod position (m) | Force directions |
/// |----------|------------------|------------------|
/// | 0 to 3   | (0, +2, 0)       | +x, -x, +z, -z   |
/// | 4 to 7   | (0, -2, 0)       | +x, -x, +z, -z   |
/// | 8 to 11  | (0, 0, +2)       | +x, -x, +y, -y   |
/// | 12 to 15 | (0, 0, -2)       | +x, -x, +y, -y   |
///
/// Pairs of thrusters give a pure force or a pure couple on each of the six
/// axes, in both directions.
pub const PLACEHOLDER_THRUSTERS: [Thruster; 16] = [
    placeholder_thruster([0.0, 2.0, 0.0], [1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, 2.0, 0.0], [-1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, 2.0, 0.0], [0.0, 0.0, 1.0]),
    placeholder_thruster([0.0, 2.0, 0.0], [0.0, 0.0, -1.0]),
    placeholder_thruster([0.0, -2.0, 0.0], [1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, -2.0, 0.0], [-1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, -2.0, 0.0], [0.0, 0.0, 1.0]),
    placeholder_thruster([0.0, -2.0, 0.0], [0.0, 0.0, -1.0]),
    placeholder_thruster([0.0, 0.0, 2.0], [1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, 0.0, 2.0], [-1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, 0.0, 2.0], [0.0, 1.0, 0.0]),
    placeholder_thruster([0.0, 0.0, 2.0], [0.0, -1.0, 0.0]),
    placeholder_thruster([0.0, 0.0, -2.0], [1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, 0.0, -2.0], [-1.0, 0.0, 0.0]),
    placeholder_thruster([0.0, 0.0, -2.0], [0.0, 1.0, 0.0]),
    placeholder_thruster([0.0, 0.0, -2.0], [0.0, -1.0, 0.0]),
];

/// The estimate mass and inertia with the placeholder thruster table.
pub const PLACEHOLDER_VEHICLE: Vehicle<'static> = Vehicle {
    mass: ESTIMATE_MASS_KG,
    inertia: ESTIMATE_INERTIA_KG_M2,
    thrusters: &PLACEHOLDER_THRUSTERS,
};

/// Sums the force and torque of the firing thrusters.
///
/// Bit `i` of `firing` (bit 0 is the least significant) fires `thrusters[i]`.
/// Bits at or above `thrusters.len()` are ignored.
///
/// The sum runs in rising index order, starting from zero. Each firing
/// thruster adds `force * direction` to the force and
/// `position x (force * direction)` to the torque.
pub fn thruster_wrench(thrusters: &[Thruster], firing: u32) -> Wrench {
    let mut force: Vec3 = [0.0; 3];
    let mut torque: Vec3 = [0.0; 3];
    // The mask has 32 bits, so entries from index 32 on can never fire.
    for (index, thruster) in thrusters.iter().enumerate().take(MAX_THRUSTERS) {
        if ((firing >> index) & 1) == 0 {
            continue;
        }
        let push: Vec3 = core::array::from_fn(|k| thruster.force * thruster.direction[k]);
        force = add(&force, &push);
        torque = add(&torque, &cross(&thruster.position, &push));
    }
    Wrench { force, torque }
}

/// Advances the state by one tick of `dt` seconds.
///
/// Equations of motion, with `R(q)` the rotation from body to inertial:
///
/// - `mass * dv/dt = R(q) * wrench.force`
/// - `dx/dt = v`
/// - `inertia * dw/dt = wrench.torque - w x (inertia * w)`
/// - `dq/dt = 0.5 * q * (0, w)`
///
/// `wrench` is held constant in the body frame for the whole tick, as a
/// thruster fixed to the hull would be.
///
/// The returned state has `tick + 1` and a renormalised attitude. The sign of
/// the attitude quaternion is not canonical here; see [`hash_state`].
///
/// `dt` is an argument only so that a test can shrink it. Every gate and
/// [`scripted_run`] pass [`DT`].
///
/// Accuracy claims that tests may rely on:
///
/// - Rotation (`attitude` and `angular_velocity`) is fourth order in `dt`.
/// - Translation (`position` and `velocity`) is exact up to rounding when
///   the attitude and wrench do not change during the run (or when
///   `wrench.force` is zero), and at least second order in `dt` otherwise.
///
/// What the claims mean:
///
/// - "Order p" means that the error at a fixed end time, measured against the
///   exact solution, scales as `dt^p` when `dt` shrinks. Attitude error is
///   the angle of the rotation between the computed and the exact attitude,
///   so `q` and `-q` count as equal.
/// - To measure rotational order, use a motion such as torque-free
///   precession where the body angular-velocity vector changes direction;
///   rotation about one fixed body axis can be exact up to rounding and
///   cannot establish order. No fixed range of `|w| * dt` guarantees a
///   useful measurement (angular acceleration also enters truncation
///   error): at a fixed end time, check that error clears rounding at
///   every step size used and decreases at the claimed rate under
///   refinement.
/// - "Exact up to rounding" means that after `N` ticks with unchanged
///   attitude and constant wrench (or zero force), each of `position` and
///   `velocity` differs from the closed form by at most
///   `8 * (N + 4) * f64::EPSILON` times the largest magnitude that vector
///   reaches during the run.
///
/// Preconditions: the vehicle meets the rules on [`Vehicle`], `dt` is finite
/// and greater than zero, and every field of `state` and `wrench` is finite.
/// If a precondition is broken, the result is unspecified.
pub fn step(vehicle: &Vehicle<'_>, state: &State, wrench: &Wrench, dt: f64) -> State {
    let h = dt;
    let inertia = &vehicle.inertia;
    let inertia_inverse = inverse3(inertia);
    let torque = &wrench.torque;

    // Rotation: classic RK4 on Euler's equations. w1..w4 are the stage angular velocities.
    let w1 = state.angular_velocity;
    let k1 = angular_accel(&inertia_inverse, inertia, torque, &w1);
    let w2 = add(&w1, &scale(&k1, h / 2.0));
    let k2 = angular_accel(&inertia_inverse, inertia, torque, &w2);
    let w3 = add(&w1, &scale(&k2, h / 2.0));
    let k3 = angular_accel(&inertia_inverse, inertia, torque, &w3);
    let w4 = add(&w1, &scale(&k3, h));
    let k4 = angular_accel(&inertia_inverse, inertia, torque, &w4);
    let w_next = add(&w1, &scale(&weighted4(&k1, &k2, &k3, &k4), h / 6.0));

    // Attitude: exponential map of the stage-averaged rotation, plus the coning term w_n x w_next.
    let coning = scale(&cross(&w1, &w_next), h * h / 12.0);
    let phi = add(&scale(&weighted4(&w1, &w2, &w3, &w4), h / 6.0), &coning);
    let q_n = state.attitude;
    let q_mid = quat_mul(&q_n, &expq(&scale(&phi, 0.5)));
    let q_next = normalise(&quat_mul(&q_n, &expq(&phi)));

    // Translation: Simpson's rule on the inertial acceleration R(q) F / m.
    let mass = vehicle.mass;
    let a0 = acceleration(&q_n, &wrench.force, mass);
    let am = acceleration(&q_mid, &wrench.force, mass);
    let a1 = acceleration(&q_next, &wrench.force, mass);
    let velocity_next: Vec3 =
        core::array::from_fn(|k| state.velocity[k] + (h / 6.0) * (a0[k] + 4.0 * am[k] + a1[k]));
    let position_next: Vec3 = core::array::from_fn(|k| {
        state.position[k] + state.velocity[k] * h + (h * h / 6.0) * (a0[k] + 2.0 * am[k])
    });

    State {
        // Wraps only after 2^64 ticks, which no run reaches.
        tick: state.tick.wrapping_add(1),
        position: position_next,
        velocity: velocity_next,
        attitude: q_next,
        angular_velocity: w_next,
    }
}

/// FNV-1a, 64 bit. For each byte in order:
/// `hash ^= byte; hash = hash.wrapping_mul(FNV_PRIME)`.
///
/// Start a new hash by passing [`FNV_OFFSET`].
pub fn fnv1a64(hash: u64, bytes: &[u8]) -> u64 {
    let mut h = hash;
    for &byte in bytes {
        h ^= u64::from(byte);
        h = h.wrapping_mul(FNV_PRIME);
    }
    h
}

/// Feeds one state into an FNV-1a hash and returns the new hash.
///
/// Exactly 112 bytes go in, in this order:
///
/// 1. `tick` as `u64::to_le_bytes` (8 bytes).
/// 2. `position` x, y, z.
/// 3. `velocity` x, y, z.
/// 4. `attitude` w, x, y, z.
/// 5. `angular_velocity` x, y, z.
///
/// Each float goes in as `f64::to_bits().to_le_bytes()` (8 bytes).
///
/// Before the bytes are taken, on a copy and never on `state` itself:
///
/// - If the first attitude component that compares unequal to `0.0`, in the
///   order w, x, y, z, is negative, all four components are negated. `q` and
///   `-q` are the same rotation and must hash the same.
/// - Then every float that equals zero is replaced by `+0.0`, so `-0.0` and
///   `+0.0` hash the same.
pub fn hash_state(hash: u64, state: &State) -> u64 {
    // Work on a copy: the sign rule changes only the bytes that are hashed.
    let mut attitude = state.attitude;
    let leading_negative = attitude
        .iter()
        .find(|c| **c != 0.0)
        .is_some_and(|c| *c < 0.0);
    if leading_negative {
        attitude = attitude.map(|c| -c);
    }

    let values: [f64; 13] = [
        state.position[0],
        state.position[1],
        state.position[2],
        state.velocity[0],
        state.velocity[1],
        state.velocity[2],
        attitude[0],
        attitude[1],
        attitude[2],
        attitude[3],
        state.angular_velocity[0],
        state.angular_velocity[1],
        state.angular_velocity[2],
    ];

    let mut bytes = [0_u8; 112];
    let (tick_bytes, float_bytes) = bytes.split_at_mut(8);
    tick_bytes.copy_from_slice(&state.tick.to_le_bytes());
    for (chunk, value) in float_bytes.chunks_exact_mut(8).zip(values) {
        chunk.copy_from_slice(&canonical_zero(value).to_bits().to_le_bytes());
    }
    fnv1a64(hash, &bytes)
}

/// Runs a fixed, seeded flight and returns one hash chained over every tick.
///
/// The run is a pure function of `seed` and `ticks`. It uses
/// [`PLACEHOLDER_VEHICLE`] and [`DT`].
///
/// Random numbers are SplitMix64, integers only. The generator state starts
/// at `seed as u64`. Each draw is:
///
/// ```text
/// s = s.wrapping_add(0x9E37_79B9_7F4A_7C15)
/// z = s
/// z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9)
/// z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB)
/// z = z ^ (z >> 31)
/// ```
///
/// Initial state: `tick` 0, position zero, velocity zero, attitude
/// `[1, 0, 0, 0]`. Three draws, in the order x, y, z, set the angular
/// velocity: `u = (z >> 11) as f64 * (1.0 / 9007199254740992.0)` and
/// `w = (u - 0.5) * 0.1` radians per second.
///
/// Hash chain: start with `h = FNV_OFFSET`, then `h = hash_state(h, &state)`
/// for the initial state.
///
/// Then, `ticks` times:
///
/// 1. If the current `state.tick` is a multiple of 7, draw `z1`, then `z2`,
///    and set `mask = (z1 & z2 & 0xFFFF) as u32`. The mask holds for 7 ticks.
/// 2. `wrench = thruster_wrench(&PLACEHOLDER_THRUSTERS, mask)`.
/// 3. `state = step(&PLACEHOLDER_VEHICLE, &state, &wrench, DT)`.
/// 4. `h = hash_state(h, &state)`.
///
/// Returns `h`. `ticks + 1` states are hashed in total, so
/// `scripted_run(seed, 0)` is the hash of the initial state alone.
pub fn scripted_run(seed: u32, ticks: u32) -> u64 {
    let mut rng = u64::from(seed);
    let mut state = initial_state(&mut rng);
    let mut hash = hash_state(FNV_OFFSET, &state);
    let mut mask = 0_u32;
    for _ in 0..ticks {
        if state.tick.is_multiple_of(7) {
            let z1 = splitmix_next(&mut rng);
            let z2 = splitmix_next(&mut rng);
            mask = (z1 & z2 & 0xFFFF) as u32;
        }
        let wrench = thruster_wrench(&PLACEHOLDER_THRUSTERS, mask);
        state = step(&PLACEHOLDER_VEHICLE, &state, &wrench, DT);
        hash = hash_state(hash, &state);
    }
    hash
}

/// One SplitMix64 draw, as written in the contract.
fn splitmix_next(s: &mut u64) -> u64 {
    *s = s.wrapping_add(0x9E37_79B9_7F4A_7C15);
    let mut z = *s;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

/// The start of a run: tick 0, at rest, identity attitude, and a seeded spin.
/// Consumes three draws from `rng`, in the order x, y, z.
fn initial_state(rng: &mut u64) -> State {
    let mut angular_velocity: Vec3 = [0.0; 3];
    for component in &mut angular_velocity {
        let z = splitmix_next(rng);
        let u = (z >> 11) as f64 * (1.0 / 9_007_199_254_740_992.0);
        *component = (u - 0.5) * 0.1;
    }
    State {
        tick: 0,
        position: [0.0; 3],
        velocity: [0.0; 3],
        attitude: [1.0, 0.0, 0.0, 0.0],
        angular_velocity,
    }
}

fn add(a: &Vec3, b: &Vec3) -> Vec3 {
    core::array::from_fn(|k| a[k] + b[k])
}

fn sub(a: &Vec3, b: &Vec3) -> Vec3 {
    core::array::from_fn(|k| a[k] - b[k])
}

fn scale(v: &Vec3, s: f64) -> Vec3 {
    core::array::from_fn(|k| v[k] * s)
}

/// `a + 2 b + 2 c + d`, summed in that order.
fn weighted4(a: &Vec3, b: &Vec3, c: &Vec3, d: &Vec3) -> Vec3 {
    core::array::from_fn(|k| a[k] + 2.0 * b[k] + 2.0 * c[k] + d[k])
}

fn dot3(a: &Vec3, b: &Vec3) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn dot4(a: &Quat, b: &Quat) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
}

fn cross(a: &Vec3, b: &Vec3) -> Vec3 {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

fn mat_vec(m: &Mat3, v: &Vec3) -> Vec3 {
    core::array::from_fn(|r| m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2])
}

/// Inverse of a 3 by 3 matrix by cofactors: `inverse = adjugate / det`.
/// Handles products of inertia, unlike a diagonal shortcut.
fn inverse3(m: &Mat3) -> Mat3 {
    let c00 = m[1][1] * m[2][2] - m[1][2] * m[2][1];
    let c01 = m[1][2] * m[2][0] - m[1][0] * m[2][2];
    let c02 = m[1][0] * m[2][1] - m[1][1] * m[2][0];
    let c10 = m[0][2] * m[2][1] - m[0][1] * m[2][2];
    let c11 = m[0][0] * m[2][2] - m[0][2] * m[2][0];
    let c12 = m[0][1] * m[2][0] - m[0][0] * m[2][1];
    let c20 = m[0][1] * m[1][2] - m[0][2] * m[1][1];
    let c21 = m[0][2] * m[1][0] - m[0][0] * m[1][2];
    let c22 = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let det = m[0][0] * c00 + m[0][1] * c01 + m[0][2] * c02;
    assert!(
        det.is_finite() && det != 0.0,
        "vehicle inertia determinant must be finite and non-zero"
    );
    [
        [c00 / det, c10 / det, c20 / det],
        [c01 / det, c11 / det, c21 / det],
        [c02 / det, c12 / det, c22 / det],
    ]
}

/// `I^-1 (T - w x (I w))`: the angular acceleration from Euler's equations.
fn angular_accel(inverse: &Mat3, inertia: &Mat3, torque: &Vec3, w: &Vec3) -> Vec3 {
    let iw = mat_vec(inertia, w);
    let gyroscopic = cross(w, &iw);
    mat_vec(inverse, &sub(torque, &gyroscopic))
}

/// Hamilton product `a * b`, scalar first.
fn quat_mul(a: &Quat, b: &Quat) -> Quat {
    [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    ]
}

fn quat_conj(q: &Quat) -> Quat {
    [q[0], -q[1], -q[2], -q[3]]
}

/// Rotates a body-frame vector into the inertial frame: `q * (0, v) * conj(q)`.
fn rotate(q: &Quat, v: &Vec3) -> Vec3 {
    let pure: Quat = [0.0, v[0], v[1], v[2]];
    let r = quat_mul(&quat_mul(q, &pure), &quat_conj(q));
    [r[1], r[2], r[3]]
}

/// Inertial acceleration `R(q) F / m` for a body-frame force.
fn acceleration(q: &Quat, force: &Vec3, mass: f64) -> Vec3 {
    let f = rotate(q, force);
    core::array::from_fn(|k| f[k] / mass)
}

/// Exponential map of a rotation vector `p` to a unit quaternion, scalar first.
/// The small-angle branch avoids dividing by a near-zero `theta`.
fn expq(p: &Vec3) -> Quat {
    let theta = libm::sqrt(dot3(p, p));
    let half = theta / 2.0;
    let s = if theta >= 1e-8 {
        libm::sin(half) / theta
    } else {
        0.5 - theta * theta / 48.0
    };
    [libm::cos(half), s * p[0], s * p[1], s * p[2]]
}

fn normalise(q: &Quat) -> Quat {
    let n = libm::sqrt(dot4(q, q));
    core::array::from_fn(|k| q[k] / n)
}

/// Replaces a zero of either sign with `+0.0`. Comparing with `==` treats both signs as zero.
fn canonical_zero(x: f64) -> f64 {
    if x == 0.0 { 0.0 } else { x }
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;

    fn assert_bits_eq(actual: &[f64], expected: &[f64]) {
        assert_eq!(actual.len(), expected.len());
        for (a, e) in actual.iter().zip(expected) {
            assert_eq!(a.to_bits(), e.to_bits(), "bit mismatch: {a:e} vs {e:e}");
        }
    }

    fn assert_close(actual: f64, expected: f64, tolerance: f64) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "{actual:e} differs from {expected:e} by more than {tolerance:e}"
        );
    }

    /// FNV-1a 64 vectors: the empty string gives the offset basis; "a" and "foobar"
    /// are the published FNV-1a 64 test values.
    #[test]
    fn fnv1a64_matches_known_vectors() {
        assert_eq!(fnv1a64(FNV_OFFSET, b""), 0xcbf2_9ce4_8422_2325);
        assert_eq!(fnv1a64(FNV_OFFSET, b"a"), 0xaf63_dc4c_8601_ec8c);
        assert_eq!(fnv1a64(FNV_OFFSET, b"foobar"), 0x8594_4171_f739_67e8);
        assert_eq!(
            fnv1a64(fnv1a64(FNV_OFFSET, b"foo"), b"bar"),
            0x8594_4171_f739_67e8
        );
    }

    #[test]
    fn splitmix64_seed_zero_first_three_outputs() {
        let mut s = 0_u64;
        assert_eq!(splitmix_next(&mut s), 0xE220_A839_7B1D_CDAF);
        assert_eq!(splitmix_next(&mut s), 0x6E78_9E6A_A1B9_65F4);
        assert_eq!(splitmix_next(&mut s), 0x06C4_5D18_8009_454F);
    }

    /// Zero wrench and zero angular velocity at rest: every field except `tick` keeps its bits.
    #[test]
    fn zero_wrench_at_rest_changes_only_the_tick() {
        let state = State {
            tick: 41,
            position: [1.5, -2.25, 3.0],
            velocity: [0.0; 3],
            attitude: [0.5, 0.5, 0.5, 0.5],
            angular_velocity: [0.0; 3],
        };
        let zero = Wrench {
            force: [0.0; 3],
            torque: [0.0; 3],
        };
        let next = step(&PLACEHOLDER_VEHICLE, &state, &zero, DT);
        assert_eq!(next.tick, 42);
        assert_bits_eq(&next.position, &state.position);
        assert_bits_eq(&next.velocity, &state.velocity);
        assert_bits_eq(&next.attitude, &state.attitude);
        assert_bits_eq(&next.angular_velocity, &state.angular_velocity);
    }

    /// Thrusters 2 and 7 are (0, +2, 0) pushing +z and (0, -2, 0) pushing -z, both at 400 N.
    /// Torque of each is `position x (F dir)`: (2 * 400, 0, 0) and ((-2) * (-400), 0, 0).
    /// Net force is zero and net torque is (1600, 0, 0).
    #[test]
    fn thrusters_two_and_seven_make_a_pure_couple_about_x() {
        let w = thruster_wrench(&PLACEHOLDER_THRUSTERS, 0b1000_0100);
        assert_eq!(w.force, [0.0, 0.0, 0.0]);
        assert_eq!(w.torque, [1600.0, 0.0, 0.0]);
    }

    /// I * inverse(I) must be the identity for a symmetric inertia with a product of inertia.
    #[test]
    fn inverse_with_product_of_inertia_gives_identity() {
        let m: Mat3 = [
            [28_000.0, 0.0, 1_500.0],
            [0.0, 55_000.0, 0.0],
            [1_500.0, 0.0, 55_000.0],
        ];
        let inv = inverse3(&m);
        let identity: Mat3 = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
        for (row, m_row) in m.iter().enumerate() {
            for (col, expected) in identity[row].iter().enumerate() {
                let product =
                    m_row[0] * inv[0][col] + m_row[1] * inv[1][col] + m_row[2] * inv[2][col];
                assert_close(product, *expected, 1e-12);
            }
        }
    }

    /// Spin w = (0, 0, w0) on a diagonal inertia: w x (I w) = 0, so w stays constant and the
    /// attitude turns about z. Closed form after t seconds: q = [cos(w0 t / 2), 0, 0, sin(w0 t / 2)].
    #[test]
    fn spin_about_a_principal_axis_matches_closed_form() {
        let vehicle = Vehicle {
            mass: ESTIMATE_MASS_KG,
            inertia: [
                [28_000.0, 0.0, 0.0],
                [0.0, 55_000.0, 0.0],
                [0.0, 0.0, 55_000.0],
            ],
            thrusters: &[],
        };
        let w0 = 0.3;
        let zero = Wrench {
            force: [0.0; 3],
            torque: [0.0; 3],
        };
        let mut state = State {
            tick: 0,
            position: [0.0; 3],
            velocity: [0.0; 3],
            attitude: [1.0, 0.0, 0.0, 0.0],
            angular_velocity: [0.0, 0.0, w0],
        };
        const TICKS: u32 = 200;
        for _ in 0..TICKS {
            state = step(&vehicle, &state, &zero, DT);
        }
        let t = f64::from(TICKS) * DT;
        let half = w0 * t / 2.0;
        assert_close(state.attitude[0], libm::cos(half), 1e-12);
        assert_close(state.attitude[1], 0.0, 1e-12);
        assert_close(state.attitude[2], 0.0, 1e-12);
        assert_close(state.attitude[3], libm::sin(half), 1e-12);
        assert_bits_eq(&state.angular_velocity, &[0.0, 0.0, w0]);
    }

    /// Constant body-z force F on an unturning vehicle, from rest: a = F / m, v(t) = a t,
    /// x(t) = a t^2 / 2, with t = N DT. The tolerance is the contract's bound
    /// `8 (N + 4) EPSILON` times the largest magnitude the vector reaches.
    #[test]
    fn constant_force_on_fixed_attitude_matches_newton_closed_form() {
        let wrench = Wrench {
            force: [0.0, 0.0, THRUSTER_FORCE_N],
            torque: [0.0; 3],
        };
        let ticks: u32 = 100;
        let mut state = State {
            tick: 0,
            position: [0.0; 3],
            velocity: [0.0; 3],
            attitude: [1.0, 0.0, 0.0, 0.0],
            angular_velocity: [0.0; 3],
        };
        for _ in 0..ticks {
            state = step(&PLACEHOLDER_VEHICLE, &state, &wrench, DT);
        }
        let n = f64::from(ticks);
        let t = n * DT;
        let a = THRUSTER_FORCE_N / ESTIMATE_MASS_KG;
        let v_expected = a * t;
        let x_expected = a * t * t / 2.0;
        assert_close(
            state.velocity[2],
            v_expected,
            8.0 * (n + 4.0) * f64::EPSILON * v_expected,
        );
        assert_close(
            state.position[2],
            x_expected,
            8.0 * (n + 4.0) * f64::EPSILON * x_expected,
        );
        assert_close(state.velocity[0], 0.0, 0.0);
        assert_close(state.velocity[1], 0.0, 0.0);
        assert_close(state.attitude[0], 1.0, 0.0);
        assert_bits_eq(&state.attitude, &[1.0, 0.0, 0.0, 0.0]);
    }

    /// The hash reads the sign-canonical bytes: a negated quaternion and `-0.0` hash like
    /// their positive forms, and a real change in one position component changes the hash.
    #[test]
    fn hash_ignores_quaternion_sign_and_zero_sign() {
        let plus = State {
            tick: 3,
            position: [0.0, 1.0, 2.0],
            velocity: [0.0; 3],
            attitude: [1.0, 0.0, 0.0, 0.0],
            angular_velocity: [0.0; 3],
        };
        let minus = State {
            tick: 3,
            position: [-0.0, 1.0, 2.0],
            velocity: [-0.0; 3],
            attitude: [-1.0, -0.0, -0.0, -0.0],
            angular_velocity: [-0.0; 3],
        };
        assert_eq!(
            hash_state(FNV_OFFSET, &plus),
            hash_state(FNV_OFFSET, &minus)
        );
        let moved = State {
            position: [0.0, 1.0, 2.5],
            ..plus
        };
        assert_ne!(
            hash_state(FNV_OFFSET, &plus),
            hash_state(FNV_OFFSET, &moved)
        );
    }

    #[test]
    fn scripted_run_with_zero_ticks_hashes_the_initial_state() {
        for seed in [0_u32, 1, 2, 0xDEAD_BEEF] {
            let mut rng = u64::from(seed);
            let initial = initial_state(&mut rng);
            assert_eq!(scripted_run(seed, 0), hash_state(FNV_OFFSET, &initial));
        }
    }

    #[test]
    fn scripted_run_is_repeatable_and_depends_on_seed() {
        let first = scripted_run(1, 1000);
        assert_eq!(first, scripted_run(1, 1000));
        assert_ne!(first, scripted_run(2, 1000));
    }

    /// The inertia block [[1 + e, 1], [1, 1 - e / 2]], with e = f64::EPSILON, is symmetric
    /// and positive definite. Its exact determinant is (1 + e)(1 - e / 2) - 1 = e / 2 - e^2 / 2,
    /// which is positive. In binary64 the product (1 + e)(1 - e / 2) rounds to 1, so the
    /// computed determinant is 0.0. `step` must refuse it instead of dividing by zero.
    #[test]
    #[should_panic(expected = "vehicle inertia determinant must be finite and non-zero")]
    fn step_rejects_spd_inertia_whose_determinant_rounds_to_zero() {
        let e = f64::EPSILON;
        let vehicle = Vehicle {
            mass: ESTIMATE_MASS_KG,
            inertia: [
                [1.0 + e, 1.0, 0.0],
                [1.0, 1.0 - e / 2.0, 0.0],
                [0.0, 0.0, 1.0],
            ],
            thrusters: &[],
        };
        let zero = Wrench {
            force: [0.0; 3],
            torque: [0.0; 3],
        };
        let state = State {
            tick: 0,
            position: [0.0; 3],
            velocity: [0.0; 3],
            attitude: [1.0, 0.0, 0.0, 0.0],
            angular_velocity: [0.0; 3],
        };
        step(&vehicle, &state, &zero, DT);
    }

    /// The identity scaled by s = 1e110. Each cofactor is s^2 = 1e220, which is finite, but
    /// the determinant is s^3 = 1e330, above f64::MAX (about 1.8e308), so the computed
    /// determinant is f64::INFINITY. `step` must refuse it.
    #[test]
    #[should_panic(expected = "vehicle inertia determinant must be finite and non-zero")]
    fn step_rejects_huge_inertia_whose_determinant_overflows() {
        let vehicle = Vehicle {
            mass: ESTIMATE_MASS_KG,
            inertia: [[1e110, 0.0, 0.0], [0.0, 1e110, 0.0], [0.0, 0.0, 1e110]],
            thrusters: &[],
        };
        let zero = Wrench {
            force: [0.0; 3],
            torque: [0.0; 3],
        };
        let state = State {
            tick: 0,
            position: [0.0; 3],
            velocity: [0.0; 3],
            attitude: [1.0, 0.0, 0.0, 0.0],
            angular_velocity: [0.0; 3],
        };
        step(&vehicle, &state, &zero, DT);
    }

    /// Prints the values reported to the lead. Run with `--nocapture`.
    #[test]
    fn print_scripted_run_values() {
        std::println!("scripted_run(1, 0) = {:016x}", scripted_run(1, 0));
        std::println!("scripted_run(1, 1000) = {:016x}", scripted_run(1, 1000));
        std::println!("scripted_run(2, 1000) = {:016x}", scripted_run(2, 1000));
    }
}
