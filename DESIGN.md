# SpaceBench design brief

Status: brainstorm stage, 2026-11-13. Nothing is built yet. Research was gathered by web-research agents; items marked "unverified" were not confirmed against a primary source.

## 1. What SpaceBench is

SpaceBench is a benchmark family that tests LLMs on closed-loop control of spacecraft in simulators. The first simulation is **SpaceBench Dock**: dock a capsule to a space station, in the spirit of the SpaceX ISS docking simulator. More simulations follow under the same harness.

Goals, in stages: a public leaderboard and website, shareable replays, then a research paper.

## 2. Decisions made

| Topic | Decision |
|---|---|
| Name | SpaceBench, on a purchased domain (`.ai`, `.si`, or `.io`). First simulation is "SpaceBench Dock". |
| Headline track | Numeric telemetry, simulator paused while the model thinks, flown by hand through thruster commands. |
| Later tracks | Vision (screenshots), then autopilot (model writes a controller). Never pooled with the headline track. |
| Real time | Not a track. Thinking time per step is a reported column. |
| Physics | True rigid-body dynamics in version 1. Orbital relative dynamics in the engine as a harder tier. |
| Fidelity | Staged: version 1 ends at first contact on a Dragon-class vehicle from public parameters; capture and latching mechanics next; exact as-flown Dragon only if real data arrives. See section 11. |
| Stack | Rust simulation core; WebAssembly and Python bindings; Python evaluation harness; three.js browser app. |
| Human play | In version 1, on the same scenarios the models fly. |
| Action model | Each turn: thruster pulses plus a coast time up to a cap. The simulator interrupts a coast on important events. Cap to be confirmed in a pilot run. |
| Test set size | 30 hidden seeds per difficulty tier per model at launch. |
| V-BAR | Stay independent and cite it. |
| Attempts | Single attempt is the headline. A multi-attempt learning track comes later. |
| Openness | Decide later. Private during development. Hidden test seeds and the referee key stay private in any case. |
| Second simulation | Booster landing. |
| Timeline | No deadline. Quality first. |
| Telemetry | Pilot display (offsets, attitude errors, rates) for the headline, the same instruments humans see. Raw state vectors as a harder variant. |
| Human pilots | Two public boards with accounts: live play (real time, 3D view) and matched (same pilot display and commands as models, simulator paused). Only the matched board is compared with models. Submitted flights are action logs that the server re-simulates, so a score cannot be faked without a valid flight. |
| Reasoning effort | Every reasoning level each model offers, each shown as its own row. |
| Briefing | Two prompts, reported side by side: a controls reference only, and a full pilot manual with strategy. |
| Tools on the hand-flown track | Thruster commands plus a notes scratchpad. No calculator or code tool, which belong to the autopilot track. |
| Reasoning in replays | Shown next to the flight where the provider returns it. |
| Leaderboard entries | Only runs we perform. |
| Vision track image | Camera view with no numbers is the vision headline. A cockpit view with the instrument overlay runs as a smaller control, to separate reading numbers off an image from judging the scene. |
| Seed rotation | Decide after launch. |
| Launch lineup | About 10 frontier models. |
| Sub-agents | Research uses Haiku 5.5 xhigh agents only. |
| Budget | GMI Cloud has agreed to more than the standard ambassador credits. Amount and rate limits to be confirmed before the evaluation grid is fixed. |

## 3. Positioning

No published LLM result exists on the SpaceX docking simulator or a clone of it.

The closest work:

