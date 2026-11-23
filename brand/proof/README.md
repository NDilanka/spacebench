# Proof round

Nine trial pieces that test a new direction for the SpaceBench brand. They are not part of the kit yet. The reasons behind them are in `../gap-analysis.md`.

| File | What it tests |
|---|---|
| `out/p01-mark.png` | The mark redrawn as a real bench mark: a bar over three cut strokes that meet at a point. Five versions, orientation per simulation, emblems, bracket plate, two wordmark trials, lockups. |
| `out/p02-cover.png` | Cover with a drawn orbital sunrise. The horizon is the mark's bar. New line: "Every model gets the same bench." |
| `out/p03-plate.png` | Approach plate for tier 4: plan, profile, contact minima, pen notes. |
| `out/p04-bullseye.png` | Thirty approaches seen down the docking axis, on a full violet field. |
| `out/p05-flight.png` | Flight sheet: the capsule drawn once per decision, and a sixteen-row thruster score. |
| `out/p06-collision.png` | Fact poster with giant dot numerals and a highlight block. |
| `out/p07-sensor.png` | The station as sensor returns at 250, 30 and 10 m. |
| `out/p08-objects.png` | Patch, streamer, pilot badge, cue card, bracket plate, stickers. |
| `out/p09-pilot.png` | The human pilot on the matched board, in ordered dither. |
| `out/index.jpg` | All nine on one sheet. |

## What is real and what is not

- Every flight shown is a seeded SPECIMEN from `proof.js`. No results exist yet.
- Limits, holds, keep-out radius, thruster count and minimum pulse come from `DESIGN.md`.
- The capsule, the station, the corridor angle, the thruster numbering and the sensor (ray grid, field of view) are schematic.
- Sensor noise at 10 m is sourced. Its growth with range is an assumption and is labelled as one.
- No photograph is used. The limb is drawn by `gen/limb.py` and the pilot by `gen/pilot.py`.

## Build

`py -3 build.py p01-mark p02-cover ...` renders pages to `out/` with headless Chrome. `py -3 gen/index.py` builds the index sheet.

## Fonts

Geist and Geist Mono (OFL) and SB Matrix from `../fonts/`. The pen is Reenie Beanie (OFL, licence in `fonts/`), a stand-in until a hand is chosen.
