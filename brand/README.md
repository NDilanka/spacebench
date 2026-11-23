# SpaceBench brand kit, Rev. B

Open `index.html` in a browser. It is the brand standard, and it renders every rule from the files in this folder.

## What is in the kit

| Folder | Contents |
|---|---|
| `index.html`, `css/book.css`, `js/book.js` | The brand standard |
| `tokens/` | Colours, type, spacing, line weights and motion as CSS custom properties, JSON and TypeScript |
| `css/brand.css` | Interface components (`sb-` classes) |
| `css/sheet.css`, `js/sb-draw.js`, `js/sb-hershey.js` | Drawing sheets: line classes, title block, dot numerals, plotter alphabet |
| `js/sb-logo.js`, `logo/` | The mark and wordmarks, inline and as SVG and PNG; `logo/geometry.json` holds the numbers |
| `js/sb-graphics.js`, `graphics/` | Graphic devices and pictograms, inline and as static SVG |
| `fonts/` | Geist and Geist Mono (SIL OFL 1.1), SB Matrix (ours), SB Display (Geist with our cuts, SIL OFL 1.1), the Hershey acknowledgement |
| `tools/` | `post-image.html`: type a line and save it as a picture set in SB Display. `plume.js` holds its grounds |
| `textures/` | The plume field in six crops, and `textures.json`, which records how it was made |
| `data/` | Simulator output used by the sheets: state hashes, the negative control, the gate run, the vehicle table |
| `templates/` | Six drawing sheets, profile picture, banner, share card, tier poster, leaderboard card |
| `exports/` | The templates rendered to PNG |
| `partners/` | Factory and GMI Cloud logos, as supplied |
| `build/` | The scripts that generate all of the above |
| `proof/`, `proof2/`, `gap-analysis.md` | Records of the two proof rounds that led to Rev. B. Not part of the kit |

## The rules in one screen

- The mark is one disc with a line and a broad arrow cut out of it. Parent 0 deg, Dock 90 deg, Landing 180 deg.
- The parent brand is black and white. Dock is violet (`#6B3BFF` on film, `#8E6BFF` on ink). Landing is orange (`#FF5A0A`, `#FF7A33`). One accent per page.
- Four type voices: Geist, Geist Mono, SB Matrix dot numerals at 72 px and up only, and a plotter alphabet for one or two hand notes on a sheet. No serif. No text under 11 px.
- SB Display is the display wordmark's lettering as a font: Geist 800, cut where a bowl leaves its stem, and on the centre line of a round with no stem. 68 px and up, tracking 0, one line on an identity piece.
- Three line weights: cut 1.25, axis 0.45 (chain), dimension 0.35.
- No shadow, bevel, glow, gradient or paper grain. Nothing drawn touches type.
- One texture, the plume field, on identity pieces only (cover, profile picture, banner, share card). Never behind data.
- No sample data. A piece that will carry results is drawn empty and says so.

## What is real and what is a picture

- **Contact limits** are the reference contact conditions of IDSS IDD Rev F, table 3.3.1.1-2, adopted as the pass rule. They are not Dragon flight limits.
- **State hashes, the negative control and the gate run** are output of `crates/core`, produced by the scripts in `build/gen/`. The gate run is the core's scripted run for seed 1: no pilot, no target, no scenario. The replay's hash equals `scripted_run` at ticks 0, 1, 7, 1000 and 200000.
- **The thruster layout** is the core's placeholder table. It is not Dragon's layout. Mass and inertia are estimates.
- **The 125,801 of 1,000,000 figure** on the "two builds" sheet is quoted from `AGENTS.md`. It was not rerun for the kit.
- **The plume field** is a picture of the gate run, not a measurement. It maps where thruster exhaust pointed over the run. The spread, blur, drift and grain are picture choices listed in `textures/textures.json`. There is no physical plume model.
- **Tier poster figures** come from `DESIGN.md` section 4.4. Tier parameters are provisional, and the posters say so. The marked thrusters on tiers 4 and 5 are labelled examples.
- **Nothing else exists yet.** No docking flight, scenario, station, baseline controller or model result. The leaderboard, the contact figure, the seed field and the pilot display are therefore empty.

## SB Display and posts on X

`fonts/SBDisplay.ttf` installs like any font (on Windows: open it and choose Install). After that it is in the font list of Figma, Canva's desktop upload, PowerPoint and the rest as "SB Display".

