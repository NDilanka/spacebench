//! SpaceBench simulation core: a rigid-body step for one vehicle.
//!
//! CONTRACT COMMIT. This file is signatures only. Every body is `todo!()`.
//! Nothing here works yet and nothing here is done.
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
#![allow(
    unused_variables,
    reason = "contract commit: bodies are todo!(); order 1 removes this attribute"
)]

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
    /// Must be symmetric and positive definite. Products of inertia are allowed.
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
    todo!()
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
/// - Translation (`position` and `velocity`) is exact up to rounding when the
///   attitude does not change during the run, and at least second order in
///   `dt` otherwise.
///
/// What the claims mean:
///
/// - "Order p" means that the error at a fixed end time, measured against the
///   exact solution, scales as `dt^p` when `dt` shrinks. Attitude error is
///   the angle of the rotation between the computed and the exact attitude,
///   so `q` and `-q` count as equal.
/// - An order can only be measured where truncation error is larger than
///   rounding error: roughly `|w| * dt` between 0.01 and 0.2. At [`DT`] and
///   docking rates the error is already at rounding level.
/// - "Exact up to rounding" means that after `N` ticks each of `position`
///   and `velocity` differs from the closed form by at most
///   `8 * (N + 4) * f64::EPSILON` times the largest magnitude that vector
///   reaches during the run.
///
/// Preconditions: the vehicle meets the rules on [`Vehicle`], `dt` is finite
/// and greater than zero, and every field of `state` and `wrench` is finite.
/// If a precondition is broken, the result is unspecified.
pub fn step(vehicle: &Vehicle<'_>, state: &State, wrench: &Wrench, dt: f64) -> State {
    todo!()
}

/// FNV-1a, 64 bit. For each byte in order:
/// `hash ^= byte; hash = hash.wrapping_mul(FNV_PRIME)`.
///
/// Start a new hash by passing [`FNV_OFFSET`].
pub fn fnv1a64(hash: u64, bytes: &[u8]) -> u64 {
    todo!()
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
    todo!()
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
    todo!()
}
