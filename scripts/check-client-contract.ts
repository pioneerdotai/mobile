/// <reference types="bun" />

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const rustRoot = process.env.PIONEER_RUST_ROOT
    ? path.resolve(process.env.PIONEER_RUST_ROOT)
    : path.resolve(appRoot, '..', 'pioneer');
const clientCargoToml = path.resolve(rustRoot, 'crates/client/Cargo.toml');
const clientFfiCargoToml = path.resolve(rustRoot, 'crates/client-ffi/Cargo.toml');
const checkedInSchemaDir = path.resolve(appRoot, 'src/client/schema');
const checkedInGeneratedDir = path.resolve(appRoot, 'src/client/generated');

type Diff = {
    type: 'missing' | 'extra' | 'changed';
    file: string;
};

const toPascalCase = (value: string) => {
    return value
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join('');
};

const listRelativeFiles = async (root: string): Promise<string[]> => {
    const output: string[] = [];
    const walk = async (dir: string) => {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(absolutePath);
                continue;
            }
            if (entry.isFile()) {
                output.push(path.relative(root, absolutePath));
            }
        }
    };

    await walk(root);
    return output.sort();
};

const compareDirectories = async (expectedDir: string, actualDir: string): Promise<Diff[]> => {
    const expectedFiles = await listRelativeFiles(expectedDir);
    const actualFiles = await listRelativeFiles(actualDir);
    const expectedSet = new Set(expectedFiles);
    const actualSet = new Set(actualFiles);
    const diffs: Diff[] = [];

    for (const file of expectedFiles) {
        if (!actualSet.has(file)) {
            diffs.push({ type: 'missing', file });
            continue;
        }

        const [expected, actual] = await Promise.all([
            readFile(path.join(expectedDir, file), 'utf8'),
            readFile(path.join(actualDir, file), 'utf8'),
        ]);
        if (expected !== actual) {
            diffs.push({ type: 'changed', file });
        }
    }

    for (const file of actualFiles) {
        if (!expectedSet.has(file)) {
            diffs.push({ type: 'extra', file });
        }
    }

    return diffs.sort((a, b) => `${a.type}:${a.file}`.localeCompare(`${b.type}:${b.file}`));
};

const generateTypes = async (schemaDir: string, outputDir: string) => {
    const schemaEntries = (await readdir(schemaDir))
        .filter((fileName) => fileName.endsWith('.json'))
        .sort();

    if (schemaEntries.length === 0) {
        throw new Error(`No JSON schema files found in ${schemaDir}`);
    }

    await mkdir(outputDir, { recursive: true });
    for (const fileName of schemaEntries) {
        const schemaPath = path.join(schemaDir, fileName);
        const schemaJson = JSON.parse(await readFile(schemaPath, 'utf8'));
        const baseName = fileName.replace(/\.json$/, '');
        const typeName = toPascalCase(baseName);
        const compiled = await compile(schemaJson, typeName, {
            bannerComment: '/* eslint-disable */',
            style: {
                singleQuote: true,
            },
        });
        await writeFile(path.join(outputDir, `${baseName}.ts`), compiled, 'utf8');
    }
    await writeFile(path.join(outputDir, 'index.ts'), 'export {};\n', 'utf8');
};

const formatDiffs = (label: string, diffs: Diff[]) => {
    if (diffs.length === 0) {
        return `${label}: ok`;
    }

    return [
        `${label}: ${diffs.length} difference(s)`,
        ...diffs.slice(0, 80).map((diff) => `  ${diff.type}: ${diff.file}`),
        diffs.length > 80 ? `  ... ${diffs.length - 80} more` : '',
    ]
        .filter(Boolean)
        .join('\n');
};

const main = async () => {
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

    const tempRoot = await mkdtemp(path.join(tmpdir(), 'pioneer-client-check-'));
    const exportedSchemaDir = path.join(tempRoot, 'schema');
    const generatedDir = path.join(tempRoot, 'generated');

    try {
        execFileSync(
            'cargo',
            [
                'run',
                '-p',
                'pioneer-client',
                '--features',
                'schema',
                '--bin',
                'schema',
                '--',
                exportedSchemaDir,
            ],
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
                exportedSchemaDir,
            ],
            {
                cwd: rustRoot,
                stdio: 'inherit',
            },
        );
        await generateTypes(exportedSchemaDir, generatedDir);

        const schemaDiffs = await compareDirectories(exportedSchemaDir, checkedInSchemaDir);
        const generatedDiffs = await compareDirectories(generatedDir, checkedInGeneratedDir);

        if (schemaDiffs.length || generatedDiffs.length) {
            console.error(
                [
                    'Client schema/generated output is stale.',
                    formatDiffs('schema', schemaDiffs),
                    formatDiffs('generated', generatedDiffs),
                    'Run `bun run client` and commit the resulting files.',
                ].join('\n'),
            );
            process.exitCode = 1;
            return;
        }

        console.log(
            `Client schema/generated output is reproducible. schema=${(await listRelativeFiles(exportedSchemaDir)).length} generated=${(await listRelativeFiles(generatedDir)).length}`,
        );
    } finally {
        await rm(tempRoot, { recursive: true, force: true });
    }
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