- Typing `SpaceBench`, `SpaceBench Dock` or `SpaceBench Landing` gives the display wordmark. `build_display_font.py` compares the font's outline with the logo files and fails if any point is more than 0.75 of a font unit away.
- The mark is typed as `:sb:`, `:dock:` or `:landing:` where ligatures are on, or entered as U+E000, U+E001, U+E002.
- The wordmark's tracking is built into the letters. Set letter-spacing to 0.
- Cut: a b d g o p q, B D O P Q R, 0 6 8 9, and their accented forms. The small numerator and denominator figures are not cut.
- It is not hinted. It is for 68 px and up, where hinting does nothing.

**X cannot show it in post text.** X sets every post, name and bio in its own typeface, and no font file changes that. The lettering reaches a post as a picture: open `tools/post-image.html`, type the line, choose the simulation, the ground and the size, and download the PNG. The page also gives alt text for the picture.

The same page lists a plain-text signature for display names and bios: `◓ SpaceBench`, `◑ SpaceBench Dock`, `◒ SpaceBench Landing`. Those are ordinary Unicode characters that every device draws in its own font. They are a stand-in, not the mark, and a screen reader may read the half disc aloud by its Unicode name.

## Building

Needs Python 3 with `fonttools`, `brotli`, `uharfbuzz`, `skia-pathops`, `numpy`, `scipy`, `pillow` and `playwright`; Google Chrome; Node 24; and Rust with the repository's toolchain for the data and texture steps.

Run from `brand/`, in this order:

```
py build/build_tokens.py        # tokens/, js/sb-tokens.js
py build/build_font.py          # fonts/SBMatrix.*
py build/build_logo.py          # logo/svg, logo/geometry.json, js/sb-logo.js (cuts from build/cuts.py)
py build/build_display_font.py  # fonts/SBDisplay.*, checked against the logo files just written
py build/gen/hershey.py         # js/sb-hershey.js from build/gen/futural.jhf
py build/gen/vehicle.py         # data/vehicle.js, read from crates/core/src/lib.rs
py build/gen/hashes.py          # data/hashes.json, from the repository's two gate tools
py build/gen/flight.py          # data/flight1.js and data/hashes.js
py build/gen/negctl.py          # data/negctl.js
py build/build_texture.py       # textures/
py build/build_tools.py         # tools/plume.js, the grounds of the post-image page
py build/export.py --prune      # exports/, logo/png, graphics/
```

`hashes.py` needs the gate's own builds to exist (`target/release/native_hash.exe` and the WebAssembly file), so run `scripts/check.ps1` first. `flight.py` runs after `hashes.py` because it checks its replay against those hashes.

`build/cuts.py` is the one list of cuts. The logo and the font both read it, so a cut moved there moves in both.

`export.py` runs the type check in `build/check.py` on every template and exits non-zero if any text is near the edge, overlaps other text, has drawing behind it, or is under 11 px. On pieces that sit on the plume field the "drawing behind it" check is off. `--only=name` exports a subset. `--prune` deletes exports the script no longer makes.

## Scratch code that is not part of the repository's build

`build/gen/sbdump/` is a small Rust program that replays the scripted run through the core's public API and prints the state per tick. `build/gen/negctl.py` builds a modified copy of the core. Both are their own cargo workspaces and build into `.work/`, which git ignores. They read `crates/core` and never change it. `proof2/order-draft.md` is a draft order for the lead session that would replace them with a supported trace tool in the repository.

## Credits and third-party marks

- Geist and Geist Mono: SIL Open Font License 1.1, `fonts/Geist-OFL.txt`.
- SB Display is a Modified Version of Geist and is under the same licence. It carries the Geist copyright notice and a different name, as the licence asks. Keep `fonts/Geist-OFL.txt` with it when the font file is passed on. It may not be sold by itself.
- Plotter alphabet: Hershey Roman Simplex. Free for any use provided the acknowledgement travels with the data. It is in `fonts/Hershey-ACKNOWLEDGEMENT.txt` and in the header of `js/sb-hershey.js`.
- `partners/` holds the Factory and GMI Cloud logos exactly as supplied. They belong to those companies. The banner places them whole and never redraws or recolours them. GMI Cloud supplied a white logo only, so the partner row exists on the ink banner only. Confirm the "Powered by" wording and the logo use with both companies before publishing.
