//! Spin errors over one hour of free flight with zero external wrench.
//!
//! Steps `PLACEHOLDER_VEHICLE` with `spacebench_core::step` for 720,000 ticks
//! of `DT` (3600 s) and records the relative drift of two quantities that a
//! free rigid body conserves:
//!
//! - Rotational kinetic energy `E = 0.5 * dot(w, I w)`, relative error
//!   `|E(t) - E0| / E0`.
//! - Inertial angular momentum `L = R(q) (I w)`, relative error
//!   `||L(t) - L0|| / ||L0||`.
//!
//! The vehicle mass and inertia are ESTIMATES from the core crate. The output
//! is a hand-written SVG chart and a summary on stdout. The run uses no wall
//! clock, no OS randomness and no `std` float math.
//!
//! Run from the repository root:
//! `cargo run --locked --release -p spacebench-core --example spin_errors -- docs/spin-errors.svg`

use std::fmt::Write as _;
use std::path::Path;

use spacebench_core::{DT, Mat3, PLACEHOLDER_VEHICLE, Quat, State, Vec3, Wrench, step};

/// Ticks in one hour: 3600 s / 0.005 s.
const TOTAL_TICKS: u64 = 720_000;
/// Ticks between samples. 720,000 / 600 = 1,200 intervals, so 1,201 samples.
const SAMPLE_EVERY: u64 = 600;
/// Initial angular velocity in the body frame, rad/s. All three axes are active.
const W0: Vec3 = [0.15, 0.25, -0.10];
/// Floor for relative errors before log10. Must equal `10^FLOOR_DECADE`.
const ERROR_FLOOR: f64 = 1e-18;
/// Decade of `ERROR_FLOOR`, the bottom of the y axis.
const FLOOR_DECADE: i32 = -18;

/// SVG canvas and plot area, in user units.
const WIDTH: f64 = 960.0;
const HEIGHT: f64 = 704.0;
const PLOT_LEFT: f64 = 100.0;
const PLOT_RIGHT: f64 = 900.0;
const PLOT_TOP: f64 = 150.0;
const PLOT_BOTTOM: f64 = 510.0;
const ENERGY_COLOR: &str = "#1f6fb4";
const MOMENTUM_COLOR: &str = "#d9480f";

/// One sampled tick: the raw (unclamped) relative error of each quantity.
#[derive(Clone, Copy)]
struct Sample {
    tick: u64,
    energy_error: f64,
    momentum_error: f64,
}

/// Reference values taken from the initial state.
struct Baseline {
    energy: f64,
    momentum: Vec3,
    momentum_norm: f64,
}

impl Baseline {
    fn of(state: &State) -> Self {
        let momentum = inertial_angular_momentum(state);
        Self {
            energy: kinetic_energy(state),
            momentum_norm: norm(&momentum),
            momentum,
        }
    }

    fn measure(&self, state: &State) -> Sample {
        let energy_error = libm::fabs(kinetic_energy(state) - self.energy) / self.energy;
        let momentum = inertial_angular_momentum(state);
        let momentum_error = distance(&momentum, &self.momentum) / self.momentum_norm;
        Sample {
            tick: state.tick,
            energy_error,
            momentum_error,
        }
    }
}

/// Maximum and final raw relative errors over the samples.
struct Summary {
    max_energy: f64,
    final_energy: f64,
    max_momentum: f64,
    final_momentum: f64,
}

/// `m[row][column] * v`, each row summed in column order.
fn mat_vec(m: &Mat3, v: &Vec3) -> Vec3 {
    core::array::from_fn(|r| m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2])
}

fn dot(a: &Vec3, b: &Vec3) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn norm(v: &Vec3) -> f64 {
    libm::sqrt(dot(v, v))
}

