# Proof round two

Six trial pieces. They answer the three reviews of round one (`../proof/revision-list.md`). Nothing here is part of the kit yet, and the kit in `brand/` is unchanged.

| File | What it is | Data |
|---|---|---|
| `out/r2-01-mark.png` | Five ways to cut the mark, beside the round-one mark as a control. Each at 16, 24, 32 and 48 px, turned for Dock and Landing, with the interface icon it resembles. The wordmark with three hand-placed cuts. Lockups. | The "reads as" column is a judgement by eye, and says so |
| `out/r2-02-circle.png` | The sideways limit at its real size: a 200 mm disc on an A2 sheet, with a 100 mm rule to check the print. | Limits from `DESIGN.md` 4.2 |
| `out/r2-03-contact.png` | All seven contact limits as one figure, scaled so every limit lies on the same circle. The 6 by 30 seed field, empty. The figure as a small glyph. | None. No flight exists |
| `out/r2-04-bits.png` | The hash of every tick from the native build, mirrored against the WebAssembly build. Below it, the negative control, and the `atan2` probe count. | Real, see below |
| `out/r2-05-sixteen.png` | The thruster table drawn as a figure, with the one pair that gives a pure roll. | Real, read from the core |
| `out/r2-06-gate-run.png` | The gate's scripted run for seed 1, drawn as a flight sheet. | Real, see below |
| `out/index.jpg` | All six on one sheet. | |
| `order-draft.md` | A draft order for the lead session: a per-tick record from the core. | |

## What is real

- **Hashes** (`data/hashes.js`). The two gate tools, `native_hash.exe` and `scripts/wasm_hash.mjs`, run at every tick count from 0 to 160 for seeds 1, 2 and 3735928559. Native and WebAssembly agree on all 161 for each seed.
- **Negative control** (`data/negctl.js`). A rerun of the lead's control from `ORDERS.md` (2026-11-17) in a scratch copy: the sine and cosine in `expq` taken from Rust's standard library, native build only. It reproduces the recorded first differing ticks (44, 23, 1) and the recorded hashes at 1000 ticks.
- **Flight** (`data/flight1.js`). Seed 1, 200,000 ticks. The states come from `gen/sbdump`, which drives the core's public functions and restates the run recipe from the doc comment of `scripted_run`. Its chained hash equals `scripted_run` at 0, 1, 7, 1000 and 200000 ticks. It is a throwaway until the core can print this itself (`order-draft.md`).
- **Vehicle** (`data/vehicle.js`). Parsed from `crates/core/src/lib.rs`. The layout is the core's placeholder, not Dragon's, and the mass and inertia are estimates. The sheets say so.
- **125,801 of 1,000,000** is the `atan2` probe recorded in `AGENTS.md`. It was not rerun.

## What is not

- No docking flight, station or scenario exists, so no piece shows one. `r2-06` is the gate's random firing, not an approach, and is titled "Nobody flew this."
- No model results exist. The seed field and the contact figure are empty on purpose.
- The interface icons on `r2-01` are redrawn for comparison. They are not measured against the candidates.

## Build

```
py -3 gen/hashes.py      # needs the release gate tools in the repository's target/
py -3 gen/negctl.py      # builds a scratch copy under .work/negctl
py -3 gen/flight.py      # builds gen/sbdump into .work/sbdump, then writes data/flight1.js
py -3 gen/vehicle.py
py -3 build.py r2-01-mark r2-02-circle r2-03-contact r2-04-bits r2-05-sixteen r2-06-gate-run --scale=2
py -3 gen/index.py
```

`build.py` renders each page with headless Chrome and then checks the type: no text within 10 px of the sheet edge, no two texts overlapping, nothing drawn behind any text, nothing under 11 px. All six pages pass with no problems.

## Rules these pieces follow

- Three line weights: cut 1.25, axis 0.45 (chain line, run to the sheet edge), dimension 0.35.
- No grain, shadows or bevels.
- Violet appears as ink on paper, as light on ink, or as one full field. Parent-brand sheets (`r2-01`, `r2-04`, `r2-06`) use no colour.
- Dot numerals only at display size.
- Notes in the plotter alphabet, a few per sheet.

## Fonts

Geist and Geist Mono (OFL) and SB Matrix from `../fonts/`. The wordmark is drawn from Geist's outlines (`gen/outlines.py`) so its cuts can be placed by hand.

The plotter alphabet is Hershey Roman Simplex, drawn as single strokes. Its terms allow any use, provided the acknowledgement in `fonts/Hershey-ACKNOWLEDGEMENT.txt` travels with the data.
