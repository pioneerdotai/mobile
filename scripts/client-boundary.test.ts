import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const app = path.resolve(import.meta.dir, '..');
const rust = process.env.PIONEER_RUST_ROOT;
if (!rust) throw new Error('PIONEER_RUST_ROOT must name the pinned Client worktree');
const native = path.join(app, 'modules/pioneer-client-nitro');
const read = (file: string) => readFileSync(file, 'utf8');
const source = read(path.join(rust, 'crates/client-ffi/src/lib.rs'));
const header = read(path.join(native, 'cpp/pioneer_client_ffi.h'));
const cpp = read(path.join(native, 'cpp/HybridPioneerClient.cpp'));
const declarations = read(path.join(native, 'cpp/HybridPioneerClient.hpp'));
const symbols = (value: string, pattern: RegExp) =>
    [...new Set([...value.matchAll(pattern)].map((match) => match[1]))].sort();

test('every exported Rust ABI symbol has exactly its C declaration and a native consumer', () => {
    const exported = [
        ...new Set([
            ...symbols(source, /pub (?:unsafe )?extern "C" fn (pioneer_client_ffi_\w+)\(/g),
            ...symbols(source, /ffi_client_json_(?:typed_)?method!\(\s*(pioneer_client_ffi_\w+),/g),
        ]),
    ].sort();
    expect(exported.length).toBeGreaterThan(40);
    expect(symbols(header, /\b(pioneer_client_ffi_\w+)\(/g)).toEqual(exported);
    for (const name of exported) {
        expect(cpp).toContain(name);
        const declaration = header.split('\n').find((line) => line.includes(`${name}(`))!;
        expect(declaration.endsWith(';')).toBe(true);
        if (
            ![
                'pioneer_client_ffi_client_create',
                'pioneer_client_ffi_client_destroy',
                'pioneer_client_ffi_string_destroy',
            ].includes(name)
        )
            expect(declaration.startsWith('char* ')).toBe(true);
    }
    expect(header).toContain('void pioneer_client_ffi_string_destroy(char* value);');
    expect(cpp).toContain('std::unique_ptr<char, decltype(&pioneer_client_ffi_string_destroy)>');
});

test('Nitro source, generated interface and implementation expose the same methods without orphan declarations', () => {
    const spec = read(path.join(native, 'src/PioneerClient.nitro.ts'));
    const generated = read(
        path.join(native, 'nitrogen/generated/shared/c++/HybridPioneerClientSpec.hpp'),
    );
    const names = symbols(spec, /\b(\w+Json)\(/g);
    expect(symbols(cpp, /HybridPioneerClient::(\w+Json)\(/g)).toEqual(names);
    expect(symbols(declarations, /\b(\w+Json)\(/g)).toEqual(names);
    expect(symbols(generated, /\b(\w+Json)\(/g)).toEqual(names);
    expect(declarations).not.toMatch(/override;\s*const std::string&/);
});

test('native dispatch is bounded with separate delivery and shutdown slots and one process holder', () => {
    expect(cpp).toContain('const size_t limit = delivery || control ? 1 : 64;');
    expect(cpp).toContain(
        'operation == pioneer_client_ffi_client_wait_publications, operation == pioneer_client_ffi_client_shutdown',
    );
    expect(cpp).toContain('holder_(processHolder())');
    expect(cpp).toContain('client_boundary_overloaded');
    expect(cpp).toContain('validatePayloadSize(payload.size())');
    expect(cpp.indexOf('validatePayloadSize(size)')).toBeLessThan(
        cpp.indexOf('std::vector<uint8_t> bytes(size)'),
    );
    expect(cpp).not.toContain('gateway_next_events');
    expect(source).not.toContain('ClientFfiActiveThreadInner');
    expect(source).not.toContain('ClientRuntimeCompatibility');
});

test('OTA runtime identity prevents mixed old-native/new-JS artifacts and preserves independent rollback', () => {
    const evaluate = (version: string) => {
        const context = {
            process: { env: { APP_VERSION: version } },
            module: { exports: {} as { runtimeVersion: string } },
        };
        vm.runInNewContext(read(path.join(app, 'app.config.js')), context);
        return context.module.exports;
    };
    expect(evaluate('1.0').runtimeVersion).toBe('1.0-client-ffi-2');
    expect(evaluate('1.0').runtimeVersion).not.toBe('1.0');
    expect(evaluate('1.1').runtimeVersion).toBe('1.1-client-ffi-2');
    expect(source).toContain('boundary_version: 2');
    expect(read(path.join(app, 'src/client/native.ts'))).toContain('boundary_version !== 2');
    for (const relative of ['crates/desktop/Cargo.toml', 'crates/client/Cargo.toml']) {
        const manifest = read(path.join(rust!, relative));
        expect(manifest).not.toMatch(/^pioneer-client-ffi\s*=/m);
        expect(manifest).not.toMatch(/^.*nitro.*=/m);
    }
});

test('source and prebuilt integrity reject mixed inputs, modified binaries and mismatched headers using synthetic files', () => {
    const fixtureApp = '/fixture/mobile';
    const fixtureNative = `${fixtureApp}/modules/pioneer-client-nitro`;
    const fixtureRust = '/fixture/rust';
    const files = new Map<string, string>();
    for (const file of [
        'package.json',
        'bun.lock',
        'app.config.js',
        'src/client/native.ts',
        'src/client/mobile-client-binding.ts',
        'src/client/schema/intent.json',
        'src/client/generated/intent.ts',
        'scripts/export-client-schema.ts',
        'scripts/generate-client-types.ts',
        'scripts/check-client-contract.ts',
        'modules/pioneer-client-nitro/package.json',
        'modules/pioneer-client-nitro/nitro.json',
        'modules/pioneer-client-nitro/cpp/pioneer_client_ffi.h',
        'modules/pioneer-client-nitro/src/PioneerClient.nitro.ts',
        'modules/pioneer-client-nitro/scripts/boundary-integrity.mjs',
        'modules/pioneer-client-nitro/nitrogen/generated/spec.hpp',
    ])
        files.set(`${fixtureApp}/${file}`, 'synthetic source');
    for (const file of [
        'Cargo.toml',
        'Cargo.lock',
        'crates/client-ffi/Cargo.toml',
        'crates/client-ffi/src/lib.rs',
    ])
        files.set(`${fixtureRust}/${file}`, 'synthetic Rust');
    const script = read(path.join(native, 'scripts/boundary-integrity.mjs'))
        .replace(/^import .*;\n/gm, '')
        .replaceAll(
            'import.meta.url',
            JSON.stringify(`file://${fixtureNative}/scripts/boundary-integrity.mjs`),
        );
    const run = (mode: string, platform = '') =>
        vm.runInNewContext(script, {
            createHash,
            path,
            fileURLToPath,
            process: {
                argv: ['node', 'fixture', mode, platform],
                env: { PIONEER_RUST_ROOT: fixtureRust },
            },
            console: { log: () => {} },
            execFileSync: (command: string, args: string[]) => {
                expect(command).toBe('cargo');
                expect(args).toEqual([
                    'metadata',
                    '--format-version',
                    '1',
                    '--no-deps',
                    '--locked',
                    '--offline',
                ]);
                return JSON.stringify({
                    packages: [
                        {
                            name: 'pioneer-client-ffi',
                            manifest_path: `${fixtureRust}/crates/client-ffi/Cargo.toml`,
                            dependencies: [],
                        },
                    ],
                });
            },
            readFileSync: (file: string, encoding?: string) => {
                const value = files.get(file);
                if (value === undefined) throw new Error(`Missing synthetic input: ${file}`);
                return encoding ? value : Buffer.from(value);
            },
            writeFileSync: (file: string, value: string) => files.set(file, value),
            existsSync: (file: string) => files.has(file),
            readdirSync: (root: string) =>
                [
                    ...new Set(
                        [...files.keys()]
                            .filter((file) => file.startsWith(`${root}/`))
                            .map((file) => file.slice(root.length + 1).split('/')[0]),
                    ),
                ].map((name) => ({
                    name,
                    isSymbolicLink: () => false,
                    isDirectory: () => !files.has(`${root}/${name}`),
                })),
        });
    run('source');
    run('check-source');
    const contractPath = `${fixtureNative}/boundary-source.json`;
    const contract = JSON.parse(files.get(contractPath)!);
    expect(contract.boundary_version).toBe(2);
    expect(contract.platforms.android).toHaveLength(4);
    expect(contract.platforms.ios.filter((file: string) => file.endsWith('.a'))).toHaveLength(2);
    files.set(`${fixtureRust}/crates/client-ffi/src/lib.rs`, 'changed Rust');
    expect(() => run('check-source')).toThrow('stale');
    files.set(`${fixtureRust}/crates/client-ffi/src/lib.rs`, 'synthetic Rust');
    for (const platform of ['ios', 'android']) {
        for (const file of contract.platforms[platform])
            files.set(
                `${fixtureNative}/rust/${platform}/${file}`,
                file.endsWith('.h') ? 'synthetic source' : 'synthetic binary',
            );
        run('seal', platform);
        run('check', platform);
        const artifact = `${fixtureNative}/rust/${platform}/${contract.platforms[platform][1]}`;
        files.set(artifact, 'tampered');
        expect(() => run('check', platform)).toThrow('integrity mismatch');
        files.set(artifact, 'synthetic binary');
    }
    const header = `${fixtureNative}/rust/ios/${contract.platforms.ios.find((file: string) => file.endsWith('.h'))}`;
    files.set(header, 'wrong header');
    expect(() => run('seal', 'ios')).toThrow('header does not match');
    files.set(`${fixtureApp}/src/client/native.ts`, 'changed JS');
    expect(() => run('check', 'android')).toThrow('Mobile sources do not match');
    expect(() => run('check-source')).toThrow('stale');
});
