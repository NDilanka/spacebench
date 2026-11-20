use crate::support::*;
use spacebench_core::{DT, Mat3, State, Vec3, Vehicle, Wrench};

// Asserts |actual-exact| <= factor*|exact| using the Euclidean norm, with every
// quantity finite. A zero exact vector therefore has to be matched exactly.
fn euclidean_within(label: &str, actual: Vec3, exact: Vec3, factor: f64) {
    let error = norm(sub(actual, exact));
    let bound = factor * norm(exact);
    assert!(
        error.is_finite() && bound.is_finite() && error <= bound,
        "{label}: actual={actual:?}, exact={exact:?}, error={error:e}, bound={bound:e}"
    );
}

#[test]
fn constant_force_without_rotation_matches_rounding_bound_at_two_attitudes() {
    // With w=tau=0, R is constant; integrate v'=a=RF/m twice:
    // v=v0+at, x=x0+v0*t+a*t^2/2. Both selected attitudes permute the
    // positive force components, so all x,v components increase: the largest
    // vector magnitude occurs at the endpoint.
    let count = 400;
    let time = f64::from(count) * DT;
    for attitude in [IDENTITY, [0.5, 0.5, 0.5, 0.5]] {
        let initial = state([1.0, 2.0, 3.0], [0.3, 0.4, 0.5], attitude, [0.0; 3]);
        let wrench = Wrench {
            force: [5.0, 10.0, 15.0],
            torque: [0.0; 3],
        };
        let acceleration = scale(rotate(attitude, wrench.force), 1.0 / BODY.mass);
        let exact_v = add(initial.velocity, scale(acceleration, time));
        let exact_x = add(
            add(initial.position, scale(initial.velocity, time)),
            scale(acceleration, 0.5 * time * time),
        );
        // Contract straight-push bound: each vector agrees with its closed form
        // to 8(N+4)eps times its Euclidean norm. The check measures the
        // Euclidean norm of the error, which is at least its largest component.
        let factor = 8.0 * (f64::from(count) + 4.0) * f64::EPSILON;
        let actual = integrate(&BODY, initial, &wrench, time, count);
        euclidean_within("constant-force position", actual.position, exact_x, factor);
        euclidean_within("constant-force velocity", actual.velocity, exact_v, factor);
    }
}

#[test]
fn constant_principal_axis_torque_from_rest_matches_rate_and_attitude() {
    // Starting on a principal axis makes w x Iw=0 forever:
    // w=alpha*t, alpha=tau/Iaxis. Integrating q'=q(0,w)/2 gives the
    // body-axis angle theta=alpha*t^2/2, hence q=q0*spin(axis,theta).
    // The measured rate and attitude errors are about 1e-15 at every mesh,
    // which is rounding. The converges() checks below therefore pass on their
    // rounding floor; they confirm agreement to rounding, not a fourth order.
    for axis in 0..3 {
        for sign in [-1.0, 1.0] {
            let alpha = sign * 0.6;
            let mut unit = [0.0; 3];
            unit[axis] = 1.0;
            let initial = state([0.0; 3], [0.0; 3], spin([0.2, -0.3, 0.4], 1.0), [0.0; 3]);
            let wrench = Wrench {
                force: [0.0; 3],
                torque: scale(unit, alpha * BODY.inertia[axis][axis]),
            };
            let exact_rate = scale(unit, alpha * DURATION);
            let exact_q = product(
                initial.attitude,
                spin(unit, 0.5 * alpha * DURATION * DURATION),
            );
            let mut rate_errors = [0.0; 3];
            let mut angle_errors = [0.0; 3];
            for (level, count) in COUNTS.into_iter().enumerate() {
                let actual = integrate(&BODY, initial, &wrench, DURATION, count);
                rate_errors[level] = norm(sub(actual.angular_velocity, exact_rate));
                angle_errors[level] = attitude_error(actual.attitude, exact_q);
            }
            converges("principal torque rate", rate_errors, 4, norm(exact_rate));
            converges(
                "principal torque attitude",
                angle_errors,
                4,
                1.0 + alpha.abs() * DURATION * DURATION / 2.0,
            );
        }
    }
}

