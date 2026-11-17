//! Native side of the determinism gate.
//!
//! `native_hash <seed> <ticks>` prints the scripted-run hash as 16 lowercase
//! hex digits. `native_hash --probe` prints the ABI probe value the same way.
//! Bad arguments print a message to stderr and exit with code 2.

use std::process::ExitCode;

const USAGE: &str = "usage: native_hash <seed> <ticks> | native_hash --probe";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args_os()
        .skip(1)
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect();
    match args.as_slice() {
        [flag] if flag == "--probe" => {
            println!("{:016x}", spacebench_wasm::ABI_PROBE);
            ExitCode::SUCCESS
        }
        [seed, ticks] => match (seed.parse::<u32>(), ticks.parse::<u32>()) {
            (Ok(seed), Ok(ticks)) => {
                println!("{:016x}", spacebench_core::scripted_run(seed, ticks));
                ExitCode::SUCCESS
            }
            _ => {
                eprintln!("native_hash: seed and ticks must be whole numbers that fit in 32 bits");
                eprintln!("{USAGE}");
                ExitCode::from(2)
            }
        },
        _ => {
            eprintln!("{USAGE}");
            ExitCode::from(2)
        }
    }
}
