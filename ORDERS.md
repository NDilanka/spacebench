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

### 2026-11-17T16:14+05:30 Decisions by the person, and corrections

- The person accepted the rounding bound `8 * (N + 4) * f64::EPSILON` in the `step` doc comment. The lead had changed it from `8 * N` without showing the change first.
- Rule from the person: the lead shows any change before it is frozen, not after.
- The person reported a `std` `powi()` call at `crates/core/src/lib.rs:763`. The lead searched every tree and commit and found no `powi`. The file on `order/1` has 759 lines, so no version has that line. Nothing was changed.
- Correction: the lead first gave the length of `crates/core/src/lib.rs` on `order/1` as 696 lines. That count skipped blank lines. The file has 759 lines.

### 2026-11-17T16:14+05:30 Trial of orders 1 and 2 together, and the judge's verdict

- Trial by the lead in a scratch worktree `D:\dev\spacebench-wt\_trial`, a merge of `order/1` and `order/2` that never touched `main`: 11 unit tests passed, 22 of 23 contract tests passed, 1 failed.
- The failing test is `motion::rotational_error_at_dt_half_dt_quarter_dt_shows_fourth_order`. It failed on its own guard: "rotation order experiment is rounding dominated: [4.44e-16, 1.11e-16, 1.11e-15]".
- The lead measured with a scratch test file `lead_probe.rs` in that worktree. Steady spin `w = (0, 0, 2)`: attitude errors 4.44e-16, 1.11e-16, 1.11e-15, 8.88e-16, which is rounding and shows no order. Torque-free precession with rates (1.3, -0.8, 1.1): attitude errors 6.74e-6, 4.22e-7, 2.63e-8, 1.65e-9, 1.03e-10 at 16, 32, 64, 128 and 256 steps, order 4.00 at every halving.
- The scratch worktree and `lead_probe.rs` were a measurement. Both are deleted and neither lands. Checked at 16:14: the folder is gone, `git worktree list` shows only `main` and orders 1 to 3, and no branch holds a file named `lead_probe`.
- Verdict by `pv-opus-high`, read-only: the test is wrong and the core is right. On a steady spin about a principal axis the gyroscopic term and the coning term are both zero, so a correct method is exact there and only rounding is left. The fix belongs on `crates/core/tests`.
- The person's rule for the judge: an error near rounding means the test is fixed; a clean order of 1 or 2 means the core is wrong. The person wrote "1e-5"; the lead and the judge read it as 1e-15 and the lead said so.
- Note from the judge, not acted on: the `step` doc says an order is measurable roughly for `|w| * dt` between 0.01 and 0.2. That is necessary but not enough, because the rate vector must also change during the run. Any change to that doc wording is shown to the person first.

### 2026-11-17T16:14+05:30 Order 6: fix the rotation-order test

- Droid `pv-sol-high`, by the same exception as order 2. Branch `order/6`, cut from order 2's commit `1d35ceb`. Worktree `D:\dev\spacebench-wt\order-6`.
- The path rule is bent on purpose, by the person's decision: order 6 shares `crates/core/tests/**` with order 2, which has not landed. Order 2's worker has finished and writes nothing more, so the path still has one writer. The reason is time.
- Orders 2 and 6 land together.
- Intent: `rotational_error_at_dt_half_dt_quarter_dt_shows_fourth_order` measures the order on a motion whose body rate vector changes direction with time, against a closed form. By the person's instruction the error is well above rounding at every step size used: a fast spin or larger steps. The rounding guard stays and covers every step size. The refinement rule `E(h/2) <= E(h) / 2^3.5 + rounding` stays. No other test changes.
- Allowed paths: `crates/core/tests/**`.
- Told: the contract; that a steady spin about a fixed axis cannot show an order because a correct method can be exact there; that the judge ruled the experiment must change; a step window set by the lead, `|w| * h` about 0.3 to 0.4 at the largest step and halved twice.
- Not told: the integrator recipe, the builder's code, any measured number, which tests passed in the trial.
- Checks: the same three as order 2.
- Expected result before landing: RED, as for order 2. Clippy is green, the tests compile, and every failing test fails with "not yet implemented".
- After the report the lead reruns the trial in a scratch worktree, deletes it, and gives the person the count before any landing.