#[test]
fn torque_free_principal_axis_spin_has_constant_rate_and_exponential_attitude() {
    // For a principal-axis w, w x Iw=0, so w=w0. The constant-coefficient
    // quaternion ODE exponentiates: q=q0*[cos(|w|t/2), w*sin(|w|t/2)/|w|].
    // h=.08,.04,.02 gives |w|h=.136,.068,.034. The measured attitude errors
    // are 1e-16 to 1e-15 at every mesh, which is rounding, not truncation. The
    // converges() check below therefore passes on its rounding floor and does
    // not measure an order.
    for axis in 0..3 {
        for sign in [-1.0, 1.0] {
            let mut rate = [0.0; 3];
            rate[axis] = 1.7 * sign;
            let initial = state([0.0; 3], [0.0; 3], spin([-0.3, 0.2, 0.4], 1.0), rate);
            let exact = product(initial.attitude, spin(rate, DURATION));
            let mut angle_errors = [0.0; 3];
            for (level, count) in COUNTS.into_iter().enumerate() {
                let actual = integrate(&BODY, initial, &ZERO_WRENCH, DURATION, count);
                vector_close(
                    "constant principal rate",
                    actual.angular_velocity,
                    rate,
                    rounding(count, norm(rate)),
                );
                angle_errors[level] = attitude_error(actual.attitude, exact);
            }
            converges(
                "principal spin attitude",
                angle_errors,
                4,
                1.0 + norm(rate) * DURATION,
            );
        }
    }
}

fn symmetric_initial() -> State {
    state(
        [0.4, -0.2, 0.3],
        [-0.3, 0.6, 0.2],
        spin([0.2, -0.4, 0.3], 1.0),
        [1.3, -0.8, 1.1],
    )
}

#[test]
fn torque_free_axisymmetric_body_matches_closed_form_rates_and_attitude() {
    // Euler: p'=0, b'=k c, c'=-k b, k=(B-A)p/B. Thus
    // (wy,wz)=(b cos kt+c sin kt, c cos kt-b sin kt).
    // Conserved inertial L supplies a left rotation at |L|/B; the residual
    // right body-x rotation is k, giving q=q0 exp(L0*t/(2B)) exp(k ex*t/2).
    // |w|h=.150,.075,.038. Use the fourth-order refinement tolerance.
    let initial = symmetric_initial();
    let (exact_rate, exact_q) = symmetric_solution(&initial, DURATION);
    let mut rate_errors = [0.0; 3];
    let mut angle_errors = [0.0; 3];
    for (level, count) in COUNTS.into_iter().enumerate() {
        let actual = integrate(&BODY, initial, &ZERO_WRENCH, DURATION, count);
        rate_errors[level] = norm(sub(actual.angular_velocity, exact_rate));
        angle_errors[level] = attitude_error(actual.attitude, exact_q);
    }
    converges("symmetric rates", rate_errors, 4, norm(exact_rate));
    converges(
        "symmetric attitude",
        angle_errors,
        4,
        1.0 + norm(exact_rate) * DURATION,
    );
}

fn invariants(body: &Vehicle<'_>, input: &State) -> (f64, Vec3, Vec3) {
    let body_momentum = matvec(body.inertia, input.angular_velocity);
    (
        0.5 * dot(input.angular_velocity, body_momentum),
        rotate(input.attitude, body_momentum),
        scale(input.velocity, body.mass),
    )
}

