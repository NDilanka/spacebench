//! WebAssembly exports for the SpaceBench simulation core.
//!
//! The module imports nothing, so Node can load it with an empty import
//! object. The `native_hash` binary in `src/bin` checks the same
//! [`ABI_PROBE`] value and calls the same core function on the native target.

/// Fixed value that both builds return from [`spacebench_abi_probe`].
///
/// Matching it on native and in WebAssembly shows that the 64-bit return path
/// works on both targets before any physics runs.
pub const ABI_PROBE: u64 = 0xfedc_ba98_7654_3210;

/// Runs the scripted flight for `seed` and `ticks` and returns its chained hash.
///
/// The run is defined by `spacebench_core::scripted_run`.
// reason: the exported symbol name must stay fixed so the host can find it.
#[unsafe(no_mangle)]
pub extern "C" fn spacebench_scripted_run(seed: u32, ticks: u32) -> u64 {
    spacebench_core::scripted_run(seed, ticks)
}

/// Returns [`ABI_PROBE`]. The host calls it before any run to check the export path.
// reason: the exported symbol name must stay fixed so the host can find it.
#[unsafe(no_mangle)]
pub extern "C" fn spacebench_abi_probe() -> u64 {
    ABI_PROBE
}