### 2026-11-17T16:14+05:30 Gate status

- There is still no gate. Nothing has landed.

### 2026-11-17T17:25+05:30 Order 6 report and second trial

- Order 6 reported commit `cb3c51d` on `order/6`. One file changed against order 2's commit `1d35ceb`: `crates/core/tests/cases/motion.rs`, 41 lines added and 16 removed, all inside `rotational_error_at_dt_half_dt_quarter_dt_shows_fourth_order`. No helper and no other test changed.
- The new experiment: torque-free precession of the test body `diag(2, 3, 3)` with initial rate `(6, 8, 0)` rad/s, duration 0.14 s, at 4, 8 and 16 steps, so `|w| * h` is 0.35, 0.175 and 0.0875. Closed form in the test: `q(t) = spin([4, 8, 0], t) * spin([2, 0, 0], t)`. The guard of 100 rounding budgets now applies at each of the three step sizes. The refinement rule is unchanged.
- Trial by the lead in a scratch worktree `D:\dev\spacebench-wt\_trial6` (the tree of `order/1` plus `crates/core/tests` from `order/6`, never on `main`): 11 unit tests passed and 23 of 23 contract tests passed.
- Lead measurement in that scratch worktree, with a scratch probe file, of the rebuilt experiment against the order 1 core:
  - 4 steps: attitude error 6.386332e-6, which is 234,062 times the guard.
  - 8 steps: attitude error 3.986901e-7, which is 9,741 times the guard, observed order 4.002.
  - 16 steps: attitude error 2.491088e-8, which is 365 times the guard, observed order 4.000.
- The scratch worktree and the probe file are deleted. Checked at 17:25 before the first merge: the folders `_trial` and `_trial6` do not exist, `git worktree list` shows only `main` and orders 1, 2, 3 and 6, and no branch holds a file named `lead_probe` or a trial log.

### 2026-11-17T17:25+05:30 Advance acceptance by the person

- The person accepted the three landings in advance: order 3, then orders 2 and 6 together, then order 1. The condition: after each merge the gate result on `main` matches the expected one (red, red, green). If any result differs, the lead stops and shows it.
- This is an exception to the person's rule of accepting each landing one by one. The person's reason: the trial merge already passed 23 of 23, and the person is away from the screen.
- The person's further instructions: after the green gate the lead runs the negative control for the hash gate and records it here, then stops. Round two does not start. Nothing is pushed.

### 2026-11-17T17:25+05:30 Receipts before the merges

- Order 3 (`22a478d`):
  - Diff against the contract lies inside the allowed paths: `crates/wasm/src/lib.rs`, `crates/wasm/src/bin/native_hash.rs`, `scripts/check.ps1`, `scripts/wasm_hash.mjs`.
  - Main tree: `git status --short` is empty.
  - Check rerun by the lead in its worktree: `pwsh -NoProfile -File scripts/check.ps1` exits 1 with `FAIL physics` (0 tests), `PASS clippy`, `FAIL determinism`. Both builds succeed, the ABI probe prints `fedcba9876543210` on both sides, and all 15 run pairs are `invalid` on the unimplemented core. This matches the expected red.
  - Not verified before landing: the success path and the bisect of the determinism gate. The worker tried them only against a mock that it deleted.
- Orders 2 and 6 (`1d35ceb`, `cb3c51d`), landing together:
  - Diff against the contract lies inside the allowed path `crates/core/tests/**`: `contract_physics.rs`, `support/mod.rs`, `cases/hashing.rs`, `cases/motion.rs`, `cases/scripted.rs`, `cases/thrusters.rs`.
  - Main tree: `git status --short` is empty.
  - Checks rerun by the lead in each worktree: Clippy exits 0; `cargo test --locked -p spacebench-core` exits 101 with 22 failures, all "not yet implemented", and 1 pass, `thrusters::placeholder_table_matches_documented_estimates`, which reads constants only. This matches the expected red.
  - The contract bound `8 * (N + 4) * EPSILON` is asserted only for the straight push. Spin rate, force-free motion and linear momentum use the test writer's wider budget `64 * (N + 4) * EPSILON * scale`. Spin angle and precession use the refinement rule and no absolute bound.