#[test]
fn torque_free_tumbling_conserves_energy_inertial_angular_and_linear_momentum() {
    // E=w.Iw/2: E'=w.(I w')=-w.(w x Iw)=0.
    // H=R Iw: H'=R[w x Iw+I w']=0. P=mv: P'=0.
    // Check maxima over the same 32 physical checkpoints, not just an endpoint
    // at which errors could cancel. Fourth-order state errors imply at least
    // fourth-order errors in these smooth invariants. Use the same refinement
    // rule; P has no applied force and uses only the rounding budget.
    let body = Vehicle {
        inertia: [[2.0, 0.0, 0.0], [0.0, 3.0, 0.0], [0.0, 0.0, 4.0]],
        ..BODY
    };
    let initial = symmetric_initial();
    let (energy, angular, linear) = invariants(&body, &initial);
    let mut energy_errors = [0.0; 3];
    let mut angular_errors = [0.0; 3];
    for (level, count) in COUNTS.into_iter().enumerate() {
        let mut actual = initial;
        for tick in 1..=count {
            actual = advance(&body, &actual, &ZERO_WRENCH, DURATION / f64::from(count));
            if tick % (count / COUNTS[0]) == 0 {
                let (e, h, p) = invariants(&body, &actual);
                let e_error = (e - energy).abs();
                let h_error = norm(sub(h, angular));
                if e_error > energy_errors[level] {
                    energy_errors[level] = e_error;
                }
                if h_error > angular_errors[level] {
                    angular_errors[level] = h_error;
                }
                vector_close("linear momentum", p, linear, rounding(count, norm(linear)));
            }
        }
    }
    converges("rotational energy", energy_errors, 4, energy);
    converges(
        "inertial angular momentum",
        angular_errors,
        4,
        norm(angular),
    );
}

fn spinning_force_initial() -> State {
    state(
        [1.0, -2.0, 0.5],
        [-0.3, 0.2, 0.4],
        spin([0.2, -0.4, 0.3], 1.0),
        [0.0, 0.0, 2.0],
    )
}

const SPINNING_FORCE: Wrench = Wrench {
    force: [4.0, -1.5, 1.0],
    torque: [0.0; 3],
};

fn spinning_force_solution(initial: &State, time: f64) -> (Vec3, Vec3) {
    // In the initial-body frame, a(t)=Rz(wt)*(ax,ay,az).
    // Integrating sine/cosine gives dv=(ax sin/w+ay(cos-1)/w,
    // ax(1-cos)/w+ay sin/w, az*t).
    // A second integration gives dx=(ax(1-cos)/w²+ay(sin/w²-t/w),
    // ax(t/w-sin/w²)+ay(1-cos)/w², az*t²/2).
    // Rotate these integrals by q0, then add v0 and x0+v0*t.
    let [ax, ay, az] = scale(SPINNING_FORCE.force, 1.0 / BODY.mass);
    let w = initial.angular_velocity[2];
    let sine = libm::sin(w * time);
    let cosine = libm::cos(w * time);
    let w2 = w * w;
    let delta_v = [
        ax * sine / w + ay * (cosine - 1.0) / w,
        ax * (1.0 - cosine) / w + ay * sine / w,
        az * time,
    ];
    let delta_x = [
        ax * (1.0 - cosine) / w2 + ay * (sine / w2 - time / w),
        ax * (time / w - sine / w2) + ay * (1.0 - cosine) / w2,
        az * time * time / 2.0,
    ];
    (
        add(
            add(initial.position, scale(initial.velocity, time)),
            rotate(initial.attitude, delta_x),
        ),
        add(initial.velocity, rotate(initial.attitude, delta_v)),
    )
}

