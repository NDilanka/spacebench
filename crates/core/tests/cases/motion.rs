use crate::support::*;
use spacebench_core::{DT, Mat3, State, Vec3, Vehicle, Wrench};

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
        // The contract bounds each vector by 8(N+4)eps times its largest
        // magnitude. Interpret vector magnitude as Euclidean norm; using it
        // to bound each component cannot reject a vector within that bound.
        let factor = 8.0 * (f64::from(count) + 4.0) * f64::EPSILON;
        let position_tolerance = factor * norm(exact_x);
        let velocity_tolerance = factor * norm(exact_v);
        let actual = integrate(&BODY, initial, &wrench, time, count);
        vector_close(
            "constant-force position",
            actual.position,
            exact_x,
            position_tolerance,
        );
        vector_close(
            "constant-force velocity",
            actual.velocity,
            exact_v,
            velocity_tolerance,
        );
    }
}

#[test]
fn constant_principal_axis_torque_from_rest_matches_rate_and_attitude() {
    // Starting on a principal axis makes w x Iw=0 forever:
    // w=alpha*t, alpha=tau/Iaxis. Integrating q'=q(0,w)/2 gives the
    // body-axis angle theta=alpha*t^2/2, hence q=q0*spin(axis,theta).
    // Rates and attitude use the predeclared fourth-order refinement budget
    // in converges(); the contract supplies no absolute rotational constant.
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
    // h=.08,.04,.02 gives |w|h=.136,.068,.034, above the rounding regime.
    // Apply the fourth-order refinement rule plus its stated rounding floor.
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
    // equal the case-7 closed form, and R(q_new)I_new*w_new equals its
    // inertial momentum. Both frame descriptions must converge at order four.
    // Rounding the transformed tensor adds O(eps) representation error,
    // covered by rounding(); refinement tolerances are fixed in advance.
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
    // The person's instruction is to use a fast spin or larger steps:
    // |w|h=.35 deliberately exceeds step's roughly .01--.2 guidance at
    // the coarsest mesh. T=.14 and N=4,8,16 keep accumulated spin and
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
