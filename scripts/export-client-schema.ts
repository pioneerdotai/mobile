/// <reference types="bun" />

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const rustRoot = process.env.PIONEER_RUST_ROOT
    ? path.resolve(process.env.PIONEER_RUST_ROOT)
    : path.resolve(appRoot, '..', 'pioneer');
const clientCargoToml = path.resolve(rustRoot, 'crates/client/Cargo.toml');
const clientFfiCargoToml = path.resolve(rustRoot, 'crates/client-ffi/Cargo.toml');
const outputDir = path.resolve(appRoot, 'src/client/schema');

if (!existsSync(clientCargoToml)) {
    throw new Error(
        `Pioneer client crate was not found at ${clientCargoToml}. ` +
            'Set PIONEER_RUST_ROOT to the Rust repository root if it lives elsewhere.',
    );
}

if (!existsSync(clientFfiCargoToml)) {
    throw new Error(
        `Pioneer client FFI crate was not found at ${clientFfiCargoToml}. ` +
            'Set PIONEER_RUST_ROOT to the Rust repository root if it lives elsewhere.',
    );
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

execFileSync(
    'cargo',
    ['run', '-p', 'pioneer-client', '--features', 'schema', '--bin', 'schema', '--', outputDir],
    {
        cwd: rustRoot,
        stdio: 'inherit',
    },
);

execFileSync(
    'cargo',
    [
        'run',
        '-p',
        'pioneer-client-ffi',
        '--features',
        'schema',
        '--bin',
        'schema',
        '--',
        outputDir,
    ],
    {
        cwd: rustRoot,
        stdio: 'inherit',
    },
);