#[test]
fn body_fixed_force_on_spinning_vehicle_matches_closed_form_position_and_velocity() {
    // The integrals are derived in spinning_force_solution, without a numerical
    // reference integrator. Use the at-least-second-order refinement budget;
    // |w|h=.16,.08,.04 lies in the contract's truncation-dominated range.
    let initial = spinning_force_initial();
    let (exact_x, exact_v) = spinning_force_solution(&initial, DURATION);
    let mut position_errors = [0.0; 3];
    let mut velocity_errors = [0.0; 3];
    for (level, count) in COUNTS.into_iter().enumerate() {
        let actual = integrate(&BODY, initial, &SPINNING_FORCE, DURATION, count);
        position_errors[level] = norm(sub(actual.position, exact_x));
        velocity_errors[level] = norm(sub(actual.velocity, exact_v));
    }
    let acceleration = norm(SPINNING_FORCE.force) / BODY.mass;
    converges(
        "spinning-force position",
        position_errors,
        2,
        norm(initial.position)
            + norm(initial.velocity) * DURATION
            + acceleration * DURATION * DURATION / 2.0,
    );
    converges(
        "spinning-force velocity",
        velocity_errors,
        2,
        norm(initial.velocity) + acceleration * DURATION,
    );
}

fn tensor_in_rotated_body_frame(rotation: [f64; 4], diagonal: Mat3) -> Mat3 {
    // S maps new body coordinates to old ones. Kinetic energy is unchanged:
    // w_old=S*w_new, so I_new=S^T I_old S. Build each matrix entry by
    // column_i(S).I_old.column_j(S); no inversion from the core is reused.
    let columns = [
        rotate(rotation, [1.0, 0.0, 0.0]),
        rotate(rotation, [0.0, 1.0, 0.0]),
        rotate(rotation, [0.0, 0.0, 1.0]),
    ];
    let mut tensor = [[0.0; 3]; 3];
    for i in 0..3 {
        for j in 0..=i {
            let value = dot(columns[i], matvec(diagonal, columns[j]));
            tensor[i][j] = value;
            tensor[j][i] = value;
        }
    }
    tensor
}

#[test]
fn full_inertia_tensor_is_covariant_under_body_frame_rotation() {
    // S changes only the description, not the body: I_new=S^T I S,
    // w_new=S^T w, q_new=q_old*S. Therefore q_new*S^-1 and S*w_new
    // equal the symmetric closed form, and R(q_new)I_new*w_new equals its
    // inertial momentum. Rate, attitude and momentum errors are checked for
    // fourth order. Measured rate errors fall by 16 per halving
    // (1.8e-8, 1.1e-9, 7.1e-11), but at N=128 the rate error is about 20 times
    // its rounding floor, below the 100x guard used elsewhere. The frame
    // equivalence errors (about 5e-15) are rounding-level, so that check
    // passes on its floor. The transformed tensor is rounded to double; this
    // test does not bound that change separately.
    let original = symmetric_initial();
    let frame = spin([0.4, -0.7, 0.2], 1.0);
    let body = Vehicle {
        inertia: tensor_in_rotated_body_frame(frame, BODY.inertia),
        ..BODY
    };
    assert!(body.inertia[0][1].abs() > 0.01);
    assert!(body.inertia[0][2].abs() > 0.01);
    assert!(body.inertia[1][2].abs() > 0.01);
    let transformed = state(
        original.position,
        original.velocity,
        product(original.attitude, frame),
        rotate(conjugate(frame), original.angular_velocity),
    );
    let (exact_rate, exact_q) = symmetric_solution(&original, DURATION);
    let (_, exact_h, _) = invariants(&BODY, &original);
    let mut rate_errors = [0.0; 3];
    let mut angle_errors = [0.0; 3];
    let mut momentum_errors = [0.0; 3];
    let mut frame_errors = [0.0; 3];
    for (level, count) in COUNTS.into_iter().enumerate() {
        let actual = integrate(&body, transformed, &ZERO_WRENCH, DURATION, count);
        let ordinary = integrate(&BODY, original, &ZERO_WRENCH, DURATION, count);
        let old_rate = rotate(frame, actual.angular_velocity);
        let old_q = product(actual.attitude, conjugate(frame));
        rate_errors[level] = norm(sub(old_rate, exact_rate));
        angle_errors[level] = attitude_error(old_q, exact_q);
        momentum_errors[level] = norm(sub(invariants(&body, &actual).1, exact_h));
        frame_errors[level] = attitude_error(old_q, ordinary.attitude)
            + norm(sub(old_rate, ordinary.angular_velocity)) * DURATION;
        // Translation is force free in both descriptions. Its closed form
        // x=x0+v0*T is exact up to accumulated rounding.
        let exact_x = add(original.position, scale(original.velocity, DURATION));
        vector_close(
            "rotated-frame position",
            actual.position,
            exact_x,
            rounding(
                count,
                norm(original.position) + norm(original.velocity) * DURATION,
            ),
        );
        vector_close(
            "rotated-frame velocity",
            actual.velocity,
            original.velocity,
            rounding(count, norm(original.velocity)),
        );
    }
    converges("full-tensor rates", rate_errors, 4, norm(exact_rate));
    converges(
        "full-tensor attitude",
        angle_errors,
        4,
        1.0 + norm(exact_rate) * DURATION,
    );
    converges("full-tensor momentum", momentum_errors, 4, norm(exact_h));
    converges(
        "body-frame equivalence",
        frame_errors,
        4,
        1.0 + norm(exact_rate) * DURATION,
    );
}

