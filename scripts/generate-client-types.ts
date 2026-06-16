/// <reference types="bun" />

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const schemaDir = path.resolve(appRoot, 'src/client/schema');
const outputDir = path.resolve(appRoot, 'src/client/generated');

const toPascalCase = (value: string) => {
    return value
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join('');
};

const main = async () => {
    const schemaEntries = (await fs.readdir(schemaDir))
        .filter((fileName) => fileName.endsWith('.json'))
        .sort();

    if (schemaEntries.length === 0) {
        throw new Error(`No JSON schema files found in ${schemaDir}`);
    }

    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });

    for (const fileName of schemaEntries) {
        const schemaPath = path.join(schemaDir, fileName);
        const schemaJson = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
        const baseName = fileName.replace(/\.json$/, '');
        const typeName = toPascalCase(baseName);
        const compiled = await compile(schemaJson, typeName, {
            bannerComment: '/* eslint-disable */',
            style: {
                singleQuote: true,
            },
        });

        await fs.writeFile(path.join(outputDir, `${baseName}.ts`), compiled, 'utf8');
    }

    await fs.writeFile(path.join(outputDir, 'index.ts'), 'export {};\n', 'utf8');
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
