// Runs the SpaceBench WebAssembly build under Node and prints a 64-bit hash.
//
// Usage:
//   node scripts/wasm_hash.mjs <wasm> <seed> <ticks>
//   node scripts/wasm_hash.mjs <wasm> --probe
//
// Prints one line: the value as 16 lowercase hex digits, exit code 0.
// Failures print to stderr with exit code 1. Usage errors exit with code 2.
// The module imports nothing, so the import object is empty.

import { readFile } from 'node:fs/promises';

const USAGE =
  'usage: node scripts/wasm_hash.mjs <wasm> <seed> <ticks>\n' +
  '       node scripts/wasm_hash.mjs <wasm> --probe';

class UsageError extends Error {}

function parseU32(text, name) {
  if (!/^\d+$/.test(text)) {
    throw new UsageError(`${name} must be a whole number, got "${text}"`);
  }
  const value = Number(text);
  if (value > 0xffff_ffff) {
    throw new UsageError(`${name} must fit in 32 bits, got "${text}"`);
  }
  return value;
}

async function main(argv) {
  const [wasmPath, ...rest] = argv;
  if (wasmPath === undefined) {
    throw new UsageError('missing <wasm> path');
  }

  let exportName;
  let callArgs;
  if (rest.length === 1 && rest[0] === '--probe') {
    exportName = 'spacebench_abi_probe';
    callArgs = [];
  } else if (rest.length === 2) {
    exportName = 'spacebench_scripted_run';
    callArgs = [parseU32(rest[0], 'seed'), parseU32(rest[1], 'ticks')];
  } else {
    throw new UsageError('expected <seed> <ticks> or --probe');
  }

  const bytes = await readFile(wasmPath);
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const exported = instance.exports[exportName];
  if (typeof exported !== 'function') {
    throw new Error(`export ${exportName} is missing from ${wasmPath}`);
  }

  const value = BigInt(exported(...callArgs));
  process.stdout.write(BigInt.asUintN(64, value).toString(16).padStart(16, '0') + '\n');
}

main(process.argv.slice(2)).catch((err) => {
  if (err instanceof UsageError) {
    console.error(`${err.message}\n${USAGE}`);
    process.exitCode = 2;
  } else {
    console.error(`error: ${err.name}: ${err.message}`);
    process.exitCode = 1;
  }
});