#[test]
fn rotational_error_at_dt_half_dt_quarter_dt_shows_fourth_order() {
    // Torque-free I=diag(A,B,B), A=2, B=3: Euler gives p'=0,
    // b'=k*c, c'=-k*b, k=(B-A)*p/B=2. Thus with w0=[6,8,0],
    // w(t)=[6,8*cos(2t),-8*sin(2t)]: its body direction changes.
    // Derive q=exp((0,u)t/2)*exp((0,k*ex)t/2), u=[A*p/B,8,0]=[4,8,0]:
    // q^-1*q'=(0,Rx(-k*t)*u+k*ex)/2=(0,w(t))/2, and q(0)=1.
    // This independently checks symmetric_solution's formula and signs.
    //
    // The coarse meshes are deliberately large: |w|h=.35 at N=4, so truncation
    // is visible above rounding. T=.14 and N=4,8,16 keep accumulated spin and
    // the step-count rounding budget small.
    //
    // A-priori planning estimate, not a bound or measured error:
    // E ~ C*(|w|h)^4*|w|T, |w|=10, |w|T=1.4, assume C=1e-5.
    // This is pessimistically ~50x below the quaternion RK4 phase
    // coefficient 1/1920 (arg R(ix)=x-x^5/120+O(x^7), x=|w|h/2),
    // allowing smaller constants/cancellation without knowing the method.
    // No nonzero error constant is promised; the measured guard is decisive.
    // rounding(N,1+|w|T)=64*(N+4)*eps*2.4 gives:
    // N    h        |w|h    E estimate    rounding       E/rounding
    // 4    .035     .35     2.100875e-7   2.728484e-13   7.699788e5
    // 8    .0175    .175    1.313047e-8   4.092726e-13   3.208245e4
    // 16   .00875   .0875   8.206543e-10  6.821210e-13   1.203092e3
    // Even the finest estimate clears the 100-budget guard by ~12x.
    // Every mesh must clear that guard or this experiment claims no order.
    // Keep both refinement rules E(h/2)<=E(h)/2^3.5+rounding unchanged.
    let duration = 0.14;
    let counts = [4, 8, 16];
    let rate = [6.0, 8.0, 0.0];
    let initial = state([0.0; 3], [0.0; 3], IDENTITY, rate);
    let (_, exact) = symmetric_solution(&initial, duration);
    let mut errors = [0.0; 3];
    for (level, count) in counts.into_iter().enumerate() {
        let actual = integrate(&BODY, initial, &ZERO_WRENCH, duration, count);
        errors[level] = attitude_error(actual.attitude, exact);
    }
    let scale = 1.0 + norm(rate) * duration;
    let budgets = counts.map(|count| rounding(count, scale));
    for level in 0..3 {
        assert!(
            errors[level] > 100.0 * budgets[level],
            "rotation order experiment is rounding dominated: errors={errors:?}, budgets={budgets:?}, level={level}"
        );
    }
    for level in 0..2 {
        let tolerance = errors[level] / libm::sqrt(128.0) + rounding(counts[level + 1], scale);
        assert!(
            errors[level + 1] <= tolerance,
            "rotation needs order >=3.5: {errors:?}"
        );
    }
}

