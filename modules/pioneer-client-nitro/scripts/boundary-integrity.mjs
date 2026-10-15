import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.resolve(moduleRoot, '../..');
const contractPath = path.join(moduleRoot, 'boundary-source.json');
const [mode, platform] = process.argv.slice(2);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const files = (root) =>
    readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
        if (entry.isSymbolicLink()) throw new Error('Boundary inputs cannot be symlinks');
        const file = path.join(root, entry.name);
        if (['target', 'node_modules', '.git'].includes(entry.name)) return [];
        return entry.isDirectory() ? files(file) : [file];
    });
const digest = (root, inputs) =>
    hash(
        [...new Set(inputs)]
            .sort()
            .map(
                (file) =>
                    `${path.relative(root, file).replaceAll(path.sep, '/')}\0${hash(readFileSync(file))}\n`,
            )
            .join(''),
    );
const artifactPaths = {
    ios: [
        'Info.plist',
        'ios-arm64/libpioneer_client_ffi.a',
        'ios-arm64/Headers/pioneer_client_ffi.h',
        'ios-arm64-simulator/libpioneer_client_ffi.a',
        'ios-arm64-simulator/Headers/pioneer_client_ffi.h',
    ].map((file) => `PioneerClientFfi.xcframework/${file}`),
    android: ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'].map(
        (abi) => `${abi}/libpioneer_client_ffi.so`,
    ),
};
const mobileDigest = () =>
    digest(appRoot, [
        path.join(appRoot, 'package.json'),
        path.join(appRoot, 'bun.lock'),
        path.join(appRoot, 'app.config.js'),
        path.join(moduleRoot, 'package.json'),
        path.join(moduleRoot, 'nitro.json'),
        ...files(path.join(moduleRoot, 'cpp')),
        ...files(path.join(moduleRoot, 'src')),
        ...files(path.join(moduleRoot, 'scripts')),
        ...files(path.join(moduleRoot, 'nitrogen/generated')),
        ...files(path.join(appRoot, 'src/client/schema')),
        ...files(path.join(appRoot, 'src/client/generated')),
        ...['native.ts', 'mobile-client-binding.ts'].map((file) =>
            path.join(appRoot, 'src/client', file),
        ),
        ...['export-client-schema.ts', 'generate-client-types.ts', 'check-client-contract.ts'].map(
            (file) => path.join(appRoot, 'scripts', file),
        ),
    ]);
const sourceContract = () => {
    if (!process.env.PIONEER_RUST_ROOT)
        throw new Error('PIONEER_RUST_ROOT is required for source verification');
    const rustRoot = path.resolve(process.env.PIONEER_RUST_ROOT);
    const metadata = JSON.parse(
        execFileSync(
            'cargo',
            ['metadata', '--format-version', '1', '--no-deps', '--locked', '--offline'],
            { cwd: rustRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
        ),
    );
    const packages = new Map(
        metadata.packages.map((pkg) => [path.dirname(pkg.manifest_path), pkg]),
    );
    const selected = new Map();
    const visit = (pkg) => {
        if (!pkg || selected.has(pkg.name)) return;
        selected.set(pkg.name, pkg);
        for (const dependency of pkg.dependencies)
            if (dependency.kind !== 'dev' && dependency.path) visit(packages.get(dependency.path));
    };
    visit(metadata.packages.find((pkg) => pkg.name === 'pioneer-client-ffi'));
    if (!selected.size || selected.has('pioneer-desktop') || selected.has('pioneer-gateway'))
        throw new Error('Invalid Client dependency direction');
    const rustInputs = ['Cargo.toml', 'Cargo.lock'].map((file) => path.join(rustRoot, file));
    for (const pkg of selected.values()) {
        const crateRoot = path.dirname(pkg.manifest_path);
        rustInputs.push(pkg.manifest_path, ...files(path.join(crateRoot, 'src')));
        const buildScript = path.join(crateRoot, 'build.rs');
        if (existsSync(buildScript)) rustInputs.push(buildScript);
    }

    return {
        boundary_version: 2,
        binding_schema_version: 1,
        rust_packages: [...selected.keys()].sort(),
        rust_source_sha256: digest(rustRoot, rustInputs),
        mobile_boundary_sha256: mobileDigest(),
        platforms: artifactPaths,
    };
};
if (mode === 'source' || mode === 'check-source') {
    const encoded = JSON.stringify(sourceContract(), null, 2) + '\n';
    if (mode === 'source') writeFileSync(contractPath, encoded);
    else if (readFileSync(contractPath, 'utf8') !== encoded)
        throw new Error('Client source contract is stale');
    console.log('Client source contract: matched');
} else if (mode === 'seal' || mode === 'check') {
    if (!(platform in artifactPaths)) throw new Error('Expected ios or android');
    const root = path.join(moduleRoot, 'rust', platform);
    const contract = readFileSync(contractPath);
    if (JSON.parse(contract).mobile_boundary_sha256 !== mobileDigest())
        throw new Error('Mobile sources do not match the bundled Client contract');
    const artifacts = Object.fromEntries(
        artifactPaths[platform].map((file) => [file, hash(readFileSync(path.join(root, file)))]),
    );
    if (platform === 'ios')
        for (const [file, digest] of Object.entries(artifacts))
            if (
                file.endsWith('.h') &&
                digest !== hash(readFileSync(path.join(moduleRoot, 'cpp/pioneer_client_ffi.h')))
            )
                throw new Error('XCFramework header does not match the source contract');
    const encoded =
        JSON.stringify(
            { boundary_version: 2, source_contract_sha256: hash(contract), artifacts },
            null,
            2,
        ) + '\n';
    const manifest = path.join(root, 'integrity.json');
    if (mode === 'seal') {
        if (JSON.stringify(sourceContract()) !== JSON.stringify(JSON.parse(contract)))
            throw new Error('Cannot seal mismatched source inputs');
        writeFileSync(manifest, encoded);
    } else if (!existsSync(manifest) || readFileSync(manifest, 'utf8') !== encoded)
        throw new Error('Client prebuilt integrity mismatch');
    console.log(`Client ${platform} integrity: matched`);
} else throw new Error('Expected source, check-source, seal, or check');
