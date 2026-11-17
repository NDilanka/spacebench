# SpaceBench: notes for AI agents

## What this is

SpaceBench tests language models on closed-loop control of spacecraft in simulators. `DESIGN.md` is the brief, and its decisions bind. Current work is build step 1: the simulation core in `crates/core`, with a gate that the native build and the WebAssembly build give the same bits.

## How work moves: orders

One lead session, workers that each take one order, and a person who decides.

- The lead is the only writer of shared state: `ORDERS.md`, the root `Cargo.toml`, branches, worktrees and merges. Workers never touch these.
- An order states its intent, its allowed paths, its checks, what the worker is told, and what it is not told. The person approves the split before anything is dispatched.
- No two open orders share a path. If paths overlap, the second order is held.
- One order gets one worker, one branch `order/<id>`, and one worktree under `D:\dev\spacebench-wt\`. The handoff names that path.
- Workers: every shell call starts in `D:\dev\spacebench`, and `Set-Location` does not carry over to the next call. Start every command with `Set-Location <your worktree>;`. Give every file tool an absolute path inside your worktree. Never read another worktree.
- A worker reports its commit hash, the files it changed, the checks it ran with their real output, and what it could not verify.
- Every order states its expected result, which may be red until another order lands.
- Receipt, written by the lead into `ORDERS.md`: the branch diff lies inside the allowed paths, the main tree has no stray files, the order's checks rerun in its worktree match the expected result, and after the merge the gate runs on `main`. Nothing lands without a receipt and the person's acceptance.
- `ORDERS.md` is append-only. Add lines. Never edit earlier ones.

## Who does what

| Work | Droid | Rule |
|---|---|---|
| Building and mechanical work | `pv-haiku-xhigh` | One order each |
| Verification | `pv-sol-high` | Read-only. A different lab from the builder. Never checks its own work |
| Judgment | `pv-opus-high` | Spec critique and disputed findings |

## Determinism (measured on this machine, 2026-11-17)

- All transcendental math goes through `libm = { version = "=0.2.16", default-features = false }`. In a probe of 1,000,000 inputs, native `std` `atan2` differed from `libm` 125,801 times. In WebAssembly it never differed, so the bug shows on one target only.
- `clippy.toml` bans `std` float math on both `f32` and `f64`. Clippy runs with `-D warnings`.
- No wall clock, no OS random numbers, no NaN in state, no `mul_add`, no fast-math. Time is an integer tick count.
- Hash the bits of the whole state at every tick. In the probe, a hash of a final sum hid every difference.
- Quaternions are Hamilton, scalar first, body to inertial. Renormalise each step. Before hashing, make the first non-zero component positive and turn `-0.0` into `+0.0`.

## Done means

- A green build is not proof. Show a test or a run that exercises the behaviour, with its output.
- A physics test compares with a closed form and states the formula in the test.
- Every `unsafe`, `#[allow]`, `unwrap` and `expect` carries a one-line reason.
- Never present a stub as working. The contract commit is signatures only and is never called done. Placeholder data is labelled as an estimate.
- Do not change a number that comes from `DESIGN.md`. Raise it with the person.

## Tools and limits

- Rust stable 1.94.1 with the `wasm32-unknown-unknown` target. Node 24 loads the `.wasm` file directly. PowerShell 7.
- The only gate is `scripts/check.ps1`. Until an order creates it, there is no gate, so say so.
- This machine has 7.7 GB of RAM. Each worktree builds in its own target directory on `D:`.
- Commit often with real timestamps. Never push.
- Never read or print `~/.factory/settings.json` or any credential file. Hidden test seeds and referee keys never enter this repository.
- `video/`, `.work/`, `Design direction/` and `resources for curating a fine workflow/` are not project input. Do not read them.
