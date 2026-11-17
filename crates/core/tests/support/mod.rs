use spacebench_core::{Mat3, Quat, State, Vec3, Vehicle, Wrench};

pub const IDENTITY: Quat = [1.0, 0.0, 0.0, 0.0];
pub const ZERO_WRENCH: Wrench = Wrench {
    force: [0.0; 3],
    torque: [0.0; 3],
};
pub const BODY: Vehicle<'static> = Vehicle {
    mass: 5.0,
    inertia: [[2.0, 0.0, 0.0], [0.0, 3.0, 0.0], [0.0, 0.0, 3.0]],
    thrusters: &[],
};
pub const DURATION: f64 = 2.56;
pub const COUNTS: [u32; 3] = [32, 64, 128];

pub fn state(position: Vec3, velocity: Vec3, attitude: Quat, omega: Vec3) -> State {
    State {
        tick: 0,
        position,
        velocity,
        attitude,
        angular_velocity: omega,
    }
}

pub fn advance(vehicle: &Vehicle<'_>, input: &State, wrench: &Wrench, dt: f64) -> State {
    spacebench_core::step(vehicle, input, wrench, dt)
}

pub fn integrate(
    vehicle: &Vehicle<'_>,
    input: State,
    wrench: &Wrench,
    duration: f64,
    count: u32,
) -> State {
    let dt = duration / f64::from(count);
    let mut output = input;
    for _ in 0..count {
        output = advance(vehicle, &output, wrench, dt);
    }
    output
}

pub fn add(a: Vec3, b: Vec3) -> Vec3 {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

pub fn sub(a: Vec3, b: Vec3) -> Vec3 {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

pub fn scale(a: Vec3, s: f64) -> Vec3 {
    [a[0] * s, a[1] * s, a[2] * s]
}

pub fn dot(a: Vec3, b: Vec3) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

pub fn norm(a: Vec3) -> f64 {
    libm::sqrt(dot(a, a))
}

pub fn largest(a: Vec3) -> f64 {
    let mut result = 0.0;
    for component in a {
        if component.abs() > result {
            result = component.abs();
        }
    }
    result
}

pub fn matvec(a: Mat3, b: Vec3) -> Vec3 {
    [dot(a[0], b), dot(a[1], b), dot(a[2], b)]
}

pub fn conjugate(q: Quat) -> Quat {
    [q[0], -q[1], -q[2], -q[3]]
}

pub fn product(a: Quat, b: Quat) -> Quat {
    [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    ]
}

pub fn rotate(q: Quat, v: Vec3) -> Vec3 {
    let out = product(product(q, [0.0, v[0], v[1], v[2]]), conjugate(q));
    [out[1], out[2], out[3]]
}

// The exponential solves q' = q(0,w)/2 for constant w.
pub fn spin(w: Vec3, time: f64) -> Quat {
    let speed = norm(w);
    if speed == 0.0 {
        return IDENTITY;
    }
    let half_angle = 0.5 * speed * time;
    let factor = libm::sin(half_angle) / speed;
    [
        libm::cos(half_angle),
        factor * w[0],
        factor * w[1],
        factor * w[2],
    ]
}

pub fn attitude_error(actual: Quat, exact: Quat) -> f64 {
    // atan2 avoids acos rounding small errors to zero; abs(w) identifies q and -q.
    let delta = product(conjugate(exact), actual);
    2.0 * libm::atan2(norm([delta[1], delta[2], delta[3]]), delta[0].abs())
}

pub fn vector_close(label: &str, actual: Vec3, exact: Vec3, tolerance: f64) {
    let error = largest(sub(actual, exact));
    assert!(
        error <= tolerance,
        "{label}: actual={actual:?}, exact={exact:?}, error={error:e}, tolerance={tolerance:e}"
    );
}

pub fn rounding(count: u32, scale: f64) -> f64 {
    // 8(N+4)eps is the contract's vector rounding budget. Use Euclidean
    // scales for invariant/angle checks, allowing 8 more vector-sized
    // operations (tensor products, rotation, norm and analytic evaluation).
    8.0 * 8.0 * (f64::from(count) + 4.0) * f64::EPSILON * scale
}

pub fn converges(label: &str, errors: [f64; 3], order: u32, scale: f64) {
    // Order alone supplies no absolute error constant. At fixed T, E(h)=C h^p
    // gives E(h/2)/E(h)=2^-p. Allow half an order for pre-asymptotic terms:
    // <=2^-3.5 for p=4, <=2^-1.5 for p=2. These are predeclared finite-regime
    // checks, not an absolute bound implied by the contract.
    let divisor = f64::from(1_u32 << order) / libm::sqrt(2.0);
    for level in 0..2 {
        let floor = rounding(COUNTS[level + 1], scale);
        let tolerance = errors[level] / divisor + floor;
        assert!(
            errors[level + 1] <= tolerance,
            "{label}: errors={errors:?}, level={level}, tolerance={tolerance:e}"
        );
    }
}

// I=(A,B,B), p=wx is constant. Euler gives wy'=k wz, wz'=-k wy,
// k=(B-A)p/B. Hence the transverse rates rotate through -kt.
// With L0=I*w0, q=q0 exp((L0/B)t/2) exp((k ex)t/2):
// differentiating gives q^-1 q'= (0,w(t))/2 and the initial attitude.
pub fn symmetric_solution(initial: &State, time: f64) -> (Vec3, Quat) {
    let [p, b, c] = initial.angular_velocity;
    let a_inertia = BODY.inertia[0][0];
    let b_inertia = BODY.inertia[1][1];
    let k = (b_inertia - a_inertia) * p / b_inertia;
    let cosine = libm::cos(k * time);
    let sine = libm::sin(k * time);
    let rates = [p, b * cosine + c * sine, c * cosine - b * sine];
    let space_factor = spin([a_inertia * p / b_inertia, b, c], time);
    let body_factor = spin([k, 0.0, 0.0], time);
    (
        rates,
        product(product(initial.attitude, space_factor), body_factor),
    )
}

pub fn raw_bytes(input: &State) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(112);
    bytes.extend(input.tick.to_le_bytes());
    for component in input
        .position
        .iter()
        .chain(&input.velocity)
        .chain(&input.attitude)
        .chain(&input.angular_velocity)
    {
        bytes.extend(component.to_bits().to_le_bytes());
    }
    assert_eq!(bytes.len(), 112);
    bytes
}

pub fn own_fnv(mut hash: u64, bytes: &[u8]) -> u64 {
    for &byte in bytes {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

pub fn canonical_bytes(input: &State) -> Vec<u8> {
    let mut copy = *input;
    if copy
        .attitude
        .iter()
        .find(|&&component| component != 0.0)
        .is_some_and(|&component| component < 0.0)
    {
        copy.attitude = copy.attitude.map(|component| -component);
    }
    for component in copy
        .position
        .iter_mut()
        .chain(&mut copy.velocity)
        .chain(&mut copy.attitude)
        .chain(&mut copy.angular_velocity)
    {
        if *component == 0.0 {
            *component = 0.0;
        }
    }
    raw_bytes(&copy)
}
