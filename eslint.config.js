const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const pluginQuery = require('@tanstack/eslint-plugin-query');

module.exports = defineConfig([
    expoConfig,
    eslintPluginPrettierRecommended,
    ...pluginQuery.configs['flat/recommended'],
    {
        ignores: ['dist/*'],
    },
    {
        files: [
            'src/protocol/constants.ts',
            'src/protocol/generated/**/*.ts',
            'src/client/generated/**/*.ts',
        ],
        linterOptions: {
            reportUnusedDisableDirectives: 'off',
        },
    },
]);
