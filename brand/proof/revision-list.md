# Proof round: merged revision list

Three independent reviewers looked at all 137 references, then at the nine proof pieces and `brand/gap-analysis.md`. This file merges their reports into one list. Nothing in the kit or the proof pieces has been changed yet.

- Fable 5.2 high: `review-fable.md` (F)
- Gemini 4 Hydrogen high: `review-hydrogen.md` (H)
- Gemini 4 Carbon high: `review-gemini.md` (C)

"Checked" means I compared the claim with the render or the source file myself.

## 1. Scores out of 10, against the best references

| Measure | F | H | C | Mean |
|---|---|---|---|---|
| Aesthetic | 5 | 6.5 | 5.5 | 5.7 |
| Nostalgia | 3 | 6 | 5 | 4.7 |
| Remarkability | 4 | 5.5 | 6.5 | 5.3 |
| Data-driven tech | 6 | 6.5 | 6 | 6.2 |

Shared verdict: the round has real ideas and good copy, but it spreads over nine directions and none is finished. The references win by repeating one or two devices with great care. Nostalgia is the weakest measure.

Praised by all three: the sixteen-row thruster score on p05, the violet bullseye p04, the approach plate idea p03, and the lines "Docking is a slow collision." and "Every model gets the same bench."

## 2. What to build, ranked

Rank follows how many reviewers asked for it, how well it serves the four goals, and whether I could confirm the reasoning.

### R1. One signature: the Circle (F, H, C)
All three name p04 as the strongest piece and build on it.
- The 0.10 m contact limit becomes the recurring brand shape. F: print it at actual size, a 200 mm ink disc on an A2 sheet.
- C: grow it into a contact figure that shows all seven limits at once. The 0.05 to 0.10 m/s closing band is a ring, so "too gentle is also a fail" becomes visible. Rates and angles sit on outer arcs.
- H: a small 30-seed version beside every leaderboard row.
- Fixes for p04 itself are in section 3.

### R2. Real data in place of invented curves (F, H; C implies it)
- The flights in p03, p04 and p05 come from a made-up curve generator. The simulator in `crates/core` exists. Checked.
- F: export real trajectories. Label scripted burns as "SCRIPTED BURN · NOT A PILOT". These are real simulator output, not model results.
- Where no data exists, show the empty state. F: a field of 6 by 30 empty rings, "180 flights per model. None flown yet."
- Dependency: exports from `crates/core` are an order for the lead session, not brand work.

### R3. Determinism as a brand asset (F, H, C)
All three proposed this independently. It is the most own-able subject we have.
- F: a hash weave. Per-tick state hashes drawn as bit columns, native and WebAssembly mirrored, with the negative control breaking at ticks 44, 23 and 1. Those ticks are recorded in `ORDERS.md` lines 191 to 193. Checked.
- H and C: a plate for the measured fact that native `atan2` differed from `libm` 125,801 times in 1,000,000 inputs. The number is in `AGENTS.md`. Checked.
- C's draft adds "tick 00412" and "1 ULP". Those are invented and must not be printed.

### R4. One geometry source, drawn as numbered plates (F, H, C)
- Today the station is drawn three different ways and the capsule is a lozenge. Checked.
- One geometry module feeds every drawing: capsule, port with 3 petals and 12 hooks, 16 thrusters.
- Drawn with three line weights, centre lines that run to the sheet edge, hatching, and exactly one part in violet.
- C names the missing craft exactly: about 1.25 px for cut lines, 0.45 px chain line for axes, 0.35 px for dimension lines.

### R5. Mark and wordmark (F, H, C)
- Mark: the reviewers disagreed, so I tested it (`.work/marktest/marktest.png`). At 0° it reads as "align top", at 90° as "skip to end", at 180° as "download". Below 48 px the three wedges close into a triangle. The fault is the silhouette, so the form must change, not the finish.
- Starting point for a new form: a true cut bench mark has three open strokes and a clear gap below the line.
- Wordmark: all three reject the automatic stencil cuts. Use hand-placed vector cuts, only where a bowl meets a stem, only at display size. Plain Geist below 48 px.
- Emblems: the three-petal emblem reads as a hazard trefoil (H, checked). The four-arrow reticle is close to an Arkade reference (F, C).