fn distance(a: &Vec3, b: &Vec3) -> f64 {
    let d: Vec3 = core::array::from_fn(|k| a[k] - b[k]);
    norm(&d)
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

/// Body-frame vector to inertial frame: `q * (0, v) * conj(q)`.
fn rotate(q: &Quat, v: &Vec3) -> Vec3 {
    let pure: Quat = [0.0, v[0], v[1], v[2]];
    let conj: Quat = [q[0], -q[1], -q[2], -q[3]];
    let r = quat_mul(&quat_mul(q, &pure), &conj);
    [r[1], r[2], r[3]]
}

/// `E = 0.5 * dot(w, I w)`, with `I` the estimate inertia in the body frame.
fn kinetic_energy(state: &State) -> f64 {
    let w = &state.angular_velocity;
    0.5 * dot(w, &mat_vec(&PLACEHOLDER_VEHICLE.inertia, w))
}

/// `L = R(q) (I w)`, in the inertial frame.
fn inertial_angular_momentum(state: &State) -> Vec3 {
    let h_body = mat_vec(&PLACEHOLDER_VEHICLE.inertia, &state.angular_velocity);
    rotate(&state.attitude, &h_body)
}

/// Time in seconds, computed by multiplication and never by adding up `dt`.
fn seconds(tick: u64) -> f64 {
    (tick as f64) * DT
}

fn minutes(tick: u64) -> f64 {
    seconds(tick) / 60.0
}

/// Raises an error to the floor when it is below it. A comparison, not
/// `f64::max`, because `clippy.toml` bans `max`.
fn clamp_to_floor(error: f64) -> f64 {
    if error < ERROR_FLOOR { ERROR_FLOOR } else { error }
}

fn log10_clamped(error: f64) -> f64 {
    libm::log10(clamp_to_floor(error))
}

/// Steps the vehicle with zero wrench and returns the final state and one
/// sample every `SAMPLE_EVERY` ticks, including tick 0 and the last tick.
fn simulate(initial: State, baseline: &Baseline) -> (State, Vec<Sample>) {
    let zero = Wrench {
        force: [0.0; 3],
        torque: [0.0; 3],
    };
    let mut state = initial;
    let mut samples = vec![baseline.measure(&state)];
    for _ in 0..TOTAL_TICKS / SAMPLE_EVERY {
        for _ in 0..SAMPLE_EVERY {
            state = step(&PLACEHOLDER_VEHICLE, &state, &zero, DT);
        }
        samples.push(baseline.measure(&state));
    }
    (state, samples)
}

fn summarise(samples: &[Sample]) -> Option<Summary> {
    let last = samples.last()?;
    let mut max_energy = 0.0;
    let mut max_momentum = 0.0;
    for s in samples {
        if s.energy_error > max_energy {
            max_energy = s.energy_error;
        }
        if s.momentum_error > max_momentum {
            max_momentum = s.momentum_error;
        }
    }
    Some(Summary {
        max_energy,
        final_energy: last.energy_error,
        max_momentum,
        final_momentum: last.momentum_error,
    })
}

/// The top decade of the y axis: the highest clamped error rounded up to a
/// whole decade, plus one decade of headroom, and at least two decades above
/// the floor.
fn top_decade(samples: &[Sample]) -> i32 {
    let mut top_log = f64::from(FLOOR_DECADE);
    for s in samples {
        for error in [s.energy_error, s.momentum_error] {
            let log = log10_clamped(error);
            if log > top_log {
                top_log = log;
            }
        }
    }
    let mut top = libm::ceil(top_log) as i32 + 1;
    if top < FLOOR_DECADE + 2 {
        top = FLOOR_DECADE + 2;
    }
    top
}

/// Writes the chart as SVG text. Every number has a fixed precision, so the
/// same samples always give the same bytes.
fn render_svg(
    samples: &[Sample],
    summary: &Summary,
    baseline: &Baseline,
) -> Result<String, std::fmt::Error> {
    let top = top_decade(samples);
    let decades = f64::from(top - FLOOR_DECADE);
    let y_of = |log: f64| {
        PLOT_BOTTOM - (log - f64::from(FLOOR_DECADE)) / decades * (PLOT_BOTTOM - PLOT_TOP)
    };
    let x_of = |t_min: f64| PLOT_LEFT + t_min / 60.0 * (PLOT_RIGHT - PLOT_LEFT);
    let point_list = |error_of: fn(&Sample) -> f64| -> String {
        samples
            .iter()
            .map(|s| {
                let x = x_of(minutes(s.tick));
                let y = y_of(log10_clamped(error_of(s)));
                format!("{x:.2},{y:.2}")
            })
            .collect::<Vec<String>>()
            .join(" ")
    };
    let energy_points = point_list(|s| s.energy_error);
    let momentum_points = point_list(|s| s.momentum_error);
    let floor_y = y_of(f64::from(FLOOR_DECADE));
    let inertia = PLACEHOLDER_VEHICLE.inertia;

    let mut svg = String::new();
    writeln!(svg, r##"<?xml version="1.0" encoding="UTF-8"?>"##)?;
    writeln!(svg, r##"<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" font-family="Helvetica, Arial, sans-serif">"##)?;
    writeln!(svg, r##"<rect x="0" y="0" width="{WIDTH}" height="{HEIGHT}" fill="#ffffff"/>"##)?;

    // Title and run description.
    writeln!(svg, r##"<text x="32" y="38" font-size="20" font-weight="bold" fill="#111111">Spin errors over one hour of free flight, zero external wrench</text>"##)?;
    writeln!(svg, r##"<text x="32" y="60" font-size="12" fill="#333333">ESTIMATE vehicle: mass {:.0} kg, inertia diag({:.0}, {:.0}, {:.0}) kg m^2. Not a published Dragon value.</text>"##, PLACEHOLDER_VEHICLE.mass, inertia[0][0], inertia[1][1], inertia[2][2])?;
    writeln!(svg, r##"<text x="32" y="78" font-size="12" fill="#333333">Initial angular velocity w0 = ({:.2}, {:.2}, {:.2}) rad/s. dt = {DT} s. 720,000 ticks = 3600 s = 1 hour. 1,201 samples, one every 600 ticks.</text>"##, W0[0], W0[1], W0[2])?;
    writeln!(svg, r##"<text x="32" y="96" font-size="12" fill="#333333">Relative errors below {ERROR_FLOOR:e} are clamped to the floor {ERROR_FLOOR:e} (zeros clamped) before log10. Dashed line = floor.</text>"##)?;

    // Legend.
    writeln!(svg, r##"<line x1="100" y1="124" x2="128" y2="124" stroke="{ENERGY_COLOR}" stroke-width="2.5"/>"##)?;
    writeln!(svg, r##"<text x="136" y="128" font-size="12" fill="#111111">Relative kinetic energy error |E(t) - E0| / E0</text>"##)?;
    writeln!(svg, r##"<line x1="460" y1="124" x2="488" y2="124" stroke="{MOMENTUM_COLOR}" stroke-width="2.5"/>"##)?;
    writeln!(svg, r##"<text x="496" y="128" font-size="12" fill="#111111">Relative inertial angular momentum error ||L(t) - L0|| / ||L0||</text>"##)?;

    // Plot background and horizontal gridlines, one per decade.
    writeln!(svg, r##"<rect x="100" y="150" width="800" height="360" fill="#fafafa"/>"##)?;
    for d in FLOOR_DECADE..=top {
        let y = y_of(f64::from(d));
        let label_x = PLOT_LEFT - 8.0;
        let label_y = y + 4.0;
        writeln!(svg, r##"<line x1="{PLOT_LEFT}" y1="{y:.2}" x2="{PLOT_RIGHT}" y2="{y:.2}" stroke="#d8d8d8" stroke-width="1"/>"##)?;
        writeln!(svg, r##"<text x="{label_x:.2}" y="{label_y:.2}" font-family="Consolas, Menlo, monospace" font-size="11" text-anchor="end" fill="#333333">10^{d}</text>"##)?;
    }

    // Vertical gridlines, one per 10 minutes.
    for m in (0..=60_u32).step_by(10) {
        let x = x_of(f64::from(m));
        let label_y = PLOT_BOTTOM + 18.0;
        writeln!(svg, r##"<line x1="{x:.2}" y1="{PLOT_TOP}" x2="{x:.2}" y2="{PLOT_BOTTOM}" stroke="#e4e4e4" stroke-width="1"/>"##)?;
        writeln!(svg, r##"<text x="{x:.2}" y="{label_y}" font-size="11" text-anchor="middle" fill="#333333">{m}</text>"##)?;
    }

    // Floor: the clamped values sit on this dashed line.
    let floor_label_x = PLOT_RIGHT - 8.0;
    let floor_label_y = floor_y - 6.0;
    writeln!(svg, r##"<line x1="{PLOT_LEFT}" y1="{floor_y:.2}" x2="{PLOT_RIGHT}" y2="{floor_y:.2}" stroke="#444444" stroke-width="1.2" stroke-dasharray="6,4"/>"##)?;
    writeln!(svg, r##"<text x="{floor_label_x:.2}" y="{floor_label_y:.2}" font-size="11" text-anchor="end" fill="#444444">floor = {ERROR_FLOOR:e} (zeros clamped)</text>"##)?;

    // The two data series.
    writeln!(svg, r##"<polyline fill="none" stroke="{ENERGY_COLOR}" stroke-width="1.6" stroke-linejoin="round" points="{energy_points}"/>"##)?;
    writeln!(svg, r##"<polyline fill="none" stroke="{MOMENTUM_COLOR}" stroke-width="1.6" stroke-linejoin="round" points="{momentum_points}"/>"##)?;
    writeln!(svg, r##"<rect x="100" y="150" width="800" height="360" fill="none" stroke="#777777" stroke-width="1"/>"##)?;

    // Axis labels.
    writeln!(svg, r##"<text x="24" y="330" font-size="12" text-anchor="middle" transform="rotate(-90 24 330)" fill="#111111">log10(relative error), clamped at floor</text>"##)?;
    writeln!(svg, r##"<text x="500" y="550" font-size="12" text-anchor="middle" fill="#111111">Time (minutes, 0 to 60)</text>"##)?;

    // Summary block.
    writeln!(svg, r##"<rect x="100" y="576" width="800" height="112" rx="4" fill="#ffffff" stroke="#bbbbbb"/>"##)?;
    writeln!(svg, r##"<text x="116" y="598" font-size="13" font-weight="bold" fill="#111111">Summary: raw relative errors (not clamped), max and final over 1,201 samples</text>"##)?;
    writeln!(svg, r##"<text x="116" y="620" font-size="12" font-family="Consolas, Menlo, monospace" fill="#111111">kinetic energy          max = {:.6e}   final = {:.6e}</text>"##, summary.max_energy, summary.final_energy)?;
    writeln!(svg, r##"<text x="116" y="640" font-size="12" font-family="Consolas, Menlo, monospace" fill="#111111">angular momentum       max = {:.6e}   final = {:.6e}</text>"##, summary.max_momentum, summary.final_momentum)?;
    writeln!(svg, r##"<text x="116" y="660" font-size="12" font-family="Consolas, Menlo, monospace" fill="#111111">E0 = {:.4} J   |L0| = {:.4} kg m^2/s   w0 = ({:.2}, {:.2}, {:.2}) rad/s</text>"##, baseline.energy, baseline.momentum_norm, W0[0], W0[1], W0[2])?;

    writeln!(svg, "</svg>")?;
    Ok(svg)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let out_arg = std::env::args()
        .nth(1)
        .ok_or("usage: spin_errors <output.svg>")?;
    let out_path = Path::new(&out_arg);

    let initial = State {
        tick: 0,
        position: [0.0; 3],
        velocity: [0.0; 3],
        attitude: [1.0, 0.0, 0.0, 0.0],
        angular_velocity: W0,
    };
    let baseline = Baseline::of(&initial);
    let (last, samples) = simulate(initial, &baseline);

    if last.tick != TOTAL_TICKS {
        return Err(format!("expected {TOTAL_TICKS} ticks, got {}", last.tick).into());
    }
    let sample_ticks_ok = samples
        .iter()
        .enumerate()
        .all(|(i, s)| s.tick == i as u64 * SAMPLE_EVERY);
    if !sample_ticks_ok || samples.len() as u64 != TOTAL_TICKS / SAMPLE_EVERY + 1 {
        return Err("sample ticks are not 0, 600, ..., 720000".into());
    }

    let summary = summarise(&samples).ok_or("no samples")?;
    let svg = render_svg(&samples, &summary, &baseline)?;

    let parent = out_path.parent().filter(|p| !p.as_os_str().is_empty());
    if let Some(parent) = parent {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(out_path, svg)?;

    let inertia = PLACEHOLDER_VEHICLE.inertia;
    println!("ticks run: {} ({:.3} s)", last.tick, seconds(last.tick));
    println!("samples: {} (every {SAMPLE_EVERY} ticks)", samples.len());
    println!("floor: {ERROR_FLOOR:e} (zeros clamped before log10)");
    println!(
        "vehicle (ESTIMATE): mass {:.1} kg, inertia diag({:.1}, {:.1}, {:.1}) kg m^2",
        PLACEHOLDER_VEHICLE.mass, inertia[0][0], inertia[1][1], inertia[2][2]
    );
    println!("initial w0 (rad/s): [{:.2}, {:.2}, {:.2}]", W0[0], W0[1], W0[2]);
    println!("initial kinetic energy E0 (J): {:.6}", baseline.energy);
    println!("initial |L0| (kg m^2/s): {:.6}", baseline.momentum_norm);
    println!(
        "kinetic energy relative error: max {:.6e}, final {:.6e}",
        summary.max_energy, summary.final_energy
    );
    println!(
        "angular momentum relative error: max {:.6e}, final {:.6e}",
        summary.max_momentum, summary.final_momentum
    );
    println!("wrote {}", out_path.display());
    Ok(())
}
