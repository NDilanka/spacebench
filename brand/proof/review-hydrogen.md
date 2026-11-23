# SpaceBench Brand Proof Round — Independent Design Review

## 1. Verdict

The proof round replaces the blank wireframe sterility of the first kit with real simulator ideas, yet it sits roughly halfway to the best references because digital CSS effects and layout collisions blunt its craft.
- **Aesthetic quality: 6.5 / 10** — Crisp Geist typography and real paper/ink/violet grounds are undermined by text-box collisions (`p05`, `p06`), rasterized stencil cracks (`p01`, `p02`), and synthetic CSS bevels and drop shadows (`p01`, `p08`).
- **Nostalgia: 6.0 / 10** — The surveyor's bench mark, aviation approach plate (`p03`), and cue card (`p08`) strike an authentic chord, but flat digital blobs through an `8x8` dither (`p09`) and glossy gradient plates look more retro-web than true engineering print or spacecraft hardware.
- **Remarkability: 5.5 / 10** — `p03` and `p04` have distinct silhouettes across a room, whereas `p02` reads as generic orbital wallpaper, `p06` borrows familiar poster tropes, and the 3-arrow `PORT` emblem reads like a hazard fan rather than a SpaceBench signature.
- **Data-driven, advanced-tech feel: 6.5 / 10** — The 16-row thruster score (`p05`), SDF LiDAR clouds (`p07`), and 30-seed trace (`p04`) use real math, yet the round skips the actual leaderboard and cockpit HUD surfaces, shows fake dummy bars on `p09`'s screen, and draws vehicles as schematic lozenges.

---

## 2. What the references do that the proof round still does not

1. **Engraved line screens and stochastic airbrush stipple instead of flat noise.**
   - `HU8l0KGWsAAnn2A` and `HVBmvGRWoAAzQSN` (Physalia) flood 100% of the canvas in cobalt (`#103DF8`) or paper and render forms through a crisp 45-degree variable-width engraving line screen.
   - `HW-WGKiW8AAHE19` and `HW-WGKeWkAEXgLq` (Achievable) contrast razor-sharp 1px CAD wireframes inside a white card against a loud, coarse stochastic orange stipple gradient covering 35–100% of the ground.
   - The proof round uses only one uniform `512px` grey grain overlay (`proof.css:32`) and flat circular SVG/canvas dots (`p07`, `p09`).

2. **True dimensioned CAD and orthographic section drawings with edge-breaking centerlines.**
   - `HTfc6bHWUAIF8Z1` (Meridian Plate 04) draws a genuine cutaway section (`ø370.00`, `R12.0000`, `90.00°`) with centerlines crossing past frame borders on warm drafting paper (`~#EBEBE6`).
   - `HUxqfTaWEAAuV7u` and `HUxqfTaXAAEXIIQ` (Pem) render perforated steel wireframes in 1px electric blue (`#2B78F6`) on dark ink (`#10141B`) with dash-dot centerlines (`- · - · -`), `SCALE 1:1`, and rotated vertical spine bands (`18%` grey rail + `2%` accent rule).
   - In the proof round, `p03`'s station is a plain black rounded rectangle (`rx="26"`) and `p05`'s capsule is a 4-segment flat polygon (`proof.js:308`).

3. **Uncluttered breathing room and extreme typographic scale contrast.**
   - `HXB76bvWkAAEWR1` (Quattro `03/`) leaves the top ~45% of the sheet completely empty except for one small header line and a `19%`-height numeral, while `HS5xexRXMAAILvo` (`00/12`) leaves ~55% open light-grey field.
   - `HTfc7eoXYAEeFzi` (Meridian) slices `MERIDIAN & CO` cleanly in half along the bottom bleed of a full-blue transect plate; `HTK7m9MWwAAq7Hb` crops its wordmark off three edges at ~200% sheet width.
   - The proof round packs nearly every corner of every sheet (`p01`, `p03`, `p04`, `p05`, `p08`), leaving almost no true open margin.

4. **High-density generative data art and optical instrument HUDs.**
   - `HPnv8y9WAAAXU1Q` (Synthea) renders hundreds of translucent hairline chords across a spherical boundary, framed by CAD vertex-box handles (`□`).
   - `HFuMs05XkAE0AWs` features a circular orbital HUD dial with variable arc thicknesses and cardinal tick readouts, a wireframe globe with intersecting ground-track field ellipses, and a full-flood muted-sage telemetry ledger (`124.8M`, `0.084`, `94%`) mixing scatter plots and polar vector diagrams.
   - `HW9KFROWEAAPmsz` (Humanis) combines false-color spectral slit-scan streaks with cropped specimen indices (`N 7`, `C 6`) inside sharp rectangular boxes.

