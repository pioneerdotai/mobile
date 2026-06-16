import fs from 'fs-extra';
import { merge } from 'lodash';

const namespaces = [
    'common',
    'gateway',
    'threads',
    'providers',
    'mcp',
    'skills',
    'workspace',
    'artifacts',
    'settings',
    'editor',
    'menu',
];

const locales = ['en', 'ru', 'zh', 'hi', 'es', 'de', 'fr', 'ja'];

const generate = async () => {
    const translations = {};

    for (const locale of locales) {
        const translation = {};

        for (const namespace of namespaces) {
            const data = await fs.readJSON(
                `./src/locale/resources/${locale}/${namespace}.json`,
                'utf8',
            );
            merge(translation, {
                [namespace]: data,
            });
        }

        merge(translations, {
            [locale]: translation,
        });
    }

    await fs.promises.writeFile(
        './src/locale/translations/resources.json',
        JSON.stringify(translations),
    );
};

generate().catch((error) => {
    console.error('Failed to generate translation resources:', error);
    process.exitCode = 1;
});
