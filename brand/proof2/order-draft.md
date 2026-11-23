# Order draft for the lead: flight records from the core

Status: a draft, written by the brand session on 2026-11-18. It is not an order. `ORDERS.md` is untouched, and nothing in `crates/` or `scripts/` was changed. If the person approves the idea, the lead rewrites it in its own words and splits it.

## Why this is asked

The second brand proof round (`brand/proof2/`) draws from simulator output instead of invented samples. Today the core returns one number per run: `scripted_run(seed, ticks) -> u64`. To draw a flight, the brand session had to work around that in two ways. Neither is a sound basis for anything published.

1. **A hash per tick, by brute force.** It called the two gate tools once per tick count (`native_hash.exe` and `scripts/wasm_hash.mjs`, 161 runs per seed and per build). Each call reruns the flight from the start, so the cost grows with the square of the length. It is practical for 160 ticks and not for 200,000.
2. **The states, by restating the recipe.** `initial_state` and `splitmix_next` are private, so a throwaway dumper (`brand/proof2/gen/sbdump`, its own workspace, path dependency on `crates/core`) restates the run from the doc comment of `scripted_run` and drives `thruster_wrench`, `step` and `hash_state` itself. For seed 1 its chained hash equals `scripted_run` at 0, 1, 7, 1000 and 200000 ticks, and equals the native gate tool at every tick from 0 to 160. That shows the restated recipe is right today. Nothing stops it drifting when the core changes.

## What is asked

**A. One driver in the core, with two uses.** A public function in `crates/core` that runs the scripted flight and hands every tick to the caller: the state, the thruster mask that was in force for the step that produced it, and the chained hash so far. `scripted_run` becomes a call to it that keeps only the last hash, so the two cannot drift apart.

A possible shape, for the lead to settle. The core is `no_std`, and this needs no allocation:

```rust
pub fn scripted_trace(seed: u32, ticks: u32, visit: &mut dyn FnMut(&State, u32, u64))
```

This adds a `pub` item. The receipt for order 1 says all 34 `pub` lines equal the contract, so this is a contract change and the person decides it.

**B. The same record from both builds.** A native tool and a Node runner that print one line per tick for a seed and a tick count. Asked content of a line: the tick, the mask, the chained hash, and the 13 floats of the state in the order `hash_state` uses. Floats are printed as the 16 hex digits of their bits, not as decimals, so the two files can be compared byte for byte and a published drawing can be rebuilt exactly.

One constraint the lead will want to keep: the wasm module imports nothing today, and Node loads it with an empty import object. A trace needs a way out that keeps this true, for example an export that fills a buffer in linear memory which the host then reads.

**C. A check.** For one seed and 1000 ticks, the two trace files are identical and the hash on the last line equals `scripted_run` for the same arguments. Whether this joins `scripts/check.ps1` is the lead's call. The existing gate stays as it is.

## A possible split

No two of these share a path.

| Order | Allowed paths | Intent | Expected result |
|---|---|---|---|
| Core | `crates/core/src/**` | Add the driver, make `scripted_run` call it | Green. The gate's 15 run pairs still match, and the lead confirms the hashes equal the record of 2026-11-17 |
| Tests | `crates/core/tests/**` | The driver visits `ticks + 1` states, its last hash equals `scripted_run`, and the mask changes only on ticks that are multiples of 7 | Red until the core order lands |
| Tools | `crates/wasm/src/**`, `scripts/**` | The native tool, the wasm export, the Node runner, the check in C | Red until the core order lands |

Told to the workers: the contract, the determinism rules in `AGENTS.md`, the line format. Not told: anything about the drawings, or anything in `brand/`, `.work/` or `Design direction/`.

## Not asked now, needed at build step 2

Three brand pieces show an honest empty state today because no station, scenario or docking flight exists. They fill in only when the scenario generator and the classical controller exist. When that work is specified, the brand needs its run record to carry:

- The seven quantities of `DESIGN.md` section 4.2 at first contact, per flight. These draw the contact figure.
- The outcome per flight: docked, or the failure reason and the furthest hold point reached. These fill the 6 by 30 seed field.
- The per-tick record in B in a frame fixed to the station, with the action log (pulses, then coast, per turn) and the events that interrupt a coast. These draw a docking flight sheet.

Public practice seeds are enough. The brand never needs a hidden seed or the referee key.

## What the brand session did, and did not do

- Read `crates/core/src/lib.rs`, `crates/wasm/src/**`, `scripts/**` and `ORDERS.md`. Changed none of them. `git status --short` shows only `brand/` as untracked.
- Ran the existing gate tools for seeds 1, 2 and 3735928559 at every tick from 0 to 160. Native and Node agree on all 161 hashes for each seed. The values at 0, 1 and 7 ticks equal the lead's record of 2026-11-17.
- Reran the lead's negative control in a scratch copy under `.work/negctl` (native only, the same two-line change in `expq`). It reproduces `ORDERS.md` lines 191 to 193: first differing tick counts 44, 23 and 1, and native hashes `96a468dab4f3aa8d` and `6d77bf68e7fe402d` at 1000 ticks. It did not rerun the gate script, Clippy or the Node side of the control.
- Built nothing in the repository's own `target/` directory. The scratch builds are under `.work/`.

## For the person to decide

1. Whether a new `pub` item in the core is acceptable now, or waits until build step 2 changes the contract anyway.
2. Whether `brand/proof2/gen/sbdump` may stay as a labelled throwaway until the tools order lands. It is the only Rust code under `brand/`.
3. `AGENTS.md` lists `.work/` and `Design direction/` as not project input. It says nothing about `brand/`. A line there would tell workers whether to read it. That file is the lead's.