5. **Tactile print-layering and clean highlight blocks.**
   - `HTfc8OCWkAEQoXN` (Meridian `Field Grade`) places a solid accent rectangle behind `Grade` in black ink with generous leading so zero ascenders or descenders collide; `HS5xgPFXcAAGUCr` (Quattro `02/12`) lays one ~8%-wide vertical highlighter tape strip cleanly underneath black 1px construction arcs.
   - `HXB72_3WsAAf7xD` (Ontype Proof No. 02) breaks its inner poster border with a crisp white overhanging specimen slip; `HIBHhioXoAALCYk` (Shadcraft) cuts triangular notches directly into the adjacent image seam.

6. **Real photographic or shaded form beneath dither and ASCII screens.**
   - `HCWj_rfXcAAo_3z` (Quattro) and `HVbI-MfXUAAh86m` (Sensorium) pass genuine organic tonal gradients through `4x4` halftone or ASCII character screens, producing depth and light falloff. `p09` feeds flat cartoon vector rectangles and a circular head silhouette into an `8x8` dither (`gen/pilot.py`), yielding 1990s bitmap clipart.

---

## 3. Piece-by-piece critique (`p01` to `p09`)

### `p01-mark.png` — The mark, versions, wordmarks, lockups
- **What works:** Redrawing the mark as three chisel cuts converging under a datum bar solves the "upload icon" problem completely; `the gap = the last 0.10 m` ties mark geometry directly to IDSS Table 3.3.1.1-2. The dictionary definition (`bench`) gives the name depth.
- **Weak / ugly / concrete defects:**
  1. **Fake 3D bevels:** Both the big `cut` mark on the stone panel and the `D4·0017` bracket plate use synthetic 45° polygon gradients and CSS `inset 0 2px 0 #fff` + `text-shadow` (`p01-mark.html:22-25`), reading like glossy 2005 Photoshop buttons rather than cut stone or stamped aluminum.
  2. **Orientation contradiction:** `D4·0017` is a Dock flight bracket (`D4`), yet its plate carries the `0°` Parent mark pointing up instead of Dock's `90°` sideways mark (`p01-mark.html:95`).
  3. **`16px` breakdown:** In the `64 · 40 · 24 · 16` row, the `16px` mark loses its gap cleanly and its center stroke thickens/blurs.
  4. **`PETALS` and `PORT` hazard look:** Placing three broad arrowheads pointing inward (`phase: 180` in `proof.js:112-117`) creates a classic biohazard/nuclear trefoil silhouette, especially inside the circular `PORT` and `p08` patch.
  5. **Wordmark cracks (`W-A SLOT`, `W-B CHISEL`):** `SBP.stencil` (`proof.js:228-278`) rasterizes Geist onto a `<canvas>` and slices straight through every closed counter. At `84px`, `W-A` fragments the crossbar of `e` into a tiny floating nub; `W-B` turns `a` and `e` into ragged torn shapes. Worse, in `Lockups` (`l2`, `l3` at `37px`) and `p02` (`~28px`), the `1.5px` cuts collapse into blurry antialiasing cracks. Also in `l4`, `#752600` muddy brown `Bench` on `#FF5A0A` orange looks dirty.
- **Specific fixes:** Drop synthetic CSS bevels on `cut` and `plate` in favor of flat 2-ink engraving or cast-shadow stencil; enforce `90°` Dock orientation on `D4` plates; draw `PETALS`/`PORT` as true open-flanked trapezoidal IDSS alignment petals; author `W-A` as clean vector SVG paths cutting only `B`/`a`/`p` (never `e`) and ban stencil cuts below `48px`.

### `p02-cover.png` — Drawn orbital sunrise cover
- **What works:** The blue-black limb (`#090C13`) has real atmospheric glow and temperature, and `"Every model gets the same bench."` is crisp, plainspoken, and memorable.
- **Weak / ugly / concrete defects:**
  1. **Mark ambiguity:** Sitting right below the bright sun bloom without its own crisp datum bar, the three white legs look like a perspective highway or A-frame tent (`proof.css`/mark overlap with `gen/limb.py`).
  2. **Cracked top-left lockup:** `SpaceBench` uses the rasterized stencil at ~`28px`, making `a` and `e` look mis-rendered, while `Bench` in `#7C8493` fades into the starfield.
  3. **No benchmark signal:** Aside from three tiny `9.5px` labels (`DATUM THE HORIZON`...), there is zero telemetry, scale bar, or survey data — it looks like a generic launch-provider wallpaper.
- **Specific fixes:** Use solid Geist 700 for the small corner lockup; keep a hairline separation or crisp datum tick on the horizon mark; add a fine marginal survey ruler or `1,000,000` `atan2` determinism telemetry strip along one edge so the cover visibly belongs to a benchmark.

