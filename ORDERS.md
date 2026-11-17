# ORDERS

Append-only. The lead is the only writer. Add lines. Never edit earlier ones.
Workers never touch this file.

## 2026-11-17 Build step 1: simulation core prototype

### 2026-11-17T15:40+05:30 Decisions by the person

- The spec "SpaceBench build step 1: simulation core prototype" is approved, including the split into orders 1, 2 and 3 (round one) and orders 4 and 5 (round two).
- Round one runs as three workers in parallel. All build output stays on `D:`.
- Exception to the `AGENTS.md` table, for order 2 only: `pv-sol-high` writes the physics tests. It is a different lab from the builder. It therefore does not review the tests later.
- When the tests and the core disagree after landing, `pv-opus-high` decides read-only, from the derivation, which side is wrong. The fix is a new order on that side's paths. A tolerance changes only with a written derivation.
- The determinism gate compares the chained hash at several tick counts for several seeds, and bisects on the tick count when they differ. It compares the two builds live and never pins an expected hash value.
- Landing order is 3, then 2, then 1, so the gate exists for every receipt. Expected gate on `main`: red, red, green.

### 2026-11-17T15:40+05:30 Contract

- The contract is the commit that adds this file. It is signatures only: every body in `crates/core/src/lib.rs` is `todo!()`. It is not done and nothing in it works.
- Shared files, frozen for workers: `Cargo.toml`, `Cargo.lock`, `clippy.toml`, `crates/core/Cargo.toml`, `crates/wasm/Cargo.toml`, `ORDERS.md`, `AGENTS.md`, `DESIGN.md`.
- Checks run by the lead before the commit, all with exit code 0:
  - `cargo clippy --workspace --all-targets --locked -- -D warnings`
  - `cargo clippy --workspace --lib --locked --target wasm32-unknown-unknown -- -D warnings`
  - `cargo test --workspace --locked --no-run`
- Canary, run by the lead in a throwaway crate outside the repository and then deleted: with this `clippy.toml`, Clippy rejected `f64::sin`, `f64::sqrt`, `f32::mul_add`, `f64::atan2`, `f64::min` and `f32::max` (6 errors, exit code 1) and accepted `abs` and `clamp`. Without the config the same crate passed.
- `libm` 0.2.16 resolves with no features on both targets (`cargo tree -e features`), so its architecture-specific code is off.

### 2026-11-17T15:40+05:30 Critique of the contract by `pv-opus-high` (read-only) and what was accepted

- Finding: no type or argument list has to change before orbital dynamics or contact arrive. The person accepted four edits, none of them a signature change:
  1. `step` doc comment: what "order p" means, where an order can be measured, a bound for "exact up to rounding", and that broken preconditions give an unspecified result.
  2. `hash_state` doc comment: "the first attitude component that compares unequal to `0.0`".
  3. Module doc: seconds are `tick * dt` only for a run that uses one `dt`.
  4. `clippy.toml`: `min` and `max` are banned on `f32` and `f64`.
- Decision by the person on `clamp`: it stays allowed. The critique asked to ban it with `min` and `max`. `min` and `max` are banned because Rust does not fix the sign of zero for them and the hash reads bits. `clamp` is two plain comparisons, so both targets give the same bits.
- Left as it is, to change later at a known cost:
  - `step` holds one body-frame wrench constant for the tick. Orbital dynamics, gravity, drag and contact will replace the inside of `step` and add an argument.
  - The state fields are inertial. The order that adds orbital dynamics must name the frame of every field: the orbital frame turns at about 0.065 deg/s, a third of the 0.20 deg/s rate limit in the pass rule.
  - Mass, inertia and the centre of mass are fixed in `Vehicle`. Fuel mass change will move them into the state.
  - `step` moves one body. Capture and latching need two bodies in one integrator.
  - `hash_state` feeds exactly 112 bytes. The hash layout needs a version before the first published replay.
  - `DT` is fixed. Stiff capture dampers may need sub-steps inside `step`.

### 2026-11-17T15:40+05:30 Order 1: core

- Droid `pv-haiku-xhigh`. Branch `order/1`. Worktree `D:\dev\spacebench-wt\order-1`.
- Intent: implement the public API of `crates/core` exactly as the contract states it, and remove the crate-level `allow`.
- Allowed paths: `crates/core/src/**`.
- Told: the contract, the integrator recipe (in the handoff only, not in this file), the determinism rules.
- Not told: the list of test cases, any test code, anything about the gate script.
- Checks: Clippy with `-D warnings` on both targets; the wasm build of the core; its own unit tests in `src`; a search that finds no `todo!`, no `unimplemented!` and no crate-level `allow`.
- Expected result before landing: green on its own checks. The closed-form tests and the gate are not in its tree and are not run there.

### 2026-11-17T15:40+05:30 Order 2: physics tests

- Droid `pv-sol-high`, by the person's exception above. Branch `order/2`. Worktree `D:\dev\spacebench-wt\order-2`.
- Intent: tests of the core against closed-form results, written from physics without sight of the builder's work.
- Allowed paths: `crates/core/tests/**`.
- Told: the contract with its doc comments, and the list of required cases (in the handoff only, not in this file).
- Not told: the integrator recipe, the builder's code, any output of the core, anything about the gate script.
- Checks: Clippy with `-D warnings` on the native target with `--all-targets`; `cargo test --locked -p spacebench-core --no-run`; `cargo test --locked -p spacebench-core`.
- Expected result before landing: RED. Clippy is green and the tests compile. `cargo test` fails, and every failing test fails with "not yet implemented". Any test that passes is listed with its reason.

### 2026-11-17T15:40+05:30 Order 3: gates

- Droid `pv-haiku-xhigh`. Branch `order/3`. Worktree `D:\dev\spacebench-wt\order-3`.
- Intent: `scripts/check.ps1`, the only gate, with three gates: `physics`, `clippy`, `determinism`. The wasm exports and the native bin that the determinism gate compares.
- Allowed paths: `scripts/**`, `crates/wasm/src/**`.
- Told: the signature of `scripted_run`, the export and command-line rules, the gate rules.
- Not told: the integrator recipe, the test cases, the builder's code.
- Checks: `pwsh -NoProfile -File scripts/check.ps1`.
- Expected result before landing: RED. The script runs to the end and exits 1. `clippy` passes. `physics` fails because zero tests ran. Inside `determinism`, both builds and the ABI probe pass, and the scripted run fails on both sides on the unimplemented core.

### 2026-11-17T15:40+05:30 Gate status

- There is no gate yet. `scripts/check.ps1` does not exist until order 3 lands.