#[test]
fn rotating_translation_error_shows_at_least_second_order() {
    // Same analytic sine/cosine integrals as the force test. Combining
    // |dx_error|+T*|dv_error| gives one length-valued error. For p>=2 its
    // refinement ratio is <=1/4 asymptotically; allow half an order:
    // E(h/2)<=E(h)/2^1.5 + rounding. h|w|=.16,.08,.04.
    let initial = spinning_force_initial();
    let (exact_x, exact_v) = spinning_force_solution(&initial, DURATION);
    let scale = norm(initial.position)
        + norm(initial.velocity) * DURATION
        + norm(SPINNING_FORCE.force) / BODY.mass * DURATION * DURATION;
    let mut errors = [0.0; 3];
    for (level, count) in COUNTS.into_iter().enumerate() {
        let actual = integrate(&BODY, initial, &SPINNING_FORCE, DURATION, count);
        errors[level] =
            norm(sub(actual.position, exact_x)) + DURATION * norm(sub(actual.velocity, exact_v));
    }
    assert!(
        errors[0] > 100.0 * rounding(COUNTS[0], scale),
        "translation order experiment is rounding dominated: {errors:?}"
    );
    for level in 0..2 {
        let tolerance = errors[level] / libm::sqrt(8.0) + rounding(COUNTS[level + 1], scale);
        assert!(
            errors[level + 1] <= tolerance,
            "translation needs order >=1.5: {errors:?}"
        );
    }
}

const PRECESSING_FORCE: Wrench = Wrench {
    force: [3.0, 0.0, 0.0],
    torque: [0.0; 3],
};

// Closed form for body-x thrust on a torque-free body with I=diag(A,B,B).
// Write w0=(p,b,c), k=(B-A)p/B, u=(A p/B, b, c), Omega=|u|, n=u/Omega.
// - symmetric_solution gives q(t)=q0*spin(u,t)*spin(k ex,t).
// - spin(k ex,t) leaves ex fixed, so R(q(t)) ex = R(q0) Rot(n,Omega t) ex.
// - Rodrigues: Rot(n,th) ex = ex cos th + (n x ex) sin th + n (n.ex)(1-cos th).
// - The translation equations are m v' = R(q) F and x' = v, with F = f ex.
// Integrating the three Rodrigues terms over [0,T] gives
//   v(T) = v0 + (f/m) R(q0) [ex J1c + (n x ex) J1s + n (n.ex) J1m],
//   J1c = sin(OT)/O, J1s = (1-cos OT)/O, J1m = T - sin(OT)/O.
// Using x(T) = x0 + v0 T + int_0^T (T-t) a(t) dt gives
//   x(T) = x0 + v0 T + (f/m) R(q0) [ex J2c + (n x ex) J2s + n (n.ex) J2m],
//   J2c = (1-cos OT)/O^2, J2s = T/O - sin(OT)/O^2, J2m = T^2/2 - (1-cos OT)/O^2.
fn precessing_translation_solution(initial: &State, time: f64) -> (Vec3, Vec3) {
    let [p, b, c] = initial.angular_velocity;
    let u = [BODY.inertia[0][0] * p / BODY.inertia[1][1], b, c];
    let omega = norm(u);
    let n = scale(u, 1.0 / omega);
    let n_dot_x = n[0];
    let n_cross_x = cross(n, [1.0, 0.0, 0.0]);
    let cosine = libm::cos(omega * time);
    let sine = libm::sin(omega * time);
    let omega_sq = omega * omega;
    let body_term = |c_ex: f64, c_cross: f64, c_n: f64| {
        add(
            add(scale([1.0, 0.0, 0.0], c_ex), scale(n_cross_x, c_cross)),
            scale(n, n_dot_x * c_n),
        )
    };
    let v_term = body_term(sine / omega, (1.0 - cosine) / omega, time - sine / omega);
    let x_term = body_term(
        (1.0 - cosine) / omega_sq,
        time / omega - sine / omega_sq,
        time * time / 2.0 - (1.0 - cosine) / omega_sq,
    );
    let accel = PRECESSING_FORCE.force[0] / BODY.mass;
    let delta_v = scale(rotate(initial.attitude, v_term), accel);
    let delta_x = scale(rotate(initial.attitude, x_term), accel);
    (
        add(add(initial.position, scale(initial.velocity, time)), delta_x),
        add(initial.velocity, delta_v),
    )
}