### `p03-plate.png` — Approach plate `D-4`
- **What works:** Strongest piece in the proof round. The aviation approach plate metaphor (plan + profile + contact minima + briefing) fits docking naturally. The `199 DECISIONS` bottom pulse barcode, `D-4` hierarchy, and dry briefing copy (`Missed approach: There is none. One attempt.`) work well.
- **Weak / ugly / concrete defects:**
  1. **Annotation collision:** Handwritten `rates under 0.2 before you go` runs straight across the vertical violet line (`THRUSTER 15 STICKS OPEN · T+28:29`) (`p03-plate.html:127`).
  2. **Unlabelled dashed line in Profile:** The `200 m` keep-out sphere dashed line just below `250 M` has no label (`p03-plate.html:97`), leaving an unexplained rule.
  3. **Cramped `FINAL 10 M` tape & `PLAN · SEEN FROM ABOVE`:** `FINAL 10 M` sits flush against the right edge of the tilted purple tape (`x1 + 30`), and `PLAN · SEEN FROM ABOVE` sits `10px` from the overhanging stack (`right: 200px` vs `width: 190px`).
  4. **Toy station & `4` stencil slice:** `STATION` is a plain `rx="26"` pill; `PORT` label nearly touches the `-15°` corridor line; the slot through `D-4` severs the left triangle of `4` awkwardly; `Reenie Beanie` (`38px`) feels slightly loose/digital beside tight `1.8px` SVG arrows.
- **Specific fixes:** Offset `rates under 0.2` to the left of `T+28:29` (`left: h10[0] - 480px`); label `KEEP-OUT 200 M` on the profile line; add right padding inside the `FINAL 10 M` tape; draw `STATION` as a true CAD pressurized docking node + truss; leave `D-4` un-stenciled in solid Geist 800.

### `p04-bullseye.png` — 30 approach traces on violet
- **What works:** Full `#6B3BFF` violet flood gives real presence, and overlaying 30 seeded trajectories down the docking axis (`0.10 m`, `1 m`, `10 m` log rings) creates an authentic per-model fingerprint.
- **Weak / ugly / concrete defects:**
  1. **Curve cutting stamp:** The bright thick white trajectory (`seed 17`) slices directly through the `SPECIMEN · NOT A RESULT` dashed badge at bottom-right (`p04-bullseye.html:37` vs `:20`).
  2. **Low-contrast black `/30` on violet:** Setting `24` in white (`pitch: 22`) and `/30` in near-black `#090C13` at half height (`pitch: 11`) looks mismatched and sinks `/30` into the violet ground (`p04-bullseye.html:50`).
  3. **Headline clutter:** Thin white trajectories pass directly behind `Inside / the circle,`, softening edge contrast, and `10 M` collides with curve tangles.
- **Specific fixes:** Clip the SVG trajectory field cleanly to a circular or safe rectangular viewport above the footer and left of the headline margin, OR mask an ink/violet halo behind `Inside the circle` and `SPECIMEN`; set `24/30` in unified white dots (or put `/30` in Geist Mono caps beside `24`) and use crisp hollow vs solid circles for pass/fail endpoints.

### `p05-flight.png` — Strobe and 16-row thruster score
- **What works:** The 16-row thruster score (`01`..`16` grouped in 4s, row `15` pulsing violet after sticking open at `T+28:29`, proportional pulse widths at `13x`) is the single best data-driven graphic in the entire proof round.
- **Weak / ugly / concrete defects:**
  1. **Text collision on `HOLD 250 M`:** The vertical dashed line `KEEP-OUT 200 M` bisects the label `HOLD 250 M` right between `250` and `M` (`X(200)` vs `X(250)+6` at `y=72` vs `348`? Actually `X(250)` label is at `348`, wait—`X(200)` line at `x=X(200)` passes straight through `HOLD 250 M` at the bottom because `X(250)` and `X(200)` on a log scale are only ~48px apart!).
  2. **Box collision in `h1`:** The `#8E6BFF` highlight box behind `0.039 m/s` (`line-height: 0.94`, `p05-flight.html:6-7`) rides right up against the descender/baseline of `Flight 0017 arrived` above it and crowds `too fast.` horizontally.
  3. **Muddy strobe pile-up:** Between `HOLD 30 M` and `STATION`, 100+ stacked `SBP.capsule` outlines turn into a cluttered grey tangle with jagged violet fuzz lines (`p05-flight.html:50-51`).