### R6. Stop faking materials (F, H, C)
- Remove CSS shadows, bevels, the metal plate and the tilted cards from p01 and p08. Checked: p08 says "drawn, not photographed" above soft photo shadows.
- Draw objects as flat, shadowless line drawings (C), and make the bracket a flat punched card that encodes seed and hash (H).

### R7. Sensor view rebuilt (F, H, C)
- p07's headline says "Sharp where measured. Soft where not." and nothing in it is soft. Each range is rescaled to fill its panel. Checked.
- Fixed true field of view, so the station is small at 250 m. A soft, blurred body for what is not measured, with sharp returns and thin overlay boxes on top. F wants scan lines; C wants blur under crisp 1 px marks. Both follow the same idea.

### R8. Flight sheet shows six-axis motion (F, C, H)
- Keep the thruster score. Replace the strobe, which hides 198 of 199 capsules behind each other. Checked.
- F: a long exposure of one flight. C: thin rings along the path, with full capsules and attitude axes only at the holds, the fault and contact. H: an attitude ball and a phase-plane plot with the limits drawn in.
- C's point is right: six-axis piloting is our first claim in `DESIGN.md` and no piece shows attitude at all.

### R9. The product itself (H, C)
- Nothing in the kit draws the leaderboard, the paused pilot display or the replay ruler.
- Build them as zero-gap instrument panels, with the range ruler on a log scale from 400 m to contact.

### R10. Colour and surface rules (F, C, H)
- Parent pieces must be strictly monochrome. Two breaks, both checked: the p02 halo is blue (`gen/limb.py` line 12) and the pen notes on p01 are Dock violet.
- F: violet gets three behaviours only: ink on paper, light on ink, one full field per series. F also proposes a one-ink violet print look for Dock plates.
- Texture belongs to parts of a sheet, not to all of it. One grain overlay sits on every piece today. H proposes line screen and stipple; C proposes soft ground under sharp linework.

### R11. Hand marks: real or none (F, C, H)
- All three reject the stand-in pen font and the generated wobble lines.
- F: a rubber-stamp SPECIMEN with real ink faults, and a real hand or plotter alphabet. C: at most one pen note per sheet, traced from a real scan, never on parent sheets.

### R12. People (F, H, C)
- All three say p09 fails: the figure does not read as a person, and the screen shows dummy bars.
- Agreed: the screen must show the real pilot display. They differ on the figure. F wants a plain silhouette plus people for scale. H and C want a hand on a controller.
- Caution: the matched board has no stick. The pilot issues pulse-and-coast commands on a paused simulator, so a hand controller would misstate the product.

### R13. Layout discipline (F, H, C)
- Safe zones around all text. The reviewers count at least eight places where lines or boxes hit type.
- Fewer items per sheet, more scale contrast, more empty ground. Remove the giant watermark from p06.
- F: one hairline datum across every sheet. H: a rotated folio spine in place of the stacked label.

### R14. Scale and the second simulation (F, H, C)
- H: a 4.0 m to 0.10 m scale bar for p06. F: the station printed in its own range numbers. C: a tiny capsule against a hard-cropped station.
- C: no orange Landing piece has been proofed yet, so the family system is untested.

### R15. Numerals (C, with a conflict)
- C: a size floor for dot numerals with Geist Mono below it, a tighter decimal point, and small bitmap status icons in place of pen ticks. The gap around the point in "0.10" is real. Checked.
- C also wants a centre dot inside the zero. That is the Wantex zero, and F and H both already flag our dot numerals as close to Wantex. I would not adopt it.

## 3. Confirmed defects by piece

All checked against the renders unless marked.

