import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';

import generatedResources from './resources.json';

describe('generated translation resources', () => {
    it('exactly matches every locale namespace source file', () => {
        const resourcesRoot = path.resolve(process.cwd(), 'src/locale/resources');
        const expected: Record<string, Record<string, unknown>> = {};

        for (const locale of fs.readdirSync(resourcesRoot).sort()) {
            const localeRoot = path.join(resourcesRoot, locale);
            if (!fs.statSync(localeRoot).isDirectory()) {
                continue;
            }

            expected[locale] = {};
            for (const filename of fs
                .readdirSync(localeRoot)
                .filter((entry) => entry.endsWith('.json'))
                .sort()) {
                const namespace = path.basename(filename, '.json');
                expected[locale][namespace] = JSON.parse(
                    fs.readFileSync(path.join(localeRoot, filename), 'utf8'),
                );
            }
        }

        expect(generatedResources).toEqual(expected);
    });
});