- **Specific fixes:** Increase `h1` `line-height` to `1.12` and add horizontal separation before `too fast.`; stagger `HOLD 250 M` left or raise `KEEP-OUT 200 M` out of its path; render only key decision keyframes (plus faint tick centroids) in the strobe rather than every opaque `fill="#0B0F18"` outline, and replace jagged `1.6px` plume whiskers with clean stippled vector cones.

### `p06-collision.png` — Fact poster (`0.10 m/s`)
- **What works:** `"Docking is a slow collision."` paired with dry deadpan spec rows (`Nothing about this is quick.`) is strong brand voice.
- **Weak / ugly / concrete defects:**
  1. **Serious `g` / highlight box overlap:** In `p06-collision.html:7-10`, `line-height: 0.9` causes the descender of `g` in `Docking` to overlap the top edge of the violet `::before` rectangle behind `slow`, while the bottom of the rectangle nearly touches `collision.` (`i`/`l` ascenders).
  2. **Accidental sunburst background:** Cropping the `1740px` mark at `(-330, -170)` hides its datum bar completely off-frame, turning the three legs into baffling light-grey triangles radiating from behind the letter `g`.
  3. **Cluttered ghost dots in `0.10`:** Rendering unlit matrix holes (`ghost: 0.3`, `p06-collision.html:38`) turns `0.10` into a noisy LED scoreboard rather than the clean active-dot graphics of `HF4fY56agAAD9YE`.
- **Specific fixes:** Set `h1` `line-height: 1.08` and tighten the `::before` vertical padding (`top: 0.14em; bottom: 0.06em`) so zero glyphs touch; remove the cropped sunburst mark and replace it with a true-scale `4.0 m` vs `0.10 m` tolerance bar (`40:1`) running across the bottom or margin; set `ghost: 0` on `0.10`.

### `p07-sensor.png` — Lidar returns at 250, 30, and 10 m
- **What works:** Translating `Madonna et al. 2025` range-dependent noise (`6 mm` lateral, `34 mm` LOS at `10 m`) and the 3-petal port into real SDF ray-cast graphics is a compelling fusion of science and visual identity.
- **Weak / ugly / concrete defects:**
  1. **Pegboard appearance at `10 m`:** On a `124 × 141` grid (`p07-sensor.html:29, 65`), uniform `pitch * 0.46` circles look like plastic beads on a pegboard instead of crisp laser LiDAR returns.
  2. **Awkward `10` vs `250` header balance:** In column 3, narrow `10` leaves a big dead hole next to `RAYS RETURNED 11,536`, whereas wide `250` crowds column 1's text.
  3. **Missing optical framing:** No bore-sight crosshair, FOV gate (`26°`), or range-scale ticks appear inside the sensor windows, making them feel like standalone illustrations rather than live instrument frames.
- **Specific fixes:** Double resolution to `248 × 282` with finer intensity-scaled dots (`0.22–0.36 * pitch`), add crisp `1px` grey bore-sight crosshairs and corner CAD registration ticks (`□`), and lock all three dot numerals inside a fixed-width top-left bounding box.

### `p08-objects.png` — Physical objects flat-lay
- **What works:** Turning SpaceBench into physical aerospace ephemera (mission patch, `Remove Before Flight` streamer, matched-board badge, `D-4` cue card with hand-ticked limits, bracket plate, four verb stickers) delivers directly on nostalgia.
- **Weak / ugly / concrete defects:**
  1. **Plastic CSS shadows & bevels:** Heavy blurred `drop-shadow(0 14px 18px ...)` on every item (`p08-objects.html:8`), fake metallic bevel on `D4·0017`, and plain `stroke-dasharray` circle on the patch look visibly computer-generated.
  2. **Clipped & cramped streamer:** The `SPECIMEN` ribbon (`top: -30px`) is chopped flat at the top edge; rotated `SPECIMEN` nearly touches its side edges while `SPACEBENCH · TAG 01` is squeezed tight along the left margin.
  3. **Inconsistent mark & generic stickers:** The patch holds the biohazard-looking 6-wedge/3-petal emblem, the badge holds the `90°` Dock mark, and the `D4` bracket plate holds the `0°` Parent mark. The four stickers (`Hold.`, `Coast.`, `Pulse.`, `Contact.`) look like generic rounded web pills.
- **Specific fixes:** Render physical items flat in crisp technical-manual orthographic/axonometric print style (`HW-WGKfXoAAt_JM`, `HUyssnEWwAANUjn`) with sharp `2px` hard offset shadows or none; fix the `D4` plate to `90°` Dock orientation; give stickers chamfered technical contours (`HROmPjTaUAA_kOj`); convert the bracket plate into a flat punched specimen card.