- Order 1 (`e0e32b0`):
  - Diff against the contract lies inside the allowed path: `crates/core/src/lib.rs` only. All 34 `pub` lines are the same as in the contract.
  - Main tree: `git status --short` is empty.
  - Checks rerun by the lead in its worktree, all exit 0: Clippy on both targets, the wasm release build of the core, 11 unit tests. No `todo!`, `unimplemented!`, `allow`, `unwrap` or `expect`. No `std` float call; `libm` is used in the quaternion exponential and in the normalisation.
  - The lead read `step` line by line against the recipe in the spec and found it the same.
  - Not verified before landing: native against wasm equality.

### 2026-11-17T17:27+05:30 Order 3 landed: gate on `main`

- Merge commit `024008a`, `--no-ff`, of `order/3` into `main`.
- `pwsh -NoProfile -File scripts/check.ps1` on `main`: exit code 1.
  - `FAIL physics`: `cargo test --locked -p spacebench-core` exits 0 but 0 tests passed.
  - `PASS clippy`: both Clippy commands exit 0.
  - `FAIL determinism`: both builds exit 0; the ABI probe passes on both sides (`probe native=True node=True`); all 15 run pairs are `native=FAIL node=FAIL -> invalid` (native exit code 101, Node exit code 1) on the unimplemented core.
- This is the expected red. `git status --short` on `main` is empty after the run.
- Gate status: the gate exists and is red.

### 2026-11-17T17:27+05:30 Orders 2 and 6 landed together: gate on `main`

- Merge commit `5089150`, `--no-ff`, of `order/6` into `main`. `order/6` contains order 2's commit `1d35ceb`, so one merge lands both.
- `pwsh -NoProfile -File scripts/check.ps1` on `main`: exit code 1.
  - `FAIL physics`: `cargo test --locked -p spacebench-core` exits 101 with `1 passed; 22 failed`. All 22 failures are "not yet implemented". The one pass is `thrusters::placeholder_table_matches_documented_estimates`.
  - `PASS clippy`: both Clippy commands exit 0, with the test files included by `--all-targets`.
  - `FAIL determinism`: both builds exit 0; the ABI probe passes on both sides; all 15 run pairs are `invalid` on the unimplemented core.
- This is the expected red. `git status --short` on `main` is empty after the run.
- Gate status after orders 2 and 6: red.

### 2026-11-17T17:27+05:30 Order 1 landed: gate on `main`

- Merge commit `bd0cece`, `--no-ff`, of `order/1` into `main`.
- `pwsh -NoProfile -File scripts/check.ps1` on `main`: exit code 0.
  - `PASS physics`: `cargo test --locked -p spacebench-core` exits 0. 11 unit tests and 23 of 23 contract tests pass, 34 in all.
  - `PASS clippy`: both Clippy commands exit 0.
  - `PASS determinism`: both builds exit 0; the ABI probe passes on both sides; all 15 run pairs match. This is the first real run of the gate's success path.
    - seed 1: ticks 0 `9cd04be66174cce4`, 1 `677bdf615f524a79`, 7 `79dddbade16d0c12`, 1000 `0599a4b85f45a1dd`, 200000 `afbdc94cf80ce4e1`.
    - seed 2: ticks 0 `138084a7940e67c4`, 1 `435e7b3f8a62568c`, 7 `ead558176e6dbb1b`, 1000 `6fc165b99273bfb8`, 200000 `19a6fb591dfac18d`.
    - seed 3735928559: ticks 0 `9ff6356190339c04`, 1 `cc406db29ee8b477`, 7 `764af3544ed239bb`, 1000 `224a8a2f3be3867b`, 200000 `f1a84622bb31d527`.
  - These hash values are a record of this run. The gate compares the two builds live and pins none of them.
- This is the expected green. `git status --short` on `main` is empty after the run.
- Gate status after order 1: green.