#[test]
fn precessing_body_x_thrust_translation_shows_at_least_second_order() {
    // The body rate direction changes over the run (I=diag(2,3,3), zero torque),
    // so the attitude that carries the body-x thrust changes too. The core's
    // translation step is Simpson's rule on R(q)F/m, so the error here is
    // truncation, not rounding. The guards check that at every mesh.
    // converges(..., 2, ...) is the contract's "at least second order" claim.
    // It bounds the error ratio from above only, so a higher order also passes.
    let initial = symmetric_initial();
    let (exact_x, exact_v) = precessing_translation_solution(&initial, DURATION);
    let accel = norm(PRECESSING_FORCE.force) / BODY.mass;
    let position_scale = norm(initial.position)
        + norm(initial.velocity) * DURATION
        + accel * DURATION * DURATION / 2.0;
    let velocity_scale = norm(initial.velocity) + accel * DURATION;
    let mut position_errors = [0.0; 3];
    let mut velocity_errors = [0.0; 3];
    for (level, count) in COUNTS.into_iter().enumerate() {
        let actual = integrate(&BODY, initial, &PRECESSING_FORCE, DURATION, count);
        position_errors[level] = norm(sub(actual.position, exact_x));
        velocity_errors[level] = norm(sub(actual.velocity, exact_v));
        assert!(
            position_errors[level] > 100.0 * rounding(count, position_scale),
            "precessing position is rounding dominated at N={count}: errors={position_errors:?}"
        );
        assert!(
            velocity_errors[level] > 100.0 * rounding(count, velocity_scale),
            "precessing velocity is rounding dominated at N={count}: errors={velocity_errors:?}"
        );
    }
    converges("precessing position", position_errors, 2, position_scale);
    converges("precessing velocity", velocity_errors, 2, velocity_scale);
}