### `p09-pilot.png` — Human pilot in ordered dither
- **What works:** Putting the matched-board human pilot in the same dark ink palette with ordered dither directly honors `DESIGN.md`'s human-pilot rules.
- **Weak / ugly / concrete defects:**
  1. **Clipart geometry under dither:** Simple flat circles, headphone rectangles, and a featureless purple central blob fed through `8x8` Bayer dither (`gen/pilot.py`) look like crude 1998 pixel art (especially the desk edge and mouse blob bottom-right).
  2. **Fake dummy telemetry bars:** The bright rectangular white strips flanking the reticle carry zero real numbers or labels — contradicting the data-driven tech axis.
  3. **Awkward orphan line break:** `Same display. / Same / commands. / Same pause.` strands `Same` alone on line 2 (`p09-pilot.png` top-left).
- **Specific fixes:** Replace the dummy monitor rectangles with an authentic high-contrast wireframe 3D cockpit/FDAI attitude ball + real Geist Mono readouts (`RNG`, `CLS`, `Y/Z`, `P/Y/R`, `16 THRUSTERS`), shade the pilot silhouette from a real 3D mesh normal/lighting pass before dithering (or use a 45° line-screen engraving), and break the headline cleanly as `Same display. / Same commands. / Same pause.`

---

## 4. Look-alike risks

1. **`p01-mark.png` IPA dictionary card -> Ontype (`HV5wya8XsAAYgQm`, `HXB72_3WsAAf7xD`).** `gap-analysis.md` flagged Ontype's tagline (`Nothing Invented. Everything Derived.`), yet `p01` immediately copied Ontype's exact phonetic dictionary layout (`bench /bɛntʃ/ n.` vs `ON /ɒn/ ADJ.`) and `"Proof No. 01"` series header.
2. **`p03-plate.png` overhanging 3-tier label stack -> Pem Hardware (`HUxqfTbWwAAJ-L_`).** The white / accent / black 3-row tabular tag (`Plan view / D-4 · Stuck thruster / Not to scale`) hanging off the bottom-right corner of the frame matches Pem's `SCALLOPED BORE PLATE / 90° BEND · 2× SLOT / CORNER CHAMFER` almost pixel for pixel.
3. **`p06-collision.png` layout formula -> Meridian (`HTfc8OCWkAEQoXN`) + Wantex (`HF4fWRhasAMSprj`) + Quattro (`HXB76bvWkAAEWR1`).** Highlighting one headline word in an accent box (`[slow]` vs `[Grade]`), placing large dot numerals below, and stacking deadpan rule-separated rows combines three reference clichés in one poster.
4. **`p02-cover.png` orbital glow -> Monoic (`HWsLgryX0AAQxXF`, `HDSuE_eaQAIlIcc`).** A dark blue-black film-grained horizon arc with a small centered mark echoes Monoic's atmospheric horizon slides closely without adding benchmark-specific geometry.
5. **`p04-bullseye.png` violet concentric curves -> Physalia (`HU8l1ovXEAETBQe`, `HU8l0KGWsAAnn2A`).** While the 30 trajectory traces are real SpaceBench math, the saturated violet ground with fine white swirling concentric lines sits uncomfortably close to Physalia's concentric cobalt diagram.

---

## 5. Where `brand/gap-analysis.md` is wrong, shallow, or missed something

1. **It missed the core product UI completely.** `gap-analysis.md` analyzed 137 references and spawned 9 posters while ignoring how the actual leaderboard (`brand/exports/leaderboard-dock.png`), replay viewer, and paused cockpit telemetry console should look. Yet those screens are where users and researchers actually spend time.
2. **It mistook digital faux-physical CSS effects for print/hardware nostalgia.** Calling for "riveted plates", "handwritten pen", and "objects" without specifying flat printmaking mechanics led directly to `p01`/`p08`'s shiny CSS bevels, blurred drop shadows, and `Reenie Beanie` webfont. The best references (`HTfc6bHWUAIF8Z1`, `HU8l0KGWsAAnn2A`, `HW-WGKiW8AAHE19`) feel physical through ink screens, stipple, CAD rules, and paper tone — never CSS `box-shadow` depth.
3. **It missed aerospace-instrument nostalgia inside our own domain.** Section 5.13 treats historical space imagery as an optional external photo archive, missing the rich native instrumentation of 1960s–80s spacecraft: the 8-ball FDAI attitude sphere, Apollo DSKY numeric register blocks, punched Hollerith aperture cards, vernier/logarithmic range rulers, and phase-plane deadband boxes.
4. **It ignored its own warning on copycat motifs and `SB Matrix` repairs.** It rightly killed Ontype's tagline (`Nothing invented...`) and Wantex's particle arc, yet endorsed Ontype's dictionary-entry card (`§5.8`), `"Proof No. 01"` numbering, and giant ghosted cropped marks (`p06` proved why blindly cropping a 3-wedge mark at `1740px` fails). Likewise, `§5.11` promised `SB Matrix` pictograms on the dot grid and strict `>=80px` sizing, neither of which materialized coherently across `p04`/`p06`/`p07` (`10` and `250` in `p07` and `/30` in `p04` still run well under `80px`).
5. **It underestimated the stencil wordmark problem.** `§5.2` suggested cutting a slot the width of the mark's gap into Geist 800; in practice (`p01`, `p02`), uniform vertical cuts split `e` crossbars into detached slivers and turn into broken pixel cracks at UI/header sizes (`<=37px`).