- **V-BAR** (https://github.com/jamilhammoudeh/vbar, MIT, v0.7.0 on 2026-11-02). Numeric LLM docking with hidden seeds, many classical baselines, and strong statistics. Per its documentation the chaser only translates: no attitude, no inertia, no thruster layout. No vision track, human play, browser viewer, leaderboard, or published model results. One author, about four weeks old, pre-alpha. Its source code was not read.
- **KSPDG LLM pilots** (arXiv 2505.19896, 2408.08676, 2501.07802). LLMs and VLMs flying Kerbal Space Program pursuit missions on a live game clock.
- **Vals AI Time Horizon Index, KSP** (https://vals.ai/benchmarks/time_horizon_index). An agent builds and flies a space program over 30 missions, with a referee that signs telemetry.
- **ControlHarbor** (arXiv 2611.16867). Agents write Python controllers graded on held-out seeds. No spacecraft.
- **SpaceGym, CVPR 2026 AI4Space**. Gymnasium docking environments for reinforcement learning. No LLMs.

What SpaceBench can defensibly claim:

1. True six-axis piloting, where rotation and translation interact through the thruster layout.
2. The same seeded scenarios for text, vision, code, and human pilots.
3. A public leaderboard with browser replays.
4. One harness for several space simulations.

"First LLM docking benchmark" is not a claim we can make.

## 4. SpaceBench Dock, version 1

### 4.1 Physics

- Rigid body: mass, inertia tensor, quaternion attitude, thrusters with positions and directions so that firings produce both force and torque.
- Thrust: 400 N per thruster (NASA-hosted SpaceX CRS-6 press kit).
- Inertia: no published Dragon values were found. Use the docking standard's design values for 10 and 15 tonne vehicles (Ixx 17,000 to 41,000 kg·m², Iyy = Izz 42,000 to 71,000 kg·m²) and label them estimates.
- Fixed timestep, hand-written dynamics, no general physics engine.
- Orbital relative dynamics (Clohessy-Wiltshire) in the engine, enabled for the hardest tier.
- The SpaceX simulator itself is kinematic (no mass, inertia, or orbital mechanics). We do not copy its physics or assets.

### 4.2 Pass and fail

Success uses the recommended reference contact conditions in the International Docking System Standard, Revision F, Table 3.3.1.1-2. These are the standard's design conditions adopted as our pass rule, not verified Dragon flight limits (https://ntrs.nasa.gov/api/citations/20220011643/downloads/IDSS%20IDD%20Rev%20F%20Final_07262022.pdf):

| Quantity at first contact | Limit |
|---|---|
| Closing speed | 0.05 to 0.10 m/s |
| Sideways speed | 0.04 m/s |
| Pitch and yaw rate | 0.20 deg/s |
| Roll rate | 0.20 deg/s |
| Sideways misalignment | 0.10 m |
| Pitch and yaw misalignment | 4.0 deg |
| Roll misalignment | 4.0 deg |

Failure: collision with the station, leaving the approach corridor, running out of fuel, or running out of time.

Approach structure from NASA press kits for cargo Dragon: a 200 m keep-out sphere, with holds at 250 m, 30 m, and 10 m. Hold points give partial credit for failed runs.

### 4.3 Scoring

- Headline: success rate with confidence intervals.
- Second: a 0 to 100 score combining progress through hold points, safety violations, and fuel and time relative to a reference controller.
- Reported columns: tokens, cost, and thinking time per episode.
- Baselines on the same seeds: random, PID, LQR, and human pilots.

### 4.4 Difficulty tiers

1. Aligned approach, no noise.
2. Full six-axis offset.
3. Sensor noise and a fuel limit.
4. Actuator errors and one stuck thruster.
5. Several thruster failures mid-approach.
6. Tumbling target, with orbital dynamics on.

Sourced parameters (Madonna et al., Aerospace 2025, 12(8):708, a simulation study):

- Lidar noise growing with range: about 6 mm sideways and 34 mm along the line of sight at 10 m; attitude noise 0.17 deg per axis.
- Thruster misalignment 0.01 deg, thruster position error 5 mm, mass and inertia uncertainty 5%, minimum pulse 0.035 s.

Fault precedents: Gemini 8 stuck-on thruster, Starliner thruster losses on approach, Progress M-34 collision with Mir.

A tier retires when top models saturate it.

### 4.5 Harness rules

- Telemetry states frame, units, and sign conventions. A sign-check episode runs before scoring.
- One fixed, published harness and prompt, so results reflect the model and not the scaffolding.
- One fixed context policy (full history with caching, sliding window, or periodic summaries), chosen after a pilot run measures real token use.
- Public practice seeds. Hidden test seeds scored by a separate referee process that signs telemetry.
- Every call logs the exact model ID, provider, quantization, token counts, and retries. Automatic model routers stay off.
- A classical controller must be able to dock using only the information given to the model.
- Per-run spending caps.

## 5. Stack

- `crates/core`: pure Rust simulation. No wall clock, no OS random numbers. Every sine, cosine, and similar function goes through the pure-Rust `libm` crate so native and WebAssembly builds match.
- `crates/py`: PyO3 bindings, built with maturin, exposing a Gymnasium-style environment.
- `crates/wasm`: wasm-bindgen bindings for the browser.
- `python/`: evaluation harness, provider layer, scoring, statistics.
- `web/`: three.js with React for human play and replays.
- The core separates the shared rigid-body engine from per-simulation environment forces, because the second simulation (booster landing) needs gravity, atmosphere, and a main engine that docking does not.
- Replays: seed plus action log, with state hashes every few ticks; playback re-simulates.
- A test on every change compares native and WebAssembly trajectory hashes.
- Assets: NASA's ISS model with attribution and no NASA logo. No licensed Crew Dragon model was found, so the capsule is our own.

## 6. Cost notes

For a 1000-step episode with assumed token counts, full history without caching costs roughly $200 to $1000 on frontier models; caching or a sliding window brings it to about $10 to $100. The coast-time action model should cut turns to roughly 100 to 300. A pilot run must replace these assumptions.

Episode count per model is 6 tiers x 30 seeds x the number of reasoning levels, so a model with five levels needs 900 episodes. The two briefings double that to 1800. Rate limits and wall-clock time, not money, are the likely constraint.

## 7. Build order

1. Simulation core with the native versus WebAssembly determinism test.
2. Scenario generator and a classical controller that docks every tier.
3. Harness and telemetry track; pilot on a few models to set the action cap and context policy.
4. Browser app for human play and replays.
5. Leaderboard and launch; then the vision track, the autopilot track, and the paper.

## 8. Biggest unknown: difficulty

Nobody knows yet whether frontier models find six-axis docking trivial or impossible. Tier parameters stay provisional until the pilot in build step 3 runs a few models on the real core.

## 9. Unverified or open

- Crew Dragon's thruster layout and minimum pulse (SpaceX's Dragon page lists 16 Draco thrusters; the 18 figure is from a 2014 cargo press kit), and current approach waypoints, corridor angle, and speeds.
- Trademark status of SPACEBENCH in the official US, EU, and international databases.
- Domain availability at a registrar (`spacebench.ai`, `.io`, and `.si` appear unregistered).
- SpaceX's terms of use for its simulator.
- Pixel-identical 3D screenshots across machines for the vision track.
- GMI Cloud's exact model list, prices, and prompt caching support.
- Tumble rates for real debris targets, plume rules near the station, thrust variability.
- spacebench.net is a separate LLM benchmark (space-industry Q&A). The GitHub organization `spacebench` and the PyPI package `spacebench` are taken by unrelated projects; `space-bench` and `spacebench-sim` appear free.

## 10. Roadmap after docking

Next: booster landing. Other candidates: rendezvous and orbital transfer, station-keeping, lunar soft landing, booster landing, debris avoidance, reaction-wheel attitude control, rover traverse, telemetry fault diagnosis, formation flying, robotic arm capture, aerobraking.

## 11. Earlier research session (12 Nov 2026)

A separate GPT-6-Astra workstream ("GMI", session `c1dc4c32-f737-4591-bacd-cdb6edc59af2`, parent `e51d96b1-87e9-403b-9191-e9928c887f82`) researched the same idea under the name "Simulation Bench". Its notes are in `C:\Users\A S U S\.factory\spaces\6769eabf-989e-4eaf-8010-1274c050c718\docs\gmi\` (`brainstorm-context.md` and `simulation-bench-engineering-data-brief.md`).

### Sources it found that this brief lacked

- **Crew Dragon docking system paper** (Matthews et al., SpaceX and Dynamic Concepts, 45th Aerospace Mechanisms Symposium, 2020): https://esmats.eu/amspapers/pastpapers/pdfs/2020/matthews.pdf. Describes Dragon's real mechanism: three alignment petals with passive soft-capture latches, a six-strut hexapod feeding passive rotary spring and eddy-current dampers, three linear actuators that retract the ring, and 12 hard-capture hooks. Design contact speed 8 cm/s. The model was built in NASA Trick and correlated against more than 450 soft-capture tests and Demo-1 flight telemetry. It does not publish the full numeric parameter set.
- **Docking standard, Revision F, further content:** hook preload bounds of 31,300 to 44,340 N, stiffness envelopes, and soft and hard capture load sets. The contact conditions in section 4.2 are the standard's recommended reference design conditions, not verified Dragon flight limits.
- **NASA Docking System / IDA interface document, JSC 65795 Rev H (2013):** https://ntrs.nasa.gov/api/citations/20150014481/downloads/20150014481.pdf. Adapter geometry, latch strikers, passive hooks, and sensor target locations. An older revision; the Dragon paper cites Rev J.
- **Boeing's NASA Docking System Block 1 is a different, actively controlled mechanism.** Its limits must not be used as Dragon's.
- **SpaceX Dragon page** (https://www.spacex.com/vehicles/dragon): 16 Draco thrusters at 400 N in vacuum, 8.1 m tall, 4 m diameter. Family-level and undated.
- **Docking is several phases.** On Demo-2, NASA reported soft capture at 10:16 EDT and hard capture, after 12 hooks closed, at 10:27 EDT.
- **Latest verified Dragon dockings:** Crew-13 on 1 Oct 2026 at Harmony forward; cargo CRS-35 on 15 Oct 2026 at Harmony zenith. NASA station snapshot dated 5 Nov 2026.

### Design ideas from it worth keeping

- Keep true simulated state separate from the measurements given to the pilot. Tiers with no sensor noise must be labelled idealised.
- Dynamics decide outcomes, logs record them, and the 3D replay only displays the logs.
- A human flying live in 3D and a model flying paused on telemetry are different experiments and must not share a leaderboard. A matched comparison gives both the same display, the same commands, and the same pause.
- Three candidate control boundaries: approach targets with a conventional tracker; bounded thruster requests with a separate safety layer; thruster requests plus docking-transition requests. This brief's action model corresponds to the second.
- Validation needs analytic test cases, convergence checks as the timestep shrinks, and an independent reference. A stable run or a working autopilot is not validation.

### Conflicts with the 12 Nov session, resolved 13 Nov

1. **Fidelity: staged.** Version 1 ends at first contact, scored against the standard's contact conditions, on a Dragon-class vehicle built from public parameters and labelled as such. A capture-and-latching module built from the public mechanism paper and the docking standard follows as the next upgrade, so that capture succeeds or fails from simulated mechanics. The exact as-flown Dragon is a parallel collaboration goal that never blocks a release; SpaceBench claims "exact" only if real vehicle data arrives. The pass rule is a replaceable module from day one.
2. **Budget.** GMI has agreed to more than the standard ambassador credits. The amount and rate limits are not recorded here and should be confirmed before the evaluation grid is fixed.
3. **Humans: two boards.** A live-play board (real time, 3D view) for the public challenge, and a matched board (same pilot display, same pulse-and-coast commands, simulator paused) that is the only source for human-versus-model comparisons.
4. **Openness.** Decide later.
### Practical notes on GMI

- API base `https://api.gmi-serving.com/v1`; model IDs take a vendor prefix, for example `openai/gpt-6-astra` and `openai/gpt-6.1-sol`.
- At the highest reasoning setting, GPT-6 Astra returned empty answers until the output token limit was raised, because reasoning used the whole output budget. The harness must set output limits explicitly per reasoning level and treat an empty answer as a logged failure, not a silent coast.
- The ambassador programme asks members to avoid cloud-price comparisons. Reporting each model's cost per episode is different from comparing providers' prices, but the leaderboard should not rank providers by price.