| Piece | Defect | Raised by |
|---|---|---|
| p01 | Last lockup row cut off by the sheet edge | F |
| p01 | Mark loses its gap at 16 px; stencil cuts read as rendering faults at small sizes | F, H |
| p01 | Automatic cuts slice B, e, p and a through the middle | H, C |
| p01 | Bracket plate for Dock carries the upright parent mark | F |
| p01 | Violet pen notes on a parent sheet | C |
| p01 | Dot version uneven; outline version clogs at the tips | C (not checked at pixel level) |
| p02 | Blue halo breaks the monochrome rule | F, C |
| p02 | Flat arrow sits on the glow like a sticker; caption contrast too low | F, C |
| p02 | The unlit side of the planet is lifted by the halo (`limb.py` line 33) | C |
| p03 | Pen note struck by the violet event line | F |
| p03 | "Final 10 m" band is tilted and overruns the frame | F, C |
| p03 | Corner label stack too close to the Pem reference | F, H, C |
| p03 | Station is a solid black pill; 200 m line in the profile has no label | F, C |
| p03 | Units mixed (deg/s and °) | F |
| p04 | Traces cross the SPECIMEN tag and the footnote | F, C |
| p04 | Traces wander and do not converge | F |
| p04 | The heavy beaded trace (seed 17) has no label | C |
| p04 | "24" and "/30" mismatched in size and contrast | F, C |
| p05 | Violet box clips the headline line above it | F, C |
| p05 | Keep-out line crosses the "HOLD 250 M" label | F |
| p06 | Violet box runs into "g" above and "ll", "i" below | F, H, C |
| p06 | Giant cropped mark reads as a failed image | F, H, C |
| p06 | Wide holes around the decimal point in "0.10" | C |
| p08 | Fake shadows; streamer clipped at the top | F, H, C |
| p08 | Patch shows 12 ticks directly above "SIXTEEN THRUSTERS" | C |
| p09 | Headline overlaps the screen by 10 px (`pilot.py` line 11) | C |
| p09 | "Same" orphaned in the headline; close to a Quattro reference | F, C |

Look-alike risks the round added: p03 label stack (Pem), highlight box behind one word on p05 and p06 (Meridian), tilted tape on p03 (Quattro), badge on p08 (Ontype), reticle emblem (Arkade), p09 composition (Quattro), dot numerals with sensor dots (Wantex, DroneOS), dictionary entry and "Proof No." numbering on p01 (Ontype).

## 4. Where the gap analysis was wrong

- It treated empty ground as a fault (F, C). The references are 45% to 85% empty on purpose. The real fault was that nothing strong sat in the space. The proof round then overfilled p01, p05 and p08. Accepted.
- It ignored the product surfaces: leaderboard and pilot display (H). Accepted.
- It never asked for attitude to be shown, though six-axis piloting is the first claim (C). Accepted.
- It named drawing subjects without a drafting standard (C). Accepted.
- It allowed a stand-in pen font and automatic stencil cuts (C). Accepted.

## 5. Disagreements

| Topic | Positions | Status |
|---|---|---|
| Mark reads as an interface icon | H: solved. F: not solved | Settled by test. F is right |
| Nostalgia | F 3, C 5, H 6 | Open. All three agree the fake hand and fake materials hurt it |
| Zero in the dot numerals | C: centre dot. F, H: dot numerals are already near Wantex | I side with F and H |
| Pilot figure | F: silhouette. H, C: hand on a controller | The controller misstates the matched board |
| Handwriting | F: real hand or plotter. C: at most one note, or none | Needs your decision |

## 6. Claims not verified

- C: "the c in SpaceBench is chopped in half". My 2x crop shows the c intact. The cut letters are B, e, p and a. The underlying point stands.
- F: violet duplicating-ink history, a Mariner 4 precedent, and the licence of the Hershey plotter fonts. These need sources before any copy relies on them.
- F: whether the hash tools can print every tick, and whether the core can export trajectories today.
- C: an LQR baseline drawn as a dashed line. No baseline controller exists yet (build step 2).
- H: its working notes are thin, about 2 KB per batch. Its model ID was written from the naming pattern and is unconfirmed.

## 7. Stop list (merged)

1. Stop drawing data that is not data.
2. Stop faking materials and hand tools in code.
3. Stop letting lines and boxes touch type.
4. Stop using one treatment everywhere: the same grain, the same violet box, the same small low-contrast captions.
5. Stop breaking our own rules: colour on parent pieces, 12 ticks beside "sixteen", "soft" above sharp dots.