---

## 6. Ranked list of the 12 highest-impact improvements

1. **Design the Leaderboard & Telemetry Console Plates (Data-Driven Tech + Aesthetic)**
   - **What to make:** Two new canonical sheets replacing the neglected UI exports: (a) the **Leaderboard Sheet** showing Model A across reasoning levels (`high/med/low`), PID/LQR/Random baselines, and Matched Human rows, replacing illegible 20px `SB Matrix` percentages with crisp `14px` tabular Geist Mono numbers and a **`28px` SVG mini-bullseye rosette per row** plotting all 30 final contact offsets against the `0.10 m` ring; and (b) the **Paused Pilot Telemetry Display** (`400 m` range, `closing`, `sideways`, `P/Y/R` angles & rates, fuel remaining, 16-thruster readiness).
   - **Reference evidence:** `HFuMs05XkAE0AWs` (full-flood sage/ink data ledger + polar vector diagrams), `HW-WGKcXAAAJG32` (clean rail UI + precision hardware dial).
   - **Project tie-in:** `DESIGN.md §2 & §4.3` (per-reasoning-level rows, 30 hidden seeds, Wilson intervals, matched human board vs paused telemetry).

2. **Build One Parametric 3D CAD Geometry Module for Vehicle & IDSS Port (Data-Driven Tech + Aesthetic)**
   - **What to make:** Replace `rx="26"` station lozenges (`p03`) and 4-line polygons (`p05`) with one deterministic wireframe/orthographic CAD generator: `4.0 m` dia × `8.1 m` Dragon-class capsule, 16 Draco thruster pods with real firing cones, and the IDSS port (3 outward-flaring trapezoidal alignment petals at `120°`, 12 passive hook positions, capture ring). Render in 1px hairline CAD lines with dash-dot centerlines (`- · - · -`), CAD corner handle squares (`□`), and `IDSS REV F` callouts (`p03`, `p07`, `p08`, replay view).
   - **Reference evidence:** `HTfc6bHWUAIF8Z1` (Meridian dimensioned transverse section), `HUxqfTaWEAAuV7u` (Pem blue CAD wireframe on dark ink), `HROmPjTaUAA_kOj` (DroneOS CAD mesh).
   - **Project tie-in:** `DESIGN.md §4.1 & §11` (`8.1 m × 4 m`, `16 × 400 N` thrusters, `3 petals`, `12 hooks`, IDSS Rev F).

3. **Adopt 45-Degree Engraved Line Screens & Stochastic Stipple Shaders (Nostalgia + Aesthetic)**
   - **What to make:** Replace flat CSS gradients, shiny bevels, and `512px` overlay grain with two deterministic algorithmic SVG/canvas halftone shaders: (a) a **45° variable-width engraving line screen** for Earth limbs (`p02`), docking rings, and pilot portraits (`p09`); and (b) a **stochastic airbrush stipple wave** for thruster plumes (`p05`) and keep-out sphere halos (`p03`).
   - **Reference evidence:** `HU8l0KGWsAAnn2A` & `HVBmvGRWoAAzQSN` (Physalia 45° engraved halftone), `HW-WGKiW8AAHE19` & `HW-WGKeWkAEXgLq` (Achievable stochastic orange stipple).
   - **Project tie-in:** Ties directly to SpaceBench's deterministic pure-math shader ethos — every dot/line screen generated reproducibly from geometry without borrowed photos.

4. **Add the 8-Ball FDAI Attitude Sphere & 6-DOF Phase-Plane Plot (Nostalgia + Data-Driven Tech)**
   - **What to make:** A signature SpaceBench visual pairing for pilot consoles, plates, and posters: (a) an orthographic 1px wireframe **FDAI "8-ball" attitude sphere** with pitch/yaw/roll deadband rings (`±4.0°`) and rate vectors (`±0.20 deg/s`); beside (b) a **phase-plane portrait** plotting lateral position vs lateral velocity converging inside the violet `0.10 m × 0.04 m/s` IDSS box.
   - **Reference evidence:** `HFuMs05XkAE0AWs` (circular orbital telemetry HUD & wireframe sphere), `HPnv8y9WAAAXU1Q` (Synthea spherical chord mesh).
   - **Project tie-in:** `DESIGN.md §3 & §4.2` — visibly proves SpaceBench's #1 differentiator ("true six-axis piloting, where rotation and translation interact") and encodes all 7 IDSS contact limits directly.