#[test]
fn non_diagonal_inertia_with_torque_matches_closed_form_to_rounding() {
    // I=[[3,1,0],[1,3,0],[0,0,3]] is symmetric and positive definite, with
    // eigenvalues 4, 2, 3. Its eigenvector [1,1,0] has eigenvalue 4, so
    // I [t,t,0] = [4t,4t,0]. Try w(t)=[t,t,0] with tau=[4,4,0]: w x (I w)=0
    // because the two vectors are parallel, and I w' = I [1,1,0] = [4,4,0] = tau,
    // so w'=[1,1,0]. With w(0)=0 this gives w(t)=[t,t,0] exactly.
    // Ignoring the off-diagonal 1s would give diag(3,3,3) and w'=[4/3,4/3,0],
    // so w(T)=[4T/3,4T/3,0], which the tolerance below rejects.
    // Along the fixed axis u=[1,1,0]/sqrt(2), |w|=sqrt(2) t, so the angle is
    // theta(t)=int_0^t sqrt(2) s ds = (sqrt(2)/2) t^2 and
    // q(t)=[cos(theta/2), sin(theta/2) u_x, sin(theta/2) u_y, 0].
    // Check: q^-1 q' = (0, |w| u)/2 = (0, w)/2, with q(0)=1.
    // The body axis never moves, so the core's steps are exact up to rounding
    // here. This is a rounding-floor agreement check, not an order measurement.
    let body = Vehicle {
        inertia: [[3.0, 1.0, 0.0], [1.0, 3.0, 0.0], [0.0, 0.0, 3.0]],
        ..BODY
    };
    let wrench = Wrench {
        force: [0.0; 3],
        torque: [4.0, 4.0, 0.0],
    };
    let initial = state([0.0; 3], [0.0; 3], IDENTITY, [0.0; 3]);
    let time = DURATION;
    let exact_w = [time, time, 0.0];
    let half = libm::sqrt(2.0) / 4.0 * time * time;
    let axis = 1.0 / libm::sqrt(2.0);
    let exact_q = [
        libm::cos(half),
        libm::sin(half) * axis,
        libm::sin(half) * axis,
        0.0,
    ];
    for count in COUNTS {
        let actual = integrate(&body, initial, &wrench, time, count);
        vector_close(
            "non-diagonal angular velocity",
            actual.angular_velocity,
            exact_w,
            rounding(count, norm(exact_w)),
        );
        let angle = attitude_error(actual.attitude, exact_q);
        let tolerance = rounding(count, 1.0);
        assert!(
            angle.is_finite() && angle <= tolerance,
            "non-diagonal attitude: angle={angle:e}, tolerance={tolerance:e}"
        );
    }
}

#[test]
fn largest_reports_nan_from_any_component() {
    // largest must not skip NaN: a NaN in any position makes the result NaN.
    assert!(largest([1.0, f64::NAN, 2.0]).is_nan());
    assert!(largest([f64::NAN, 0.0, 0.0]).is_nan());
}

#[test]
#[should_panic(expected = "single-NaN negative control")]
fn vector_close_rejects_one_nan_among_finite_components() {
    // Negative control: two components match exactly, but a NaN in the third must still fail.
    vector_close(
        "single-NaN negative control",
        [1.0, f64::NAN, 2.0],
        [1.0, 0.0, 2.0],
        1.0,
    );
}

#[test]
#[should_panic(expected = "non-finite")]
fn converges_rejects_infinite_errors() {
    // Negative control: +inf errors would satisfy inf <= inf, so the finiteness guard must fire first.
    converges(
        "infinite-errors",
        [f64::INFINITY, f64::INFINITY, f64::INFINITY],
        2,
        1.0,
    );
}

#[test]
fn long_run_normalizes_attitude_increments_tick_and_preserves_inputs() {
    // A fresh renormalization each step prevents N-fold norm drift. Four
    // squares, three additions, sqrt and four divisions give roughly 13
    // roundings; 16eps covers their first-order norm error independently of N.
    // Tick and input preservation are exact bit comparisons, not tolerances.
    let mut current = symmetric_initial();
    current.tick = 19;
    let body = BODY;
    let wrench = Wrench {
        force: [0.1, -0.2, 0.3],
        torque: [0.02, -0.01, 0.015],
    };
    let body_before = body;
    let wrench_before = wrench;
    for index in 0..20_000_u64 {
        let before = raw_bytes(&current);
        let next = advance(&body, &current, &wrench, DT);
        assert_eq!(raw_bytes(&current), before);
        assert_eq!(body, body_before);
        assert_eq!(wrench, wrench_before);
        assert_eq!(next.tick, 20 + index);
        let squared_length: f64 = next
            .attitude
            .into_iter()
            .map(|component| component * component)
            .sum();
        assert!(
            (squared_length - 1.0).abs() <= 16.0 * f64::EPSILON,
            "tick {} norm²={squared_length}",
            next.tick
        );
        current = next;
    }
}