5. **Turn `p01`/`p08` Bracket Plates into Punched Aperture Specimen Cards (Nostalgia + Remarkability)**
   - **What to make:** Replace the faux-beveled aluminum `D4·0017` plate (`p01`, `p08`) with a flat **archival Hollerith / aperture specimen card**: warm clean-room paper (`#ECEEF1`) with a chamfered top-right corner, real punched rectangular holes encoding the flight's 16-hex state hash and seed, crisp 1px registration ticks, and a solid `#6B3BFF` Dock `90°` title strip (`SB-D4-0017`).
   - **Reference evidence:** `HTfc6bHWUAIF8Z1` & `HTfc8OCWkAEQoXN` (Meridian flat stamped plates & punched title blocks), `HROmPjTaUAA_kOj` (chamfered corners).
   - **Project tie-in:** Every scored replay in `SpaceBench` really carries a seed, tier, and per-tick state hash (`AGENTS.md`, `DESIGN.md §5`).

6. **Create the `atan2` Determinism Bit-Exact Verification Strip (Data-Driven Tech + Remarkability)**
   - **What to make:** Replace generic barcode fillers with a SpaceBench-specific **bit-exact parity strip**: a compact full-width variable-pulse telemetry ribbon comparing `NATIVE` vs `WASM32` state hashes tick-by-tick (clean crisp white/ink tick marks for matching ticks, bright violet spike if a divergent bit occurs, annotated `LIBM 0.2.16 · 0/N DIVERGENCES · REF: 125,801 / 1,000,000 NATIVE ATAN2`). Use across `p02` footer/margin and replay verification cards.
   - **Reference evidence:** `HMzw7EkWwAARxpz` (Amatista highlighted spike spectrum) + `HS5xexRXMAAILvo` (Quattro tapered bar strip).
   - **Project tie-in:** Anchored in the real `AGENTS.md` measurement (`125,801` native vs `libm` `atan2` divergences on `1,000,000` inputs).

7. **Upgrade `p07` Sensor View into a Calibrated LiDAR Bore-Sight Frame (Data-Driven Tech + Aesthetic)**
   - **What to make:** Increase SDF ray grid to `248 × 282`, taper dot radius by return strength (`0.18–0.34 × pitch`) so `10 m` reads as crisp point-cloud geometry rather than polka-dot beads, add 1px bore-sight crosshairs, azimuth/elevation scale ticks (`26°` FOV), and CAD corner pins (`□`) bounding each sensor frame, with `250`, `30`, `10` locked in fixed-width header boxes.
   - **Reference evidence:** `HROmPjTaUAA_kOj` & `HPnv8y6WMAEOsWW` (DroneOS radial micro-dot point cloud), `HPnv8y9WAAAXU1Q` (CAD corner handles).
   - **Project tie-in:** Uses real `Madonna et al. 2025` parameters (`6 mm` sideways, `34 mm` LOS at `10 m`), clearly distinguishing sourced `10 m` noise from assumed linear scaling at `30 m` and `250 m`.

8. **Redesign `PETALS` / `PORT` Emblems & Fix the Vector Wordmark (Remarkability + Aesthetic)**
   - **What to make:** Rebuild `PETALS` and `PORT` (`p01`, `p08` patch) using three open-flanked trapezoidal IDSS alignment petals at `120°` (NOT inward-pointing 3-blade hazard arrows) framed by 12 crisp latch-hook bars. Author the `SpaceBench` wordmark as pure vector SVG paths with surgical stencil slots ONLY on `B`, `a`, and `p` (leaving `e` intact), and mandate solid Geist 700 below `48px` (`p02` corner, UI headers).
   - **Reference evidence:** `HWsLiMIXIAEsqZH` (Monoic custom chamfered SVG wordmark), `HINk1iqXQAABWgt` (Recove unified slit geometry).
   - **Project tie-in:** Accurately reflects IDSS Rev F (`3 petals`, `12 hooks`, `0.10 m` capture envelope) while eliminating broken `e`/`4` glyph fragments.

9. **Build the Logarithmic Vernier Replay Scrubber & Approach Ruler (Nostalgia + Data-Driven Tech)**
   - **What to make:** A precision horizontal scrubber for `p03`, `p05`, and the browser replay app: a fine vernier ruler graduated logarithmically from `400 m` on the left to `0.00 m` on the right, with tall stepped ticks at `250 m`, `200 m`, `30 m`, `10 m`, and `0.10 m`, plus a translucent violet sliding cursor gate over the active decision tick (`0.035 s` pulse ticks underneath).
   - **Reference evidence:** `HQ14QaHXoAANM8W` (fine horizontal vernier ruler with fading ticks), `HS5xgPFXcAAGUCr` (translucent accent tolerance tape).
   - **Project tie-in:** Directly visualizes `DESIGN.md`'s `400 m` start, `200 m` keep-out, `250/30/10 m` holds, and `0.035 s` pulse-then-coast decisions.

10. **Introduce the Rotated Folio Spine & Clean-Edge Overhanging Slip System (Nostalgia + Remarkability)**
    - **What to make:** Replace Pem's 3-tier corner tag (`p03`) and Ontype's dictionary panel (`p01`) with a signature SpaceBench plate architecture: a vertical `10%`-width left spine band carrying a `90°`-rotated Geist 800 plate code (`D-4 · STUCK THRUSTER`), separated by a `2px` accent rule and topped by one crisp overhanging white or violet paper specimen tab (`SB-D4-0017`) breaking the top border.
    - **Reference evidence:** `HUxqfTaXAAEXIIQ` (vertical spine rail), `HXB72_3WsAAf7xD` (overhanging paper tab breaking poster margin), `HNxh-DxW0AAi0CF` (Meridian Plate 05 spine + barcode).
    - **Project tie-in:** Scales naturally across all 6 Dock tiers (`D-1`..`D-6`), Landing plates (`L-1`..), and benchmark papers.

11. **Re-stage `p09-pilot` with True Shaded 3D Mesh + Real HUD + Hand-on-Controller Close-up (Nostalgia + Data-Driven Tech)**
    - **What to make:** Replace the cartoon blob monitor in `p09` with a tight cropped view of a pilot's gloved/bare hand resting on a 6-axis translational/rotational hand controller (`TX/TY/TZ`, `RX/RY/RZ`), shaded from a real 3D mesh normal pass before passing through a fine 45° line screen or ordered halftone, with the real paused telemetry readout sharp in the upper half (`CLOCK: PAUSED · THINKING 13.7 S`).
    - **Reference evidence:** `HCWj_rfXcAAo_3z` (Quattro crisp shaded dithered figure), `HF4fWRhasAMSprj` (Wantex coarse 45° halftone hands), `HXB7oGtXUAATEr4` (sharp HUD frame over textured raster).
    - **Project tie-in:** Directly anchors the matched human pilot board (`DESIGN.md §2`: hand-flown thruster commands, paused clock, thinking time column).

12. **Rebuild `p06-collision` Around a True `4.0 m : 0.10 m` Physical Scale Bar (Aesthetic + Remarkability)**
    - **What to make:** Delete the giant background mark behind `Docking`, fix `h1` leading so `slow` never touches `Docking` or `collision.`, turn off `ghost` dots in `0.10`, and dedicate the entire middle band (`~35%` quiet paper height) to one razor-sharp `1:1`-proportioned comparison bar: the `4.0 m` capsule width in dark ink beside a `0.10 m` (`2.5%`-width!) violet contact window (`0.05 to 0.10 m/s`), letting real physical scale carry the emotional weight.
    - **Reference evidence:** `HXB76bvWkAAEWR1` (Quattro ~45% open breathing room + minimalist rule diagram), `HTfc8OCWkAEQoXN` (clean `[Grade]` highlight box with zero line collision).
    - **Project tie-in:** Uses true `4.0 m` vehicle diameter vs `0.10 m` IDSS sideways misalignment limit (`DESIGN.md §4.2 & §11`).

---

## 7. Three things to stop doing

1. **Stop shipping synthetic CSS 3D chrome (bevels, metallic gradients, blurred drop shadows, and `Reenie Beanie` placeholder script).** Every plastic highlight (`D4·0017`), blurred flat-lay shadow (`p08`), and uniform cursive font (`p03`) undermines the precision-engineering credibility that clean flat ink, 1px CAD lines, and halftone screens establish effortlessly.
2. **Stop faking technical visuals with unlabelled shapes and dummy geometry.** Stop drawing `rx="26"` lozenges for the ISS (`p03`), blank white blocks for HUD readouts (`p09`), and arbitrary background sunbursts (`p06`); every graphic element on a SpaceBench sheet must derive from real vehicle dimensions, real simulator telemetry, or explicit physical scale ratios.
3. **Stop copying specific reference framing devices verbatim.** Stop using Ontype's IPA dictionary block (`p01`), Pem's 3-row stacked corner label (`p03`), and Meridian's highlight-box + spec-row poster template (`p06`), and stop running rasterized `canvas` stencil cuts through Geist at small sizes.
